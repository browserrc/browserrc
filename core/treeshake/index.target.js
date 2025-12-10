export { js } from './js.target.js';


export const contentScripts = {
    create: (relpath, fn) => {
        fn()
    }
}

// bundle time background functions
export const background = (fn) => { if (__ENVIRONMENT__ === "background") fn(); }
export const isBackground = () => __ENVIRONMENT__ === "background";
export const isChrome = () => __PLATFORM__ === "chrome";
export const isFirefox = () => __PLATFORM__ === "firefox";

// bundle time content script functions
export const createContentScript = (relpath, fn) => {
    if (__TARGET__ === relpath) fn();
};
export const content = (relpath, fn) => {
    if (__TARGET__ === relpath) fn();
};
export const isContentScript = (target, options) => {
    // For conditional approach, just check if we're bundling for this target
    return __TARGET__ === target;
};

// no-op build
export function build(...args) {}