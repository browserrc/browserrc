## 2024-04-11 - Avoid `.split('')` and spread syntax in string parsing
 **Learning:** In string parsing functions like `parseKeySequence` that operate on single characters, using `.split('')` combined with spread syntax (`...current.split('')`) creates unnecessary intermediate array allocations that slow down execution.
 **Action:** Manually unroll the split by iterating through the string characters using a standard `for` loop and pushing items individually to avoid intermediate array instantiation.
