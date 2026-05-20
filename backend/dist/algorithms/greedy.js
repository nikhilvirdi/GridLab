"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveGreedy = solveGreedy;
const perf_hooks_1 = require("perf_hooks");
/**
 * Min-Heap for Greedy open set, ordered by heuristic only.
 */
class MinHeap {
    heap = [];
    get size() { return this.heap.length; }
    push(priority, point) {
        this.heap.push([priority, point]);
        this._bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (this.heap.length === 0)
            return undefined;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._siftDown(0);
        }
        return top;
    }
    _bubbleUp(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.heap[p][0] <= this.heap[i][0])
                break;
            [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
            i = p;
        }
    }
    _siftDown(i) {
        const n = this.heap.length;
        while (true) {
            let s = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.heap[l][0] < this.heap[s][0])
                s = l;
            if (r < n && this.heap[r][0] < this.heap[s][0])
                s = r;
            if (s === i)
                break;
            [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
            i = s;
        }
    }
}
const manhattan = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
/**
 * Greedy Best-First Search
 *
 * Selects the next node to expand based solely on the heuristic h(n) = Manhattan distance.
 * No path cost g(n) is considered — purely greedy.
 *
 * This makes it typically faster than A* but does NOT guarantee the shortest path.
 * It can get trapped in local minima in complex maze structures.
 */
function solveGreedy(req) {
    const start = perf_hooks_1.performance.now();
    const { grid, start: src, end: dst } = req;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    const visitedNodes = [];
    const parent = new Map();
    const closed = new Set();
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
    const openSet = new MinHeap();
    parent.set(srcKey, null);
    openSet.push(manhattan(src, dst), src);
    let found = false;
    while (openSet.size > 0) {
        const item = openSet.pop();
        const curr = item[1];
        const currKey = key(curr.row, curr.col);
        if (closed.has(currKey))
            continue;
        closed.add(currKey);
        visitedNodes.push(curr);
        if (currKey === dstKey) {
            found = true;
            break;
        }
        for (const [dr, dc] of DIRS) {
            const nr = curr.row + dr;
            const nc = curr.col + dc;
            const nk = key(nr, nc);
            if (nr < 0 || nr >= rows ||
                nc < 0 || nc >= cols ||
                grid[nr][nc] === 1 ||
                closed.has(nk))
                continue;
            // Greedy: only track first discovery — no g-cost comparison
            if (!parent.has(nk)) {
                parent.set(nk, currKey);
                // Priority = heuristic only, no g(n)
                openSet.push(manhattan({ row: nr, col: nc }, dst), { row: nr, col: nc });
            }
        }
    }
    const timeTaken = perf_hooks_1.performance.now() - start;
    if (!found) {
        return { visitedNodes, path: [], nodesVisited: visitedNodes.length, pathLength: 0, timeTaken };
    }
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
