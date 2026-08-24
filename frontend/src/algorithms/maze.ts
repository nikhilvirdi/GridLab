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

/**
 * Generates an N x N grid with naturally clustered terrain instead of
 * uniform random noise, using a cellular-automaton smoothing pass (a
 * standard technique for organic cave/terrain generation). Starts with
 * independent random cells at `density` probability, then applies
 * `iterations` rounds of smoothing: each cell's next state depends on how
 * many of its 8 neighbors are currently obstacles (5 or more neighbors ->
 * becomes/stays an obstacle, fewer -> becomes/stays open). This causes
 * scattered noise to coalesce into organic blobs (dunes, ponds, glaciers,
 * lava pools) instead of salt-and-pepper static.
 *
 * With iterations = 0, this reduces to plain random noise at the given
 * density — used for sparse, non-clustered obstacles (e.g. desert cacti,
 * which should look like individual scattered plants, not clumps).
 *
 * Like generateMaze, this does not guarantee connectivity between any
 * two cells — the app already handles the "no path found" case.
 *
 * Returns a 2D array where 0 = open cell and 1 = obstacle cell, matching
 * the same format as generateMaze and generateCorridorMaze.
 */
export function generateClusteredTerrain(N: number, density: number, iterations: number): number[][] {
  if (N <= 0) return [];

  let grid: number[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => (Math.random() < density ? 1 : 0))
  );

  const countObstacleNeighbors = (g: number[][], r: number, c: number): number => {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) {
          count++; // treat out-of-bounds as obstacle — keeps clusters from bleeding oddly at edges
        } else if (g[nr][nc] === 1) {
          count++;
        }
      }
    }
    return count;
  };

  for (let iter = 0; iter < iterations; iter++) {
    const next: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        next[r][c] = countObstacleNeighbors(grid, r, c) >= 5 ? 1 : 0;
      }
    }
    grid = next;
  }

  return grid;
}

/**
 * Generates an N x N grid with a handful of winding "river" paths of
 * water cutting across the grid from top to bottom, instead of blobby
 * clustered ponds. Each river does a constrained random walk: at every
 * row, its center column drifts by -1, 0, or +1, and a band of `width`
 * cells around that center is marked as water. This produces natural
 * snaking river shapes rather than round lake-like blobs.
 *
 * Returns a 2D array where 0 = open land and 1 = water (obstacle).
 */
export function generateRiverTerrain(N: number, riverCount: number, width: number): number[][] {
  if (N <= 0) return [];

  const grid: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  const halfWidth = Math.floor(width / 2);

  for (let i = 0; i < riverCount; i++) {
    let col = Math.floor(Math.random() * N);
    for (let row = 0; row < N; row++) {
      col += Math.floor(Math.random() * 3) - 1; // drift -1, 0, or +1
      col = Math.max(0, Math.min(N - 1, col));
      for (let dc = -halfWidth; dc <= halfWidth; dc++) {
        const c = col + dc;
        if (c >= 0 && c < N) grid[row][c] = 1;
      }
    }
  }

  return grid;
}

/**
 * Generates an N x N grid with a small number of large, solid blob
 * shapes ("glaciers") instead of many small scattered clusters. Each
 * blob is grown from a random seed cell via randomized flood-fill: at
 * each growth step, a random cell already in the blob's frontier expands
 * into one of its unvisited neighbors, until the blob reaches a random
 * target size between blobMinSize and blobMaxSize. This produces a
 * handful of large, organically-shaped solid regions rather than the
 * many-small-clumps look of cellular-automaton smoothing.
 *
 * Returns a 2D array where 0 = open ground and 1 = glacier (obstacle).
 */
export function generateGlacierTerrain(
  N: number, blobCount: number, blobMinSize: number, blobMaxSize: number
): number[][] {
  if (N <= 0) return [];

  const grid: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let b = 0; b < blobCount; b++) {
    const targetSize = blobMinSize + Math.floor(Math.random() * (blobMaxSize - blobMinSize + 1));
    const startR = Math.floor(Math.random() * N);
    const startC = Math.floor(Math.random() * N);

    const visited = new Set<string>([`${startR},${startC}`]);
    grid[startR][startC] = 1;
    const frontier: [number, number][] = [[startR, startC]];
    let count = 1;

    // Safety cap prevents an unlucky frontier (fully boxed-in) from
    // looping forever without reaching targetSize.
    let attempts = 0;
    const maxAttempts = targetSize * 30;

    while (count < targetSize && frontier.length > 0 && attempts < maxAttempts) {
      attempts++;
      const idx = Math.floor(Math.random() * frontier.length);
      const [r, c] = frontier[idx];
      const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
      const nr = r + dr, nc = c + dc;
      const key = `${nr},${nc}`;

      if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited.has(key)) {
        visited.add(key);
        grid[nr][nc] = 1;
        frontier.push([nr, nc]);
        count++;
      }
    }
  }

  return grid;
}
