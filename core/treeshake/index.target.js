export { js } from './js.target.js';
import { isBeingBundledFor } from "../treeshake/runtime.js";


const BACKGROUND_FILE_NAME = "background.js";


export const contentScripts = {
    create: (relpath, fn) => {
        fn()
    }
}


// bundle time background functions
export const background = (fn) => fn();
export const isBackground = () => isBeingBundledFor(BACKGROUND_FILE_NAME);

// bundle time content script functions
export const createContentScript = (relpath, fn) => {
    if (__TARGET__ === relpath) fn();
};
export const isContentScript = (target, options) => {
    // For conditional approach, just check if we're bundling for this target
    return __TARGET__ === target;
};

// no-op build
export function build(...args) {}