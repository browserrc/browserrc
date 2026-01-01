export function isBeingBundled() {
    // __TARGET__ will have the file name if it is being bundled
    // (build-time initializes it to `undefined`)
    return typeof __TARGET__ !== 'undefined' && __TARGET__ !== undefined
}

export function isChrome() {
    return typeof __PLATFORM__ !== 'undefined' && __PLATFORM__ === 'chrome'
}

export function isFirefox() {
    return typeof __PLATFORM__ !== 'undefined' && __PLATFORM__ === 'firefox'
}

export function isContent() {
    return typeof __ENVIRONMENT__ !== 'undefined' && __ENVIRONMENT__ === 'content'
}

export function isPage() {
    return typeof __ENVIRONMENT__ !== 'undefined' && __ENVIRONMENT__ === 'page'
}

export function isBuild() {
    return typeof __ENVIRONMENT__ !== 'undefined' && __ENVIRONMENT__ === 'build'
}
