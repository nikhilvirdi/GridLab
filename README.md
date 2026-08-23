# GridLab

A grid-based pathfinding visualizer. Pick two points, pick an algorithm, watch it search.

<img width="200" height="50" alt="dark theme logo" src="https://github.com/user-attachments/assets/20e743e5-fdae-4e7c-b562-2cc414a55182" />
<img width="200" height="50" alt="light theme logo" src="https://github.com/user-attachments/assets/2a85b1b3-0121-4cfb-8bb6-ae372f5a43a5" />


## About GridLab

GridLab is a mini project I built for my CSE 4th semester Design and Analysis of Algorithms (DAA) coursework. It's a 50×50 interactive grid where you can place walls, set a start and end point, and watch six different pathfinding algorithms explore in real time. Live stats show nodes visited, path length, time taken, and complexity for each run.

It started as a way to actually *see* the difference between BFS and A* instead of just reading about it in a textbook, and turned into a small tool I kept polishing.

<img width="1918" height="1013" alt="inital screenshot" src="https://github.com/user-attachments/assets/a2231f02-303f-4e82-a245-2be4320215bd" />
<img width="1918" height="977" alt="final screenshot" src="https://github.com/user-attachments/assets/8e3dd516-6709-4347-bb9a-4f37608c0aa7" />


## Algorithms

Six algorithms, six different ways of exploring the same grid:

| Algorithm | Description | Time Complexity | Explores | Guarantees Shortest Path |
|---|---|---|---|---|
| [BFS](docs/bfs.md) | Explores all neighbors level by level. | O(V + E) | All directions, level by level | Yes (unweighted grids) |
| [DFS](docs/dfs.md) | Explores as deep as possible before backtracking. | O(V + E) | Depth-first, backtracks on dead ends | No |
| [A\*](docs/astar.md) | Uses heuristics to find the shortest path efficiently. Evaluates f(n) = g(n) + h(n). | O(E log V) | Heuristic-guided | Yes (unweighted grids) |
| [JPS](docs/jps.md) | An optimized version of A* for grid maps. Jumps over nodes to speed up path calculation. | O(E log V) | Heuristic-guided, jumps over nodes | Yes (unweighted grids) |
| [Bi-BFS](docs/bidirectional-bfs.md) | Runs two simultaneous breadth-first searches from start and end. Meets in the middle. | O(b^(d/2)) | Bidirectional, meets in the middle | Yes (unweighted grids) |
| [Greedy](docs/greedy.md) | Explores nodes based on heuristic estimate of distance to end. Fast but not optimal. | O(E log V) | Heuristic-guided | No |

Each algorithm name links to a writeup in `docs/`: theory, pseudocode, complexity derivation, implementations in Java/C++/Python/JS, trade-offs, and real-world use cases.

## Tech Stack

| Layer | Tech | Version |
|---|---|---|
| Frontend | React | ^19.2.6 |
| Frontend | TypeScript | ~6.0.2 |
| Frontend | Vite | ^8.0.12 |
| Frontend | Tailwind CSS | ^3.4.19 |
| Frontend | Framer Motion | ^12.39.0 |
| Frontend | clsx | ^2.1.1 |
| Frontend | tailwind-merge | ^3.6.0 |
| Backend | Node.js / Express | ^4.19.2 |
| Backend | TypeScript | ^5.4.5 |
| Backend | cors | ^2.8.5 |
| Backend | dotenv | ^16.4.5 |

## Project Link

<!-- add live deployed link here once GitHub Pages deploy is done -->
