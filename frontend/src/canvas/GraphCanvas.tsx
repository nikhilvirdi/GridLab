import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '../hooks/useIsMobile';
import { generateGraph } from '../algorithms/graph/generator';
import type { GraphData, GraphGenerationConfig } from '../algorithms/graph/types';

const GRID_PX = 480;
const CONTENT_W = 420;
const CTRL_H = 48;
const SECTION_GAP = 20;

export interface GraphCanvasProps {
  theme?: 'dark' | 'light';
  generationMode?: 'random' | 'corridor' | 'graph';
  onGenerationModeChange?: (mode: 'random' | 'corridor' | 'graph') => void;
  config?: Partial<GraphGenerationConfig>;
}

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

  const [rotation, setRotation] = useState(0);
  const [rerollKey, setRerollKey] = useState(0);

  // Active generation config (placeholder defaults)
  const config: GraphGenerationConfig = {
    directed: false,
    weighted: true,
    allowNegativeWeights: false,
    ...customConfig,
  };

  const graph: GraphData = React.useMemo(
    () => generateGraph(config, gridPx, gridPx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.nodeCount, config.directed, config.weighted, config.allowNegativeWeights, gridPx, rerollKey]
  );

  const handleReroll = () => {
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
          {/* Graph SVG canvas container — exact same dimensions as GridCanvas */}
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
              </defs>

              {/* Grid background */}
              <rect width="100%" height="100%" fill="url(#graph-canvas-grid)" />

              {/* Graph Edges */}
              {graph.edges.map((edge, idx) => {
                const u = graph.nodes[edge.from];
                const v = graph.nodes[edge.to];
                if (!u || !v) return null;

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
                      stroke={borderColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      markerEnd={edge.directed ? 'url(#graph-arrowhead)' : undefined}
                    />

                    {/* Weight label knockout and text */}
                    {edge.weight !== undefined && (
                      <g transform={`translate(${mx}, ${my})`}>
                        {/* Background-colored knockout rectangle behind the text */}
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
                          fill={isDark ? '#f5c518' : '#b45309'}
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
              {graph.nodes.map((node) => (
                <g key={`node-${node.id}`} transform={`translate(${node.x}, ${node.y})`}>
                  <circle
                    r={nodeRadius}
                    fill={isDark ? '#111111' : '#ffffff'}
                    stroke="#1a7fd4"
                    strokeWidth="2"
                    style={{ transition: 'stroke 0.2s' }}
                  />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="11"
                    fontWeight="700"
                    fill={isDark ? '#ffffff' : '#000000'}
                    fontFamily="inherit"
                  >
                    {node.label ?? node.id}
                  </text>
                </g>
              ))}
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
                cursor: 'pointer',
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

      {/* ── Right column — 45%, layout identical to GridCanvas ── */}
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
          {/* Top placeholder controls header */}
          <div
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
              fontSize: '14px',
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <span>GRAPH ALGORITHMS</span>
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
              PREVIEW
            </span>
          </div>

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
            <p
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: isDark ? '#ffffff' : '#000000',
                margin: '0 0 6px 0',
                fontFamily: 'inherit',
              }}
            >
              Planar Delaunay Graph
            </p>
            <p
              style={{
                fontSize: '13px',
                color: isDark ? '#888888' : '#555555',
                margin: '0 0 20px 0',
                lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            >
              Procedurally generated 2D planar graph with zero edge crossings.
              Graph algorithms (Dijkstra, Bellman-Ford, Prim's, Kruskal's,
              Topological Sort, etc.) will integrate here.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Vertices (Nodes)', value: String(graph.nodes.length) },
                { label: 'Edges', value: String(graph.edges.length) },
                { label: 'Planar Crossings', value: '0 (None)' },
                {
                  label: 'Edge Weights',
                  value: config.weighted ? (config.allowNegativeWeights ? '-10 to 20' : '1 to 20') : 'Unweighted',
                },
                { label: 'Edge Direction', value: config.directed ? 'Directed' : 'Undirected' },
              ].map((row, idx) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '46px',
                    minHeight: '46px',
                    borderBottom:
                      idx < 4
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
