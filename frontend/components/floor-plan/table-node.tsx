import type { FloorTable } from '@/lib/api/types';
import { ResizeHandles } from '@/components/floor-plan/resize-handles';
import type { ResizeHandle } from '@/lib/floor-plan/canvas-coords';
import { CHAIR_SIZE_PX, getChairPositions } from '@/lib/floor-plan/utils';
import { Icon } from '@/components/ui';

export function statusLabel(status: FloorTable['status']) {
  if (status === 'NEEDS_CLEANING') return 'Maintenance';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function tableStatusStyle(table: FloorTable): string {
  switch (table.status) {
    case 'OCCUPIED':
      return 'bg-secondary-fixed text-on-secondary-fixed-variant border-2 border-secondary/20 ring-2 ring-secondary/10 shadow-lg';
    case 'RESERVED':
      return 'bg-surface-container-high border-2 border-primary-fixed-dim text-on-surface-variant';
    case 'NEEDS_CLEANING':
      return 'bg-surface-dim border border-outline-variant/50 text-on-surface-variant opacity-80';
    default:
      return 'bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary-fixed-dim/50';
  }
}

function tableBorderRadius(shape: FloorTable['shape']) {
  if (shape === 'ROUND') return 'rounded-full';
  if (shape === 'BOOTH') return 'rounded-t-2xl rounded-b-lg';
  return 'rounded-xl';
}

const CHAIR_PAD = 20;

interface TableNodeProps {
  table: FloorTable;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void;
}

export function TableNode({
  table,
  selected,
  onPointerDown,
  onClick,
  onContextMenu,
  onResizeStart,
}: TableNodeProps) {
  const shape = table.shape ?? 'ROUND';
  const chairs = getChairPositions(shape, table.capacity, table.width, table.height);

  function handlePointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('[data-resize-handle]')) return;
    onPointerDown?.(e);
  }

  return (
    <div
      className={`absolute select-none touch-none ${selected ? 'z-30' : 'z-10'}`}
      style={{
        left: table.layoutX - CHAIR_PAD,
        top: table.layoutY - CHAIR_PAD,
        width: table.width + CHAIR_PAD * 2,
        height: table.height + CHAIR_PAD * 2,
        transform: table.rotation ? `rotate(${table.rotation}deg)` : undefined,
      }}
      onPointerDown={handlePointerDown}
      onContextMenu={onContextMenu}
    >
      {chairs.map((chair, i) => (
        <div
          key={i}
          className="absolute rounded-sm bg-surface-container-highest border border-outline-variant/40 shadow-sm pointer-events-none"
          style={{
            width: CHAIR_SIZE_PX,
            height: CHAIR_SIZE_PX,
            left: CHAIR_PAD + chair.x,
            top: CHAIR_PAD + chair.y,
            transform: chair.rotation ? `rotate(${chair.rotation}deg)` : undefined,
          }}
        />
      ))}

      <div
        className="absolute"
        style={{
          left: CHAIR_PAD,
          top: CHAIR_PAD,
          width: table.width,
          height: table.height,
        }}
      >
        <div className="relative w-full h-full">
          <button
            type="button"
            onClick={onClick}
            style={{ width: table.width, height: table.height }}
            className={`table-node flex flex-col items-center justify-center shadow-sm cursor-grab active:cursor-grabbing touch-none w-full h-full ${tableStatusStyle(table)} ${tableBorderRadius(shape)} ${
              selected ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
          >
            <span className="font-mono font-caption font-bold">{table.tableIdentifier}</span>
            {table.status === 'RESERVED' && (
              <span className="px-1.5 py-0.5 bg-primary-fixed text-on-primary-fixed-variant rounded text-[9px] font-bold uppercase">
                Reserved
              </span>
            )}
            {table.status === 'OCCUPIED' && <Icon name="restaurant" className="text-[16px]" />}
            {table.status === 'NEEDS_CLEANING' && <Icon name="mop" className="text-[16px]" />}
            {table.status === 'AVAILABLE' && <Icon name="person" className="text-[16px]" />}
          </button>
          {selected && onResizeStart && (
            <ResizeHandles onResizeStart={onResizeStart} />
          )}
        </div>
      </div>
    </div>
  );
}
