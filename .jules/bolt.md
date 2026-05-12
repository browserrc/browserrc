## 2024-05-24 - Optimize Modifier Key Lookups in Hot Paths
**Learning:** In highly frequently invoked event listeners (like keypress and keyup handlers), declaring inline arrays and using `.includes()` causes unnecessary garbage collection churn and O(N) lookup times on every event.
**Action:** Extract such static sets of values into module-level `Set` constants (e.g. `MODIFIER_KEYS`) to achieve O(1) lookups and eliminate per-event memory allocations on the hot path.
