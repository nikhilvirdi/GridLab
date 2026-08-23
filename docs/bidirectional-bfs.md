# Bi-BFS — Bidirectional Breadth-First Search

## Theory

Bidirectional BFS runs two BFS searches at once, one expanding outward from the start, one expanding outward from the end, and stops as soon as the two search frontiers touch. The insight behind it: if a graph has branching factor `b` and the shortest path has length `d`, a single BFS from one side visits roughly `b^d` nodes in the worst case. Two searches meeting in the middle only need to cover half that distance each, so the total explored is closer to `2 × b^(d/2)`. Since `b^(d/2)` grows exponentially slower than `b^d` for any branching factor greater than 1, this isn't a small constant-factor improvement, it's a fundamentally smaller search space.

The implementation alternates between the two frontiers, always expanding whichever one is currently smaller. This keeps both sides roughly balanced instead of letting one frontier do all the work while the other lags behind. Each expansion processes exactly one "level" of BFS on its side: every node currently in the queue gets its neighbors checked once, and any newly discovered neighbors go on to be processed in a later round.

As soon as a node discovered by one frontier turns out to already be known to the other frontier (present in its parent map), that node is the meeting point, and the search halts immediately rather than continuing to expand further.

Reconstructing the path happens in two pieces: walk backward from the meeting point to the start using the forward parent map, then walk backward from the meeting point's counterpart in the backward search out to the end, and stitch the two halves together.

## Pseudocode

```
function BidirectionalBFS(grid, start, end):
    if start == end: return [start]
    if grid[start] is wall or grid[end] is wall: return no path

    parentFwd = {start: null}
    parentBwd = {end: null}
    fwdQueue = [start]
    bwdQueue = [end]
    meetingPoint = null

    function expandLevel(queue, ownParent, otherParent):
        levelEnd = current length of queue
        while queue has unprocessed nodes before levelEnd:
            current = queue.dequeue()
            for neighbor in 4-directional neighbors(current):
                if neighbor is in bounds, not a wall, not already in ownParent:
                    ownParent[neighbor] = current
                    queue.enqueue(neighbor)
                    if neighbor is in otherParent:
                        return neighbor
        return null

    while fwdQueue or bwdQueue has unprocessed nodes:
        if forward frontier size <= backward frontier size:
            meetingPoint = expandLevel(fwdQueue, parentFwd, parentBwd)
        else:
            meetingPoint = expandLevel(bwdQueue, parentBwd, parentFwd)
        if meetingPoint is not null: break

    if meetingPoint is null: return no path

    forwardHalf = walk parentFwd from meetingPoint back to start, then reverse
    backwardHalf = walk parentBwd from meetingPoint's predecessor out to end
    return forwardHalf + backwardHalf
```

## Complexity Derivation

**Time: O(b^(d/2))**

Here `b` is the branching factor (4, since each grid cell has up to 4 neighbors) and `d` is the length of the shortest path. Each frontier only has to search out to roughly half the total distance before the two meet, so the total nodes touched across both searches is on the order of `2 × b^(d/2)`, which is still `O(b^(d/2))` after dropping the constant.

This bound is expressed differently from the `O(V + E)` used for BFS and DFS on purpose: the whole point of bidirectional search is to avoid touching most of the graph, so measuring it in terms of graph size would hide the actual benefit. The gain is largest when the shortest path is short relative to the grid's total size. If start and end are placed far apart relative to the grid dimensions, both frontiers end up covering most of the grid before meeting anyway, and the advantage over plain BFS shrinks.

**Space: O(b^(d/2))**

Both frontiers, along with their parent maps, grow with however many nodes get touched during the search, which follows the same halved-depth bound as time.

## Implementations

