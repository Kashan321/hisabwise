'use client';

import type { FloorElement } from '@/lib/api/types';
import { ResizeHandles } from '@/components/floor-plan/resize-handles';
import type { ResizeHandle } from '@/lib/floor-plan/canvas-coords';
import { Icon } from '@/components/ui';

interface FloorElementNodeProps {
  element: FloorElement;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onResizeStart?: (handle: ResizeHandle, e: React.PointerEvent) => void;
}

function counterClass(style: string) {
  switch (style) {
    case 'l-shaped':
      return 'rounded-lg border-2 border-primary/30 bg-primary-container/80';
    case 'u-shaped':
      return 'rounded-2xl border-2 border-primary/40 bg-primary-container';
    case 'curved':
      return 'rounded-full border-2 border-primary/30 bg-primary-container/90';
    default:
      return 'rounded-md border-2 border-primary/25 bg-primary-container/70';
  }
}

export function FloorElementNode({
  element,
  selected,
  onPointerDown,
  onClick,
  onContextMenu,
  onResizeStart,
}: FloorElementNodeProps) {
  const options = element.options ?? {};
  const type = element.type;

  function handlePointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('[data-resize-handle]')) return;
    onPointerDown?.(e);
  }

  let surfaceClass = 'bg-surface-container-high border border-outline-variant/50';
  let content: React.ReactNode = null;

  if (type === 'DOOR') {
    const doorType = (options.doorType as string) ?? 'single';
    surfaceClass =
      'bg-gradient-to-b from-amber-100 to-amber-200/90 border-2 border-amber-800/50 shadow-sm';
    content = (
      <div className="flex flex-col items-center justify-center h-full w-full px-1">
        <div className="flex items-end justify-center gap-0.5 w-full h-[55%]">
          <div className="w-[42%] h-full border-2 border-amber-900/50 rounded-sm bg-amber-50/80" />
          {doorType === 'double' && (
            <div className="w-[42%] h-full border-2 border-amber-900/50 rounded-sm bg-amber-50/80" />
          )}
        </div>
        <span className="text-[8px] font-bold uppercase text-amber-900/70 mt-0.5">
          {doorType === 'double' ? 'Double door' : 'Door'}
        </span>
      </div>
    );
  } else if (type === 'WINDOW') {
    const windowType = (options.windowType as string) ?? 'standard';
    surfaceClass =
      windowType === 'bay'
        ? 'bg-gradient-to-b from-sky-100 to-sky-200/80 border-2 border-sky-500/45 rounded-t-xl shadow-sm'
        : 'bg-gradient-to-b from-sky-50 to-sky-100 border-2 border-sky-400/50 shadow-sm';
    content = (
      <div className="flex flex-col items-center justify-center h-full w-full px-2 py-1">
        <div className="flex gap-1 w-full h-[50%] items-stretch">
          <div className="flex-1 border border-sky-500/50 bg-sky-200/30 rounded-sm" />
          <div className="flex-1 border border-sky-500/50 bg-sky-200/30 rounded-sm" />
          {windowType === 'bay' && (
            <div className="w-[30%] border border-sky-500/50 bg-sky-200/40 rounded-t-md" />
          )}
        </div>
        <span className="text-[8px] font-bold uppercase text-sky-800/60 mt-0.5">Window</span>
      </div>
    );
  } else if (type === 'RECEPTION_COUNTER') {
    const counterStyle = (options.counterStyle as string) ?? 'straight';
    const shapeClass =
      counterStyle === 'curved'
        ? 'rounded-full'
        : counterStyle === 'u-shaped'
          ? 'rounded-2xl'
          : counterStyle === 'l-shaped'
            ? 'rounded-lg'
            : 'rounded-md';
    surfaceClass = `bg-gradient-to-br from-primary-container to-primary-container/70 border-2 border-primary/35 shadow-md ${shapeClass}`;
    content = (
      <div className="flex flex-col items-center justify-center h-full px-2">
        <Icon name="countertops" className="text-primary text-lg" />
        <span className="text-[8px] font-bold uppercase text-on-primary-container text-center leading-tight">
          Reception
        </span>
      </div>
    );
  } else {
    surfaceClass =
      'bg-gradient-to-r from-[#8b7d6b] via-[#a89884] to-[#8b7d6b] border border-[#5c4f42]/50 shadow-inner';
    content = (
      <div className="flex items-center justify-center h-full w-full">
        <div className="w-full h-1/2 border-y border-[#5c4f42]/20" />
      </div>
    );
  }

  return (
    <div
      className={`absolute touch-none select-none ${selected ? 'z-30' : 'z-10'}`}
      style={{
        left: element.layoutX,
        top: element.layoutY,
        width: element.width,
        height: element.height,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      }}
      onPointerDown={handlePointerDown}
      onContextMenu={onContextMenu}
    >
      <div className="relative w-full h-full">
        <button
          type="button"
          onClick={onClick}
          className={`w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${surfaceClass} ${
            selected ? 'ring-2 ring-primary ring-offset-1' : ''
          }`}
        >
          {content}
        </button>
        {selected && onResizeStart && <ResizeHandles onResizeStart={onResizeStart} />}
      </div>
    </div>
  );
}
