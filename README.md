# GridLab

A grid-based pathfinding visualizer. Pick two points, pick an algorithm, watch it search.

<img width="200" height="50" alt="dark theme logo" src="https://github.com/user-attachments/assets/20e743e5-fdae-4e7c-b562-2cc414a55182" />
<img width="200" height="50" alt="light theme logo" src="https://github.com/user-attachments/assets/2a85b1b3-0121-4cfb-8bb6-ae372f5a43a5" />

## About GridLab

GridLab is a mini project I built for my CSE 4th semester Design and Analysis of Algorithms (DAA) coursework. It's a 50×50 interactive grid where you can place walls, set a start and end point, and watch pathfinding algorithms explore in real time. Live stats show nodes visited, path length, time taken, and complexity for each run.

It started as a way to actually *see* the difference between BFS and A* instead of just reading about it in a textbook, and grew from there: seven algorithms instead of six, a corridor-based maze generator alongside the original random walls, five terrain biomes with their own movement costs and obstacle types, a diagonal-movement toggle, and a side-by-side comparison mode for running two algorithms on the same grid at once.

<img width="1918" height="1026" alt="GridLab default dashboard view" src="https://github.com/user-attachments/assets/a81e3c8b-7de9-41ae-9563-5131f706055a" />
<img width="1918" height="1021" alt="Volcanic biome with a completed pathfinding run" src="https://github.com/user-attachments/assets/75fc231d-34d8-4f8d-a318-2ebde59558b0" />
<img width="1917" height="1023" alt="Maze mode showing generated corridors" src="https://github.com/user-attachments/assets/fa435151-0790-483f-a169-8dcdb497d660" />
<img width="1917" height="1026" alt="Comparison mode with two grids and the split stats panel" src="https://github.com/user-attachments/assets/e8a8e301-7bd9-4cc4-ac19-669a7f845c63" />

<img width="802" height="1600" alt="image" src="https://github.com/user-attachments/assets/97c21c24-a501-4597-a263-728af4b0dca2" />
<img width="807" height="1600" alt="image" src="https://github.com/user-attachments/assets/155116f8-60b6-42c3-8be8-a5d4c880789c" />
<img width="791" height="1600" alt="image" src="https://github.com/user-attachments/assets/8beddb3d-a0ed-4f33-ac82-204d673ca2b9" />
<img width="894" height="1599" alt="image" src="https://github.com/user-attachments/assets/35c7ca95-933f-475b-8d6f-50812da45041" />


## Algorithms

Seven algorithms, seven different ways of exploring the same grid.

#### 1. BFS

Explores the grid one distance-level at a time using a FIFO queue, visiting every neighbor at distance 1 before moving to distance 2, and so on. Because it never skips ahead to a farther node before finishing the closer ones, it's guaranteed to find the shortest path on an unweighted grid. The trade-off is that it explores in every direction equally, with no sense of where the goal actually is, so it can end up visiting far more nodes than necessary before reaching the destination.

#### 2. DFS

Commits to a single path and follows it as deep as possible before backtracking, using a stack instead of BFS's queue. It doesn't guarantee the shortest path. A promising-looking branch can lead into a long dead end that eats time before backtracking to try something else. What it's good at is being simple and fast, and it naturally suits problems where the goal is to explore a whole structure rather than find the shortest route through it.

#### 3. A\*

Balances how far it's already traveled against an estimate of how far is left, scoring each node as f(n) = g(n) + h(n) with a Manhattan-distance heuristic (Chebyshev when diagonal movement is on). This lets it head toward the goal instead of exploring blindly like BFS, while still guaranteeing the shortest path as long as the heuristic never overestimates the true distance, which both heuristics satisfy here. Set the heuristic to zero and A* reduces exactly to Dijkstra's algorithm. It isn't a separate algorithm in GridLab, just a special case of this one.

#### 4. JPS

Jump Point Search is an optimization built on top of A*, specifically for grid maps. Instead of expanding one cell at a time, it jumps over long straight corridors and only stops where the path could genuinely change direction, cutting down drastically on how many nodes actually enter the search. It finds the exact same optimal path as A*, just faster on open grids, though the advantage shrinks on maze-like layouts with lots of walls, since there are fewer long corridors to skip in the first place.

#### 5. Theta\*

