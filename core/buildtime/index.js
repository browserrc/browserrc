// Entrypoint for browserrc build plugin

import { Hook } from "../hooks";
import { buildManifests } from "./manifest.js";

/**
 * @type BuildPlatform = 'chrome' | 'firefox'
 * @type BuildPlatforms = { chrome: true } | { firefox: true } | { chrome: true, firefox: true }
 */

export const onBuild = new Hook('onBuild', 'Called when the browserrc plugin is built');

/**
 * Build the extension for one or more platforms.
 * @param {BuildOptions} options - The build options
 * @param {BuildPlatforms} options.platforms - The platforms to build for
 * @param {string} options.rcpath - The path to the rc file
 * @param {string} options.outputDir - The output directory
 * @returns {Promise<void>}
 */
export async function build(options) {
    const { platforms, rcpath, outputDir } = options;

    // run user config here
    // in the final version, we'll need the user's rc file to be bundled with any of it's dependencies
    // for the time being, we'll assume it is pre-prepared and ready for import
    const { path: nodePath } = require('path');
    const resolvedPath = nodePath.isAbsolute(rcpath) ? rcpath : nodePath.resolve(process.cwd(), rcpath);
    const userModule = await import(`file://${resolvedPath}`);
    // Not doing anything with it yet, but we have access to the default exports 
    // This could be used for some features.

    await onBuild.trigger(options);
    buildManifests(outputDir, platforms);
}