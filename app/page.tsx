'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Download, Upload, Box, PenTool, Save, Trash2,
  Hand, ZoomIn, ZoomOut, RotateCcw, RotateCw, RefreshCw,
  Search, Download as DownloadIcon, Crosshair, Undo, Redo,
  Printer, Sun, Moon, Grid, LayoutGrid, Eraser, Settings, Maximize2, Minimize2,
  RectangleHorizontal, CheckCircle2, XCircle, Info, X,
} from 'lucide-react';
import MotifEditor from '../components/MotifEditor';
import SymmetryPreview from '../components/SymmetryPreview';
import AssembleView from '../components/AssembleView';
import ThreePreview from '../components/ThreePreview';
import LoadingScreen from '../components/LoadingScreen';
import { Path, SymmetryGroup, Metadata, Project, GalleryItem } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { applySymmetry } from '../lib/symmetry';

/* ─── Toast ──────────────────────────────────────────────── */

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; message: string; type: ToastType; }

const ToastIcon = ({ type }: { type: ToastType }) => {
  if (type === 'success') return <CheckCircle2 />;
  if (type === 'error')   return <XCircle />;
  return <Info />;
};

const toastStyles: Record<ToastType, { bar: string; icon: string }> = {
  success: { bar: 'oklch(0.52 0.18 145)',  icon: 'oklch(0.52 0.18 145)' },
  error:   { bar: 'oklch(0.54 0.245 15)',  icon: 'oklch(0.54 0.245 15)' },
  info:    { bar: 'oklch(0.52 0.18 245)',  icon: 'oklch(0.52 0.18 245)' },
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const s = toastStyles[toast.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.94 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex items-start gap-3 rounded-2xl px-4 py-3 pr-10 overflow-hidden
                 min-w-[220px] max-w-[340px] pointer-events-auto"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-mid)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: s.bar }} />
      {/* icon */}
      <span className="mt-0.5 shrink-0 [&_svg]:w-4 [&_svg]:h-4" style={{ color: s.icon }}>
        <ToastIcon type={toast.type} />
      </span>
      {/* message */}
      <p className="text-sm font-medium leading-snug flex-1" style={{ color: 'var(--ink)' }}>
        {toast.message}
      </p>
      {/* close */}
      <button
        onClick={onClose}
        className="absolute top-2.5 right-2.5 [&_svg]:w-3.5 [&_svg]:h-3.5 transition-opacity hover:opacity-60"
        style={{ color: 'var(--ink-faint)' }}
      >
        <X />
      </button>
    </motion.div>
  );
};

/* ─── Primitive components ───────────────────────────────── */

const ToolBtn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  accent?: boolean;
  title?: string;
  disabled?: boolean;
}> = ({ children, onClick, active, accent, title, disabled }) => (
  <motion.button
    onClick={onClick}
    disabled={disabled}
    title={title}
    whileTap={{ scale: disabled ? 1 : 0.88 }}
    className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors
               disabled:opacity-30 [&_svg]:w-3.5 [&_svg]:h-3.5"
    style={{
      background: active ? 'var(--accent-dim)' : 'transparent',
      color: active ? 'var(--accent)' : accent ? 'var(--accent)' : 'var(--ink-muted)',
    }}
  >
    {children}
  </motion.button>
);

const Sep: React.FC = () => (
  <div className="w-px h-4 mx-0.5 shrink-0 rounded-full" style={{ background: 'var(--border-mid)' }} />
);

const SideLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
    {children}
  </p>
);

const SegControl: React.FC<{
  options: { value: string; label: string; icon?: React.FC<{ className?: string }> }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className="relative flex-1 h-8 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5
                   transition-colors z-10 [&_svg]:w-3.5 [&_svg]:h-3.5"
        style={{ color: value === opt.value ? 'var(--ink)' : 'var(--ink-muted)' }}
      >
        {value === opt.value && (
          <motion.div
            layoutId={`seg-${options.map(o => o.value).join('-')}`}
            className="absolute inset-0 rounded-lg z-[-1]"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        )}
        {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
        {opt.label}
      </button>
    ))}
  </div>
);

/* ─── i18n ───────────────────────────────────────────────── */
const STRINGS = {
  en: {
    studio: 'Mudmee Studio',
    design: 'Design', assemble: 'Assemble', preview: '3D', gallery: 'Gallery',
    body: 'Body', border: 'Border',
    freehand: 'Freehand', pixel: 'Pixel',
    symmetryGroup: 'Symmetry',
    palette: 'Palette', active: 'Active',
    gridSize: 'Grid', cols: 'Cols', rows: 'Rows',
    metadata: 'Pattern Info', patternName: 'Name', creator: 'Creator',
    geography: 'Region', description: 'Notes',
    motifEditor: 'Motif', undo: 'Undo', redo: 'Redo', clearMotif: 'Clear',
    pan: 'Pan', zoomIn: 'Zoom In', zoomOut: 'Zoom Out',
    rotateLeft: 'Rotate −15°', rotateRight: 'Rotate +15°', reset: 'Reset View',
    toggleGrid: 'Grid', toggleSymmetry: 'Axes',
    saveGallery: 'Save to Gallery',
    exportPreview: 'Export Image', exportFreehand: 'Freehand PNG', exportGrid: 'Grid PNG (8-bit)',
    exportProject: 'Export JSON', importProject: 'Import JSON',
    uploadOverlay: 'Tracing image', removeOverlay: 'Remove',
    fabricAssembly: 'Fabric Assembly', saveAssembly: 'Save to Gallery',
    threeDPreview: '3D Preview', threeDHint: 'Drag to rotate · Scroll to zoom',
    localGallery: 'Gallery', search: 'Search…', all: 'All',
    noMotifs: 'Nothing saved yet.\nDraw a motif and click Save.',
    load: 'Load', delete: 'Delete', dragHint: 'Drag section edges to resize.',
    saved: 'Saved!', failedSave: 'Save failed', loaded: 'Loaded', invalidFile: 'Invalid file',
    confirmDelete: 'Delete this item?', confirmDeleteMsg: 'This action cannot be undone.',
    mathPrompt: 'Solve to confirm:', mathWrong: 'Incorrect answer, try again.',
    cancel: 'Cancel',
    part: 'Part', mode: 'Draw Mode', overlay: 'Overlay',
  },
  th: {
    studio: 'มัดหมี่ สตูดิโอ',
    design: 'ออกแบบ', assemble: 'ประกอบ', preview: '3D', gallery: 'แกลเลอรี',
    body: 'ตัวผ้า', border: 'ตีนผ้า',
    freehand: 'อิสระ', pixel: 'ตาราง',
    symmetryGroup: 'สมมาตร',
    palette: 'จานสี', active: 'ใช้อยู่',
    gridSize: 'ตาราง', cols: 'คอลัมน์', rows: 'แถว',
    metadata: 'ข้อมูลลาย', patternName: 'ชื่อลาย', creator: 'ผู้สร้าง',
    geography: 'ภูมิภาค', description: 'หมายเหตุ',
    motifEditor: 'ลาย', undo: 'เลิกทำ', redo: 'ทำซ้ำ', clearMotif: 'ล้าง',
    pan: 'เลื่อน', zoomIn: 'ขยาย', zoomOut: 'ย่อ',
    rotateLeft: 'หมุนซ้าย', rotateRight: 'หมุนขวา', reset: 'รีเซ็ต',
    toggleGrid: 'ตาราง', toggleSymmetry: 'แกน',
    saveGallery: 'บันทึก',
    exportPreview: 'ส่งออกรูป', exportFreehand: 'PNG อิสระ', exportGrid: 'PNG ตาราง (8-บิต)',
    exportProject: 'ส่งออก JSON', importProject: 'นำเข้า JSON',
    uploadOverlay: 'ภาพต้นแบบ', removeOverlay: 'ลบภาพ',
    fabricAssembly: 'ประกอบผ้า', saveAssembly: 'บันทึกลงแกลเลอรี',
    threeDPreview: 'พรีวิว 3 มิติ', threeDHint: 'ลากเพื่อหมุน · เลื่อนเพื่อซูม',
    localGallery: 'แกลเลอรี', search: 'ค้นหา…', all: 'ทั้งหมด',
    noMotifs: 'ยังไม่มีลาย\nวาดลายแล้วกดบันทึก',
    load: 'โหลด', delete: 'ลบ', dragHint: 'ลากขอบส่วนเพื่อปรับขนาด',
    saved: 'บันทึกแล้ว!', failedSave: 'บันทึกไม่สำเร็จ', loaded: 'โหลดแล้ว', invalidFile: 'ไฟล์ไม่ถูกต้อง',
    confirmDelete: 'ลบรายการนี้?', confirmDeleteMsg: 'การกระทำนี้ไม่สามารถย้อนกลับได้',
    mathPrompt: 'ตอบให้ถูกเพื่อยืนยัน:', mathWrong: 'คำตอบไม่ถูกต้อง ลองใหม่',
    cancel: 'ยกเลิก',
    part: 'ส่วน', mode: 'โหมดวาด', overlay: 'ภาพต้นแบบ',
  },
} as const;

