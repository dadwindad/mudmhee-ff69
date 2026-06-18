'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer } from 'lucide-react';
import { Path, SymmetryGroup } from '../lib/types';
import { applySymmetry, drawSymmetryAxes } from '../lib/symmetry';

// Xiaomi Portable Photo Printer 1S: 2" × 3" at 313×400 DPI (native)
const PRINT_W = 1024;  // 2" × 512 dpi (portrait mode)
const PRINT_H = 1536;  // 3" × 512 dpi (portrait mode)
const MOTIF_SIZE = 300;
const INSET_PREVIEW = 87;   // px — motif inset size in the modal preview
const INSET_PRINT   = 180;  // px — motif inset size in the downloaded PNG

const SPONSOR_LOGOS = [
  'LOGO-bru-227x300.png',
  'emblem_brand_pg.png',
  'TSRI_Logo_(2021).svg',
  'expo2026-logo.jpg',
];

interface PrintModalProps {
  open: boolean;
  onClose: () => void;
  paths: Path[];
  symmetry: SymmetryGroup;
  cols: number;
  rows: number;
  creator?: string;
  lang: 'en' | 'th';
  basePath?: string;
  onSendToQueue?: (imageDataUrl: string) => Promise<void>;
}

/* ─── helpers ─────────────────────────────────────────────── */

