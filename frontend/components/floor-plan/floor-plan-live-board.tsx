'use client';

import { useMemo, useRef, useState } from 'react';
import { FloorElementNode } from '@/components/floor-plan/floor-element-node';
import { FloorPlanViewport } from '@/components/floor-plan/floor-plan-viewport';
import { FloorTableDetailDrawer } from '@/components/floor-plan/floor-table-detail-drawer';
import { TableNode } from '@/components/floor-plan/table-node';
import { Button, Icon, Input, Skeleton } from '@/components/ui';
import type { FloorElement, FloorPlan, FloorTable, Order } from '@/lib/api/types';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { elapsedTimer } from '@/components/orders/order-badges';
import { formatOrderLabel } from '@/lib/order-display';

type LiveView = 'grid' | 'spatial';
type CardFilter = 'all' | 'free' | 'seated' | 'bill' | 'reserved' | 'cleaning';
type CardStatus = Exclude<CardFilter, 'all'>;

function resolveCardStatus(table: FloorTable, order?: Order | null): CardStatus {
  if (table.status === 'RESERVED') return 'reserved';
  if (table.status === 'NEEDS_CLEANING') return 'cleaning';
  if (order?.status === 'READY') return 'bill';
  if (table.status === 'OCCUPIED' || order) return 'seated';
  return 'free';
}

function statusBadgeLabel(status: CardStatus): string {
  if (status === 'free') return 'FREE';
  if (status === 'seated') return 'SEATED';
  if (status === 'bill') return 'BILL';
  if (status === 'reserved') return 'RESERVED';
  return 'BUSING';
}

function compareTableIds(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true });
}

