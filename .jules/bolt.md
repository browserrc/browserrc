## 2024-06-03 - [Optimized parseKeySequence intermediate arrays]
**Learning:** `core/keyParser.js` parses key bindings on startup. Avoiding intermediate arrays inside `.split("")` and `.map()` loops when manually tokenizing single characters inside and outside `<...>` brackets speeds up string parsing execution without impacting correctness.
**Action:** Always favor character-by-character direct iteration over generating and throwing away intermediate arrays in JS hot paths.
