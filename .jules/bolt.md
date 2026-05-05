## 2024-05-18 - [Extract array allocations into module-level sets]
**Learning:** Found inline array creations like `const modifierKeys = ["Shift", "Control", "Alt", "Meta"];` on hot paths (key processing).
**Action:** Extract to a module-level constant `Set` to provide O(1) lookup and prevent garbage collection churn on the hot path.