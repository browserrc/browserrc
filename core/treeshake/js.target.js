// target time version
// this version actually runs the function
// but, it makes the code unreachable if the current target
// being bundled is not the `path` that is passed in.

// get the name of the current target as a string
// bun will be able to recognize that this is constant and prune
// unreachable code from the bundle.
// see treeshake.js for the build plugin that enables this.
// import { target } from 'browserrc:config'

export function js(path, fn) {
    fn()
}