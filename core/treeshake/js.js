// Unified JS bundling API.
//
// - In the build environment (`__ENVIRONMENT__ === "build"`), `js()` registers
//   output targets and `bundleFiles()` produces the final bundled outputs.
// - In bundled outputs (background/content/other), `js()` executes the callback,
//   gated by `__TARGET__` so only the current bundle's code runs.

function isBuild() {
  return typeof __ENVIRONMENT__ !== 'undefined' && __ENVIRONMENT__ === 'build'
}

// Unified registry for all files that need bundling
export const filesToBundle = []

export function js(path, fn) {
  if (!isBuild()) {
    try {
      if (typeof __TARGET__ !== 'undefined' && __TARGET__ === path) fn()
    } catch {
      // ignore
    }
    return
  }

  filesToBundle.push({
    target: path,
    type: 'js',
    outputName: path.replace('.js', '.bundled.js')
  })
  // Note: we don't actually need to do anything with the function on the
  // initial build pass. We only need to run the function after bundling.
}

export function registerBundle(target, environment, options = {}) {
  if (!isBuild()) return

  const outputName = target.replace('.js', environment === 'content' ? '.bundled.js' : '.js')
  filesToBundle.push({
    target,
    environment,
    outputName,
    options
  })
}

export async function bundleFiles({ outputDir, platform, entrypoint, buildOptions }) {
  if (!isBuild()) return

  const { bundleWithTarget } = await import('./treeshake.js')

  for (const bundleFile of filesToBundle) {
    const bundledCode = await bundleWithTarget(entrypoint, {
      target: bundleFile.target,
      platform,
      environment: bundleFile.environment || 'bun',
      buildOptions
    })
    const normalizedOutDir = String(outputDir).replace(/\/$/, '')
    const outPath = normalizedOutDir + '/' + bundleFile.outputName
    Bun.file(outPath).write(bundledCode)
  }
}

