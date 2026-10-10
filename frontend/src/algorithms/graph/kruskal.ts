import type { MSTSolveRequest, MSTSolveResult, MSTEdge } from './types';

/**
 * Union-Find (Disjoint Set Union) with path compression and union by rank.
 * Used by Kruskal's to efficiently test and merge connected components.
 */
class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    // Initialise with each node as its own root; all ranks start at 0.
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  /** Returns the representative (root) of the component containing `x`.
   *  Path compression flattens the tree on the way back up. */
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  /** Merges the components of `x` and `y`. Uses union by rank to keep the
   *  tree shallow — the root with higher rank becomes the new root.
   *  Returns false if x and y are already in the same component. */
  union(x: number, y: number): boolean {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return false; // same component — would form a cycle

    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry;
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx;
    } else {
      this.parent[ry] = rx;
      this.rank[rx]++;
    }
    return true;
  }
}

/**
 * Kruskal's Minimum Spanning Tree Algorithm
 *
 * Takes a global view of the graph rather than growing outward from one node:
 * it sorts every edge in the graph by weight ascending, then processes them in
 * that order. An edge is accepted into the MST only when its two endpoints
 * currently belong to different connected components (i.e. accepting it will
 * not create a cycle). A Union-Find structure tracks component membership and
 * performs both the cycle check and the merge in nearly O(1) amortised time
 * (inverse-Ackermann factor via path compression + union by rank).
 *
 * Every edge processed — whether accepted or rejected — is appended to
 * consideredOrder in sorted order. Only accepted edges enter acceptedEdges.
 *
 * Early termination: once acceptedEdges.length === graph.nodes.length - 1, a
 * complete spanning tree has been found. Processing stops immediately and the
 * remaining sorted edges are never visited. This is a meaningful optimisation
 * on dense graphs, not just an arbitrary cutoff — a spanning tree on V nodes
 * needs exactly V - 1 edges, and evaluating further edges can only produce
 * cycle-forming candidates.
 *
 * MST is only defined for undirected graphs. If graph.directed is true, edge
 * direction is ignored entirely: (from, to) and (to, from) are treated as the
 * same undirected edge. To avoid counting a logical undirected edge twice when
 * the generator stores both (u→v) and (v→u) as separate directed edges, the
 * deduplication is handled naturally by Union-Find — the second direction will
 * simply find its endpoints already in the same component and be rejected.
 *
 * Assumption: the generator guarantees a fully connected graph, so exactly
 * V - 1 edges will always be accepted. No special handling for disconnected
 * graphs is added.
 */
export function solveKruskal(req: MSTSolveRequest): MSTSolveResult {
  const start = performance.now();
  const { graph } = req;

  const consideredOrder: MSTEdge[] = [];
  const acceptedEdges: MSTEdge[] = [];

  if (graph.nodes.length === 0) {
    return { consideredOrder, acceptedEdges, totalWeight: 0, timeTaken: performance.now() - start };
  }

  // Build a node-id-to-index map so Union-Find can work on compact 0-based
  // indices regardless of what ids the generator assigned.
  const idToIndex = new Map<number, number>();
  graph.nodes.forEach((node, idx) => idToIndex.set(node.id, idx));

  // Collect all edges as undirected MSTEdges (weight always required) and sort
  // by weight ascending. Treating all edges as undirected means the direction
  // flag on each GraphEdge is intentionally ignored here.
  const sortedEdges: MSTEdge[] = graph.edges
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      weight: edge.weight ?? 1,
    }))
    .sort((a, b) => a.weight - b.weight);

  const uf = new UnionFind(graph.nodes.length);

  for (const edge of sortedEdges) {
    // Record every edge we inspect, whether we accept or skip it.
    consideredOrder.push(edge);

    const fromIdx = idToIndex.get(edge.from);
    const toIdx = idToIndex.get(edge.to);

    // Guard against any edge referencing a node id not present in graph.nodes.
    if (fromIdx === undefined || toIdx === undefined) continue;

    // union() returns true when the endpoints are in different components,
    // meaning this edge safely extends the tree without forming a cycle.
    if (uf.union(fromIdx, toIdx)) {
      acceptedEdges.push(edge);

      // Early termination: spanning tree is complete once we have V - 1 edges.
      if (acceptedEdges.length === graph.nodes.length - 1) break;
    }
  }

  const totalWeight = acceptedEdges.reduce((sum, e) => sum + e.weight, 0);
  const timeTaken = performance.now() - start;

  return { consideredOrder, acceptedEdges, totalWeight, timeTaken };
}
