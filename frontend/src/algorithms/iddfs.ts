import type { Point, SolveRequest, SolveResult } from './types';

const MAX_VISITS = 200000;

/**
 * IDDFS — Iterative Deepening Depth-First Search
 *
 * Performs repeated depth-limited depth-first searches with an increasing depth
 * cap, starting at depth 0 and incrementing by 1 on each pass, up to a safety bound
 * of rows * cols.
 *
 * Each pass executes an iterative stack-based DFS with backtracking (avoiding
 * call stack overflow). Cycle detection is performed against the active path
 * rather than a global visited set, enabling all alternative routes up to the
 * current depth limit to be fully explored.
 *
 * Because the depth cap increments by exactly 1 at each iteration, the first
 * pass that discovers the destination is guaranteed to find the shortest path
 * on an unweighted grid.
 *
 * Visited nodes across every depth-limited pass are recorded into visitedNodes
 * without deduplication, honestly capturing the cumulative work performed by
 * iterative deepening.
 * A hard safety cap of MAX_VISITS node visits prevents browser freeze on large unconstrained grids.
 */
export function solveIDDFS(req: SolveRequest): SolveResult {
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

  const visitedNodes: Point[] = [];
  let found = false;
  let finalPath: Point[] = [];

  const maxDepth = rows * cols;

  for (let depthLimit = 0; depthLimit <= maxDepth; depthLimit++) {
    const path: Point[] = [src];
    const inPath = new Set<string>([srcKey]);
    visitedNodes.push(src);
    if (visitedNodes.length >= MAX_VISITS) {
      const timeTaken = performance.now() - start;
      return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
    }

    let anyHitDepthLimit = false;

    const stack: { point: Point; depth: number; dirIndex: number }[] = [
      { point: src, depth: 0, dirIndex: 0 }
    ];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];

      if (frame.depth < depthLimit) {
        if (frame.dirIndex < dirs.length) {
          const [dr, dc] = dirs[frame.dirIndex++];
          const nr = frame.point.row + dr;
          const nc = frame.point.col + dc;
          const nk = key(nr, nc);

          // Bounds check
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          // Wall check
          if (grid[nr][nc] === 1) continue;
          // Cycle check: do not revisit cells on current path
          if (inPath.has(nk)) continue;

          // Diagonal corner-cutting check
          if (dr !== 0 && dc !== 0) {
            const orth1Open = grid[frame.point.row + dr]?.[frame.point.col] === 0;
            const orth2Open = grid[frame.point.row]?.[frame.point.col + dc] === 0;
            if (!orth1Open || !orth2Open) continue;
          }

          const nextPoint: Point = { row: nr, col: nc };
          visitedNodes.push(nextPoint);
          if (visitedNodes.length >= MAX_VISITS) {
            const timeTaken = performance.now() - start;
            return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
          }
          path.push(nextPoint);
          inPath.add(nk);

          if (nk === dstKey) {
            found = true;
            finalPath = [...path];
            break;
          }

          stack.push({ point: nextPoint, depth: frame.depth + 1, dirIndex: 0 });
        } else {
          // All directions from this node exhausted — backtrack
          stack.pop();
          path.pop();
          inPath.delete(key(frame.point.row, frame.point.col));
        }
      } else {
        // Current frame reached depthLimit — cannot go deeper on this branch
        anyHitDepthLimit = true;
        stack.pop();
        path.pop();
        inPath.delete(key(frame.point.row, frame.point.col));
      }
    }

    if (found) break;

    // If no branch reached depthLimit, the reachable space was fully explored
    if (!anyHitDepthLimit) break;
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
