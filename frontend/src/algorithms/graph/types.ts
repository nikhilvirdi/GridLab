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
