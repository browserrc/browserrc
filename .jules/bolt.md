## 2024-06-25 - Optimize Modifier Key Checks
**Learning:** Found an inline array `["Shift", "Control", "Alt", "Meta"]` being re-created and iterated over on every single keystroke (`processKeyEvent` and `handleKeyUp`) within the hot path. Array allocations and `.includes` calls on the hot path contribute to garbage collection churn and latency.
**Action:** Extract static arrays into module-level `Set` constants (e.g., `MODIFIER_KEYS = new Set(...)`) and use `.has()` for O(1) lookups to avoid allocation and improve lookup speed on frequently called event listeners.
