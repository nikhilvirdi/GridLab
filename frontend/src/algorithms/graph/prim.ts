import type { MSTSolveRequest, MSTSolveResult, MSTEdge } from './types';

/**
 * Min-Heap keyed by edge weight for Prim's algorithm.
 * Stores entries as [weight, from, to] ordered by ascending weight.
 */
class MinHeap {
  private heap: [number, number, number][] = [];

  get size(): number {
    return this.heap.length;
  }

  push(weight: number, from: number, to: number): void {
    this.heap.push([weight, from, to]);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): [number, number, number] | undefined {
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
 * Prim's Minimum Spanning Tree Algorithm
 *
 * Grows a single spanning tree outward from an arbitrary starting node
 * (the first entry in graph.nodes). At each step the algorithm adds the
 * cheapest edge that connects a node already inside the tree to a node that
 * is not yet in the tree, guaranteeing no cycles and minimum total weight.
 *
 * A min-heap keyed by edge weight drives the frontier — all edges incident to
 * a newly added node are pushed into it. When an edge is popped from the heap,
 * it is always recorded in consideredOrder regardless of whether it is accepted
 * or rejected (both endpoints already in tree). Only accepted edges enter
 * acceptedEdges.
 *
 * MST is only defined for undirected graphs. If graph.directed is true, edge
 * direction is ignored entirely: every edge (from, to) is treated as
 * bidirectional, same as if edge.directed were false. The adjacency list is
 * built symmetrically regardless of the edge's directed flag.
 *
 * Assumption: the generator guarantees a fully connected graph, so Prim's
 * started from any single node will always reach every other node. No special
 * handling is added for disconnected graphs.
 */
export function solvePrim(req: MSTSolveRequest): MSTSolveResult {
  const start = performance.now();
  const { graph } = req;

  const consideredOrder: MSTEdge[] = [];
  const acceptedEdges: MSTEdge[] = [];

  if (graph.nodes.length === 0) {
    return { consideredOrder, acceptedEdges, totalWeight: 0, timeTaken: performance.now() - start };
  }

  // Build an undirected adjacency list: for every edge treat both directions,
  // regardless of edge.directed — MST is defined on undirected graphs only.
  const adj = new Map<number, { to: number; weight: number }[]>();
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const w = edge.weight ?? 1;
    adj.get(edge.from)?.push({ to: edge.to, weight: w });
    // Always add the reverse direction (treat as undirected)
    adj.get(edge.to)?.push({ to: edge.from, weight: w });
  }

  const inTree = new Set<number>();
  const heap = new MinHeap();

  // Seed the heap with all edges from the first node in the graph
  const seedId = graph.nodes[0].id;
  inTree.add(seedId);
  for (const neighbor of adj.get(seedId) ?? []) {
    heap.push(neighbor.weight, seedId, neighbor.to);
  }

  while (heap.size > 0) {
    const popped = heap.pop();
    if (!popped) break;
    const [weight, from, to] = popped;

    const edge: MSTEdge = { from, to, weight };
    consideredOrder.push(edge);

    // Both endpoints already in tree — accepting would create a cycle; skip.
    if (inTree.has(to)) continue;

    // Accept this edge into the MST
    acceptedEdges.push(edge);
    inTree.add(to);

    // Push all edges from the newly added node that lead outside the tree
    for (const neighbor of adj.get(to) ?? []) {
      if (!inTree.has(neighbor.to)) {
        heap.push(neighbor.weight, to, neighbor.to);
      }
    }

    // A spanning tree on V nodes has exactly V - 1 edges; stop early.
    if (acceptedEdges.length === graph.nodes.length - 1) break;
  }

  const totalWeight = acceptedEdges.reduce((sum, e) => sum + e.weight, 0);
  const timeTaken = performance.now() - start;

  return { consideredOrder, acceptedEdges, totalWeight, timeTaken };
}
