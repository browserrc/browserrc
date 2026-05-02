## 2024-05-24 - [Optimize Modifier Keys Lookup in KeyProcessor]
**Learning:** Instantiating small arrays (`["Shift", "Control", "Alt", "Meta"]`) repeatedly inside high-frequency event handlers like `processKeyEvent` and `handleKeyUp` causes significant garbage collection churn and slower O(n) lookups via `.includes()`.
**Action:** Always hoist fixed, commonly checked lists into module-level `Set` objects for O(1) lookups and zero allocation overhead on the hot path.
