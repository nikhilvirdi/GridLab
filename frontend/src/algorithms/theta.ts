import type { Point, SolveRequest, SolveResult } from './types';

/**
 * Min-Heap (binary heap) implementation for Theta*'s open set.
 * Stores items as [priority, point] — ordered by priority ascending.
 */
class MinHeap {
  private heap: [number, Point][] = [];
  get size(): number { return this.heap.length; }

  push(priority: number, point: Point): void {
    this.heap.push([priority, point]);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): [number, Point] | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) { this.heap[0] = last; this._siftDown(0); }
    return top;
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p][0] <= this.heap[i][0]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  private _siftDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let s = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l][0] < this.heap[s][0]) s = l;
      if (r < n && this.heap[r][0] < this.heap[s][0]) s = r;
      if (s === i) break;
      [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
      i = s;
    }
  }
}

const euclidean = (a: Point, b: Point): number =>
  Math.sqrt((a.row - b.row) ** 2 + (a.col - b.col) ** 2);

const DIRS_8 = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

/**
 * Traces the integer grid cells on the straight line between two points using
 * Bresenham's line algorithm. Returns the full ordered list of cells including
 * both endpoints. Consecutive cells in the result always differ by at most one
 * step in each axis (pure horizontal, pure vertical, or diagonal), matching the
 * same step shape used by 8-directional movement elsewhere in this codebase.
 */
function bresenhamLine(r0: number, c0: number, r1: number, c1: number): Point[] {
  const points: Point[] = [];
  let r = r0, c = c0;
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;

  while (true) {
    points.push({ row: r, col: c });
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) { err -= dc; r += sr; }
    if (e2 < dr) { err += dr; c += sc; }
  }

  return points;
}

/**
 * Checks whether there is a clear, unobstructed straight line between `from`
 * and `to`, walking the exact grid cells the line passes through via
 * Bresenham's algorithm. Each step is checked for walls, and any diagonal
 * step is checked against the same corner-cutting rule used by every other
 * 8-directional algorithm in this codebase (both orthogonal cells adjacent to
 * the diagonal step must be open).
 */
function hasLineOfSight(
  grid: number[][], rows: number, cols: number, from: Point, to: Point
): boolean {
  const cells = bresenhamLine(from.row, from.col, to.row, to.col);

  for (let i = 1; i < cells.length; i++) {
    const prev = cells[i - 1];
    const curr = cells[i];

    if (curr.row < 0 || curr.row >= rows || curr.col < 0 || curr.col >= cols) return false;
    if (grid[curr.row][curr.col] === 1) return false;

    const dr = curr.row - prev.row;
    const dc = curr.col - prev.col;
    if (dr !== 0 && dc !== 0) {
      const orth1Open = grid[prev.row + dr]?.[prev.col] === 0;
      const orth2Open = grid[prev.row]?.[prev.col + dc] === 0;
      if (!orth1Open || !orth2Open) return false;
    }
  }

  return true;
}

/**
 * Theta* — Any-Angle Pathfinding
 *
 * Built directly on top of A*'s structure (same min-heap, gCost map, parent
 * map, closed set) but with one key addition: whenever a neighbor is
 * considered, Theta* checks whether the current node's PARENT already has a
 * clear line of sight to that neighbor. If it does, the neighbor's path is
 * rerouted to connect directly to the grandparent instead of through the
 * current node, skipping an unnecessary waypoint. This is what allows Theta*
 * to produce smooth, direct-looking paths instead of A*'s staircase pattern
 * on a grid.
 *
 * Unlike the rest of this codebase's algorithms, Theta* uses TRUE Euclidean
 * distance for edge costs (not a uniform per-step cost), since the whole
 * point of any-angle pathfinding is that a direct diagonal line covers less
 * real distance than a zig-zag of the same number of grid steps. The
 * heuristic is Euclidean distance to the goal, which remains admissible since
 * a straight line is always the shortest possible distance between two
 * points.
 *
 * Theta* only makes sense with diagonal movement allowed — it always
 * evaluates all 8 neighbor directions, ignoring req.allowDiagonal entirely.
 * The UI layer is responsible for forcing 8-directional mode on and locking
 * the toggle whenever Theta* is selected.
 */
