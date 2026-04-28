
## 2024-04-28 - [Performance: Module-level Set for Hot Path Lookups]
**Learning:** Found that inline arrays used for modifier key checks (`["Shift", "Control", "Alt", "Meta"]`) in `core/keyProcessor.js`'s hot path (`processKeyEvent` and `handleKeyUp`) cause significant GC churn and slower O(n) lookups.
**Action:** Extract frequently checked key collections into module-level `Set` constants (e.g., `MODIFIER_KEYS`) to achieve O(1) lookups and prevent redundant memory allocations on every keypress.
