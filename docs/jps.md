# JPS — Jump Point Search

## Theory

JPS is A* with a smarter idea of what counts as a neighbor. See `astar.md` for the underlying `f(n) = g(n) + h(n)` scoring, the Manhattan heuristic, and the heap mechanics — all of that carries over unchanged. What JPS changes is what gets inserted into the open set in the first place.

Plain A* expands one grid cell at a time, even across long, empty, uniform corridors where every step is an obvious continuation of the last. JPS skips over those corridors entirely and only stops at *jump points*: cells where the path could usefully change direction. On this grid (cardinal movement only, no diagonals), a jump point occurs when scanning hits the goal, or when it encounters a **forced neighbor**, a cell that can only be reached optimally by turning at the current position because a wall blocks the straight-line alternative.

For example, scanning rightward along a row: if the cell directly above the current cell is a wall but the cell diagonally up-right is open, then reaching that up-right cell optimally requires turning here, not one step later. That makes the current cell a jump point.

The search itself still runs as A*, a min-heap ordered by `f`, a `gCost` map, a `closed` set, all unchanged. The only difference is that `successors(current)` returns jump points found by scanning outward in each cardinal direction, instead of just the four adjacent cells. Because the heuristic and cost accounting are identical to A*, JPS finds the exact same optimal path, just by considering far fewer candidate nodes along the way.

This implementation is specific to 4-directional (cardinal-only) grids. Classic JPS also defines diagonal-move pruning rules for 8-directional grids, which don't apply here since GridLab doesn't support diagonal movement.

## Pseudocode

```
function JPS(grid, start, end):
    if start == end: return [start]
    if grid[start] is wall or grid[end] is wall: return no path

    function scanHorizontal(r, c, direction):
        while cell(r, c) is walkable:
            if (r, c) == end: return (r, c)
            if forced neighbor exists above or below: return (r, c)
            c += direction
        return null

    function scanVertical(r, c, direction):
        while cell(r, c) is walkable:
            if (r, c) == end: return (r, c)
            if forced neighbor exists left or right: return (r, c)
            if scanHorizontal(r, c+1, +1) or scanHorizontal(r, c-1, -1) finds a jump point:
                return (r, c)
            r += direction
        return null

    function successors(node):
        return non-null results of scanning left, right, up, down from node

    openSet = min-heap ordered by f-score, seeded with (h(start, end), start)
    gCost = {start: 0}
    parent = {start: null}
    closed = {}

    while openSet is not empty:
        current = openSet.pop_min()
        if current in closed: continue
        closed.add(current)

        if current == end:
            jumpPointPath = reconstruct_path(parent, end)
            return interpolate_straight_segments(jumpPointPath)

        for jumpPoint in successors(current):
            tentative_g = gCost[current] + manhattan(current, jumpPoint)
            if tentative_g < gCost.get(jumpPoint, infinity):
                gCost[jumpPoint] = tentative_g
                parent[jumpPoint] = current
                f = tentative_g + manhattan(jumpPoint, end)
                openSet.push(f, jumpPoint)

    return no path
```

The final path returned to the caller isn't the raw sequence of jump points, it's those jump points with the straight-line cells between each consecutive pair filled back in, so the animation still walks through every grid cell.

## Complexity Derivation

**Time: O(E log V)**

Same asymptotic bound as A*, since the search is still a priority-queue-driven exploration with the same heap-push-per-relaxation structure. What changes is what E actually counts in practice. In plain A*, an edge is a single step to an adjacent cell. In JPS, an "edge" is a jump to the next jump point, which can span an entire corridor in one hop. The formal complexity class doesn't shrink, but the real number of heap operations does, often dramatically, on grids with large open regions.

One implementation detail worth flagging: the scan functions touch (and record, for animation purposes) every cell they pass over while searching for the next jump point, even though only the jump points themselves get inserted into the heap. So the "Nodes Visited" count shown in the UI reflects every cell scanned over, not just the jump points the algorithm actually reasons about, those are two different numbers, and it's the jump-point count that's responsible for JPS's speed advantage over A*.

**Space: O(V)**

