## 2024-05-24 - [Avoid Array allocation on hot paths]
**Learning:** Using `const modifierKeys = ["Shift", ...]` inside frequently called hot-path methods like `processKeyEvent` and `handleKeyUp` in `core/keyProcessor.js` causes significant garbage collection churn and slower lookups compared to a module-level `Set`.
**Action:** Extract inline arrays used for lookups into module-level `Set` constants for O(1) lookup and to avoid repeated allocations.
