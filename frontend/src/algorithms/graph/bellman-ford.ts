import type { GraphSolveRequest, GraphSolveResult } from './types';

/**
 * Bellman-Ford Algorithm
 *
 * Computes shortest paths from a single source node in an arbitrary weighted graph.
 * Unlike Dijkstra, Bellman-Ford correctly handles negative edge weights by relaxing
 * every edge in the graph up to V - 1 times (where V is the total node count).
 *
 * After V - 1 passes, a final extra pass over all edges checks for any edge that can
 * still be relaxed. If one is found, a negative-weight cycle exists in the graph,
 * which means shortest paths are undefined for nodes reachable from that cycle.
 *
 * Populates visitedOrder with nodes in the order they get their distance updated,
 * across all relaxation passes without deduplication. This reflects the iterative,
 * multi-pass nature of Bellman-Ford rather than a single-pass frontier expansion.
 */
export function solveBellmanFord(req: GraphSolveRequest): GraphSolveResult {
  const start = performance.now();
  const { graph, source, target } = req;

  const distances: Record<number, number> = {};
  for (const node of graph.nodes) {
    distances[node.id] = Infinity;
  }

  const visitedOrder: number[] = [];
  const parent = new Map<number, number | null>();

  // Check if source exists in graph
  if (distances[source] === undefined) {
    const timeTaken = performance.now() - start;
    return {
      visitedOrder: [],
      distances,
      path: [],
      negativeCycleDetected: false,
      timeTaken,
    };
  }

  distances[source] = 0;
  parent.set(source, null);
  visitedOrder.push(source);

  // Edge case: source === target
  if (target !== undefined && source === target) {
    const timeTaken = performance.now() - start;
    return {
      visitedOrder,
      distances,
      path: [source],
      negativeCycleDetected: false,
      timeTaken,
    };
  }

  // Flatten edges into directed pairs respecting edge.directed
  interface DirectedEdge {
    from: number;
    to: number;
    weight: number;
  }
  const directedEdges: DirectedEdge[] = [];
  for (const edge of graph.edges) {
    const w = edge.weight ?? 1;
    directedEdges.push({ from: edge.from, to: edge.to, weight: w });
    if (!edge.directed) {
      directedEdges.push({ from: edge.to, to: edge.from, weight: w });
    }
  }

  const V = graph.nodes.length;

  // Main relaxation loop: V - 1 passes
  for (let i = 0; i < V - 1; i++) {
    let changed = false;
    for (const { from, to, weight } of directedEdges) {
      if (distances[from] !== Infinity) {
        const newDist = distances[from] + weight;
        if (newDist < distances[to]) {
          distances[to] = newDist;
          parent.set(to, from);
          visitedOrder.push(to);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Final check: 1 additional pass to detect negative-weight cycles
  let negativeCycleDetected = false;
  for (const { from, to, weight } of directedEdges) {
    if (distances[from] !== Infinity && distances[from] + weight < distances[to]) {
      negativeCycleDetected = true;
      break;
    }
  }

  const timeTaken = performance.now() - start;

  if (negativeCycleDetected) {
    // When a negative cycle is detected, shortest path and distances are undefined/unreliable.
    // Return early with the shape without attempting to silently fix or filter them.
    return {
      visitedOrder,
      distances,
      path: [],
      negativeCycleDetected: true,
      timeTaken,
    };
  }

  // Reconstruct path if target was provided and is reachable
  const path: number[] = [];
  if (target !== undefined && distances[target] !== Infinity) {
    let cur: number | null = target;
    const cycleGuard = new Set<number>();
    while (cur !== null && !cycleGuard.has(cur)) {
      cycleGuard.add(cur);
      path.push(cur);
      if (cur === source) break;
      cur = parent.get(cur) ?? null;
    }
    if (path[path.length - 1] === source) {
      path.reverse();
    } else {
      path.length = 0;
    }
  }

  return {
    visitedOrder,
    distances,
    path,
    negativeCycleDetected: false,
    timeTaken,
  };
}
