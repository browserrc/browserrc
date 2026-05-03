
## 2024-05-03 - [Hot Path Optimization] Avoid GC churn from inline arrays in hot paths
**Learning:** Using inline arrays like `["Shift", "Control", "Alt", "Meta"]` within high-frequency event handlers (such as `processKeyEvent` and `handleKeyUp`) creates new array allocations on every invocation. This causes unnecessary garbage collection churn, especially on critical hot paths like keystroke processing.
**Action:** Always hoist static arrays to module-level constants. In performance-critical hot paths where membership checking is required, use a module-level `Set` (e.g., `const MODIFIER_KEYS = new Set(...)`) to achieve O(1) lookup times and completely eliminate per-event memory allocations.
