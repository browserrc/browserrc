## 2024-05-24 - Extract Array Creation on Key Press Event Hot Path
**Learning:** Instantiating a 4-element array and calling `.includes()` inside `processKeyEvent` and `handleKeyUp` (which fire on every user keystroke) introduces unnecessary garbage collection overhead and O(N) lookups in a hot path, causing a measurable performance hit on repetitive actions compared to an O(1) Set lookup.
**Action:** Always hoist static mapping structures out of high-frequency event handlers. A module-level `Set` (or object dictionary) provides O(1) lookup and completely eliminates the allocation/GC penalty.
