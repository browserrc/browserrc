import { registerBundle } from "../treeshake/js.js";
import { isBeingBundled } from "../treeshake/runtime.js";

// Flag to indicate if we need to bundle the background script
export let usesBackground = false;

/**
 * Mark background as used and register the background bundle output.
 * This is used when build-time APIs (like `manifest.action`) need background output
 * but don't have any background-only code to wrap.
 */
export function ensureBackgroundBundle() {
    if (usesBackground) return;
    usesBackground = true;
    registerBundle('background.js', 'background');
}

export function background(fn: () => any) {
    // Build-time: ensure we produce a background bundle output.
    // Bundle/runtime: execute only in background bundles.
    if (!isBeingBundled()) {
        ensureBackgroundBundle();
        return null;
    }
    if (typeof __ENVIRONMENT__ !== 'undefined' && __ENVIRONMENT__ === 'background') {
        return fn();
    }
    return null;
}

export function isBackground(): boolean {
    // Build-time: calling this should still opt-in to generating background output
    // (so `if (isBackground()) {}` patterns generate `background.js`).
    if (!isBeingBundled()) {
        ensureBackgroundBundle();
        return false;
    }
    return typeof __ENVIRONMENT__ !== 'undefined' && __ENVIRONMENT__ === 'background';
}