Same reasoning as A*: `gCost`, `parent`, and `closed` hold at most one entry per jump point encountered, bounded by the total number of grid cells.

## Implementations

**Java**
```java
import java.util.*;

public class JPSSolver {
    static int rows, cols;
    static int[][] grid;
    static int[] end;

    public static List<int[]> jps(int[][] g, int[] start, int[] endPoint) {
        grid = g;
        rows = g.length;
        cols = rows > 0 ? g[0].length : 0;
        end = endPoint;

        if (start[0] == end[0] && start[1] == end[1]) {
            return new ArrayList<>(List.of(start));
        }
        if (!walkable(start[0], start[1]) || !walkable(end[0], end[1])) {
            return new ArrayList<>();
        }

        PriorityQueue<int[]> openSet = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        Map<String, Integer> gCost = new HashMap<>();
        Map<String, int[]> parent = new HashMap<>();
        Set<String> closed = new HashSet<>();

        String startKey = key(start[0], start[1]);
        String endKey = key(end[0], end[1]);

        gCost.put(startKey, 0);
        parent.put(startKey, null);
        openSet.add(new int[]{manhattan(start[0], start[1], end[0], end[1]), start[0], start[1]});

        boolean found = false;

        while (!openSet.isEmpty()) {
            int[] item = openSet.poll();
            int cr = item[1], cc = item[2];
            String currKey = key(cr, cc);
            if (closed.contains(currKey)) continue;
            closed.add(currKey);

            if (currKey.equals(endKey)) { found = true; break; }

            int g = gCost.get(currKey);

            for (int[] jp : successors(cr, cc)) {
                String jpKey = key(jp[0], jp[1]);
                if (closed.contains(jpKey)) continue;

                int newG = g + manhattan(cr, cc, jp[0], jp[1]);
                int existingG = gCost.getOrDefault(jpKey, Integer.MAX_VALUE);
                if (newG < existingG) {
                    gCost.put(jpKey, newG);
                    parent.put(jpKey, new int[]{cr, cc});
                    int f = newG + manhattan(jp[0], jp[1], end[0], end[1]);
                    openSet.add(new int[]{f, jp[0], jp[1]});
                }
            }
        }

        if (!found) return new ArrayList<>();

        List<int[]> jpPath = new ArrayList<>();
        int[] cur = end;
        while (cur != null) {
            jpPath.add(cur);
            cur = parent.get(key(cur[0], cur[1]));
        }
        Collections.reverse(jpPath);

        List<int[]> path = new ArrayList<>();
        for (int i = 0; i < jpPath.size() - 1; i++) {
            int r = jpPath.get(i)[0], c = jpPath.get(i)[1];
            int tr = jpPath.get(i + 1)[0], tc = jpPath.get(i + 1)[1];
            int dr = Integer.compare(tr, r), dc = Integer.compare(tc, c);
            while (r != tr || c != tc) {
                path.add(new int[]{r, c});
                r += dr; c += dc;
            }
        }
        path.add(end);
        return path;
    }

    private static boolean walkable(int r, int c) {
        return r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] == 0;
    }

    private static int manhattan(int r1, int c1, int r2, int c2) {
        return Math.abs(r1 - r2) + Math.abs(c1 - c2);
    }

    private static String key(int r, int c) { return r + "," + c; }

    private static int[] scanH(int r, int c, int dc) {
        while (walkable(r, c)) {
            if (r == end[0] && c == end[1]) return new int[]{r, c};
            if ((!walkable(r - 1, c) && walkable(r - 1, c + dc)) ||
                (!walkable(r + 1, c) && walkable(r + 1, c + dc))) return new int[]{r, c};
            c += dc;
        }
        return null;
    }

    private static int[] scanV(int r, int c, int dr) {
        while (walkable(r, c)) {
            if (r == end[0] && c == end[1]) return new int[]{r, c};
            if ((!walkable(r, c - 1) && walkable(r + dr, c - 1)) ||
                (!walkable(r, c + 1) && walkable(r + dr, c + 1))) return new int[]{r, c};
            if (scanH(r, c + 1, 1) != null || scanH(r, c - 1, -1) != null) return new int[]{r, c};
            r += dr;
        }
        return null;
    }

    private static List<int[]> successors(int r, int c) {
        List<int[]> result = new ArrayList<>();
        int[] rp = scanH(r, c + 1, 1);
        int[] rm = scanH(r, c - 1, -1);
        int[] dp = scanV(r + 1, c, 1);
        int[] dm = scanV(r - 1, c, -1);
        if (rp != null) result.add(rp);
        if (rm != null) result.add(rm);
        if (dp != null) result.add(dp);
        if (dm != null) result.add(dm);
        return result;
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

static bool walkable(vector<vector<int>>& grid, int rows, int cols, int r, int c) {
    return r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] == 0;
}

static int manhattan(int r1, int c1, int r2, int c2) {
    return abs(r1 - r2) + abs(c1 - c2);
}

static string keyOf(int r, int c) {
    return to_string(r) + "," + to_string(c);
}

static pair<int,int> scanH(vector<vector<int>>& grid, int rows, int cols, pair<int,int> end,
                            int r, int c, int dc, bool& found) {
    while (walkable(grid, rows, cols, r, c)) {
        if (r == end.first && c == end.second) { found = true; return {r, c}; }
        if ((!walkable(grid, rows, cols, r - 1, c) && walkable(grid, rows, cols, r - 1, c + dc)) ||
            (!walkable(grid, rows, cols, r + 1, c) && walkable(grid, rows, cols, r + 1, c + dc))) {
            found = true; return {r, c};
        }
        c += dc;
    }
    found = false;
    return {-1, -1};
}

static pair<int,int> scanV(vector<vector<int>>& grid, int rows, int cols, pair<int,int> end,
                            int r, int c, int dr, bool& found) {
    while (walkable(grid, rows, cols, r, c)) {
        if (r == end.first && c == end.second) { found = true; return {r, c}; }
        if ((!walkable(grid, rows, cols, r, c - 1) && walkable(grid, rows, cols, r + dr, c - 1)) ||
            (!walkable(grid, rows, cols, r, c + 1) && walkable(grid, rows, cols, r + dr, c + 1))) {
            found = true; return {r, c};
        }
        bool tmp;
        scanH(grid, rows, cols, end, r, c + 1, 1, tmp);
        if (tmp) { found = true; return {r, c}; }
        scanH(grid, rows, cols, end, r, c - 1, -1, tmp);
        if (tmp) { found = true; return {r, c}; }
        r += dr;
    }
    found = false;
    return {-1, -1};
}

static vector<pair<int,int>> successors(vector<vector<int>>& grid, int rows, int cols,
                                         pair<int,int> end, int r, int c) {
    vector<pair<int,int>> result;
    bool ok;
    pair<int,int> p;

    p = scanH(grid, rows, cols, end, r, c + 1, 1, ok);  if (ok) result.push_back(p);
    p = scanH(grid, rows, cols, end, r, c - 1, -1, ok); if (ok) result.push_back(p);
    p = scanV(grid, rows, cols, end, r + 1, c, 1, ok);  if (ok) result.push_back(p);
    p = scanV(grid, rows, cols, end, r - 1, c, -1, ok); if (ok) result.push_back(p);

    return result;
}

vector<pair<int,int>> jps(vector<vector<int>>& grid, pair<int,int> start, pair<int,int> end) {
    int rows = grid.size(), cols = rows > 0 ? grid[0].size() : 0;

    if (start == end) return {start};
    if (!walkable(grid, rows, cols, start.first, start.second) ||
        !walkable(grid, rows, cols, end.first, end.second)) return {};

    priority_queue<tuple<int,int,int>, vector<tuple<int,int,int>>, greater<>> openSet;
    unordered_map<string, int> gCost;
    unordered_map<string, pair<int,int>> parent;
    unordered_set<string> closed;

    string startKey = keyOf(start.first, start.second);
    string endKey = keyOf(end.first, end.second);

    gCost[startKey] = 0;
    parent[startKey] = {-1, -1};
    openSet.push({manhattan(start.first, start.second, end.first, end.second), start.first, start.second});

    bool found = false;

    while (!openSet.empty()) {
        auto [f, cr, cc] = openSet.top(); openSet.pop();
        string currKey = keyOf(cr, cc);
        if (closed.count(currKey)) continue;
        closed.insert(currKey);

        if (currKey == endKey) { found = true; break; }

        int gVal = gCost[currKey];

        for (auto& jp : successors(grid, rows, cols, end, cr, cc)) {
            string jpKey = keyOf(jp.first, jp.second);
            if (closed.count(jpKey)) continue;

            int newG = gVal + manhattan(cr, cc, jp.first, jp.second);
            int existingG = gCost.count(jpKey) ? gCost[jpKey] : INT_MAX;
            if (newG < existingG) {
                gCost[jpKey] = newG;
                parent[jpKey] = {cr, cc};
                int fScore = newG + manhattan(jp.first, jp.second, end.first, end.second);
                openSet.push({fScore, jp.first, jp.second});
            }
        }
    }

    if (!found) return {};

    vector<pair<int,int>> jpPath;
    pair<int,int> cur = end;
    while (cur.first != -1) {
        jpPath.push_back(cur);
        cur = parent[keyOf(cur.first, cur.second)];
    }
    reverse(jpPath.begin(), jpPath.end());

    vector<pair<int,int>> path;
    for (size_t i = 0; i + 1 < jpPath.size(); i++) {
        int r = jpPath[i].first, c = jpPath[i].second;
        int tr = jpPath[i+1].first, tc = jpPath[i+1].second;
        int dr = (tr > r) - (tr < r);
        int dc = (tc > c) - (tc < c);
        while (r != tr || c != tc) {
            path.push_back({r, c});
            r += dr; c += dc;
        }
    }
    path.push_back(end);
    return path;
}
```

