import type { GraphSolveRequest, GraphSolveResult } from './types';

/**
 * Min-Heap (binary heap) priority queue for Dijkstra's algorithm.
 * Stores entries as [distance, nodeId] ordered by ascending distance.
 */
class MinHeap {
  private heap: [number, number][] = [];

  get size(): number {
    return this.heap.length;
  }

  push(priority: number, item: number): void {
    this.heap.push([priority, item]);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): [number, number] | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent][0] <= this.heap[i][0]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private _siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.heap[l][0] < this.heap[smallest][0]) smallest = l;
      if (r < n && this.heap[r][0] < this.heap[smallest][0]) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

/**
 * Dijkstra's Algorithm
 *
 * Computes shortest paths from a single source node in an arbitrary weighted graph.
 * Dijkstra is Uniform Cost Search (UCS) generalized to arbitrary weighted graphs
 * instead of a uniform 2D grid.
 *
 * Guarantees optimal (shortest) paths if and only if all edge weights are non-negative.
 * It assumes non-negative edge weights: if negative weights are present, Dijkstra
 * will produce incorrect results because a node once finalized can never be revisited
 * even if a negative edge later reveals a lower-cost path. For graphs with negative
 * edge weights, Bellman-Ford exists to handle that case correctly.
 *
 * Traversal uses a binary min-heap keyed by current best distance. Nodes are pushed
 * to visitedOrder when they are finalized (popped and settled). If an optional target
 * is provided, search terminates once the target is finalized and the shortest path
 * is reconstructed via a parent map. When target is omitted, shortest distances to
 * every reachable node are computed.
 */
export function solveDijkstra(req: GraphSolveRequest): GraphSolveResult {
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

  // Edge case: source === target
  if (target !== undefined && source === target) {
    const timeTaken = performance.now() - start;
    return {
      visitedOrder: [source],
      distances,
      path: [source],
      negativeCycleDetected: false,
      timeTaken,
    };
  }

  // Build adjacency list respecting edge.directed
  const adj = new Map<number, { to: number; weight: number }[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const w = edge.weight ?? 1;
    adj.get(edge.from)?.push({ to: edge.to, weight: w });
    if (!edge.directed) {
      adj.get(edge.to)?.push({ to: edge.from, weight: w });
    }
  }

  const openSet = new MinHeap();
  openSet.push(0, source);
  const settled = new Set<number>();

  while (openSet.size > 0) {
    const [dist, curr] = openSet.pop()!;

    if (settled.has(curr)) continue;
    settled.add(curr);
    visitedOrder.push(curr);

    // Stop early if target has been reached and finalized
    if (target !== undefined && curr === target) {
      break;
    }

    const neighbors = adj.get(curr) ?? [];
    for (const { to, weight } of neighbors) {
      if (settled.has(to)) continue;

      const newDist = dist + weight;
      if (newDist < (distances[to] ?? Infinity)) {
        distances[to] = newDist;
        parent.set(to, curr);
        openSet.push(newDist, to);
      }
    }
  }

  // Reconstruct path via parent map if target was provided and reached
  const path: number[] = [];
  if (target !== undefined && settled.has(target) && distances[target] !== Infinity) {
    let cur: number | null = target;
    while (cur !== null) {
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

  const timeTaken = performance.now() - start;

  return {
    visitedOrder,
    distances,
    path,
    negativeCycleDetected: false,
    timeTaken,
  };
}
