## 2024-06-25 - Extract modifier keys to Set
**Learning:** Re-allocating arrays and checking for inclusion via `includes` inside hot paths like `processKeyEvent` (which is fired on every keystroke) has a noticeable performance impact in JS.
**Action:** Always pre-allocate static sets of allowed/disallowed keys as module-level `Set`s and use `.has()` for O(1) lookups on hot paths.
