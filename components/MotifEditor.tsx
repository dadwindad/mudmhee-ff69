'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Path, Point, SymmetryGroup } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { drawSymmetryAxes } from '../lib/symmetry';

interface MotifEditorProps {
  paths: Path[];
  setPaths: React.Dispatch<React.SetStateAction<Path[]>>;
  symmetry: SymmetryGroup;
  cols: number;
  rows: number;
  activeColor: string;
  drawMode: 'freehand' | 'pixel';
  tracingImage?: string | null;
  showSymmetryAxes?: boolean;
  width?: number;
  height?: number;
}

export default function MotifEditor({
  paths,
  setPaths,
  symmetry,
  cols,
  rows,
  activeColor,
  drawMode,
  tracingImage,
  showSymmetryAxes = false,
  width = 300,
  height = 300,
}: MotifEditorProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing]   = useState(false);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  const [displaySize, setDisplaySize] = useState(width);

  // Track actual rendered size so canvas resolution matches display
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setDisplaySize(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // logical cell sizes (for path coordinate space)
  const cellWidth  = width  / cols;
  const cellHeight = height / rows;
  // scale from logical → display pixels
  const logicalScale = displaySize / width;

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, displaySize, displaySize);

    const allPaths = currentPath ? [...paths, currentPath] : paths;

    // Scale so all drawing uses logical coords (0–width, 0–height)
    ctx.save();
    ctx.scale(logicalScale, logicalScale);

    // Placeholder when empty
    if (allPaths.length === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.floor(height * 0.1)}px Kanit, sans-serif`;
      ctx.fillText('Motif', width / 2, height / 2 - height * 0.07);
      ctx.font = `${Math.floor(height * 0.08)}px Kanit, sans-serif`;
      ctx.fillText('แม่ลาย', width / 2, height / 2 + height * 0.07);
    }

    allPaths.forEach((path) => {
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

    // Grid — 1 display pixel wide regardless of scale
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1 / logicalScale;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath(); ctx.moveTo(i * cellWidth, 0); ctx.lineTo(i * cellWidth, height); ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      ctx.beginPath(); ctx.moveTo(0, j * cellHeight); ctx.lineTo(width, j * cellHeight); ctx.stroke();
    }

    if (showSymmetryAxes) {
      drawSymmetryAxes(ctx, symmetry, width, height, width, height, 0, 0);
    }

    ctx.restore();
  };

  useEffect(() => {
    document.fonts.load(`bold ${Math.floor(displaySize * 0.1)}px Kanit`).then(() => redraw());
  }, [paths, currentPath, symmetry, cols, rows, tracingImage, showSymmetryAxes, displaySize]);

  // Returns coordinates in logical space (0–width, 0–height)
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (width  / rect.width),
      y: (e.clientY - rect.top)  * (height / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const point = getCoordinates(e);

    if (drawMode === 'pixel') {
      const col = Math.floor(point.x / cellWidth);
      const row = Math.floor(point.y / cellHeight);
      setCurrentPath({ id: uuidv4(), color: activeColor, points: [{ x: col, y: row }], type: 'pixel' });
    } else {
      setCurrentPath({ id: uuidv4(), color: activeColor, points: [point], type: 'freehand', width: 4 });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath) return;
    const point = getCoordinates(e);

    if (drawMode === 'pixel') {
      const col = Math.floor(point.x / cellWidth);
      const row = Math.floor(point.y / cellHeight);
      const last = currentPath.points[currentPath.points.length - 1];
      if (last.x !== col || last.y !== row) {
        setCurrentPath((prev) => prev ? { ...prev, points: [...prev.points, { x: col, y: row }] } : null);
      }
    } else {
      setCurrentPath((prev) => prev ? { ...prev, points: [...prev.points, point] } : null);
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && currentPath) {
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        width={displaySize}
        height={displaySize}
        style={{ display: 'block', width: '100%', height: '100%' }}
        className="bg-white cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
