'use client';

import type { ResizeHandle } from '@/lib/floor-plan/canvas-coords';

const HANDLES: { id: ResizeHandle; className: string; cursor: string }[] = [
  { id: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
  { id: 'n', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
  { id: 'ne', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
  { id: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { id: 'se', className: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
  { id: 's', className: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
  { id: 'sw', className: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
  { id: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
];

export function ResizeHandles({
  onResizeStart,
}: {
  onResizeStart: (handle: ResizeHandle, e: React.PointerEvent) => void;
}) {
  return (
    <>
      {HANDLES.map((handle) => (
        <div
          key={handle.id}
          role="presentation"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(handle.id, e);
          }}
          className={`absolute z-20 w-3 h-3 rounded-full bg-primary border-2 border-on-primary shadow-sm touch-none pointer-events-auto ${handle.className}`}
          data-resize-handle
          style={{ cursor: handle.cursor }}
        />
      ))}
    </>
  );
}
