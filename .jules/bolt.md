## 2024-04-29 - Array Allocations on the Keypress Hot Path
**Learning:** In a heavily event-driven context like browser extension key processing, inline arrays in standard listeners (like `keyup` and `keydown`) generate noticeable garbage collection churn. Re-instantiating arrays and calling array operations (`includes`, `split`, `.map`, `spread...`) on every tick compounds rapidly.
**Action:** Lift constant arrays into module-level `Set` objects for O(1) lookups and replace chained array operations (like `.split().map()`) with single-pass index iteration loops on hot execution paths.
