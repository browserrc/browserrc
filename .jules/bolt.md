## 2024-05-15 - [O(1) Set lookup vs O(N) Array includes on Key Event Hot Path]
**Learning:** Found array instantiation and `.includes()` array lookups directly on the `processKeyEvent` and `handleKeyUp` methods within `core/keyProcessor.js`. Since these event listeners fire on every keystroke, instantiating arrays creates unnecessary garbage collection churn, and `.includes()` is O(N).
**Action:** Always extract invariant lookup tables to module-level constants and use `Set` for O(1) existence checks (e.g., `MODIFIER_KEYS = new Set(['Shift', ...])`) on event listener hot paths.
