export { js } from './js.target.js';

export const contentScripts = {
    create: (relpath, fn) => {
        fn()
    }
}

// no-op build
export function build(...args) {}