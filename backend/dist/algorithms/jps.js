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
const manhattan = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
const key = (r, c) => `${r},${c}`;
/**
 * JPS — Jump Point Search
 *
 * An optimisation of A* for uniform-cost grid maps.
 * Instead of expanding every neighbour, JPS uses pruning rules to skip cells
 * that would be reached more cheaply via another route, and then "jumps"
 * along rows/columns until it finds a jump point (a cell with forced neighbours).
 *
 * This implementation follows the canonical Harabor & Grastien (2011) algorithm
 * for 4-directional movement (no diagonals):
 * - Natural neighbours are pruned based on the parent direction.
 * - Forced neighbours are cells that can only be reached optimally via the current node.
 * - Jump points are identified recursively along horizontal and vertical axes.
 * - The open set is a min-heap ordered by f = g + h.
 * - Intermediate cells between jump points are interpolated for the final path & visited list.
 */
function solveJPS(req) {
    const startTime = perf_hooks_1.performance.now();
    const { grid, start: src, end: dst } = req;
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    const visitedOrder = [];
    const visitedSet = new Set();
    const parent = new Map();
    const gCost = new Map();
    const closed = new Set();
    const srcKey = key(src.row, src.col);
    const dstKey = key(dst.row, dst.col);
    const isWalkable = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 0;
    const markVisited = (r, c) => {
        const k = key(r, c);
        if (!visitedSet.has(k)) {
            visitedSet.add(k);
            visitedOrder.push({ row: r, col: c });
        }
    };
    // Edge cases
    if (srcKey === dstKey) {
        const timeTaken = perf_hooks_1.performance.now() - startTime;
        return { visitedNodes: [src], path: [src], nodesVisited: 1, pathLength: 1, timeTaken };
    }
    if (!isWalkable(src.row, src.col) || !isWalkable(dst.row, dst.col)) {
        const timeTaken = perf_hooks_1.performance.now() - startTime;
        return { visitedNodes: [], path: [], nodesVisited: 0, pathLength: 0, timeTaken };
    }
    /**
     * Get pruned neighbours of `node` given that it was reached from `parentNode`.
     * For 4-directional JPS we only prune based on horizontal/vertical directions.
     */
    function getPrunedNeighbours(node, parentNode) {
        const { row: r, col: c } = node;
        if (parentNode === null) {
            // Start node — return all walkable neighbours
            return [[-1, 0], [1, 0], [0, -1], [0, 1]]
                .map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
                .filter(p => isWalkable(p.row, p.col));
        }
        const dr = Math.sign(r - parentNode.row);
        const dc = Math.sign(c - parentNode.col);
        const neighbours = [];
        if (dr !== 0 && dc === 0) {
            // Moving vertically
            if (isWalkable(r + dr, c))
                neighbours.push({ row: r + dr, col: c });
            // Forced neighbours: cells blocked horizontally from parent but accessible from here
            if (!isWalkable(r, c - 1) && isWalkable(r + dr, c - 1))
                neighbours.push({ row: r + dr, col: c - 1 });
            if (!isWalkable(r, c + 1) && isWalkable(r + dr, c + 1))
                neighbours.push({ row: r + dr, col: c + 1 });
        }
        else if (dc !== 0 && dr === 0) {
            // Moving horizontally
            if (isWalkable(r, c + dc))
                neighbours.push({ row: r, col: c + dc });
            // Forced neighbours: cells blocked vertically from parent but accessible from here
            if (!isWalkable(r - 1, c) && isWalkable(r - 1, c + dc))
                neighbours.push({ row: r - 1, col: c + dc });
            if (!isWalkable(r + 1, c) && isWalkable(r + 1, c + dc))
                neighbours.push({ row: r + 1, col: c + dc });
        }
        return neighbours;
    }
    /**
     * Jump from (r, c) in direction (dr, dc).
     * Returns the jump point if found, or null if the scan hits a wall/boundary.
     */
    function jump(r, c, dr, dc) {
        if (!isWalkable(r, c))
            return null;
        markVisited(r, c);
        // Reached the goal — this is always a jump point
        if (r === dst.row && c === dst.col)
            return { row: r, col: c };
        // Check for forced neighbours
        if (dr !== 0 && dc === 0) {
            // Vertical movement: check for horizontal forced neighbours
            if ((!isWalkable(r, c - 1) && isWalkable(r + dr, c - 1)) ||
                (!isWalkable(r, c + 1) && isWalkable(r + dr, c + 1)))
                return { row: r, col: c };
        }
        else if (dc !== 0 && dr === 0) {
            // Horizontal movement: check for vertical forced neighbours
            if ((!isWalkable(r - 1, c) && isWalkable(r - 1, c + dc)) ||
                (!isWalkable(r + 1, c) && isWalkable(r + 1, c + dc)))
                return { row: r, col: c };
        }
        return jump(r + dr, c + dc, dr, dc);
    }
    /**
     * Identify jump points that are successors of `node`.
     */
    function identifySuccessors(node, parentNode) {
        const neighbours = getPrunedNeighbours(node, parentNode);
        const successors = [];
        for (const nb of neighbours) {
            const dr = Math.sign(nb.row - node.row);
            const dc = Math.sign(nb.col - node.col);
            const jp = jump(nb.row, nb.col, dr, dc);
            if (jp !== null)
                successors.push(jp);
        }
        return successors;
    }
    const openSet = new MinHeap();
    gCost.set(srcKey, 0);
    parent.set(srcKey, null);
    openSet.push(manhattan(src, dst), src);
    markVisited(src.row, src.col);
    let found = false;
    // Map from key → parent point (not just key string, so we can interpolate)
    const parentPoint = new Map();
    parentPoint.set(srcKey, null);
    while (openSet.size > 0) {
        const item = openSet.pop();
        const curr = item[1];
        const currKey = key(curr.row, curr.col);
        if (closed.has(currKey))
            continue;
        closed.add(currKey);
        if (currKey === dstKey) {
            found = true;
            break;
        }
        const g = gCost.get(currKey);
        const parentPt = parentPoint.get(currKey) ?? null;
        const successors = identifySuccessors(curr, parentPt);
        for (const jp of successors) {
            const jpKey = key(jp.row, jp.col);
            if (closed.has(jpKey))
                continue;
            const dist = manhattan(curr, jp); // uniform step cost
            const newG = g + dist;
            const existingG = gCost.get(jpKey) ?? Infinity;
            if (newG < existingG) {
                gCost.set(jpKey, newG);
                parent.set(jpKey, currKey);
                parentPoint.set(jpKey, curr);
                openSet.push(newG + manhattan(jp, dst), jp);
            }
        }
    }
    const timeTaken = perf_hooks_1.performance.now() - startTime;
    if (!found) {
        return { visitedNodes: visitedOrder, path: [], nodesVisited: visitedOrder.length, pathLength: 0, timeTaken };
    }
    // Reconstruct path between jump points and interpolate intermediate cells
    const jpPath = [];
    let cur = dstKey;
    while (cur !== null) {
        const [r, c] = cur.split(',').map(Number);
        jpPath.push({ row: r, col: c });
        cur = parent.get(cur) ?? null;
    }
    jpPath.reverse();
    // Interpolate between consecutive jump points
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
