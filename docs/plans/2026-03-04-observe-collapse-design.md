# Observe & Collapse Mode — Design

## Architecture

Four new modules + modifications:

1. **`src/game/quantumAgent.ts`** — Pure logic: state machine, wave expansion, BFS solver, amplitude assignment, collapse with deviation, path travel
2. **`src/game/quantumRenderer.ts`** — Drawing: wave cells with amplitude-based opacity, charge indicator ring, collapse animation, travel animation
3. **`src/components/MazeRenderer.tsx`** — Extended to accept quantum state + handle hold gesture
4. **`src/App.tsx`** — Route `observe` mode to quantum agent instead of classical

## State Machine

```
expanding → (touch start, ≥50% cells expanded) → charging → (touch end) → collapsing → travelling → finished
```

- **expanding**: Wave flood-fills from start at ~8 cells/sec with ±50ms jitter. No player input accepted until at least 50% of cells are in waveFrontier.
- **charging**: Player holds finger down. `chargeLevel` fills 0→1 over ~1 second. Radial ring indicator fills around finger position.
- **collapsing**: On release, collapse animation plays (~300ms). Wave snaps inward from dead ends. Resolved path appears.
- **travelling**: Agent dot travels the collapsed path cell by cell (~100ms/cell).
- **finished**: Stop. Score/stars deferred.

## Quantum Agent State

```ts
interface QuantumAgentState {
  phase: 'expanding' | 'charging' | 'collapsing' | 'travelling' | 'finished';
  waveFrontier: Map<string, number>;   // "x,y" → amplitude 0–1
  expandQueue: { x: number; y: number; delay: number }[];
  expandedCount: number;
  totalCells: number;                   // maze.width * maze.height
  optimalPath: [number, number][];
  collapsedPath: [number, number][];
  chargeLevel: number;
  chargeStartTime: number;
  fingerPosition: [number, number] | null;
  travelIndex: number;
  travelStartTime: number;
}
```

## Probability Weights (precomputed)

1. BFS from start to exit → `optimalPath`
2. BFS from start to all cells → `distFromOptimal` (min distance from any cell to nearest optimal-path cell)
3. Assign amplitudes:
   - On optimal path: `1.0`
   - 1 step off: `0.6`
   - 2+ steps off: `0.3`
   - Dead ends (only 1 open neighbor): `0.1`

## Wave Expansion

Flood fill from start using a priority queue with jittered delays:
- Base rate: ~8 cells/second (125ms per cell)
- Jitter: ±50ms random per cell
- Each frame, check if any queued cells have passed their delay timestamp → add to `waveFrontier` with precomputed amplitude
- Expansion continues until all reachable cells are covered or player starts charging

## Expansion Guard

Charging cannot begin until `waveFrontier.size >= totalCells * 0.5`. The touchstart handler checks this condition and ignores the touch if not met. This prevents accidental interruption before the wave has meaningfully spread.

## Hold-to-Charge

| Hold duration | Charge level | Max deviations from optimal |
|---------------|-------------|----------------------------|
| 0.0–0.3s | 0–33% | 3 wrong turns |
| 0.3–0.8s | 33–80% | 1 wrong turn |
| 0.8s+ | 80–100% | 0 (optimal path) |

## Collapse Algorithm

1. Take the `optimalPath`
2. Identify junctions on the optimal path (cells with >2 open neighbors)
3. Based on charge level, compute `maxDeviations` (0, 1, or 3)
4. Cap: `actualDeviations = Math.min(maxDeviations, availableJunctions)` — prevents index-out-of-bounds when optimal path has fewer junctions than allowed deviations
5. Randomly select `actualDeviations` junction indices
6. At each selected junction, take a random wrong turn, then BFS back to a later point on the optimal path
7. Concatenate the segments → `collapsedPath`
8. If charge ≥ 80%, use optimal path directly

## Visual Rendering

| Element | Color | Notes |
|---------|-------|-------|
| Wave cells | `#00E5CC` | Opacity = amplitude * 0.7. Cells pulse at frequency proportional to amplitude. |
| Charge ring | `#FFFFFF` | Radial arc around finger position, fills proportional to chargeLevel |
| Collapse animation | — | Wave snaps inward from dead ends over 300ms |
| Collapsed optimal path | `#00FF88` | Bright green, particle burst at exit |
| Collapsed suboptimal path | `#FFC04D` | Amber, ghost overlay briefly shows optimal route |
| Agent dot (travelling) | `#00E5CC` | Moves along collapsed path |

## Colors Added

```ts
quantumWave: '#00E5CC',
quantumSuboptimal: '#FFC04D',
```

## MazeRenderer Changes

- New optional prop: `quantumState?: QuantumAgentState`
- Hold gesture: `touchstart` starts charge timer (only in observe mode, only if ≥50% expanded), `touchend` triggers collapse
- Frame loop calls `drawQuantumAgent()` when quantum state present instead of `drawClassicalAgent()`
