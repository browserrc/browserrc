import { addContentScript } from "./manifest.ts";
import { js, registerBundle } from "../treeshake/js.js";
import { bundledName } from "../util.js";
import { isBeingBundled } from "../treeshake/runtime.js";



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
    // Build-only: lazy-load heavy deps (Handlebars/CodeFile/hooks/path).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CodeFile } = require('./code.js');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { hooks } = require('../../index.js');

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
    // Build-only: lazy-load heavy deps (Handlebars/CodeFile/path).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CodeFile } = require('./code.js');

    return new CodeFile({ relPath: 'content/keyHandling.js' })
        .includeFileContent(path.join(__dirname, '..', '..', 'resources', 'segments', 'content', 'inputProcessing.hbs'))
}

export function content(relpath, fn, options = {}) {
    // Build-time: register manifest entry + bundling.
    // Bundle/runtime: execute only for the current target.
    if (isBeingBundled()) {
        if (typeof __TARGET__ !== 'undefined' && __TARGET__ === relpath) fn();
        return;
    }

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
    // Bundle/runtime: act as a pure predicate.
    if (isBeingBundled()) {
        return typeof __TARGET__ !== 'undefined' && __TARGET__ === target;
    }

    // Build-time: register manifest entry + bundling, but keep predicate false.
    addContentScript(Object.assign({
      matches: ['<all_urls>'],
      js: [bundledName(target)],
      run_at: 'document_idle',
      all_frames: false,
      platforms: { chrome: true, firefox: true },
    }, options));
    registerBundle(target, 'content', options);
    return false;
}

export default {
    ...(typeof __ENVIRONMENT__ !== 'undefined' && __ENVIRONMENT__ === 'build'
        ? {
            dynamic: dynamicContentScript,
            static: staticContentScript,
            create: content,
            isContentScript: isContentScript,
            keyHandling: keyHandling,
        }
        : {
            // Runtime/bundled: only expose the lightweight API surface.
            create: content,
            isContentScript: isContentScript,
        }),
}