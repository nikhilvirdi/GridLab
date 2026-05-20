"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveDFS = solveDFS;
const perf_hooks_1 = require("perf_hooks");
/**
 * DFS — Depth-First Search (iterative, stack-based)
 *
 * Explores as far as possible along each branch before backtracking.
 * Uses an explicit stack (no recursion) to avoid call stack overflow on large grids.
 * Does NOT guarantee the shortest path.
 */
function solveDFS(req) {
    const start = perf_hooks_1.performance.now();
    const { grid, start: src, end: dst } = req;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    const visitedNodes = [];
    const parent = new Map();
    const key = (r, c) => `${r},${c}`;
    const srcKey = key(src.row, src.col);
    const dstKey = key(dst.row, dst.col);
    // Edge case: start === end
    if (srcKey === dstKey) {
        const timeTaken = perf_hooks_1.performance.now() - start;
        return { visitedNodes: [src], path: [src], nodesVisited: 1, pathLength: 1, timeTaken };
    }
    // Edge case: start or end is a wall
    if (grid[src.row]?.[src.col] === 1 || grid[dst.row]?.[dst.col] === 1) {
        const timeTaken = perf_hooks_1.performance.now() - start;
        return { visitedNodes: [], path: [], nodesVisited: 0, pathLength: 0, timeTaken };
    }
    const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const stack = [src];
    const visited = new Set();
    parent.set(srcKey, null);
    let found = false;
    while (stack.length > 0) {
        const curr = stack.pop();
        const currKey = key(curr.row, curr.col);
        // Skip already-visited nodes (can be enqueued multiple times)
        if (visited.has(currKey))
            continue;
        visited.add(currKey);
        visitedNodes.push(curr);
        if (currKey === dstKey) {
            found = true;
            break;
        }
        for (const [dr, dc] of DIRS) {
            const nr = curr.row + dr;
            const nc = curr.col + dc;
            const nk = key(nr, nc);
            if (nr >= 0 && nr < rows &&
                nc >= 0 && nc < cols &&
                grid[nr][nc] === 0 &&
                !visited.has(nk)) {
                // Only set parent on first discovery
                if (!parent.has(nk)) {
                    parent.set(nk, currKey);
                }
                stack.push({ row: nr, col: nc });
            }
        }
    }
    const timeTaken = perf_hooks_1.performance.now() - start;
    if (!found) {
        return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
    }
    // Reconstruct path via parent map
    const path = [];
    let cur = dstKey;
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
