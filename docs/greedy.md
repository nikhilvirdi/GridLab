# Greedy — Greedy Best-First Search

## Theory

Greedy Best-First Search picks the next node to expand based purely on `h(n)`, the Manhattan distance to the goal, and ignores `g(n)` entirely, the cost already spent getting there. Where A* balances "how far have I come" against "how far is left," Greedy only ever asks the second question. This makes it directionally biased toward the goal from the very first step: it always reaches for whichever open node currently looks closest to the destination.

Structurally it reuses the same components as A*: a min-heap, a closed set, a parent map, the same Manhattan heuristic. The difference is in what goes into the heap. A* pushes `f(n) = g(n) + h(n)`. Greedy pushes `h(n)` alone.

There's a second, easy-to-miss difference in how this implementation assigns parents: once a node's parent is set (on first discovery), it's never revisited or updated, even if a cheaper route to that same node turns up later. A* actively relaxes edges, replacing a node's recorded path if a shorter one is found. Greedy does not, since it has no cost tracking to compare against in the first place.

Both of these choices are what make Greedy fast but unreliable. Because it commits early and never reconsiders, it can chase a path that looks locally promising (steadily getting closer to the goal) but leads straight into an obstacle it then has to fully skirt around, something A* would have avoided by weighing the actual cost of that detour against alternatives. This is the classic local-minima trap the algorithm is known for.

## Pseudocode

```
function Greedy(grid, start, end):
    if start == end: return [start]
    if grid[start] is wall or grid[end] is wall: return no path

    openSet = min-heap ordered by h-score, seeded with (h(start, end), start)
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
                if neighbor not already in parent:
                    parent[neighbor] = current
                    openSet.push(manhattan(neighbor, end), neighbor)

    return no path
```

## Complexity Derivation

**Time: O(E log V)**

Same structural bound as A*: every edge examined can trigger a heap push, and each push or pop costs O(log V). The heap-driven exploration pattern is identical between the two algorithms, so they share the same complexity class.

What differs is solution quality, not speed. Complexity class and correctness are separate properties: A* and Greedy are equally fast in the worst case, but only A* is guaranteed to find the shortest path. Greedy's lack of cost relaxation (no going back to update a node's parent once assigned) doesn't cost it anything in the time bound, but it's exactly why the path it finds isn't guaranteed to be optimal.

**Space: O(V)**

`parent` and `closed` each hold at most one entry per node visited, same reasoning as A* and BFS.

## Implementations

