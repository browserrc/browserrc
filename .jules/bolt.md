
## $(date +%Y-%m-%d) - [Optimize KeyProcessor hot paths]
**Learning:** In highly called functions like event processors, using inline arrays and `Array.prototype.includes` incurs an unexpected amount of garbage collection and allocation overhead compared to defining `Set` objects globally.
**Action:** Always hoist commonly accessed list constants outside the hot paths into Sets for O(1) time complexity `Set.has()` checks when optimizing.
