'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { FloorPlanLiveBoard } from '@/components/floor-plan/floor-plan-live-board';
import { FloorElementNode } from '@/components/floor-plan/floor-element-node';
import { FloorPlanViewport } from '@/components/floor-plan/floor-plan-viewport';
import { TableSelectionPopover } from '@/components/floor-plan/table-selection-popover';
import { statusLabel, TableNode } from '@/components/floor-plan/table-node';
import {
  Button,
  Icon,
  Input,
  Skeleton,
  TableSkeleton,
  DataTable,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeadCell,
  DataTableCell,
  DataTableActions,
} from '@/components/ui';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import type { FloorElement, FloorElementType, FloorTable, TableShape } from '@/lib/api/types';
import {
  useCreateFloorElement,
  useCreateFloorPlan,
  useCreateTable,
  useDeleteFloorElement,
  useDeleteFloorPlan,
  useDeleteTable,
  useUpdateFloorElement,
  useUpdateFloorPlan,
  useUpdateTableLayout,
  useUpdateTableStatus,
} from '@/lib/hooks/mutations';
import { useFloorPlans, useFloorPlanScene, useOrders } from '@/lib/hooks/queries';
import {
  COUNTER_STYLE_OPTIONS,
  defaultTableSize,
  DOOR_TYPE_OPTIONS,
  FLOOR_PRESETS,
  TABLE_SHAPE_OPTIONS,
  WINDOW_TYPE_OPTIONS,
} from '@/lib/floor-plan/utils';
import {
  applyResize,
  clientToCanvas,
  FLOOR_WALL_THICKNESS,
  innerFloorBounds,
  MIN_ELEMENT_HEIGHT,
  MIN_ELEMENT_WIDTH,
  MIN_TABLE_HEIGHT,
  MIN_TABLE_WIDTH,
  type Rect,
  type ResizeHandle,
} from '@/lib/floor-plan/canvas-coords';
import { useToast } from '@/lib/toast';
import { formatOrderLabel } from '@/lib/order-display';
type ScreenMode = 'live' | 'edit';
type ViewMode = 'canvas' | 'list';
type PositionsMap = Record<string, { x: number; y: number }>;
type SizesMap = Record<string, { width: number; height: number }>;

type LayoutSnapshot = {
  tables: PositionsMap;
  elements: PositionsMap;
  tableSizes: SizesMap;
  elementSizes: SizesMap;
};

type Interaction =
  | { mode: 'drag'; kind: 'table' | 'element'; id: string; offsetX: number; offsetY: number }
  | {
      mode: 'resize';
      kind: 'table' | 'element';
      id: string;
      handle: ResizeHandle;
      startClientX: number;
      startClientY: number;
      startRect: Rect;
    };

function positionsFromTables(tables: FloorTable[]): PositionsMap {
  const map: PositionsMap = {};
  for (const table of tables) {
    map[table.id] = { x: table.layoutX, y: table.layoutY };
  }
  return map;
}

function positionsFromElements(elements: FloorElement[]): PositionsMap {
  const map: PositionsMap = {};
  for (const el of elements) {
    map[el.id] = { x: el.layoutX, y: el.layoutY };
  }
  return map;
}

function positionsEqual(a: PositionsMap, b: PositionsMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key]?.x !== b[key]?.x || a[key]?.y !== b[key]?.y) return false;
  }
  return true;
}

function sizesFromTables(tables: FloorTable[]): SizesMap {
  const map: SizesMap = {};
  for (const table of tables) {
    map[table.id] = { width: table.width, height: table.height };
  }
  return map;
}

function sizesFromElements(elements: FloorElement[]): SizesMap {
  const map: SizesMap = {};
  for (const el of elements) {
    map[el.id] = { width: el.width, height: el.height };
  }
  return map;
}

function sizesEqual(a: SizesMap, b: SizesMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key]?.width !== b[key]?.width || a[key]?.height !== b[key]?.height) return false;
  }
  return true;
}

function StatusLegendDot({ status }: { status: FloorTable['status'] }) {
  const dot =
    status === 'OCCUPIED'
      ? 'bg-secondary-fixed'
      : status === 'RESERVED'
        ? 'bg-primary-fixed'
        : status === 'NEEDS_CLEANING'
          ? 'bg-surface-dim'
          : 'bg-tertiary-fixed';
  return <div className={`w-3 h-3 rounded-full ${dot}`} />;
}

const ELEMENT_DEFAULTS: Record<
  FloorElementType,
  { width: number; height: number; options: Record<string, unknown> }
> = {
  DOOR: { width: 56, height: 20, options: { doorType: 'single' } },
  WINDOW: { width: 80, height: 16, options: { windowType: 'standard' } },
  RECEPTION_COUNTER: { width: 180, height: 56, options: { counterStyle: 'straight' } },
  WALL: { width: 140, height: 12, options: {} },
};

