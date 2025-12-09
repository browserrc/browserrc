import { addContentScript } from "./manifest.ts";
import { contentScript } from "../treeshake/contentScript.buntime.js";

// Re-export the self-bundling contentScript function
export { contentScript };

/**
 * Register a static content script (just adds to manifest, no code bundling)
 * Use this when you have a pre-built content script file
 *
 * @param {string} relPath - The relative path to the content script file
 * @param {Partial<{
 *   matches: string[],
 *   run_at: "document_start" | "document_end" | "document_idle",
 *   all_frames: boolean,
 *   platforms: import("browserrc").BuildPlatforms
 * }>} [options] - The options for the content script
 */
function staticContentScript(relPath, options = {}) {
    addContentScript(Object.assign({
        matches: ['<all_urls>'],
        js: [relPath],
        run_at: 'document_idle',
        all_frames: false,
        platforms: { chrome: true, firefox: true },
    }, options));
}


export default {
    /**
     * Create a content script using self-bundling
     * The function will be bundled and tree-shaken for each target
     * 
     * @example
     * contentScripts.dynamic('content/myScript.js', () => {
     *     console.log('Hello from content script!');
     * });
     * 
     * @example
     * contentScripts.dynamic('content/myScript.js', {
     *     matches: ['https://*.example.com/*'],
     *     run_at: 'document_start',
     * }, () => {
     *     console.log('Hello from content script!');
     * });
     */
    dynamic: contentScript,
    static: staticContentScript,
}