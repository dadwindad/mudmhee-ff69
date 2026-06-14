'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Path, SymmetryGroup } from '../lib/types';
import { applySymmetry } from '../lib/symmetry';

interface AssembleViewProps {
  bodyPaths: Path[];
  borderPaths: Path[];
  bodySymmetry: SymmetryGroup;
  borderSymmetry: SymmetryGroup;
  bodyCols: number;
  bodyRows: number;
  borderCols: number;
  borderRows: number;
}

export default function AssembleView({
  bodyPaths,
  borderPaths,
  bodySymmetry,
  borderSymmetry,
  bodyCols,
  bodyRows,
  borderCols,
  borderRows,
}: AssembleViewProps) {
  const bodyRef = useRef<HTMLCanvasElement>(null);
  const borderRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [bodyHeight, setBodyHeight] = useState(400);
  const [borderHeight, setBorderHeight] = useState(200);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const motifWidth = 300;
  const motifHeight = 300;

  const drawPaths = (
    canvas: HTMLCanvasElement | null,
    paths: Path[],
    symmetry: SymmetryGroup,
    h: number,
    cols: number,
    rows: number
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, h);

    const cellWidth = motifWidth / cols;
    const cellHeight = motifHeight / rows;

    applySymmetry(
      ctx,
      symmetry,
      motifWidth,
      motifHeight,
      width,
      h,
      0,
      0,
      () => {
        paths.forEach((path) => {
          if (path.points.length === 0) return;

          if (path.type === 'pixel') {
            ctx.fillStyle = path.color;
            path.points.forEach((p) => {
              ctx.fillRect(p.x * cellWidth, p.y * cellHeight, cellWidth, cellHeight);
            });
          } else {
            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
              ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.width || 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        });
      }
    );
  };

  useEffect(() => {
    drawPaths(bodyRef.current, bodyPaths, bodySymmetry, bodyHeight, bodyCols, bodyRows);
  }, [bodyPaths, bodySymmetry, bodyHeight, bodyCols, bodyRows, width]);

  useEffect(() => {
    drawPaths(borderRef.current, borderPaths, borderSymmetry, borderHeight, borderCols, borderRows);
  }, [borderPaths, borderSymmetry, borderHeight, borderCols, borderRows, width]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto bg-stone-100 p-4 rounded-xl shadow-inner">
      <div ref={containerRef} className="relative flex flex-col items-center border-2 border-stone-300 shadow-md bg-white w-full">
        {/* Body Section */}
        <div className="relative group w-full">
          <canvas
            ref={bodyRef}
            width={width}
            height={bodyHeight}
            style={{ display: 'block', width: '100%' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2 bg-rose-500 opacity-0 group-hover:opacity-100 cursor-ns-resize transition-opacity"
            onPointerDown={(e) => {
              const startY = e.clientY;
              const startHeight = bodyHeight;
              const onMove = (moveEvent: PointerEvent) => {
                setBodyHeight(Math.max(100, startHeight + (moveEvent.clientY - startY)));
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
            }}
          />
        </div>

        {/* Border Section */}
        <div className="relative group border-t-2 border-stone-200 w-full">
          <canvas
            ref={borderRef}
            width={width}
            height={borderHeight}
            style={{ display: 'block', width: '100%' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2 bg-rose-500 opacity-0 group-hover:opacity-100 cursor-ns-resize transition-opacity"
            onPointerDown={(e) => {
              const startY = e.clientY;
              const startHeight = borderHeight;
              const onMove = (moveEvent: PointerEvent) => {
                setBorderHeight(Math.max(50, startHeight + (moveEvent.clientY - startY)));
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
            }}
          />
        </div>
      </div>
      <p className="text-sm text-stone-500 mt-4">
        Drag the bottom edge of each section to adjust its height.
      </p>
    </div>
  );
}
