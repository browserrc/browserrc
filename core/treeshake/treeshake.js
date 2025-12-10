import { resolve, extname } from 'path';
import { file } from 'bun';


// make top-level calls conditional on the target
// this way they are removed during tree-shaking
export const conditionalCompiler = (target, platform, environment) => ({
    name: "browserrc-conditional-compiler",
    setup(build) {
        build.onLoad({ filter: /\.(ts|js|tsx)$/ }, async (args) => {
            const text = await file(args.path).text();

            // Regex patterns for conditional compilation during bundling
            const jsRegex = /(?<!\.)\bjs\s*\(\s*(['"`])(.*?)\1/g;
            const buildRegex = /(?<!function\s|export\s+function\s|Bun\.)\bbuild\s*\(/g;

            // Replace js() calls with conditional execution based on target
            // This ensures content scripts only execute when bundling for their specific target
            let contents = text.replaceAll(jsRegex, (match, quote, scriptName) => {
                return `if ("${scriptName}" === ${JSON.stringify(target)}) js(${quote}${scriptName}${quote}`;
            });

            // Replace build() calls with false condition to eliminate build-time code from bundles
            contents = contents.replaceAll(buildRegex, (match) => {
                return `if (false) build(`;
            });
            
            // optimize bundle size by removing known conditionals which bun can't recognize automatically
            // find usages of isContentScript('target', ...) and replace with target === 'target'
            // Can be isContentScript('target') or isContentScript('target', options) or isContentScript("target", options) or isContentScript("target")
            contents = contents.replaceAll(/isContentScript\((['"])([^']+)['"],?.*?\)/g, (match, quote, target) => {
                return `__TARGET__ === ${JSON.stringify(target)}`;
            });
                
            contents = contents.replaceAll(/isBackground\(\)/g, (match) => {
                return `__ENVIRONMENT__ === "background"`;
            });

            contents = contents.replaceAll(/isChrome\(\)/g, (match) => {
                return `__PLATFORM__ === "chrome"`;
            });

            contents = contents.replaceAll(/isFirefox\(\)/g, (match) => {
                return `__PLATFORM__ === "firefox"`;
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
            return { path: resolve(__dirname, 'index.target.js') };
        });
    },
}


/**
 * Bundle the entrypoint for the given target file
 * 
 * @returns {string} the bundled code
 */
export async function bundleWithTarget(entrypoint, config) {
    const result = await Bun.build(Object.assign({
        entrypoints: [resolve(entrypoint)],
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