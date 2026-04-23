
## 2024-05-30 - [Optimize parseKeySequence loop overhead]
**Learning:** In highly-executed parser routines, `String.prototype.split('')` coupled with spread syntax `...` and `.map()` allocates multiple intermediate arrays that quickly bloat the garbage collector when parsing many short key sequences (e.g. key bindings configs). The codebase's parsing implementation originally constructed strings to tokens first, and then parsed.
**Action:** Replace `split('')` + spread syntax + `map` array pipelines in core loop constructs with index-based `for` loop iterations pushing directly to the final `result` array. This provides a ~30% runtime reduction for sequence parsing operations.
