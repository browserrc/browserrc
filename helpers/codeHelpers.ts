import { contentScript } from "../core/treeshake/contentScript.buntime.js";


/**
 * Register code to run on all pages as a content script
 * Uses the self-bundling approach for tree-shaking
 * 
 * @param fn - The function to run on all pages
 */
export function onAllPages(fn: () => void) {
    contentScript('content/allPages.js', {
        matches: ['<all_urls>'],
        run_at: 'document_idle',
        all_frames: false,
    }, fn);
}