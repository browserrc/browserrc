// Target-time version of contentScript
// This version actually runs the function in the browser
// The conditional compiler in treeshake.js makes the code unreachable
// if the current target doesn't match the path, allowing tree-shaking

/**
 * Run a content script function
 * At target time, this simply executes the provided function
 * 
 * @param {string} path - The path identifier (used for conditional compilation)
 * @param {Function | Object} fnOrOptions - The function to run OR options object
 * @param {Function} [fn] - The function to run (if options provided as second arg)
 */
export function contentScript(path, fnOrOptions, fn) {
    // Handle both signatures:
    // contentScript('path.js', () => { ... })
    // contentScript('path.js', { matches: [...] }, () => { ... })
    
    if (typeof fnOrOptions === 'function') {
        fnOrOptions()
    } else if (typeof fn === 'function') {
        fn()
    }
}
