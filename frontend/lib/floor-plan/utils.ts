import type { TableShape } from '@/lib/api/types';

export interface ChairPosition {
  x: number;
  y: number;
  rotation: number;
}

const CHAIR_SIZE = 14;
const CHAIR_GAP = 6;

export function defaultTableSize(
  shape: TableShape,
  capacity: number,
): { width: number; height: number } {
  switch (shape) {
    case 'ROUND':
      return { width: 56 + capacity * 10, height: 56 + capacity * 10 };
    case 'SQUARE':
      return { width: 64 + Math.ceil(capacity / 2) * 14, height: 64 + Math.ceil(capacity / 2) * 14 };
    case 'RECTANGLE':
      return { width: 72 + capacity * 14, height: 64 };
    case 'BOOTH':
      return { width: 36 + capacity * 24, height: 88 };
    default:
      return { width: 80, height: 80 };
  }
}

export function getChairPositions(
  shape: TableShape,
  capacity: number,
  width: number,
  height: number,
): ChairPosition[] {
  if (capacity <= 0) return [];

  if (shape === 'ROUND') {
    const radius = Math.min(width, height) / 2 + CHAIR_GAP + CHAIR_SIZE / 2;
    const cx = width / 2;
    const cy = height / 2;
    return Array.from({ length: capacity }, (_, i) => {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      return {
        x: cx + radius * Math.cos(angle) - CHAIR_SIZE / 2,
        y: cy + radius * Math.sin(angle) - CHAIR_SIZE / 2,
        rotation: (angle * 180) / Math.PI + 90,
      };
    });
  }

  if (shape === 'BOOTH') {
    const spacing = width / (capacity + 1);
    return Array.from({ length: capacity }, (_, i) => ({
      x: spacing * (i + 1) - CHAIR_SIZE / 2,
      y: height + CHAIR_GAP,
      rotation: 0,
    }));
  }

  const perimeter = 2 * (width + height);
  const step = perimeter / capacity;
  const positions: ChairPosition[] = [];

  for (let i = 0; i < capacity; i++) {
    const dist = step * i + step / 2;
    if (dist <= width) {
      positions.push({ x: dist - CHAIR_SIZE / 2, y: -CHAIR_GAP - CHAIR_SIZE, rotation: 180 });
    } else if (dist <= width + height) {
      const d = dist - width;
      positions.push({ x: width + CHAIR_GAP, y: d - CHAIR_SIZE / 2, rotation: -90 });
    } else if (dist <= 2 * width + height) {
      const d = dist - width - height;
      positions.push({ x: width - d - CHAIR_SIZE / 2, y: height + CHAIR_GAP, rotation: 0 });
    } else {
      const d = dist - 2 * width - height;
      positions.push({ x: -CHAIR_GAP - CHAIR_SIZE, y: height - d - CHAIR_SIZE / 2, rotation: 90 });
    }
  }

  return positions;
}

export const TABLE_SHAPE_OPTIONS: { value: TableShape; label: string; icon: string }[] = [
  { value: 'ROUND', label: 'Round', icon: 'circle' },
  { value: 'SQUARE', label: 'Square', icon: 'crop_square' },
  { value: 'RECTANGLE', label: 'Rectangle', icon: 'rectangle' },
  { value: 'BOOTH', label: 'Booth', icon: 'weekend' },
];

export const FLOOR_PRESETS = [
  { label: 'Small (12×9 m)', width: 600, height: 450 },
  { label: 'Medium (16×12 m)', width: 800, height: 600 },
  { label: 'Large (20×15 m)', width: 1000, height: 750 },
  { label: 'Custom', width: 0, height: 0 },
];

export const COUNTER_STYLE_OPTIONS = [
  { value: 'straight', label: 'Straight counter' },
  { value: 'l-shaped', label: 'L-shaped counter' },
  { value: 'u-shaped', label: 'U-shaped counter' },
  { value: 'curved', label: 'Curved counter' },
];

export const DOOR_TYPE_OPTIONS = [
  { value: 'single', label: 'Single door' },
  { value: 'double', label: 'Double door' },
];

export const WINDOW_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard window' },
  { value: 'bay', label: 'Bay window' },
  { value: 'sliding', label: 'Sliding window' },
];

export const CHAIR_SIZE_PX = CHAIR_SIZE;
