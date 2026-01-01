// Runtime entrypoint for bundled targets (background/content/etc).
//
// This file intentionally avoids re-exporting build-only utilities like CodeFile
// to keep bundled outputs minimal. The implementations themselves are shared
// (manifest/background/content/js), with environment-specific behavior guarded
// by conditionals in those modules.

export { manifest } from '../buildtime/manifest.ts'
export { background, isBackground } from '../buildtime/background.ts'

export { default as contentScripts, content, isContentScript } from '../buildtime/contentScripts.js'

export { js } from '../treeshake/js.js'
export { isChrome, isFirefox, isContent, isPage, isBuild, isBeingBundled } from '../treeshake/runtime.js'

// Bundled targets should never execute the build pipeline.
export function build() {}

