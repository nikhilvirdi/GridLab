# DFS — Depth-First Search

## Theory

DFS explores as far as possible down one path before backtracking. Instead of spreading out level by level like BFS, it commits to a single branch and follows it until it hits a dead end (a wall, the grid boundary, or a cell it's already visited), then backtracks to the most recent unexplored option and tries again.

The implementation here is iterative and stack-based rather than recursive. On a large grid, recursive DFS can blow the call stack, since the recursion depth grows with the length of the path being explored. An explicit stack avoids that entirely and gives the same exploration order.

One detail worth calling out: a node can be pushed onto the stack more than once before it's actually processed (multiple neighbors can point to it before it's popped). The algorithm handles this by checking `visited` at pop time, not at push time, and only skipping duplicates once they surface at the top of the stack.

## Pseudocode

```
function DFS(grid, start, end):
    if start == end: return [start]
    if grid[start] is wall or grid[end] is wall: return no path

    stack = [start]
    visited = {}
    parent = {start: null}

    while stack is not empty:
        current = stack.pop()
        if current in visited: continue
        visited.add(current)

        if current == end:
            return reconstruct_path(parent, end)

        for neighbor in 4-directional neighbors(current):
            if neighbor is in bounds and not a wall and not visited:
                if neighbor not already in parent:
                    parent[neighbor] = current
                stack.push(neighbor)

    return no path
```

## Complexity Derivation

**Time: O(V + E)**

Every vertex is processed once, when it's popped and passes the visited check. That's the V term. For each vertex processed, its edges (up to 4 neighbors) get checked to decide whether to push them. That's the E term. A node can be pushed multiple times before it's popped, but each of those pushes is triggered by a distinct edge, so the total number of pushes is still bounded by E, not by some larger factor.

**Space: O(V)**

The visited set and parent map each hold at most one entry per node. The stack can briefly hold more than V entries in the worst case, since duplicate pushes are possible, but that count is still bounded by the number of edges, so it doesn't change the overall O(V) space class for a grid with constant branching factor (4 neighbors per cell).

## Implementations

**Java**
```java
import java.util.*;

public class DFSSolver {
    public static List<int[]> dfs(int[][] grid, int[] start, int[] end) {
        int rows = grid.length, cols = grid[0].length;
        int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
        Deque<int[]> stack = new ArrayDeque<>();
        Map<String, int[]> parent = new HashMap<>();
        Set<String> visited = new HashSet<>();

        String startKey = start[0] + "," + start[1];
        String endKey = end[0] + "," + end[1];

        stack.push(start);
        parent.put(startKey, null);

        while (!stack.isEmpty()) {
            int[] curr = stack.pop();
            String currKey = curr[0] + "," + curr[1];
            if (visited.contains(currKey)) continue;
            visited.add(currKey);

            if (currKey.equals(endKey)) break;

            for (int[] d : dirs) {
                int nr = curr[0] + d[0], nc = curr[1] + d[1];
                String nKey = nr + "," + nc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0 && !visited.contains(nKey)) {
                    if (!parent.containsKey(nKey)) {
                        parent.put(nKey, curr);
                    }
                    stack.push(new int[]{nr, nc});
                }
            }
        }

        if (!visited.contains(endKey)) return new ArrayList<>();

        LinkedList<int[]> path = new LinkedList<>();
        int[] cur = end;
        while (cur != null) {
            path.addFirst(cur);
            cur = parent.get(cur[0] + "," + cur[1]);
        }
        return path;
    }
}
```

**C++**
```cpp
#include <vector>
#include <stack>
#include <unordered_map>
#include <unordered_set>
#include <string>
#include <algorithm>
using namespace std;

vector<pair<int,int>> dfs(vector<vector<int>>& grid, pair<int,int> start, pair<int,int> end) {
    int rows = grid.size(), cols = grid[0].size();
    vector<pair<int,int>> dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    stack<pair<int,int>> st;
    unordered_map<string, pair<int,int>> parent;
    unordered_set<string> visited;

    auto key = [](pair<int,int> p) { return to_string(p.first) + "," + to_string(p.second); };

    st.push(start);
    parent[key(start)] = {-1, -1};

    while (!st.empty()) {
        auto curr = st.top(); st.pop();
        string currKey = key(curr);
        if (visited.count(currKey)) continue;
        visited.insert(currKey);

        if (curr == end) break;

        for (auto& d : dirs) {
            int nr = curr.first + d.first, nc = curr.second + d.second;
            string nKey = to_string(nr) + "," + to_string(nc);
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                    && grid[nr][nc] == 0 && !visited.count(nKey)) {
                if (!parent.count(nKey)) {
                    parent[nKey] = curr;
                }
                st.push({nr, nc});
            }
        }
    }

    if (!visited.count(key(end))) return {};

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
def dfs(grid, start, end):
    rows, cols = len(grid), len(grid[0])
    dirs = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    stack = [start]
    visited = set()
    parent = {start: None}

    while stack:
        curr = stack.pop()
        if curr in visited:
            continue
        visited.add(curr)

        if curr == end:
            break

        for dr, dc in dirs:
            nr, nc = curr[0] + dr, curr[1] + dc
            neighbor = (nr, nc)
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and neighbor not in visited:
                if neighbor not in parent:
                    parent[neighbor] = curr
                stack.append(neighbor)

    if end not in visited:
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
function dfs(grid, start, end) {
  const rows = grid.length, cols = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const key = (r, c) => `${r},${c}`;

  const stack = [start];
  const visited = new Set();
  const parent = new Map([[key(start[0], start[1]), null]]);

  while (stack.length > 0) {
    const curr = stack.pop();
    const currKey = key(curr[0], curr[1]);
    if (visited.has(currKey)) continue;
    visited.add(currKey);

    if (currKey === key(end[0], end[1])) break;

    for (const [dr, dc] of dirs) {
      const nr = curr[0] + dr, nc = curr[1] + dc;
      const nKey = key(nr, nc);
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0 && !visited.has(nKey)) {
        if (!parent.has(nKey)) {
          parent.set(nKey, curr);
        }
        stack.push([nr, nc]);
      }
    }
  }

  const endKey = key(end[0], end[1]);
  if (!visited.has(endKey)) return [];

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

DFS does not guarantee the shortest path. It can commit to a long, winding branch and reach the destination through a route far longer than necessary, simply because that branch happened to get explored first. On a maze-like grid with narrow corridors, this can mean wandering into dead ends and backtracking repeatedly before stumbling onto the goal.

What it does have going for it: it's simple to reason about and implement, and it can be faster than BFS at finding *a* path (not the shortest one) in grids where the correct route doesn't require much backtracking. It also lends itself naturally to problems where the goal is to explore an entire structure rather than find the shortest route through it.

## Real-World Use Case

Maze generation and maze solving, topological sorting of dependency graphs (build systems, task scheduling), cycle detection in directed graphs, and filesystem directory traversal, where the goal is to walk an entire tree structure rather than find the shortest path between two points.
