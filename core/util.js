import { extname } from 'path'

/**
 * Get the bundled name of a content script
 * @param {string} relpath - The relative path to the content script
 * @returns {string} The bundled name of the content script
 */
export function bundledName(relpath) {
    // replace extension with .bundled.ext
    return relpath.replace(extname(relpath), '.bundled' + extname(relpath))
}