A cousin of A* that produces smoother, more natural-looking paths by checking line-of-sight between a node and its grandparent and shortcutting directly there when the line is clear, skipping the current node entirely. This gets rid of A*'s staircase-y zig-zag on diagonal moves in favor of paths that look like how you'd actually walk them. Because "how far is genuinely left" only means something with real distance, Theta* uses true Euclidean distance for its costs and heuristic instead of counting grid steps like everything else here. It only makes sense with diagonal movement turned on, so selecting it locks the grid to 8-directional mode.

#### 6. Bi-BFS

Bidirectional BFS runs two BFS searches at once, one from the start and one from the end, and stops the instant the two frontiers meet. Since each side only has to search out to roughly half the total distance, the total area explored shrinks dramatically compared to a single BFS covering the whole distance from one side alone. The gain gets bigger the farther apart the start and end points are.

#### 7. Greedy

Picks whichever open node looks closest to the goal, using the heuristic alone with no memory of how far it's already traveled. That makes it fast, often visiting fewer nodes than A*, but it has no way to reconsider a decision once made, so it can walk straight into a dead end it didn't see coming and end up taking a longer route than necessary. It trades away the optimality guarantee for speed.

| Algorithm | Time Complexity | Guarantees Shortest Path |
|---|---|---|
| BFS | O(V + E) | Yes (unweighted grids) |
| DFS | O(V + E) | No |
| A* | O(E log V) | Yes |
| JPS | O(E log V) | Yes |
| Theta* | O(E log V) | Yes |
| Bi-BFS | O(b^(d/2)) | Yes (unweighted grids) |
| Greedy | O(E log V) | No |

## Features

#### 1. Random Walls vs. Maze Mode

Random is the default. Every cell independently has a 38% chance of being a wall, pure noise with no guaranteed structure. Maze mode swaps this for an actual recursive-backtracking generator that carves connected corridors instead of scattered noise, so runs look and behave completely differently: dead ends, winding routes, no random unreachable pockets.

#### 2. Biomes

Five themed terrains, each with its own movement cost and its own generation algorithm, not just a repainted version of the same noise. Plains lays down short winding river segments. Desert scatters individual cacti with zero clustering, so they read as sparse plants rather than clumps. Swamp and Volcanic both use cellular-automaton clustering (random fill, smoothed into organic blobs over a few passes) at different densities. Tundra grows glaciers with a directional flood-fill, so they come out as long winding ridges instead of round islands you can just walk around. Only A* and Theta* actually factor the biome's cost into their pathfinding. Every other algorithm treats every open cell as equal, same as on Classic.

#### 3. Diagonal Movement (4-DIR / 8-DIR)

Toggles whether algorithms can move diagonally instead of just up, down, left, and right. Corner-cutting is blocked. A diagonal step only works if both orthogonal cells around it are open, so a path can't clip through a wall's corner. JPS only supports 4-DIR and Theta* only makes sense in 8-DIR, so selecting either one auto-locks the toggle to whichever mode it needs.

#### 4. Comparison Mode

Runs two algorithms side by side on the exact same grid. Walls, start, and end stay perfectly synced between both sides no matter which one you paint on, so the comparison is actually fair. RUN BOTH fires both algorithms at once and turns into a STOP button while either is still animating. Reroll generates a fresh grid for both sides at once; Clear wipes the current run without touching the walls. Both sides also can't have the same algorithm selected at once, so the comparison always shows two different approaches.

#### 5. Reset, Reroll, and Speed

Reset (the eraser icon) clears the current run, path, visited nodes, and stats, without touching the grid itself. Reroll generates an entirely new grid. The speed slider controls how fast the visualization animates, from a slow step-by-step crawl to near-instant.

#### 6. Color Encoding

Green marks the start point, red marks the end point, blue marks nodes an algorithm has visited, and yellow marks the final path once one's found. Walls and open cells use whatever the current theme or biome sets. A few biomes swap the start, end, or visited color for something that won't blend into the terrain (Plains and Desert both change the start marker, for example, since default green reads too close to grass or cactus). The path and visited colors otherwise stay the same across every mode.

## Tech Stack

| Tech | Usage |
|---|---|
| React | UI framework: component rendering and state |
| TypeScript | Type safety across the codebase |
| Vite | Dev server and build tooling |
| Tailwind CSS | Utility-based styling |
| Framer Motion | Dropdown open/close animations, stats panel transitions, reroll icon rotation |
| clsx | Conditional className composition |
| tailwind-merge | Merging conflicting Tailwind classes |
| lucide-react | Icons (Eraser, chevrons, etc.) |

## Project Link

[https://nikhilvirdi.github.io/GridLab/](https://nikhilvirdi.github.io/GridLab/)
