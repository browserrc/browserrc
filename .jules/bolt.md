## 2024-06-12 - [Hot Path Array Allocation]
**Learning:** Frequent array allocations on event handlers (like creating `["Shift", "Control", "Alt", "Meta"]` on every key press) cause unnecessary Garbage Collection (GC) churn and use slower linear lookups (`Array.includes`).
**Action:** When working on high-frequency events (hot paths), extract static arrays to module-level `Set` objects to ensure O(1) lookup speed and eliminate redundant object allocations.
