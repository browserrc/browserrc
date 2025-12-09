// version that runs on build (user imports and builds extension)
// registers what path the function should be executed in
// doesn't actually run the function, it won't run until it's bundled into the target file
import { file } from 'bun'
import { join } from 'path'
import { bundleWithTarget } from './treeshake'

const JS_PATHS = []


export function js(path, fn) {
    JS_PATHS.push(path)    
    // Note: we don't actually need to do anything with the function on the 
    // intitial build pass. We only need to run the function after bundling.
    // See js.target.js for where it actually runs.
}

export async function bundleJsFiles({ outputDir, platform, entrypoint, buildOptions }) {
    for (const target of JS_PATHS) {
        const bundledCode = await bundleWithTarget(entrypoint, { target, platform, buildOptions })
        file(join(outputDir, target.replace('.js', '.bundled.js'))).write(bundledCode)
    }
}