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
 * @param {function | string | JSX.Element} content - String html content, a function that returns a string, or JSX content.
 * @returns {Promise<HTMLCodeFile>} - The html code file
 */
export async function html(relPath, content) {
    if (typeof content === 'function') {
        content = content()
    }

    // Await content resolution if it's a Promise (JSX.Element)
    if (content instanceof Promise) {
        content = await content;
    }

    // Content passed directly to HTMLCodeFile constructor as required
    const codeFile = new HTMLCodeFile({ relPath, htmlContent: content });

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