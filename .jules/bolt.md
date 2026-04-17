## 2025-04-17 - [Optimizing key parser]
**Learning:** Found that unrolling the `MODIFIER_TO_STRING` in `core/keyParser.js` inside `keyToString` yielded a significant local benchmark improvement but was considered a micro-optimization that compromised the maintainability of data-driven design without measurable real-world impact.
**Action:** Focus on algorithm and allocation improvements (e.g. replacing array splitting + spreading with sequential loop appending in `parseKeySequence`) that avoid excessive garbage collection.
