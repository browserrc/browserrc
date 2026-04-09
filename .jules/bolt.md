## 2024-04-09 - [String Parsing Avoid Array Allocations]
**Learning:** Hot-path string parsing functions like `parseKeySequence` benefit significantly from direct array population. Intermediate representations using `.split('')`, spread syntax `...`, and `.map()` incur a massive performance penalty (~45% slowdown) due to repeated object allocations.
**Action:** Always parse characters/sequences directly into the final return array inside loops to avoid intermediate array allocations when optimizing string parsing on critical paths.
