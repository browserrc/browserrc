// Build-time version of contentScript
// Registers the path and manifest entry, but doesn't run the function
// The function runs only after bundling into the target file (see contentScript.target.js)

import { file } from 'bun'
import { join } from 'path'
import { bundleWithTarget } from './treeshake'
import { addContentScript } from '../buildtime/manifest.ts'

const CONTENT_SCRIPT_PATHS = []

/**
 * @typedef {Object} ContentScriptOptions
 * @property {string[]} [matches=['<all_urls>']] - URL patterns to match
 * @property {'document_start' | 'document_end' | 'document_idle'} [run_at='document_idle'] - When to inject the script
 * @property {boolean} [all_frames=false] - Whether to inject into all frames
 * @property {{ chrome?: true, firefox?: true }} [platforms] - Target platforms
 */

/**
 * Register a content script with self-bundling
 * 
 * @param {string} path - The output path for the content script (e.g., 'content/myScript.js')
 * @param {Function | ContentScriptOptions} fnOrOptions - The function to run OR options object
 * @param {Function} [fn] - The function to run (if options provided as second arg)
 */
export function contentScript(path, fnOrOptions, fn) {
    // Handle both signatures:
    // contentScript('path.js', () => { ... })
    // contentScript('path.js', { matches: [...] }, () => { ... })
    let options = {}
    
    if (typeof fnOrOptions === 'function') {
        // contentScript('path.js', fn)
        fn = fnOrOptions
    } else if (typeof fnOrOptions === 'object') {
        // contentScript('path.js', options, fn)
        options = fnOrOptions
    }

    const {
        matches = ['<all_urls>'],
        run_at = 'document_idle',
        all_frames = false,
        platforms = { chrome: true, firefox: true }
    } = options

    // Register the path for bundling
    CONTENT_SCRIPT_PATHS.push({ path, platforms })

    // Register in the manifest
    addContentScript({
        matches,
        js: [path],
        run_at,
        all_frames,
        platforms
    })

    // Note: The function is not executed at build time
    // It will be extracted and executed when bundled for the target
}

/**
 * Bundle all registered content scripts
 * Called from the build process
 */
export async function bundleContentScripts({ outputDir, platform, entrypoint }) {
    for (const { path: target, platforms } of CONTENT_SCRIPT_PATHS) {
        // Skip if this platform isn't targeted
        if (!platforms[platform]) {
            continue
        }
        
        const bundledCode = await bundleWithTarget(entrypoint, { target, platform })
        const outputPath = join(outputDir, target)
        await file(outputPath).write(bundledCode)
    }
}
