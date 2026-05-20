"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const maze_1 = require("./algorithms/maze");
const bfs_1 = require("./algorithms/bfs");
const dfs_1 = require("./algorithms/dfs");
const astar_1 = require("./algorithms/astar");
const jps_1 = require("./algorithms/jps");
const bidirectional_bfs_1 = require("./algorithms/bidirectional-bfs");
const greedy_1 = require("./algorithms/greedy");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Configure CORS to allow access from frontend on port 5173
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '5mb' }));
// ─── Maze generation ────────────────────────────────────────────────────────
app.get('/api/maze', (req, res) => {
    try {
        const sizeParam = req.query.size;
        const size = sizeParam ? parseInt(sizeParam, 10) : 60;
        if (isNaN(size) || size < 2 || size > 200) {
            res.status(400).json({ error: 'Size must be an integer between 2 and 200.' });
            return;
        }
        const grid = (0, maze_1.generateMaze)(size);
        res.json({ grid, size });
    }
    catch (error) {
        console.error('Error generating maze:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// ─── Shared request validator ────────────────────────────────────────────────
function parseSolveRequest(req, res) {
    const { grid, start, end } = req.body;
    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
        res.status(400).json({ error: 'Invalid grid: must be a non-empty 2D array.' });
        return null;
    }
    if (typeof start?.row !== 'number' || typeof start?.col !== 'number' ||
        typeof end?.row !== 'number' || typeof end?.col !== 'number') {
        res.status(400).json({ error: 'Invalid start/end: must have numeric row and col fields.' });
        return null;
    }
    const rows = grid.length;
    const cols = grid[0].length;
    if (start.row < 0 || start.row >= rows || start.col < 0 || start.col >= cols ||
        end.row < 0 || end.row >= rows || end.col < 0 || end.col >= cols) {
        res.status(400).json({ error: 'start/end coordinates are out of grid bounds.' });
        return null;
    }
    return { grid, start, end };
}
// ─── Solve routes ───────────────────────────────────────────────────────────
app.post('/api/solve/bfs', (req, res) => {
    try {
        const body = parseSolveRequest(req, res);
        if (!body)
            return;
        res.json((0, bfs_1.solveBFS)(body));
    }
    catch (err) {
        console.error('BFS error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/solve/dfs', (req, res) => {
    try {
        const body = parseSolveRequest(req, res);
        if (!body)
            return;
        res.json((0, dfs_1.solveDFS)(body));
    }
    catch (err) {
        console.error('DFS error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/solve/astar', (req, res) => {
    try {
        const body = parseSolveRequest(req, res);
        if (!body)
            return;
        res.json((0, astar_1.solveAStar)(body));
    }
    catch (err) {
        console.error('A* error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/solve/jps', (req, res) => {
    try {
        const body = parseSolveRequest(req, res);
        if (!body)
            return;
        res.json((0, jps_1.solveJPS)(body));
    }
    catch (err) {
        console.error('JPS error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/solve/bidirectional-bfs', (req, res) => {
    try {
        const body = parseSolveRequest(req, res);
        if (!body)
            return;
        res.json((0, bidirectional_bfs_1.solveBidirectionalBFS)(body));
    }
    catch (err) {
        console.error('Bidirectional BFS error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/solve/greedy', (req, res) => {
    try {
        const body = parseSolveRequest(req, res);
        if (!body)
            return;
        res.json((0, greedy_1.solveGreedy)(body));
    }
    catch (err) {
        console.error('Greedy error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'OK' });
});
app.listen(PORT, () => {
    console.log(`GridLab backend running on port ${PORT}`);
});
