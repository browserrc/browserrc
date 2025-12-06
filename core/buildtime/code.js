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
        this.constants.set(name, value);
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