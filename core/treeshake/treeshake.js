import { resolve, extname } from 'path';
import { file } from 'bun';

/**
 * Replace known conditional function calls with compile-time boolean literals
 * to optimize bundle size by enabling dead code elimination.
 *
 * This transforms runtime conditionals like `isBackground()` and `isContentScript('target')`
 * into compile-time boolean literals, allowing the bundler to eliminate unused code paths.
 *
 * @param {string} contents - The source code to transform
 * @param {string} target - The bundle target (e.g., 'background.js', 'content.js')
 * @returns {string} The transformed source code with optimized conditionals
 */
function replaceKnownConditionals(contents, target) {
    const conditionReplacements = [
        {
            regex: /(?<!\.)\bisBackground\s*\(\s*\)/g,
            getCompareValue: () => 'background.js'
        },
        {
            regex: /(?<!\.)\bisContentScript\s*\(\s*['"`]([^'"`]+)['"`](?:\s*,\s*[^)]*)?\s*\)/g,
            getCompareValue: (match, targetParam) => targetParam
        }
    ];

    for (const { regex, getCompareValue } of conditionReplacements) {
        contents = contents.replaceAll(regex, (...args) => {
            const compareValue = getCompareValue(...args);
            return target === compareValue ? 'true' : 'false';
        });
    }

    return contents;
}

// make top-level calls conditional on the target
// this way they are removed during tree-shaking
export const conditionalCompiler = (target) => ({
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

            // Apply known conditional replacements to optimize bundle size
            contents = replaceKnownConditionals(contents, target);

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
            "__TARGET__": JSON.stringify(config.target)
        },
        minifySyntax: true,
        minify: true,
        plugins: [
            // make top-level calls conditional on the target
            conditionalCompiler(config.target),
            // uses browser runtime versions of browserrc imports
            browserShimsPlugin,
        ],
        
    }, config.buildOptions || {}))
    return result.outputs[0].text()
}

export { isBuntime, isBeingBundled, isBeingBundledFor } from './runtime.js';