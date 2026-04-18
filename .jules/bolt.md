## 2024-06-19 - [Optimize sequence parser]
**Learning:** `parseKeySequence` on hot path created unnecessary GC pressure by allocating intermediate arrays (using `split('')` and spread operator `...`) just to iterate over strings and map single characters to key structures. This problem compounded with an extra `.map()` pass at the end.
**Action:** When iterating over strings character-by-character to build structured objects in hot parsing methods, iterate via indices directly and build the result array inline, skipping intermediate string arrays or `map()` passes.
