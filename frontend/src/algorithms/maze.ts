/**
 * Generates an N x N grid of cells where roughly 35%-40% are randomly wall cells.
 * Returns a 2D array where 0 = open cell and 1 = wall cell.
 */
export function generateMaze(N: number): number[][] {
  if (N <= 0) return [];
  
  const grid: number[][] = [];
  // Use a density of 38% (which lies in the requested 35%-40% range)
  const wallDensity = 0.38;

  for (let r = 0; r < N; r++) {
    const row: number[] = [];
    for (let c = 0; c < N; c++) {
      row.push(Math.random() < wallDensity ? 1 : 0);
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Generates an N x N grid using recursive backtracking (randomized DFS) on a
 * virtual half-size logical grid, producing guaranteed-connected maze corridors
 * instead of random noise. N must be even for a clean mapping (GridLab uses 50).
 *
 * Technique: the logical maze has M = N/2 cells. Each logical cell (i, j) maps
 * to grid position (2i, 2j), which is always carved open ("room"). The grid
 * cell directly between two adjacent logical cells (the "wall" position) is
 * carved open only if a passage was carved between those two logical cells
 * during generation — otherwise it remains a wall. This produces a fully
 * connected maze with 1-cell-wide walls between corridors, fitting exactly
 * into the existing N x N grid format with no remainder or edge cases, since
 * N is even and M = N/2 is an integer.
 *
 * Returns a 2D array where 0 = open cell and 1 = wall cell, matching the same
 * format as generateMaze.
 */
export function generateCorridorMaze(N: number): number[][] {
  if (N <= 0 || N % 2 !== 0) return [];

  const M = N / 2;
  // Initialize the full N x N grid as entirely walls.
  const grid: number[][] = Array.from({ length: N }, () => Array(N).fill(1));

  const visited: boolean[][] = Array.from({ length: M }, () => Array(M).fill(false));

  const carveCellRoom = (i: number, j: number) => {
    grid[2 * i][2 * j] = 0;
  };

  const carveConnector = (i1: number, j1: number, i2: number, j2: number) => {
    // The connector cell sits exactly between the two logical cells.
    const r = i1 + i2; // sum of two adjacent indices = the doubled midpoint row
    const c = j1 + j2;
    grid[r][c] = 0;
  };

  const getUnvisitedNeighbors = (i: number, j: number): [number, number][] => {
    const candidates: [number, number][] = [
      [i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]
    ];
    return candidates.filter(
      ([ni, nj]) => ni >= 0 && ni < M && nj >= 0 && nj < M && !visited[ni][nj]
    );
  };

  // Iterative stack-based recursive backtracking (avoids recursion depth issues
  // on large grids, consistent with the existing DFS solver's iterative style).
  const startI = 0, startJ = 0;
  visited[startI][startJ] = true;
  carveCellRoom(startI, startJ);
  const stack: [number, number][] = [[startI, startJ]];

  while (stack.length > 0) {
    const [ci, cj] = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(ci, cj);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const [ni, nj] = neighbors[Math.floor(Math.random() * neighbors.length)];
    visited[ni][nj] = true;
    carveCellRoom(ni, nj);
    carveConnector(ci, cj, ni, nj);
    stack.push([ni, nj]);
  }

  return grid;
}