export default function FloorPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data: plans = [], isLoading: plansLoading } = useFloorPlans();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const { data: scene, isLoading: sceneLoading } = useFloorPlanScene(activePlanId);
  const plan = scene?.plan;
  const tables = scene?.tables ?? [];
  const elements = scene?.elements ?? [];

  const { data: ordersData } = useOrders();
  const orders = ordersData?.orders ?? [];

  const createTable = useCreateTable();
  const createPlan = useCreateFloorPlan();
  const updatePlan = useUpdateFloorPlan();
  const deletePlan = useDeleteFloorPlan();
  const createElement = useCreateFloorElement();
  const updateElement = useUpdateFloorElement();
  const deleteElement = useDeleteFloorElement();
  const updateLayout = useUpdateTableLayout();
  const updateStatus = useUpdateTableStatus();
  const deleteTable = useDeleteTable();

  const canvasRef = useRef<HTMLDivElement>(null);
  const floorBtnRef = useRef<HTMLButtonElement>(null);
  const fixturesBtnRef = useRef<HTMLSpanElement>(null);
  const [floorMenuPos, setFloorMenuPos] = useState({ top: 0, left: 0 });
  const [fixturesMenuPos, setFixturesMenuPos] = useState({ top: 0, left: 0 });
  const interactionRef = useRef<Interaction | null>(null);
  const displayScaleRef = useRef(1);
  const tablePositionsRef = useRef<PositionsMap>({});
  const elementPositionsRef = useRef<PositionsMap>({});
  const tableSizesRef = useRef<SizesMap>({});
  const elementSizesRef = useRef<SizesMap>({});
  const movedDuringDragRef = useRef(false);
  const suppressClickRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const captureTargetRef = useRef<Element | null>(null);

  const [screenMode, setScreenMode] = useState<ScreenMode>('live');
  const [viewMode, setViewMode] = useState<ViewMode>('canvas');
  const [layersOpen, setLayersOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [floorModalOpen, setFloorModalOpen] = useState(false);
  const [dimModalOpen, setDimModalOpen] = useState(false);
  const [elementModalOpen, setElementModalOpen] = useState(false);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [deleteTableTarget, setDeleteTableTarget] = useState<FloorTable | null>(null);
  const [deleteElementTarget, setDeleteElementTarget] = useState<FloorElement | null>(null);
  const [zoom, setZoom] = useState(100);
  const [displayScale, setDisplayScale] = useState(1);
  const [saving, setSaving] = useState(false);

  const [tableForm, setTableForm] = useState({
    tableIdentifier: '',
    capacity: '4',
    shape: 'ROUND' as TableShape,
  });
  const [floorForm, setFloorForm] = useState({ name: '', level: '2', preset: 1 });
  const [dimForm, setDimForm] = useState({ width: '800', height: '600' });
  const [elementForm, setElementForm] = useState({
    type: 'DOOR' as FloorElementType,
    doorType: 'single',
    windowType: 'standard',
    counterStyle: 'straight',
  });
  const [formError, setFormError] = useState('');

  const [tablePositions, setTablePositions] = useState<PositionsMap>({});
  const [elementPositions, setElementPositions] = useState<PositionsMap>({});
  const [tableSizes, setTableSizes] = useState<SizesMap>({});
  const [elementSizes, setElementSizes] = useState<SizesMap>({});
  const [history, setHistory] = useState<LayoutSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    if (!activePlanId && plans.length > 0) {
      setActivePlanId(plans[0].id);
    }
  }, [plans, activePlanId]);

  const savedTablePositions = useMemo(() => positionsFromTables(tables), [tables]);
  const savedElementPositions = useMemo(() => positionsFromElements(elements), [elements]);
  const savedTableSizes = useMemo(() => sizesFromTables(tables), [tables]);
  const savedElementSizes = useMemo(() => sizesFromElements(elements), [elements]);

  const isDirty = useMemo(() => {
    if (!plan) return false;
    return (
      !positionsEqual(tablePositions, savedTablePositions) ||
      !positionsEqual(elementPositions, savedElementPositions) ||
      !sizesEqual(tableSizes, savedTableSizes) ||
      !sizesEqual(elementSizes, savedElementSizes)
    );
  }, [
    tablePositions,
    savedTablePositions,
    elementPositions,
    savedElementPositions,
    tableSizes,
    savedTableSizes,
    elementSizes,
    savedElementSizes,
    plan,
  ]);

  useEffect(() => {
    const nextTables = positionsFromTables(tables);
    const nextElements = positionsFromElements(elements);
    const nextTableSizes = sizesFromTables(tables);
    const nextElementSizes = sizesFromElements(elements);
    setTablePositions(nextTables);
    setElementPositions(nextElements);
    setTableSizes(nextTableSizes);
    setElementSizes(nextElementSizes);
    tablePositionsRef.current = nextTables;
    elementPositionsRef.current = nextElements;
    tableSizesRef.current = nextTableSizes;
    elementSizesRef.current = nextElementSizes;
    setHistory([
      {
        tables: nextTables,
        elements: nextElements,
        tableSizes: nextTableSizes,
        elementSizes: nextElementSizes,
      },
    ]);
    setHistoryIndex(0);
  }, [tables, elements, activePlanId]);

  useEffect(() => {
    tablePositionsRef.current = tablePositions;
  }, [tablePositions]);

  useEffect(() => {
    elementPositionsRef.current = elementPositions;
  }, [elementPositions]);

  useEffect(() => {
    tableSizesRef.current = tableSizes;
  }, [tableSizes]);

  useEffect(() => {
    elementSizesRef.current = elementSizes;
  }, [elementSizes]);

  useEffect(() => {
    if (!layersOpen || !floorBtnRef.current) return;
    const update = () => {
      const rect = floorBtnRef.current!.getBoundingClientRect();
      setFloorMenuPos({ top: rect.bottom + 8, left: rect.left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [layersOpen, viewMode]);

  useEffect(() => {
    if (!paletteOpen || !fixturesBtnRef.current) return;
    const update = () => {
      const rect = fixturesBtnRef.current!.getBoundingClientRect();
      setFixturesMenuPos({ top: rect.bottom + 8, left: Math.max(16, rect.right - 256) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [paletteOpen, viewMode]);

  const activeOrderByTable = useMemo(() => {
    const map: Record<string, (typeof orders)[0]> = {};
    for (const order of orders) {
      if (
        order.tableId &&
        !['COMPLETED', 'CANCELLED'].includes(order.status) &&
        !map[order.tableId]
      ) {
        map[order.tableId] = order;
      }
    }
    return map;
  }, [orders]);

  const canvasW = plan?.width ?? 800;
  const canvasH = plan?.height ?? 600;

  const pushHistory = useCallback(() => {
    const snapshot: LayoutSnapshot = {
      tables: { ...tablePositionsRef.current },
      elements: { ...elementPositionsRef.current },
      tableSizes: { ...tableSizesRef.current },
      elementSizes: { ...elementSizesRef.current },
    };
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, snapshot];
    });
    setHistoryIndex((i) => i + 1);
  }, [historyIndex]);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!interactionRef.current || !canvasRef.current) return;
      const scale = displayScaleRef.current;
      const bounds = innerFloorBounds(canvasW, canvasH);
      const interaction = interactionRef.current;

      if (interaction.mode === 'resize') {
        const dx = (e.clientX - interaction.startClientX) / scale;
        const dy = (e.clientY - interaction.startClientY) / scale;
        const minW = interaction.kind === 'table' ? MIN_TABLE_WIDTH : MIN_ELEMENT_WIDTH;
        const minH = interaction.kind === 'table' ? MIN_TABLE_HEIGHT : MIN_ELEMENT_HEIGHT;
        const next = applyResize(
          interaction.handle,
          interaction.startRect,
          dx,
          dy,
          bounds,
          minW,
          minH,
        );

        if (interaction.kind === 'table') {
          if (
            next.x !== interaction.startRect.x ||
            next.y !== interaction.startRect.y ||
            next.width !== interaction.startRect.width ||
            next.height !== interaction.startRect.height
          ) {
            movedDuringDragRef.current = true;
          }
          const pos = { x: next.x, y: next.y };
          const size = { width: next.width, height: next.height };
          tablePositionsRef.current = { ...tablePositionsRef.current, [interaction.id]: pos };
          tableSizesRef.current = { ...tableSizesRef.current, [interaction.id]: size };
          setTablePositions((prev) => ({ ...prev, [interaction.id]: pos }));
          setTableSizes((prev) => ({ ...prev, [interaction.id]: size }));
        } else {
          if (
            next.x !== interaction.startRect.x ||
            next.y !== interaction.startRect.y ||
            next.width !== interaction.startRect.width ||
            next.height !== interaction.startRect.height
          ) {
            movedDuringDragRef.current = true;
          }
          const pos = { x: next.x, y: next.y };
          const size = { width: next.width, height: next.height };
          elementPositionsRef.current = { ...elementPositionsRef.current, [interaction.id]: pos };
          elementSizesRef.current = { ...elementSizesRef.current, [interaction.id]: size };
          setElementPositions((prev) => ({ ...prev, [interaction.id]: pos }));
          setElementSizes((prev) => ({ ...prev, [interaction.id]: size }));
        }
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const canvasPt = clientToCanvas(e.clientX, e.clientY, rect, scale);

      if (interaction.kind === 'table') {
        const size = tableSizesRef.current[interaction.id];
        if (!size) return;
        const x = Math.max(bounds.minX, Math.min(bounds.maxX - size.width, canvasPt.x - interaction.offsetX));
        const y = Math.max(bounds.minY, Math.min(bounds.maxY - size.height, canvasPt.y - interaction.offsetY));
        const prev = tablePositionsRef.current[interaction.id];
        if (prev && (Math.abs(x - prev.x) > 2 || Math.abs(y - prev.y) > 2)) {
          movedDuringDragRef.current = true;
        }
        setTablePositions((prevMap) => {
          const next = { ...prevMap, [interaction.id]: { x, y } };
          tablePositionsRef.current = next;
          return next;
        });
      } else {
        const size = elementSizesRef.current[interaction.id];
        if (!size) return;
        const x = Math.max(bounds.minX, Math.min(bounds.maxX - size.width, canvasPt.x - interaction.offsetX));
        const y = Math.max(bounds.minY, Math.min(bounds.maxY - size.height, canvasPt.y - interaction.offsetY));
        const prev = elementPositionsRef.current[interaction.id];
        if (prev && (Math.abs(x - prev.x) > 2 || Math.abs(y - prev.y) > 2)) {
          movedDuringDragRef.current = true;
        }
        setElementPositions((prevMap) => {
          const next = { ...prevMap, [interaction.id]: { x, y } };
          elementPositionsRef.current = next;
          return next;
        });
      }
    },
    [canvasW, canvasH],
  );

  const endInteraction = useCallback(() => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', endInteraction);
    window.removeEventListener('pointercancel', endInteraction);

    if (activePointerIdRef.current !== null && captureTargetRef.current) {
      try {
        captureTargetRef.current.releasePointerCapture(activePointerIdRef.current);
      } catch {
        /* ignore */
      }
    }
    activePointerIdRef.current = null;
    captureTargetRef.current = null;

    if (!interactionRef.current) return;

    const hadMove = movedDuringDragRef.current;
    interactionRef.current = null;

    if (hadMove) pushHistory();

    movedDuringDragRef.current = false;
    if (hadMove) {
      suppressClickRef.current = true;
      requestAnimationFrame(() => {
        suppressClickRef.current = false;
      });
    }
  }, [handlePointerMove, pushHistory]);

  function bindPointerListeners(pointerId: number, captureTarget: Element) {
    activePointerIdRef.current = pointerId;
    captureTargetRef.current = captureTarget;
    try {
      captureTarget.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endInteraction);
    window.addEventListener('pointercancel', endInteraction);
  }

  function startTableDrag(e: React.PointerEvent, table: FloorTable) {
    if (viewMode !== 'canvas' || !canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    movedDuringDragRef.current = false;
    setSelectedTableId(table.id);
    setSelectedElementId(null);
    const pos = tablePositionsRef.current[table.id] ?? {
      x: table.layoutX,
      y: table.layoutY,
    };
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasPt = clientToCanvas(e.clientX, e.clientY, rect, displayScaleRef.current);
    interactionRef.current = {
      mode: 'drag',
      kind: 'table',
      id: table.id,
      offsetX: canvasPt.x - pos.x,
      offsetY: canvasPt.y - pos.y,
    };
    setTablePositions((prev) => ({ ...prev, [table.id]: pos }));
    bindPointerListeners(e.pointerId, e.currentTarget as Element);
  }

  function startElementDrag(e: React.PointerEvent, element: FloorElement) {
    if (viewMode !== 'canvas' || !canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    movedDuringDragRef.current = false;
    setSelectedElementId(element.id);
    setSelectedTableId(null);
    const pos = elementPositionsRef.current[element.id] ?? {
      x: element.layoutX,
      y: element.layoutY,
    };
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasPt = clientToCanvas(e.clientX, e.clientY, rect, displayScaleRef.current);
    interactionRef.current = {
      mode: 'drag',
      kind: 'element',
      id: element.id,
      offsetX: canvasPt.x - pos.x,
      offsetY: canvasPt.y - pos.y,
    };
    setElementPositions((prev) => ({ ...prev, [element.id]: pos }));
    bindPointerListeners(e.pointerId, e.currentTarget as Element);
  }

  function startTableResize(handle: ResizeHandle, e: React.PointerEvent, table: FloorTable) {
    if (viewMode !== 'canvas') return;
    e.preventDefault();
    e.stopPropagation();
    movedDuringDragRef.current = false;
    setSelectedTableId(table.id);
    setSelectedElementId(null);
    const pos = tablePositionsRef.current[table.id] ?? {
      x: table.layoutX,
      y: table.layoutY,
    };
    const size = tableSizesRef.current[table.id] ?? {
      width: table.width,
      height: table.height,
    };
    interactionRef.current = {
      mode: 'resize',
      kind: 'table',
      id: table.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: { x: pos.x, y: pos.y, width: size.width, height: size.height },
    };
    bindPointerListeners(e.pointerId, e.currentTarget as Element);
  }

  function startElementResize(handle: ResizeHandle, e: React.PointerEvent, element: FloorElement) {
    if (viewMode !== 'canvas') return;
    e.preventDefault();
    e.stopPropagation();
    movedDuringDragRef.current = false;
    setSelectedElementId(element.id);
    setSelectedTableId(null);
    const pos = elementPositionsRef.current[element.id] ?? {
      x: element.layoutX,
      y: element.layoutY,
    };
    const size = elementSizesRef.current[element.id] ?? {
      width: element.width,
      height: element.height,
    };
    interactionRef.current = {
      mode: 'resize',
      kind: 'element',
      id: element.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: { x: pos.x, y: pos.y, width: size.width, height: size.height },
    };
    bindPointerListeners(e.pointerId, e.currentTarget as Element);
  }

  function undo() {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const snap = history[nextIndex];
    setHistoryIndex(nextIndex);
    setTablePositions(snap.tables);
    setElementPositions(snap.elements);
    setTableSizes(snap.tableSizes);
    setElementSizes(snap.elementSizes);
    tablePositionsRef.current = snap.tables;
    elementPositionsRef.current = snap.elements;
    tableSizesRef.current = snap.tableSizes;
    elementSizesRef.current = snap.elementSizes;
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const snap = history[nextIndex];
    setHistoryIndex(nextIndex);
    setTablePositions(snap.tables);
    setElementPositions(snap.elements);
    setTableSizes(snap.tableSizes);
    setElementSizes(snap.elementSizes);
    tablePositionsRef.current = snap.tables;
    elementPositionsRef.current = snap.elements;
    tableSizesRef.current = snap.tableSizes;
    elementSizesRef.current = snap.elementSizes;
  }

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    if (!activePlanId) return;
    setFormError('');
    const capacity = Number(tableForm.capacity) || 4;
    const size = defaultTableSize(tableForm.shape, capacity);
    const count = tables.length;
    try {
      await createTable.mutateAsync({
        floorPlanId: activePlanId,
        tableIdentifier: tableForm.tableIdentifier.trim(),
        layoutX: 60 + FLOOR_WALL_THICKNESS + (count % 4) * (size.width + 24),
        layoutY: 60 + FLOOR_WALL_THICKNESS + Math.floor(count / 4) * (size.height + 40),
        capacity,
        shape: tableForm.shape,
        width: size.width,
        height: size.height,
      });
      toast.success('Table added');
      setTableForm({ tableIdentifier: '', capacity: '4', shape: 'ROUND' });
      setTableModalOpen(false);
    } catch (err) {
      setFormError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  async function handleAddFloor(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const preset = FLOOR_PRESETS[Number(floorForm.preset)] ?? FLOOR_PRESETS[1];
    const width = preset.width || Number(dimForm.width) || 800;
    const height = preset.height || Number(dimForm.height) || 600;
    try {
      const result = await createPlan.mutateAsync({
        name: floorForm.name.trim() || `Floor ${floorForm.level}`,
        level: Number(floorForm.level) || plans.length + 1,
        width,
        height,
      });
      setActivePlanId(result.plan.id);
      toast.success('Floor created');
      setFloorModalOpen(false);
      setLayersOpen(false);
    } catch (err) {
      setFormError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  async function handleUpdateDimensions(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setFormError('');
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        width: Number(dimForm.width) || plan.width,
        height: Number(dimForm.height) || plan.height,
      });
      toast.success('Floor dimensions updated');
      setDimModalOpen(false);
    } catch (err) {
      setFormError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  async function handleAddElement(e: React.FormEvent) {
    e.preventDefault();
    if (!activePlanId) return;
    setFormError('');
    const defaults = ELEMENT_DEFAULTS[elementForm.type];
    const options = { ...defaults.options };
    if (elementForm.type === 'DOOR') options.doorType = elementForm.doorType;
    if (elementForm.type === 'WINDOW') options.windowType = elementForm.windowType;
    if (elementForm.type === 'RECEPTION_COUNTER') options.counterStyle = elementForm.counterStyle;
    const count = elements.filter((el) => el.type === elementForm.type).length;
    try {
      await createElement.mutateAsync({
        planId: activePlanId,
        type: elementForm.type,
        layoutX: FLOOR_WALL_THICKNESS + 40 + (count % 3) * 100,
        layoutY:
          elementForm.type === 'DOOR'
            ? canvasH - FLOOR_WALL_THICKNESS - defaults.height - 8
            : FLOOR_WALL_THICKNESS + 20 + Math.floor(count / 3) * 60,
        width: defaults.width,
        height: defaults.height,
        options,
      });
      toast.success('Element added');
      setElementModalOpen(false);
      setPaletteOpen(false);
    } catch (err) {
      setFormError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  async function handleSaveLayout() {
    if (!activePlanId) return;
    const dirtyTables = tables.filter((table) => {
      const pos = tablePositions[table.id];
      const size = tableSizes[table.id];
      return (
        pos &&
        (pos.x !== table.layoutX ||
          pos.y !== table.layoutY ||
          size?.width !== table.width ||
          size?.height !== table.height)
      );
    });
    const dirtyElements = elements.filter((el) => {
      const pos = elementPositions[el.id];
      const size = elementSizes[el.id];
      return (
        pos &&
        (pos.x !== el.layoutX ||
          pos.y !== el.layoutY ||
          size?.width !== el.width ||
          size?.height !== el.height)
      );
    });
    if (dirtyTables.length === 0 && dirtyElements.length === 0) {
      toast.success('Layout saved');
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        ...dirtyTables.map((table) =>
          updateLayout.mutateAsync({
            id: table.id,
            floorPlanId: activePlanId,
            layoutX: tablePositions[table.id].x,
            layoutY: tablePositions[table.id].y,
            width: tableSizes[table.id]?.width,
            height: tableSizes[table.id]?.height,
          }),
        ),
        ...dirtyElements.map((el) =>
          updateElement.mutateAsync({
            id: el.id,
            floorPlanId: activePlanId,
            layoutX: elementPositions[el.id].x,
            layoutY: elementPositions[el.id].y,
            width: elementSizes[el.id]?.width,
            height: elementSizes[el.id]?.height,
          }),
        ),
      ]);
      toast.success('Layout saved');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function cycleStatus(table: FloorTable) {
    const order: FloorTable['status'][] = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING'];
    const next = order[(order.indexOf(table.status) + 1) % order.length];
    updateStatus.mutate(
      { id: table.id, status: next },
      {
        onSuccess: () =>
          toast.success(`${table.tableIdentifier} → ${statusLabel(next).toLowerCase()}`),
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  function markTableAvailable(table: FloorTable) {
    updateStatus.mutate(
      { id: table.id, status: 'AVAILABLE' },
      {
        onSuccess: () => toast.success(`${table.tableIdentifier} is ready`),
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  const isLoading = plansLoading || sceneLoading;

  return (
    <BusinessLayout slug={slug} fullBleed hideFab showHeaderTitle={false}>
      {screenMode === 'live' ? (
        <FloorPlanLiveBoard
          slug={slug}
          plans={plans}
          activePlanId={activePlanId}
          onActivePlanChange={setActivePlanId}
          plan={plan}
          tables={tables}
          elements={elements}
          isLoading={isLoading}
          activeOrderByTable={activeOrderByTable}
          onCycleStatus={cycleStatus}
          onMarkAvailable={markTableAvailable}
          onEditLayout={() => setScreenMode('edit')}
          onAddTable={() => setTableModalOpen(true)}
        />
      ) : (
      <div className="relative flex flex-col flex-1 min-h-0 isolate">
      <header className="sticky top-0 z-40 shrink-0 bg-surface border-b border-outline-variant/30 px-4 md:px-8 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <h2 className="font-title-lg text-primary shrink-0">Edit layout</h2>
          <Button variant="ghost" className="!py-1.5 !px-3" onClick={() => setScreenMode('live')}>
            <Icon name="arrow_back" className="text-sm" />
            Live view
          </Button>
          <div className="h-6 w-px bg-outline-variant/30 shrink-0 hidden sm:block" />
          {plan && (
            <div className="relative shrink-0">
              <button
                ref={floorBtnRef}
                type="button"
                onClick={() => {
                  setLayersOpen((o) => !o);
                  setPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-primary font-caption whitespace-nowrap"
              >
                <Icon name="layers" className="text-sm" />
                <span className="font-body-emphasis text-primary">{plan.name}</span>
                <span className="text-on-surface-variant">· L{plan.level}</span>
                <Icon name="expand_more" className="text-sm" />
              </button>
            </div>
          )}
          <div className="flex items-center bg-surface-container-low rounded-lg p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded font-caption transition-colors ${
                viewMode === 'canvas'
                  ? 'bg-surface text-primary shadow-sm font-bold'
                  : 'text-on-surface-variant font-medium hover:text-primary'
              }`}
            >
              <Icon name="grid_view" className="text-sm" />
              Canvas
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded font-caption transition-colors ${
                viewMode === 'list'
                  ? 'bg-surface text-primary shadow-sm font-bold'
                  : 'text-on-surface-variant font-medium hover:text-primary'
              }`}
            >
              <Icon name="list" className="text-sm" />
              List
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {viewMode === 'canvas' && (
            <>
              <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1">
                <button type="button" onClick={() => setZoom((z) => Math.max(50, z - 10))} className="p-1.5 hover:bg-surface-dim/30 rounded">
                  <Icon name="zoom_out" className="text-sm" />
                </button>
                <span className="font-mono font-caption px-2 min-w-[3rem] text-center">{zoom}%</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(150, z + 10))} className="p-1.5 hover:bg-surface-dim/30 rounded">
                  <Icon name="zoom_in" className="text-sm" />
                </button>
              </div>
              <Button variant="outline" onClick={() => { setDimForm({ width: String(canvasW), height: String(canvasH) }); setDimModalOpen(true); }}>
                <Icon name="straighten" />
                <span className="hidden sm:inline">Dimensions</span>
              </Button>
              <span ref={fixturesBtnRef} className="inline-flex">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaletteOpen((o) => !o);
                    setLayersOpen(false);
                  }}
                >
                  <Icon name="door_front" />
                  <span className="hidden sm:inline">Fixtures</span>
                </Button>
              </span>
            </>
          )}
          <Button variant="outline" onClick={() => setTableModalOpen(true)}>
            <Icon name="add" />
            Add Table
          </Button>
          <Button variant="primary" loading={saving} onClick={handleSaveLayout} disabled={viewMode === 'list' || !isDirty}>
            <Icon name="save" />
            Save
          </Button>
        </div>
        </div>
      </header>

      {viewMode === 'canvas' ? (
        <div className="flex-1 relative z-0 flex flex-col min-h-0 bg-background">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Skeleton className="w-64 h-48 rounded-xl" />
            </div>
          )}
          <FloorPlanViewport
            canvasW={canvasW}
            canvasH={canvasH}
            userZoom={zoom}
            canvasRef={canvasRef}
            onDisplayScaleChange={(scale) => {
              displayScaleRef.current = scale;
              setDisplayScale(scale);
            }}
          >
            {elements.map((element) => {
              const pos = elementPositions[element.id] ?? { x: element.layoutX, y: element.layoutY };
              const size = elementSizes[element.id] ?? {
                width: element.width,
                height: element.height,
              };
              return (
                <FloorElementNode
                  key={element.id}
                  element={{ ...element, layoutX: pos.x, layoutY: pos.y, width: size.width, height: size.height }}
                  selected={selectedElementId === element.id}
                  onPointerDown={(e) => startElementDrag(e, element)}
                  onResizeStart={(handle, e) => startElementResize(handle, e, element)}
                  onClick={() => {
                    if (suppressClickRef.current || movedDuringDragRef.current) return;
                    setSelectedElementId(element.id);
                    setSelectedTableId(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setDeleteElementTarget(element);
                  }}
                />
              );
            })}

            {tables.map((table) => {
              const pos = tablePositions[table.id] ?? { x: table.layoutX, y: table.layoutY };
              const size = tableSizes[table.id] ?? { width: table.width, height: table.height };
              const isSelected = selectedTableId === table.id;

              return (
                <TableNode
                  key={table.id}
                  table={{ ...table, layoutX: pos.x, layoutY: pos.y, width: size.width, height: size.height }}
                  selected={isSelected}
                  onPointerDown={(e) => startTableDrag(e, table)}
                  onResizeStart={(handle, e) => startTableResize(handle, e, table)}
                  onClick={() => {
                    if (suppressClickRef.current || movedDuringDragRef.current) return;
                    setSelectedTableId((id) => (id === table.id ? null : table.id));
                    setSelectedElementId(null);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setDeleteTableTarget(table);
                  }}
                />
              );
            })}

            {tables.length === 0 && elements.length === 0 && !isLoading && (
              <div
                className="absolute flex flex-col items-center justify-center text-on-surface-variant gap-3 pointer-events-none"
                style={{
                  left: FLOOR_WALL_THICKNESS,
                  top: FLOOR_WALL_THICKNESS,
                  width: canvasW - FLOOR_WALL_THICKNESS * 2,
                  height: canvasH - FLOOR_WALL_THICKNESS * 2,
                }}
              >
                <Icon name="table_restaurant" className="text-4xl opacity-40" />
                <p className="font-caption">Add tables and fixtures to build your floor</p>
                <div className="flex gap-2 pointer-events-auto">
                  <Button variant="outline" onClick={() => setTableModalOpen(true)}>Add table</Button>
                  <Button variant="outline" onClick={() => setPaletteOpen(true)}>Add fixtures</Button>
                </div>
              </div>
            )}
          </FloorPlanViewport>

          {selectedTableId && (() => {
            const table = tables.find((t) => t.id === selectedTableId);
            if (!table) return null;
            const pos = tablePositions[table.id] ?? { x: table.layoutX, y: table.layoutY };
            const size = tableSizes[table.id] ?? { width: table.width, height: table.height };
            return (
              <TableSelectionPopover
                table={table}
                position={pos}
                size={size}
                canvasRef={canvasRef}
                displayScale={displayScale}
                slug={slug}
                activeOrder={activeOrderByTable[table.id]}
                onCycleStatus={() => cycleStatus(table)}
                onClose={() => setSelectedTableId(null)}
              />
            );
          })()}

          <div className="absolute bottom-4 left-4 bg-surface/80 backdrop-blur-md border border-outline-variant/20 rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
            {(
              [
                ['Available', 'AVAILABLE'],
                ['Occupied', 'OCCUPIED'],
                ['Reserved', 'RESERVED'],
                ['Maintenance', 'NEEDS_CLEANING'],
              ] as const
            ).map(([label, status]) => (
              <div key={label} className="flex items-center gap-2">
                <StatusLegendDot status={status} />
                <span className="font-caption">{label}</span>
              </div>
            ))}
          </div>

          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button type="button" onClick={() => setZoom(100)} className="w-12 h-12 bg-surface border border-outline-variant/30 rounded-full flex items-center justify-center hover:text-primary hover:shadow-md" title="Reset zoom">
              <Icon name="center_focus_strong" />
            </button>
            <button type="button" onClick={undo} disabled={historyIndex <= 0} className="w-12 h-12 bg-surface border border-outline-variant/30 rounded-full flex items-center justify-center hover:text-primary disabled:opacity-40" title="Undo">
              <Icon name="undo" />
            </button>
            <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className="w-12 h-12 bg-surface border border-outline-variant/30 rounded-full flex items-center justify-center hover:text-primary disabled:opacity-40" title="Redo">
              <Icon name="redo" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-background p-4 md:p-8 min-h-0">
          {isLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : tables.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="font-body-emphasis text-on-surface-variant">No tables on {plan?.name ?? 'this floor'}</p>
              <Button variant="primary" onClick={() => setTableModalOpen(true)}>
                <Icon name="add" />
                Add table
              </Button>
            </div>
          ) : (
            <DataTable minWidth="640px" className="max-w-container-max mx-auto">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeadCell>Table</DataTableHeadCell>
                  <DataTableHeadCell>Shape</DataTableHeadCell>
                  <DataTableHeadCell>Status</DataTableHeadCell>
                  <DataTableHeadCell align="right">Seats</DataTableHeadCell>
                  <DataTableHeadCell align="right">Actions</DataTableHeadCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {tables.map((table) => (
                  <DataTableRow key={table.id}>
                    <DataTableCell className="font-body-emphasis">{table.tableIdentifier}</DataTableCell>
                    <DataTableCell className="capitalize text-on-surface-variant">
                      {table.shape?.toLowerCase() ?? 'round'}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center gap-2">
                        <StatusLegendDot status={table.status} />
                        <span>{statusLabel(table.status)}</span>
                      </div>
                    </DataTableCell>
                    <DataTableCell align="right">{table.capacity}</DataTableCell>
                    <DataTableCell align="right">
                      <DataTableActions>
                        <button
                          type="button"
                          title="View on floor plan"
                          onClick={() => {
                            setViewMode('canvas');
                            setSelectedTableId(table.id);
                          }}
                          className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                        >
                          <Icon name="grid_view" />
                        </button>
                        <button
                          type="button"
                          title="Cycle status"
                          onClick={() => cycleStatus(table)}
                          className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                        >
                          <Icon name="sync" />
                        </button>
                        <button
                          type="button"
                          title="Remove table"
                          onClick={() => setDeleteTableTarget(table)}
                          className="p-2 rounded-lg hover:bg-error-container/40 text-error"
                        >
                          <Icon name="delete" />
                        </button>
                      </DataTableActions>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </div>
      )}

      </div>
      )}

      <Modal
        open={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        title="Add table"
        description="Choose shape and seats — chairs are placed automatically."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTableModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="fp-table-form" variant="primary" loading={createTable.isPending}>Add to floor</Button>
          </>
        }
      >
        <form id="fp-table-form" onSubmit={handleAddTable} className="space-y-4">
          <Input label="Table name" value={tableForm.tableIdentifier} onChange={(e) => setTableForm((f) => ({ ...f, tableIdentifier: e.target.value }))} placeholder="T1" required />
          <Input label="Seats" type="number" min={1} max={20} value={tableForm.capacity} onChange={(e) => setTableForm((f) => ({ ...f, capacity: e.target.value }))} required />
          <div>
            <p className="font-caption text-on-surface-variant mb-2">Table shape</p>
            <div className="grid grid-cols-2 gap-2">
              {TABLE_SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTableForm((f) => ({ ...f, shape: opt.value }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-caption ${
                    tableForm.shape === opt.value
                      ? 'border-primary bg-primary-container text-on-primary-container'
                      : 'border-outline-variant/30 hover:bg-surface-container-low'
                  }`}
                >
                  <Icon name={opt.icon} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {formError && <p className="font-caption text-error">{formError}</p>}
        </form>
      </Modal>

      {screenMode === 'edit' && (
      <>
      <Modal
        open={floorModalOpen}
        onClose={() => setFloorModalOpen(false)}
        title="Add floor"
        description="Create a new level for multi-story buildings."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFloorModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="fp-floor-form" variant="primary" loading={createPlan.isPending}>Create floor</Button>
          </>
        }
      >
        <form id="fp-floor-form" onSubmit={handleAddFloor} className="space-y-4">
          <Input label="Floor name" value={floorForm.name} onChange={(e) => setFloorForm((f) => ({ ...f, name: e.target.value }))} placeholder="First Floor" />
          <Input label="Level number" type="number" min={1} value={floorForm.level} onChange={(e) => setFloorForm((f) => ({ ...f, level: e.target.value }))} />
          <div>
            <p className="font-caption text-on-surface-variant mb-2">Floor dimensions</p>
            <div className="grid grid-cols-2 gap-2">
              {FLOOR_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setFloorForm((f) => ({ ...f, preset: i }))}
                  className={`px-3 py-2 rounded-lg border font-caption text-left ${
                    Number(floorForm.preset) === i
                      ? 'border-primary bg-primary-container text-on-primary-container'
                      : 'border-outline-variant/30 hover:bg-surface-container-low'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {Number(floorForm.preset) === FLOOR_PRESETS.length - 1 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input label="Width (px)" type="number" value={dimForm.width} onChange={(e) => setDimForm((f) => ({ ...f, width: e.target.value }))} />
                <Input label="Height (px)" type="number" value={dimForm.height} onChange={(e) => setDimForm((f) => ({ ...f, height: e.target.value }))} />
              </div>
            )}
          </div>
          {formError && <p className="font-caption text-error">{formError}</p>}
        </form>
      </Modal>

      <Modal
        open={dimModalOpen}
        onClose={() => setDimModalOpen(false)}
        title="Floor dimensions"
        description={`Resize ${plan?.name ?? 'this floor'} canvas.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDimModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="fp-dim-form" variant="primary" loading={updatePlan.isPending}>Update</Button>
          </>
        }
      >
        <form id="fp-dim-form" onSubmit={handleUpdateDimensions} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            {FLOOR_PRESETS.slice(0, 3).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setDimForm({ width: String(preset.width), height: String(preset.height) })}
                className="px-3 py-2 rounded-lg border border-outline-variant/30 hover:bg-surface-container-low font-caption text-left"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Width (px)" type="number" min={300} max={5000} value={dimForm.width} onChange={(e) => setDimForm((f) => ({ ...f, width: e.target.value }))} required />
            <Input label="Height (px)" type="number" min={300} max={5000} value={dimForm.height} onChange={(e) => setDimForm((f) => ({ ...f, height: e.target.value }))} required />
          </div>
          {formError && <p className="font-caption text-error">{formError}</p>}
        </form>
      </Modal>

      <Modal
        open={elementModalOpen}
        onClose={() => setElementModalOpen(false)}
        title="Add fixture"
        description="Place doors, windows, or reception counters on the floor."
        footer={
          <>
            <Button variant="ghost" onClick={() => setElementModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="fp-element-form" variant="primary" loading={createElement.isPending}>Place on floor</Button>
          </>
        }
      >
        <form id="fp-element-form" onSubmit={handleAddElement} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['DOOR', 'WINDOW', 'RECEPTION_COUNTER', 'WALL'] as FloorElementType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setElementForm((f) => ({ ...f, type }))}
                className={`px-3 py-2 rounded-lg border font-caption capitalize ${
                  elementForm.type === type
                    ? 'border-primary bg-primary-container text-on-primary-container'
                    : 'border-outline-variant/30'
                }`}
              >
                {type.replace('_', ' ').toLowerCase()}
              </button>
            ))}
          </div>
          {elementForm.type === 'DOOR' && (
            <div className="space-y-2">
              <p className="font-caption text-on-surface-variant">Door type</p>
              {DOOR_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 font-caption">
                  <input type="radio" name="doorType" checked={elementForm.doorType === opt.value} onChange={() => setElementForm((f) => ({ ...f, doorType: opt.value }))} />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
          {elementForm.type === 'WINDOW' && (
            <div className="space-y-2">
              <p className="font-caption text-on-surface-variant">Window type</p>
              {WINDOW_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 font-caption">
                  <input type="radio" name="windowType" checked={elementForm.windowType === opt.value} onChange={() => setElementForm((f) => ({ ...f, windowType: opt.value }))} />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
          {elementForm.type === 'RECEPTION_COUNTER' && (
            <div className="space-y-2">
              <p className="font-caption text-on-surface-variant">Counter style</p>
              <div className="grid grid-cols-2 gap-2">
                {COUNTER_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setElementForm((f) => ({ ...f, counterStyle: opt.value }))}
                    className={`px-3 py-2 rounded-lg border font-caption ${
                      elementForm.counterStyle === opt.value
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-outline-variant/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {formError && <p className="font-caption text-error">{formError}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTableTarget}
        onClose={() => setDeleteTableTarget(null)}
        onConfirm={async () => {
          if (!deleteTableTarget) return;
          await deleteTable.mutateAsync({ id: deleteTableTarget.id, floorPlanId: activePlanId ?? undefined });
          setDeleteTableTarget(null);
          if (selectedTableId === deleteTableTarget.id) setSelectedTableId(null);
        }}
        title="Remove table"
        message={`Remove ${deleteTableTarget?.tableIdentifier} from this floor?`}
        confirmLabel="Remove"
        destructive
      />

      <ConfirmDialog
        open={!!deleteElementTarget}
        onClose={() => setDeleteElementTarget(null)}
        onConfirm={async () => {
          if (!deleteElementTarget) return;
          await deleteElement.mutateAsync({ id: deleteElementTarget.id, floorPlanId: activePlanId ?? undefined });
          setDeleteElementTarget(null);
          if (selectedElementId === deleteElementTarget.id) setSelectedElementId(null);
        }}
        title="Remove fixture"
        message="Remove this fixture from the floor?"
        confirmLabel="Remove"
        destructive
      />

      {typeof document !== 'undefined' && layersOpen &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[200] cursor-default bg-transparent"
              onClick={() => setLayersOpen(false)}
              aria-label="Close floors menu"
            />
            <div
              className="fixed z-[201] w-72 bg-surface border border-outline-variant/30 rounded-2xl shadow-xl p-4 space-y-3"
              style={{ top: floorMenuPos.top, left: floorMenuPos.left }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-body-emphasis text-primary">Floors</h3>
                <button type="button" onClick={() => setLayersOpen(false)} className="p-1 rounded hover:bg-surface-container-low">
                  <Icon name="close" />
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setActivePlanId(p.id); setLayersOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-caption ${
                      p.id === activePlanId ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-on-surface-variant">L{p.level} · {p.tableCount ?? 0} tables</span>
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setFloorForm({ name: '', level: String(plans.length + 1), preset: 1 }); setFloorModalOpen(true); setLayersOpen(false); }}>
                <Icon name="add" />
                Add floor
              </Button>
              {plans.length > 1 && activePlanId && (
                <Button
                  variant="ghost"
                  className="w-full text-error"
                  onClick={async () => {
                    try {
                      await deletePlan.mutateAsync(activePlanId);
                      setActivePlanId(plans.find((p) => p.id !== activePlanId)?.id ?? null);
                      toast.success('Floor removed');
                      setLayersOpen(false);
                    } catch (err) {
                      toast.error(formatApiError(err));
                    }
                  }}
                >
                  Remove current floor
                </Button>
              )}
            </div>
          </>,
          document.body,
        )}

      {typeof document !== 'undefined' && paletteOpen &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[200] cursor-default bg-transparent"
              onClick={() => setPaletteOpen(false)}
              aria-label="Close fixtures menu"
            />
            <div
              className="fixed z-[201] w-64 bg-surface border border-outline-variant/30 rounded-2xl shadow-xl p-4 space-y-3"
              style={{ top: fixturesMenuPos.top, left: fixturesMenuPos.left }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-body-emphasis text-primary">Fixtures</h3>
                <button type="button" onClick={() => setPaletteOpen(false)} className="p-1 rounded hover:bg-surface-container-low">
                  <Icon name="close" />
                </button>
              </div>
              {(['DOOR', 'WINDOW', 'RECEPTION_COUNTER', 'WALL'] as FloorElementType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setElementForm((f) => ({ ...f, type }));
                    setElementModalOpen(true);
                    setPaletteOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-low font-caption text-left"
                >
                  <Icon
                    name={
                      type === 'DOOR'
                        ? 'door_front'
                        : type === 'WINDOW'
                          ? 'window'
                          : type === 'RECEPTION_COUNTER'
                            ? 'countertops'
                            : 'horizontal_rule'
                    }
                  />
                  {type === 'RECEPTION_COUNTER' ? 'Reception counter' : type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
      </>
      )}
    </BusinessLayout>
  );
}
