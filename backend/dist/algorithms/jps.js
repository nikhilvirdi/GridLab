"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveJPS = solveJPS;
const perf_hooks_1 = require("perf_hooks");
/**
 * Min-Heap for JPS open set, keyed by f-cost.
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
const h = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
const key = (r, c) => `${r},${c}`;
/**
 * JPS — Jump Point Search for 4-directional (cardinal-only) grids.
 *
 * On a 4-directional grid, all movement is either purely horizontal (dc=±1, dr=0)
 * or purely vertical (dr=±1, dc=0). There are no diagonal moves.
 *
 * The algorithm:
 * 1. From the start, scan in all 4 cardinal directions simultaneously.
 * 2. A jump point is a walkable cell that has at least one "forced neighbour" —
 *    a neighbour that cannot be reached optimally except via the current cell.
 * 3. When a jump point is found it is added to the open set (min-heap by f = g + h).
 * 4. When a jump point is expanded, scanning continues from it in all 4 directions.
 * 5. The goal cell always counts as a jump point and terminates scanning immediately.
 *
 * Path reconstruction interpolates the straight-line segments between jump points.
 */
function solveJPS(req) {
    const startTime = perf_hooks_1.performance.now();
    const { grid, start: src, end: dst } = req;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    const visitedOrder = [];
    const visitedSet = new Set();
    /** key → parent Point (null for start node) */
    const parent = new Map();
    const gCost = new Map();
    const closed = new Set();
    const srcKey = key(src.row, src.col);
    const dstKey = key(dst.row, dst.col);
    const walkable = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 0;
    const touch = (r, c) => {
        const k = key(r, c);
        if (!visitedSet.has(k)) {
            visitedSet.add(k);
            visitedOrder.push({ row: r, col: c });
        }
    };
    // ── Edge cases ──────────────────────────────────────────────────────────────
    if (srcKey === dstKey) {
        return { visitedNodes: [src], path: [src], nodesVisited: 1, pathLength: 1, timeTaken: 0 };
    }
    if (!walkable(src.row, src.col) || !walkable(dst.row, dst.col)) {
        return { visitedNodes: [], path: [], nodesVisited: 0, pathLength: 0, timeTaken: 0 };
    }
    // ── Iterative horizontal scan ────────────────────────────────────────────────
    /**
     * Scan horizontally from (r, c) in direction dc (+1 or -1).
     * Returns the first jump point found, or null.
     */
    function scanH(r, c, dc) {
        while (walkable(r, c)) {
            touch(r, c);
            if (r === dst.row && c === dst.col)
                return { row: r, col: c };
            // Forced neighbours: cells above/below that are blocked at c but open at c+dc
            if ((!walkable(r - 1, c) && walkable(r - 1, c + dc)) ||
                (!walkable(r + 1, c) && walkable(r + 1, c + dc)))
                return { row: r, col: c };
            c += dc;
        }
        return null;
    }
    // ── Iterative vertical scan ──────────────────────────────────────────────────
    /**
     * Scan vertically from (r, c) in direction dr (+1 or -1).
     * Also scans horizontally from each cell to detect jump points.
     * Returns the first jump point found, or null.
     */
    function scanV(r, c, dr) {
        while (walkable(r, c)) {
            touch(r, c);
            if (r === dst.row && c === dst.col)
                return { row: r, col: c };
            // Forced neighbours: cells left/right that are blocked at r but open at r+dr
            if ((!walkable(r, c - 1) && walkable(r + dr, c - 1)) ||
                (!walkable(r, c + 1) && walkable(r + dr, c + 1)))
                return { row: r, col: c };
            // Also scan horizontally from here to find jump points in perpendicular axes
            if (scanH(r, c + 1, 1) !== null || scanH(r, c - 1, -1) !== null)
                return { row: r, col: c };
            r += dr;
        }
        return null;
    }
    /**
     * Collect all jump point successors of `curr`.
     * On a 4-directional grid we always scan all 4 cardinal directions from each
     * expanded jump point (rather than pruning based on parent — full cardinal JPS).
     */
    function successors(curr) {
        const result = [];
        const { row: r, col: c } = curr;
        // Horizontal scans
        const rp = scanH(r, c + 1, +1);
        const rm = scanH(r, c - 1, -1);
        if (rp)
            result.push(rp);
        if (rm)
            result.push(rm);
        // Vertical scans
        const dp = scanV(r + 1, c, +1);
        const dm = scanV(r - 1, c, -1);
        if (dp)
            result.push(dp);
        if (dm)
            result.push(dm);
        return result;
    }
    // ── Main A* loop over jump points ────────────────────────────────────────────
    const openSet = new MinHeap();
    gCost.set(srcKey, 0);
    parent.set(srcKey, null);
    openSet.push(h(src, dst), src);
    touch(src.row, src.col);
    let found = false;
    while (openSet.size > 0) {
        const [, curr] = openSet.pop();
        const currKey = key(curr.row, curr.col);
        if (closed.has(currKey))
            continue;
        closed.add(currKey);
        if (currKey === dstKey) {
            found = true;
            break;
        }
        const g = gCost.get(currKey);
        for (const jp of successors(curr)) {
            const jpKey = key(jp.row, jp.col);
            if (closed.has(jpKey))
                continue;
            const newG = g + h(curr, jp); // uniform cost = Manhattan distance
            const existingG = gCost.get(jpKey) ?? Infinity;
            if (newG < existingG) {
                gCost.set(jpKey, newG);
                parent.set(jpKey, curr);
                openSet.push(newG + h(jp, dst), jp);
            }
        }
    }
    const timeTaken = perf_hooks_1.performance.now() - startTime;
    if (!found) {
        return { visitedNodes: visitedOrder, path: [], nodesVisited: visitedOrder.length, pathLength: 0, timeTaken };
    }
    // ── Path reconstruction ───────────────────────────────────────────────────────
    // Walk the parent map from dst back to src to get the sequence of jump points
    const jpPath = [];
    {
        let k = dstKey;
        while (k !== null) {
            const [r, c] = k.split(',').map(Number);
            jpPath.push({ row: r, col: c });
            const p = parent.get(k);
            k = (p !== undefined && p !== null) ? key(p.row, p.col) : null;
        }
    }
    jpPath.reverse();
    // Interpolate straight-line segments between consecutive jump points
    const path = [];
    for (let i = 0; i < jpPath.length - 1; i++) {
        const from = jpPath[i];
        const to = jpPath[i + 1];
        const dr = Math.sign(to.row - from.row);
        const dc = Math.sign(to.col - from.col);
        let r = from.row, c = from.col;
        while (r !== to.row || c !== to.col) {
            path.push({ row: r, col: c });
            r += dr;
            c += dc;
        }
    }
    path.push(dst);
    return {
        visitedNodes: visitedOrder,
        path,
        nodesVisited: visitedOrder.length,
        pathLength: path.length,
        timeTaken
    };
}
