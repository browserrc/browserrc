
## 2024-05-19 - Avoid Array Allocations in Event Listener Hot Paths
**Learning:** Found that `processKeyEvent` and `handleKeyUp` in `core/keyProcessor.js` were allocating a new `["Shift", "Control", "Alt", "Meta"]` array and calling `.includes()` on every single keypress event. This creates unnecessary memory allocations and garbage collection churn on a critical hot path.
**Action:** Extract static arrays used for lookups in event handlers to module-level `Set` objects, providing O(1) lookups and avoiding repeated memory allocation overhead during high-frequency events.
