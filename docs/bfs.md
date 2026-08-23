# BFS — Breadth-First Search

## Theory

BFS explores the grid one distance-level at a time. Starting from the source node, it visits every neighbor at distance 1 before moving to distance 2, then distance 3, and so on. This level-by-level expansion is why BFS finds the shortest path on an unweighted grid: by the time it reaches the destination, it has already exhausted every shorter path option.

The mechanism that enforces this ordering is a FIFO queue. Nodes get processed in the exact order they were discovered, so the algorithm never jumps ahead to a node further from the source before finishing one closer to it.

## Pseudocode

```
function BFS(grid, start, end):
    if start == end: return [start]
    if grid[start] is wall or grid[end] is wall: return no path

    queue = [start]
    visited = {start}
    parent = {start: null}

    while queue is not empty:
        current = queue.dequeue()
        if current == end:
            return reconstruct_path(parent, end)

        for neighbor in 4-directional neighbors(current):
            if neighbor is in bounds and not a wall and not visited:
                visited.add(neighbor)
                parent[neighbor] = current
                queue.enqueue(neighbor)

    return no path
```

## Complexity Derivation

**Time: O(V + E)**

Every vertex (grid cell) gets enqueued and dequeued exactly once. That's the V term. For each dequeued vertex, the algorithm checks its edges, up to 4 neighbors on a grid. That's the E term. Neither step repeats for any node, so the two terms add rather than multiply.

**Space: O(V)**

The queue, visited set, and parent map can each hold up to every node in the grid in the worst case (a fully open grid with no walls).

## Implementations

**Java**
```java
import java.util.*;

public class BFSSolver {
    public static List<int[]> bfs(int[][] grid, int[] start, int[] end) {
        int rows = grid.length, cols = grid[0].length;
        int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
        Queue<int[]> queue = new LinkedList<>();
        Map<String, int[]> parent = new HashMap<>();
        Set<String> visited = new HashSet<>();

        String startKey = start[0] + "," + start[1];
        String endKey = end[0] + "," + end[1];

        queue.add(start);
        visited.add(startKey);
        parent.put(startKey, null);

        while (!queue.isEmpty()) {
            int[] curr = queue.poll();
            String currKey = curr[0] + "," + curr[1];
            if (currKey.equals(endKey)) break;

            for (int[] d : dirs) {
                int nr = curr[0] + d[0], nc = curr[1] + d[1];
                String nKey = nr + "," + nc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0 && !visited.contains(nKey)) {
                    visited.add(nKey);
                    parent.put(nKey, curr);
                    queue.add(new int[]{nr, nc});
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
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <string>
#include <algorithm>
using namespace std;

vector<pair<int,int>> bfs(vector<vector<int>>& grid, pair<int,int> start, pair<int,int> end) {
    int rows = grid.size(), cols = grid[0].size();
    vector<pair<int,int>> dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    queue<pair<int,int>> q;
    unordered_map<string, pair<int,int>> parent;
    unordered_set<string> visited;

    auto key = [](pair<int,int> p) { return to_string(p.first) + "," + to_string(p.second); };

    q.push(start);
    visited.insert(key(start));
    parent[key(start)] = {-1, -1};

    while (!q.empty()) {
        auto curr = q.front(); q.pop();
        if (curr == end) break;

        for (auto& d : dirs) {
            int nr = curr.first + d.first, nc = curr.second + d.second;
            string nKey = to_string(nr) + "," + to_string(nc);
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                    && grid[nr][nc] == 0 && !visited.count(nKey)) {
                visited.insert(nKey);
                parent[nKey] = curr;
                q.push({nr, nc});
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
from collections import deque

def bfs(grid, start, end):
    rows, cols = len(grid), len(grid[0])
    dirs = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    queue = deque([start])
    visited = {start}
    parent = {start: None}

    while queue:
        curr = queue.popleft()
        if curr == end:
            break

        for dr, dc in dirs:
            nr, nc = curr[0] + dr, curr[1] + dc
            neighbor = (nr, nc)
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and neighbor not in visited:
                visited.add(neighbor)
                parent[neighbor] = curr
                queue.append(neighbor)

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
function bfs(grid, start, end) {
  const rows = grid.length, cols = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const key = (r, c) => `${r},${c}`;

  const queue = [start];
  const visited = new Set([key(start[0], start[1])]);
  const parent = new Map([[key(start[0], start[1]), null]]);

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const currKey = key(curr[0], curr[1]);
    if (currKey === key(end[0], end[1])) break;

    for (const [dr, dc] of dirs) {
      const nr = curr[0] + dr, nc = curr[1] + dc;
      const nKey = key(nr, nc);
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0 && !visited.has(nKey)) {
        visited.add(nKey);
        parent.set(nKey, curr);
        queue.push([nr, nc]);
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

BFS guarantees the shortest path on unweighted grids, which is its main strength. But it explores blindly in every direction with no sense of where the destination actually is, so on a grid where the target is far away, it visits far more nodes than it needs to. It also holds more in memory than DFS at any given moment, since the queue can carry an entire frontier of nodes rather than a single path.

## Real-World Use Case

Anywhere unweighted shortest-path matters and the search space is manageable: GPS routing on unweighted road graphs, "shortest number of hops" queries in social networks (LinkedIn's "how are you connected" feature works on this principle), and breadth-limited web crawling.
