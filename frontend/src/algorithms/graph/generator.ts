import { Delaunay } from 'd3-delaunay';
import type { GraphData, GraphEdge, GraphGenerationConfig, GraphNode } from './types';

/**
 * Derives unique undirected planar edges using d3-delaunay.
 * Each consecutive triple in delaunay.triangles defines one triangle's vertex indices.
 */
function triangulate(nodes: GraphNode[]): [number, number][] {
  const N = nodes.length;
  if (N < 2) return [];
  if (N === 2) return [[0, 1]];

  const coords: [number, number][] = nodes.map((n) => [n.x, n.y]);
  const delaunay = Delaunay.from(coords);
  const { triangles } = delaunay;

  const edgeSet = new Set<string>();
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i];
    const b = triangles[i + 1];
    const c = triangles[i + 2];

    const sides: [number, number][] = [
      [a, b],
      [b, c],
      [c, a],
    ];

    for (const [u, v] of sides) {
      const min = Math.min(u, v);
      const max = Math.max(u, v);
      edgeSet.add(`${min}_${max}`);
    }
  }

  return Array.from(edgeSet).map((k) => k.split('_').map(Number) as [number, number]);
}

/**
 * Checks whether an undirected graph is fully connected using BFS.
 */
function isGraphConnected(nodeCount: number, edges: [number, number][]): boolean {
  if (nodeCount <= 1) return true;
  if (edges.length < nodeCount - 1) return false;

  const adj: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }

  const visited = new Set<number>();
  const queue = [0];
  visited.add(0);
  let head = 0;

  while (head < queue.length) {
    const u = queue[head++];
    for (const v of adj[u]) {
      if (!visited.has(v)) {
        visited.add(v);
        queue.push(v);
      }
    }
  }

  return visited.size === nodeCount;
}

/**
 * Generates a connected, planar graph with zero edge crossings.
 *
 * 1. Scatters nodeCount vertices with minimum distance spacing.
 *    If nodeCount is omitted in config, a random count between 12 and 20 is picked.
 * 2. Runs d3-delaunay triangulation to produce an initial guaranteed-planar edge set.
 * 3. Prunes excess edges to achieve readable density while verifying graph connectivity.
 * 4. Assigns edge directions and weights according to the specified configuration.
 */
export function generateGraph(
  config: GraphGenerationConfig,
  width: number,
  height: number
): GraphData {
  // If config.nodeCount is passed, use it (bounded to at least 2).
  // Otherwise, select a random integer between 12 and 20 inclusive.
  const nodeCount = config.nodeCount !== undefined
    ? Math.max(2, config.nodeCount)
    : Math.floor(Math.random() * (20 - 12 + 1)) + 12;
  const padding = 45;
  const nodes: GraphNode[] = [];

  let minDist = 50;

  // Scatter points with rejection sampling to ensure visual separation
  for (let i = 0; i < nodeCount; i++) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 250) {
      attempts++;
      const x = padding + Math.random() * (width - 2 * padding);
      const y = padding + Math.random() * (height - 2 * padding);

      const tooClose = nodes.some((n) => Math.hypot(n.x - x, n.y - y) < minDist);
      if (!tooClose) {
        nodes.push({ id: i, x: Math.round(x), y: Math.round(y), label: String(i) });
        placed = true;
      }
    }

    if (!placed) {
      // Relax minimum spacing if bounds become cramped
      minDist = Math.max(24, minDist - 5);
      const x = padding + Math.random() * (width - 2 * padding);
      const y = padding + Math.random() * (height - 2 * padding);
      nodes.push({ id: i, x: Math.round(x), y: Math.round(y), label: String(i) });
    }
  }

  // Generate planar edge set via Delaunay Triangulation
  const initialEdges = triangulate(nodes);

  // Controlled pruning: retain ~1.5x - 1.8x node count edges for clean readability
  const targetEdgeCount = Math.max(nodeCount - 1, Math.floor(nodeCount * 1.6));
  let prunedEdges: [number, number][] = [...initialEdges];

  // Shuffle candidate edges
  for (let i = prunedEdges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [prunedEdges[i], prunedEdges[j]] = [prunedEdges[j], prunedEdges[i]];
  }

  for (let i = prunedEdges.length - 1; i >= 0; i--) {
    if (prunedEdges.length <= targetEdgeCount) break;

    const remaining = prunedEdges.filter((_, idx) => idx !== i);
    if (isGraphConnected(nodeCount, remaining)) {
      prunedEdges = remaining;
    }
  }

  // Ensure connectivity fallback in case initial Delaunay pruning was tight
  if (!isGraphConnected(nodeCount, prunedEdges)) {
    prunedEdges = initialEdges;
  }

  // Format edges with direction and weights
  const edges: GraphEdge[] = prunedEdges.map(([u, v]) => {
    let from = u;
    let to = v;

    if (config.directed && Math.random() < 0.5) {
      from = v;
      to = u;
    }

    let weight: number | undefined;
    if (config.weighted) {
      if (config.allowNegativeWeights) {
        const val = Math.floor(Math.random() * 31) - 10; // -10 to 20
        weight = val === 0 ? 1 : val;
      } else {
        weight = Math.floor(Math.random() * 20) + 1; // 1 to 20
      }
    }

    return { from, to, weight, directed: config.directed };
  });

  return {
    nodes,
    edges,
    directed: config.directed,
    weighted: config.weighted,
  };
}
