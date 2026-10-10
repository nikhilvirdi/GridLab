/** A single node in a 2D planar graph. */
export interface GraphNode {
  id: number;
  x: number;
  y: number;
  label?: string;
}

/** A directed or undirected edge between two nodes. */
export interface GraphEdge {
  from: number;
  to: number;
  weight?: number;
  directed?: boolean;
}

/** Complete graph data structure representing vertices and edges. */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
  weighted: boolean;
}

/** Configuration parameters for procedural graph generation. */
export interface GraphGenerationConfig {
  /** Total number of nodes to generate. When omitted, a random count between 12 and 20 (inclusive) is chosen per generation. */
  nodeCount?: number;
  /** Whether edges have a fixed direction. */
  directed: boolean;
  /** Whether edges have numeric weights assigned. */
  weighted: boolean;
  /** Whether negative edge weights are permitted (for Bellman-Ford). Defaults to false. */
  allowNegativeWeights?: boolean;
}

/** Request body sent to graph algorithm solvers (Dijkstra, Bellman-Ford, etc.). */
export interface GraphSolveRequest {
  /** The complete planar graph data structure (nodes and edges). */
  graph: GraphData;
  /** Starting node id from which shortest paths are computed. */
  source: number;
  /** Optional target node id. When provided, the result includes the specific shortest path to it. */
  target?: number;
}

/** Result returned by graph algorithm solvers. */
export interface GraphSolveResult {
  /** Node ids in the order they were visited/finalized by the algorithm (for animation). */
  visitedOrder: number[];
  /** Shortest known distance from source to each node id (Infinity if unreachable). */
  distances: Record<number, number>;
  /** Shortest path from source to target, inclusive (empty if target is omitted or unreachable). */
  path: number[];
  /** Whether a negative-weight cycle was detected (true only for Bellman-Ford). */
  negativeCycleDetected: boolean;
  /** Execution time in milliseconds (fractional). */
  timeTaken: number;
}

// ─── MST algorithm types ──────────────────────────────────────────────────────
// These are kept separate from GraphSolveRequest/GraphSolveResult because MST
// algorithms have fundamentally different semantics: no single source/target,
// no per-node distance map, and the output is a set of edges rather than a path.

/**
 * A single edge as evaluated or accepted by an MST algorithm.
 * Mirrors the shape of GraphEdge but with weight required (MST is only defined
 * on weighted graphs) and no directed flag (MST treats all edges as undirected).
 */
export interface MSTEdge {
  /** Id of one endpoint of the edge. */
  from: number;
  /** Id of the other endpoint of the edge. */
  to: number;
  /** Edge weight (always present for MST algorithms). */
  weight: number;
}

/**
 * Request sent to MST algorithm solvers (Prim's, Kruskal's).
 * Only the graph is needed — MST considers all nodes simultaneously;
 * there is no source or target.
 */
export interface MSTSolveRequest {
  /** The complete planar graph data structure (nodes and edges). */
  graph: GraphData;
}

/**
 * Result returned by MST algorithm solvers (Prim's, Kruskal's).
 */
export interface MSTSolveResult {
  /**
   * Every edge the algorithm evaluated, in the order it evaluated them.
   * Includes both accepted and rejected edges — analogous to visitedOrder
   * in GraphSolveResult, used to drive the step-by-step animation.
   */
  consideredOrder: MSTEdge[];
  /**
   * The edges that were accepted into the MST, in the order they were accepted.
   * For a connected graph with V nodes this will contain exactly V - 1 edges.
   */
  acceptedEdges: MSTEdge[];
  /** Sum of the weights of all acceptedEdges — the total cost of the MST. */
  totalWeight: number;
  /** Execution time in milliseconds (fractional). */
  timeTaken: number;
}
