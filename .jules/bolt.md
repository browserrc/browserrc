## 2025-02-16 - Prevent GC churn in hot paths by using module-level Sets
**Learning:** Frequent array creations in hot paths like `processKeyEvent` and `handleKeyUp` (e.g., `["Shift", "Control", "Alt", "Meta"]`) lead to unnecessary garbage collection churn and slower `.includes()` lookups, negatively impacting performance.
**Action:** Lift static collections out of hot path listeners and utilize `Set` constants for O(1) lookups to avoid memory allocation and CPU overhead on every keystroke.