**Java**
```java
import java.util.*;

public class BidirectionalBFSSolver {
    public static List<int[]> bidirectionalBFS(int[][] grid, int[] start, int[] end) {
        int rows = grid.length, cols = grid[0].length;
        int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};

        if (start[0] == end[0] && start[1] == end[1]) {
            return new ArrayList<>(List.of(start));
        }
        if (grid[start[0]][start[1]] == 1 || grid[end[0]][end[1]] == 1) {
            return new ArrayList<>();
        }

        Map<String, int[]> parentFwd = new HashMap<>();
        Map<String, int[]> parentBwd = new HashMap<>();
        Deque<int[]> fwdQueue = new ArrayDeque<>();
        Deque<int[]> bwdQueue = new ArrayDeque<>();

        String startKey = start[0] + "," + start[1];
        String endKey = end[0] + "," + end[1];

        parentFwd.put(startKey, null);
        parentBwd.put(endKey, null);
        fwdQueue.add(start);
        bwdQueue.add(end);

        String meetingKey = null;

        while (!fwdQueue.isEmpty() || !bwdQueue.isEmpty()) {
            if (!fwdQueue.isEmpty() && (bwdQueue.isEmpty() || fwdQueue.size() <= bwdQueue.size())) {
                meetingKey = expand(fwdQueue, parentFwd, parentBwd, rows, cols, grid, dirs);
            } else if (!bwdQueue.isEmpty()) {
                meetingKey = expand(bwdQueue, parentBwd, parentFwd, rows, cols, grid, dirs);
            }
            if (meetingKey != null) break;
        }

        if (meetingKey == null) return new ArrayList<>();

        LinkedList<int[]> forwardHalf = new LinkedList<>();
        int[] cur = keyToPoint(meetingKey);
        while (cur != null) {
            forwardHalf.addFirst(cur);
            cur = parentFwd.get(cur[0] + "," + cur[1]);
        }

        LinkedList<int[]> backwardHalf = new LinkedList<>();
        cur = parentBwd.get(meetingKey);
        while (cur != null) {
            backwardHalf.add(cur);
            cur = parentBwd.get(cur[0] + "," + cur[1]);
        }

        List<int[]> path = new ArrayList<>(forwardHalf);
        path.addAll(backwardHalf);
        return path;
    }

    private static int[] keyToPoint(String key) {
        String[] parts = key.split(",");
        return new int[]{Integer.parseInt(parts[0]), Integer.parseInt(parts[1])};
    }

    private static String expand(Deque<int[]> queue, Map<String, int[]> ownParent,
                                  Map<String, int[]> otherParent, int rows, int cols,
                                  int[][] grid, int[][] dirs) {
        int levelEnd = queue.size();
        for (int i = 0; i < levelEnd; i++) {
            int[] curr = queue.poll();
            for (int[] d : dirs) {
                int nr = curr[0] + d[0], nc = curr[1] + d[1];
                String nKey = nr + "," + nc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                        && grid[nr][nc] == 0 && !ownParent.containsKey(nKey)) {
                    ownParent.put(nKey, curr);
                    queue.add(new int[]{nr, nc});
                    if (otherParent.containsKey(nKey)) {
                        return nKey;
                    }
                }
            }
        }
        return null;
    }
}
```

**C++**
```cpp
#include <vector>
#include <deque>
#include <unordered_map>
#include <string>
#include <algorithm>
using namespace std;

static string keyOf(int r, int c) { return to_string(r) + "," + to_string(c); }

static string expandLevel(deque<pair<int,int>>& queue, unordered_map<string, pair<int,int>>& ownParent,
                           unordered_map<string, pair<int,int>>& otherParent,
                           int rows, int cols, vector<vector<int>>& grid, vector<pair<int,int>>& dirs) {
    int levelEnd = queue.size();
    for (int i = 0; i < levelEnd; i++) {
        auto curr = queue.front(); queue.pop_front();
        for (auto& d : dirs) {
            int nr = curr.first + d.first, nc = curr.second + d.second;
            string nKey = keyOf(nr, nc);
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
                    && grid[nr][nc] == 0 && !ownParent.count(nKey)) {
                ownParent[nKey] = curr;
                queue.push_back({nr, nc});
                if (otherParent.count(nKey)) {
                    return nKey;
                }
            }
        }
    }
    return "";
}

vector<pair<int,int>> bidirectionalBFS(vector<vector<int>>& grid, pair<int,int> start, pair<int,int> end) {
    int rows = grid.size(), cols = grid[0].size();
    vector<pair<int,int>> dirs = {{-1,0},{1,0},{0,-1},{0,1}};

    if (start == end) return {start};
    if (grid[start.first][start.second] == 1 || grid[end.first][end.second] == 1) return {};

    unordered_map<string, pair<int,int>> parentFwd, parentBwd;
    deque<pair<int,int>> fwdQueue{start}, bwdQueue{end};

    string startKey = keyOf(start.first, start.second);
    string endKey = keyOf(end.first, end.second);

    parentFwd[startKey] = {-1, -1};
    parentBwd[endKey] = {-1, -1};

    string meetingKey = "";

    while (!fwdQueue.empty() || !bwdQueue.empty()) {
        if (!fwdQueue.empty() && (bwdQueue.empty() || fwdQueue.size() <= bwdQueue.size())) {
            meetingKey = expandLevel(fwdQueue, parentFwd, parentBwd, rows, cols, grid, dirs);
        } else if (!bwdQueue.empty()) {
            meetingKey = expandLevel(bwdQueue, parentBwd, parentFwd, rows, cols, grid, dirs);
        }
        if (!meetingKey.empty()) break;
    }

    if (meetingKey.empty()) return {};

    auto keyToPoint = [](const string& k) {
        int comma = k.find(',');
        return make_pair(stoi(k.substr(0, comma)), stoi(k.substr(comma + 1)));
    };

    vector<pair<int,int>> forwardHalf;
    pair<int,int> cur = keyToPoint(meetingKey);
    while (cur.first != -1) {
        forwardHalf.push_back(cur);
        cur = parentFwd[keyOf(cur.first, cur.second)];
    }
    reverse(forwardHalf.begin(), forwardHalf.end());

    vector<pair<int,int>> backwardHalf;
    cur = parentBwd[meetingKey];
    while (cur.first != -1) {
        backwardHalf.push_back(cur);
        cur = parentBwd[keyOf(cur.first, cur.second)];
    }

    vector<pair<int,int>> path = forwardHalf;
    path.insert(path.end(), backwardHalf.begin(), backwardHalf.end());
    return path;
}
```

