'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  visible: boolean;
  message?: string;
  /** 0–100 drives the bar. -1 = shimmer/indeterminate. */
  progress?: number;
}

export default function LoadingScreen({ visible, message, progress = -1 }: LoadingScreenProps) {
  /* shimmer offset for indeterminate bar */
  const [shimmer, setShimmer] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible || progress !== -1) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      setShimmer(((ts - start) % 1400) / 1400);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, progress]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-0"
          style={{ background: 'var(--bg)' }}
        >
          {/* decorative dot grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--border-mid) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              opacity: 0.5,
            }}
          />

          {/* logo */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{
                filter: [
                  'drop-shadow(0 0 0px oklch(0.63 0.240 15 / 0))',
                  'drop-shadow(0 0 18px oklch(0.63 0.240 15 / 0.45))',
                  'drop-shadow(0 0 0px oklch(0.63 0.240 15 / 0))',
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/images/sisin-logo.png`}
                alt="Sisin"
                width={96}
                height={96}
                style={{ objectFit: 'contain' }}
              />
            </motion.div>

            {/* Thai title */}
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 text-xl font-bold tracking-wide text-center"
              style={{ color: 'var(--ink)', fontFamily: 'Kanit, system-ui, -apple-system, sans-serif' }}
            >
              ไหมมัดหมี่ ศาสตร์แห่งศิลป์
            </motion.h1>

            {/* progress bar track */}
            <div
              className="mt-7 rounded-full overflow-hidden"
              style={{
                width: 240,
                height: 4,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            >
              {progress === -1 ? (
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: '42%',
                    x: `${shimmer * 242 - 42 * 0.42}px`,
                    background: `linear-gradient(90deg, transparent, var(--accent), var(--accent-hi), transparent)`,
                  }}
                />
              ) : (
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  style={{
                    background: `linear-gradient(90deg, var(--accent), var(--accent-hi))`,
                    boxShadow: '0 0 8px var(--accent-glow)',
                  }}
                />
              )}
            </div>

            {/* message */}
            <AnimatePresence mode="wait">
              {message && (
                <motion.p
                  key={message}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 text-xs text-center"
                  style={{ color: 'var(--ink-faint)', minHeight: 18 }}
                >
                  {message}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
