import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { Hook } from '../hooks';


// Shared helper functions for includeConstant, includeIIFE, and includeFunction

/**
 * Convert a value to a JavaScript literal string representation
 * @param {any} value - The value to convert
 * @returns {string} The JavaScript literal representation
 */
function valueToLiteral(value) {
    if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return JSON.stringify(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
        // Numbers and booleans can be used directly
        return String(value);
    } else if (value === null) {
        return 'null';
    } else if (value === undefined) {
        return 'undefined';
    } else {
        // For complex objects, use JSON.stringify
        return JSON.stringify(value);
    }
}

/**
 * Generate IIFE code from a function
 * @param {Function} fn - The function to convert to IIFE
 * @returns {string} The IIFE code string
 */
function generateIIFE(fn) {
    const fnCode = fn.toString();
    return `(${fnCode})();`;
}

/**
 * Generate function code from a function, optionally renaming it
 * @param {Function} fn - The function to convert
 * @param {string|undefined} name - Optional name for the function
 * @returns {string} The function code string
 */
function generateFunction(fn, name = undefined) {
    const fnCode = fn.toString();
    
    // Check if it's an arrow function (first line doesn't contain "function")
    const firstLine = fnCode.split('\n')[0];
    const isArrowFunction = !firstLine.includes('function');
    
    if (isArrowFunction) {
        // Arrow functions must have a name parameter
        if (!name) {
            throw new Error('Arrow functions must have a name parameter');
        }
        return `const ${name} = ${fnCode};`;
    }
    
    // Regular function (named or anonymous)
    if (name) {
        // Rename the function by replacing the function name
        const renamedFnCode = fnCode.replace(
            /^(async\s+)?function(\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?/,
            `$1function ${name}`
        );
        return renamedFnCode;
    }
    
    return fnCode;
}

/**
 * Add separator if content already exists
 * @param {string} existingContent - The existing content
 * @returns {string} The separator to add (empty string or '\n\n')
 */
function getSeparator(existingContent) {
    return existingContent !== '' ? '\n\n' : '';
}

 export class CodeFile {
    /**
     * Create a new code file container
     * @param {object} [props={}] - Props object
     * @param {string} [props.relPath] - Relative path for writing
     * @param {string} [props.code] - Initial code content
     * @param {Map<string, any> | Array<[string, any]>} [props.constants] - Initial constants
     * @param {object} [props.context] - Initial Handlebars context
     * @returns {CodeFile}
     */
    constructor(props = {}) {
        /** @type {string|null} */
        this.relPath = props.relPath || null;
        /** @type {Map<string, any>} */
        this.constants = props.constants instanceof Map
            ? new Map(props.constants)
            : Array.isArray(props.constants)
                ? new Map(props.constants)
                : new Map();
        /** @type {string} */
        this.code = props.code || '';
        /** @type {object} */
        this.context = { ...(props.context || {}) };
        
        this.onPreBundleHook = new Hook('onPreBundle', 'Called immediately before bundling the code file');
        this._preBundleTriggered = false;
    }

    /**
     * Trigger the pre-bundle hook if it hasn't been triggered yet
     * @param {object} [options={}] - Options to pass to the hook
     * @private
     */
    _triggerPreBundleIfNeeded(options = {}) {
        if (!this._preBundleTriggered) {
            this.onPreBundleHook.trigger(this, options);
            this._preBundleTriggered = true;
        }
    }


    /**
     * Add a single line of code
     * @param {string} line - The code line to add
     * @returns {CodeFile}
     */
    addLine(line) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.includes('\n')) {
            throw new Error('Invalid code line: ' + line);
        }
        this.code += trimmed + '\n';
        return this;
    }

    /**
     * Add multiple lines of code
     * @param {...string[]} lines - One or more code lines to add
     * @returns {CodeFile}
     */
    addLines(...lines) {
        for (const line of lines) {
            this.addLine(line);
        }
        return this;
    }

    /**
     * Add a complete block of code
     * @param {string} codeBlock - The complete code block to add
     * @returns {CodeFile}
     */
    addBlock(codeBlock) {
        if (typeof codeBlock !== 'string') {
            throw new Error('Code block must be a string');
        }
        // Add separator if there's already code
        const separator = this.code !== '' ? '\n\n' : '';
        this.code += separator + codeBlock;
        return this;
    }

    /**
     * Include the contents of a file as a code block
     * @param {string} filePath - The path to the file to include
     * @returns {CodeFile}
     */
    includeFileContent(filePath) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return this.addBlock(fileContent);
        } catch (error) {
            throw new Error(`Failed to read file '${filePath}': ${error.message}`);
        }
    }

    /**
     * Include a constant declaration
     * @param {string} name - The name of the constant
     * @param {any} value - The value of the constant
     * @returns {CodeFile}
     */
    includeConstant(name, value) {
        const literalValue = valueToLiteral(value);
        this.constants.set(name, literalValue);
        return this;
    }

    /**
     * Include another CodeFile as a segment
     * @param {CodeFile} segment - The code file to include
     * @returns {CodeFile}
     */
    includeSegment(segment) {
        if (!(segment instanceof CodeFile)) {
            throw new Error('Must include a CodeFile instance');
        }
        if (this.code !== '') {
            this.code += '\n\n';
        }
        this.code += segment.getFinalCode();
        return this;
    }

    /**
     * Include an IIFE (Immediately Invoked Function Expression)
     * @param {Function} fn - The function to include as an IIFE
     * @returns {CodeFile}
     */
    includeIIFE(fn) {
        const separator = getSeparator(this.code);
        const iifeCode = generateIIFE(fn);
        this.code += separator + iifeCode;
        return this;
    }

    /**
     * Include a function
     * @param {Function} fn - The function to include
     * @param {string|undefined} name - Optional name for the function
     * @returns {CodeFile}
     */
    includeFunction(fn, name = undefined) {
        const separator = getSeparator(this.code);
        const functionCode = generateFunction(fn, name);
        this.code += separator + functionCode;
        return this;
    }

    /**
     * Set context variables for Handlebars templating
     * @param {string|object} keyOrObj - Context key or object with multiple keys
     * @param {any} [value] - Context value (if keyOrObj is a string)
     * @returns {CodeFile}
     */
    setContext(keyOrObj, value) {
        if (typeof keyOrObj === 'string') {
            this.context[keyOrObj] = value;
        } else if (typeof keyOrObj === 'object' && keyOrObj !== null) {
            Object.assign(this.context, keyOrObj);
        }
        return this;
    }
     
    onPreBundle(fn) {
        this.onPreBundleHook.register(fn);
        return this;
    }
     
    /**
     * Apply a function to the CodeFile
     * @param {(CodeFile) => void} fn - The function to apply
     * @returns {CodeFile}
     */
    apply(fn) {
        fn(this);
        return this;
    }
     
    references(symbol) {
        if (typeof symbol === 'string') {
            // This should be way more sophisticated, but for now it's a simple check for the symbol in the code
            return this.code.includes(symbol)
        }
        else if (symbol instanceof Function) {
            // Check by name
            return this.code.includes(symbol.name)
        }
        return false;
    }
     
    includeFunctionIfReferenced(symbol) {
        if (this.references(symbol)) {
            this.includeFunction(symbol);
        }
        return this;
    }


    /**
     * Get the current Handlebars context
     * @returns {object}
     */
    getContext() {
        return { ...this.context };
    }

    /**
     * Clear all context variables
     * @returns {CodeFile}
     */
    clearContext() {
        this.context = {};
        return this;
    }

    /**
     * Render Handlebars templates in the current content
     * @param {object} [additionalContext={}] - Additional template context variables (overrides stored context)
     * @returns {CodeFile}
     */
    renderTemplate(additionalContext = {}) {
        // Merge stored context with additional context, with additional taking precedence
        const finalContext = { ...this.context, ...additionalContext };
        const template = Handlebars.compile(this.code);
        const renderedCode = template(finalContext);

        // Create a new CodeFile with rendered content
        return new CodeFile({
            relPath: this.relPath,
            code: renderedCode,
            constants: this.constants,
            context: this.context
        });
    }

    /**
     * Bundle the current content using Bun
     * @param {object} [options={}] - Bun build options
     * @returns {Promise<CodeFile>}
     */
    async bundle(options = {}) {
        this._triggerPreBundleIfNeeded(options);
        // Use data URL to pass code directly to Bun without temporary files
        const dataUrl = `data:text/javascript;base64,${Buffer.from(this.code).toString('base64')}`;

        const defaultOptions = {
            entrypoints: [dataUrl],
            write: false,
            target: 'browser',
            minify: false,
            sourcemap: false,
        };

        const finalOptions = { ...defaultOptions, ...options };
        const result = await Bun.build(finalOptions);

        if (!result.success) {
            throw new Error(`Bundling failed: ${result.logs.map(log => log.message).join(', ')}`);
        }

        const output = result.outputs[0];
        if (!output) {
            throw new Error('No output generated from bundling');
        }

        // Get the bundled code
        const bundledCode = await output.text();

        // Create a new CodeFile with the bundled content
        return new CodeFile({
            relPath: this.relPath,
            code: bundledCode,
            constants: this.constants,
            context: this.context
        });
    }

    /**
     * Get the final code content (with constants prepended for files)
     * @returns {string}
     */
    getFinalCode() {
        // Prepend constants if any exist
        const constantStatements = Array.from(this.constants.entries()).map(([name, value]) => `const ${name} = ${value};`);
        if (constantStatements.length > 0) {
            return constantStatements.join('\n') + '\n\n' + this.code;
        }
        return this.code;
    }

    /**
     * Write the file to disk
     * @param {string|null} [outputPath] - Output path (full path or filename). If not provided, uses this.relPath
     * @param {string} [outputDir='.'] - Output directory (only used if outputPath is a filename)
     * @returns {CodeFile}
     */
    write(outputPath = null, outputDir = '.') {
        // Trigger pre-bundle/finalize hook before writing
        this._triggerPreBundleIfNeeded({});

        let relPath;
        let actualOutputDir = outputDir;

        // Backwards compatibility: if outputPath looks like a directory and no outputDir was specified,
        // treat outputPath as the outputDir
        if (outputPath && !outputPath.includes('.') && fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
            relPath = this.relPath;
            actualOutputDir = outputPath;
        } else {
            relPath = outputPath || this.relPath;
        }

        if (!relPath) {
            throw new Error('Cannot write file without relPath. Use CodeFile.file(relPath) to create a file, or provide outputPath parameter.');
        }

        const filePath = path.isAbsolute(relPath) ? relPath : path.join(actualOutputDir, relPath);
        const dirPath = path.dirname(filePath);

        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, this.getFinalCode());
        return this;
    }
}

export class JSONFile {
    constructor(relPath, properties) {
        this.relPath = relPath;
        if (properties) {
            Object.assign(this, properties);
        }
    }

    write(outputDir = '.') {
        const filePath = path.isAbsolute(this.relPath) ? this.relPath : path.join(outputDir, this.relPath);
        const dirPath = path.dirname(filePath);

        fs.mkdirSync(dirPath, { recursive: true });
        // Create a copy of the instance without internal properties
        const dataToSerialize = { ...this };
        delete dataToSerialize.relPath;
        const content = JSON.stringify(dataToSerialize, null, 2);
        fs.writeFileSync(filePath, content);
    }
}
