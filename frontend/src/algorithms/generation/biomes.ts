export type BiomeId = 'classic' | 'plains' | 'desert' | 'swamp' | 'tundra' | 'volcanic';

export type TerrainGenType = 'noise' | 'clustered' | 'river' | 'glacier';

export interface BiomeConfig {
  id: BiomeId;
  label: string;
  obstacleLabel: string;
  cost: number;
  openDark: string;
  openLight: string;
  wallDark: string;
  wallLight: string;
  /** Which terrain generation strategy this biome uses in Random mode.
   *  Ignored for Classic (uses the original generateMaze) and for
   *  Maze/corridor mode (always uses generateCorridorMaze). */
  terrainType: TerrainGenType;
  /** Params below are interpreted differently depending on terrainType —
   *  only the fields relevant to the chosen type are read. */
  density?: number;       // 'noise' and 'clustered'
  iterations?: number;    // 'clustered' only
  pondCountMin?: number;      // 'river' only
  pondCountMax?: number;      // 'river' only
  pondSizeMin?: number;       // 'river' only
  pondSizeMax?: number;       // 'river' only
  riverCountMin?: number;     // 'river' only
  riverCountMax?: number;     // 'river' only
  riverWidthMin?: number;     // 'river' only
  riverWidthMax?: number;     // 'river' only
  riverLengthMin?: number;    // 'river' only
  riverLengthMax?: number;    // 'river' only
  singleBlockDensity?: number; // 'river' only
  blobCountMin?: number;  // 'glacier' only
  blobCountMax?: number;  // 'glacier' only
  blobMinSize?: number;      // 'glacier' only
  blobMaxSize?: number;      // 'glacier' only
  scatterDensity?: number;   // 'glacier' and 'clustered' — single-cell obstacles scattered across open cells
  scatterRadius?: number;    // 'clustered' only — when set, restricts scatter to cells within this radius of an existing obstacle (0/unset = scatter anywhere)
  /** Optional per-biome overrides for the four fixed marker colors (start,
   *  end, visited, path). Only set these when this biome's terrain colors
   *  actually clash with a default marker color — omit any field that
   *  doesn't need overriding, it will fall back to the Classic default via
   *  getMarkerColors(). Classic itself must never set any of these. */
  markerStart?: string;
  markerEnd?: string;
  markerVisited?: string;
  markerPath?: string;
}

/** The four marker colors used everywhere by default (Classic's colors,
 *  and the fallback for any biome that doesn't override a given marker). */
export const DEFAULT_MARKER_COLORS = {
  start: '#00e676',
  end: '#ff1744',
  visited: '#1a7fd4',
  path: '#f5c518',
};

/** Resolves the actual marker colors to use for a given biome — its own
 *  overrides where set, DEFAULT_MARKER_COLORS for anything left unset. */
export function getMarkerColors(biome: BiomeConfig) {
  return {
    start: biome.markerStart ?? DEFAULT_MARKER_COLORS.start,
    end: biome.markerEnd ?? DEFAULT_MARKER_COLORS.end,
    visited: biome.markerVisited ?? DEFAULT_MARKER_COLORS.visited,
    path: biome.markerPath ?? DEFAULT_MARKER_COLORS.path,
  };
}

export const BIOME_LIST: BiomeConfig[] = [
  {
    id: 'classic', label: 'CLASSIC', obstacleLabel: 'WALL', cost: 1,
    openDark: '#2d2d2d', openLight: '#ffffff',
    wallDark: '#111111', wallLight: '#1e293b',
    terrainType: 'noise', density: 0.38,
  },
  {
    id: 'plains', label: 'PLAINS', obstacleLabel: 'WATER', cost: 1,
    openDark: '#237227', openLight: '#237227',
    wallDark: '#30AFFF', wallLight: '#30AFFF',
    markerStart: '#5D4037', markerVisited: '#37474F',
    terrainType: 'river',
    pondCountMin: 8, pondCountMax: 12, pondSizeMin: 7, pondSizeMax: 8,
    riverCountMin: 12, riverCountMax: 20, riverWidthMin: 2, riverWidthMax: 3,
    riverLengthMin: 7, riverLengthMax: 15,
    singleBlockDensity: 0.08,
  },
  {
    id: 'desert', label: 'DESERT', obstacleLabel: 'CACTUS', cost: 2,
    openDark: '#FAE8B4', openLight: '#FAE8B4',
    wallDark: '#84c922', wallLight: '#84c922',
    markerStart: '#37474F',
    terrainType: 'noise', density: 0.192,
  },
  {
    id: 'swamp', label: 'SWAMP', obstacleLabel: 'BOG', cost: 3,
    openDark: '#828c51', openLight: '#828c51',
    wallDark: '#3e443c', wallLight: '#3e443c',
    terrainType: 'clustered', density: 0.42, iterations: 2, scatterDensity: 0.06,
  },
  {
    id: 'tundra', label: 'TUNDRA', obstacleLabel: 'ICE', cost: 2,
    openDark: '#3a4550', openLight: '#e3f2fd',
    wallDark: '#5c7a99', wallLight: '#78909c',
    terrainType: 'glacier', blobCountMin: 20, blobCountMax: 30, blobMinSize: 10, blobMaxSize: 33, scatterDensity: 0.14,
  },
  {
    id: 'volcanic', label: 'VOLCANIC', obstacleLabel: 'LAVA', cost: 4,
    openDark: '#3d2626', openLight: '#8d6e63',
    wallDark: '#e65100', wallLight: '#ff6f00',
    markerEnd: '#CFD8DC',
    terrainType: 'clustered', density: 0.38, iterations: 4, scatterDensity: 0.18, scatterRadius: 3,
  },
];

export const BIOME_MAP: Record<BiomeId, BiomeConfig> = Object.fromEntries(
  BIOME_LIST.map((b) => [b.id, b])
) as Record<BiomeId, BiomeConfig>;