**Python**
```python
import heapq

def manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def jps(grid, start, end):
    rows, cols = len(grid), len(grid[0])

    def walkable(r, c):
        return 0 <= r < rows and 0 <= c < cols and grid[r][c] == 0

    def scan_h(r, c, dc):
        while walkable(r, c):
            if (r, c) == end:
                return (r, c)
            if (not walkable(r - 1, c) and walkable(r - 1, c + dc)) or \
               (not walkable(r + 1, c) and walkable(r + 1, c + dc)):
                return (r, c)
            c += dc
        return None

    def scan_v(r, c, dr):
        while walkable(r, c):
            if (r, c) == end:
                return (r, c)
            if (not walkable(r, c - 1) and walkable(r + dr, c - 1)) or \
               (not walkable(r, c + 1) and walkable(r + dr, c + 1)):
                return (r, c)
            if scan_h(r, c + 1, 1) is not None or scan_h(r, c - 1, -1) is not None:
                return (r, c)
            r += dr
        return None

    def successors(node):
        r, c = node
        points = []
        for jp in (scan_h(r, c + 1, 1), scan_h(r, c - 1, -1),
                   scan_v(r + 1, c, 1), scan_v(r - 1, c, -1)):
            if jp is not None:
                points.append(jp)
        return points

    if start == end:
        return [start]
    if not walkable(*start) or not walkable(*end):
        return []

    open_set = [(manhattan(start, end), start)]
    g_cost = {start: 0}
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

        g = g_cost[curr]
        for jp in successors(curr):
            if jp in closed:
                continue
            new_g = g + manhattan(curr, jp)
            if new_g < g_cost.get(jp, float('inf')):
                g_cost[jp] = new_g
                parent[jp] = curr
                heapq.heappush(open_set, (new_g + manhattan(jp, end), jp))

    if not found:
        return []

    jp_path = []
    curr = end
    while curr is not None:
        jp_path.append(curr)
        curr = parent[curr]
    jp_path.reverse()

    path = []
    for i in range(len(jp_path) - 1):
        r, c = jp_path[i]
        tr, tc = jp_path[i + 1]
        dr = (tr > r) - (tr < r)
        dc = (tc > c) - (tc < c)
        while (r, c) != (tr, tc):
            path.append((r, c))
            r += dr
            c += dc
    path.append(end)
    return path
```

