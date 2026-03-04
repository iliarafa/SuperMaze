# Classical Agent — Movement, Path Trace & Backtrack Detection — Design

## Architecture

Four new/modified modules:

1. **`src/game/classicalAgent.ts`** — Pure logic: agent state, movement validation, path tracking, backtrack detection, dead end detection
2. **`src/game/touchInput.ts`** — Touch event handling: swipe direction detection + tap-to-adjacent-cell mapping
3. **`src/components/MazeRenderer.tsx`** — Refactored to rAF game loop, draws agent + path overlay on top of static maze
4. **`src/game/colors.ts`** — Extended with classical agent colors

## Game Loop Refactor

Refactor the current one-shot `useEffect` draw into:

- **`useRef`** for mutable game state (agent position, path array) — avoids React re-render overhead
- **`requestAnimationFrame`** loop that redraws every frame
- Split drawing into two layers: `drawMaze()` (static, cached) and `drawAgent()` (every frame, draws path + cursor)
- **Offscreen canvas optimization**: draw the static maze to an offscreen canvas once, then `drawImage()` it each frame. Agent overlay drawn on top. The offscreen canvas must be invalidated and redrawn when the maze changes (new level / new seed). A `useEffect` dependency on the maze object handles this — when maze changes, redraw the offscreen canvas.

## Agent State

```ts
interface PathCell {
  x: number;
  y: number;
  state: 'active' | 'backtracked';
}

interface ClassicalAgentState {
  position: [number, number];
  path: PathCell[];
  deadEnds: Set<string>;  // "x,y" keys
  moveCount: number;
  finished: boolean;
}
```

## Movement

- **Swipe**: `touchstart` → `touchend`, compute delta. If `|dx| > |dy|` it's horizontal (E/W), else vertical (N/S). Minimum threshold of 20px to avoid accidental swipes.
- **Tap**: Map touch coordinates to grid cell. If tapped cell is adjacent to current position and no wall between them, move there.
- **Validation**: Check `hasWall()` before moving. Reject moves into walls.
- **Move**: On valid move, push new cell to path. If new cell already exists in path as `active`, mark everything after it as `backtracked`.

## Backtrack Detection

On each move to cell `(nx, ny)`:
1. Search `path` for an existing entry at `(nx, ny)` with state `active`
2. If found at index `i`, mark all entries from `i+1` to end as `backtracked`
3. Push the new cell as `active`

Preserves full exploration history while visually distinguishing active path from backtracked segments.

## Dead End Detection

When the player backtracks from cell C, check if C has any open neighbors that are not yet in the path at all. If zero unvisited open neighbors exist, C is a dead end — add to `deadEnds` set and mark with a faint X.

## Visual Rendering

| Element | Color | Style |
|---------|-------|-------|
| Active path | `#FF7A2F` (warm orange) | Line connecting cell centers |
| Backtracked path | `#7A3010` (dim burnt orange) | Same line, dimmer |
| Agent cursor | `#FF3333` (red) | Filled circle at current position |
| Dead end marker | `#7A3010` | Small X in cell center |

## Colors Added

```ts
classicalPath: '#FF7A2F',
classicalBacktrack: '#7A3010',
classicalCursor: '#FF3333',
```

## Win Condition

When `position` equals `maze.exit`, set `finished = true`. Stop accepting input. (Visual celebration deferred to polish phase.)
