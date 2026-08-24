import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoaderOne from '../components/LoaderOne';
import { generateMaze, generateCorridorMaze, generateClusteredTerrain, generateRiverTerrain, generateGlacierTerrain } from '../algorithms/maze';
import { solveBFS } from '../algorithms/bfs';
import { solveDFS } from '../algorithms/dfs';
import { solveAStar } from '../algorithms/astar';
import { solveJPS } from '../algorithms/jps';
import { solveThetaStar } from '../algorithms/theta';
import { solveBidirectionalBFS } from '../algorithms/bidirectional-bfs';
import { solveGreedy } from '../algorithms/greedy';
import { BIOME_LIST, BIOME_MAP, type BiomeId } from '../algorithms/biomes';

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

const ALGO_SOLVERS: Record<
  string,
  (req: { grid: number[][]; start: SolvePoint; end: SolvePoint; allowDiagonal?: boolean; stepCost?: number }) => SolveResult
> = {
  bfs: solveBFS,
  dfs: solveDFS,
  astar: solveAStar,
  jps: solveJPS,
  theta: solveThetaStar,
  'bidirectional-bfs': solveBidirectionalBFS,
  greedy: solveGreedy,
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
    id: 'theta', name: 'THETA*', tag: 'OPTIMIZED',
    badgeColor: '#1a7fd4', badgeBg: 'rgba(26,127,212,0.08)',
    description: 'ANY-ANGLE VERSION OF A*. USES LINE-OF-SIGHT CHECKS TO SHORTCUT PATHS FOR SMOOTHER, MORE DIRECT ROUTES. REQUIRES 8-DIRECTIONAL MOVEMENT.'
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
  theta: 'O(E log V)',
  'bidirectional-bfs': 'O(b^(d/2))',
  greedy: 'O(E log V)',
};

/**
 * Picks the correct grid generator based on mode and active biome:
 * - Corridor/Maze mode always uses generateCorridorMaze, regardless of
 *   biome — it already has real connected-corridor structure.
 * - Random mode with Classic biome uses the original generateMaze
 *   (unchanged default behavior).
 * - Random mode with any other biome uses the clustered terrain
 *   generator, tuned per biome via terrainDensity/terrainIterations.
 */
const generateGridForMode = (
  mode: 'random' | 'corridor',
  gridSize: number,
  biome: BiomeId
): number[][] => {
  if (mode === 'corridor') return generateCorridorMaze(gridSize);
  if (biome === 'classic') return generateMaze(gridSize);

  const config = BIOME_MAP[biome];
  switch (config.terrainType) {
    case 'noise':
      return generateClusteredTerrain(gridSize, config.density ?? 0.1, 0);
    case 'clustered':
      return generateClusteredTerrain(gridSize, config.density ?? 0.3, config.iterations ?? 3);
    case 'river':
      return generateRiverTerrain(gridSize, config.riverCount ?? 3, config.riverWidth ?? 3);
    case 'glacier':
      return generateGlacierTerrain(gridSize, config.blobCount ?? 8, config.blobMinSize ?? 60, config.blobMaxSize ?? 180);
    default:
      return generateClusteredTerrain(gridSize, 0.3, 3);
  }
};

const GRID_PX = 480;

export const GridCanvas: React.FC<GridCanvasProps> = ({ size = 50, theme = 'dark' }) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const dropdownRef   = useRef<HTMLDivElement>(null);
  const biomeDropdownRef = useRef<HTMLDivElement>(null);
  const animStopRef   = useRef(false);
  const sizeRef       = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);

