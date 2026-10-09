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
export function generateClusteredTerrain(
  N: number, density: number, iterations: number,
  scatterDensity: number = 0, scatterRadius: number = 0
): number[][] {
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
        // Out-of-bounds neighbors are simply skipped rather than counted
        // as obstacles. Counting them as obstacles artificially inflates
        // neighbor counts near the grid edges, which biases the survival
        // threshold and causes the interior to die out over multiple
        // iterations while a ring of obstacles survives only along the
        // border. Skipping keeps the rule spatially uniform across the
        // whole grid.
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
        if (g[nr][nc] === 1) count++;
      }
    }
    return count;
  };

  for (let iter = 0; iter < iterations; iter++) {
    const next: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // Threshold of 4 (rather than 5) out of up to 8 neighbors is a
        // standard, well-tested cave-generation survival rule — stable
        // enough to sustain organic clusters across multiple smoothing
        // passes without the whole grid decaying toward empty, while
        // still smoothing scattered noise into coherent blobs.
        next[r][c] = countObstacleNeighbors(grid, r, c) >= 4 ? 1 : 0;
      }
    }
    grid = next;
  }

  // Optional second pass: scatter additional single-cell obstacles on
  // top of the clustered terrain. When scatterRadius is 0 (default),
  // scatter applies uniformly across all open cells — this is the
  // original behavior, unchanged for any existing caller (e.g. Swamp).
  // When scatterRadius > 0, scatter is restricted to open cells within
  // that radius of an EXISTING obstacle cell — producing spatter/debris
  // clustered near the main obstacle masses (e.g. lava embers near
  // pools) rather than scattered randomly across the whole grid.
  if (scatterDensity > 0) {
    if (scatterRadius > 0) {
      const isNearObstacle = (r: number, c: number): boolean => {
        for (let dr = -scatterRadius; dr <= scatterRadius; dr++) {
          for (let dc = -scatterRadius; dc <= scatterRadius; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && grid[nr][nc] === 1) {
              return true;
            }
          }
        }
        return false;
      };
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (grid[r][c] === 0 && isNearObstacle(r, c) && Math.random() < scatterDensity) {
            grid[r][c] = 1;
          }
        }
      }
    } else {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (grid[r][c] === 0 && Math.random() < scatterDensity) {
            grid[r][c] = 1;
          }
        }
      }
    }
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
export function generateRiverTerrain(
  N: number,
  pondCountMin: number, pondCountMax: number, pondSizeMin: number, pondSizeMax: number,
  riverCountMin: number, riverCountMax: number, riverWidthMin: number, riverWidthMax: number,
  riverLengthMin: number, riverLengthMax: number,
  singleBlockDensity: number
): number[][] {
  if (N <= 0) return [];

  const grid: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Pass 1: small round ponds via flood-fill growth from a random seed —
  // round shape is fine and natural-looking for a small pond.
  const pondCount = pondCountMin + Math.floor(Math.random() * (pondCountMax - pondCountMin + 1));
  for (let p = 0; p < pondCount; p++) {
    const size = pondSizeMin + Math.floor(Math.random() * (pondSizeMax - pondSizeMin + 1));
    const startR = Math.floor(Math.random() * N);
    const startC = Math.floor(Math.random() * N);
    const visited = new Set<string>([`${startR},${startC}`]);
    grid[startR][startC] = 1;
    const frontier: [number, number][] = [[startR, startC]];
    let count = 1;
    let attempts = 0;
    const maxAttempts = size * 30;
    while (count < size && frontier.length > 0 && attempts < maxAttempts) {
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

  // Pass 2: short thin rivers/streams, distinct from ponds — narrow
  // (2-3 wide), short (7-15 long), random orientation, gentle wander.
  const riverCount = riverCountMin + Math.floor(Math.random() * (riverCountMax - riverCountMin + 1));
  for (let i = 0; i < riverCount; i++) {
    const width = riverWidthMin + Math.floor(Math.random() * (riverWidthMax - riverWidthMin + 1));
    const length = riverLengthMin + Math.floor(Math.random() * (riverLengthMax - riverLengthMin + 1));
    const isVertical = Math.random() < 0.5;
    const widthStartOffset = -Math.floor((width - 1) / 2);
    let currentDelta = 0;

    if (isVertical) {
      const startRow = Math.floor(Math.random() * Math.max(1, N - length));
      let col = Math.floor(Math.random() * N);
      for (let step = 0; step < length; step++) {
        const row = startRow + step;
        if (Math.random() < 0.4) currentDelta = Math.floor(Math.random() * 3) - 1;
        col = Math.max(0, Math.min(N - 1, col + currentDelta));
        for (let dw = 0; dw < width; dw++) {
          const c = col + widthStartOffset + dw;
          if (c >= 0 && c < N && row >= 0 && row < N) grid[row][c] = 1;
        }
      }
    } else {
      const startCol = Math.floor(Math.random() * Math.max(1, N - length));
      let row = Math.floor(Math.random() * N);
      for (let step = 0; step < length; step++) {
        const col = startCol + step;
        if (Math.random() < 0.4) currentDelta = Math.floor(Math.random() * 3) - 1;
        row = Math.max(0, Math.min(N - 1, row + currentDelta));
        for (let dw = 0; dw < width; dw++) {
          const r = row + widthStartOffset + dw;
          if (r >= 0 && r < N && col >= 0 && col < N) grid[r][col] = 1;
        }
      }
    }
  }

  // Pass 3: scattered single-cell water drops on whatever ground is
  // still open, adding fine-grained decision points throughout.
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c] === 0 && Math.random() < singleBlockDensity) {
        grid[r][c] = 1;
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
  N: number, blobCountMin: number, blobCountMax: number, blobMinSize: number, blobMaxSize: number,
  scatterDensity: number
): number[][] {
  if (N <= 0) return [];

  const grid: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  const blobCount = blobCountMin + Math.floor(Math.random() * (blobCountMax - blobCountMin + 1));

  for (let b = 0; b < blobCount; b++) {
    const targetSize = blobMinSize + Math.floor(Math.random() * (blobMaxSize - blobMinSize + 1));
    const startR = Math.floor(Math.random() * N);
    const startC = Math.floor(Math.random() * N);

    const visited = new Set<string>([`${startR},${startC}`]);
    grid[startR][startC] = 1;
    const frontier: [number, number][] = [[startR, startC]];
    let count = 1;

    // Directional momentum: growth strongly prefers continuing in the
    // same direction as the previous successful step, producing long
    // winding ridge/ice-shelf shapes instead of round compact blobs.
    // Round blobs are easy to skirt around regardless of how many exist;
    // elongated ridges force real detours since a path can't simply step
    // past one edge the way it can with a compact island.
    let momentumDir = DIRS[Math.floor(Math.random() * DIRS.length)];

    let attempts = 0;
    const maxAttempts = targetSize * 40;

    while (count < targetSize && frontier.length > 0 && attempts < maxAttempts) {
      attempts++;
      const idx = Math.floor(Math.random() * frontier.length);
      const [r, c] = frontier[idx];

      let [dr, dc] = momentumDir;
      if (Math.random() < 0.3) {
        [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
        momentumDir = [dr, dc];
      }

      const nr = r + dr, nc = c + dc;
      const key = `${nr},${nc}`;

      if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited.has(key)) {
        visited.add(key);
        grid[nr][nc] = 1;
        frontier.push([nr, nc]);
        count++;
      } else {
        // Blocked, out of bounds, or already visited in the current
        // direction — pick a fresh random momentum direction so growth
        // doesn't stall permanently against an edge or itself.
        momentumDir = DIRS[Math.floor(Math.random() * DIRS.length)];
      }
    }
  }

  // Second pass: scatter individual single-cell ice blockers across
  // remaining open cells, on top of the large glacier clusters —
  // mirroring how real tundra has loose ice chunks in addition to big
  // glaciers, and forcing genuine decisions in the open areas between
  // glacier masses instead of leaving them fully clear.
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c] === 0 && Math.random() < scatterDensity) {
        grid[r][c] = 1;
      }
    }
  }

  return grid;
}
