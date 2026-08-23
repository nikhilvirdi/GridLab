# A* — A-Star Search

## Theory

A* improves on BFS by using a heuristic to guide the search toward the destination instead of expanding blindly in every direction. It scores each node with `f(n) = g(n) + h(n)`:

- `g(n)`: the actual cost to reach node `n` from the start (number of steps taken so far).
- `h(n)`: an estimate of the remaining cost from `n` to the destination.

At each step, A* expands the node with the lowest `f` score, the one that looks most promising overall, not just the closest one visited so far.

The heuristic used here is Manhattan distance: `|Δrow| + |Δcol|`. On a 4-directional grid with no diagonal movement, Manhattan distance is exactly the minimum number of steps needed to reach a cell if no walls existed. Since walls can only make the real distance longer, never shorter, the heuristic never overestimates the true cost. This property is called admissibility, and it's what guarantees A* finds the optimal (shortest) path, not just a fast one.

Worth noting: if you strip the heuristic out entirely, setting `h(n) = 0` for every node, A* reduces exactly to Dijkstra's algorithm. Dijkstra isn't a separate algorithm here so much as a special case of A* with no lookahead.

## Pseudocode

```
function AStar(grid, start, end):
    if start == end: return [start]
    if grid[start] is wall or grid[end] is wall: return no path

    openSet = min-heap ordered by f-score, seeded with (h(start, end), start)
    gCost = {start: 0}
    parent = {start: null}
    closed = {}

    while openSet is not empty:
        current = openSet.pop_min()
        if current in closed: continue
        closed.add(current)

        if current == end:
            return reconstruct_path(parent, end)

        for neighbor in 4-directional neighbors(current):
            if neighbor is in bounds and not a wall and not in closed:
                tentative_g = gCost[current] + 1
                if tentative_g < gCost.get(neighbor, infinity):
                    gCost[neighbor] = tentative_g
                    parent[neighbor] = current
                    f = tentative_g + manhattan(neighbor, end)
                    openSet.push(f, neighbor)

    return no path
```

## Complexity Derivation

**Time: O(E log V)**

Each edge examined can trigger a push onto the priority queue (when a shorter path to a neighbor is found). Pushing and popping from a binary heap costs O(log V) each. With up to E edge relaxations across the whole run, and each one paying that log V heap cost, the total comes out to O(E log V).

This is the price A* pays compared to BFS's O(V + E): maintaining a priority queue instead of a plain FIFO queue costs a log factor per operation. What that log factor buys is the ability to explore the most promising nodes first, which in practice means far fewer nodes get expanded before the destination is found, even though the worst-case bound is technically higher than BFS's.

**Space: O(V)**

`gCost`, `parent`, and `closed` each hold at most one entry per node. The heap can briefly hold more entries than V, since a node can be pushed again if a cheaper path to it is found later, but that count is still bounded by the number of edges, so it doesn't change the overall space class.

## Implementations

**Java**
```java
import java.util.*;

public class AStarSolver {
    public static List<int[]> astar(int[][] grid, int[] start, int[] end) {
        int rows = grid.length, cols = grid[0].length;
        int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};

        PriorityQueue<int[]> openSet = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        Map<String, Integer> gCost = new HashMap<>();
        Map<String, int[]> parent = new HashMap<>();
        Set<String> closed = new HashSet<>();

        String startKey = start[0] + "," + start[1];
        String endKey = end[0] + "," + end[1];

        gCost.put(startKey, 0);
        parent.put(startKey, null);
        openSet.add(new int[]{manhattan(start, end), start[0], start[1]});

        while (!openSet.isEmpty()) {
            int[] item = openSet.poll();
            int cr = item[1], cc = item[2];
            String currKey = cr + "," + cc;
            if (closed.contains(currKey)) continue;
            closed.add(currKey);

            if (currKey.equals(endKey)) break;

            int g = gCost.get(currKey);

            for (int[] d : dirs) {
                int nr = cr + d[0], nc = cc + d[1];
                String nKey = nr + "," + nc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] == 1 || closed.contains(nKey))
                    continue;

                int newG = g + 1;
                int existingG = gCost.getOrDefault(nKey, Integer.MAX_VALUE);
                if (newG < existingG) {
                    gCost.put(nKey, newG);
                    parent.put(nKey, new int[]{cr, cc});
                    int f = newG + manhattan(new int[]{nr, nc}, end);
                    openSet.add(new int[]{f, nr, nc});
                }
            }
        }

        if (!closed.contains(endKey)) return new ArrayList<>();

        LinkedList<int[]> path = new LinkedList<>();
        int[] cur = end;
        while (cur != null) {
            path.addFirst(cur);
            cur = parent.get(cur[0] + "," + cur[1]);
        }
        return path;
    }

    private static int manhattan(int[] a, int[] b) {
        return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    }
}
```

