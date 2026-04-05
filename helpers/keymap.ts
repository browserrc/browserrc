import { CodeFile } from "../core/buildtime/code.js";
import contentScripts from "../core/buildtime/contentScripts.js";
import { onBuild } from "../core/buildtime/index.js";
import { parseKeySequence } from "../core/keyParser.js";
import path from "path";

let KEY_HANDLING_SCRIPT: CodeFile | null = null;

/**
 * Get or create the global key handling content script.
 * Ensures the script is registered in the manifest and scheduled to be written.
 */
function getKeyHandlingScript(): CodeFile {
    if (!KEY_HANDLING_SCRIPT) {
        KEY_HANDLING_SCRIPT = contentScripts.keyHandling();

        // Register in manifest for all URLs by default
        contentScripts.static(KEY_HANDLING_SCRIPT.relPath!);

        // Register build hook to write the file to the output directory for all platforms
        onBuild.register(async ({ outputDir, platforms }) => {
            for (const platform of ['chrome', 'firefox']) {
                if (platforms?.[platform as keyof typeof platforms]) {
                    const platformOutputDir = path.join(outputDir, platform);
                    KEY_HANDLING_SCRIPT!.write(platformOutputDir);
                }
            }
        });

        // Initialize template context
        KEY_HANDLING_SCRIPT.setContext('keyProcessorOptions', '{}');
    }
    return KEY_HANDLING_SCRIPT;
}

/**
 * Utility for defining keybindings in the extension.
 * This utility handles the registration of the necessary content scripts
 * and the injection of keybinding logic.
 */
export const keymap = {
    /**
     * Set a keybinding.
     *
     * @param sequence - The key sequence (e.g., "<leader>ww", "jk", "<C-a>")
     * @param action - The function to execute when the sequence is matched
     */
    set(sequence: string, action: Function) {
        const script = getKeyHandlingScript();

        // Parse the sequence to get normalized key strings for comparison
        const parsed = parseKeySequence(sequence);
        const keyStrings = parsed.map(k => k.string);

        // Create a unique name for the action function in the content script
        const actionName = `action_${Math.random().toString(36).substring(2, 9)}`;

        // Include the function in the content script
        script.includeFunction(action, actionName);

        // Tell the runtime keyProcessor about the sequence
        script.addLine(`keyProcessor.set('${sequence}');`);

        // Register a listener that executes the action when the sequence matches
        script.addBlock(`
            keyProcessor.onSequenceComplete.register((info) => {
                if (JSON.stringify(info.keySequence) === JSON.stringify(${JSON.stringify(keyStrings)})) {
                    ${actionName}(info);
                }
            });
        `);
    }
};
