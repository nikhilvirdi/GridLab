import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eraser } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { generateGraph } from '../algorithms/graph/generator';
import { solveDijkstra } from '../algorithms/graph/dijkstra';
import { solveBellmanFord } from '../algorithms/graph/bellman-ford';
import type { GraphData, GraphGenerationConfig, GraphSolveResult } from '../algorithms/graph/types';

const GRID_PX = 480;
const CONTENT_W = 420;
const CTRL_H = 48;
const SECTION_GAP = 20;

const SPEED_DELAY = [160, 90, 45, 20, 8];

export interface GraphCanvasProps {
  theme?: 'dark' | 'light';
  generationMode?: 'random' | 'corridor' | 'graph';
  onGenerationModeChange?: (mode: 'random' | 'corridor' | 'graph') => void;
  config?: Partial<GraphGenerationConfig>;
}

export interface GraphAlgorithmOption {
  id: 'dijkstra' | 'bellman-ford';
  name: string;
  tag: 'CORE' | 'ADVANCED';
  badgeColor: string;
  badgeBg: string;
  description: string;
  complexity: string;
}

const GRAPH_ALGORITHMS: GraphAlgorithmOption[] = [
  {
    id: 'dijkstra',
    name: 'DIJKSTRA',
    tag: 'CORE',
    badgeColor: '#f5c518',
    badgeBg: 'rgba(245,197,24,0.08)',
    description: 'FINDS SHORTEST PATHS FROM A SOURCE NODE IN WEIGHTED GRAPHS WITH NON-NEGATIVE WEIGHTS. EVALUATES ACCUMULATED PATH COST G(N) VIA A MIN-HEAP.',
    complexity: 'O((V + E) log V)',
  },
  {
    id: 'bellman-ford',
    name: 'BELLMAN-FORD',
    tag: 'ADVANCED',
    badgeColor: '#00e676',
    badgeBg: 'rgba(0,230,118,0.08)',
    description: 'COMPUTES SHORTEST PATHS WHILE CORRECTLY HANDLING NEGATIVE EDGE WEIGHTS VIA V - 1 RELAXATION PASSES. DETECTS NEGATIVE-WEIGHT CYCLES.',
    complexity: 'O(V * E)',
  },
];

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  theme = 'dark',
  onGenerationModeChange,
  config: customConfig,
}) => {
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : GRID_PX
  );

  useEffect(() => {
    if (!isMobile) return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const mobileGridPx = Math.min(viewportWidth - 40, 480);
  const gridPx = isMobile ? mobileGridPx : GRID_PX;

  // Rotation for Reroll and Reset icon animations
  const [rotation, setRotation] = useState(0);
  const [rerollKey, setRerollKey] = useState(0);

  // Algorithm selection
  const [selectedAlgo, setSelectedAlgo] = useState<GraphAlgorithmOption | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Source and target node selection
  const [source, setSource] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);

  // Execution & animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [solveResult, setSolveResult] = useState<GraphSolveResult | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);

  // Animated visual sets for nodes and paths
  const [animatedVisitedSet, setAnimatedVisitedSet] = useState<Set<number>>(new Set());
  const [animatedPathNodes, setAnimatedPathNodes] = useState<number[]>([]);

  const animStopRef = useRef(false);
  const speedRef = useRef(speed);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-drive generator config based on selected graph algorithm:
  // - Dijkstra: undirected, weighted, no negative weights
  // - Bellman-Ford: directed, weighted, allow negative weights
  const activeConfig: GraphGenerationConfig = useMemo(() => {
    if (selectedAlgo?.id === 'bellman-ford') {
      return { directed: true, weighted: true, allowNegativeWeights: true, ...customConfig };
    }
    return { directed: false, weighted: true, allowNegativeWeights: false, ...customConfig };
  }, [selectedAlgo, customConfig]);

  // Regenerate graph when config changes or rerollKey increments
  const graph: GraphData = useMemo(
    () => generateGraph(activeConfig, gridPx, gridPx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeConfig, gridPx, rerollKey]
  );

  // Id-safe lookup map: node.id -> GraphNode.
  // edge.from / edge.to are node ids, not array positions, so we must not
  // index graph.nodes directly — use this map everywhere instead.
  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes]
  );

  // Reset graph solver state
  const clearRunState = () => {
    animStopRef.current = true;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsAnimating(false);
    setAnimatedVisitedSet(new Set());
    setAnimatedPathNodes([]);
    setSolveResult(null);
    setShowStats(false);
    setStatsPanelOpen(false);
  };

  // Algorithm selection handler — switching algorithm regenerates graph with its specific config
  const handleSelectAlgo = (algo: GraphAlgorithmOption) => {
    const prevId = selectedAlgo?.id;
    setSelectedAlgo(algo);
    setIsDropdownOpen(false);

    if (prevId !== algo.id) {
      clearRunState();
      setSource(null);
      setTarget(null);
      setRotation((prev) => prev + 360);
      setRerollKey((prev) => prev + 1);
    }
  };

  // Click on a graph node to set source then target
  const handleNodeClick = (nodeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnimating) return;

    if (source === null) {
      setSource(nodeId);
      clearRunState();
    } else if (target === null) {
      if (nodeId === source) return;
      setTarget(nodeId);
      clearRunState();
    }
  };

  // Animation runner
  const runAnimation = (data: GraphSolveResult, targetId?: number) => {
    animStopRef.current = false;
    setIsAnimating(true);
    setShowStats(false);
    setStatsPanelOpen(false);
    setAnimatedVisitedSet(new Set());
    setAnimatedPathNodes([]);

    const visited = data.visitedOrder;
    const currentVisited = new Set<number>();

    const animateVisited = (idx: number) => {
      if (animStopRef.current) {
        setIsAnimating(false);
        return;
      }

      if (idx >= visited.length) {
        if (data.path.length === 0 || targetId === undefined) {
          setIsAnimating(false);
          setShowStats(true);
          return;
        }
        animatePath(0);
        return;
      }

      currentVisited.add(visited[idx]);
      setAnimatedVisitedSet(new Set(currentVisited));

      const delay = SPEED_DELAY[speedRef.current];
      timeoutRef.current = window.setTimeout(() => animateVisited(idx + 1), delay);
    };

    const path = data.path;
    const currentPath: number[] = [];

    const animatePath = (idx: number) => {
      if (animStopRef.current) {
        setIsAnimating(false);
        return;
      }

      if (idx >= path.length) {
        setIsAnimating(false);
        setShowStats(true);
        return;
      }

      currentPath.push(path[idx]);
      setAnimatedPathNodes([...currentPath]);

      const delay = SPEED_DELAY[speedRef.current];
      timeoutRef.current = window.setTimeout(() => animatePath(idx + 1), delay);
    };

    timeoutRef.current = window.setTimeout(() => animateVisited(0), 40);
  };

  // Run solver
  const handleRun = () => {
    if (source === null || !selectedAlgo || isAnimating) return;

    const solver = selectedAlgo.id === 'dijkstra' ? solveDijkstra : solveBellmanFord;
    const result = solver({
      graph,
      source,
      target: target ?? undefined,
    });

    setSolveResult(result);
    runAnimation(result, target ?? undefined);
  };

  // Stop button during animation
  const handleStop = () => {
    animStopRef.current = true;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsAnimating(false);
  };

  // Reset button: clears run and selections without regenerating graph
  const handleReset = () => {
    clearRunState();
    setSource(null);
    setTarget(null);
    setRotation((prev) => prev + 360);
  };

  // Reroll button: regenerates a fresh graph with current algorithm config
  const handleReroll = () => {
    if (isAnimating) return;
    clearRunState();
    setSource(null);
    setTarget(null);
    setRotation((prev) => prev + 360);
    setRerollKey((prev) => prev + 1);
  };

  const handleToggleMode = () => {
    // Cycles: graph -> random
    if (onGenerationModeChange) {
      onGenerationModeChange('random');
    }
  };

  const borderColor = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)';
  const panelBg = isDark ? '#111111' : '#e0e0e0';
  const valueBoxBg = isDark ? '#1a1a1a' : '#d8d8d8';
  const canvasBg = isDark ? '#0d0d0d' : '#ffffff';
  const gridLineColor = isDark ? '#1a1a1a' : 'rgba(0,0,0,0.08)';

  const nodeRadius = 16;
  const isRunDisabled = source === null || !selectedAlgo || isAnimating;

  // Check if an edge is part of the highlighted shortest path
  const isEdgeOnPath = (u: number, v: number, directed?: boolean): boolean => {
    if (animatedPathNodes.length < 2) return false;
    for (let i = 0; i < animatedPathNodes.length - 1; i++) {
      const p1 = animatedPathNodes[i];
      const p2 = animatedPathNodes[i + 1];
      if (u === p1 && v === p2) return true;
      if (!directed && u === p2 && v === p1) return true;
    }
    return false;
  };

  return (
    <div
      className="flex select-none"
      style={{
        width: '100%',
        height: isMobile ? 'auto' : '100%',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'center' : undefined,
      }}
    >
      {/* ── Left column — 55%, graph + controls centered flush-right with padding ── */}
      <div
        style={{
          width: isMobile ? '100%' : '55%',
          height: isMobile ? 'auto' : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'flex-end',
          paddingRight: isMobile ? 0 : '52px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: `${gridPx}px`,
            flexShrink: 0,
          }}
        >
          {/* Graph SVG canvas container */}
          <div
            style={{
              width: `${gridPx}px`,
              height: `${gridPx}px`,
              boxSizing: 'content-box',
              flexShrink: 0,
              backgroundColor: canvasBg,
              border: `2px solid ${borderColor}`,
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative',
              padding: 0,
              margin: 0,
            }}
          >
            <svg
              width={gridPx}
              height={gridPx}
              viewBox={`0 0 ${gridPx} ${gridPx}`}
              style={{ display: 'block', width: '100%', height: '100%' }}
            >
              <defs>
                {/* Background grid texture matching GridCanvas subtle lines */}
                <pattern
                  id="graph-canvas-grid"
                  width="32"
                  height="32"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 32 0 L 0 0 0 32"
                    fill="none"
                    stroke={gridLineColor}
                    strokeWidth="1"
                  />
                </pattern>

                {/* Arrowhead marker for directed edges */}
                <marker
                  id="graph-arrowhead"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 1.5 L 8 5 L 0 8.5 z"
                    fill={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'}
                  />
                </marker>

                {/* Arrowhead marker for highlighted path edges */}
                <marker
                  id="graph-arrowhead-path"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path
                    d="M 0 1.5 L 8 5 L 0 8.5 z"
                    fill="#f5c518"
                  />
                </marker>
              </defs>

              {/* Grid background */}
              <rect width="100%" height="100%" fill="url(#graph-canvas-grid)" />

              {/* Graph Edges */}
              {graph.edges.map((edge, idx) => {
                const u = nodeMap.get(edge.from);
                const v = nodeMap.get(edge.to);
                if (!u || !v) return null;

                const onPath = isEdgeOnPath(edge.from, edge.to, edge.directed);

                const dx = v.x - u.x;
                const dy = v.y - u.y;
                const dist = Math.hypot(dx, dy) || 1;
                const ux = dx / dist;
                const uy = dy / dist;

                // Stop line at node boundaries
                const x1 = u.x + ux * nodeRadius;
                const y1 = u.y + uy * nodeRadius;
                const x2 = edge.directed ? v.x - ux * (nodeRadius + 6) : v.x - ux * nodeRadius;
                const y2 = edge.directed ? v.y - uy * (nodeRadius + 6) : v.y - uy * nodeRadius;

                const mx = (u.x + v.x) / 2;
                const my = (u.y + v.y) / 2;
                const weightStr = edge.weight !== undefined ? String(edge.weight) : '';
                const kw = Math.max(14, weightStr.length * 8 + 6);
                const kh = 14;

                return (
                  <g key={`edge-${edge.from}-${edge.to}-${idx}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={onPath ? '#f5c518' : borderColor}
                      strokeWidth={onPath ? '3.5' : '2'}
                      strokeLinecap="round"
                      markerEnd={
                        edge.directed
                          ? onPath
                            ? 'url(#graph-arrowhead-path)'
                            : 'url(#graph-arrowhead)'
                          : undefined
                      }
                      style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                    />

                    {/* Weight label knockout rectangle and text */}
                    {edge.weight !== undefined && (
                      <g transform={`translate(${mx}, ${my})`}>
                        <rect
                          x={-kw / 2}
                          y={-kh / 2}
                          width={kw}
                          height={kh}
                          fill={canvasBg}
                          stroke="none"
                        />
                        <text
                          x="0"
                          y="0"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="11"
                          fontWeight="700"
                          fill={onPath ? '#f5c518' : (isDark ? '#f5c518' : '#b45309')}
                          fontFamily="inherit"
                        >
                          {edge.weight}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Graph Nodes */}
              {graph.nodes.map((node) => {
                const isSource = source === node.id;
                const isTarget = target === node.id;
                const isPath = animatedPathNodes.includes(node.id) && !isSource && !isTarget;
                const isVisited = animatedVisitedSet.has(node.id) && !isSource && !isTarget && !isPath;

                let nodeFill = isDark ? '#111111' : '#ffffff';
                let nodeStroke = '#1a7fd4';
                let textFill = isDark ? '#ffffff' : '#000000';

                if (isSource) {
                  nodeFill = '#00e676';
                  nodeStroke = '#00e676';
                  textFill = '#000000';
                } else if (isTarget) {
                  nodeFill = '#ff1744';
                  nodeStroke = '#ff1744';
                  textFill = '#ffffff';
                } else if (isPath) {
                  nodeFill = '#f5c518';
                  nodeStroke = '#f5c518';
                  textFill = '#000000';
                } else if (isVisited) {
                  nodeFill = isDark ? '#0d3251' : '#d2e8fb';
                  nodeStroke = '#1a7fd4';
                  textFill = isDark ? '#ffffff' : '#000000';
                }

                return (
                  <g
                    key={`node-${node.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => handleNodeClick(node.id, e)}
                    style={{ cursor: isAnimating ? 'default' : 'pointer' }}
                  >
                    <circle
                      r={nodeRadius}
                      fill={nodeFill}
                      stroke={nodeStroke}
                      strokeWidth={isSource || isTarget || isPath ? 3 : 2}
                      style={{ transition: 'fill 0.15s, stroke 0.15s' }}
                    />
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="11"
                      fontWeight="700"
                      fill={textFill}
                      fontFamily="inherit"
                      pointerEvents="none"
                    >
                      {node.label ?? node.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom control row: mode toggle | status badge | reroll */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
            }}
          >
            {/* Mode toggle button — cycles: GRAPH -> RANDOM */}
            <button
              onClick={handleToggleMode}
              title="Toggle generation mode"
              aria-label="Toggle generation mode"
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
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              GRAPH
            </button>

            {/* Planar guarantee indicator badge */}
            <div
              style={{
                flex: 1,
                height: '36px',
                borderRadius: '8px',
                backgroundColor: panelBg,
                border: `2px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0 12px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: isDark ? '#888888' : '#555555',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <span>PLANAR DELAUNAY</span>
              <span
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(0,230,118,0.1)',
                  color: '#00e676',
                  fontWeight: 700,
                }}
              >
                CONNECTED
              </span>
            </div>

            {/* Reroll button — regenerates graph */}
            <button
              onClick={handleReroll}
              disabled={isAnimating}
              title="Reroll Graph"
              aria-label="Reroll Graph"
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

      {/* ── Right column — 45%, interactive algorithm controls & stats ── */}
      <div
        style={{
          width: isMobile ? '100%' : '45%',
          height: isMobile ? 'auto' : '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'flex-start',
          justifyContent: isMobile ? 'flex-start' : 'center',
          paddingLeft: isMobile ? 0 : '12px',
          paddingTop: isMobile ? '24px' : 0,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: isMobile ? `${gridPx}px` : `${CONTENT_W}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: `${SECTION_GAP}px`,
          }}
        >
          {/* Controls row: Reset | Algorithm Dropdown | RUN */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '16px',
              width: '100%',
            }}
          >
            {/* Reset button (Eraser) */}
            <button
              onClick={handleReset}
              title="Reset Run"
              aria-label="Reset Run"
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
              <Eraser size={16} color={isDark ? '#ffffff' : '#000000'} />
            </button>

            {/* Algorithm dropdown for Graph mode: Dijkstra & Bellman-Ford */}
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

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      marginTop: '8px',
                      left: 0,
                      width: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      borderRadius: '10px',
                      backgroundColor: panelBg,
                      border: `2px solid ${borderColor}`,
                      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.1)',
                      zIndex: 100,
                    }}
                  >
                    <div>
                      {GRAPH_ALGORITHMS.map((algo, idx) => (
                        <button
                          key={algo.id}
                          onClick={() => handleSelectAlgo(algo)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: panelBg,
                            border: 'none',
                            borderBottom:
                              idx < GRAPH_ALGORITHMS.length - 1
                                ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
                                : 'none',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            color: selectedAlgo?.id === algo.id
                              ? (isDark ? '#ffffff' : '#000000')
                              : (isDark ? '#cccccc' : '#000000'),
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
                    </div>
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
              RUN
            </button>
          </div>

          {/* Speed slider + STOP button (visible during animation only) */}
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
                  max={4}
                  step={1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
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

          {/* See Stats button + stats panel (post-run only) */}
          <AnimatePresence>
            {showStats && solveResult && (
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
                    width: '100%',
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

                {/* Stats panel dropdown */}
                <AnimatePresence>
                  {statsPanelOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{
                        width: '100%',
                        borderRadius: '12px',
                        border: `2px solid ${borderColor}`,
                        backgroundColor: panelBg,
                        padding: '20px',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
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
                              margin: '0 0 16px 0',
                              lineHeight: 1.5,
                              fontFamily: 'inherit',
                            }}
                          >
                            {selectedAlgo.description}
                          </p>
                        </>
                      )}

                      {/* Negative cycle alert (Bellman-Ford only) */}
                      {solveResult.negativeCycleDetected && (
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255,23,68,0.12)',
                            border: '1px solid rgba(255,23,68,0.4)',
                            marginBottom: '16px',
                          }}
                        >
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 700, color: '#ff1744' }}>
                            NEGATIVE-WEIGHT CYCLE DETECTED
                          </p>
                          <p style={{ margin: 0, fontSize: '11px', color: isDark ? '#ff8a80' : '#c62828', lineHeight: 1.4 }}>
                            Shortest paths are undefined because a negative-weight cycle exists in the graph.
                          </p>
                        </div>
                      )}

                      {/* Stats Metrics Table */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {[
                          { label: 'Nodes Visited', value: String(solveResult.visitedOrder.length) },
                          ...(target !== null && !solveResult.negativeCycleDetected
                            ? [
                                {
                                  label: 'Path Cost',
                                  value:
                                    solveResult.distances[target] === Infinity
                                      ? 'Unreachable'
                                      : String(solveResult.distances[target]),
                                },
                              ]
                            : []),
                          { label: 'Time Taken', value: `${solveResult.timeTaken.toFixed(2)}ms` },
                          { label: 'Complexity', value: selectedAlgo ? selectedAlgo.complexity : '—' },
                        ].map((row, idx, arr) => (
                          <div
                            key={row.label}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              height: '52px',
                              minHeight: '52px',
                              borderBottom:
                                idx < arr.length - 1
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Graph Specification Card */}
          <div
            style={{
              width: '100%',
              borderRadius: '12px',
              border: `2px solid ${borderColor}`,
              backgroundColor: panelBg,
              padding: '20px',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: isDark ? '#ffffff' : '#000000',
                  margin: 0,
                  fontFamily: 'inherit',
                }}
              >
                Planar Delaunay Graph
              </p>
              <span
                style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(26,127,212,0.1)',
                  color: '#1a7fd4',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {activeConfig.directed ? 'DIRECTED' : 'UNDIRECTED'}
              </span>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: isDark ? '#888888' : '#555555',
                margin: '0 0 20px 0',
                lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            >
              Procedurally generated 2D planar graph with zero edge crossings. Click any node to set Start (green), then click a second node to set Target (red).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Vertices (Nodes)', value: String(graph.nodes.length) },
                { label: 'Edges', value: String(graph.edges.length) },
                { label: 'Planar Crossings', value: '0 (None)' },
                {
                  label: 'Edge Weights',
                  value: activeConfig.weighted
                    ? activeConfig.allowNegativeWeights
                      ? '-10 to 20'
                      : '1 to 20'
                    : 'Unweighted',
                },
                { label: 'Start Node', value: source !== null ? `Node ${source}` : 'Not set' },
                { label: 'Target Node', value: target !== null ? `Node ${target}` : 'Optional' },
              ].map((row, idx, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '46px',
                    minHeight: '46px',
                    borderBottom:
                      idx < arr.length - 1
                        ? `1px solid ${borderColor}`
                        : 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      color: isDark ? '#888888' : '#000000',
                      fontFamily: 'inherit',
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: isDark ? '#ffffff' : '#000000',
                      fontFamily: 'inherit',
                      padding: '3px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`,
                      backgroundColor: valueBoxBg,
                      minWidth: '40px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
