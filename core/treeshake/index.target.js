export { js } from './js.target.js';


export const contentScripts = {
    create: (relpath, fn) => {
        fn()
    }
}

// Minimal runtime manifest shim.
// This exists so user code that imports/sets `manifest.*` can still bundle cleanly.
// Build-time manifest generation still happens in core/buildtime/manifest.ts.
let __ACTION_CONFIG__ = null;
let __ACTION_LISTENER__ = null;
let __ACTION_LISTENER_INSTALLED__ = false;

function getActionApi() {
    // Chrome uses `chrome.action`, Firefox often supports `browser.action`.
    const root = (typeof globalThis !== 'undefined' ? globalThis : undefined);
    return (root && (root.chrome || root.browser) && (root.chrome?.action || root.browser?.action)) || null;
}

export const manifest = {
    name: '',
    version: '',
    description: '',
    permissions: [],

    get action() {
        return __ACTION_CONFIG__;
    },
    set action(config) {
        __ACTION_CONFIG__ = config;

        // Only install action click handler for the background bundle/runtime.
        if (__ENVIRONMENT__ !== "background") return;

        const onClick = (typeof config === 'function')
            ? config
            : (config && typeof config === 'object' ? config.onClick : null);

        if (typeof onClick !== 'function') return;

        const actionApi = getActionApi();
        if (!actionApi?.onClicked?.addListener) return;

        // Best-effort idempotency: remove previous listener if we installed one.
        if (__ACTION_LISTENER_INSTALLED__ && __ACTION_LISTENER__ && actionApi.onClicked.removeListener) {
            try { actionApi.onClicked.removeListener(__ACTION_LISTENER__); } catch {}
        }

        __ACTION_LISTENER__ = onClick;
        __ACTION_LISTENER_INSTALLED__ = true;
        actionApi.onClicked.addListener(onClick);
    },

    assign: (config) => {
        if (config && typeof config === 'object') Object.assign(manifest, config);
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