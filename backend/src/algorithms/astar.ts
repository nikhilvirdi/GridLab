import { performance } from 'perf_hooks';
import type { Point, SolveRequest, SolveResult } from './types';

/**
 * Min-Heap (binary heap) implementation for A* and Greedy open sets.
 * Stores items as [priority, point] — ordered by priority ascending.
 */
class MinHeap {
  private heap: [number, Point][] = [];

  get size(): number {
    return this.heap.length;
  }

  push(priority: number, point: Point): void {
    this.heap.push([priority, point]);
    this._bubbleUp(this.heap.length - 1);
  }

  pop(): [number, Point] | undefined {
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

const manhattan = (a: Point, b: Point): number =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

/**
 * A* Search
 *
 * f(n) = g(n) + h(n)
 * - g(n): actual cost from start to n (step count on uniform grid).
 * - h(n): Manhattan distance heuristic — admissible and consistent on 4-directional grids.
 *
 * Uses a proper binary min-heap for the open set.
 * Guarantees the optimal (shortest) path.
 */
export function solveAStar(req: SolveRequest): SolveResult {
  const start = performance.now();

  const { grid, start: src, end: dst } = req;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  const visitedNodes: Point[] = [];
  const parent = new Map<string, string | null>();
  const gCost = new Map<string, number>();
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

  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const openSet = new MinHeap();

  gCost.set(srcKey, 0);
  parent.set(srcKey, null);
  openSet.push(manhattan(src, dst), src);

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

    const g = gCost.get(currKey)!;

    for (const [dr, dc] of DIRS) {
      const nr = curr.row + dr;
      const nc = curr.col + dc;
      const nk = key(nr, nc);

      if (
        nr < 0 || nr >= rows ||
        nc < 0 || nc >= cols ||
        grid[nr][nc] === 1 ||
        closed.has(nk)
      ) continue;

      const newG = g + 1;
      const existingG = gCost.get(nk) ?? Infinity;

      if (newG < existingG) {
        gCost.set(nk, newG);
        parent.set(nk, currKey);
        const f = newG + manhattan({ row: nr, col: nc }, dst);
        openSet.push(f, { row: nr, col: nc });
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
