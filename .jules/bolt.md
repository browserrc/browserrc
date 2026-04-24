
## 2024-04-24 - [Avoid Map.prototype.entries() allocation overhead]
**Learning:** When iterating over Maps where only values are needed, using `Map.prototype.entries()` and destructuring incurs overhead from intermediate entry array allocations.
**Action:** Use `Map.prototype.values()` directly instead of `.entries()` in these scenarios to improve performance on hot paths like resetting state.
