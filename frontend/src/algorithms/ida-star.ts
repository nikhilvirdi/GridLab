import type { Point, SolveRequest, SolveResult } from './types';

const MAX_VISITS = 200000;

const manhattan = (a: Point, b: Point): number =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

const chebyshev = (a: Point, b: Point): number =>
  Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));

const heuristic = (a: Point, b: Point, allowDiagonal?: boolean): number =>
  allowDiagonal ? chebyshev(a, b) : manhattan(a, b);

/**
 * IDA* — Iterative Deepening A*
 *
 * Combines depth-first search's minimal memory footprint with heuristic search
 * guidance. Unlike A*, it uses no priority queue and no persistent closed set.
 * Instead, it maintains a cost threshold initialized to h(start, goal).
 *
 * Each iteration performs a depth-first search from the start node using an
 * explicit stack with backtracking (avoiding recursion to protect against call
 * stack overflow on large grids). If a node's f = g + h exceeds the threshold,
 * that branch is pruned, and the smallest exceeded f-cost is recorded as the
 * candidate threshold for the next iteration.
 *
 * Cycles are prevented by checking candidates against the active path stack.
 * Visited nodes across every iteration are recorded into visitedNodes without
 * deduplication, honestly capturing the repeated work characteristic of IDA*,
 * which naturally results in higher node visit counts than memory-intensive A*.
 * A hard safety cap of MAX_VISITS node visits prevents browser freeze on large unconstrained grids.
 */
export function solveIDAStar(req: SolveRequest): SolveResult {
  const start = performance.now();

  const { grid, start: src, end: dst } = req;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

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
  const stepCost = req.stepCost ?? 1;

  const visitedNodes: Point[] = [];
  let found = false;
  let finalPath: Point[] = [];

  let threshold = heuristic(src, dst, req.allowDiagonal);

  // Outer loop: iterative threshold deepening
  while (!found) {
    let minExceeded = Infinity;
    const path: Point[] = [src];
    const inPath = new Set<string>([srcKey]);
    visitedNodes.push(src);
    if (visitedNodes.length >= MAX_VISITS) {
      const timeTaken = performance.now() - start;
      return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
    }

    const stack: { point: Point; g: number; dirIndex: number }[] = [
      { point: src, g: 0, dirIndex: 0 }
    ];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];

      if (frame.dirIndex < dirs.length) {
        const [dr, dc] = dirs[frame.dirIndex++];
        const nr = frame.point.row + dr;
        const nc = frame.point.col + dc;
        const nk = key(nr, nc);

        // Bounds check
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        // Wall check
        if (grid[nr][nc] === 1) continue;
        // Cycle check: do not revisit cells currently on the path
        if (inPath.has(nk)) continue;

        // Diagonal corner-cutting check
        if (dr !== 0 && dc !== 0) {
          const orth1Open = grid[frame.point.row + dr]?.[frame.point.col] === 0;
          const orth2Open = grid[frame.point.row]?.[frame.point.col + dc] === 0;
          if (!orth1Open || !orth2Open) continue;
        }

        const nextPoint: Point = { row: nr, col: nc };
        const nextG = frame.g + stepCost;
        const nextF = nextG + heuristic(nextPoint, dst, req.allowDiagonal);

        // Record every expansion across every iteration
        visitedNodes.push(nextPoint);
        if (visitedNodes.length >= MAX_VISITS) {
          const timeTaken = performance.now() - start;
          return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
        }

        if (nextF > threshold) {
          if (nextF < minExceeded) {
            minExceeded = nextF;
          }
          continue;
        }

        // Within threshold: extend current path and descend
        path.push(nextPoint);
        inPath.add(nk);

        if (nk === dstKey) {
          found = true;
          finalPath = [...path];
          break;
        }

        stack.push({ point: nextPoint, g: nextG, dirIndex: 0 });
      } else {
        // All directions from this node exhausted — backtrack
        stack.pop();
        path.pop();
        inPath.delete(key(frame.point.row, frame.point.col));
      }
    }

    if (found) break;

    // If no candidate threshold was recorded or couldn't progress, no path exists
    if (minExceeded === Infinity || minExceeded <= threshold) {
      break;
    }

    threshold = minExceeded;
  }

  const timeTaken = performance.now() - start;

  if (!found) {
    return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
  }

  return {
    visitedNodes,
    path: finalPath,
    nodesVisited: visitedNodes.length,
    pathLength: finalPath.length,
    timeTaken
  };
}
