## 2024-05-24 - [Avoid Array Includes in Hot Paths]
**Learning:** Checking for modifier keys in event listeners using an inline array (e.g., `['Shift', 'Control'].includes(event.key)`) creates new array allocations on every keypress, which causes garbage collection churn in the hot path.
**Action:** Use module-level `Set` objects (e.g., `const MODIFIER_KEYS = new Set(['Shift', ...])`) and `.has()` for O(1) lookups in performance-critical paths like `processKeyEvent` and `handleKeyUp`.
