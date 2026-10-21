'use client';

import { useEffect, useRef, useState } from 'react';
import { FLOOR_WALL_THICKNESS } from '@/lib/floor-plan/canvas-coords';

export function FloorPlanViewport({
  canvasW,
  canvasH,
  userZoom,
  canvasRef,
  onDisplayScaleChange,
  children,
}: {
  canvasW: number;
  canvasH: number;
  userZoom: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onDisplayScaleChange?: (scale: number) => void;
  children: React.ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      const pad = 48;
      const w = Math.max(120, el.clientWidth - pad);
      const h = Math.max(120, el.clientHeight - pad);
      setFitScale(Math.min(w / canvasW, h / canvasH));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [canvasW, canvasH]);

  const displayScale = fitScale * (userZoom / 100);
  const scaledW = canvasW * displayScale;
  const scaledH = canvasH * displayScale;

  useEffect(() => {
    onDisplayScaleChange?.(displayScale);
  }, [displayScale, onDisplayScaleChange]);

  return (
    <div ref={viewportRef} className="flex-1 min-h-0 relative">
      <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4 md:p-6">
        <div
          className="relative shrink-0"
          style={{ width: scaledW, height: scaledH }}
        >
          <div
            ref={canvasRef}
            className="absolute top-0 left-0 rounded-xl shadow-lg overflow-visible"
            style={{
              width: canvasW,
              height: canvasH,
              transform: `scale(${displayScale})`,
              transformOrigin: 'top left',
            }}
          >
            {/* Room shell / exterior */}
            <div
              className="absolute inset-0 bg-[#6b5d4f] rounded-xl"
              aria-hidden
            />
            {/* Interior floor */}
            <div
              className="absolute bg-[#f7f3eb] grid-bg"
              style={{
                left: FLOOR_WALL_THICKNESS,
                top: FLOOR_WALL_THICKNESS,
                width: canvasW - FLOOR_WALL_THICKNESS * 2,
                height: canvasH - FLOOR_WALL_THICKNESS * 2,
              }}
            />
            {/* Wall outline highlight */}
            <div
              className="absolute pointer-events-none rounded-lg border-2 border-[#4a3f35]/40"
              style={{
                left: FLOOR_WALL_THICKNESS - 1,
                top: FLOOR_WALL_THICKNESS - 1,
                width: canvasW - FLOOR_WALL_THICKNESS * 2 + 2,
                height: canvasH - FLOOR_WALL_THICKNESS * 2 + 2,
              }}
            />
            <div className="absolute inset-0" style={{ zIndex: 1 }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
