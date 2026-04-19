## 2024-06-11 - [String Parsing in Hot Paths]
**Learning:** In `core/keyParser.js`, intermediate array allocations from `.split('')`, spread syntax `...`, and `.map()` created measurable garbage collection overhead during `parseKeySequence`.
**Action:** Replace intermediate array allocations with direct index-based iterations (`for (let j = 0; j < current.length; j++)`) and push results sequentially. This yields ~10% execution time improvement in hot paths without changing functionality.
