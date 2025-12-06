import fs from 'fs';
import path from 'path';

function validatePageContextCodeLine() {
    // validation for code lines in the page context    
    // currently a no-op, but can be used to check for things which won't run in the page context
}

function validateBackgroundContextCodeLine() {
    // validation for code lines in the background context
    // currently a no-op, but can be used to check for things which won't run in the background context
}

function validateCodeLine(line) {
    // validation is currently a no-op but framework for future validation
    // this function is called with the CodeSegment instance as 'this'
    if (this.environment === 'page') {
        validatePageContextCodeLine(line);
    } else if (this.environment === 'background') {
        validateBackgroundContextCodeLine(line);
    }
}


 export class CodeSegment {
    /**
     * Create a new code segment for a specific environment.
     * @param {import("browserrc").Environment} environment - The environment to create the code segment for
     * @returns {CodeSegment}
     */
    constructor(environment) {
        this.environment = environment;
        this.code = '';
    }

    /**
     * Add a single line of code to the builder.
     *
     * @param {string} line - The code line to add. Must be a single line (no newlines) and not empty.
     * @returns {void}
     */
    addLine(line) {
        const trimmed = line.trim()
        if (trimmed === '' || trimmed.includes('\n')) {
            throw new Error('Invalid code line: ' + line);
        }
        validateCodeLine.call(this, trimmed);
        this.code += trimmed + '\n';
    }
    
    /**
     * Add multiple lines of code to the builder.
     * @param {...string[]} lines - One or more code lines to add
     * @returns {void}
     */
    addLines(...lines) {
        for (const line of lines) {
            this.addLine(line);
        }
    }
}


export class JavascriptFile {
   constructor(relPath) {
       this.relPath = relPath;
       this.constants = new Map();
       this.body = '';
   }

    includeSegment(segment) {
        if (this.body !== '') {
            this.body += '\n\n'
        }
        this.body += segment.code;
    }

    includeConstant(name, value) {
        // Convert the value to a proper JavaScript literal string
        let literalValue;
        if (typeof value === 'string') {
            // Escape quotes and wrap in quotes
            literalValue = JSON.stringify(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            // Numbers and booleans can be used directly
            literalValue = String(value);
        } else if (value === null) {
            literalValue = 'null';
        } else if (value === undefined) {
            literalValue = 'undefined';
        } else {
            // For complex objects, use JSON.stringify
            literalValue = JSON.stringify(value);
        }
        this.constants.set(name, literalValue);
    }
    
    /**
     * @param {Function} code - The code to include in the IIFE
     */
    includeIIFE(fn) {
        const fnCode = fn.toString();
        if (this.body !== '') {
            this.body += '\n\n';
        }
        this.body += `(${fnCode})();`;
    }
    
    /**
     * Include the function as a module level function
     * @param {Function} fn - The function to include
     * @param {string?} name - The name of the function
     */
    includeFunction(fn, name = undefined) {
        const fnCode = fn.toString();
        if (this.body !== '') {
            this.body += '\n\n';
        }

        // Check if it's an arrow function (first line doesn't contain "function")
        const firstLine = fnCode.split('\n')[0];
        const isArrowFunction = !firstLine.includes('function');

        if (isArrowFunction) {
            // Arrow functions must have a name parameter
            if (!name) {
                throw new Error('Arrow functions must have a name parameter');
            }
            this.body += `const ${name} = ${fnCode};`;
            return;
        }

        // Regular function (named or anonymous)
        if (name) {
            // Rename the function by replacing the function name
            const renamedFnCode = fnCode.replace(
                /^(async\s+)?function(\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?/,
                `$1function ${name}`
            );
            this.body += renamedFnCode;
            return;
        }

        this.body += fnCode;
    }


    write(outputDir = '.') {
        const filePath = path.isAbsolute(this.relPath) ? this.relPath : path.join(outputDir, this.relPath);
        // Ensure the directory exists
        const dirPath = path.dirname(filePath);
        fs.mkdirSync(dirPath, { recursive: true });
        const constantStatements = Array.from(this.constants.entries()).map(([name, value]) => `const ${name} = ${value};`);
        const content = constantStatements.join('\n') + '\n\n' + this.body;
        fs.writeFileSync(filePath, content);
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
        // Ensure the directory exists
        const dirPath = path.dirname(filePath);
        fs.mkdirSync(dirPath, { recursive: true });
        // Create a copy of the instance without internal properties
        const dataToSerialize = { ...this };
        delete dataToSerialize.relPath;
        const content = JSON.stringify(dataToSerialize, null, 2);
        fs.writeFileSync(filePath, content);
    }
}