**Java**
```java
import java.util.*;

public class GreedySolver {
    public static List<int[]> greedy(int[][] grid, int[] start, int[] end) {
        int rows = grid.length, cols = grid[0].length;
        int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};

        PriorityQueue<int[]> openSet = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        Map<String, int[]> parent = new HashMap<>();
        Set<String> closed = new HashSet<>();

        String startKey = start[0] + "," + start[1];
        String endKey = end[0] + "," + end[1];

        parent.put(startKey, null);
        openSet.add(new int[]{manhattan(start, end), start[0], start[1]});

        boolean found = false;

        while (!openSet.isEmpty()) {
            int[] item = openSet.poll();
            int cr = item[1], cc = item[2];
            String currKey = cr + "," + cc;
            if (closed.contains(currKey)) continue;
            closed.add(currKey);

            if (currKey.equals(endKey)) { found = true; break; }

            for (int[] d : dirs) {
                int nr = cr + d[0], nc = cc + d[1];
                String nKey = nr + "," + nc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] == 1 || closed.contains(nKey))
                    continue;
                if (!parent.containsKey(nKey)) {
                    parent.put(nKey, new int[]{cr, cc});
                    int h = manhattan(new int[]{nr, nc}, end);
                    openSet.add(new int[]{h, nr, nc});
                }
            }
        }

        if (!found) return new ArrayList<>();

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
#include <algorithm>
using namespace std;

int manhattan(pair<int,int> a, pair<int,int> b) {
    return abs(a.first - b.first) + abs(a.second - b.second);
}

vector<pair<int,int>> greedy(vector<vector<int>>& grid, pair<int,int> start, pair<int,int> end) {
    int rows = grid.size(), cols = grid[0].size();
    vector<pair<int,int>> dirs = {{-1,0},{1,0},{0,-1},{0,1}};

    priority_queue<tuple<int,int,int>, vector<tuple<int,int,int>>, greater<>> openSet;
    unordered_map<string, pair<int,int>> parent;
    unordered_set<string> closed;

    auto key = [](pair<int,int> p) { return to_string(p.first) + "," + to_string(p.second); };

    parent[key(start)] = {-1, -1};
    openSet.push({manhattan(start, end), start.first, start.second});

    bool found = false;

    while (!openSet.empty()) {
        auto [h, cr, cc] = openSet.top(); openSet.pop();
        string currKey = to_string(cr) + "," + to_string(cc);
        if (closed.count(currKey)) continue;
        closed.insert(currKey);

        if (make_pair(cr, cc) == end) { found = true; break; }

        for (auto& d : dirs) {
            int nr = cr + d.first, nc = cc + d.second;
            string nKey = to_string(nr) + "," + to_string(nc);
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] == 1 || closed.count(nKey))
                continue;
            if (!parent.count(nKey)) {
                parent[nKey] = {cr, cc};
                int hVal = manhattan({nr, nc}, end);
                openSet.push({hVal, nr, nc});
            }
        }
    }

    if (!found) return {};

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

def greedy(grid, start, end):
    rows, cols = len(grid), len(grid[0])
    dirs = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    if start == end:
        return [start]
    if grid[start[0]][start[1]] == 1 or grid[end[0]][end[1]] == 1:
        return []

    open_set = [(manhattan(start, end), start)]
    parent = {start: None}
    closed = set()

    found = False
    while open_set:
        _, curr = heapq.heappop(open_set)
        if curr in closed:
            continue
        closed.add(curr)

        if curr == end:
            found = True
            break

        for dr, dc in dirs:
            nr, nc = curr[0] + dr, curr[1] + dc
            neighbor = (nr, nc)
            if nr < 0 or nr >= rows or nc < 0 or nc >= cols or grid[nr][nc] == 1 or neighbor in closed:
                continue
            if neighbor not in parent:
                parent[neighbor] = curr
                heapq.heappush(open_set, (manhattan(neighbor, end), neighbor))

    if not found:
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
      const p = (i - 1) >> 1;
      if (this.heap[p][0] <= this.heap[i][0]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  _siftDown(i) {
    const n = this.heap.length;
    while (true) {
      let s = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l][0] < this.heap[s][0]) s = l;
      if (r < n && this.heap[r][0] < this.heap[s][0]) s = r;
      if (s === i) break;
      [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
      i = s;
    }
  }
}

function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function greedy(grid, start, end) {
  const rows = grid.length, cols = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const key = (r, c) => `${r},${c}`;

  const openSet = new MinHeap();
  const parent = new Map([[key(start[0], start[1]), null]]);
  const closed = new Set();

  openSet.push(manhattan(start, end), start);

  let found = false;
  while (openSet.size > 0) {
    const [, curr] = openSet.pop();
    const currKey = key(curr[0], curr[1]);
    if (closed.has(currKey)) continue;
    closed.add(currKey);

    if (currKey === key(end[0], end[1])) { found = true; break; }

    for (const [dr, dc] of dirs) {
      const nr = curr[0] + dr, nc = curr[1] + dc;
      const nKey = key(nr, nc);
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] === 1 || closed.has(nKey))
        continue;
      if (!parent.has(nKey)) {
        parent.set(nKey, curr);
        openSet.push(manhattan([nr, nc], end), [nr, nc]);
      }
    }
  }

  if (!found) return [];

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

Greedy is fast. It typically expands fewer nodes than A* since it never spends effort tracking or comparing accumulated cost, it just keeps reaching for whatever looks closest to the goal. That speed comes at the cost of optimality: there's no guarantee of the shortest path, and the algorithm can get pulled into a local-minima trap where it commits to a direction that looks good early on but requires a long detour around an obstacle it didn't see coming.

## Real-World Use Case

Real-time applications where speed matters more than a perfectly optimal answer: game NPC pathfinding under tight per-frame time budgets, or any situation where a "good enough, right now" path beats a guaranteed-shortest one that takes longer to compute.
