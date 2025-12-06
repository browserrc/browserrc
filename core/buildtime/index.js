// Entrypoint for browserrc build plugin

import { Hook } from "../hooks.js";
import { buildManifests } from "./manifest.js";
import nodePath from 'path';

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
    const { platforms, rcpath, outputDir } = options;

    // Run the user's rc file
    // Some extensions might call build() directly in their own code, in which case they won't have a
    // separate rc file. In that case, their code will just run before this already.
    if (rcpath) {
        const resolvedPath = nodePath.isAbsolute(rcpath) ? rcpath : nodePath.resolve(process.cwd(), rcpath);
        const userModule = await import(`file://${resolvedPath}`);
        console.debug('User module: ', userModule);
        // Not doing anything with it yet, but we have access to the default exports 
        // This could be used for some features.
    }

    await onBuild.trigger(options);
    buildManifests(outputDir, platforms);
}