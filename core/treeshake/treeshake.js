function extname(p) {
  const m = /(\.[^./\\]+)$/.exec(String(p))
  return m ? m[1] : ''
}

function pathFromHere(rel) {
  return new URL(rel, import.meta.url).pathname
}


// make top-level calls conditional on the target
// this way they are removed during tree-shaking
export const conditionalCompiler = (target, platform, environment) => ({
    name: "browserrc-conditional-compiler",
    setup(build) {
        build.onLoad({ filter: /\.(ts|js|tsx)$/ }, async (args) => {
            const text = await Bun.file(args.path).text();

            const buildRegex = /(?<!function\s|export\s+function\s|Bun\.)\bbuild\s*\(/g;

            // Replace build() calls with false condition to eliminate build-time code from bundles
            let contents = text.replaceAll(buildRegex, (match) => {
                return `if (false) build(`;
            });

            return {
                contents,
                loader: extname(args.path).slice(1), // remove the leading dot
            };
        });
    },
});

// replace imports of core browserrc symbols with the versions for the browser target
const browserShimsPlugin = {
    name: `browserrc-browser-shims`,
    setup(build) {
        build.onResolve({ filter: /^browserrc$/ }, () => {
            // Use the runtime entrypoint (no duplicated implementations).
            return { path: pathFromHere('../runtime/index.js') };
        });
    },
}


/**
 * Bundle the entrypoint for the given target file
 * 
 * @returns {string} the bundled code
 */
export async function bundleWithTarget(entrypoint, config) {
    // Resolve entrypoint relative to CWD if needed.
    const resolvedEntrypoint = (() => {
        try {
            // absolute unix
            if (typeof entrypoint === 'string' && entrypoint.startsWith('/')) return entrypoint
            // absolute windows
            if (typeof entrypoint === 'string' && /^[a-zA-Z]:[\\/]/.test(entrypoint)) return entrypoint
            return new URL(String(entrypoint), `file://${process.cwd()}/`).pathname
        } catch {
            return entrypoint
        }
    })()

    const result = await Bun.build(Object.assign({
        entrypoints: [resolvedEntrypoint],
        target: "browser",
        write: false,
        define: {
            "__TARGET__": JSON.stringify(config.target),
            "__PLATFORM__": JSON.stringify(config.platform),
            "__ENVIRONMENT__": JSON.stringify(config.environment)
        },
        minifySyntax: true,
        minify: true,
        plugins: [
            // make top-level calls conditional on the target
            conditionalCompiler(config.target, config.platform, config.environment),
            // uses browser runtime versions of browserrc imports
            browserShimsPlugin,
        ],
        
    }, config.buildOptions || {}))
    return result.outputs[0].text()
}

export { isChrome, isFirefox, isContent, isPage } from './runtime.js';