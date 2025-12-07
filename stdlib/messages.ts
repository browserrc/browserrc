import { CodeFile } from "../core/buildtime/code";

/**
 * Helper for message handler registration.
 *
 * @param type - The type of message to handle.
 * @param handler - The handler function to call when a message of the given type is received.
 * @returns A function that can be used to unregister the message handler.
 */
export function onMessage<T, R>(type: string, handler: (data: T) => R) {
    chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
        if (message.type === type) {
            let res = handler(message.data);

            if (res instanceof Promise) {
                res = await res;
            }

            if (res !== undefined && res !== null) {
                sendResponse(res);
                return true;
            }
        }
        return false;
    })
}

export function messageScope(codeFile: CodeFile) {
    codeFile.onPreBundle(async () => {
        codeFile.includeFunctionIfReferenced(onMessage)
    })
}
