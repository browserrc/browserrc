## 2024-05-24 - [Avoid Array Allocations on Hot Paths]
**Learning:** Found that inline array creation inside frequently called methods (like `processKeyEvent` and `handleKeyUp`) causes significant garbage collection churn and slower O(n) array lookups (via `.includes()`), which degrades performance on hot paths.
**Action:** Extract arrays into module-level `Set` constants to ensure O(1) lookups and prevent object allocations on every keypress.
