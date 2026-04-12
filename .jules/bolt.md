
## 2026-04-12 - Unroll Modifier Loops in Hot Paths
**Learning:** In the `keyToString` function (and similar hot paths like parsing strings), dynamically iterating through a configuration array (like `MODIFIER_TO_STRING`) and using dynamic property access (e.g., `keyObj.modifiers[property]`) incurs measurable performance overhead due to iterators and dynamic object lookups.
**Action:** Unroll loops that process small, fixed sets of modifiers (like Ctrl, Alt, Shift, Meta, Super). Directly checking static properties (`mods.ctrl`, `mods.alt`) avoids dynamic access and results in significant speedups (~35%) on critical execution paths where key objects are frequently converted to strings.
