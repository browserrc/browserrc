## 2025-05-01 - [Optimize Key Sequence Parsing]
**Learning:** Found that `parseKeySequence` in `core/keyParser.js` had hidden overhead on the hot path due to intermediate array allocations (`.split('')`, spread syntax, and `.map()`). Even though strings might be small, preventing garbage collection churn here yields measurable improvements.
**Action:** Replaced array creation and mapping in string parsing functions with direct character iteration and in-place pushing.
