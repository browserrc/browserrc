## 2025-02-20 - Array spreading and mapping in parseKeySequence
 **Learning:** Avoid using `.split('')`, array spreading `...`, and `.map()` inside hot paths like parsing strings. Creating and spreading arrays creates garbage and takes more time than manually iterating characters and pushing them directly to the destination array.
 **Action:** Instead of `parts.push(...current.split(''))` and returning `parts.map(...)`, write a `for` loop over `current` and do `parts.push(parseKey(current[j]))`. This is significantly faster and allocates fewer intermediate arrays.
