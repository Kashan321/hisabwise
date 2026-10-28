import type { FloorTable } from '@/lib/api/types';
import { defaultTableSize } from '@/lib/floor-plan/utils';
import { FLOOR_WALL_THICKNESS } from '@/lib/floor-plan/canvas-coords';

const GRID_GAP = 24;
const ORIGIN = 60 + FLOOR_WALL_THICKNESS;

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

export function nextNonOverlappingTableLayout(
  tables: FloorTable[],
  shape: FloorTable['shape'],
  capacity: number,
): { layoutX: number; layoutY: number; width: number; height: number } {
  const size = defaultTableSize(shape ?? 'ROUND', capacity);
  const existing = tables.map((t) => ({
    x: t.layoutX,
    y: t.layoutY,
    width: t.width,
    height: t.height,
  }));

  for (let row = 0; row < 20; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const candidate = {
        x: ORIGIN + col * (size.width + GRID_GAP),
        y: ORIGIN + row * (size.height + GRID_GAP),
        width: size.width,
        height: size.height,
      };
      if (!existing.some((r) => rectsOverlap(candidate, r))) {
        return {
          layoutX: candidate.x,
          layoutY: candidate.y,
          width: candidate.width,
          height: candidate.height,
        };
      }
    }
  }

  const count = tables.length;
  return {
    layoutX: ORIGIN + (count % 4) * (size.width + GRID_GAP),
    layoutY: ORIGIN + Math.floor(count / 4) * (size.height + GRID_GAP),
    width: size.width,
    height: size.height,
  };
}

export function spreadOverlappingTables(tables: FloorTable[]): FloorTable[] {
  const placed: Array<{ x: number; y: number; width: number; height: number }> = [];
  const next = tables.map((table) => ({ ...table }));

  for (const table of next) {
    let rect = {
      x: table.layoutX,
      y: table.layoutY,
      width: table.width,
      height: table.height,
    };
    if (placed.some((p) => rectsOverlap(rect, p))) {
      const slot = nextNonOverlappingTableLayout(
        placed.map((p, i) => ({
          id: String(i),
          layoutX: p.x,
          layoutY: p.y,
          width: p.width,
          height: p.height,
        })) as FloorTable[],
        table.shape ?? 'ROUND',
        table.capacity,
      );
      rect = { x: slot.layoutX, y: slot.layoutY, width: slot.width, height: slot.height };
      table.layoutX = slot.layoutX;
      table.layoutY = slot.layoutY;
      table.width = slot.width;
      table.height = slot.height;
    }
    placed.push(rect);
  }

  return next;
}