function FloorTableCard({
  table,
  order,
  onClick,
}: {
  table: FloorTable;
  order?: Order | null;
  onClick: () => void;
}) {
  const formatMoney = useFormatMoney();
  const cardStatus = resolveCardStatus(table, order);

  const base =
    'group relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-40 sm:h-44 cursor-pointer transition-all active:scale-[0.99] border';

  const styles: Record<CardStatus, string> = {
    free: `${base} bg-surface border-outline-variant/40 shadow-sm hover:shadow-md hover:border-outline-variant`,
    seated: `${base} bg-primary text-on-primary border-primary shadow-lg hover:brightness-105`,
    bill: `${base} bg-[#f59e0b] text-slate-950 border-amber-400 ring-2 ring-amber-400/40 shadow-lg`,
    reserved: `${base} bg-surface border-cyan-300/80 shadow-sm hover:border-cyan-400`,
    cleaning: `${base} bg-amber-50/80 border-amber-200/90 shadow-sm`,
  };

  const badgeStyles: Record<CardStatus, string> = {
    free: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/50',
    seated: 'bg-white/20 text-on-primary border-white/25',
    bill: 'bg-slate-950/20 text-slate-950 border-slate-950/15',
    reserved: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    cleaning: 'bg-amber-100 text-amber-900 border-amber-300/80',
  };

  return (
    <button type="button" onClick={onClick} className={styles[cardStatus]}>
      <div className="flex items-start justify-between w-full text-left">
        <span
          className={`text-3xl font-extrabold tracking-tight ${
            cardStatus === 'seated' || cardStatus === 'bill' ? '' : 'text-on-surface'
          }`}
        >
          {table.tableIdentifier}
        </span>
        <span
          className={`px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-lg border uppercase ${badgeStyles[cardStatus]}`}
        >
          {statusBadgeLabel(cardStatus)}
        </span>
      </div>

      {order && (cardStatus === 'seated' || cardStatus === 'bill') ? (
        <div className="text-left w-full">
          <div className="text-xl sm:text-2xl font-black tracking-tight">{formatMoney(order.totalAmount)}</div>
          <div
            className={`flex items-center justify-between text-xs font-medium mt-1 ${
              cardStatus === 'bill' ? 'text-amber-950/80' : 'text-on-primary/85'
            }`}
          >
            <span>{table.capacity} seats</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {elapsedTimer(order.createdAt)} · {formatOrderLabel(order)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2 w-full text-left">
          <div className="flex items-center text-xs font-medium text-on-surface-variant">
            <Icon name="person" className="text-sm mr-1 opacity-70" />
            {table.capacity} seats
          </div>
          {cardStatus === 'free' && (
            <span className="text-[11px] font-semibold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
              + Seat table
            </span>
          )}
          {cardStatus === 'cleaning' && (
            <span className="text-[11px] font-semibold text-amber-800">Needs cleaning</span>
          )}
        </div>
      )}
    </button>
  );
}

export function FloorPlanLiveBoard({
  slug,
  plans,
  activePlanId,
  onActivePlanChange,
  plan,
  tables,
  elements,
  isLoading,
  activeOrderByTable,
  onCycleStatus,
  onMarkAvailable,
  onEditLayout,
  onAddTable,
}: {
  slug: string;
  plans: FloorPlan[];
  activePlanId: string | null;
  onActivePlanChange: (id: string) => void;
  plan?: FloorPlan;
  tables: FloorTable[];
  elements: FloorElement[];
  isLoading: boolean;
  activeOrderByTable: Record<string, Order>;
  onCycleStatus: (table: FloorTable) => void;
  onMarkAvailable: (table: FloorTable) => void;
  onEditLayout: () => void;
  onAddTable: () => void;
}) {
  const formatMoney = useFormatMoney();
  const [liveView, setLiveView] = useState<LiveView>('grid');
  const [filter, setFilter] = useState<CardFilter>('all');
  const [search, setSearch] = useState('');
  const [drawerTable, setDrawerTable] = useState<FloorTable | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => compareTableIds(a.tableIdentifier, b.tableIdentifier)),
    [tables],
  );

  const tableRows = useMemo(() => {
    return sortedTables.map((table) => ({
      table,
      order: activeOrderByTable[table.id] ?? table.activeOrder ?? null,
      cardStatus: resolveCardStatus(table, activeOrderByTable[table.id] ?? table.activeOrder),
    }));
  }, [sortedTables, activeOrderByTable]);

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tableRows.filter(({ table, cardStatus }) => {
      if (filter !== 'all' && cardStatus !== filter) return false;
      if (q && !table.tableIdentifier.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tableRows, filter, search]);

  const counts = useMemo(() => {
    const c: Record<CardFilter, number> = {
      all: tableRows.length,
      free: 0,
      seated: 0,
      bill: 0,
      reserved: 0,
      cleaning: 0,
    };
    for (const row of tableRows) {
      c[row.cardStatus] += 1;
    }
    return c;
  }, [tableRows]);

  const busyCount = counts.seated + counts.bill + counts.reserved;
  const openBillTotal = useMemo(() => {
    let sum = 0;
    for (const row of tableRows) {
      const o = row.order;
      if (o && !['COMPLETED', 'CANCELLED'].includes(o.status)) {
        sum += Number(o.totalAmount) || 0;
      }
    }
    return sum;
  }, [tableRows]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.level - b.level),
    [plans],
  );

  const canvasW = plan?.width ?? 800;
  const canvasH = plan?.height ?? 600;

  const filterPills: { key: CardFilter; label: string; className?: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'free', label: `Free (${counts.free})` },
    { key: 'seated', label: `Seated (${counts.seated})`, className: 'text-primary' },
    { key: 'bill', label: `Bill (${counts.bill})`, className: 'text-amber-700' },
    { key: 'reserved', label: `Reserved (${counts.reserved})`, className: 'text-cyan-700' },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background px-4 md:px-8 py-5">
      <section className="bg-surface rounded-2xl p-4 sm:p-5 border border-outline-variant/25 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Floor Plan</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-on-surface-variant flex flex-wrap items-center gap-x-2">
              <span>
                <strong className="font-semibold text-on-surface">{busyCount} of {counts.all}</strong> tables busy
              </span>
              <span className="text-outline-variant">•</span>
              <span className="text-primary font-semibold bg-primary-container/40 px-2 py-0.5 rounded-md border border-primary/15">
                {formatMoney(openBillTotal)} on open bills
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-36 sm:w-44">
              <Icon
                name="search"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant pointer-events-none"
              />
              <Input
                dense
                className="!h-9 !pl-8 !py-1.5 !text-xs"
                placeholder="Quick find table…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="inline-flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLiveView('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  liveView === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                <Icon name="grid_view" className="text-sm" />
                Grid view
              </button>
              <button
                type="button"
                onClick={() => setLiveView('spatial')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  liveView === 'spatial' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                <Icon name="map" className="text-sm" />
                Spatial map
              </button>
            </div>
            <Button variant="outline" onClick={onAddTable}>
              <Icon name="add" />
              Add table
            </Button>
            <Button variant="ghost" onClick={onEditLayout}>
              <Icon name="edit" />
              Edit layout
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {sortedPlans.map((p) => {
              const active = p.id === activePlanId;
              const count = p.id === activePlanId ? tables.length : p.tableCount ?? '—';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onActivePlanChange(p.id)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                    active
                      ? 'bg-primary text-on-primary border-primary shadow-sm'
                      : 'bg-surface text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-low'
                  }`}
                >
                  {p.name}
                  <span className={`ml-1 text-[11px] font-normal ${active ? 'opacity-80' : 'opacity-70'}`}>
                    · {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold mr-1 shrink-0">
              Filter
            </span>
            {filterPills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setFilter(pill.key)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  filter === pill.key
                    ? 'bg-surface-container-highest text-on-surface'
                    : `hover:bg-surface-container-low ${pill.className ?? 'text-on-surface-variant'}`
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : liveView === 'grid' ? (
        <section className="mt-4">
          {filteredTables.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant/40 bg-surface p-12 text-center">
              <Icon name="table_restaurant" className="text-4xl text-on-surface-variant/40" />
              <p className="mt-3 font-caption text-on-surface-variant">No tables match this filter.</p>
              {tables.length === 0 && (
                <Button variant="primary" className="mt-4" onClick={onAddTable}>Add your first table</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredTables.map(({ table, order }) => (
                <FloorTableCard
                  key={table.id}
                  table={table}
                  order={order}
                  onClick={() => setDrawerTable(table)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-4 bg-surface border border-outline-variant/25 rounded-2xl p-4 min-h-[420px] relative">
          <div className="flex items-center justify-between mb-3 border-b border-outline-variant/15 pb-3">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              {plan?.name ?? 'Floor'} layout
            </span>
            <span className="text-xs text-on-surface-variant">Tap a table for details</span>
          </div>
          <div className="relative h-[min(70vh,520px)]">
            <FloorPlanViewport
              canvasW={canvasW}
              canvasH={canvasH}
              userZoom={100}
              canvasRef={canvasRef}
              onDisplayScaleChange={() => {}}
            >
              {elements.map((element) => (
                <FloorElementNode key={element.id} element={element} />
              ))}
              {tables.map((table) => (
                <TableNode
                  key={table.id}
                  table={table}
                  onClick={() => setDrawerTable(table)}
                />
              ))}
            </FloorPlanViewport>
          </div>
        </section>
      )}

      <FloorTableDetailDrawer
        open={!!drawerTable}
        onClose={() => setDrawerTable(null)}
        table={drawerTable}
        slug={slug}
        activeOrder={drawerTable ? activeOrderByTable[drawerTable.id] : undefined}
        onCycleStatus={() => {
          if (drawerTable) onCycleStatus(drawerTable);
        }}
        onMarkReady={() => {
          if (drawerTable) onMarkAvailable(drawerTable);
        }}
      />
    </div>
  );
}
