'use client';

import React, { useState, useEffect } from 'react';
import { Download, Upload, Image as ImageIcon, Box, Layers, Palette, Settings, Info, Grid, PenTool, Save, Trash2, Image as ImageIcon2, Hand, ZoomIn, ZoomOut, RotateCcw, RotateCw, RefreshCw, Search, Download as DownloadIcon, Crosshair, Undo, Redo, Printer } from 'lucide-react';
import MotifEditor from '../../components/MotifEditor';
import SymmetryPreview from '../../components/SymmetryPreview';
import AssembleView from '../../components/AssembleView';
import ThreePreview from '../../components/ThreePreview';
import { Path, SymmetryGroup, Metadata, Project, GalleryItem } from '../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { applySymmetry } from '../../lib/symmetry';

export default function App() {
  const [mode, setMode] = useState<'design' | 'assemble' | 'preview' | 'gallery'>('design');
  const [part, setPart] = useState<'body' | 'border'>('body');
  const [lang, setLang] = useState<'en' | 'th'>('en');

  const t = {
    en: {
      studio: 'Mudmee Studio',
      subtitle: 'Symmetry & 3D',
      workspace: 'Workspace',
      design: 'design',
      assemble: 'assemble',
      preview: 'preview',
      gallery: 'gallery',
      designPart: 'Design Part',
      body: 'body',
      border: 'border',
      drawingMode: 'Drawing Mode',
      freehand: 'Freehand',
      pixel: 'Grid/Pixel',
      symmetryGroup: 'Symmetry Group',
      metadata: 'Metadata',
      patternName: 'Pattern Name',
      creator: 'Creator',
      geography: 'Geography / Region',
      description: 'Description',
      exportProject: 'Export Project',
      importProject: 'Import Project',
      motifEditor: 'Motif Editor',
      undo: 'Undo',
      redo: 'Redo',
      clearMotif: 'Clear Motif',
      palette: 'Color Palette',
      active: 'Active',
      gridSize: 'Motif Grid Size',
      cols: 'Columns',
      rows: 'Rows',
      pan: 'Pan Tool',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      rotateLeft: 'Rotate Left',
      rotateRight: 'Rotate Right',
      reset: 'Reset View',
      toggleGrid: 'Toggle Grid',
      toggleSymmetry: 'Toggle Symmetry Axes',
      saveGallery: 'Save to Gallery',
      exportPreview: 'Print / Export Image',
      uploadOverlay: 'Upload Tracing Overlay',
      removeOverlay: 'Remove Overlay',
      fabricAssembly: 'Fabric Assembly',
      saveAssembly: 'Save Assembly to Gallery',
      threeDPreview: '3D Pha Thung Preview',
      threeDHint: 'Drag to rotate. Scroll to zoom.',
      localGallery: 'Local Server Gallery',
      search: 'Search metadata...',
      all: 'all',
      noMotifs: 'No motifs saved yet. Go to Design mode and click "Save to Gallery".',
      load: 'Load',
      delete: 'Delete',
      exportFreehand: 'Export as Freehand',
      exportGrid: 'Export as Grid (8-bit)',
      dragHint: 'Drag the bottom edge of each section to adjust its height.',
      saved: 'Saved to Server Gallery!',
      failedSave: 'Failed to save to gallery',
      loaded: 'Loaded from gallery!',
      invalidFile: 'Invalid project file',
    },
    th: {
      studio: 'มัดหมี่ สตูดิโอ',
      subtitle: 'สมมาตร และ 3 มิติ',
      workspace: 'พื้นที่ทำงาน',
      design: 'ออกแบบ',
      assemble: 'ประกอบผ้า',
      preview: 'ตัวอย่าง',
      gallery: 'แกลเลอรี',
      designPart: 'ส่วนออกแบบ',
      body: 'ตัวผ้า',
      border: 'ตีนผ้า',
      drawingMode: 'โหมดการวาด',
      freehand: 'วาดอิสระ',
      pixel: 'ตาราง',
      symmetryGroup: 'กลุ่มสมมาตร',
      metadata: 'ข้อมูลลาย',
      patternName: 'ชื่อลาย',
      creator: 'ผู้สร้างสรรค์',
      geography: 'ภูมิศาสตร์ / ภูมิภาค',
      description: 'คำอธิบาย',
      exportProject: 'ส่งออกโปรเจกต์ (JSON)',
      importProject: 'นำเข้าโปรเจกต์ (JSON)',
      motifEditor: 'ตัวแก้ไขลาย',
      undo: 'เลิกทำ',
      redo: 'ทำซ้ำ',
      clearMotif: 'ล้างลาย',
      palette: 'จานสี',
      active: 'สีที่ใช้',
      gridSize: 'ขนาดตารางลาย',
      cols: 'คอลัมน์',
      rows: 'แถว',
      pan: 'เครื่องมือเลื่อน',
      zoomIn: 'ขยาย',
      zoomOut: 'ย่อ',
      rotateLeft: 'หมุนซ้าย',
      rotateRight: 'หมุนขวา',
      reset: 'รีเซ็ตมุมมอง',
      toggleGrid: 'เปิด/ปิด ตาราง',
      toggleSymmetry: 'เปิด/ปิด แกนสมมาตร',
      saveGallery: 'บันทึกลงแกลเลอรี',
      exportPreview: 'พิมพ์ / ส่งออกรูปภาพ',
      uploadOverlay: 'อัปโหลดภาพต้นแบบ',
      removeOverlay: 'ลบภาพต้นแบบ',
      fabricAssembly: 'การประกอบผ้า',
      saveAssembly: 'บันทึกการประกอบลงแกลเลอรี',
      threeDPreview: 'พรีวิว 3 มิติ ผ้าถุง',
      threeDHint: 'ลากเพื่อหมุน สกรูเพื่อซูม',
      localGallery: 'แกลเลอรี',
      search: 'ค้นหา...',
      all: 'ทั้งหมด',
      noMotifs: 'ยังไม่มีลายที่บันทึกไว้ ไปที่โหมดออกแบบแล้วคลิก "บันทึกลงแกลเลอรี"',
      load: 'โหลด',
      delete: 'ลบ',
      exportFreehand: 'ส่งออกเป็นวาดอิสระ',
      exportGrid: 'ส่งออกเป็นตาราง (8-บิต)',
      dragHint: 'ลากขอบด้านล่างของแต่ละส่วนเพื่อปรับความสูง',
      saved: 'บันทึกลงแกลเลอรีแล้ว!',
      failedSave: 'บันทึกลงแกลเลอรีไม่สำเร็จ',
      loaded: 'โหลดจากแกลเลอรีแล้ว!',
      invalidFile: 'ไฟล์โปรเจกต์ไม่ถูกต้อง',
    }
  };

  const cur = t[lang];

  const [bodyHistory, setBodyHistory] = useState<Path[][]>([[]]);
  const [bodyHistoryStep, setBodyHistoryStep] = useState(0);
  const [borderHistory, setBorderHistory] = useState<Path[][]>([[]]);
  const [borderHistoryStep, setBorderHistoryStep] = useState(0);

  const bodyPaths = bodyHistory[bodyHistoryStep];
  const borderPaths = borderHistory[borderHistoryStep];

  const handleSetBodyPaths = (newPathsOrUpdater: React.SetStateAction<Path[]>) => {
    const currentPaths = bodyHistory[bodyHistoryStep];
    const newPaths = typeof newPathsOrUpdater === 'function' ? newPathsOrUpdater(currentPaths) : newPathsOrUpdater;
    const newHistory = bodyHistory.slice(0, bodyHistoryStep + 1);
    newHistory.push(newPaths);
    setBodyHistory(newHistory);
    setBodyHistoryStep(newHistory.length - 1);
  };

  const handleSetBorderPaths = (newPathsOrUpdater: React.SetStateAction<Path[]>) => {
    const currentPaths = borderHistory[borderHistoryStep];
    const newPaths = typeof newPathsOrUpdater === 'function' ? newPathsOrUpdater(currentPaths) : newPathsOrUpdater;
    const newHistory = borderHistory.slice(0, borderHistoryStep + 1);
    newHistory.push(newPaths);
    setBorderHistory(newHistory);
    setBorderHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (part === 'body' && bodyHistoryStep > 0) {
      setBodyHistoryStep(s => s - 1);
    } else if (part === 'border' && borderHistoryStep > 0) {
      setBorderHistoryStep(s => s - 1);
    }
  };

  const handleRedo = () => {
    if (part === 'body' && bodyHistoryStep < bodyHistory.length - 1) {
      setBodyHistoryStep(s => s + 1);
    } else if (part === 'border' && borderHistoryStep < borderHistory.length - 1) {
      setBorderHistoryStep(s => s + 1);
    }
  };

  const [bodySymmetry, setBodySymmetry] = useState<SymmetryGroup>('p3');
  const [borderSymmetry, setBorderSymmetry] = useState<SymmetryGroup>('p111');

  const [bodyCols, setBodyCols] = useState(15);
  const [bodyRows, setBodyRows] = useState(15);
  const [borderCols, setBorderCols] = useState(15);
  const [borderRows, setBorderRows] = useState(15);

  const [drawMode, setDrawMode] = useState<'freehand' | 'pixel'>('freehand');

  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [showSymmetryAxes, setShowSymmetryAxes] = useState(false);

  const [colors, setColors] = useState<string[]>(['#141414', '#e11d48', '#facc15']); // Black, Rose, Yellow
  const [activeColor, setActiveColor] = useState<string>(colors[0]);

  const [tracingImage, setTracingImage] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPanMode, setIsPanMode] = useState(false);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

  const [showExportMenu, setShowExportMenu] = useState(false);

  const exportPreview = (exportMode: 'freehand' | 'grid') => {
    const margin = 40;
    const exportWidth = 1920;
    const exportHeight = 1080;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth + margin;
    exportCanvas.height = exportHeight + margin;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    const motifWidth = 300;
    const motifHeight = 300;
    const currentPaths = part === 'body' ? bodyPaths : borderPaths;
    const currentSymmetry = part === 'body' ? bodySymmetry : borderSymmetry;
    const cellWidth = motifWidth / currentCols;
    const cellHeight = motifHeight / currentRows;

    const drawMotif = (context: CanvasRenderingContext2D) => {
      currentPaths.forEach((path) => {
        if (path.points.length === 0) return;

        if (path.type === 'pixel') {
          context.fillStyle = path.color;
          path.points.forEach((p) => {
            context.fillRect(p.x * cellWidth, p.y * cellHeight, cellWidth, cellHeight);
          });
        } else {
          context.beginPath();
          context.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            context.lineTo(path.points[i].x, path.points[i].y);
          }
          context.strokeStyle = path.color;
          context.lineWidth = path.width || 4;
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.stroke();
        }
      });
    };

    const scaledCellWidth = cellWidth * zoom;
    const scaledCellHeight = cellHeight * zoom;
    const unscaledWidth = exportWidth / zoom;
    const unscaledHeight = exportHeight / zoom;

    if (exportMode === 'grid') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = exportWidth;
      tempCanvas.height = exportHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, exportWidth, exportHeight);

      tempCtx.translate(exportWidth / 2, exportHeight / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      tempCtx.scale(zoom, zoom);
      tempCtx.translate(-exportWidth / 2, -exportHeight / 2);

      applySymmetry(tempCtx, currentSymmetry, motifWidth, motifHeight, unscaledWidth, unscaledHeight, offsetX, offsetY, () => drawMotif(tempCtx));

      const smallWidth = Math.ceil(exportWidth / scaledCellWidth);
      const smallHeight = Math.ceil(exportHeight / scaledCellHeight);

      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = smallWidth;
      smallCanvas.height = smallHeight;
      const smallCtx = smallCanvas.getContext('2d');
      if (!smallCtx) return;

      smallCtx.drawImage(tempCanvas, 0, 0, exportWidth, exportHeight, 0, 0, exportWidth / scaledCellWidth, exportHeight / scaledCellHeight);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(smallCanvas, 0, 0, smallWidth, smallHeight, margin, margin, smallWidth * scaledCellWidth, smallHeight * scaledCellHeight);
    } else {
      ctx.save();
      ctx.translate(margin + exportWidth / 2, margin + exportHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.translate(-exportWidth / 2, -exportHeight / 2);

      applySymmetry(ctx, currentSymmetry, motifWidth, motifHeight, unscaledWidth, unscaledHeight, offsetX, offsetY, () => drawMotif(ctx));
      ctx.restore();
    }

    // Draw gray cells for even rows and columns
    ctx.save();
    ctx.translate(margin, margin);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    let rIndex = 0;
    for (let y = 0; y < exportHeight; y += scaledCellHeight) {
      let cIndex = 0;
      for (let x = 0; x < exportWidth; x += scaledCellWidth) {
        if ((rIndex + 1) % 5 === 0 || (cIndex + 1) % 5 === 0) {
          ctx.fillRect(x, y, scaledCellWidth, scaledCellHeight);
        }
        cIndex++;
      }
      rIndex++;
    }
    ctx.restore();

    // Draw grid lines
    ctx.save();
    ctx.translate(margin, margin);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= exportWidth; x += scaledCellWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, exportHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= exportHeight; y += scaledCellHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(exportWidth, y);
      ctx.stroke();
    }
    ctx.restore();

    // Draw row and column numbers
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let colIndex = 0;
    for (let x = 0; x < exportWidth; x += scaledCellWidth) {
      ctx.fillText(`${colIndex + 1}`, margin + x + scaledCellWidth / 2, margin / 2);
      colIndex++;
    }

    let rowIndex = 0;
    for (let y = 0; y < exportHeight; y += scaledCellHeight) {
      ctx.fillText(`${rowIndex + 1}`, margin / 2, margin + y + scaledCellHeight / 2);
      rowIndex++;
    }

    const url = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.name || 'mudmee'}-${exportMode}.png`;
    a.click();
    setShowExportMenu(false);
  };

  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanMode) return;
    setIsDraggingPreview(true);
    setLastPanPos({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPreview) return;
    const dx = e.clientX - lastPanPos.x;
    const dy = e.clientY - lastPanPos.y;

    const rad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dOffsetX = (dx / zoom) * cos - (dy / zoom) * sin;
    const dOffsetY = (dx / zoom) * sin + (dy / zoom) * cos;

    setOffsetX(prev => prev + dOffsetX);
    setOffsetY(prev => prev + dOffsetY);
    setLastPanPos({ x: e.clientX, y: e.clientY });
  };

  const handlePreviewPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingPreview(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const [metadata, setMetadata] = useState<Metadata>({
    name: 'Untitled Mudmee',
    creator: '',
    description: '',
    geography: '',
  });

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryTab, setGalleryTab] = useState<'all' | 'body' | 'border' | 'assemble'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    fetch(`${basePath}/api/gallery`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGallery(data);
        }
      })
      .catch(e => console.error('Failed to load gallery', e));
  }, []);

  const saveToGallery = async (type: 'body' | 'border' | 'assemble') => {
    // Capture the preview canvas
    const canvases = document.querySelectorAll('canvas');
    // The second canvas is usually the SymmetryPreview in design mode, or AssembleView in assemble mode
    const previewCanvas = mode === 'assemble' ? canvases[0] : canvases[1];
    if (!previewCanvas) return;

    const image = previewCanvas.toDataURL('image/png');

    const projectData: Project = {
      version: '2.1',
      metadata,
      colors,
      gridSize: 80,
      body: { symmetry: bodySymmetry, paths: bodyPaths, cols: bodyCols, rows: bodyRows },
      border: { symmetry: borderSymmetry, paths: borderPaths, cols: borderCols, rows: borderRows },
    };

    const newItem: GalleryItem = {
      id: uuidv4(),
      type,
      metadata: { ...metadata },
      image,
      date: new Date().toISOString(),
      projectData,
    };

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        setGallery([newItem, ...gallery]);
        alert('Saved to Server Gallery!');
      } else {
        alert('Failed to save to gallery');
      }
    } catch (e) {
      console.error('Error saving to gallery', e);
      alert('Failed to save to gallery');
    }
  };

  const deleteFromGallery = async (id: string) => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/gallery/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGallery(gallery.filter(g => g.id !== id));
      }
    } catch (e) {
      console.error('Error deleting from gallery', e);
    }
  };

  const loadFromGallery = (item: GalleryItem) => {
    const { projectData } = item;
    if (!projectData) return;

    setMetadata(projectData.metadata);
    setColors(projectData.colors);

    if (item.type === 'body' || item.type === 'assemble') {
      setBodySymmetry(projectData.body.symmetry);
      setBodyHistory([projectData.body.paths]);
      setBodyHistoryStep(0);
      setBodyCols(projectData.body.cols || 15);
      setBodyRows(projectData.body.rows || 15);
    }

    if (item.type === 'border' || item.type === 'assemble') {
      setBorderSymmetry(projectData.border.symmetry);
      setBorderHistory([projectData.border.paths]);
      setBorderHistoryStep(0);
      setBorderCols(projectData.border.cols || 15);
      setBorderRows(projectData.border.rows || 15);
    }

    setActiveColor(projectData.colors[0]);
    alert(`Loaded ${item.type} from gallery!`);
  };

  const handleExportJSON = () => {
    const project: Project = {
      version: '2.1',
      metadata,
      colors,
      gridSize: 80, // Legacy support
      body: { symmetry: bodySymmetry, paths: bodyPaths, cols: bodyCols, rows: bodyRows },
      border: { symmetry: borderSymmetry, paths: borderPaths, cols: borderCols, rows: borderRows },
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.name || 'mudmee-project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project: Project = JSON.parse(event.target?.result as string);
        setMetadata(project.metadata);
        setColors(project.colors);
        setBodySymmetry(project.body.symmetry);
        setBodyHistory([project.body.paths]);
        setBodyHistoryStep(0);
        setBodyCols(project.body.cols || 15);
        setBodyRows(project.body.rows || 15);
        setBorderSymmetry(project.border.symmetry);
        setBorderHistory([project.border.paths]);
        setBorderHistoryStep(0);
        setBorderCols(project.border.cols || 15);
        setBorderRows(project.border.rows || 15);
        setActiveColor(project.colors[0]);
      } catch (err) {
        alert('Invalid project file');
      }
    };
    reader.readAsText(file);
  };

  const handleTracingImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTracingImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    if (part === 'body') handleSetBodyPaths([]);
    else handleSetBorderPaths([]);
  };

  const currentCols = part === 'body' ? bodyCols : borderCols;
  const currentRows = part === 'body' ? bodyRows : borderRows;
  const setCols = part === 'body' ? setBodyCols : setBorderCols;
  const setRows = part === 'body' ? setBodyRows : setBorderRows;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar Configuration Panel */}
      <aside className="w-full md:w-80 bg-white border-r border-stone-200 shadow-sm flex flex-col h-screen overflow-y-auto shrink-0">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-rose-700 flex items-center gap-2">
              <Layers className="w-6 h-6" />
              {cur.studio}
            </h1>
            <p className="text-xs text-stone-500 mt-1">{cur.subtitle}</p>
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'th' : 'en')}
            className="px-2 py-1 text-xs font-bold border border-stone-200 rounded hover:bg-stone-50 transition-colors"
          >
            {lang === 'en' ? 'TH' : 'EN'}
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Modes */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <Settings className="w-4 h-4" /> {cur.workspace}
            </h2>
            <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-lg">
              {(['design', 'assemble', 'preview', 'gallery'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2 text-sm font-medium rounded-md capitalize transition-colors ${mode === m ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                    }`}
                >
                  {cur[m]}
                </button>
              ))}
            </div>
          </div>

          {mode === 'design' && (
            <>
              {/* Part Selection */}
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">{cur.designPart}</h2>
                <div className="flex gap-2">
                  {(['body', 'border'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPart(p)}
                      className={`flex-1 py-2 px-4 text-sm rounded-lg border transition-colors capitalize ${part === p
                        ? 'border-rose-500 bg-rose-50 text-rose-700 font-medium'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                    >
                      {cur[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drawing Mode */}
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">{cur.drawingMode}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDrawMode('freehand')}
                    className={`flex-1 py-2 px-4 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${drawMode === 'freehand' ? 'border-rose-500 bg-rose-50 text-rose-700 font-medium' : 'border-stone-200 bg-white text-stone-600'
                      }`}
                  >
                    <PenTool className="w-4 h-4" /> {cur.freehand}
                  </button>
                  <button
                    onClick={() => setDrawMode('pixel')}
                    className={`flex-1 py-2 px-4 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${drawMode === 'pixel' ? 'border-rose-500 bg-rose-50 text-rose-700 font-medium' : 'border-stone-200 bg-white text-stone-600'
                      }`}
                  >
                    <Grid className="w-4 h-4" /> {cur.pixel}
                  </button>
                </div>
              </div>

              {/* Symmetry Settings */}
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">{cur.symmetryGroup}</h2>
                <select
                  value={part === 'body' ? bodySymmetry : borderSymmetry}
                  onChange={(e) => {
                    const val = e.target.value as SymmetryGroup;
                    if (part === 'body') setBodySymmetry(val);
                    else setBorderSymmetry(val);
                  }}
                  className="w-full p-2 border border-stone-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  {part === 'body' ? (
                    <>
                      <option value="p3">p3 (120° Rotation)</option>
                      <option value="p31m">p31m (120° + Refl off-axis)</option>
                      <option value="p3m1">p3m1 (120° + Refl on-axis)</option>
                    </>
                  ) : (
                    <>
                      <option value="p111">p111 (Translation)</option>
                      <option value="p112">p112 (Half-turn)</option>
                      <option value="pm11">pm11 (Vertical Reflection)</option>
                      <option value="p1m1">p1m1 (Horizontal Reflection)</option>
                      <option value="p11g">p11g (Glide Reflection)</option>
                      <option value="pmm2">pmm2 (Double Reflection)</option>
                      <option value="pmg2">pmg2 (Refl + Glide)</option>
                    </>
                  )}
                </select>
              </div>
            </>
          )}

          {/* Metadata - Hidden in Gallery mode */}
          {mode !== 'gallery' && (
            <div className="space-y-3 pt-6 border-t border-stone-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <Info className="w-4 h-4" /> {cur.metadata}
              </h2>
              <input
                type="text"
                placeholder={cur.patternName}
                value={metadata.name}
                onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
                className="w-full p-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
              <input
                type="text"
                placeholder={cur.creator}
                value={metadata.creator}
                onChange={(e) => setMetadata({ ...metadata, creator: e.target.value })}
                className="w-full p-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
              <input
                type="text"
                placeholder={cur.geography}
                value={metadata.geography}
                onChange={(e) => setMetadata({ ...metadata, geography: e.target.value })}
                className="w-full p-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
              <textarea
                placeholder={cur.description}
                value={metadata.description}
                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                className="w-full p-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none h-20"
              />
            </div>
          )}
        </div>

      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col items-center bg-stone-100">
        <div className="w-full max-w-6xl">
          {mode === 'design' && (
            <div className="flex flex-col xl:flex-row gap-8 items-start justify-center w-full">
              {/* Motif Editor */}
              <div className="flex flex-col items-center w-full xl:w-80 shrink-0 order-1">
                <div className="flex justify-between items-center w-full mb-4">
                  <h2 className="text-xl font-serif text-stone-800">
                    {cur.motifEditor} <span className="capitalize text-rose-600 italic">({part})</span>
                  </h2>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-stone-200">
                    <button
                      onClick={handleUndo}
                      disabled={part === 'body' ? bodyHistoryStep === 0 : borderHistoryStep === 0}
                      className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={cur.undo}
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={part === 'body' ? bodyHistoryStep === bodyHistory.length - 1 : borderHistoryStep === borderHistory.length - 1}
                      className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={cur.redo}
                    >
                      <Redo className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="w-full bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col items-center">
                  <MotifEditor
                    paths={part === 'body' ? bodyPaths : borderPaths}
                    setPaths={part === 'body' ? handleSetBodyPaths : handleSetBorderPaths}
                    symmetry={part === 'body' ? bodySymmetry : borderSymmetry}
                    cols={currentCols}
                    rows={currentRows}
                    activeColor={activeColor}
                    drawMode={drawMode}
                    tracingImage={tracingImage}
                    showSymmetryAxes={showSymmetryAxes}
                    width={300}
                    height={300}
                  />

                  {/* Controls */}
                  <div className="mt-4 w-full flex flex-col gap-4">
                    <button
                      onClick={handleClear}
                      className="w-full px-4 py-2 text-sm text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> {cur.clearMotif}
                    </button>

                    <hr className="border-stone-100" />

                    {/* Color Palette */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                        <Palette className="w-4 h-4" /> {cur.palette}
                      </h3>
                      <div className="flex items-center justify-center gap-4">
                        {/* Active Color (Read-only) */}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-10 h-10 rounded-full border-4 border-stone-200 shadow-sm"
                            style={{ backgroundColor: activeColor }}
                            title={cur.active}
                          />
                          <span className="text-[10px] text-stone-400 uppercase font-bold">{cur.active}</span>
                        </div>

                        <div className="w-px h-10 bg-stone-200" />

                        {/* 3 Available Colors */}
                        <div className="flex gap-3">
                          {colors.map((color, idx) => (
                            <div key={idx} className="relative group">
                              <button
                                onClick={() => setActiveColor(color)}
                                className={`w-10 h-10 rounded-full border-2 transition-all ${activeColor === color ? 'border-rose-500 scale-110 shadow-md' : 'border-stone-200 hover:scale-105'
                                  }`}
                                style={{ backgroundColor: color }}
                                title="Click to use this color"
                              />
                              <label className="absolute -bottom-2 -right-2 w-5 h-5 bg-white rounded-full shadow border border-stone-200 flex items-center justify-center cursor-pointer hover:bg-stone-50" title="Change color">
                                <PenTool className="w-3 h-3 text-stone-500" />
                                <input
                                  type="color"
                                  value={color}
                                  onChange={(e) => {
                                    const newColors = [...colors];
                                    newColors[idx] = e.target.value;
                                    setColors(newColors);
                                    if (activeColor === color) setActiveColor(e.target.value);
                                  }}
                                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <hr className="border-stone-100" />

                    {/* Grid Size */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">{cur.gridSize}</h3>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-stone-500">{cur.cols}</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={currentCols}
                            onChange={(e) => setCols(Number(e.target.value))}
                            className="w-full p-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-stone-500">{cur.rows}</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={currentRows}
                            onChange={(e) => setRows(Number(e.target.value))}
                            className="w-full p-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Symmetry Preview */}
              <div className="flex flex-col items-center w-full xl:w-auto flex-1 order-2">
                <div className="flex justify-center items-center w-full mb-4">
                  {/* Top Menu for Preview */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-stone-200">
                    <button onClick={() => setIsPanMode(!isPanMode)} className={`p-1.5 rounded transition-colors ${isPanMode ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-100'}`} title={cur.pan}>
                      <Hand className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-stone-200 mx-1" />
                    <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))} className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors" title={cur.zoomIn}>
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors" title={cur.zoomOut}>
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-stone-200 mx-1" />
                    <button onClick={() => setRotation(r => r - 15)} className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors" title={cur.rotateLeft}>
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={() => setRotation(r => r + 15)} className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors" title={cur.rotateRight}>
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-stone-200 mx-1" />
                    <button
                      onClick={() => {
                        setZoom(1);
                        setRotation(0);
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                      className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors"
                      title={cur.reset}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-stone-200 mx-1" />
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`p-1.5 rounded transition-colors ${showGrid ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-100'}`}
                      title={cur.toggleGrid}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowSymmetryAxes(!showSymmetryAxes)}
                      className={`p-1.5 rounded transition-colors ${showSymmetryAxes ? 'bg-rose-100 text-rose-700' : 'text-stone-500 hover:bg-stone-100'}`}
                      title={cur.toggleSymmetry}
                    >
                      <Crosshair className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => saveToGallery(part)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title={cur.saveGallery}
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-stone-200 mx-1" />
                    <div className="relative">
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors flex items-center gap-1"
                        title={cur.exportPreview}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {showExportMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-lg shadow-lg z-10 overflow-hidden">
                          <button
                            onClick={() => exportPreview('freehand')}
                            className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100"
                          >
                            {cur.exportFreehand}
                          </button>
                          <button
                            onClick={() => exportPreview('grid')}
                            className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                          >
                            {cur.exportGrid}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="w-px h-4 bg-stone-200 mx-1" />
                    <button
                      onClick={handleExportJSON}
                      className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors"
                      title={cur.exportProject}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <label className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors cursor-pointer" title={cur.importProject}>
                      <Upload className="w-4 h-4" />
                      <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
                    </label>
                    <div className="w-px h-4 bg-stone-200 mx-1" />
                    <label className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors cursor-pointer" title={cur.uploadOverlay}>
                      <ImageIcon className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleTracingImageUpload} />
                    </label>
                    {tracingImage && (
                      <button onClick={() => setTracingImage(null)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors" title={cur.removeOverlay}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`relative rounded-lg overflow-hidden border-4 border-white shadow-xl bg-white ${isPanMode ? (isDraggingPreview ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                  onPointerDown={handlePreviewPointerDown}
                  onPointerMove={handlePreviewPointerMove}
                  onPointerUp={handlePreviewPointerUp}
                  onPointerCancel={handlePreviewPointerUp}
                  onPointerLeave={handlePreviewPointerUp}
                >
                  <SymmetryPreview
                    paths={part === 'body' ? bodyPaths : borderPaths}
                    symmetry={part === 'body' ? bodySymmetry : borderSymmetry}
                    cols={currentCols}
                    rows={currentRows}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    showGrid={showGrid}
                    showSymmetryAxes={showSymmetryAxes}
                    width={600}
                    height={600}
                    motifWidth={300}
                    motifHeight={300}
                    scale={zoom}
                    rotation={rotation}
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'assemble' && (
            <div className="flex flex-col items-center w-full">
              <div className="flex justify-between items-center w-full mb-6">
                <h2 className="text-2xl font-serif text-stone-800">{cur.fabricAssembly}</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-stone-200 shadow-sm">
                    <button
                      onClick={handleExportJSON}
                      className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors"
                      title={cur.exportProject}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <label className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors cursor-pointer" title={cur.importProject}>
                      <Upload className="w-4 h-4" />
                      <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
                    </label>
                  </div>
                  <button onClick={() => saveToGallery('assemble')} className="text-sm bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 flex items-center gap-2 font-medium shadow-sm">
                    <Save className="w-4 h-4" /> {cur.saveAssembly}
                  </button>
                </div>
              </div>
              <AssembleView
                bodyPaths={bodyPaths}
                borderPaths={borderPaths}
                bodySymmetry={bodySymmetry}
                borderSymmetry={borderSymmetry}
                bodyCols={bodyCols}
                bodyRows={bodyRows}
                borderCols={borderCols}
                borderRows={borderRows}
              />
              <p className="text-sm text-stone-500 mt-4">{cur.dragHint}</p>
            </div>
          )}

          {mode === 'preview' && (
            <div className="flex flex-col items-center w-full">
              <div className="flex justify-between items-center w-full mb-6">
                <h2 className="text-2xl font-serif text-stone-800 flex items-center gap-2">
                  <Box className="w-6 h-6 text-rose-600" /> {cur.threeDPreview}
                </h2>
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-stone-200 shadow-sm">
                  <button
                    onClick={handleExportJSON}
                    className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors"
                    title={cur.exportProject}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <label className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors cursor-pointer" title={cur.importProject}>
                    <Upload className="w-4 h-4" />
                    <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
                  </label>
                </div>
              </div>
              <ThreePreview
                bodyPaths={bodyPaths}
                borderPaths={borderPaths}
                bodySymmetry={bodySymmetry}
                borderSymmetry={borderSymmetry}
                bodyCols={bodyCols}
                bodyRows={bodyRows}
                borderCols={borderCols}
                borderRows={borderRows}
              />
              <p className="mt-4 text-stone-500 text-sm">
                {cur.threeDHint}
              </p>
            </div>
          )}

          {mode === 'gallery' && (
            <div className="flex flex-col items-center w-full">
              <div className="flex flex-col md:flex-row justify-between items-center w-full mb-6 gap-4">
                <h2 className="text-2xl font-serif text-stone-800 flex items-center gap-2">
                  <ImageIcon2 className="w-6 h-6 text-rose-600" /> {cur.localGallery}
                </h2>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder={cur.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex bg-white rounded-lg border border-stone-200 p-1 shadow-sm">
                    {(['all', 'body', 'border', 'assemble'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setGalleryTab(tab)}
                        className={`px-3 py-1.5 text-xs font-medium rounded capitalize transition-colors ${galleryTab === tab ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:text-stone-700'
                          }`}
                      >
                        {cur[tab]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {gallery.length === 0 ? (
                <p className="text-stone-500">{cur.noMotifs}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {gallery
                    .filter(item => galleryTab === 'all' || item.type === galleryTab)
                    .filter(item => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      const m = item.metadata;
                      return (m.name?.toLowerCase().includes(q) ||
                        m.creator?.toLowerCase().includes(q) ||
                        m.description?.toLowerCase().includes(q) ||
                        m.geography?.toLowerCase().includes(q));
                    })
                    .map((item) => (
                      <div key={item.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                        <div className="relative">
                          <img src={item.image} alt={item.metadata.name} className="w-full h-48 object-cover border-b border-stone-100" />
                          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur text-stone-800 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm">
                            {cur[item.type as keyof typeof cur] || item.type}
                          </span>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex justify-end items-center">
                            <div className="flex gap-2">
                              <button onClick={() => loadFromGallery(item)} className="text-xs bg-stone-100 text-stone-700 px-3 py-1.5 rounded hover:bg-stone-200 font-medium flex items-center gap-1">
                                <DownloadIcon className="w-3 h-3" /> {cur.load}
                              </button>
                              <button onClick={() => deleteFromGallery(item.id)} className="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

