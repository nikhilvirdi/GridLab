import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateMaze } from './algorithms/maze';
import { solveBFS } from './algorithms/bfs';
import { solveDFS } from './algorithms/dfs';
import { solveAStar } from './algorithms/astar';
import { solveJPS } from './algorithms/jps';
import { solveBidirectionalBFS } from './algorithms/bidirectional-bfs';
import { solveGreedy } from './algorithms/greedy';
import type { SolveRequest } from './algorithms/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS to allow access from frontend on port 5173
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5mb' }));

// ─── Maze generation ────────────────────────────────────────────────────────
app.get('/api/maze', (req: Request, res: Response) => {
  try {
    const sizeParam = req.query.size;
    const size = sizeParam ? parseInt(sizeParam as string, 10) : 50;

    if (isNaN(size) || size < 2 || size > 200) {
      res.status(400).json({ error: 'Size must be an integer between 2 and 200.' });
      return;
    }

    const grid = generateMaze(size);
    res.json({ grid, size });
  } catch (error) {
    console.error('Error generating maze:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── Shared request validator ────────────────────────────────────────────────
function parseSolveRequest(req: Request, res: Response): SolveRequest | null {
  const { grid, start, end } = req.body;

  if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
    res.status(400).json({ error: 'Invalid grid: must be a non-empty 2D array.' });
    return null;
  }

  if (
    typeof start?.row !== 'number' || typeof start?.col !== 'number' ||
    typeof end?.row !== 'number'   || typeof end?.col !== 'number'
  ) {
    res.status(400).json({ error: 'Invalid start/end: must have numeric row and col fields.' });
    return null;
  }

  const rows = grid.length;
  const cols = grid[0].length;

  if (
    start.row < 0 || start.row >= rows || start.col < 0 || start.col >= cols ||
    end.row   < 0 || end.row   >= rows || end.col   < 0 || end.col   >= cols
  ) {
    res.status(400).json({ error: 'start/end coordinates are out of grid bounds.' });
    return null;
  }

  return { grid, start, end };
}

// ─── Solve routes ───────────────────────────────────────────────────────────

app.post('/api/solve/bfs', (req: Request, res: Response) => {
  try {
    const body = parseSolveRequest(req, res);
    if (!body) return;
    res.json(solveBFS(body));
  } catch (err) {
    console.error('BFS error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/solve/dfs', (req: Request, res: Response) => {
  try {
    const body = parseSolveRequest(req, res);
    if (!body) return;
    res.json(solveDFS(body));
  } catch (err) {
    console.error('DFS error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/solve/astar', (req: Request, res: Response) => {
  try {
    const body = parseSolveRequest(req, res);
    if (!body) return;
    res.json(solveAStar(body));
  } catch (err) {
    console.error('A* error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/solve/jps', (req: Request, res: Response) => {
  try {
    const body = parseSolveRequest(req, res);
    if (!body) return;
    res.json(solveJPS(body));
  } catch (err) {
    console.error('JPS error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/solve/bidirectional-bfs', (req: Request, res: Response) => {
  try {
    const body = parseSolveRequest(req, res);
    if (!body) return;
    res.json(solveBidirectionalBFS(body));
  } catch (err) {
    console.error('Bidirectional BFS error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/solve/greedy', (req: Request, res: Response) => {
  try {
    const body = parseSolveRequest(req, res);
    if (!body) return;
    res.json(solveGreedy(body));
  } catch (err) {
    console.error('Greedy error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`GridLab backend running on port ${PORT}`);
});
