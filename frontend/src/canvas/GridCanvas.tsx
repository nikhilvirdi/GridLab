import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoaderOne from '../components/LoaderOne';

interface Point {
  r: number;
  c: number;
}

interface SolvePoint {
  row: number;
  col: number;
}

interface SolveResult {
  visitedNodes: SolvePoint[];
  path: SolvePoint[];
  nodesVisited: number;
  pathLength: number;
  timeTaken: number;
}

interface GridCanvasProps {
  size?: number;
  theme?: 'dark' | 'light';
}

interface AlgorithmOption {
  id: string;
  name: string;
  tag: 'BASIC' | 'CORE' | 'OPTIMIZED' | 'ADVANCED';
  badgeColor: string;
  badgeBg: string;
  description: string;
}

const ALGO_SLUG: Record<string, string> = {
  bfs: 'bfs',
  dfs: 'dfs',
  astar: 'astar',
  jps: 'jps',
  'bidirectional-bfs': 'bidirectional-bfs',
  greedy: 'greedy',
};

const ALGORITHMS: AlgorithmOption[] = [
  {
    id: 'bfs', name: 'BFS', tag: 'BASIC',
    badgeColor: '#888888', badgeBg: 'rgba(136,136,136,0.08)',
    description: 'EXPLORES ALL NEIGHBORS LEVEL BY LEVEL. GUARANTEES SHORTEST PATH ON UNWEIGHTED GRIDS.'
  },
  {
    id: 'dfs', name: 'DFS', tag: 'BASIC',
    badgeColor: '#888888', badgeBg: 'rgba(136,136,136,0.08)',
    description: 'EXPLORES AS DEEP AS POSSIBLE BEFORE BACKTRACKING. DOES NOT GUARANTEE SHORTEST PATH.'
  },
  {
    id: 'astar', name: 'A*', tag: 'CORE',
    badgeColor: '#f5c518', badgeBg: 'rgba(245,197,24,0.08)',
    description: 'USES HEURISTICS TO FIND THE SHORTEST PATH EFFICIENTLY. EVALUATES F(N) = G(N) + H(N).'
  },
  {
    id: 'jps', name: 'JPS', tag: 'OPTIMIZED',
    badgeColor: '#1a7fd4', badgeBg: 'rgba(26,127,212,0.08)',
    description: 'AN OPTIMIZED VERSION OF A* FOR GRID MAPS. JUMPS OVER NODES TO SPEED UP PATH CALCULATION.'
  },
  {
    id: 'bidirectional-bfs', name: 'BI-BFS', tag: 'ADVANCED',
    badgeColor: '#00e676', badgeBg: 'rgba(0,230,118,0.08)',
    description: 'RUNS TWO SIMULTANEOUS BREADTH-FIRST SEARCHES FROM START AND END. MEETS IN THE MIDDLE.'
  },
  {
    id: 'greedy', name: 'GREEDY', tag: 'ADVANCED',
    badgeColor: '#00e676', badgeBg: 'rgba(0,230,118,0.08)',
    description: 'EXPLORES NODES BASED ON HEURISTIC ESTIMATE OF DISTANCE TO END. FAST BUT NOT OPTIMAL.'
  }
];

const SPEED_DELAY = [50, 20, 5];
const PATH_DELAY = 30;

const ALGO_COMPLEXITY: Record<string, string> = {
  bfs: 'O(V + E)',
  dfs: 'O(V + E)',
  astar: 'O(E log V)',
  jps: 'O(E log V)',
  'bidirectional-bfs': 'O(b^(d/2))',
  greedy: 'O(E log V)',
};

const GRID_PX = 640;

