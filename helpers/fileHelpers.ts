import { onBuild } from "../core/buildtime";
import { CodeFile } from "../core/buildtime/code";
import { messageScope } from "../stdlib/messages";
import path from "path";


function standardScope(codeFile: CodeFile) {
    codeFile.apply(messageScope)
}


export function code(relPath: string, content: string): CodeFile;
export function code(relPath: string, content: () => void): CodeFile;
export function code(relPath: string): CodeFile;
export function code(relPath: string, content?: string | (() => void | string)): CodeFile {
    const codeFile = new CodeFile({ relPath }).apply(standardScope);
    if (content !== undefined) {
        if (typeof content === 'function') {
            codeFile.includeIIFE(content)
        }
        else {
            codeFile.addBlock(content);
        }
    }
    
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