type Mode      = 'design' | 'assemble' | 'preview' | 'gallery';
type Part      = 'body' | 'border';
type Lang      = 'en' | 'th';
type Theme     = 'light' | 'dark';
type DrawMode  = 'freehand' | 'pixel';
type GalleryTab = 'all' | 'body' | 'border' | 'assemble';

/* ─── Motion variants ────────────────────────────────────── */
const fadeSlide = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.14, ease: [0.4, 0, 1, 1]   as [number,number,number,number] } },
};

/* ─── Main App ───────────────────────────────────────────── */
export default function App() {
  const [theme,      setTheme]      = useState<Theme>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const doc = document as any;
    const handler = () => setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);


  const fsExit = () => {
    const doc = document as any;
    try {
      if (doc.exitFullscreen) doc.exitFullscreen().catch?.(() => {});
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } catch {}
  };

  const toggleFullscreen = () => {
    const doc = document as any;
    const isIn = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    if (!isIn) {
      const el = document.documentElement as any;
      try {
        if (el.requestFullscreen) el.requestFullscreen().catch?.(() => {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } catch {}
    } else {
      fsExit();
    }
  };
  const [mode,    setMode]    = useState<Mode>('design');
  const [part,    setPart]    = useState<Part>('body');
  const [lang,    setLang]    = useState<Lang>('en');
  const [drawMode, setDrawMode] = useState<DrawMode>('freehand');

  /* ── Loading screen ── */
  const [initLoading,    setInitLoading]    = useState(true);
  const [initProgress,   setInitProgress]   = useState(-1);   // -1 = shimmer
  const [initMessage,    setInitMessage]    = useState('กำลังเริ่มต้น…');
  const [tabLoading,     setTabLoading]     = useState(false);
  const [tabMessage,     setTabMessage]     = useState('');
  const initStartRef = useRef<number>(Date.now());

  const handleSetMode = (m: Mode) => {
    if (m === mode) return;
    const tabNames: Record<Mode, string> = {
      design:   'กำลังเตรียมโหมดออกแบบ…',
      assemble: 'กำลังเตรียมโหมดประกอบผ้า…',
      preview:  'กำลังโหลดพรีวิว 3 มิติ…',
      gallery:  'กำลังโหลดแกลเลอรี…',
    };
    setTabMessage(tabNames[m]);
    setTabLoading(true);
    setMode(m);
  };

  /* dismiss tab loader after new mode has painted (double rAF = browser committed a frame) */
  useEffect(() => {
    if (!tabLoading) return;
    let id1: number, id2: number;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setTabLoading(false));
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, [mode, tabLoading]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const cur = STRINGS[lang];

  /* ── History stacks ── */
  const [bodyHistory, setBodyHistory] = useState<Path[][]>([[]]);
  const [bodyStep,    setBodyStep]    = useState(0);
  const [borderHistory, setBorderHistory] = useState<Path[][]>([[]]);
  const [borderStep,    setBorderStep]    = useState(0);

  const bodyPaths   = bodyHistory[bodyStep];
  const borderPaths = borderHistory[borderStep];

  const pushBody = (upd: React.SetStateAction<Path[]>) => {
    const cur2 = bodyHistory[bodyStep];
    const next = typeof upd === 'function' ? upd(cur2) : upd;
    const h = bodyHistory.slice(0, bodyStep + 1); h.push(next);
    setBodyHistory(h); setBodyStep(h.length - 1);
  };
  const pushBorder = (upd: React.SetStateAction<Path[]>) => {
    const cur2 = borderHistory[borderStep];
    const next = typeof upd === 'function' ? upd(cur2) : upd;
    const h = borderHistory.slice(0, borderStep + 1); h.push(next);
    setBorderHistory(h); setBorderStep(h.length - 1);
  };
  const handleUndo = () => {
    if (part === 'body'   && bodyStep   > 0) setBodyStep(s => s - 1);
    if (part === 'border' && borderStep > 0) setBorderStep(s => s - 1);
  };
  const handleRedo = () => {
    if (part === 'body'   && bodyStep   < bodyHistory.length   - 1) setBodyStep(s => s + 1);
    if (part === 'border' && borderStep < borderHistory.length - 1) setBorderStep(s => s + 1);
  };
  const handleClear = () => part === 'body' ? pushBody([]) : pushBorder([]);

  /* ── Symmetry ── */
  const [bodySymmetry,   setBodySymmetry]   = useState<SymmetryGroup>('p3');
  const [borderSymmetry, setBorderSymmetry] = useState<SymmetryGroup>('p111');

  /* ── Grid ── */
  const [bodyCols,   setBodyCols]   = useState(15);
  const [bodyRows,   setBodyRows]   = useState(15);
  const [borderCols, setBorderCols] = useState(15);
  const [borderRows, setBorderRows] = useState(15);

  const currentCols = part === 'body' ? bodyCols : borderCols;
  const currentRows = part === 'body' ? bodyRows : borderRows;
  const setCols = part === 'body' ? setBodyCols : setBorderCols;
  const setRows = part === 'body' ? setBodyRows : setBorderRows;

  /* ── Canvas view ── */
  const [zoom,      setZoom]      = useState(1);
  const [rotation,  setRotation]  = useState(0);
  const [offsetX,   setOffsetX]   = useState(0);
  const [offsetY,   setOffsetY]   = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPan,    setLastPan]    = useState({ x: 0, y: 0 });
  const [showGrid,   setShowGrid]   = useState(true);
  const [showAxes,   setShowAxes]   = useState(false);
  const wallpaperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wallpaperRef.current;
    if (!el) return;
    const block = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchmove', block, { passive: false });
    el.addEventListener('touchstart', block, { passive: false });
    return () => {
      el.removeEventListener('touchmove', block);
      el.removeEventListener('touchstart', block);
    };
  }, []);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showGridMenu,   setShowGridMenu]   = useState(false);
  const [showSaveModal, setShowSaveModal]   = useState(false);
  const [pendingSaveType, setPendingSaveType] = useState<'body' | 'border' | 'assemble'>('body');

  const onPtrDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanMode) return;
    setIsDragging(true); setLastPan({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPtrMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPan.x, dy = e.clientY - lastPan.y;
    const rad = (-rotation * Math.PI) / 180;
    setOffsetX(x => x + (dx / zoom) * Math.cos(rad) - (dy / zoom) * Math.sin(rad));
    setOffsetY(y => y + (dx / zoom) * Math.sin(rad) + (dy / zoom) * Math.cos(rad));
    setLastPan({ x: e.clientX, y: e.clientY });
  };
  const onPtrUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId);
  };

  /* ── Colors ── */
  const [colors,      setColors]      = useState(['#141414', '#e11d48', '#facc15', '#2563eb']);
  const [activeColor, setActiveColor] = useState('#141414');


  /* ── Metadata ── */
  const [metadata, setMetadata] = useState<Metadata>({
    name: 'Untitled Mudmee', creator: '', description: '', geography: '',
  });

  /* ── Toasts ── */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = uuidv4();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  /* ── Gallery ── */
  const [gallery,          setGallery]          = useState<GalleryItem[]>([]);
  const [galleryTab,       setGalleryTab]        = useState<GalleryTab>('all');
  const [searchQuery,      setSearchQuery]       = useState('');
  const [deleteConfirmId,  setDeleteConfirmId]   = useState<string | null>(null);
  const [deleteMath,       setDeleteMath]         = useState<{ q: string; ans: number } | null>(null);
  const [mathInput,        setMathInput]          = useState('');
  const [mathWrong,        setMathWrong]          = useState(false);

  const openDeleteConfirm = (id: string) => {
    const a = Math.floor(Math.random() * 11);
    const b = Math.floor(Math.random() * 11);
    const plus = Math.random() < 0.5 || a < b;
    const [x, y, op] = plus ? [a, b, '+'] : [Math.max(a, b), Math.min(a, b), '−'];
    setDeleteMath({ q: `${x} ${op} ${y} =`, ans: op === '+' ? x + y : x - y });
    setMathInput(''); setMathWrong(false); setDeleteConfirmId(id);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmId(null); setDeleteMath(null); setMathInput(''); setMathWrong(false);
  };

  useEffect(() => {
    const MIN_MS = 1500;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    setInitMessage('กำลังโหลดข้อมูลแกลเลอรี…');
    fetch(`${base}/api/gallery`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setGallery(d);
        setInitMessage('โหลดเสร็จแล้ว!');
        setInitProgress(100);
      })
      .catch(() => {
        setInitProgress(100);
      })
      .finally(() => {
        const elapsed = Date.now() - initStartRef.current;
        const wait    = Math.max(0, MIN_MS - elapsed);
        setTimeout(() => setInitLoading(false), wait);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveToGallery = async (type: 'body' | 'border' | 'assemble') => {
    const canvases = document.querySelectorAll('canvas');
    const canvas   = (mode === 'assemble' ? canvases[0] : canvases[1]) as HTMLCanvasElement | undefined;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const projectData: Project = {
      version: '2.1', metadata, colors, gridSize: 80,
      body:   { symmetry: bodySymmetry,   paths: bodyPaths,   cols: bodyCols,   rows: bodyRows },
      border: { symmetry: borderSymmetry, paths: borderPaths, cols: borderCols, rows: borderRows },
    };
    const newItem: GalleryItem = { id: uuidv4(), type, metadata: { ...metadata }, image, date: new Date().toISOString(), projectData };
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${base}/api/gallery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem),
      });
      if (res.ok) { setGallery(g => [newItem, ...g]); showToast(cur.saved, 'success'); }
      else showToast(cur.failedSave, 'error');
    } catch { showToast(cur.failedSave, 'error'); }
  };

  const deleteFromGallery = async (id: string) => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const res = await fetch(`${base}/api/gallery/${id}`, { method: 'DELETE' });
    if (res.ok) setGallery(g => g.filter(i => i.id !== id));
  };

  const loadFromGallery = (item: GalleryItem) => {
    const pd = item.projectData; if (!pd) return;
    setMetadata(pd.metadata); setColors(pd.colors); setActiveColor(pd.colors[0]);
    if (item.type !== 'border') {
      setBodySymmetry(pd.body.symmetry); setBodyHistory([pd.body.paths]); setBodyStep(0);
      setBodyCols(pd.body.cols || 15);   setBodyRows(pd.body.rows || 15);
    }
    if (item.type !== 'body') {
      setBorderSymmetry(pd.border.symmetry); setBorderHistory([pd.border.paths]); setBorderStep(0);
      setBorderCols(pd.border.cols || 15);   setBorderRows(pd.border.rows || 15);
    }
    showToast(cur.loaded, 'success');
  };

  /* ── JSON ── */
  const handleExportJSON = () => {
    const project: Project = {
      version: '2.1', metadata, colors, gridSize: 80,
      body:   { symmetry: bodySymmetry,   paths: bodyPaths,   cols: bodyCols,   rows: bodyRows },
      border: { symmetry: borderSymmetry, paths: borderPaths, cols: borderCols, rows: borderRows },
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${metadata.name || 'mudmee'}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const p: Project = JSON.parse(ev.target?.result as string);
        setMetadata(p.metadata); setColors(p.colors); setActiveColor(p.colors[0]);
        setBodySymmetry(p.body.symmetry);   setBodyHistory([p.body.paths]);   setBodyStep(0);
        setBodyCols(p.body.cols || 15);     setBodyRows(p.body.rows || 15);
        setBorderSymmetry(p.border.symmetry); setBorderHistory([p.border.paths]); setBorderStep(0);
        setBorderCols(p.border.cols || 15); setBorderRows(p.border.rows || 15);
      } catch { showToast(cur.invalidFile, 'error'); }
    };
    reader.readAsText(file);
  };

  /* ── PNG export (preserved) ── */
  const exportPreview = (exportMode: 'freehand' | 'grid') => {
    const margin = 40, W = 1920, H = 1080;
    const ec = document.createElement('canvas'); ec.width = W + margin; ec.height = H + margin;
    const ctx = ec.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, ec.width, ec.height);
    const mw = 300, mh = 300;
    const paths    = part === 'body' ? bodyPaths   : borderPaths;
    const symmetry = part === 'body' ? bodySymmetry : borderSymmetry;
    const cw = mw / currentCols, ch = mh / currentRows;
    const draw = (c: CanvasRenderingContext2D) => {
      paths.forEach(path => {
        if (!path.points.length) return;
        if (path.type === 'pixel') {
          c.fillStyle = path.color;
          path.points.forEach(p => c.fillRect(p.x * cw, p.y * ch, cw, ch));
        } else {
          c.beginPath(); c.moveTo(path.points[0].x, path.points[0].y);
          path.points.slice(1).forEach(p => c.lineTo(p.x, p.y));
          c.strokeStyle = path.color; c.lineWidth = path.width || 4;
          c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
        }
      });
    };
    const scw = cw * zoom, sch = ch * zoom, uw = W / zoom, uh = H / zoom;
    if (exportMode === 'grid') {
      const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
      const tc  = tmp.getContext('2d'); if (!tc) return;
      tc.fillStyle = '#fff'; tc.fillRect(0, 0, W, H);
      tc.translate(W / 2, H / 2); tc.rotate(rotation * Math.PI / 180);
      tc.scale(zoom, zoom); tc.translate(-W / 2, -H / 2);
      applySymmetry(tc, symmetry, mw, mh, uw, uh, offsetX, offsetY, () => draw(tc));
      const sw = Math.ceil(W / scw), sh = Math.ceil(H / sch);
      const sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
      const sc = sm.getContext('2d'); if (!sc) return;
      sc.drawImage(tmp, 0, 0, W, H, 0, 0, W / scw, H / sch);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sm, 0, 0, sw, sh, margin, margin, sw * scw, sh * sch);
    } else {
      ctx.save();
      ctx.translate(margin + W / 2, margin + H / 2);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
      applySymmetry(ctx, symmetry, mw, mh, uw, uh, offsetX, offsetY, () => draw(ctx));
      ctx.restore();
    }
    ctx.save(); ctx.translate(margin, margin);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let r = 0, y = 0; y < H; y += sch, r++)
      for (let c2 = 0, x = 0; x < W; x += scw, c2++)
        if ((r + 1) % 5 === 0 || (c2 + 1) % 5 === 0) ctx.fillRect(x, y, scw, sch);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += scw) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += sch) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0, x = 0; x < W; x += scw, i++) ctx.fillText(`${i+1}`, margin + x + scw/2, margin/2);
    for (let i = 0, y = 0; y < H; y += sch, i++) ctx.fillText(`${i+1}`, margin/2, margin + y + sch/2);
    const url = ec.toDataURL('image/png');
    const a   = document.createElement('a');
    a.href = url; a.download = `${metadata.name || 'mudmee'}-${exportMode}.png`; a.click();
    setShowExportMenu(false);
  };


  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div
      data-theme={theme}
      className="h-screen overflow-hidden flex flex-col relative"
      style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* ── Loading screens ── */}
      <LoadingScreen
        visible={initLoading}
        message={initMessage}
        progress={initProgress}
      />
      <LoadingScreen
        visible={!initLoading && tabLoading}
        message={tabMessage}
        progress={-1}
      />

      {/* ── Top bar ── */}
      <header
        className="flex items-center px-2 sm:px-4 shrink-0 border-b gap-2"
        style={{
          height: 52,
          background: `color-mix(in oklch, var(--surface) 85%, transparent)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo + title input + save */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <motion.div
            animate={{ filter: `drop-shadow(0 0 8px var(--accent-glow))` }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className="[&_svg]:w-5 [&_svg]:h-5 shrink-0"
            style={{ color: 'var(--accent)' }}
          >
            <Layers />
          </motion.div>
          <span className="font-bold text-sm tracking-tight shrink-0" style={{ color: 'var(--ink)' }}>
            {cur.studio}
          </span>

          <div className="w-px h-5 rounded-full shrink-0 mx-0.5" style={{ background: 'var(--border-mid)' }} />

          {/* Pattern name */}
          <input
            type="text"
            value={metadata.name}
            onChange={e => setMetadata({ ...metadata, name: e.target.value })}
            placeholder="Untitled"
            className="hidden sm:block h-8 px-3 rounded-xl text-sm border focus:outline-none focus:ring-2 w-36 sm:w-44"
            style={{
              background: 'var(--surface-2)', borderColor: 'var(--border-mid)',
              color: 'var(--ink)',
              // @ts-expect-error CSS custom props
              '--tw-ring-color': 'var(--accent)',
            }}
          />

          {/* Save button */}
          <motion.button
            onClick={() => { setPendingSaveType(mode === 'assemble' ? 'assemble' : part); setShowSaveModal(true); }}
            whileTap={{ scale: 0.9 }}
            className="h-8 px-3 flex items-center gap-1.5 rounded-xl text-xs font-bold shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5"
            style={{
              background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-hi) 100%)`,
              color: 'white',
              boxShadow: '0 2px 10px var(--accent-glow)',
            }}
            title={cur.saveGallery}
          >
            <Save /> <span className="hidden sm:inline">{cur.saveGallery}</span>
          </motion.button>
        </div>

        {/* Mode tabs — hidden on mobile (bottom nav handles it) */}
        <nav className="hidden md:flex flex-1 justify-center">
          <div
            className="flex items-center gap-0.5 p-1 rounded-2xl"
            style={{ background: 'var(--surface-2)' }}
          >
            {(['design', 'assemble', 'preview', 'gallery'] as const).map(m => (
              <button
                key={m}
                onClick={() => handleSetMode(m)}
                className="relative h-8 px-5 text-sm font-semibold rounded-xl z-10 transition-colors"
                style={{ color: mode === m ? 'var(--ink)' : 'var(--ink-muted)' }}
              >
                {mode === m && (
                  <motion.div
                    layoutId="mode-pill"
                    className="absolute inset-0 rounded-xl z-[-1]"
                    style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}
                    transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  />
                )}
                {cur[m]}
              </button>
            ))}
          </div>
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 justify-end shrink-0 ml-auto">
          <motion.button
            onClick={handleExportJSON} whileTap={{ scale: 0.88 }}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl transition-colors [&_svg]:w-4 [&_svg]:h-4"
            style={{ color: 'var(--ink-muted)' }} title={cur.exportProject}
          >
            <Download />
          </motion.button>
          <label
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl transition-colors cursor-pointer [&_svg]:w-4 [&_svg]:h-4"
            style={{ color: 'var(--ink-muted)' }} title={cur.importProject}
          >
            <Upload />
            <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </label>

          <div className="hidden sm:block w-px h-5 rounded-full" style={{ background: 'var(--border-mid)' }} />

          <motion.button
            onClick={() => setLang(l => l === 'en' ? 'th' : 'en')} whileTap={{ scale: 0.88 }}
            className="h-8 px-2.5 text-[11px] font-black rounded-xl border transition-colors"
            style={{ borderColor: 'var(--border-mid)', color: 'var(--ink-muted)' }}
          >
            {lang === 'en' ? 'TH' : 'EN'}
          </motion.button>

          <motion.button
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} whileTap={{ scale: 0.88 }}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors [&_svg]:w-4 [&_svg]:h-4"
            style={{ color: 'var(--ink-muted)' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme}
                initial={{ opacity: 0, rotate: -30 }} animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 30 }} transition={{ duration: 0.18 }}
                className="flex"
              >
                {theme === 'light' ? <Moon /> : <Sun />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <motion.button
            onClick={toggleFullscreen} whileTap={{ scale: 0.88 }}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors [&_svg]:w-4 [&_svg]:h-4"
            style={{ color: 'var(--ink-muted)' }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={isFullscreen ? 'min' : 'max'}
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }}
                className="flex"
              >
                {isFullscreen ? <Minimize2 /> : <Maximize2 />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden mb-14 md:mb-0">

        {/* ── Sidebar (assemble only) ── */}
        {mode === 'assemble' && (
          <aside
            className="hidden lg:flex w-64 shrink-0 border-r flex-col overflow-y-auto"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="p-4 space-y-5 flex-1" />
          </aside>
        )}

        {/* ── Main workspace ── */}
        <main className="relative flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--bg)' }}>
          <AnimatePresence mode="wait" initial={false}>

            {/* DESIGN */}
            {mode === 'design' && (
              <motion.div key="design" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
                className="p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-stretch flex-1 min-h-0 overflow-y-auto lg:overflow-hidden"
              >
                {/* Motif editor */}
                <div className="relative z-[20] flex flex-col gap-3 lg:w-[300px] lg:shrink-0">
                  {/* Motif toolbar — centered, scrollable on mobile */}
                  <div className="flex justify-center overflow-x-auto pb-0.5">
                    <div
                      className="flex items-center gap-0.5 p-0.5 rounded-2xl"
                      style={{
                        background: `color-mix(in oklch, var(--surface) 88%, transparent)`,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {/* Part */}
                      <ToolBtn active={part === 'body'} onClick={() => setPart('body')} title={cur.body}>
                        <svg viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <path d="M10.5,3.5 C9,3.5 7.5,5 6.5,6.5 C5,7.5 4,9 4,10.5 C4,12 5,12.5 5.5,12.5 C4.5,13.5 3.5,15 3.5,16.5 C3.5,18 4.5,19.5 6,20 L18,20 C19.5,19.5 20.5,18 20.5,16.5 C20.5,15 19.5,13.5 18.5,12.5 C19,12.5 20,12 20,10.5 C20,9 19,7.5 17.5,6.5 C16.5,5 15,3.5 13.5,3.5 C13,2 12.5,1.5 12,1.5 C11.5,1.5 11,2 10.5,3.5 Z"/>
                          <line x1="12" y1="20" x2="12" y2="23.5"/>
                          <ellipse cx="12" cy="24.5" rx="6" ry="1.6"/>
                        </svg>
                      </ToolBtn>
                      <ToolBtn active={part === 'border'} onClick={() => setPart('border')} title={cur.border}>
                        <RectangleHorizontal />
                      </ToolBtn>
                      <Sep />
                      {/* Draw mode */}
                      <ToolBtn active={drawMode === 'freehand'} onClick={() => setDrawMode('freehand')} title={cur.freehand}>
                        <PenTool />
                      </ToolBtn>
                      <ToolBtn active={drawMode === 'pixel'} onClick={() => setDrawMode('pixel')} title={cur.pixel}>
                        <Grid />
                      </ToolBtn>
                      <Sep />
                      {/* Undo / Redo */}
                      <ToolBtn
                        onClick={handleUndo}
                        disabled={part === 'body' ? bodyStep === 0 : borderStep === 0}
                        title={cur.undo}
                      ><Undo /></ToolBtn>
                      <ToolBtn
                        onClick={handleRedo}
                        disabled={part === 'body' ? bodyStep === bodyHistory.length - 1 : borderStep === borderHistory.length - 1}
                        title={cur.redo}
                      ><Redo /></ToolBtn>
                      <Sep />
                      {/* Grid settings */}
                      <div className="relative">
                        <ToolBtn active={showGridMenu} onClick={() => setShowGridMenu(v => !v)} title={cur.gridSize}>
                          <Settings />
                        </ToolBtn>
                        <AnimatePresence>
                          {showGridMenu && (
                            <motion.div
                              key="grid-menu"
                              initial={{ opacity: 0, y: 6, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.95 }}
                              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
                              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[9999] rounded-2xl p-4 space-y-3"
                              style={{
                                width: 180,
                                background: `color-mix(in oklch, var(--surface) 92%, transparent)`,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid var(--border-mid)',
                                boxShadow: 'var(--shadow-lg)',
                              }}
                            >
                              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ink-faint)' }}>
                                {cur.gridSize}
                              </p>
                              <div className="flex gap-2">
                                {[
                                  { label: cur.cols, val: currentCols, set: setCols },
                                  { label: cur.rows, val: currentRows, set: setRows },
                                ].map(({ label, val, set }) => (
                                  <div key={label} className="flex-1">
                                    <p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>{label}</p>
                                    <input
                                      type="number" min="1" max="50" value={val}
                                      onChange={e => set(Number(e.target.value))}
                                      className="w-full h-9 px-2 rounded-xl text-sm border text-center font-mono"
                                      style={{ background: 'var(--surface-2)', borderColor: 'var(--border-mid)', color: 'var(--ink)', outline: 'none' }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden dot-grid w-full aspect-square lg:w-[300px] lg:h-[300px] lg:aspect-auto"
                    style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
                    <MotifEditor
                      paths={part === 'body' ? bodyPaths : borderPaths}
                      setPaths={part === 'body' ? pushBody : pushBorder}
                      symmetry={part === 'body' ? bodySymmetry : borderSymmetry}
                      cols={currentCols} rows={currentRows}
                      activeColor={activeColor} drawMode={drawMode}
                      showSymmetryAxes={showAxes}
                      width={300} height={300}
                    />
                  </div>

                  {/* ── Below-canvas card ── */}
                  <div
                    className="rounded-2xl p-4 space-y-4"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {/* Palette header row */}
                    <div className="flex items-center justify-between">
                      <SideLabel>{cur.palette}</SideLabel>
                      <motion.button onClick={handleClear} whileTap={{ scale: 0.92 }}
                        className="h-7 px-2.5 flex items-center gap-1 text-xs rounded-lg border
                                   transition-colors [&_svg]:w-3 [&_svg]:h-3"
                        style={{ borderColor: 'var(--border-mid)', color: 'var(--ink-muted)' }}
                      >
                        <Trash2 /> {cur.clearMotif}
                      </motion.button>
                    </div>

                    {/* Palette swatches — circles */}
                    <div className="flex items-center gap-2.5">
                      {/* Eraser */}
                      <motion.button
                        onClick={() => setActiveColor('eraser')}
                        whileTap={{ scale: 0.88 }}
                        animate={{
                          scale: activeColor === 'eraser' ? 1.12 : 1,
                          boxShadow: activeColor === 'eraser'
                            ? '0 0 0 2px var(--surface), 0 0 0 4px var(--ink-faint)'
                            : '0 0 0 1.5px var(--border-mid)',
                        }}
                        transition={{ type: 'spring', stiffness: 450, damping: 26 }}
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4"
                        style={{
                          background: 'var(--surface-2)',
                          color: activeColor === 'eraser' ? 'var(--ink)' : 'var(--ink-faint)',
                        }}
                        title="Eraser"
                      >
                        <Eraser />
                      </motion.button>

                      <div className="w-px h-7 rounded-full shrink-0" style={{ background: 'var(--border-mid)' }} />

                      {/* Color circles */}
                      {colors.map((color, i) => (
                        <div key={i} className="relative shrink-0">
                          <motion.button
                            onClick={() => setActiveColor(color)}
                            whileTap={{ scale: 0.88 }}
                            animate={{
                              scale: activeColor === color ? 1.12 : 1,
                              boxShadow: activeColor === color
                                ? `0 0 0 2px var(--surface), 0 0 0 4px ${color}, 0 0 12px ${color}60`
                                : '0 0 0 1.5px var(--border-mid)',
                            }}
                            transition={{ type: 'spring', stiffness: 450, damping: 26 }}
                            className="w-10 h-10 rounded-full block"
                            style={{ backgroundColor: color }}
                          />
                          <label
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center
                                       justify-center cursor-pointer [&_svg]:w-2 [&_svg]:h-2"
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border-mid)',
                              color: 'var(--ink-muted)',
                            }}
                          >
                            <PenTool />
                            <input
                              type="color" value={color}
                              onChange={e => {
                                const nc = [...colors]; nc[i] = e.target.value; setColors(nc);
                                if (activeColor === color) setActiveColor(e.target.value);
                              }}
                              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                            />
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Symmetry */}
                    <div className="space-y-1.5">
                      <SideLabel>{cur.symmetryGroup}</SideLabel>
                      <div className="relative">
                        <select
                          value={part === 'body' ? bodySymmetry : borderSymmetry}
                          onChange={e => {
                            const v = e.target.value as SymmetryGroup;
                            part === 'body' ? setBodySymmetry(v) : setBorderSymmetry(v);
                          }}
                          className="w-full h-9 pl-3 pr-8 rounded-xl text-sm border appearance-none cursor-pointer font-medium"
                          style={{
                            background: 'var(--surface-2)', borderColor: 'var(--border-mid)',
                            color: 'var(--ink)', outline: 'none',
                          }}
                        >
                          {part === 'body' ? (
                            <>
                              <option value="p3">p3 — 120° Rotation</option>
                              <option value="p31m">p31m — 120° + Refl off-axis</option>
                              <option value="p3m1">p3m1 — 120° + Refl on-axis</option>
                            </>
                          ) : (
                            <>
                              <option value="p111">p111 — Translation</option>
                              <option value="p112">p112 — Half-turn</option>
                              <option value="pm11">pm11 — Vertical Refl</option>
                              <option value="p1m1">p1m1 — Horizontal Refl</option>
                              <option value="p11g">p11g — Glide Refl</option>
                              <option value="pmm2">pmm2 — Double Refl</option>
                              <option value="pmg2">pmg2 — Refl + Glide</option>
                            </>
                          )}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none [&_svg]:w-3 [&_svg]:h-3" style={{ color: 'var(--ink-faint)' }}>
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 5l3 3 3-3" /></svg>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ── Sponsor logos card ── */}
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <SideLabel>{lang === 'th' ? 'ผู้ให้ทุน' : 'Funded by'}</SideLabel>
                    <div className="mt-3 flex items-center justify-around gap-3">
                      {[
                        { src: 'LOGO-bru-227x300.png', alt: 'BRU' },
                        { src: 'emblem_brand_pg.png', alt: 'PG' },
                        { src: 'TSRI_Logo_(2021).svg', alt: 'TSRI' },
                      ].map(({ src, alt }) => (
                        <img
                          key={alt}
                          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/images/${src}`}
                          alt={alt}
                          className="h-10 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview + toolbar */}
                <div className="relative z-[10] flex flex-col gap-3 h-[75vw] sm:h-[420px] lg:flex-1 lg:h-auto lg:min-w-0 lg:min-h-0">
                  {/* Toolbar */}
                  <div className="relative z-[10] flex items-center gap-0.5 px-1.5 rounded-2xl self-start"
                    style={{
                      height: 40,
                      background: `color-mix(in oklch, var(--surface) 88%, transparent)`,
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <ToolBtn active={isPanMode} onClick={() => setIsPanMode(v => !v)} title={cur.pan}><Hand /></ToolBtn>
                    <Sep />
                    <ToolBtn onClick={() => setZoom(z => Math.min(z + 0.25, 3))} title={cur.zoomIn}><ZoomIn /></ToolBtn>
                    <ToolBtn onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} title={cur.zoomOut}><ZoomOut /></ToolBtn>
                    <Sep />
                    <ToolBtn onClick={() => setRotation(r => r - 15)} title={cur.rotateLeft}><RotateCcw /></ToolBtn>
                    <ToolBtn onClick={() => setRotation(r => r + 15)} title={cur.rotateRight}><RotateCw /></ToolBtn>
                    <ToolBtn onClick={() => { setZoom(1); setRotation(0); setOffsetX(0); setOffsetY(0); }} title={cur.reset}><RefreshCw /></ToolBtn>
                    <Sep />
                    <ToolBtn active={showGrid}  onClick={() => setShowGrid(v  => !v)} title={cur.toggleGrid}><Grid /></ToolBtn>
                    <ToolBtn active={showAxes}  onClick={() => setShowAxes(v  => !v)} title={cur.toggleSymmetry}><Crosshair /></ToolBtn>
                    <Sep />
                    <div className="relative">
                      <ToolBtn onClick={() => setShowExportMenu(v => !v)} title={cur.exportPreview}><Printer /></ToolBtn>
                      <AnimatePresence>
                        {showExportMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute left-0 top-full mt-2 rounded-2xl overflow-hidden z-20 min-w-[168px]"
                            style={{
                              background: `color-mix(in oklch, var(--surface) 90%, transparent)`,
                              backdropFilter: 'blur(16px)',
                              WebkitBackdropFilter: 'blur(16px)',
                              border: '1px solid var(--border)',
                              boxShadow: 'var(--shadow-lg)',
                            }}
                          >
                            <button onClick={() => exportPreview('freehand')}
                              className="w-full text-left px-4 py-3 text-sm font-medium transition-colors border-b"
                              style={{ color: 'var(--ink)', borderColor: 'var(--border)' }}>
                              {cur.exportFreehand}
                            </button>
                            <button onClick={() => exportPreview('grid')}
                              className="w-full text-left px-4 py-3 text-sm font-medium transition-colors"
                              style={{ color: 'var(--ink)' }}>
                              {cur.exportGrid}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div
                    ref={wallpaperRef}
                    className={`relative z-0 flex-1 min-h-0 rounded-2xl overflow-hidden dot-grid ${isPanMode ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                    style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', touchAction: 'none' }}
                    onPointerDown={onPtrDown} onPointerMove={onPtrMove}
                    onPointerUp={onPtrUp}    onPointerCancel={onPtrUp} onPointerLeave={onPtrUp}
                  >
                    <SymmetryPreview
                      paths={part === 'body' ? bodyPaths : borderPaths}
                      symmetry={part === 'body' ? bodySymmetry : borderSymmetry}
                      cols={currentCols} rows={currentRows}
                      offsetX={offsetX} offsetY={offsetY}
                      showGrid={showGrid} showSymmetryAxes={showAxes}
                      motifWidth={300} motifHeight={300}
                      scale={zoom} rotation={rotation}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ASSEMBLE */}
            {mode === 'assemble' && (
              <motion.div key="assemble" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
                className="p-6 flex flex-col gap-4 overflow-auto flex-1"
              >
                <h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>
                  {cur.fabricAssembly}
                </h2>
                <AssembleView
                  bodyPaths={bodyPaths} borderPaths={borderPaths}
                  bodySymmetry={bodySymmetry} borderSymmetry={borderSymmetry}
                  bodyCols={bodyCols} bodyRows={bodyRows}
                  borderCols={borderCols} borderRows={borderRows}
                />
                <p className="text-xs text-center" style={{ color: 'var(--ink-faint)' }}>{cur.dragHint}</p>
              </motion.div>
            )}

            {/* PREVIEW — always mounted, hidden when not active to preserve WebGL state */}
            {mode === 'preview' && (
              <motion.div key="preview" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
                className="relative flex-1 overflow-hidden"
              >
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-full pointer-events-none z-10"
                  style={{ background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)' }}>
                  {cur.threeDHint}
                </p>
              </motion.div>
            )}

            {/* GALLERY */}
            {mode === 'gallery' && (
              <motion.div key="gallery" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
                className="p-6 flex flex-col gap-5 overflow-auto flex-1"
                style={{ fontFamily: 'var(--font-sarabun), sans-serif' }}
              >
                {/* Header */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 [&_svg]:w-5 [&_svg]:h-5">
                    <LayoutGrid style={{ color: 'var(--accent)' }} />
                    <h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>
                      {cur.localGallery}
                    </h2>
                  </div>
                  {/* Search */}
                  <div className="relative flex-1 max-w-xs [&_svg]:w-4 [&_svg]:h-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--ink-muted)' }} />
                    <input
                      type="text" placeholder={cur.search} value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-4 rounded-xl text-sm border focus:outline-none"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border-mid)', color: 'var(--ink)' }}
                    />
                  </div>
                  {/* Filter */}
                  <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    {(['all', 'body', 'border', 'assemble'] as const).map(tab => (
                      <button key={tab} onClick={() => setGalleryTab(tab)}
                        className="relative h-7 px-3 text-xs font-semibold rounded-lg capitalize"
                        style={{ color: galleryTab === tab ? 'var(--ink)' : 'var(--ink-muted)' }}
                      >
                        {galleryTab === tab && (
                          <motion.div layoutId="gallery-tab-pill"
                            className="absolute inset-0 rounded-lg z-[-1]"
                            style={{ background: 'var(--surface-2)' }}
                            transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                          />
                        )}
                        {cur[tab]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                {gallery.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 py-24 [&_svg]:w-14 [&_svg]:h-14">
                    <LayoutGrid style={{ color: 'var(--ink-faint)' }} />
                    <p className="text-sm text-center whitespace-pre-line" style={{ color: 'var(--ink-muted)' }}>
                      {cur.noMotifs}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gallery
                      .filter(i => galleryTab === 'all' || i.type === galleryTab)
                      .filter(i => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return [i.metadata.name, i.metadata.creator, i.metadata.description, i.metadata.geography]
                          .some(s => s?.toLowerCase().includes(q));
                      })
                      .map(item => (
                        <motion.div key={item.id}
                          whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className="rounded-2xl overflow-hidden flex flex-col cursor-default"
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          <div className="relative overflow-hidden">
                            <img
                              src={item.image} alt={item.metadata.name}
                              className="w-full h-44 object-cover"
                            />
                            {/* Type badge */}
                            <span
                              className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase
                                         tracking-widest px-2 py-1 rounded-full backdrop-blur-sm"
                              style={{
                                background: 'color-mix(in oklch, var(--surface) 80%, transparent)',
                                color: 'var(--ink-muted)',
                                border: '1px solid var(--border)',
                              }}
                            >
                              {item.type}
                            </span>
                          </div>
                          <div className="px-3.5 py-3 flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                                {item.metadata.name || '—'}
                              </p>
                              {item.metadata.creator && (
                                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                                  {item.metadata.creator}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                              <motion.button
                                onClick={() => loadFromGallery(item)} whileTap={{ scale: 0.88 }}
                                className="h-8 px-3 text-xs font-semibold rounded-xl transition-colors
                                           flex items-center gap-1"
                                style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                              >
                                <DownloadIcon /> {cur.load}
                              </motion.button>
                              <motion.button
                                onClick={() => openDeleteConfirm(item.id)} whileTap={{ scale: 0.88 }}
                                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
                                style={{ color: 'var(--accent)' }}
                                title={cur.delete}
                              >
                                <Trash2 />
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>

          {/* ThreePreview — always mounted to preserve WebGL state & selections */}
          <div className="absolute inset-0" style={{ display: mode === 'preview' ? 'block' : 'none' }}>
            <ThreePreview
              bodyPaths={bodyPaths} borderPaths={borderPaths}
              bodySymmetry={bodySymmetry} borderSymmetry={borderSymmetry}
              bodyCols={bodyCols} bodyRows={bodyRows}
              borderCols={borderCols} borderRows={borderRows}
            />
          </div>
        </main>
      </div>

      {/* ── Save modal ── */}
      <AnimatePresence>
        {showSaveModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="save-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
              onClick={() => setShowSaveModal(false)}
            />
            {/* Panel */}
            <motion.div
              key="save-panel"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
              className="fixed z-50 rounded-2xl overflow-hidden flex flex-col"
              style={{
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(360px, calc(100vw - 32px))',
                background: 'var(--surface)',
                border: '1px solid var(--border-mid)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{cur.metadata}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                    {cur[pendingSaveType] ?? pendingSaveType}
                  </p>
                </div>
                <motion.button
                  onClick={() => setShowSaveModal(false)} whileTap={{ scale: 0.88 }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl [&_svg]:w-4 [&_svg]:h-4"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </motion.button>
              </div>

              {/* Fields */}
              <div className="px-5 py-4 space-y-3">
                {([
                  { k: 'name'      as const, ph: cur.patternName },
                  { k: 'creator'   as const, ph: cur.creator },
                  { k: 'geography' as const, ph: cur.geography },
                ] as const).map(({ k, ph }) => (
                  <input
                    key={k} type="text" placeholder={ph}
                    value={metadata[k]}
                    onChange={e => setMetadata({ ...metadata, [k]: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl text-sm border focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--surface-2)', borderColor: 'var(--border-mid)',
                      color: 'var(--ink)',
                      // @ts-expect-error CSS custom props
                      '--tw-ring-color': 'var(--accent)',
                    }}
                  />
                ))}
                <textarea
                  placeholder={cur.description} value={metadata.description}
                  onChange={e => setMetadata({ ...metadata, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border resize-none focus:outline-none"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border-mid)', color: 'var(--ink)' }}
                />
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-2">
                <motion.button
                  onClick={() => setShowSaveModal(false)} whileTap={{ scale: 0.96 }}
                  className="flex-1 h-10 rounded-xl text-sm font-semibold border transition-colors"
                  style={{ borderColor: 'var(--border-mid)', color: 'var(--ink-muted)' }}
                >
                  {lang === 'en' ? 'Cancel' : 'ยกเลิก'}
                </motion.button>
                <motion.button
                  onClick={async () => { setShowSaveModal(false); await saveToGallery(pendingSaveType); }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 [&_svg]:w-4 [&_svg]:h-4"
                  style={{
                    background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-hi) 100%)`,
                    color: 'white',
                    boxShadow: '0 4px 16px var(--accent-glow)',
                  }}
                >
                  <Save /> {cur.saveGallery}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {deleteConfirmId && deleteMath && (() => {
          const item = gallery.find(i => i.id === deleteConfirmId);
          const handleConfirm = async () => {
            if (parseInt(mathInput, 10) !== deleteMath.ans) { setMathWrong(true); setMathInput(''); return; }
            await deleteFromGallery(deleteConfirmId);
            closeDeleteConfirm();
          };
          return (
            <>
              <motion.div
                key="del-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                onClick={closeDeleteConfirm}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <motion.div
                key="del-panel"
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
                className="rounded-2xl overflow-hidden flex flex-col pointer-events-auto"
                style={{
                  width: 'min(340px, calc(100vw - 32px))',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-mid)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* Icon + title */}
                <div className="px-6 pt-6 pb-2 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center [&_svg]:w-6 [&_svg]:h-6"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    <Trash2 />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{cur.confirmDelete}</p>
                    {item?.metadata.name && (
                      <p className="text-xs mt-1 font-semibold truncate max-w-[240px]" style={{ color: 'var(--accent)' }}>
                        "{item.metadata.name}"
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{cur.confirmDeleteMsg}</p>
                  </div>
                </div>

                {/* Math challenge */}
                <div className="px-6 pb-4 flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--ink-muted)' }}>{cur.mathPrompt}</p>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 h-11 rounded-xl flex items-center justify-center text-lg font-black tracking-wide select-none"
                      style={{ background: 'var(--surface-2)', color: 'var(--ink)', border: '1px solid var(--border-mid)' }}>
                      {deleteMath.q}
                    </div>
                    <input
                      autoFocus
                      type="number"
                      value={mathInput}
                      onChange={e => { setMathInput(e.target.value); setMathWrong(false); }}
                      onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                      placeholder="?"
                      className="w-16 h-11 rounded-xl text-center text-lg font-black focus:outline-none transition-colors"
                      style={{
                        background: mathWrong ? 'var(--accent-dim)' : 'var(--surface-2)',
                        border: `1px solid ${mathWrong ? 'var(--accent)' : 'var(--border-mid)'}`,
                        color: mathWrong ? 'var(--accent)' : 'var(--ink)',
                      }}
                    />
                  </div>
                  <AnimatePresence>
                    {mathWrong && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="text-xs font-semibold" style={{ color: 'var(--accent)' }}
                      >
                        {cur.mathWrong}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-2">
                  <motion.button
                    onClick={closeDeleteConfirm} whileTap={{ scale: 0.96 }}
                    className="flex-1 h-10 rounded-xl text-sm font-semibold border transition-colors"
                    style={{ borderColor: 'var(--border-mid)', color: 'var(--ink-muted)' }}
                  >
                    {cur.cancel}
                  </motion.button>
                  <motion.button
                    onClick={handleConfirm} whileTap={{ scale: 0.96 }}
                    className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 [&_svg]:w-4 [&_svg]:h-4"
                    style={{
                      background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-hi) 100%)`,
                      color: 'white',
                      boxShadow: '0 4px 16px var(--accent-glow)',
                    }}
                  >
                    <Trash2 /> {cur.delete}
                  </motion.button>
                </div>
              </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-stretch border-t z-30"
        style={{
          height: 56,
          background: `color-mix(in oklch, var(--surface) 92%, transparent)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: 'var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {(['design', 'assemble', 'preview', 'gallery'] as const).map(m => {
          const icons: Record<typeof m, React.ReactNode> = {
            design:   <PenTool />,
            assemble: <Layers />,
            preview:  <Box />,
            gallery:  <LayoutGrid />,
          };
          return (
            <button
              key={m}
              onClick={() => handleSetMode(m)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 [&_svg]:w-5 [&_svg]:h-5"
              style={{ color: mode === m ? 'var(--accent)' : 'var(--ink-muted)' }}
            >
              {icons[m]}
              <span className="text-[9px] font-semibold">{cur[m]}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Toast container ── */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onClose={() => setToasts(ts => ts.filter(x => x.id !== t.id))} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
