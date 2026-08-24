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
  riverCount?: number;    // 'river' only
  riverWidth?: number;    // 'river' only
  blobCount?: number;     // 'glacier' only
  blobMinSize?: number;   // 'glacier' only
  blobMaxSize?: number;   // 'glacier' only
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
    openDark: '#2f6b1f', openLight: '#2f6b1f',
    wallDark: '#1f7ea1', wallLight: '#1f7ea1',
    terrainType: 'river', riverCount: 3, riverWidth: 3,
  },
  {
    id: 'desert', label: 'DESERT', obstacleLabel: 'CACTUS', cost: 2,
    openDark: '#FAE8B4', openLight: '#FAE8B4',
    wallDark: '#84c922', wallLight: '#84c922',
    terrainType: 'noise', density: 0.05,
  },
  {
    id: 'swamp', label: 'SWAMP', obstacleLabel: 'BOG', cost: 3,
    openDark: '#828c51', openLight: '#828c51',
    wallDark: '#3e443c', wallLight: '#3e443c',
    terrainType: 'clustered', density: 0.30, iterations: 3,
  },
  {
    id: 'tundra', label: 'TUNDRA', obstacleLabel: 'ICE', cost: 2,
    openDark: '#3a4550', openLight: '#e3f2fd',
    wallDark: '#5c7a99', wallLight: '#78909c',
    terrainType: 'glacier', blobCount: 8, blobMinSize: 60, blobMaxSize: 180,
  },
  {
    id: 'volcanic', label: 'VOLCANIC', obstacleLabel: 'LAVA', cost: 4,
    openDark: '#3d2626', openLight: '#8d6e63',
    wallDark: '#e65100', wallLight: '#ff6f00',
    terrainType: 'clustered', density: 0.32, iterations: 4,
  },
];

export const BIOME_MAP: Record<BiomeId, BiomeConfig> = Object.fromEntries(
  BIOME_LIST.map((b) => [b.id, b])
) as Record<BiomeId, BiomeConfig>;
