import { resolve, extname } from 'path';
import { file } from 'bun';

// make top-level calls conditional on the target
// this way they are removed during tree-shaking
export const conditionalCompiler = (target) => ({
    name: "browserrc-conditional-compiler",
    setup(build) {
        build.onLoad({ filter: /\.(ts|js|tsx)$/ }, async (args) => {
            const text = await file(args.path).text();

            const jsRegex = /(?<!\.)\bjs\s*\(\s*(['"`])(.*?)\1/g;
            const buildRegex = /(?<!function\s|export\s+function\s)\bbuild\s*\(/g;

            let contents = text.replaceAll(jsRegex, (match, quote, scriptName) => {
                return `if ("${scriptName}" === ${JSON.stringify(target)}) js(${quote}${scriptName}${quote}`;
            });

            contents = contents.replaceAll(buildRegex, (match) => {
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
    const result = await Bun.build({
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
        ...(config.buildOptions || {}),
    })
    return result.outputs[0].text()
}