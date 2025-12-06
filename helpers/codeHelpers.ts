import { CodeFile } from "../core/buildtime/code";
import contentScripts from "../core/buildtime/contentScripts.js";


let ALL_PAGES_CONTENT_SCRIPT: CodeFile | null = null;


function getAllPagesContentScript() {
    if (ALL_PAGES_CONTENT_SCRIPT === null) {
        ALL_PAGES_CONTENT_SCRIPT = contentScripts.dynamic('content/allPages.js');
    }
    return ALL_PAGES_CONTENT_SCRIPT;
}


export function onAllPages(fn: () => void) {
    getAllPagesContentScript().includeIIFE(fn);
}