export function isBeingBundled() {
    // __TARGET__ will have the file name if it is being bundled
    return __TARGET__ !== undefined
}

export function isChrome() {
    return __PLATFORM__ === 'chrome'
}

export function isFirefox() {
    return __PLATFORM__ === 'firefox'
}

export function isContent() {
    return __ENVIRONMENT__ === 'content'
}

export function isPage() {
    return __ENVIRONMENT__ === 'page'
}
