// version that runs on build (user imports and builds extension)
// registers what path the function should be executed in
// doesn't actually run the function, it won't run until it's bundled into the target file
import { file } from 'bun'
import { join } from 'path'
import { bundleWithTarget } from './treeshake'

// Unified registry for all files that need bundling
export const filesToBundle = []

export function js(path, fn) {
    filesToBundle.push({
        target: path,
        type: 'js',
        outputName: path.replace('.js', '.bundled.js')
    })
    // Note: we don't actually need to do anything with the function on the
    // initial build pass. We only need to run the function after bundling.
    // See js.target.js for where it actually runs.
}

export function registerBundle(target, environment, options = {}) {
    const outputName = target.replace('.js', environment === 'content' ? '.bundled.js' : '.js')
    filesToBundle.push({
        target,
        environment,
        outputName,
        options
    })
}

export async function bundleFiles({ outputDir, platform, entrypoint, buildOptions }) {
    for (const bundleFile of filesToBundle) {
        const bundledCode = await bundleWithTarget(entrypoint, {
            target: bundleFile.target,
            platform,
            environment: bundleFile.environment || 'bun',
            buildOptions
        })
        file(join(outputDir, bundleFile.outputName)).write(bundledCode)
    }
}