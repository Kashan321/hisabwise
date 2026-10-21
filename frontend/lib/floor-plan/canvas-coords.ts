export const FLOOR_WALL_THICKNESS = 16;
export const MIN_ELEMENT_WIDTH = 20;
export const MIN_ELEMENT_HEIGHT = 12;
export const MIN_TABLE_WIDTH = 48;
export const MIN_TABLE_HEIGHT = 48;

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function innerFloorBounds(canvasW: number, canvasH: number): FloorBounds {
  const t = FLOOR_WALL_THICKNESS;
  return {
    minX: t,
    minY: t,
    maxX: canvasW - t,
    maxY: canvasH - t,
  };
}

export function clampRect(rect: Rect, bounds: FloorBounds, minW: number, minH: number): Rect {
  const width = Math.max(minW, Math.min(rect.width, bounds.maxX - bounds.minX));
  const height = Math.max(minH, Math.min(rect.height, bounds.maxY - bounds.minY));
  const x = Math.max(bounds.minX, Math.min(rect.x, bounds.maxX - width));
  const y = Math.max(bounds.minY, Math.min(rect.y, bounds.maxY - height));
  return { x, y, width, height };
}

export function applyResize(
  handle: ResizeHandle,
  start: Rect,
  dx: number,
  dy: number,
  bounds: FloorBounds,
  minW: number,
  minH: number,
): Rect {
  let x = start.x;
  let y = start.y;
  let width = start.width;
  let height = start.height;

  if (handle.includes('e')) {
    width = start.width + dx;
  }
  if (handle.includes('w')) {
    width = start.width - dx;
    x = start.x + (start.width - width);
  }
  if (handle.includes('s')) {
    height = start.height + dy;
  }
  if (handle.includes('n')) {
    height = start.height - dy;
    y = start.y + (start.height - height);
  }

  return clampRect({ x, y, width, height }, bounds, minW, minH);
}

export function clientToCanvas(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  scale: number,
): { x: number; y: number } {
  return {
    x: (clientX - canvasRect.left) / scale,
    y: (clientY - canvasRect.top) / scale,
  };
}
