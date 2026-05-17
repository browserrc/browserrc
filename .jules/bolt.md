## 2024-05-24 - Garbage Collection Churn in Hot Path Event Listeners
**Learning:** High-frequency event listeners (like `processKeyEvent` and `handleKeyUp`) suffer from garbage collection churn when creating inline arrays and using `.includes()` on every keypress. Using module-level `Set` objects prevents this object allocation and provides O(1) lookups.
**Action:** When working on performance-critical paths, especially those triggered by events, use module-level constants (like `Set` or `Map`) for lookups to prevent unnecessary object allocation and garbage collection overhead.
