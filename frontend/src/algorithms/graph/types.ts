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