**C++**
```cpp
#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <string>
#include <climits>
#include <algorithm>
using namespace std;

int manhattan(pair<int,int> a, pair<int,int> b) {
    return abs(a.first - b.first) + abs(a.second - b.second);
}

vector<pair<int,int>> astar(vector<vector<int>>& grid, pair<int,int> start, pair<int,int> end) {
    int rows = grid.size(), cols = grid[0].size();
    vector<pair<int,int>> dirs = {{-1,0},{1,0},{0,-1},{0,1}};

    // min-heap of (f, row, col)
    priority_queue<tuple<int,int,int>, vector<tuple<int,int,int>>, greater<>> openSet;
    unordered_map<string, int> gCost;
    unordered_map<string, pair<int,int>> parent;
    unordered_set<string> closed;

    auto key = [](pair<int,int> p) { return to_string(p.first) + "," + to_string(p.second); };

    gCost[key(start)] = 0;
    parent[key(start)] = {-1, -1};
    openSet.push({manhattan(start, end), start.first, start.second});

    while (!openSet.empty()) {
        auto [f, cr, cc] = openSet.top(); openSet.pop();
        string currKey = to_string(cr) + "," + to_string(cc);
        if (closed.count(currKey)) continue;
        closed.insert(currKey);

        if (make_pair(cr, cc) == end) break;

        int g = gCost[currKey];

        for (auto& d : dirs) {
            int nr = cr + d.first, nc = cc + d.second;
            string nKey = to_string(nr) + "," + to_string(nc);
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] == 1 || closed.count(nKey))
                continue;

            int newG = g + 1;
            int existingG = gCost.count(nKey) ? gCost[nKey] : INT_MAX;
            if (newG < existingG) {
                gCost[nKey] = newG;
                parent[nKey] = {cr, cc};
                int fScore = newG + manhattan({nr, nc}, end);
                openSet.push({fScore, nr, nc});
            }
        }
    }

    if (!closed.count(key(end))) return {};

    vector<pair<int,int>> path;
    pair<int,int> cur = end;
    while (cur.first != -1) {
        path.push_back(cur);
        cur = parent[key(cur)];
    }
    reverse(path.begin(), path.end());
    return path;
}
```

**Python**
```python
import heapq

def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def astar(grid, start, end):
    rows, cols = len(grid), len(grid[0])
    dirs = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    open_set = [(manhattan(start, end), start)]
    g_cost = {start: 0}
    parent = {start: None}
    closed = set()

    while open_set:
        _, curr = heapq.heappop(open_set)
        if curr in closed:
            continue
        closed.add(curr)

        if curr == end:
            break

        g = g_cost[curr]

        for dr, dc in dirs:
            nr, nc = curr[0] + dr, curr[1] + dc
            neighbor = (nr, nc)
            if nr < 0 or nr >= rows or nc < 0 or nc >= cols or grid[nr][nc] == 1 or neighbor in closed:
                continue

            new_g = g + 1
            if new_g < g_cost.get(neighbor, float('inf')):
                g_cost[neighbor] = new_g
                parent[neighbor] = curr
                f = new_g + manhattan(neighbor, end)
                heapq.heappush(open_set, (f, neighbor))

    if end not in closed:
        return []

    path = []
    curr = end
    while curr is not None:
        path.append(curr)
        curr = parent[curr]
    path.reverse()
    return path
```

**JavaScript**
```javascript
class MinHeap {
  constructor() { this.heap = []; }
  get size() { return this.heap.length; }

  push(priority, point) {
    this.heap.push([priority, point]);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent][0] <= this.heap[i][0]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _siftDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l][0] < this.heap[smallest][0]) smallest = l;
      if (r < n && this.heap[r][0] < this.heap[smallest][0]) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function astar(grid, start, end) {
  const rows = grid.length, cols = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const key = (r, c) => `${r},${c}`;

  const openSet = new MinHeap();
  const gCost = new Map([[key(start[0], start[1]), 0]]);
  const parent = new Map([[key(start[0], start[1]), null]]);
  const closed = new Set();

  openSet.push(manhattan(start, end), start);

  while (openSet.size > 0) {
    const [, curr] = openSet.pop();
    const currKey = key(curr[0], curr[1]);
    if (closed.has(currKey)) continue;
    closed.add(currKey);

    if (currKey === key(end[0], end[1])) break;

    const g = gCost.get(currKey);

    for (const [dr, dc] of dirs) {
      const nr = curr[0] + dr, nc = curr[1] + dc;
      const nKey = key(nr, nc);
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] === 1 || closed.has(nKey))
        continue;

      const newG = g + 1;
      const existingG = gCost.get(nKey) ?? Infinity;
      if (newG < existingG) {
        gCost.set(nKey, newG);
        parent.set(nKey, curr);
        openSet.push(newG + manhattan([nr, nc], end), [nr, nc]);
      }
    }
  }

  const endKey = key(end[0], end[1]);
  if (!closed.has(endKey)) return [];

  const path = [];
  let curr = end;
  while (curr !== null) {
    path.push(curr);
    curr = parent.get(key(curr[0], curr[1]));
  }
  path.reverse();
  return path;
}
```

## Trade-offs

A* is both optimal and efficient when the heuristic is admissible, which Manhattan distance is on this grid. It expands far fewer nodes than BFS in practice, since it prioritizes cells that actually move toward the goal instead of exploring uniformly outward in every direction.

The cost is the heap. Every push and pop carries a log V overhead that BFS's plain queue doesn't have, and the algorithm has to compute a heuristic value for every node it considers. On this grid, Manhattan distance is a single subtraction and addition, so that cost is negligible. On problems with more expensive heuristics, that per-node overhead can matter more.

## Real-World Use Case

GPS and turn-by-turn navigation systems, pathfinding in games (RTS unit movement, RPG NPC navigation), robotics motion planning, and network routing protocols where minimizing hops or latency matters and a reasonable distance estimate is available.