export const GridCanvas: React.FC<GridCanvasProps> = ({ size = 80, theme = 'dark' }) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const dropdownRef   = useRef<HTMLDivElement>(null);
  const animStopRef   = useRef(false);
  const sizeRef       = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);

  // Grid state
  const [grid, setGrid]           = useState<number[][]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: GRID_PX, height: GRID_PX });
  const [gridSizePx] = useState(GRID_PX);

  // Points
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint]     = useState<Point | null>(null);

  // Controls
  const [rotation, setRotation]         = useState(0);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmOption | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Run/animation state
  const [isFetching, setIsFetching]   = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [noPathFound, setNoPathFound] = useState(false);
  const [invalidPlacement, setInvalidPlacement] = useState(false);
  const [speed, setSpeed]             = useState(1);
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);
  const [showStats, setShowStats]         = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);

  const isRunDisabled = !startPoint || !endPoint || !selectedAlgo || isFetching || isAnimating;
  const isDark = theme === 'dark';

  const isAnimatingRef = useRef(false);
  const dimensionsRef = useRef(dimensions);
  const speedRef = useRef(speed);
  const themeRef = useRef(theme);

  useEffect(() => { dimensionsRef.current = dimensions; }, [dimensions]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  // Fetch grid
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setStartPoint(null);
    setEndPoint(null);
    setRotation(0);

    fetch(`http://localhost:3001/api/maze?size=${size}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch maze: ${res.statusText}`);
        return res.json();
      })
      .then(data => { if (active) { setGrid(data.grid); setLoading(false); } })
      .catch(err => { if (active) { setError(err.message || 'Backend error'); setLoading(false); } });

    return () => { active = false; };
  }, [size]);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Fixed 520px grid — no resize needed
  useEffect(() => {
    setDimensions({ width: GRID_PX, height: GRID_PX });
  }, []);

  // Canvas click handler — DO NOT MODIFY
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (loading || error || grid.length === 0 || isAnimating) return;
    if (startPoint && endPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const S = dimensions.width;
    if (S === 0) return;
    const c = Math.floor(((e.clientX - rect.left) / S) * size);
    const r = Math.floor(((e.clientY - rect.top)  / S) * size);
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    if (grid[r]?.[c] === 1) return;
    if (!startPoint) {
      setStartPoint({ r, c });
    } else if (!endPoint) {
      if (startPoint.r === r && startPoint.c === c) return;
      setEndPoint({ r, c });
    }
  };

  // Reset — DO NOT MODIFY
  const handleReset = () => {
    animStopRef.current = true;
    isAnimatingRef.current = false;
    setIsAnimating(false);
    setIsFetching(false);
    setStartPoint(null);
    setEndPoint(null);
    setSolveResult(null);
    setShowStats(false);
    setStatsPanelOpen(false);
    setNoPathFound(false);
    setInvalidPlacement(false);
    setRotation(prev => prev + 360);
  };

  // Paint a single cell directly on canvas — DO NOT MODIFY
  const paintCell = (row: number, col: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const S = dimensionsRef.current.width;
    const N = sizeRef.current;
    const x1 = (col * S) / N;
    const y1 = (row * S) / N;
    const w  = S / N;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(x1, y1, w, w);
    ctx.strokeStyle = themeRef.current === 'dark' ? '#1a1a1a' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, y1, w, w);
    ctx.restore();
  };

  // Animation engine — DO NOT MODIFY
  const runAnimation = (data: SolveResult, start: Point, end: Point) => {
    animStopRef.current = false;
    isAnimatingRef.current = true;
    setIsAnimating(true);
    setNoPathFound(false);
    setInvalidPlacement(false);

    const animateVisited = (i: number) => {
      if (animStopRef.current) {
        isAnimatingRef.current = false;
        setIsAnimating(false);
        return;
      }
      if (i >= data.visitedNodes.length) {
        if (data.path.length === 0) {
          setNoPathFound(true);
          isAnimatingRef.current = false;
          setIsAnimating(false);
          setShowStats(true);
          return;
        }
        animatePath(0);
        return;
      }

      const { row, col } = data.visitedNodes[i];
      const isStart = row === start.r && col === start.c;
      const isEnd   = row === end.r   && col === end.c;

      if (!isStart && !isEnd) {
        paintCell(row, col, '#1a7fd4');
      }

      const visitDelay = SPEED_DELAY[speedRef.current];
      setTimeout(() => animateVisited(i + 1), visitDelay);
    };

    const animatePath = (i: number) => {
      if (animStopRef.current) {
        isAnimatingRef.current = false;
        setIsAnimating(false);
        return;
      }
      if (i >= data.path.length) {
        paintCell(start.r, start.c, '#00e676');
        paintCell(end.r,   end.c,   '#ff1744');
        isAnimatingRef.current = false;
        setIsAnimating(false);
        setShowStats(true);
        return;
      }

      const { row, col } = data.path[i];
      const isStart = row === start.r && col === start.c;
      const isEnd   = row === end.r   && col === end.c;

      if (!isStart && !isEnd) {
        paintCell(row, col, '#f5c518');
      }

      setTimeout(() => animatePath(i + 1), PATH_DELAY);
    };

    setTimeout(() => animateVisited(0), 50);
  };

  const handleStop = () => {
    animStopRef.current = true;
    isAnimatingRef.current = false;
    setIsAnimating(false);
  };

  // Run solver — DO NOT MODIFY
  const handleRun = async () => {
    if (isRunDisabled || !selectedAlgo || !startPoint || !endPoint) return;
    const slug = ALGO_SLUG[selectedAlgo.id];
    if (!slug) return;

    setIsFetching(true);
    setNoPathFound(false);
    setInvalidPlacement(false);
    setShowStats(false);
    setStatsPanelOpen(false);

    try {
      const res = await fetch(`http://localhost:3001/api/solve/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grid,
          start: { row: startPoint.r, col: startPoint.c },
          end:   { row: endPoint.r,   col: endPoint.c   },
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: SolveResult = await res.json();

      if (data.visitedNodes.length === 0 && data.path.length === 0 && data.nodesVisited === 0) {
        setInvalidPlacement(true);
        return;
      }

      if (data.visitedNodes.length === 0 && data.path.length === 0) {
        setNoPathFound(true);
        return;
      }

      setSolveResult(data);
      drawBaseGrid();
      runAnimation(data, startPoint, endPoint);
    } catch (err) {
      console.error('Solve error:', err);
      setNoPathFound(true);
    } finally {
      setIsFetching(false);
    }
  };

  // Draw base grid — DO NOT MODIFY
  const drawBaseGrid = () => {
    if (isAnimatingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const S = dimensions.width;

    canvas.width  = S * dpr;
    canvas.height = S * dpr;
    canvas.style.width  = `${S}px`;
    canvas.style.height = `${S}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = theme === 'dark' ? '#0d0d0d' : '#f5f5f5';
    ctx.fillRect(0, 0, S, S);

    if (error) {
      ctx.fillStyle = '#ff1744';
      ctx.font = '14px "JetBrains Mono","Fira Code",monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BACKEND ERROR', S / 2, S / 2 - 10);
      ctx.fillStyle = '#888888';
      ctx.font = '10px "JetBrains Mono","Fira Code",monospace';
      ctx.fillText(error.substring(0, 45), S / 2, S / 2 + 15);
      return;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isWall = !loading && grid.length > 0 && grid[r]?.[c] === 1;
        const wallColor = theme === 'dark' ? '#111111' : '#787878';
        const openColor = theme === 'dark' ? '#2d2d2d' : '#b0b0b0';
        if (startPoint && startPoint.r === r && startPoint.c === c) {
          ctx.fillStyle = '#00e676';
        } else if (endPoint && endPoint.r === r && endPoint.c === c) {
          ctx.fillStyle = '#ff1744';
        } else {
          ctx.fillStyle = isWall ? wallColor : openColor;
        }
        const x1 = (c * S) / size;
        const y1 = (r * S) / size;
        const x2 = ((c + 1) * S) / size;
        const y2 = ((r + 1) * S) / size;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      }
    }

    ctx.strokeStyle = theme === 'dark' ? '#1a1a1a' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= size; i++) {
      const pos = (i * S) / size;
      ctx.moveTo(pos, 0); ctx.lineTo(pos, S);
      ctx.moveTo(0, pos); ctx.lineTo(S, pos);
    }
    ctx.stroke();

    if (loading) {
      ctx.fillStyle = theme === 'dark' ? 'rgba(13,13,13,0.6)' : 'rgba(245,245,245,0.6)';
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#ffd700';
      ctx.font = '14px "JetBrains Mono","Fira Code",monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GENERATING GRID...', S / 2, S / 2);
    }
  };

  useEffect(() => {
    if (isAnimating || showStats) return;
    drawBaseGrid();
  }, [grid, dimensions, size, loading, error, startPoint, endPoint, isAnimating, showStats, theme]);

  // ─── Styling tokens ───────────────────────────────────────────────────────
  const borderColor  = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
  const panelBg      = isDark ? '#111111' : '#e0e0e0';
  const valueBoxBg   = isDark ? '#1a1a1a' : '#d8d8d8';

  const CONTENT_W   = 420;
  const CTRL_H      = 48;
  const SECTION_GAP = 28;
  const DROPDOWN_W  = 260;

  return (
    <div
      className="flex flex-row font-mono select-none"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Fullscreen loader */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ backgroundColor: '#000000' }}
          >
            <LoaderOne />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Left column — 55%, grid centered flush-right with padding ── */}
      <div
        style={{
          width: '55%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '52px',
          flexShrink: 0,
        }}
      >
        {/* Grid container — exactly 520×520px, never percentage */}
        <div
          ref={containerRef}
          style={{
            width: `${GRID_PX}px`,
            height: `${GRID_PX}px`,
            flexShrink: 0,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
            padding: 0,
            margin: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              margin: 0,
              padding: 0,
              cursor: isAnimating ? 'default' : 'crosshair',
            }}
          />
        </div>
      </div>

      {/* ── Right column — 45%, controls start at grid top ── */}
      <div
        style={{
          width: '45%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingLeft: '12px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${CONTENT_W}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: `${SECTION_GAP}px`,
          }}
        >

          {/* ── Controls row: Reset | Dropdown | RUN ── */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>

            {/* Reset button */}
            <button
              onClick={handleReset}
              title="Reset Grid"
              style={{
                width: `${CTRL_H}px`,
                height: `${CTRL_H}px`,
                minWidth: `${CTRL_H}px`,
                minHeight: `${CTRL_H}px`,
                borderRadius: '50%',
                backgroundColor: panelBg,
                border: `1px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <motion.svg
                animate={{ rotate: rotation }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDark ? '#ffffff' : '#000000'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </motion.svg>
            </button>

            {/* Algorithm dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative', width: `${DROPDOWN_W}px`, flexShrink: 0 }}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                disabled={isAnimating}
                style={{
                  width: `${DROPDOWN_W}px`,
                  height: `${CTRL_H}px`,
                  borderRadius: '10px',
                  backgroundColor: panelBg,
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  opacity: isAnimating ? 0.3 : 1,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  color: selectedAlgo ? (isDark ? '#ffffff' : '#000000') : '#888888',
                }}
              >
                <span>{selectedAlgo ? selectedAlgo.name : 'Select Algorithm'}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDark ? '#ffffff' : '#000000'}
                  strokeWidth="2"
                  style={{
                    flexShrink: 0,
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                >
                  <polyline points="6 15 12 9 18 15" />
                </svg>
              </button>

              {/* Dropdown menu — opens upward */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      marginBottom: '8px',
                      left: 0,
                      width: `${DROPDOWN_W}px`,
                      borderRadius: '10px',
                      overflow: 'hidden',
                      backgroundColor: panelBg,
                      border: `1px solid ${borderColor}`,
                      zIndex: 50,
                    }}
                  >
                    {ALGORITHMS.map((algo, idx) => (
                      <button
                        key={algo.id}
                        onClick={() => {
                          setSelectedAlgo(algo);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          backgroundColor: panelBg,
                          border: 'none',
                          borderBottom:
                            idx < ALGORITHMS.length - 1
                              ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
                              : 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          color:
                            selectedAlgo?.id === algo.id
                              ? isDark ? '#ffffff' : '#000000'
                              : isDark ? '#cccccc' : '#444444',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#1a1a1a' : '#d5d5d5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = panelBg;
                        }}
                      >
                        <span>{algo.name} ({algo.tag})</span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: algo.badgeColor,
                          }}
                        >
                          {algo.tag}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RUN button */}
            <button
              disabled={isRunDisabled}
              onClick={handleRun}
              style={{
                height: `${CTRL_H}px`,
                padding: '0 40px',
                borderRadius: '10px',
                backgroundColor: panelBg,
                border: isRunDisabled
                  ? `1px solid ${borderColor}`
                  : '1px solid rgba(0,230,118,0.4)',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 700,
                color: '#00e676',
                cursor: isRunDisabled ? 'not-allowed' : 'pointer',
                opacity: isRunDisabled ? 0.3 : 1,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isFetching ? (
                <svg
                  width="16"
                  height="16"
                  className="animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" stroke="#00e676" strokeWidth="3" opacity="0.25" />
                  <path fill="#00e676" opacity="0.75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                'RUN'
              )}
            </button>
          </div>

          {/* ── Algorithm description — fades in on selection ── */}
          <AnimatePresence mode="wait">
            {selectedAlgo && (
              <motion.p
                key={selectedAlgo.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: '13px',
                  color: '#888888',
                  fontFamily: 'inherit',
                  lineHeight: 1.45,
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {selectedAlgo.description}
              </motion.p>
            )}
          </AnimatePresence>

          {/* ── Speed slider + STOP — visible during animation only ── */}
          <AnimatePresence>
            {isAnimating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: '12px', color: '#888888', flexShrink: 0 }}>S</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className={isDark ? 'speed-slider' : 'speed-slider-light'}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: '#888888', flexShrink: 0 }}>F</span>
                <button
                  onClick={handleStop}
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    backgroundColor: panelBg,
                    border: '1px solid rgba(255,0,0,0.3)',
                    color: '#ff1744',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  STOP
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── See Stats button + stats panel — post-run only ── */}
          <AnimatePresence>
            {(showStats || noPathFound || invalidPlacement) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: `${SECTION_GAP}px`, width: '100%' }}
              >
                {/* See Stats button */}
                <button
                  onClick={() => setStatsPanelOpen((prev) => !prev)}
                  style={{
                    width: `${CONTENT_W}px`,
                    height: `${CTRL_H}px`,
                    borderRadius: '10px',
                    backgroundColor: panelBg,
                    border: `1px solid ${borderColor}`,
                    color: isDark ? '#ffffff' : '#000000',
                    fontFamily: 'inherit',
                    fontSize: '15px',
                    cursor: 'pointer',
                  }}
                >
                  See Stats
                </button>

                {/* Stats panel */}
                <AnimatePresence>
                  {statsPanelOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{
                        width: `${CONTENT_W}px`,
                        borderRadius: '12px',
                        border: `1px solid ${borderColor}`,
                        backgroundColor: isDark ? '#111111' : '#e0e0e0',
                        padding: '20px',
                        overflow: 'hidden',
                      }}
                    >
                      {selectedAlgo && (
                        <>
                          <p
                            style={{
                              fontSize: '18px',
                              fontWeight: 700,
                              color: isDark ? '#ffffff' : '#000000',
                              margin: '0 0 6px 0',
                              fontFamily: 'inherit',
                            }}
                          >
                            {selectedAlgo.name}
                          </p>
                          <p
                            style={{
                              fontSize: '13px',
                              color: '#888888',
                              margin: '0 0 20px 0',
                              lineHeight: 1.5,
                              fontFamily: 'inherit',
                            }}
                          >
                            {selectedAlgo.description}
                          </p>
                        </>
                      )}

                      {(noPathFound || invalidPlacement) && (
                        <p
                          style={{
                            fontSize: '13px',
                            color: '#ff1744',
                            margin: '0 0 16px 0',
                            fontFamily: 'inherit',
                          }}
                        >
                          {noPathFound ? 'NO PATH FOUND' : 'INVALID START/END POINT'}
                        </p>
                      )}

                      {solveResult && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {[
                            { label: 'Nodes Visited', value: String(solveResult.nodesVisited) },
                            { label: 'Path Length',   value: String(solveResult.pathLength) },
                            { label: 'Time Taken',    value: `${solveResult.timeTaken.toFixed(2)}ms` },
                            {
                              label: 'Complexity',
                              value: selectedAlgo ? ALGO_COMPLEXITY[selectedAlgo.id] ?? '—' : '—',
                            },
                          ].map((row, idx) => (
                            <div
                              key={row.label}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                height: '52px',
                                minHeight: '52px',
                                borderBottom:
                                  idx < 3
                                    ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
                                    : 'none',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '13px',
                                  color: '#888888',
                                  fontFamily: 'inherit',
                                }}
                              >
                                {row.label}
                              </span>
                              <span
                                style={{
                                  fontSize: '14px',
                                  color: isDark ? '#ffffff' : '#000000',
                                  fontFamily: 'inherit',
                                  padding: '4px 16px',
                                  borderRadius: '6px',
                                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                                  backgroundColor: valueBoxBg,
                                  minWidth: '48px',
                                  textAlign: 'center',
                                }}
                              >
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};
