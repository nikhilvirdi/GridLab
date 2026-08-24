import type { Point, SolveRequest, SolveResult } from './types';

/**
 * Min-Heap for Greedy open set, ordered by heuristic only.
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

const manhattan = (a: Point, b: Point): number =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

const chebyshev = (a: Point, b: Point): number =>
  Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));

const heuristic = (a: Point, b: Point, allowDiagonal?: boolean): number =>
  allowDiagonal ? chebyshev(a, b) : manhattan(a, b);

/**
 * Greedy Best-First Search
 *
 * Selects the next node to expand based solely on the heuristic h(n) = Manhattan distance.
 * No path cost g(n) is considered — purely greedy.
 *
 * This makes it typically faster than A* but does NOT guarantee the shortest path.
 * It can get trapped in local minima in complex maze structures.
 */
export function solveGreedy(req: SolveRequest): SolveResult {
  const start = performance.now();

  const { grid, start: src, end: dst } = req;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  const visitedNodes: Point[] = [];
  const parent = new Map<string, string | null>();
  const closed = new Set<string>();

  const key = (r: number, c: number) => `${r},${c}`;
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

  const DIRS_4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIRS_8 = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];
  const dirs = req.allowDiagonal ? DIRS_8 : DIRS_4;
  const openSet = new MinHeap();

  parent.set(srcKey, null);
  openSet.push(heuristic(src, dst, req.allowDiagonal), src);

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

    for (const [dr, dc] of dirs) {
      const nr = curr.row + dr;
      const nc = curr.col + dc;
      const nk = key(nr, nc);

      if (
        nr < 0 || nr >= rows ||
        nc < 0 || nc >= cols ||
        grid[nr][nc] === 1 ||
        closed.has(nk)
      ) continue;

      if (dr !== 0 && dc !== 0) {
        const orth1Open = grid[curr.row + dr]?.[curr.col] === 0;
        const orth2Open = grid[curr.row]?.[curr.col + dc] === 0;
        if (!orth1Open || !orth2Open) continue;
      }

      // Greedy: only track first discovery — no g-cost comparison
      if (!parent.has(nk)) {
        parent.set(nk, currKey);
        // Priority = heuristic only, no g(n)
        openSet.push(heuristic({ row: nr, col: nc }, dst, req.allowDiagonal), { row: nr, col: nc });
      }
    }
  }

  const timeTaken = performance.now() - start;

  if (!found) {
    return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
  }

  const path: Point[] = [];
  let cur: string | null = dstKey;
  while (cur !== null) {
    const [r, c] = cur.split(',').map(Number);
    path.push({ row: r, col: c });
    cur = parent.get(cur) ?? null;
  }
  path.reverse();

  return {
    visitedNodes,
    path,
    nodesVisited: visitedNodes.length,
    pathLength: path.length,
    timeTaken
  };
}
