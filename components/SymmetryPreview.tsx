'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Path, SymmetryGroup } from '../lib/types';
import { applySymmetry, drawGrid, drawSymmetryAxes } from '../lib/symmetry';

interface SymmetryPreviewProps {
  paths: Path[];
  symmetry: SymmetryGroup;
  cols: number;
  rows: number;
  offsetX: number;
  offsetY: number;
  showGrid: boolean;
  showSymmetryAxes?: boolean;
  /** @deprecated size is now determined by ResizeObserver */
  width?: number;
  /** @deprecated size is now determined by ResizeObserver */
  height?: number;
  motifWidth?: number;
  motifHeight?: number;
  scale?: number;
  rotation?: number;
}

export default function SymmetryPreview({
  paths,
  symmetry,
  cols,
  rows,
  offsetX,
  offsetY,
  showGrid,
  showSymmetryAxes = false,
  motifWidth = 300,
  motifHeight = 300,
  scale = 1,
  rotation = 0,
}: SymmetryPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 600, h: 600 });

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      if (w > 0 && h > 0) setSize({ w: Math.round(w), h: Math.round(h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: width, h: height } = size;
  const cellWidth  = motifWidth  / cols;
  const cellHeight = motifHeight / rows;

  useEffect(() => {
    document.fonts.load(`bold ${Math.floor(height * 0.09)}px Kanit`).then(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Placeholder text when no paths exist
    if (paths.length === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.floor(height * 0.09)}px Kanit, sans-serif`;
      ctx.fillText('Wallpaper Preview', width / 2, height / 2 - height * 0.07);
      ctx.font = `${Math.floor(height * 0.08)}px Kanit, sans-serif`;
      ctx.fillText('มุมมองลายผ้า', width / 2, height / 2 + height * 0.07);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);

    applySymmetry(ctx, symmetry, motifWidth, motifHeight, width, height, offsetX, offsetY, () => {
      paths.forEach((path) => {
        if (path.points.length === 0) return;

        if (path.color === 'eraser') {
          const saved = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = 'destination-out';
          if (path.type === 'pixel') {
            ctx.fillStyle = 'rgba(0,0,0,1)';
            path.points.forEach((p) => {
              ctx.fillRect(p.x * cellWidth, p.y * cellHeight, cellWidth, cellHeight);
            });
          } else {
            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.lineWidth = (path.width || 4) * 2;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
          }
          ctx.globalCompositeOperation = saved;
          return;
        }

        if (path.type === 'pixel') {
          ctx.fillStyle = path.color;
          path.points.forEach((p) => {
            ctx.fillRect(p.x * cellWidth, p.y * cellHeight, cellWidth, cellHeight);
          });
        } else {
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.width || 4;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
        }
      });
    });

    if (showSymmetryAxes) {
      drawSymmetryAxes(ctx, symmetry, motifWidth, motifHeight, width, height, offsetX, offsetY);
    }

    if (showGrid) drawGrid(ctx, motifWidth, width, height, offsetX, offsetY);

    ctx.restore();
    }); // end document.fonts.load
  }, [paths, symmetry, cols, rows, offsetX, offsetY, showGrid, showSymmetryAxes, scale, rotation, width, height]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas
        id="symmetry-preview-canvas"
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
    </div>
  );
}
