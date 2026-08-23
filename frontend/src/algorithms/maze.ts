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