**JavaScript**
```javascript
function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function jps(grid, start, end) {
  const rows = grid.length, cols = grid[0].length;
  const key = (r, c) => `${r},${c}`;

  const walkable = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 0;

  function scanH(r, c, dc) {
    while (walkable(r, c)) {
      if (r === end[0] && c === end[1]) return [r, c];
      if ((!walkable(r - 1, c) && walkable(r - 1, c + dc)) ||
          (!walkable(r + 1, c) && walkable(r + 1, c + dc))) return [r, c];
      c += dc;
    }
    return null;
  }

  function scanV(r, c, dr) {
    while (walkable(r, c)) {
      if (r === end[0] && c === end[1]) return [r, c];
      if ((!walkable(r, c - 1) && walkable(r + dr, c - 1)) ||
          (!walkable(r, c + 1) && walkable(r + dr, c + 1))) return [r, c];
      if (scanH(r, c + 1, 1) !== null || scanH(r, c - 1, -1) !== null) return [r, c];
      r += dr;
    }
    return null;
  }

  function successors([r, c]) {
    const result = [];
    for (const jp of [scanH(r, c + 1, 1), scanH(r, c - 1, -1), scanV(r + 1, c, 1), scanV(r - 1, c, -1)]) {
      if (jp !== null) result.push(jp);
    }
    return result;
  }

  if (start[0] === end[0] && start[1] === end[1]) return [start];
  if (!walkable(start[0], start[1]) || !walkable(end[0], end[1])) return [];

  const heap = [];
  const heapPush = (f, point) => {
    heap.push([f, point]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const heapPop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let smallest = i;
        const l = 2 * i + 1, r = 2 * i + 2;
        if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
        if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
      }
    }
    return top;
  };

  const gCost = new Map([[key(start[0], start[1]), 0]]);
  const parent = new Map([[key(start[0], start[1]), null]]);
  const closed = new Set();

  heapPush(manhattan(start, end), start);

  let found = false;
  while (heap.length > 0) {
    const [, curr] = heapPop();
    const currKey = key(curr[0], curr[1]);
    if (closed.has(currKey)) continue;
    closed.add(currKey);

    if (currKey === key(end[0], end[1])) { found = true; break; }

    const g = gCost.get(currKey);

    for (const jp of successors(curr)) {
      const jpKey = key(jp[0], jp[1]);
      if (closed.has(jpKey)) continue;

      const newG = g + manhattan(curr, jp);
      const existingG = gCost.get(jpKey) ?? Infinity;
      if (newG < existingG) {
        gCost.set(jpKey, newG);
        parent.set(jpKey, curr);
        heapPush(newG + manhattan(jp, end), jp);
      }
    }
  }

  if (!found) return [];

  const jpPath = [];
  let curr = end;
  while (curr !== null) {
    jpPath.push(curr);
    curr = parent.get(key(curr[0], curr[1]));
  }
  jpPath.reverse();

  const path = [];
  for (let i = 0; i < jpPath.length - 1; i++) {
    const [r0, c0] = jpPath[i];
    const [tr, tc] = jpPath[i + 1];
    const dr = Math.sign(tr - r0);
    const dc = Math.sign(tc - c0);
    let r = r0, c = c0;
    while (r !== tr || c !== tc) {
      path.push([r, c]);
      r += dr; c += dc;
    }
  }
  path.push(end);
  return path;
}
```

## Trade-offs

JPS reaches the same optimal path as A*, same heuristic, same cost accounting, but with far fewer nodes entering the open set, since long uniform corridors collapse into a single jump instead of many one-cell steps. The gain is biggest on open, sparse grids; on a maze packed with walls and forced turns every few cells, jump points show up almost as often as regular cells would in plain A*, and the advantage shrinks.

The cost is complexity. The forced-neighbor and scanning logic is meaningfully harder to write and debug correctly than plain A*'s four-neighbor expansion, and this implementation only handles cardinal movement, so it doesn't include the diagonal pruning rules that make classic JPS especially effective on 8-directional grids.

## Real-World Use Case

Large-scale grid pathfinding where map regions are mostly open, real-time strategy games with big uniform terrain, and other scenarios where A*'s optimality guarantee is wanted but its per-query cost on large open maps needs to come down.