interface ModeSnapshot {
  grid: number[][];
  startPoint: Point | null;
  endPoint: Point | null;
  solveResult: SolveResult | null;
  showStats: boolean;
  statsPanelOpen: boolean;
  noPathFound: boolean;
  invalidPlacement: boolean;
}

  // Grid state
  const [grid, setGrid]           = useState<number[][]>([]);
  const [mazeMode, setMazeMode] = useState<'random' | 'corridor'>('random');
  const [allowDiagonal, setAllowDiagonal] = useState(false);
  const [activeBiome, setActiveBiome] = useState<BiomeId>('classic');
  const [isBiomeDropdownOpen, setIsBiomeDropdownOpen] = useState(false);
  const [inactiveSnapshot, setInactiveSnapshot] = useState<ModeSnapshot | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: GRID_PX, height: GRID_PX });

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

  // Theta* requires 8-directional movement; JPS only supports 4-directional
  // movement — auto-adjust diagonal mode whenever the selected algorithm
  // changes to either of these.
  useEffect(() => {
    if (selectedAlgo?.id === 'theta') {
      setAllowDiagonal(true);
    } else if (selectedAlgo?.id === 'jps') {
      setAllowDiagonal(false);
    }
  }, [selectedAlgo]);

  // Fetch grid
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setStartPoint(null);
    setEndPoint(null);
    setRotation(0);
    setSolveResult(null);
    setShowStats(false);
    setStatsPanelOpen(false);
    setNoPathFound(false);
    setInvalidPlacement(false);

    try {
      const newGrid = generateGridForMode(mazeMode, size, activeBiome);
      if (active) {
        setGrid(newGrid);
        setLoading(false);
      }
    } catch (err: any) {
      if (active) {
        setError(err?.message || 'Maze generation error');
        setLoading(false);
      }
    }

    return () => { active = false; };
  }, [size]);

  const switchMazeMode = (targetMode: 'random' | 'corridor') => {
    if (targetMode === mazeMode || isAnimating) return;

    const currentSnapshot: ModeSnapshot = {
      grid, startPoint, endPoint, solveResult,
      showStats, statsPanelOpen, noPathFound, invalidPlacement,
    };

    if (inactiveSnapshot) {
      setGrid(inactiveSnapshot.grid);
      setStartPoint(inactiveSnapshot.startPoint);
      setEndPoint(inactiveSnapshot.endPoint);
      setSolveResult(inactiveSnapshot.solveResult);
      setShowStats(inactiveSnapshot.showStats);
      setStatsPanelOpen(inactiveSnapshot.statsPanelOpen);
      setNoPathFound(inactiveSnapshot.noPathFound);
      setInvalidPlacement(inactiveSnapshot.invalidPlacement);
      setInactiveSnapshot(currentSnapshot);
      setMazeMode(targetMode);
    } else {
      setInactiveSnapshot(currentSnapshot);
      setMazeMode(targetMode);
      setLoading(true);
      setError(null);
      setStartPoint(null);
      setEndPoint(null);
      setRotation(0);
      setSolveResult(null);
      setShowStats(false);
      setStatsPanelOpen(false);
      setNoPathFound(false);
      setInvalidPlacement(false);
      try {
        const newGrid = generateGridForMode(targetMode, size, activeBiome);
        setGrid(newGrid);
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Maze generation error');
        setLoading(false);
      }
    }
  };

  const handleReroll = () => {
    if (isAnimating) return;
    setLoading(true);
    setError(null);
    setStartPoint(null);
    setEndPoint(null);
    setRotation(prev => prev + 360);
    setSolveResult(null);
    setShowStats(false);
    setStatsPanelOpen(false);
    setNoPathFound(false);
    setInvalidPlacement(false);
    try {
      const newGrid = generateGridForMode(mazeMode, size, activeBiome);
      setGrid(newGrid);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Maze generation error');
      setLoading(false);
    }
  };

  // Switching biomes doesn't touch grid/walls/start/end — only recolors the
  // grid and changes movement cost. Any completed run's results are cleared
  // since they were computed under the previous biome's cost model, in both
  // the live state and the inactive mode's stored snapshot (so a later mode
  // switch doesn't restore a stale, biome-mismatched run).
  const handleBiomeChange = (biome: BiomeId) => {
    if (biome === activeBiome || isAnimating) return;
    setActiveBiome(biome);
    setSolveResult(null);
    setShowStats(false);
    setStatsPanelOpen(false);
    setNoPathFound(false);
    setInvalidPlacement(false);
    setInactiveSnapshot((prev) =>
      prev
        ? {
            ...prev,
            solveResult: null,
            showStats: false,
            statsPanelOpen: false,
            noPathFound: false,
            invalidPlacement: false,
          }
        : prev
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Close biome dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (biomeDropdownRef.current && !biomeDropdownRef.current.contains(e.target as Node))
        setIsBiomeDropdownOpen(false);
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
    ctx.strokeStyle = themeRef.current === 'dark' ? '#1a1a1a' : 'rgba(0,0,0,0.08)';
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

  // Run solver
  const handleRun = async () => {
    if (isRunDisabled || !selectedAlgo || !startPoint || !endPoint) return;
    const solver = ALGO_SOLVERS[selectedAlgo.id];
    if (!solver) return;

    setIsFetching(true);
    setNoPathFound(false);
    setInvalidPlacement(false);
    setShowStats(false);
    setStatsPanelOpen(false);

    try {
      const data: SolveResult = solver({
        grid,
        start: { row: startPoint.r, col: startPoint.c },
        end:   { row: endPoint.r,   col: endPoint.c   },
        allowDiagonal,
        stepCost: BIOME_MAP[activeBiome].cost,
      });

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

    ctx.fillStyle = theme === 'dark' ? '#0d0d0d' : '#ffffff';
    ctx.fillRect(0, 0, S, S);

    if (error) {
      ctx.fillStyle = '#ff1744';
      ctx.font = '14px "DM Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BACKEND ERROR', S / 2, S / 2 - 10);
      ctx.fillStyle = '#888888';
      ctx.font = '10px "DM Sans",sans-serif';
      ctx.fillText(error.substring(0, 45), S / 2, S / 2 + 15);
      return;
    }

    const biomeConfig = BIOME_MAP[activeBiome];
    const wallColor = theme === 'dark' ? biomeConfig.wallDark : biomeConfig.wallLight;
    const openColor = theme === 'dark' ? biomeConfig.openDark : biomeConfig.openLight;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isWall = !loading && grid.length > 0 && grid[r]?.[c] === 1;
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

    ctx.strokeStyle = theme === 'dark' ? '#1a1a1a' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= size; i++) {
      const pos = (i * S) / size;
      ctx.moveTo(pos, 0); ctx.lineTo(pos, S);
      ctx.moveTo(0, pos); ctx.lineTo(S, pos);
    }
    ctx.stroke();

    if (loading) {
      ctx.fillStyle = theme === 'dark' ? 'rgba(13,13,13,0.6)' : 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = theme === 'dark' ? '#ffd700' : '#b45309';
      ctx.font = '14px "DM Sans",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GENERATING GRID...', S / 2, S / 2);
    }
  };

  const redrawCurrentState = () => {
    if (isAnimatingRef.current) return;
    drawBaseGrid();
    if (solveResult) {
      for (const pt of solveResult.visitedNodes) {
        const isStart = pt.row === startPoint?.r && pt.col === startPoint?.c;
        const isEnd   = pt.row === endPoint?.r   && pt.col === endPoint?.c;
        if (!isStart && !isEnd) {
          paintCell(pt.row, pt.col, '#1a7fd4');
        }
      }
      for (const pt of solveResult.path) {
        const isStart = pt.row === startPoint?.r && pt.col === startPoint?.c;
        const isEnd   = pt.row === endPoint?.r   && pt.col === endPoint?.c;
        if (!isStart && !isEnd) {
          paintCell(pt.row, pt.col, '#f5c518');
        }
      }
      if (startPoint) paintCell(startPoint.r, startPoint.c, '#00e676');
      if (endPoint) paintCell(endPoint.r, endPoint.c, '#ff1744');
    }
  };

  useEffect(() => {
    if (isAnimating) return;
    if (solveResult) {
      redrawCurrentState();
    } else {
      drawBaseGrid();
    }
  }, [grid, dimensions, size, loading, error, startPoint, endPoint, isAnimating, solveResult, theme, activeBiome]);

  // ─── Styling tokens ───────────────────────────────────────────────────────
  const borderColor  = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)';
  const panelBg      = isDark ? '#111111' : '#e0e0e0';
  const valueBoxBg   = isDark ? '#1a1a1a' : '#d8d8d8';

  const CONTENT_W   = 420;
  const CTRL_H      = 48;
  const SECTION_GAP = 20;

  return (
    <div
      className="flex flex-row select-none"
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

      {/* ── Left column — 55%, grid+controls centered flush-right with padding ── */}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: `${GRID_PX}px`,
            flexShrink: 0,
          }}
        >
          {/* Grid container — UNCHANGED internals */}
          <div
            ref={containerRef}
            style={{
              width: `${GRID_PX}px`,
              height: `${GRID_PX}px`,
              boxSizing: 'content-box',
              flexShrink: 0,
              backgroundColor: isDark ? '#0d0d0d' : '#ffffff',
              border: `2px solid ${borderColor}`,
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

          {/* Bottom control row: mini mode toggle | terrain placeholder | reroll */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', width: '100%' }}>

            {/* Compact mode toggle — single button, cycles random/corridor, shows current mode */}
            <button
              onClick={() => switchMazeMode(mazeMode === 'random' ? 'corridor' : 'random')}
              disabled={isAnimating}
              title="Toggle grid generation mode"
              aria-label="Toggle grid generation mode"
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: panelBg,
                border: `2px solid ${borderColor}`,
                color: isDark ? '#ffffff' : '#000000',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                opacity: isAnimating ? 0.3 : 1,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {mazeMode === 'random' ? 'RANDOM' : 'MAZE'}
            </button>

            {/* Diagonal movement toggle — locked ON while Theta* is selected, locked OFF while JPS is selected */}
            <button
              onClick={() => setAllowDiagonal((prev) => !prev)}
              disabled={isAnimating || selectedAlgo?.id === 'theta' || selectedAlgo?.id === 'jps'}
              title={
                selectedAlgo?.id === 'theta'
                  ? 'Theta* requires 8-directional movement'
                  : selectedAlgo?.id === 'jps'
                  ? 'JPS only supports 4-directional movement'
                  : 'Toggle 4-directional / 8-directional movement'
              }
              aria-label="Toggle diagonal movement"
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                backgroundColor: panelBg,
                border: `2px solid ${borderColor}`,
                color: isDark ? '#ffffff' : '#000000',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                cursor: (isAnimating || selectedAlgo?.id === 'theta' || selectedAlgo?.id === 'jps') ? 'not-allowed' : 'pointer',
                opacity: (isAnimating || selectedAlgo?.id === 'theta' || selectedAlgo?.id === 'jps') ? 0.3 : 1,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {allowDiagonal ? '8-DIR' : '4-DIR'}
            </button>

            {/* Biome dropdown — selects grid terrain theme and movement cost */}
            <div ref={biomeDropdownRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <button
                onClick={() => setIsBiomeDropdownOpen((prev) => !prev)}
                disabled={isAnimating}
                title="Select terrain biome"
                aria-label="Select terrain biome"
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: panelBg,
                  border: `2px solid ${borderColor}`,
                  color: isDark ? '#ffffff' : '#000000',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  opacity: isAnimating ? 0.3 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{BIOME_MAP[activeBiome].label}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDark ? '#ffffff' : '#000000'}
                  strokeWidth="2"
                  style={{
                    flexShrink: 0,
                    marginLeft: '6px',
                    transform: isBiomeDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Biome list — opens upward since this row sits near the bottom of the grid */}
              <AnimatePresence>
                {isBiomeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className={isDark ? 'custom-scroll' : 'custom-scroll-light'}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      marginBottom: '8px',
                      left: 0,
                      width: '180px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      borderRadius: '10px',
                      backgroundColor: panelBg,
                      border: `2px solid ${borderColor}`,
                      boxShadow: isDark ? '0 -10px 30px rgba(0,0,0,0.6)' : '0 -10px 30px rgba(0,0,0,0.1)',
                      zIndex: 100,
                    }}
                  >
                    {BIOME_LIST.map((biome, idx) => (
                      <button
                        key={biome.id}
                        onClick={() => {
                          handleBiomeChange(biome.id);
                          setIsBiomeDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: panelBg,
                          border: 'none',
                          borderBottom:
                            idx < BIOME_LIST.length - 1
                              ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
                              : 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '12px',
                          color:
                            activeBiome === biome.id
                              ? isDark ? '#ffffff' : '#000000'
                              : isDark ? '#cccccc' : '#000000',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#1a1a1a' : '#d5d5d5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = panelBg;
                        }}
                      >
                        <span>{biome.label}</span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            color: isDark ? '#888888' : '#555555',
                          }}
                        >
                          ×{biome.cost}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reroll button — regenerates only the active mode's grid */}
            <button
              onClick={handleReroll}
              disabled={isAnimating}
              title="Reroll Grid"
              aria-label="Reroll Grid"
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                borderRadius: '8px',
                backgroundColor: panelBg,
                border: `2px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                opacity: isAnimating ? 0.3 : 1,
                flexShrink: 0,
                padding: 0,
              }}
            >
              <motion.svg
                animate={{ rotate: rotation }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDark ? '#ffffff' : '#000000'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </motion.svg>
            </button>
          </div>
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
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', width: '100%' }}>

            {/* Reset button */}
            <button
              onClick={handleReset}
              title="Reset Grid"
              aria-label="Reset Grid"
              style={{
                width: `${CTRL_H}px`,
                height: `${CTRL_H}px`,
                minWidth: `${CTRL_H}px`,
                minHeight: `${CTRL_H}px`,
                borderRadius: '10px',
                backgroundColor: panelBg,
                border: `2px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#1a1a1a' : '#d5d5d5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = panelBg;
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
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </motion.svg>
            </button>

            {/* Algorithm dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                disabled={isAnimating}
                style={{
                  width: '100%',
                  height: `${CTRL_H}px`,
                  borderRadius: '10px',
                  backgroundColor: panelBg,
                  border: `2px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  opacity: isAnimating ? 0.3 : 1,
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  color: selectedAlgo ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#888888' : '#000000'),
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
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Dropdown menu — opens downward */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className={isDark ? 'custom-scroll' : 'custom-scroll-light'}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      marginTop: '8px',
                      left: 0,
                      width: '100%',
                      maxHeight: '168px',
                      overflowY: 'auto',
                      borderRadius: '10px',
                      backgroundColor: panelBg,
                      border: `2px solid ${borderColor}`,
                      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.1)',
                      zIndex: 100,
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
                              : isDark ? '#cccccc' : '#000000',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#1a1a1a' : '#d5d5d5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = panelBg;
                        }}
                      >
                        <span>{algo.name}</span>
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
                width: '100px',
                borderRadius: '10px',
                backgroundColor: panelBg,
                border: isRunDisabled
                  ? `2px solid ${borderColor}`
                  : '2px solid rgba(0,230,118,0.5)',
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
                <span style={{ fontSize: '12px', color: isDark ? '#888888' : '#000000', flexShrink: 0 }}>S</span>
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
                <span style={{ fontSize: '12px', color: isDark ? '#888888' : '#000000', flexShrink: 0 }}>F</span>
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
                    border: `2px solid ${borderColor}`,
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
                        border: `2px solid ${borderColor}`,
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
                              color: isDark ? '#888888' : '#000000',
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
                                    ? `1px solid ${borderColor}`
                                    : 'none',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '15px',
                                  color: isDark ? '#888888' : '#000000',
                                  fontFamily: 'inherit',
                                }}
                              >
                                {row.label}
                              </span>
                              <span
                                style={{
                                  fontSize: '16px',
                                  color: isDark ? '#ffffff' : '#000000',
                                  fontFamily: 'inherit',
                                  padding: '4px 14px',
                                  borderRadius: '6px',
                                  border: `1px solid ${borderColor}`,
                                  backgroundColor: valueBoxBg,
                                  minWidth: '48px',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
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