function renderPaths(
  ctx: CanvasRenderingContext2D,
  paths: Path[],
  cols: number,
  rows: number,
) {
  const cw = MOTIF_SIZE / cols;
  const ch = MOTIF_SIZE / rows;
  paths.forEach(path => {
    if (!path.points.length) return;
    if (path.color === 'eraser') {
      const saved = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'destination-out';
      if (path.type === 'pixel') {
        ctx.fillStyle = 'rgba(0,0,0,1)';
        path.points.forEach(p => ctx.fillRect(p.x * cw, p.y * ch, cw, ch));
      } else {
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = (path.width || 4) * 2;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      }
      ctx.globalCompositeOperation = saved;
      return;
    }
    if (path.type === 'pixel') {
      ctx.fillStyle = path.color;
      path.points.forEach(p => ctx.fillRect(p.x * cw, p.y * ch, cw, ch));
    } else {
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width || 4;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ─── component ───────────────────────────────────────────── */

export default function PrintModal({
  open,
  onClose,
  paths,
  symmetry,
  cols,
  rows,
  creator = '',
  lang,
  basePath = '',
  onSendToQueue,
}: PrintModalProps) {
  /* ── wallpaper gesture state ── */
  const [pmZoom,    setPmZoom]    = useState(1);
  const [pmRotation, setPmRotation] = useState(0);
  const [pmOffsetX,  setPmOffsetX]  = useState(0);
  const [pmOffsetY,  setPmOffsetY]  = useState(0);

  /* ── refs ── */
  const wallCanvasRef  = useRef<HTMLCanvasElement>(null);
  const wallContRef    = useRef<HTMLDivElement>(null);
  const [wallSize, setWallSize] = useState({ w: 300, h: 210 });

  const motifCanvasRef = useRef<HTMLCanvasElement>(null);

  const sigCanvasRef  = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const sigLastPt    = useRef<{ x: number; y: number } | null>(null);
  const sigLastMid   = useRef<{ x: number; y: number } | null>(null);
  const sigLastWidth = useRef<number>(2);

  // active pointers for pinch gesture
  const ptrs = useRef<Map<number, { x: number; y: number }>>(new Map());

  /* ── reset on open ── */
  useEffect(() => {
    if (open) {
      setPmZoom(1); setPmRotation(0); setPmOffsetX(0); setPmOffsetY(0);
    }
  }, [open]);

  /* ── track container size ── */
  useEffect(() => {
    if (!open) return;
    const el = wallContRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      if (w > 0 && h > 0) setWallSize({ w: Math.round(w), h: Math.round(h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  /* ── draw wallpaper canvas ── */
  useEffect(() => {
    if (!open) return;
    const canvas = wallCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = wallSize;
    canvas.width  = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    if (!paths.length) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.floor(h * 0.07)}px sans-serif`;
      ctx.fillText('Wallpaper Preview', w / 2, h / 2);
      return;
    }

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((pmRotation * Math.PI) / 180);
    ctx.scale(pmZoom, pmZoom);
    ctx.translate(-w / 2, -h / 2);
    applySymmetry(ctx, symmetry, MOTIF_SIZE, MOTIF_SIZE, w, h, pmOffsetX, pmOffsetY, () =>
      renderPaths(ctx, paths, cols, rows),
    );
    ctx.restore();
  }, [open, paths, symmetry, cols, rows, pmZoom, pmRotation, pmOffsetX, pmOffsetY, wallSize]);

  /* ── draw motif inset (base tile + symmetry axes) ── */
  useEffect(() => {
    if (!open) return;
    const canvas = motifCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const S = INSET_PREVIEW;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, S, S);
    ctx.save();
    ctx.scale(S / MOTIF_SIZE, S / MOTIF_SIZE);
    if (paths.length > 0) renderPaths(ctx, paths, cols, rows);
    drawSymmetryAxes(ctx, symmetry, MOTIF_SIZE, MOTIF_SIZE, MOTIF_SIZE, MOTIF_SIZE, 0, 0);
    ctx.restore();
  }, [open, paths, symmetry, cols, rows]);

  /* ── wallpaper pointer events (pan + pinch-zoom + rotate) ── */
  const onWallDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onWallMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };

    if (ptrs.current.size === 1) {
      // Pan — convert screen delta to motif space accounting for rotation
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const rad = (-pmRotation * Math.PI) / 180;
      setPmOffsetX(ox => ox + (dx / pmZoom) * Math.cos(rad) - (dy / pmZoom) * Math.sin(rad));
      setPmOffsetY(oy => oy + (dx / pmZoom) * Math.sin(rad) + (dy / pmZoom) * Math.cos(rad));
    } else {
      // Pinch-zoom + rotate: compare moving pointer against the other
      const other = [...ptrs.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const oldDist = Math.hypot(other.x - prev.x, other.y - prev.y);
        const newDist = Math.hypot(other.x - cur.x,  other.y - cur.y);
        if (oldDist > 4) setPmZoom(z => Math.max(0.25, Math.min(8, z * newDist / oldDist)));
        const oldAng = Math.atan2(other.y - prev.y, other.x - prev.x);
        const newAng = Math.atan2(other.y - cur.y,  other.x - cur.x);
        setPmRotation(r => r + (newAng - oldAng) * (180 / Math.PI));
      }
    }

    ptrs.current.set(e.pointerId, cur);
  };

  const onWallUp = (e: React.PointerEvent<HTMLDivElement>) => {
    ptrs.current.delete(e.pointerId);
  };

  const onWallWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPmZoom(z => Math.max(0.25, Math.min(8, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  };

  /* ── signature pad ── */
  const getSigPt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = sigCanvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left)  * (c.width  / r.width),
      y: (e.clientY - r.top)   * (c.height / r.height),
    };
  };

  const onSigDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsSigning(true);
    sigLastPt.current    = getSigPt(e);
    sigLastMid.current   = null;
    sigLastWidth.current = 2;
  };

  const onSigMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSigning || !sigLastPt.current) return;
    const c = sigCanvasRef.current;
    if (!c) return;
    const ctx  = c.getContext('2d')!;
    const prev = sigLastPt.current;
    const pt   = getSigPt(e);

    // velocity → width: fast = thin, slow = thick
    const dist      = Math.hypot(pt.x - prev.x, pt.y - prev.y);
    const targetW   = Math.max(0.75, 4.0 / (1 + dist * 0.18));
    const width     = sigLastWidth.current * 0.55 + targetW * 0.45; // smoothed

    // smooth curve via midpoints
    const mid = { x: (prev.x + pt.x) / 2, y: (prev.y + pt.y) / 2 };
    ctx.beginPath();
    if (sigLastMid.current) {
      ctx.moveTo(sigLastMid.current.x, sigLastMid.current.y);
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
    } else {
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(mid.x, mid.y);
    }
    ctx.strokeStyle = '#111111';
    ctx.lineWidth   = width;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();

    sigLastMid.current   = mid;
    sigLastPt.current    = pt;
    sigLastWidth.current = width;
  };

  const onSigUp = () => {
    setIsSigning(false);
    sigLastPt.current  = null;
    sigLastMid.current = null;
  };
  const clearSig  = () => {
    const c = sigCanvasRef.current;
    if (!c) return;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
  };

  /* ── shared: render print canvas → data URL ── */
  const renderPrintCanvas = async (): Promise<string> => {
    const out = document.createElement('canvas');
    out.width  = PRINT_W;
    out.height = PRINT_H;
    const ctx = out.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PRINT_W, PRINT_H);

    const wallH = Math.round(PRINT_H * 0.7);
    const infoH = PRINT_H - wallH;
    const halfW = PRINT_W / 2;
    const pad   = 18;

    const previewW = wallSize.w || PRINT_W;
    const previewH = wallSize.h || wallH;
    const pxScale  = PRINT_W / previewW;
    const printZoom    = pmZoom * pxScale;
    const printOffsetX = pmOffsetX + (PRINT_W - previewW) / 2;
    const printOffsetY = pmOffsetY + (wallH   - previewH) / 2;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, PRINT_W, wallH); ctx.clip();
    ctx.translate(PRINT_W / 2, wallH / 2);
    ctx.rotate((pmRotation * Math.PI) / 180);
    ctx.scale(printZoom, printZoom);
    ctx.translate(-PRINT_W / 2, -wallH / 2);
    applySymmetry(ctx, symmetry, MOTIF_SIZE, MOTIF_SIZE, PRINT_W, wallH, printOffsetX, printOffsetY, () =>
      renderPaths(ctx, paths, cols, rows),
    );
    ctx.restore();

    const rrect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    {
      const S      = Math.round(INSET_PREVIEW * pxScale);
      const ip     = Math.round(10 * pxScale);
      const border = Math.round(S * 0.07);
      const labelH = Math.round(S * 0.18);
      const outerR = Math.round(S * 0.12);

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur  = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#ffffff';
      rrect(ip - border, ip - border, S + border * 2, S + border * 2 + labelH, outerR);
      ctx.fill();
      ctx.restore();

      const mc = document.createElement('canvas');
      mc.width = S; mc.height = S;
      const mc2 = mc.getContext('2d')!;
      mc2.fillStyle = '#ffffff';
      mc2.fillRect(0, 0, S, S);
      mc2.save();
      mc2.scale(S / MOTIF_SIZE, S / MOTIF_SIZE);
      if (paths.length > 0) renderPaths(mc2, paths, cols, rows);
      drawSymmetryAxes(mc2, symmetry, MOTIF_SIZE, MOTIF_SIZE, MOTIF_SIZE, MOTIF_SIZE, 0, 0);
      mc2.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(ip, ip, S, S);
      ctx.clip();
      ctx.drawImage(mc, ip, ip, S, S);
      ctx.restore();

      const labelY = ip + S;
      const lblR = Math.round(outerR * 0.6);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(ip, labelY);
      ctx.lineTo(ip + S, labelY);
      ctx.lineTo(ip + S, labelY + labelH - lblR);
      ctx.quadraticCurveTo(ip + S, labelY + labelH, ip + S - lblR, labelY + labelH);
      ctx.lineTo(ip + lblR, labelY + labelH);
      ctx.quadraticCurveTo(ip, labelY + labelH, ip, labelY + labelH - lblR);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.round(labelH * 0.68)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symmetry, ip + S / 2, labelY + labelH / 2 + 1);
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(0, wallH); ctx.lineTo(PRINT_W, wallH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(halfW, wallH); ctx.lineTo(halfW, PRINT_H); ctx.stroke();

    const logoH = infoH * 0.24;
    const logoY = PRINT_H - logoH - pad / 2;

    try {
      const slogan  = await loadImage(`${basePath}/images/event-slogan.png`);
      const maxW    = halfW - pad * 2;
      const maxH    = logoY - wallH - pad;
      const ratio   = Math.min(maxW / slogan.width, maxH / slogan.height);
      const dw = slogan.width * ratio, dh = slogan.height * ratio;
      ctx.drawImage(slogan, pad + (maxW - dw) / 2, wallH + pad / 2 + (maxH - dh) / 2, dw, dh);
    } catch {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(pad, wallH + pad / 2, halfW - pad * 2, logoY - wallH - pad);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.font = `${Math.floor(infoH * 0.09)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Event Slogan', halfW / 2, wallH + (logoY - wallH) / 2);
    }

    const results = await Promise.allSettled(SPONSOR_LOGOS.map(s => loadImage(`${basePath}/images/${s}`)));
    const logos   = results.flatMap(r => r.status === 'fulfilled' ? [r.value] : []);
    if (logos.length) {
      const fixedH = logoH * 0.62;
      const slotW  = (halfW - pad * 2) / logos.length;
      logos.forEach((img, i) => {
        const dh = fixedH;
        const dw = img.width * (dh / img.height);
        const sx = pad + i * slotW + (slotW - dw) / 2;
        const sy = logoY + (logoH - dh) / 2;
        ctx.drawImage(img, sx, sy, dw, dh);
      });
    }

    const sigLabelFontH = Math.floor(infoH * 0.075);
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.font = `bold ${sigLabelFontH}px sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(lang === 'th' ? 'ลายเซน' : 'SIGNATURE', halfW + pad, wallH + pad / 2);

    const sigAreaTop = wallH + pad / 2 + sigLabelFontH + 6;
    const sigAreaBot = creator ? PRINT_H - pad / 2 - sigLabelFontH - 4 : PRINT_H - pad / 2;
    const sigH       = sigAreaBot - sigAreaTop;

    const sigX = halfW + pad, sigW = halfW - pad * 2;
    const sigR = 10;
    rrect(sigX, sigAreaTop, sigW, sigH, sigR);
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    rrect(sigX, sigAreaTop, sigW, sigH, sigR);
    ctx.stroke();
    ctx.setLineDash([]);

    const sigC = sigCanvasRef.current;
    if (sigC) {
      ctx.save();
      rrect(sigX, sigAreaTop, sigW, sigH, sigR);
      ctx.clip();
      ctx.drawImage(sigC, sigX, sigAreaTop, sigW, sigH);
      ctx.restore();
    }

    if (creator) {
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.font = `${sigLabelFontH}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(creator, halfW + halfW / 2, PRINT_H - pad / 2);
    }

    return out.toDataURL('image/png');
  };

  /* ── download / print ── */
  const handleDownload = async () => {
    const url = await renderPrintCanvas();
    const a   = document.createElement('a');
    a.href = url; a.download = 'mudmee-2x3in.png'; a.click();
  };

  const [isSendingToQueue, setIsSendingToQueue] = useState(false);
  const handleSendToQueue = async () => {
    if (!onSendToQueue) return;
    setIsSendingToQueue(true);
    try {
      const url = await renderPrintCanvas();
      await onSendToQueue(url);
    } finally {
      setIsSendingToQueue(false);
    }
  };

  /* ── i18n ── */
  const t = {
    title:       lang === 'th' ? 'พรีวิว 2×3 นิ้ว' : '2×3 inch Preview',
    download:    lang === 'th' ? 'ดาวน์โหลด PNG (2×3 นิ้ว)' : 'Download PNG (2×3 inch)',
    sendToQueue: lang === 'th' ? 'พิมพ์' : 'Print',
    sending:     lang === 'th' ? 'กำลังส่ง…' : 'Sending…',
    sig:         lang === 'th' ? 'ลายเซน' : 'Signature',
    clear:       lang === 'th' ? 'ล้าง' : 'Clear',
    slogan:      lang === 'th' ? 'สโลแกนงาน' : 'Event Slogan',
    hint:        lang === 'th' ? 'ลากเลื่อน · สองนิ้วย่อ/ขยาย/หมุน' : 'Drag to pan · Pinch/scroll to zoom',
    sponsor:     lang === 'th' ? 'ผู้ให้ทุน' : 'Funded by',
  };

  /* ── render ── */
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="print-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60]"
            style={{
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={onClose}
          />

          {/* Content — scroll wrapper keeps centering intact on mobile */}
          <div className="fixed inset-0 z-[61] overflow-y-auto pointer-events-none">
            <div className="flex min-h-full items-center justify-center px-4 py-6">
            <motion.div
              key="print-panel"
              initial={{ opacity: 0, scale: 0.93, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 14 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
              className="pointer-events-auto flex flex-col items-center gap-3 w-full mx-auto"
              style={{ maxWidth: 340 }}
            >
              {/* Header row */}
              <div className="flex items-center gap-2 w-full" style={{ maxWidth: 310 }}>
                <div className="flex items-center gap-2 flex-1">
                  <Printer className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.7)' }} />
                  <p className="text-sm font-bold text-white">{t.title}</p>
                </div>
                <motion.button
                  onClick={onClose} whileTap={{ scale: 0.88 }}
                  className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 [&_svg]:w-4 [&_svg]:h-4"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                >
                  <X />
                </motion.button>
              </div>

              {/* ── Print card (2:3 portrait @ 512 dpi) ── */}
              <div
                className="rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                style={{
                  width: 'min(300px, calc(100dvw - 48px))',
                  aspectRatio: '2 / 3',
                  background: '#ffffff',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                }}
              >

                {/* ── Top 70%: interactive wallpaper ── */}
                <div
                  ref={wallContRef}
                  className="relative overflow-hidden"
                  style={{
                    flex: '7 0 0%',
                    touchAction: 'none',
                    userSelect: 'none',
                    cursor: 'grab',
                  }}
                  onPointerDown={onWallDown}
                  onPointerMove={onWallMove}
                  onPointerUp={onWallUp}
                  onPointerCancel={onWallUp}
                  onWheel={onWallWheel}
                >
                  <canvas
                    ref={wallCanvasRef}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
                  />
                  {/* ── Motif inset — top-left ── */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: 6, left: 6, zIndex: 5,
                      background: '#ffffff',
                      borderRadius: 10,
                      padding: '4px 4px 3px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.06)',
                    }}
                  >
                    <canvas
                      ref={motifCanvasRef}
                      width={INSET_PREVIEW}
                      height={INSET_PREVIEW}
                      style={{ display: 'block' }}
                    />
                    <p style={{
                      fontSize: 5.5,
                      textAlign: 'center',
                      fontWeight: 800,
                      letterSpacing: '0.07em',
                      color: '#000000',
                      textTransform: 'none',
                      marginTop: 0,
                      lineHeight: 1,
                      background: 'rgba(0,0,0,0.18)',
                      borderRadius: '0 0 6px 6px',
                      padding: '2px 0',
                    }}>
                      {symmetry}
                    </p>
                  </div>

                  {/* Gesture hint */}
                  <div
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
                    style={{
                      fontSize: 8,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,0.3)',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {t.hint}
                  </div>
                </div>

                {/* ── Bottom 30%: info strip ── */}
                <div
                  className="flex"
                  style={{ flex: '3 0 0%', borderTop: '1px solid rgba(0,0,0,0.18)' }}
                >

                  {/* Left column: slogan + sponsor logos */}
                  <div
                    className="flex flex-col px-2 py-2"
                    style={{ flex: 1, borderRight: '1px solid rgba(0,0,0,0.18)', gap: 4 }}
                  >
                    {/* Slogan image — fills available space via absolute inset */}
                    <div className="relative flex-1 min-h-0 w-full">
                      <img
                        src={`${basePath}/images/event-slogan.png`}
                        alt="slogan"
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center',
                        }}
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (sib) sib.style.display = 'flex';
                        }}
                      />
                      {/* Placeholder */}
                      <div
                        style={{
                          display: 'none',
                          position: 'absolute', inset: 0,
                          alignItems: 'center', justifyContent: 'center',
                          color: 'rgba(0,0,0,0.18)',
                          fontSize: 7, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}
                      >
                        {t.slogan}
                      </div>
                    </div>

                    {/* Sponsor logos — uniform height slot so all appear same size */}
                    <div className="flex items-center justify-center gap-1 w-full shrink-0">
                      {SPONSOR_LOGOS.map(src => (
                        <div key={src} style={{ width: 26, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={`${basePath}/images/${src}`}
                            alt={src}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: 0.72 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right column: signature pad */}
                  <div
                    className="flex flex-col px-2 py-2"
                    style={{ flex: 1, gap: 3 }}
                  >
                    <div className="flex items-center justify-between shrink-0">
                      <span style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(0,0,0,0.28)' }}>
                        {t.sig}
                      </span>
                      <button
                        onClick={clearSig}
                        className="transition-opacity hover:opacity-60"
                        style={{ fontSize: 7, color: 'rgba(0,0,0,0.22)' }}
                      >
                        {t.clear}
                      </button>
                    </div>

                    {/* Signature canvas — dashed border, light gray bg */}
                    <div
                      className="relative w-full"
                      style={{
                        flex: '1 1 0%',
                        minHeight: 0,
                        maxHeight: '70%',
                        background: 'rgba(0,0,0,0.03)',
                        borderRadius: 6,
                        border: '1.5px dashed rgba(0,0,0,0.18)',
                      }}
                    >
                      <canvas
                        ref={sigCanvasRef}
                        width={300}
                        height={180}
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          touchAction: 'none',
                          cursor: 'crosshair',
                        }}
                        onPointerDown={onSigDown}
                        onPointerMove={onSigMove}
                        onPointerUp={onSigUp}
                        onPointerCancel={onSigUp}
                      />
                    </div>

                    {creator && (
                      <p
                        className="shrink-0 text-center overflow-hidden whitespace-nowrap"
                        style={{ fontSize: 7, color: 'rgba(0,0,0,0.28)', textOverflow: 'ellipsis' }}
                      >
                        {creator}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap justify-center">
                <motion.button
                  onClick={handleDownload}
                  whileTap={{ scale: 0.95 }}
                  className="h-10 px-5 flex items-center gap-2 rounded-xl text-sm font-bold [&_svg]:w-4 [&_svg]:h-4"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hi) 100%)',
                    color: 'white',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                  }}
                >
                  <Printer />
                  {t.download}
                </motion.button>

                {onSendToQueue && (
                  <motion.button
                    onClick={handleSendToQueue}
                    disabled={isSendingToQueue}
                    whileTap={{ scale: isSendingToQueue ? 1 : 0.95 }}
                    className="h-10 px-5 flex items-center gap-2 rounded-xl text-sm font-bold [&_svg]:w-4 [&_svg]:h-4 disabled:opacity-60"
                    style={{
                      background: 'rgba(255,255,255,0.18)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    <Printer />
                    {isSendingToQueue ? t.sending : t.sendToQueue}
                  </motion.button>
                )}
              </div>
            </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
