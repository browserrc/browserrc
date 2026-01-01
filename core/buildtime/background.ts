import { registerBundle } from "../treeshake/js.buntime.js";

// Flag to indicate if we need to bundle the background script
export let usesBackground = false;

export function background(fn: () => any) {
    usesBackground = true;
    registerBundle('background.js', 'background');
    return null;
}

export function isBackground(): boolean {
    usesBackground = true;
    registerBundle('background.js', 'background');
    return false;
}
