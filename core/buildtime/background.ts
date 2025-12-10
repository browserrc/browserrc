import { CodeFile } from "./code.js";
import { onBuild } from "./index.js";
import { registerBundle } from "../treeshake/js.buntime.js";
import path from "path";
import fs from "fs";
// Global background service worker state
export let BACKGROUND_CODE_FILE: CodeFile | null = null;

// flag to indicate if we need to bundle the background script
export let usesBackground = false;

/**
 * Get or create the global background service worker CodeFile
 */
function getBackgroundCodeFile(): CodeFile {
    if (!BACKGROUND_CODE_FILE) {
        BACKGROUND_CODE_FILE = new CodeFile({ relPath: 'background.js' });

        // Register the onBuild hook to write the background script
        onBuild.register(async (buildContext) => {
            const { outputDir, platforms } = buildContext;

            // Write to each platform directory
            for (const platform of ['chrome', 'firefox']) {
                if (platforms?.[platform]) {
                    const platformOutputDir = path.join(outputDir, platform);
                    // Ensure the platform directory exists
                    fs.mkdirSync(platformOutputDir, { recursive: true });
                    BACKGROUND_CODE_FILE!.write(platformOutputDir);
                }
            }
        });
    }
    return BACKGROUND_CODE_FILE;
}

export function background(fn: () => any) {
    usesBackground = true;
    registerBundle('background.js', 'background');
    return null;
}

export function isBackground(): boolean {
    usesBackground = true;
    registerBundle('background.js', 'background');
    return false;
}

export default {
    get code(): CodeFile {
        return getBackgroundCodeFile();
    },
};
