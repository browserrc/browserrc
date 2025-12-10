import path from "path";
import { addContentScript } from "./manifest.ts";
import { CodeFile } from "./code.js";
import { hooks } from "../../index.js";
import { js, registerBundle } from "../treeshake/js.buntime.js";
import { bundledName } from "../util.js";



/**
 * Create a file builder and register the built script in the manifest
 *
 * @param {string} relPath - The relative path to the content script file
 * @param {Partial<{
 *   matches: string[],
 *   run_at: "document_start" | "document_end" | "document_idle",
 *   all_frames: boolean,
 *   platforms: import("browserrc").BuildPlatforms
 * }>} [options] - The options for the content script
 * @returns {CodeFile} The javascript file builder
 */
function dynamicContentScript(relPath, options = {}) {
    const javascriptFile = new CodeFile({ relPath });

    // ensure manifest contains the declaration
    staticContentScript(javascriptFile.relPath, options);
    
    // ensure that the file gets written on build
    hooks.onBuild.register(async ({ outputDir, platforms }) => {
        const targetPlatforms = options.platforms || { chrome: true, firefox: true };
        
        // Write the content script to each platform-specific directory
        for (const platform of ['chrome', 'firefox']) {
            if (platforms?.[platform] && targetPlatforms[platform]) {
                const platformOutputDir = path.join(outputDir, platform);
                console.debug(`[onBuild] writing content script to ${platform}:`, javascriptFile.relPath);
                javascriptFile.write(platformOutputDir);
            }
        }
    })

    return javascriptFile
}


function staticContentScript(relPath, options = {}) {
    addContentScript(Object.assign({
        matches: ['<all_urls>'],
        js: [relPath],
        run_at: 'document_idle',
        all_frames: false,
        platforms: { chrome: true, firefox: true },
    }, options));
}


function keyHandling() {
    return new CodeFile({ relPath: 'content/keyHandling.js' })
        .includeFileContent(path.join(__dirname, '..', '..', 'resources', 'segments', 'content', 'inputProcessing.hbs'))
}

export function content(relpath, fn, options = {}) {
    js(relpath, fn);
    addContentScript(Object.assign({
        matches: ['<all_urls>'],
        js: [bundledName(relpath)],
        run_at: 'document_idle',
        all_frames: false,
        platforms: { chrome: true, firefox: true },
    }, options));
}

export function isContentScript(target, options = {}) {
    // Register content script
    addContentScript(Object.assign({
        matches: ['<all_urls>'],
        js: [bundledName(target)],
        run_at: 'document_idle',
        all_frames: false,
        platforms: { chrome: true, firefox: true },
    }, options));
    // Register for unified bundling
    registerBundle(target, 'content', options);
    return false;
}

export default {
    dynamic: dynamicContentScript,
    static: staticContentScript,
    create: content,
    isContentScript: isContentScript,
    keyHandling: keyHandling,
}