export function solveThetaStar(req: SolveRequest): SolveResult {
  const start = performance.now();

  const { grid, start: src, end: dst } = req;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  const visitedNodes: Point[] = [];
  const parent = new Map<string, string>();
  const gCost = new Map<string, number>();
  const closed = new Set<string>();

  const key = (r: number, c: number) => `${r},${c}`;
  const pointOf = (k: string): Point => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c };
  };
  const srcKey = key(src.row, src.col);
  const dstKey = key(dst.row, dst.col);

  // Edge case: start === end
  if (srcKey === dstKey) {
    const timeTaken = performance.now() - start;
    return { visitedNodes: [src], path: [src], nodesVisited: 1, pathLength: 1, timeTaken };
  }

  // Edge case: start or end is a wall
  if (grid[src.row]?.[src.col] === 1 || grid[dst.row]?.[dst.col] === 1) {
    const timeTaken = performance.now() - start;
    return { visitedNodes: [], path: [], nodesVisited: 0, pathLength: 0, timeTaken };
  }

  const openSet = new MinHeap();
  gCost.set(srcKey, 0);
  parent.set(srcKey, srcKey); // start is its own parent
  openSet.push(euclidean(src, dst), src);

  let found = false;

  while (openSet.size > 0) {
    const item = openSet.pop()!;
    const curr = item[1];
    const currKey = key(curr.row, curr.col);

    if (closed.has(currKey)) continue;
    closed.add(currKey);
    visitedNodes.push(curr);

    if (currKey === dstKey) {
      found = true;
      break;
    }

    const parentKey = parent.get(currKey)!;
    const parentPoint = pointOf(parentKey);

    for (const [dr, dc] of DIRS_8) {
      const nr = curr.row + dr;
      const nc = curr.col + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] === 1) continue;

      const nk = key(nr, nc);
      if (closed.has(nk)) continue;

      if (dr !== 0 && dc !== 0) {
        const orth1Open = grid[curr.row + dr]?.[curr.col] === 0;
        const orth2Open = grid[curr.row]?.[curr.col + dc] === 0;
        if (!orth1Open || !orth2Open) continue;
      }

      const neighbor: Point = { row: nr, col: nc };

      const stepCost = req.stepCost ?? 1;

      if (hasLineOfSight(grid, rows, cols, parentPoint, neighbor)) {
        // Path 2: shortcut directly from the grandparent, skipping `curr`.
        const newG = gCost.get(parentKey)! + euclidean(parentPoint, neighbor) * stepCost;
        const existingG = gCost.get(nk) ?? Infinity;
        if (newG < existingG) {
          gCost.set(nk, newG);
          parent.set(nk, parentKey);
          openSet.push(newG + euclidean(neighbor, dst) * stepCost, neighbor);
        }
      } else {
        // Path 1: standard A*-style update through `curr`.
        const newG = gCost.get(currKey)! + euclidean(curr, neighbor) * stepCost;
        const existingG = gCost.get(nk) ?? Infinity;
        if (newG < existingG) {
          gCost.set(nk, newG);
          parent.set(nk, currKey);
          openSet.push(newG + euclidean(neighbor, dst) * stepCost, neighbor);
        }
      }
    }
  }

  const timeTaken = performance.now() - start;

  if (!found) {
    return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
  }

  // Reconstruct the waypoint chain (start -> ... -> end). Consecutive waypoints
  // may be several cells apart in any direction, since Theta* skips waypoints
  // whenever a line-of-sight shortcut was taken.
  const waypoints: Point[] = [];
  let curKey: string = dstKey;
  while (true) {
    waypoints.push(pointOf(curKey));
    const p = parent.get(curKey)!;
    if (p === curKey) break; // reached the start (its own parent)
    curKey = p;
  }
  waypoints.reverse();

  // Interpolate every grid cell between consecutive waypoints via Bresenham's
  // algorithm, so the animation walks through every cell exactly as the other
  // algorithms do, rather than jumping between distant waypoints.
  const path: Point[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const segment = bresenhamLine(
      waypoints[i].row, waypoints[i].col,
      waypoints[i + 1].row, waypoints[i + 1].col
    );
    // Drop the last cell of each segment except the final one, to avoid
    // duplicating the shared waypoint between consecutive segments.
    const segmentToAdd = i < waypoints.length - 2 ? segment.slice(0, -1) : segment;
    path.push(...segmentToAdd);
  }
  if (waypoints.length === 1) {
    path.push(waypoints[0]);
  }

  return {
    visitedNodes,
    path,
    nodesVisited: visitedNodes.length,
    pathLength: path.length,
    timeTaken
  };
}
