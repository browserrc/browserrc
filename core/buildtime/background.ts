import { registerBundle } from "../treeshake/js.buntime.js";

// Flag to indicate if we need to bundle the background script
export let usesBackground = false;

/**
 * Mark background as used and register the background bundle output.
 * This is used when build-time APIs (like `manifest.action`) need background output
 * but don't have any background-only code to wrap.
 */
export function ensureBackgroundBundle() {
    usesBackground = true;
    registerBundle('background.js', 'background');
}

export function background(fn: () => any) {
    ensureBackgroundBundle();
    return null;
}

export function isBackground(): boolean {
    ensureBackgroundBundle();
    return false;
}
