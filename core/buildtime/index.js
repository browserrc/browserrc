// Entrypoint for browserrc build plugin

import { Hook } from "../hooks.js";
import { bundleFiles } from "../treeshake/js.js";
import { usesBackground } from "./background.ts";
import { buildManifests } from "./manifest.ts";
import { join } from 'path';

try {
    // Only initialize build-time globals when we are NOT inside a bundled target.
    // During bundling, Bun `define`s replace __ENVIRONMENT__/__TARGET__/__PLATFORM__
    // with string literals, so `typeof __ENVIRONMENT__` will be `"string"`.
    if (typeof __ENVIRONMENT__ === 'undefined') {
        globalThis.__TARGET__ = undefined;
        globalThis.__PLATFORM__ = undefined;
        globalThis.__ENVIRONMENT__ = 'build';
    }
} catch (error) {
}

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
        await bundleFiles({
            outputDir: join(outputDir, 'chrome'),
            platform: 'chrome',
            entrypoint,
            buildOptions: {
                minify: options.dev?.minify || false,
            }
        })
    }
    if (platforms.firefox) {
        await bundleFiles({
            outputDir: join(outputDir, 'firefox'),
            platform: 'firefox',
            entrypoint,
            buildOptions: {
                minify: options.dev?.minify || false,
            }
        })
    }
}