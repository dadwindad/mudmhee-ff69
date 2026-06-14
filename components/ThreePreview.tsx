'use client';

import React, { useEffect, useState, useRef, Suspense, Component, ErrorInfo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Path, SymmetryGroup } from '../lib/types';
import { applySymmetry } from '../lib/symmetry';

interface ThreePreviewProps {
  bodyPaths: Path[];
  borderPaths: Path[];
  bodySymmetry: SymmetryGroup;
  borderSymmetry: SymmetryGroup;
  bodyCols: number;
  bodyRows: number;
  borderCols: number;
  borderRows: number;
}

/* ── Error Boundary ─────────────────────────────────────────── */
interface EBState { hasError: boolean; message: string }
class SceneErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' };
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message };
  }
  componentDidCatch(_err: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-[600px] flex flex-col items-center justify-center gap-3 rounded-xl"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
          <p className="text-sm font-semibold">ไม่สามารถโหลดโมเดล 3D ได้</p>
          <p className="text-xs opacity-60 max-w-xs text-center">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-2 px-4 py-2 text-xs rounded-xl"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            ลองใหม่
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Texture builder ────────────────────────────────────────── */
function buildFabricTexture(
  bodyPaths: Path[], borderPaths: Path[],
  bodySymmetry: SymmetryGroup, borderSymmetry: SymmetryGroup,
  bodyCols: number, bodyRows: number,
  borderCols: number, borderRows: number,
): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  const W = 2048, bodyH = 1536, borderH = 512;
  canvas.width = W; canvas.height = bodyH + borderH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const mW = 300, mH = 300;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, bodyH + borderH);

  const bCW = mW / bodyCols, bCH = mH / bodyRows;
  applySymmetry(ctx, bodySymmetry, mW, mH, W, bodyH, 0, 0, () => {
    bodyPaths.forEach((path) => {
      if (!path.points.length) return;
      if (path.type === 'pixel') {
        ctx.fillStyle = path.color;
        path.points.forEach(p => ctx.fillRect(p.x * bCW, p.y * bCH, bCW, bCH));
      } else {
        ctx.beginPath(); ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
        ctx.strokeStyle = path.color; ctx.lineWidth = path.width || 4;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      }
    });
  });

  ctx.save(); ctx.translate(0, bodyH);
  const rCW = mW / borderCols, rCH = mH / borderRows;
  applySymmetry(ctx, borderSymmetry, mW, mH, W, borderH, 0, 0, () => {
    borderPaths.forEach((path) => {
      if (!path.points.length) return;
      if (path.type === 'pixel') {
        ctx.fillStyle = path.color;
        path.points.forEach(p => ctx.fillRect(p.x * rCW, p.y * rCH, rCW, rCH));
      } else {
        ctx.beginPath(); ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
        ctx.strokeStyle = path.color; ctx.lineWidth = path.width || 4;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      }
    });
  });
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}

