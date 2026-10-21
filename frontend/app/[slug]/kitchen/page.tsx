'use client';

import { usePathname, useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';
import { Spinner } from '@/components/ui';
import {
  KitchenColumn,
  KitchenHeader,
  KitchenLoading,
  KitchenMobileTabs,
  KDS_ADVANCE,
  sortKitchenOrders,
  type KdsStatus,
} from '@/components/kitchen/kitchen-board';
import { useAuth } from '@/lib/auth/auth-context';
import {
  canAccessTenantRoute,
  getDefaultRoute,
  getKitchenExitRoute,
  isChefOnly,
} from '@/lib/auth/permissions';
import { formatApiError } from '@/lib/api/errors';
import { apiFetch } from '@/lib/api/client';
import { useUpdateKitchenOrderStatus } from '@/lib/hooks/mutations';
import { useBusiness, useFloorTables, useKitchenQueue, useReceiptTemplate } from '@/lib/hooks/queries';
import { useBusinessCurrency } from '@/lib/hooks/use-business-currency';
import { printOrderReceipt } from '@/lib/print-order-receipt';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';
import { kitchenBoardThemeStyle } from '@/lib/theme/theme-css';
import { useToast } from '@/lib/toast';
import { useTenantDocumentTitle } from '@/lib/hooks/use-document-title';
import type { Order } from '@/lib/api/types';

export default function KitchenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isReady } = useAuth();
  const tenantReady =
    isReady && isAuthenticated && canAccessTenantRoute(user, slug, pathname);
  const toast = useToast();
  const { data: orders = [], isLoading, dataUpdatedAt, isError, isFetching } = useKitchenQueue();
  const { data: tables = [] } = useFloorTables();
  const { data: business } = useBusiness();
  useTenantDocumentTitle('Kitchen', business?.name ?? slug);
  const { data: receiptTemplate } = useReceiptTemplate();
  const currency = useBusinessCurrency();
  const updateStatus = useUpdateKitchenOrderStatus();
  const network = useNetworkStatus({
    lastDataSync: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    syncFailed: isError,
    isSyncing: isFetching,
  });

  const [clock, setClock] = useState('');
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<KdsStatus | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [mobileColumn, setMobileColumn] = useState<KdsStatus>('RECEIVED');

  const pendingOrderId = updateStatus.isPending ? updateStatus.variables?.id : null;
  const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.tableIdentifier]));

  const received = useMemo(
    () => sortKitchenOrders(orders.filter((o) => o.status === 'RECEIVED')),
    [orders],
  );
  const preparing = useMemo(
    () => sortKitchenOrders(orders.filter((o) => o.status === 'PREPARING')),
    [orders],
  );
  const ready = useMemo(
    () => sortKitchenOrders(orders.filter((o) => o.status === 'READY')),
    [orders],
  );

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (isReady && isAuthenticated && user && !canAccessTenantRoute(user, slug, pathname)) {
      router.replace(getDefaultRoute(user, slug));
    }
  }, [isReady, isAuthenticated, user, router, slug, pathname]);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function setTicketStatus(ticketId: string, status: string, successMessage?: string) {
    updateStatus.mutate(
      { id: ticketId, status },
      {
        onSuccess: () => {
          if (successMessage) toast.success(successMessage);
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function bump(id: string, status: string) {
    const adv = KDS_ADVANCE[status];
    if (!adv) return;
    const label =
      adv.next === 'PREPARING'
        ? 'Moved to cooking'
        : adv.next === 'READY'
          ? 'Marked ready'
          : 'Ticket cleared';
    setTicketStatus(id, adv.next, label);
  }

  async function handlePrint(order: Order) {
    setPrintingOrderId(order.id);
    try {
      const full = await apiFetch<{ order: Order }>(`/kitchen/tickets/${order.id}`).then(
        (d) => d.order,
      );
      const label = order.tableId ? tableMap[order.tableId] ?? 'BAR' : 'BAR';
      printOrderReceipt(full, {
        tableLabel: label,
        businessName: business?.name,
        businessLogoUrl: business?.logoUrl,
        copyType: 'kitchen',
        currency,
        receiptTemplate,
      });
      toast.success('Kitchen ticket opened');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setPrintingOrderId(null);
    }
  }

  function moveOrder(orderId: string, fromStatus: string, toStatus: KdsStatus) {
    if (fromStatus === toStatus) return;
    const labels: Record<KdsStatus, string> = {
      RECEIVED: 'Received',
      PREPARING: 'Preparing',
      READY: 'Ready',
    };
    setTicketStatus(orderId, toStatus, `Ticket moved to ${labels[toStatus]}`);
  }

  function handleDragOver(e: React.DragEvent, status: KdsStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(status);
  }

  function handleDragLeave(e: React.DragEvent) {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDropTarget(null);
    }
  }

  function handleDrop(e: React.DragEvent, targetStatus: KdsStatus) {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/order-id');
    const fromStatus = e.dataTransfer.getData('text/order-status');
    setDropTarget(null);
    setDraggingOrderId(null);
    if (orderId) {
      void moveOrder(orderId, fromStatus, targetStatus);
    }
  }

  const columnHandlers = {
    onDragStart: setDraggingOrderId,
    onDragEnd: () => {
      setDraggingOrderId(null);
      setDropTarget(null);
    },
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onPrint: handlePrint,
    printingOrderId,
    onBump: bump,
    draggingOrderId,
    pendingOrderId,
  };

  const columnProps = {
    RECEIVED: {
      status: 'RECEIVED' as KdsStatus,
      orders: received,
      dropActive: dropTarget === 'RECEIVED',
    },
    PREPARING: {
      status: 'PREPARING' as KdsStatus,
      orders: preparing,
      dropActive: dropTarget === 'PREPARING',
    },
    READY: {
      status: 'READY' as KdsStatus,
      orders: ready,
      dropActive: dropTarget === 'READY',
    },
  };

  const boardTheme = kitchenBoardThemeStyle(business);
  const exitHref = getKitchenExitRoute(user, slug);
  const chefOnly = isChefOnly(user);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!tenantReady) {
    return (
      <div className="kds-board h-screen flex items-center justify-center" style={boardTheme}>
        <Spinner />
      </div>
    );
  }

  return (
    <div
      className="kds-board h-screen w-full min-h-0 flex flex-col overflow-hidden"
      style={boardTheme}
    >
      <KitchenHeader
        slug={slug}
        clock={clock}
        network={network}
        received={received.length}
        preparing={preparing.length}
        ready={ready.length}
        exitHref={exitHref}
        showLogout={chefOnly}
        onLogout={handleLogout}
      />

      <KitchenMobileTabs
        active={mobileColumn}
        onChange={setMobileColumn}
        counts={{ RECEIVED: received.length, PREPARING: preparing.length, READY: ready.length }}
      />

      {isLoading ? (
        <KitchenLoading />
      ) : (
        <main className="kds-main">
          <div className="hidden md:flex flex-1 min-w-0 gap-3 w-full">
            <KitchenColumn {...columnProps.RECEIVED} tableMap={tableMap} {...columnHandlers} />
            <KitchenColumn {...columnProps.PREPARING} tableMap={tableMap} {...columnHandlers} />
            <KitchenColumn {...columnProps.READY} tableMap={tableMap} {...columnHandlers} />
          </div>

          <div className="md:hidden flex-1 min-w-0 min-h-0 flex flex-col">
            <KitchenColumn
              {...columnProps[mobileColumn]}
              tableMap={tableMap}
              {...columnHandlers}
            />
          </div>
        </main>
      )}

    </div>
  );
}
