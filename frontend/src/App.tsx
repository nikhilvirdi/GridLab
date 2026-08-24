import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridCanvas } from './canvas/GridCanvas';
import type { GridCanvasHandle } from './canvas/GridCanvas';
import type { SolveResult } from './algorithms/types';
import { useIsMobile } from './hooks/useIsMobile';

type Point = { r: number; c: number };

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [view, setView] = useState<'single' | 'compare'>('single');

  // Shared state for compare view — both grids stay in sync
  const [sharedGrid, setSharedGrid] = useState<number[][]>([]);
  const [sharedStart, setSharedStart] = useState<Point | null>(null);
  const [sharedEnd, setSharedEnd] = useState<Point | null>(null);

  // Refs and per-side state for the comparison panel
  const leftRef = useRef<GridCanvasHandle>(null);
  const rightRef = useRef<GridCanvasHandle>(null);
  const [leftAlgo, setLeftAlgo] = useState<string | null>(null);
  const [rightAlgo, setRightAlgo] = useState<string | null>(null);
  const [leftResult, setLeftResult] = useState<SolveResult | null>(null);
  const [rightResult, setRightResult] = useState<SolveResult | null>(null);
  const [leftComplexity, setLeftComplexity] = useState<string | null>(null);
  const [rightComplexity, setRightComplexity] = useState<string | null>(null);
  const [leftBusy, setLeftBusy] = useState(false);
  const [rightBusy, setRightBusy] = useState(false);
  const [sharedSpeed, setSharedSpeed] = useState(2);

  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  return (
    <div
      className="overflow-hidden select-none"
      style={{
        height: isMobile ? 'auto' : '100vh',
        minHeight: isMobile ? '100vh' : undefined,
        overflow: isMobile ? 'visible' : 'hidden',
        backgroundColor: isDark ? '#000000' : '#f0f0f0',
        color: isDark ? '#ffffff' : '#000000',
      }}
    >
      {/* Logo — fixed top-center */}
      <img
        src={isDark ? `${import.meta.env.BASE_URL}gridlab_logo.png` : `${import.meta.env.BASE_URL}gridlab_logo_lighttheme.png`}
        alt="GridLab"
        className="fixed z-50"
        style={{
          top: isMobile ? '14px' : '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          height: isMobile ? '32px' : '56px',
          width: 'auto',
        }}
      />

      {/* Compare button — fixed top-left */}
      <button
        onClick={() => setView((prev) => (prev === 'single' ? 'compare' : 'single'))}
        aria-label={view === 'single' ? 'Compare' : 'Exit Compare'}
        className="fixed z-50 flex items-center justify-center"
        style={{
          top: isMobile ? '14px' : '24px',
          left: isMobile ? '12px' : '32px',
          height: isMobile ? '32px' : '44px',
          padding: isMobile ? '0 10px' : '0 16px',
          borderRadius: isMobile ? '16px' : '22px',
          backgroundColor: isDark ? '#111111' : '#e0e0e0',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
          color: isDark ? '#ffffff' : '#000000',
          fontFamily: 'inherit',
          fontSize: isMobile ? '11px' : '13px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: 'pointer',
        }}
      >
        {view === 'single' ? 'Compare' : 'Exit Compare'}
      </button>

      {/* Theme toggle — fixed top-right */}
      <button
        onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        aria-label="Toggle Theme"
        className="fixed z-50 flex items-center justify-center"
        style={{
          top: isMobile ? '14px' : '24px',
          right: isMobile ? '12px' : '32px',
          width: isMobile ? '32px' : '44px',
          height: isMobile ? '32px' : '44px',
          borderRadius: '50%',
          backgroundColor: isDark ? '#111111' : '#e0e0e0',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={isMobile ? '16' : '22'}
                height={isMobile ? '16' : '22'}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={isMobile ? '16' : '20'}
                height={isMobile ? '16' : '20'}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#000000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Main content — single vs compare view */}
      {view === 'single' ? (
        <div
          style={{
            paddingTop: isMobile ? '68px' : '56px',
            paddingBottom: isMobile ? '48px' : 0,
            height: isMobile ? 'auto' : 'calc(100vh - 56px)',
            overflow: isMobile ? 'visible' : 'hidden',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'center' : undefined,
            width: '100%',
          }}
        >
          <GridCanvas size={50} theme={theme} />
        </div>
      ) : (
        <div
          style={{
            paddingTop: '56px',
            height: 'calc(100vh - 56px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '32px',
            width: '100%',
          }}
        >
          <GridCanvas
            ref={leftRef}
            size={50}
            theme={theme}
            compareMode={true}
            externalGrid={sharedGrid}
            externalStartPoint={sharedStart}
            externalEndPoint={sharedEnd}
            onGridGenerated={setSharedGrid}
            onStartPointChange={setSharedStart}
            onEndPointChange={setSharedEnd}
            externalSpeed={sharedSpeed}
            onSolveResultChange={(result, complexity) => { setLeftResult(result); setLeftComplexity(complexity); }}
            onSelectedAlgoChange={setLeftAlgo}
            onBusyChange={setLeftBusy}
          />

          {/* Middle comparison panel */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '0 24px',
              minWidth: '260px',
            }}
          >
            <button
              onClick={() => {
                leftRef.current?.run();
                rightRef.current?.run();
              }}
              disabled={leftBusy || rightBusy}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '10px',
                border: '2px solid #00e676',
                backgroundColor: 'transparent',
                color: '#00e676',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: (leftBusy || rightBusy) ? 'not-allowed' : 'pointer',
                opacity: (leftBusy || rightBusy) ? 0.4 : 1,
              }}
            >
              RUN BOTH
            </button>

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                onClick={() => {
                  leftRef.current?.clear();
                  rightRef.current?.clear();
                  setSharedStart(null);
                  setSharedEnd(null);
                }}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '8px',
                  border: `2px solid ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}`,
                  backgroundColor: 'transparent',
                  color: isDark ? '#ffffff' : '#000000',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                CLEAR
              </button>
              <button
                onClick={() => {
                  leftRef.current?.reroll();
                  rightRef.current?.clear();
                }}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '8px',
                  border: `2px solid ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'}`,
                  backgroundColor: 'transparent',
                  color: isDark ? '#ffffff' : '#000000',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >
                REROLL
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <span style={{ fontSize: '10px', color: isDark ? '#888888' : '#555555' }}>S</span>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={sharedSpeed}
                onChange={(e) => setSharedSpeed(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '10px', color: isDark ? '#888888' : '#555555' }}>F</span>
            </div>

            {(leftResult || rightResult) && (
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <div style={{ flex: 1, fontSize: '11px', color: isDark ? '#cccccc' : '#333333' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>{leftAlgo ?? '—'}</div>
                  {leftResult && (
                    <>
                      <div>Visited: {leftResult.nodesVisited}</div>
                      <div>Path: {leftResult.pathLength}</div>
                      <div>Time: {leftResult.timeTaken.toFixed(2)}ms</div>
                      <div>Complexity: {leftComplexity ?? '—'}</div>
                    </>
                  )}
                </div>
                <div style={{ flex: 1, fontSize: '11px', color: isDark ? '#cccccc' : '#333333' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>{rightAlgo ?? '—'}</div>
                  {rightResult && (
                    <>
                      <div>Visited: {rightResult.nodesVisited}</div>
                      <div>Path: {rightResult.pathLength}</div>
                      <div>Time: {rightResult.timeTaken.toFixed(2)}ms</div>
                      <div>Complexity: {rightComplexity ?? '—'}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <GridCanvas
            ref={rightRef}
            size={50}
            theme={theme}
            compareMode={true}
            externalGrid={sharedGrid}
            externalStartPoint={sharedStart}
            externalEndPoint={sharedEnd}
            onGridGenerated={setSharedGrid}
            onStartPointChange={setSharedStart}
            onEndPointChange={setSharedEnd}
            externalSpeed={sharedSpeed}
            onSolveResultChange={(result, complexity) => { setRightResult(result); setRightComplexity(complexity); }}
            onSelectedAlgoChange={setRightAlgo}
            onBusyChange={setRightBusy}
          />
        </div>
      )}
    </div>
  );
}

export default App;
