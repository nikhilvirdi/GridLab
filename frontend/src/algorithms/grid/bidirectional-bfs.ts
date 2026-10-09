import type { Point, SolveRequest, SolveResult } from './types';

/**
 * Bidirectional BFS
 *
 * Runs two simultaneous BFS frontiers:
 * - Forward frontier expands from `start`.
 * - Backward frontier expands from `end`.
 *
 * Each iteration expands the smaller of the two frontiers (by current queue size)
 * to keep the search balanced. The search terminates as soon as a cell is encountered
 * by both frontiers — at that point the two partial paths are merged to form the
 * complete start-to-end path.
 *
 * Guarantees the shortest path on an unweighted grid.
 */
export function solveBidirectionalBFS(req: SolveRequest): SolveResult {
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

  // Forward and backward parent maps — null means "this is the frontier origin"
  const parentFwd = new Map<string, string | null>([[srcKey, null]]);
  const parentBwd = new Map<string, string | null>([[dstKey, null]]);

  // FIFO queues using two-pointer technique
  const fwdQueue: Point[] = [src];
  const bwdQueue: Point[] = [dst];

  // Visited nodes in order of discovery (combined from both frontiers)
  const visitedOrder: Point[] = [src, dst];
  const visitedSet = new Set<string>([srcKey, dstKey]);

  let meetingKey: string | null = null;

  /**
   * Expand one level of the given frontier.
   * Returns the meeting node key if the frontiers have intersected, or null.
   */
  function expandLevel(
    queue: Point[],
    head: { value: number },
    ownParent: Map<string, string | null>,
    otherParent: Map<string, string | null>
  ): string | null {
    const levelEnd = queue.length;

    while (head.value < levelEnd) {
      const curr = queue[head.value++];
      const currKey = key(curr.row, curr.col);

      for (const [dr, dc] of dirs) {
        const nr = curr.row + dr;
        const nc = curr.col + dc;
        const nk = key(nr, nc);

        if (
          nr < 0 || nr >= rows ||
          nc < 0 || nc >= cols ||
          grid[nr][nc] === 1 ||
          ownParent.has(nk)
        ) continue;

        if (dr !== 0 && dc !== 0) {
          const orth1Open = grid[curr.row + dr]?.[curr.col] === 0;
          const orth2Open = grid[curr.row]?.[curr.col + dc] === 0;
          if (!orth1Open || !orth2Open) continue;
        }

        ownParent.set(nk, currKey);

        if (!visitedSet.has(nk)) {
          visitedSet.add(nk);
          visitedOrder.push({ row: nr, col: nc });
        }

        queue.push({ row: nr, col: nc });

        // Check if the other frontier has already visited this cell
        if (otherParent.has(nk)) {
          return nk;
        }
      }
    }

    return null;
  }

  // Wrap heads in objects so expandLevel can mutate them
  const fwdHead_ = { value: 0 };
  const bwdHead_ = { value: 0 };

  while (fwdHead_.value < fwdQueue.length || bwdHead_.value < bwdQueue.length) {
    // Expand the smaller frontier each iteration
    const fwdRemaining = fwdQueue.length - fwdHead_.value;
    const bwdRemaining = bwdQueue.length - bwdHead_.value;

    if (fwdRemaining > 0 && (fwdRemaining <= bwdRemaining || bwdRemaining === 0)) {
      meetingKey = expandLevel(fwdQueue, fwdHead_, parentFwd, parentBwd);
    } else if (bwdRemaining > 0) {
      meetingKey = expandLevel(bwdQueue, bwdHead_, parentBwd, parentFwd);
    }

    if (meetingKey !== null) break;
  }

  const timeTaken = performance.now() - start;

  if (meetingKey === null) {
    return { visitedNodes: visitedOrder, path: [], nodesVisited: visitedOrder.length, pathLength: 0, timeTaken };
  }

  // Reconstruct forward half: meeting → src (reverse)
  const fwdPath: Point[] = [];
  let cur: string | null = meetingKey;
  while (cur !== null) {
    const [r, c] = cur.split(',').map(Number);
    fwdPath.push({ row: r, col: c });
    cur = parentFwd.get(cur) ?? null;
  }
  fwdPath.reverse();

  // Reconstruct backward half: meeting's successor → dst
  const bwdPath: Point[] = [];
  let bcur: string | null = parentBwd.get(meetingKey) ?? null;
  while (bcur !== null) {
    const [r, c] = bcur.split(',').map(Number);
    bwdPath.push({ row: r, col: c });
    bcur = parentBwd.get(bcur) ?? null;
  }

  const path = [...fwdPath, ...bwdPath];

  return {
    visitedNodes: visitedOrder,
    path,
    nodesVisited: visitedOrder.length,
    pathLength: path.length,
    timeTaken
  };
}