/* ── Model component ────────────────────────────────────────── */
const MODEL_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/models/model.glb`;

function FabricModel({
  texture, scale, selectedMeshes, onMeshListReady,
}: {
  texture: THREE.CanvasTexture | null;
  scale: number;
  selectedMeshes: Set<string>;
  onMeshListReady: (names: string[]) => void;
}) {
  const { scene } = useGLTF(MODEL_PATH);

  const { cloned, originalMats } = React.useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    const normalizeScale = 2 / Math.max(size.x, size.y, size.z);
    c.scale.setScalar(normalizeScale);
    c.position.set(-center.x * normalizeScale, -center.y * normalizeScale, -center.z * normalizeScale);

    // Collect mesh names + save original materials
    const names: string[] = [];
    const origMats = new Map<string, THREE.Material | THREE.Material[]>();
    c.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        names.push(mesh.name);
        origMats.set(mesh.name, Array.isArray(mesh.material)
          ? mesh.material.map(m => m.clone())
          : mesh.material.clone());
      }
    });
    return { cloned: c, originalMats: origMats, meshNames: names };
  }, [scene]);

  useEffect(() => {
    const names: string[] = [];
    cloned.traverse((obj) => { if ((obj as THREE.Mesh).isMesh) names.push(obj.name); });
    onMeshListReady(names);
  }, [cloned, onMeshListReady]);

  useEffect(() => {
    const mat = texture ? new THREE.MeshStandardMaterial({
      map: texture, side: THREE.DoubleSide, roughness: 0.75, metalness: 0.0,
    }) : null;

    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mat && selectedMeshes.has(mesh.name)) {
        // Triplanar projection — pick UV plane per vertex based on dominant normal
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeVertexNormals();
        const bb = mesh.geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const uniformScale = Math.max(size.x, size.y, size.z) || 1;
        const pos  = mesh.geometry.attributes.position;
        const norm = mesh.geometry.attributes.normal;
        const uvs  = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) {
          const nx = Math.abs(norm.getX(i));
          const ny = Math.abs(norm.getY(i));
          const nz = Math.abs(norm.getZ(i));
          let u: number, v: number;
          if (ny >= nx && ny >= nz) {
            // top/bottom → project XZ
            u = (pos.getX(i) - bb.min.x) / uniformScale;
            v = (pos.getZ(i) - bb.min.z) / uniformScale;
          } else if (nx >= nz) {
            // left/right → project ZY
            u = (pos.getZ(i) - bb.min.z) / uniformScale;
            v = (pos.getY(i) - bb.min.y) / uniformScale;
          } else {
            // front/back → project XY
            u = (pos.getX(i) - bb.min.x) / uniformScale;
            v = (pos.getY(i) - bb.min.y) / uniformScale;
          }
          uvs[i * 2]     = u;
          uvs[i * 2 + 1] = v;
        }
        mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(() => mat.clone()) : mat;
        (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
      } else {
        const orig = originalMats.get(mesh.name);
        if (orig) mesh.material = orig;
      }
    });

    return () => { mat?.dispose(); };
  }, [cloned, texture, selectedMeshes, originalMats]);

  return (
    <group scale={[scale, scale, scale]}>
      <primitive object={cloned} dispose={null} />
    </group>
  );
}

/* ── Camera position tracker ────────────────────────────────── */
function CameraTracker({ onUpdate }: { onUpdate: (p: [number, number, number]) => void }) {
  const { camera } = useThree();
  useFrame(() => {
    onUpdate([
      parseFloat(camera.position.x.toFixed(2)),
      parseFloat(camera.position.y.toFixed(2)),
      parseFloat(camera.position.z.toFixed(2)),
    ]);
  });
  return null;
}

/* ── Auto-fit camera to model bounding box ──────────────────── */
function AutoFitCamera({ trigger, orbitRef }: { trigger: number; orbitRef: React.RefObject<any> }) {
  const { camera, scene, size } = useThree();
  const fitted = useRef(false);

  useFrame(() => {
    if (fitted.current) return;
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return;

    const boxSize = new THREE.Vector3();
    const boxCenter = new THREE.Vector3();
    box.getSize(boxSize);
    box.getCenter(boxCenter);

    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const aspect = size.width / size.height;
    const maxH = boxSize.y / (2 * Math.tan(fov / 2));
    const maxW = boxSize.x / (2 * Math.tan(fov / 2) * aspect);
    const fitDist = Math.max(maxH, maxW, boxSize.z / 2) * 1.5;

    const dir = camera.position.clone().sub(boxCenter).normalize();
    camera.position.copy(boxCenter.clone().add(dir.multiplyScalar(fitDist)));
    camera.lookAt(boxCenter);

    // Sync OrbitControls target to model center
    if (orbitRef.current) {
      orbitRef.current.target.copy(boxCenter);
      orbitRef.current.update();
    }

    fitted.current = true;
  });

  useEffect(() => { fitted.current = false; }, [trigger]);
  return null;
}

/* ── Loading spinner ────────────────────────────────────────── */
function Spinner() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * 1.5; });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.6, 0.12, 16, 64]} />
      <meshStandardMaterial color="#d6a96e" roughness={0.4} />
    </mesh>
  );
}

/* ── Main export ────────────────────────────────────────────── */
export default function ThreePreview(props: ThreePreviewProps) {
  const {
    bodyPaths, borderPaths,
    bodySymmetry, borderSymmetry,
    bodyCols, bodyRows,
    borderCols, borderRows,
  } = props;

  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [scale] = useState(1);
  const [texRepeat,    setTexRepeat]    = useState(1);
  const [autoRotate,   setAutoRotate]   = useState(false);
  const [rotateSpeed,  setRotateSpeed]  = useState(1);
  const [camPos, setCamPos] = useState<[number, number, number]>([1.74, 1.45, 2.83]);
  const orbitRef = useRef<any>(null);
  const FABRIC_GROUPS = [
    { label: 'ชุด',     meshes: ['Object14_1'] },
    { label: 'ถุงเท้า', meshes: ['Object18_1', 'Object20_1'] },
    { label: 'รองเท้า', meshes: ['Object17_1', 'Object19_1'] },
  ];

  const [selectedMeshes, setSelectedMeshes] = useState<Set<string>>(new Set());

  const handleMeshListReady = React.useCallback((_names: string[]) => {}, []);

  const isGroupSelected = (meshes: string[]) => meshes.every(m => selectedMeshes.has(m));

  const toggleGroup = (meshes: string[]) => {
    setSelectedMeshes(prev => {
      const next = new Set(prev);
      const allOn = meshes.every(m => next.has(m));
      meshes.forEach(m => allOn ? next.delete(m) : next.add(m));
      return next;
    });
  };

  const TEX_STEP = 0.25;
  const TEX_MIN  = 0.25;
  const TEX_MAX  = 8;

  useEffect(() => {
    const tex = buildFabricTexture(
      bodyPaths, borderPaths,
      bodySymmetry, borderSymmetry,
      bodyCols, bodyRows,
      borderCols, borderRows,
    );
    if (tex) tex.repeat.set(texRepeat, texRepeat);
    setTexture(tex);
    return () => { tex?.dispose(); };
  }, [bodyPaths, borderPaths, bodySymmetry, borderSymmetry, bodyCols, bodyRows, borderCols, borderRows]);

  // Update repeat when texRepeat changes without rebuilding texture
  useEffect(() => {
    if (!texture) return;
    texture.repeat.set(texRepeat, texRepeat);
    texture.needsUpdate = true;
  }, [texture, texRepeat]);

  return (
    <SceneErrorBoundary>
      <div className="relative w-full h-full overflow-hidden"
        style={{ background: 'var(--surface-2)' }}>
        <Canvas camera={{ position: [1.74, 1.45, 2.83] as [number, number, number], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5] as [number, number, number]} intensity={1.2} />
          <directionalLight position={[-5, -4, -5] as [number, number, number]} intensity={0.4} />

          <Suspense fallback={<Spinner />}>
            <FabricModel
              texture={texture} scale={scale}
              selectedMeshes={selectedMeshes}
              onMeshListReady={handleMeshListReady}
            />
          </Suspense>
          <OrbitControls
            ref={orbitRef}
            enablePan={false}
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            autoRotate={autoRotate}
            autoRotateSpeed={rotateSpeed}
          />
          <CameraTracker onUpdate={setCamPos} />
          <AutoFitCamera trigger={scale} orbitRef={orbitRef} />
        </Canvas>

        {/* Mesh selector — left */}
        <div
          className="absolute top-4 left-4 flex flex-col gap-1 rounded-2xl p-2"
          style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', minWidth: 110 }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest pb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>ใส่ลายที่</span>
          {FABRIC_GROUPS.map(({ label, meshes }) => {
            const on = isGroupSelected(meshes);
            return (
              <button
                key={label}
                onClick={() => toggleGroup(meshes)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-left text-xs font-medium transition-colors"
                style={{
                  background: on ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: on ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)',
                  border: `1px solid ${on ? 'rgba(255,255,255,0.35)' : 'transparent'}`,
                }}
              >
                <span style={{ color: on ? '#86efac' : 'rgba(255,255,255,0.25)' }}>{on ? '✓' : '○'}</span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Controls overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">

          {/* Fabric texture scale */}
          <div
            className="flex flex-col items-center gap-0.5 rounded-2xl p-1.5"
            style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest pt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>ลาย</span>
            <button onClick={() => setTexRepeat(r => Math.min(TEX_MAX, parseFloat((r + TEX_STEP).toFixed(2))))}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-lg font-bold hover:opacity-80 active:opacity-60"
              style={{ color: 'rgba(255,255,255,0.9)' }} title="ลายเล็กลง (tile มากขึ้น)">+</button>
            <button onClick={() => setTexRepeat(1)}
              className="w-9 h-7 flex items-center justify-center rounded-xl text-[11px] font-bold hover:opacity-80 tabular-nums"
              style={{ color: 'rgba(255,255,255,0.6)' }} title="รีเซ็ตลาย">
              {texRepeat.toFixed(2)}×
            </button>
            <button onClick={() => setTexRepeat(r => Math.max(TEX_MIN, parseFloat((r - TEX_STEP).toFixed(2))))}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-lg font-bold hover:opacity-80 active:opacity-60"
              style={{ color: 'rgba(255,255,255,0.9)' }} title="ลายใหญ่ขึ้น (tile น้อยลง)">−</button>
          </div>

          {/* Auto rotate */}
          <div
            className="flex flex-col items-center gap-1.5 rounded-2xl p-2"
            style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>หมุน</span>
            <button
              onClick={() => setAutoRotate(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-base transition-all"
              style={{
                background: autoRotate ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: autoRotate ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${autoRotate ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
              }}
              title={autoRotate ? 'หยุดหมุน' : 'หมุนอัตโนมัติ'}
            >
              {autoRotate ? '⏸' : '▶'}
            </button>

            {/* Speed slider */}
            <input
              type="range" min={0.5} max={10} step={0.5}
              value={rotateSpeed}
              onChange={e => setRotateSpeed(Number(e.target.value))}
              className="w-8 cursor-pointer"
              style={{
                writingMode: 'vertical-lr',
                direction: 'rtl',
                height: 72,
                accentColor: 'rgba(255,255,255,0.7)',
              }}
              title={`ความเร็ว: ${rotateSpeed}`}
            />
            <span className="text-[10px] tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {rotateSpeed}×
            </span>
          </div>

        </div>

        {/* Camera position display */}
        <div
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl font-mono text-[11px] tabular-nums"
          style={{
            background: 'rgba(0,0,0,0.38)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.65)',
          }}
        >
          [{camPos[0]}, {camPos[1]}, {camPos[2]}]
        </div>
      </div>
    </SceneErrorBoundary>
  );
}

useGLTF.preload(MODEL_PATH);
