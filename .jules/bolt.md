## 2024-06-25 - [Optimize parseKeySequence memory allocations]
**Learning:** `Array.prototype.split('')` inside tight hot path loops, combined with array spreads (`...`) and `.map()`, creates significant GC churn due to multiple intermediate allocations.
**Action:** Replace intermediate array creation with direct character iteration and in-place pushing for noticeable performance and memory improvements on hot paths, while meticulously ensuring edge cases (such as unclosed sequences) behave identically.
