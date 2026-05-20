import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

const SPEED_DELAY = [50, 20, 5]; // Slow=50ms, Medium=20ms, Fast=5ms
const SPEED_LABELS = ['SLOW', 'MEDIUM', 'FAST'];
const PATH_DELAY = 30; // Fixed 30ms

export const GridCanvas: React.FC<GridCanvasProps> = ({ size = 60, theme = 'dark' }) => {
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
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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
  const [speed, setSpeed]             = useState(1); // 0=Slow 1=Med 2=Fast
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);
  const [showStats, setShowStats]     = useState(false);

  const isRunDisabled = !startPoint || !endPoint || !selectedAlgo || isFetching || isAnimating;

  // Refs for mirroring states to prevent stale closure & render race conditions
  const isAnimatingRef = useRef(false);
  const dimensionsRef = useRef(dimensions);
  const speedRef = useRef(speed);
  const themeRef = useRef(theme);

  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

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

  // Responsive canvas size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => { const w = container.clientWidth; setDimensions({ width: w, height: w }); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Canvas click handler
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

  // Reset
  const handleReset = () => {
    animStopRef.current = true;
    isAnimatingRef.current = false;
    setIsAnimating(false);
    setIsFetching(false);
    setStartPoint(null);
    setEndPoint(null);
    setSolveResult(null);
    setShowStats(false);
    setNoPathFound(false);
    setInvalidPlacement(false);
    setRotation(prev => prev + 360);
  };

  // Paint a single cell directly on canvas
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

  // Animation engine
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

  // Run solver
  const handleRun = async () => {
    if (isRunDisabled || !selectedAlgo || !startPoint || !endPoint) return;
    const slug = ALGO_SLUG[selectedAlgo.id];
    if (!slug) return;

    setIsFetching(true);
    setNoPathFound(false);
    setInvalidPlacement(false);
    setShowStats(false);

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

  // Draw base grid
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

  return (
    <div className={`w-full flex flex-col items-center gap-6 font-mono select-none ${theme === 'dark' ? 'text-white' : 'text-[#1a1a1a]'}`}>
      
      {/* Canvas visualizer */}
      <div
        ref={containerRef}
        className={`w-full aspect-square max-w-[600px] overflow-hidden relative flex items-center justify-center transition-all duration-300 ${theme === 'dark' ? 'bg-[#0d0d0d] border border-[#1a1a1a]' : 'bg-[#e2e2e2] border border-[rgba(0,0,0,0.15)]'}`}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`block ${isAnimating ? 'cursor-default' : 'cursor-crosshair'}`}
        />
      </div>

      {/* Speed Slider (only visible while animating) */}
      <div className="min-h-[40px] flex items-center justify-center w-full">
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center gap-4 w-full max-w-[320px]"
            >
              <span className="text-[10px] tracking-widest uppercase text-gray-500 w-16 text-right">
                {SPEED_LABELS[speed]}
              </span>
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="flex-1 h-1 appearance-none rounded-full outline-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f5c518 ${speed * 50}%, ${theme === 'dark' ? '#2a2a2a' : '#d0d0d0'} ${speed * 50}%)`
                }}
              />
              <span className="text-[8px] text-gray-600 tracking-widest uppercase">
                S/M/F
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control row: Reset button, dropdown, RUN button */}
      <div className="flex items-center justify-center gap-4 w-full max-w-[600px] relative z-40">
        
        {/* Reset button with SVG rotation */}
        <button
          onClick={handleReset}
          className={`flex items-center justify-center w-10 h-10 rounded-full text-[#f5c518] active:scale-95 transition-all duration-200 focus:outline-none ${
            theme === 'dark'
              ? 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222222] hover:text-[#ffd700]'
              : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)] hover:bg-[#c8c8c8] hover:text-[#ffd700]'
          }`}
          title="Reset Grid"
        >
          <motion.svg
            animate={{ rotate: rotation }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            xmlns="http://www.w3.org/2000/svg"
            width="18" height="18"
            viewBox="0 0 24 24"
            fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </motion.svg>
        </button>

        {/* Dropdown selector */}
        <div className="relative w-48" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(prev => !prev)}
            disabled={isAnimating}
            className={`flex items-center justify-between w-full px-4 h-10 rounded text-[11px] font-mono tracking-wider uppercase text-left transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222222]'
                : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)] hover:bg-[#c8c8c8]'
            }`}
          >
            <span className={selectedAlgo ? (theme === 'dark' ? 'text-white' : 'text-[#1a1a1a]') : 'text-gray-500'}>
              {selectedAlgo ? selectedAlgo.name : 'SELECT ALGORITHM'}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-[#f5c518] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={`absolute bottom-full mb-2 left-0 w-full rounded overflow-hidden shadow-2xl flex flex-col z-50 ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border border-[#2a2a2a]'
                    : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)]'
                }`}
              >
                {ALGORITHMS.map(algo => (
                  <button
                    key={algo.id}
                    onClick={() => { setSelectedAlgo(algo); setIsDropdownOpen(false); }}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-left transition-all duration-150 last:border-b-0 ${
                      theme === 'dark'
                        ? `border-b border-[#2a2a2a]/40 hover:bg-[#222222] ${selectedAlgo?.id === algo.id ? 'bg-[#222222] text-[#ffd700]' : 'text-gray-300'}`
                        : `border-b border-[rgba(0,0,0,0.15)]/40 hover:bg-[#c8c8c8] ${selectedAlgo?.id === algo.id ? 'bg-[#c8c8c8] text-[#1a1a1a] font-bold' : 'text-[#1a1a1a]'}`
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{algo.name}</span>
                    <span
                      style={{ color: algo.badgeColor, backgroundColor: algo.badgeBg, borderColor: `${algo.badgeColor}26` }}
                      className="text-[7px] font-mono font-bold tracking-widest px-1 py-0.5 rounded border uppercase"
                    >
                      {algo.tag}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RUN / STOP buttons */}
        <div className="flex items-center gap-2">
          <button
            disabled={isRunDisabled}
            onClick={handleRun}
            className={`px-6 h-10 rounded border font-bold text-[11px] tracking-widest transition-all duration-200 ${
              isRunDisabled
                ? (theme === 'dark'
                    ? 'opacity-30 bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 cursor-not-allowed'
                    : 'opacity-30 bg-[#d0d0d0] border-[rgba(0,0,0,0.15)] text-gray-500 cursor-not-allowed')
                : 'opacity-100 border-[#f5c518] text-[#f5c518] hover:bg-[#f5c518] hover:text-[#1a1a1a] active:scale-95 cursor-pointer'
            }`}
          >
            {isFetching ? (
              <svg className="animate-spin w-4.5 h-4.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : 'RUN'}
          </button>

          <AnimatePresence>
            {isAnimating && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleStop}
                className={`px-4 h-10 rounded border border-[#ff1744]/60 text-[#ff1744] text-[11px] font-bold tracking-widest uppercase hover:bg-[#ff1744]/10 active:scale-95 transition-all duration-150 ${
                  theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#d0d0d0]'
                }`}
              >
                STOP
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Description & Errors */}
      <div className="w-full max-w-[600px] min-h-[40px] flex flex-col gap-2 items-center">
        {/* Selected Algorithm Description */}
        <AnimatePresence mode="wait">
          {selectedAlgo && !isAnimating && (
            <motion.div
              key={selectedAlgo.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[10px] text-gray-500 text-center tracking-wider max-w-md uppercase"
            >
              {selectedAlgo.description}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner area */}
        <AnimatePresence>
          {noPathFound && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-[11px] font-bold tracking-widest uppercase text-[#ff1744]"
            >
              NO PATH FOUND
            </motion.div>
          )}
          {invalidPlacement && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-[11px] font-bold tracking-widest uppercase text-[#ff1744]"
            >
              INVALID START OR END POINT
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats Panel (appears below controls Row, fades in post-animation) */}
      <div className="w-full max-w-[600px] min-h-[80px]">
        <AnimatePresence>
          {showStats && solveResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-4 gap-4 w-full"
            >
              {/* ALGORITHM card */}
              <div className={`flex flex-col items-center justify-center p-3 rounded transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border border-[#2a2a2a]'
                  : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)]'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-bold uppercase ${theme === 'dark' ? 'text-white' : 'text-[#1a1a1a]'}`}>{selectedAlgo?.name}</span>
                  <span
                    style={{ color: selectedAlgo?.badgeColor, backgroundColor: selectedAlgo?.badgeBg, borderColor: `${selectedAlgo?.badgeColor}26` }}
                    className="text-[6px] font-mono tracking-widest px-0.5 py-0.2 rounded border uppercase font-bold"
                  >
                    {selectedAlgo?.tag}
                  </span>
                </div>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider">
                  ALGORITHM
                </span>
              </div>

              {/* NODES VISITED card */}
              <div className={`flex flex-col items-center justify-center p-3 rounded transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border border-[#2a2a2a]'
                  : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)]'
              }`}>
                <span className="text-lg font-bold text-[#f5c518] leading-none mb-1">
                  {solveResult.nodesVisited}
                </span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider">
                  NODES VISITED
                </span>
              </div>
 
              {/* PATH LENGTH card */}
              <div className={`flex flex-col items-center justify-center p-3 rounded transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border border-[#2a2a2a]'
                  : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)]'
              }`}>
                <span className="text-lg font-bold text-[#f5c518] leading-none mb-1">
                  {solveResult.pathLength}
                </span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider">
                  PATH LENGTH
                </span>
              </div>
 
              {/* TIME TAKEN card */}
              <div className={`flex flex-col items-center justify-center p-3 rounded transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border border-[#2a2a2a]'
                  : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)]'
              }`}>
                <span className="text-lg font-bold text-[#f5c518] leading-none mb-1">
                  {solveResult.timeTaken.toFixed(2)}ms
                </span>
                <span className="text-[8px] text-gray-500 uppercase tracking-wider">
                  TIME TAKEN
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
