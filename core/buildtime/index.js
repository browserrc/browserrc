// Entrypoint for browserrc build plugin

import { Hook } from "../hooks.js";
import { bundleJsFiles } from "../treeshake/js.buntime.js";
import { bundleContentScripts } from "../treeshake/contentScript.buntime.js";
import { buildManifests } from "./manifest.ts";
import { join } from 'path';

/**
 * @type BuildPlatform = 'chrome' | 'firefox'
 * @type BuildPlatforms = { chrome: true } | { firefox: true } | { chrome: true, firefox: true }
 */

export const onBuild = new Hook('onBuild', 'Called when the browserrc plugin is built');

/**
 * Build the extension for one or more platforms.
 * @param {BuildOptions} options - The build options
 * @param {BuildPlatforms} options.platforms - The platforms to build for
 * @param {string} [options.rcpath] - The path to the rc file
 * @param {string} options.outputDir - The output directory
 * @returns {Promise<void>}
 */
export async function build(options) {
    let { platforms, outputDir, entrypoint } = options;
    
    // if no target file provided, use the currently running one
    if (!entrypoint) {
        entrypoint = process.argv[1]
    }

    await onBuild.trigger(options);
    buildManifests(outputDir, platforms);
    
    if (platforms.chrome) {
        await bundleJsFiles({
            outputDir: join(outputDir, 'chrome'),
            platform: 'chrome',
            entrypoint
        })
        await bundleContentScripts({
            outputDir: join(outputDir, 'chrome'),
            platform: 'chrome',
            entrypoint
        })
    }
    if (platforms.firefox) {
        await bundleJsFiles({
            outputDir: join(outputDir, 'firefox'),
            platform: 'firefox',
            entrypoint
        })
        await bundleContentScripts({
            outputDir: join(outputDir, 'firefox'),
            platform: 'firefox',
            entrypoint
        })
    }
}