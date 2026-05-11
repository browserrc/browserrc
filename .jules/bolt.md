## 2024-05-11 - [Hoist constant array allocations to module-level Sets on the hot path]
**Learning:** In heavily used methods like `processKeyEvent` and `handleKeyUp`, repeatedly allocating an array of strings (e.g., `["Shift", "Control", "Alt", "Meta"]`) and calling `.includes()` introduces measurable overhead.
**Action:** Always extract static lookup arrays into module-level `Set` constants (e.g., `MODIFIER_KEYS = new Set(...)`) to achieve O(1) lookup times and eliminate garbage collection churn on the hot path.
