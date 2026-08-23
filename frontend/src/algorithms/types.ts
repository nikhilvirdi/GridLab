/** A single grid cell coordinate. */
export interface Point {
  row: number;
  col: number;
}

/** Request body sent to each /api/solve/* endpoint. */
export interface SolveRequest {
  grid: number[][];
  start: Point;
  end: Point;
}

/** Response returned by each /api/solve/* endpoint. */
export interface SolveResult {
  /** All cells visited during the search, in order of visitation. */
  visitedNodes: Point[];
  /** The shortest / found path from start to end, inclusive. Empty if no path. */
  path: Point[];
  /** Total number of nodes visited. */
  nodesVisited: number;
  /** Number of cells in the path (0 if no path). */
  pathLength: number;
  /** Time taken in milliseconds (fractional). */
  timeTaken: number;
}
