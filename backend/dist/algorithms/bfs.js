"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveBFS = solveBFS;
const perf_hooks_1 = require("perf_hooks");
/**
 * BFS — Breadth-First Search
 *
 * Explores all nodes at the current depth level before moving to the next.
 * Uses a FIFO queue with a two-pointer technique to avoid O(n) array shifts.
 * Guarantees the shortest path on an unweighted grid.
 */
function solveBFS(req) {
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
    const queue = [src];
    let head = 0; // two-pointer head index — O(1) dequeue
    parent.set(srcKey, null);
    visitedNodes.push(src);
    let found = false;
    while (head < queue.length) {
        const curr = queue[head++];
        const currKey = key(curr.row, curr.col);
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
                !parent.has(nk)) {
                parent.set(nk, currKey);
                visitedNodes.push({ row: nr, col: nc });
                queue.push({ row: nr, col: nc });
            }
        }
    }
    const timeTaken = perf_hooks_1.performance.now() - start;
    if (!found) {
        return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
    }
    // Reconstruct path from dst back to src via parent map
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