**Python**
```python
from collections import deque

def bidirectional_bfs(grid, start, end):
    rows, cols = len(grid), len(grid[0])
    dirs = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    if start == end:
        return [start]
    if grid[start[0]][start[1]] == 1 or grid[end[0]][end[1]] == 1:
        return []

    parent_fwd = {start: None}
    parent_bwd = {end: None}
    fwd_queue = deque([start])
    bwd_queue = deque([end])

    meeting = None

    def expand(queue, own_parent, other_parent):
        level_size = len(queue)
        for _ in range(level_size):
            curr = queue.popleft()
            for dr, dc in dirs:
                nr, nc = curr[0] + dr, curr[1] + dc
                neighbor = (nr, nc)
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and neighbor not in own_parent:
                    own_parent[neighbor] = curr
                    queue.append(neighbor)
                    if neighbor in other_parent:
                        return neighbor
        return None

    while fwd_queue or bwd_queue:
        if fwd_queue and (not bwd_queue or len(fwd_queue) <= len(bwd_queue)):
            meeting = expand(fwd_queue, parent_fwd, parent_bwd)
        elif bwd_queue:
            meeting = expand(bwd_queue, parent_bwd, parent_fwd)

        if meeting is not None:
            break

    if meeting is None:
        return []

    forward_half = []
    curr = meeting
    while curr is not None:
        forward_half.append(curr)
        curr = parent_fwd[curr]
    forward_half.reverse()

    backward_half = []
    curr = parent_bwd[meeting]
    while curr is not None:
        backward_half.append(curr)
        curr = parent_bwd[curr]

    return forward_half + backward_half
```

**JavaScript**
```javascript
function bidirectionalBFS(grid, start, end) {
  const rows = grid.length, cols = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const key = (r, c) => `${r},${c}`;

  if (start[0] === end[0] && start[1] === end[1]) return [start];
  if (grid[start[0]][start[1]] === 1 || grid[end[0]][end[1]] === 1) return [];

  const parentFwd = new Map([[key(start[0], start[1]), null]]);
  const parentBwd = new Map([[key(end[0], end[1]), null]]);
  const fwdQueue = [start];
  const bwdQueue = [end];

  function expandLevel(queue, headRef, ownParent, otherParent) {
    const levelEnd = queue.length;
    while (headRef.value < levelEnd) {
      const curr = queue[headRef.value++];
      for (const [dr, dc] of dirs) {
        const nr = curr[0] + dr, nc = curr[1] + dc;
        const nKey = key(nr, nc);
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0 && !ownParent.has(nKey)) {
          ownParent.set(nKey, curr);
          queue.push([nr, nc]);
          if (otherParent.has(nKey)) return nKey;
        }
      }
    }
    return null;
  }

  const fwdHeadRef = { value: 0 };
  const bwdHeadRef = { value: 0 };
  let meetingKey = null;

  while (fwdHeadRef.value < fwdQueue.length || bwdHeadRef.value < bwdQueue.length) {
    const fwdRemaining = fwdQueue.length - fwdHeadRef.value;
    const bwdRemaining = bwdQueue.length - bwdHeadRef.value;

    if (fwdRemaining > 0 && (fwdRemaining <= bwdRemaining || bwdRemaining === 0)) {
      meetingKey = expandLevel(fwdQueue, fwdHeadRef, parentFwd, parentBwd);
    } else if (bwdRemaining > 0) {
      meetingKey = expandLevel(bwdQueue, bwdHeadRef, parentBwd, parentFwd);
    }

    if (meetingKey !== null) break;
  }

  if (meetingKey === null) return [];

  const keyToPoint = (k) => k.split(',').map(Number);

  const forwardHalf = [];
  let cur = keyToPoint(meetingKey);
  while (cur !== null) {
    forwardHalf.push(cur);
    cur = parentFwd.get(key(cur[0], cur[1]));
  }
  forwardHalf.reverse();

  const backwardHalf = [];
  cur = parentBwd.get(meetingKey);
  while (cur !== null) {
    backwardHalf.push(cur);
    cur = parentBwd.get(key(cur[0], cur[1]));
  }

  return [...forwardHalf, ...backwardHalf];
}
```

## Trade-offs

Bidirectional BFS guarantees the shortest path on unweighted grids, same as plain BFS, but explores a dramatically smaller region to find it once start and end are far apart. That's the entire point of the algorithm.

The cost is complexity. Managing two frontiers, two parent maps, and a termination condition based on frontier intersection is meaningfully harder to reason about than a single "have I reached the goal yet" check. Path reconstruction also needs an extra step: merging two half-paths correctly at the meeting point, rather than a single walk back through one parent map.

## Real-World Use Case

Classic use case: "degrees of separation" queries in large social graphs (LinkedIn/Facebook-style "how are you connected to this person" features), where the branching factor is huge and halving the search depth makes an enormous practical difference. More generally, any large sparse graph where a shortest-path query from one side alone would be too slow to run interactively.
