import fs from 'fs';
import path from 'path';

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

