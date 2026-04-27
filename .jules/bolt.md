## 2024-04-27 - [Global Set for modifier keys in hot path]
**Learning:** Re-allocating arrays and calling `includes` on them inside a hot loop (like a keyboard event listener) can be significantly slower than a single module-level Set with `has()`.
**Action:** Lift constant arrays into module-level `Set` objects to prevent redundant memory allocation and speed up lookup, particularly in frequently invoked functions like key event listeners.
