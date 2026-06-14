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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);

  const cellWidth = width / cols;
  const cellHeight = height / rows;

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const allPaths = currentPath ? [...paths, currentPath] : paths;

    // Placeholder text when canvas is empty
    if (allPaths.length === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.floor(height * 0.1)}px Kanit, sans-serif`;
      ctx.fillText('Motif', width / 2, height / 2 - height * 0.07);
      ctx.font = `${Math.floor(height * 0.08)}px Kanit, sans-serif`;
      ctx.fillText('แม่ลาย', width / 2, height / 2 + height * 0.07);
      ctx.restore();
    }

    // Draw paths first so grid overlays them cleanly
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

    // Grid on top of paths
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath(); ctx.moveTo(i * cellWidth, 0); ctx.lineTo(i * cellWidth, height); ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      ctx.beginPath(); ctx.moveTo(0, j * cellHeight); ctx.lineTo(width, j * cellHeight); ctx.stroke();
    }

    if (showSymmetryAxes) {
      drawSymmetryAxes(ctx, symmetry, width, height, width, height, 0, 0);
    }
  };

  useEffect(() => {
    document.fonts.load(`bold ${Math.floor(height * 0.1)}px Kanit`).then(() => redraw());
  }, [paths, currentPath, symmetry, cols, rows, tracingImage, showSymmetryAxes]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const point = getCoordinates(e);

    if (drawMode === 'pixel') {
      const col = Math.floor(point.x / cellWidth);
      const row = Math.floor(point.y / cellHeight);
      setCurrentPath({
        id: uuidv4(),
        color: activeColor,
        points: [{ x: col, y: row }],
        type: 'pixel',
      });
    } else {
      setCurrentPath({
        id: uuidv4(),
        color: activeColor,
        points: [point],
        type: 'freehand',
        width: 4,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath) return;
    const point = getCoordinates(e);

    if (drawMode === 'pixel') {
      const col = Math.floor(point.x / cellWidth);
      const row = Math.floor(point.y / cellHeight);
      
      // Only add if it's a new cell
      const lastPoint = currentPath.points[currentPath.points.length - 1];
      if (lastPoint.x !== col || lastPoint.y !== row) {
        setCurrentPath((prev) => {
          if (!prev) return null;
          return { ...prev, points: [...prev.points, { x: col, y: row }] };
        });
      }
    } else {
      setCurrentPath((prev) => {
        if (!prev) return null;
        return { ...prev, points: [...prev.points, point] };
      });
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
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
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
