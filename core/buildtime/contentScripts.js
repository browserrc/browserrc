import { addContentScript } from "./manifest.js";
import { JavascriptFile } from "./code.js";
import { hooks } from "../../index.js";


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
 * @returns {JavascriptFile} The javascript file builder
 */
function dynamicContentScript(relPath, options = {}) {
    const javascriptFile = new JavascriptFile(relPath);

    // ensure manifest contains the declaration
    staticContentScript(javascriptFile.relPath, options);
    
    // ensure that the file gets written on build
    hooks.onBuild.register(async ({ outputDir }) => {
        console.debug('[onBuild] writing content script', javascriptFile.relPath);
        javascriptFile.write(outputDir);
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


export default {
    dynamic: dynamicContentScript,
    static: staticContentScript,
}