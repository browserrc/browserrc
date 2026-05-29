## 2026-05-29 - [O(1) Lookups for Hot Paths]
**Learning:** Instantiating inline arrays like `["Shift", "Control", "Alt", "Meta"]` and using `.includes()` within frequently fired event handlers like `processKeyEvent` causes unnecessary array allocations and garbage collection on the hot path.
**Action:** Always extract invariant collections into module-level `Set` constants to eliminate per-call object allocations and benefit from O(1) membership lookups.
