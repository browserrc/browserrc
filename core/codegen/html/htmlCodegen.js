import fs from 'fs';
import path from 'path';
import { onBuild } from '../../buildtime/index.js';

export class HTMLCodeFile {
    constructor({ relPath, htmlContent }) {
        this.html = htmlContent

        if (!relPath.endsWith('.html')) {
            this.relPath = relPath + '.html'
        }
        else {
            this.relPath = relPath
        }
    }
    
    write(outputDir = '.') {
        const outputPath = path.join(outputDir, this.relPath)
        fs.writeFileSync(outputPath, this.html)
    }
}


/**
 * Create a new HTML code file
 * 
 * This file will be written to the output directory on build.
 *
 * @param {string} relPath - The relative path to the html file
 * @param {function | string } content - String html content, or a function that returns a string of html content.
 * @returns {HTMLCodeFile} - The html code file
 */
export function html(relPath, content) {
    if (typeof content === 'function') {
        content = content()
    }
    const codeFile = new HTMLCodeFile({ relPath, htmlContent: content })
    onBuild.register(async ({outputDir, platforms}) => {
        for (const platform of ['chrome', 'firefox']) {
            if (platforms?.[platform]) {
                const platformOutputDir = path.join(outputDir, platform);
                codeFile.write(platformOutputDir);
            }
        }
    });
    return codeFile;
}

/**
 * Re-export @kitajs/html functions so that browserrc can be used
 * as a jsxImportSource
 *
 * May replace with a custom implementation in the future
 */
export { jsx, jsxs, Fragment, jsxDEV } from '@kitajs/html/jsx-dev-runtime'
