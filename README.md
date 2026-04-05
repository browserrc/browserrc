# browserrc

Make browser extensions in one file.

## Features

- **Single-File Extension**: Define your extension's background script, content scripts, and manifest in one file.
- **Declarative Manifest**: Configure the extension via code rather than manual JSON editing.
- **Cross-Platform**: Automatically generates `manifest.json` for both Chrome and Firefox.
- **Vim-Inspired Key Handling**: Powerful, multi-mode, trie-based key sequence matching.
- **RPC System**: Easily execute actions between different extension environments.
- **Built with Bun**: Fast bundling and modern developer experience.

## Install

```bash
npm install https://github.com/browserrc/browserrc.git
```

## Usage

### Simple Extension

Create a file called `my-extension.js`:

```javascript
import { manifest, contentScripts, build, onAllPages } from 'browserrc';

// Configure the manifest
manifest.name = "My Extension";
manifest.version = "1.0.0";
manifest.permissions = ["tabs", "storage"];

// Define a content script that runs on all pages
onAllPages(() => {
  console.log("Hello from browserrc content script!");
  document.body.style.border = "5px solid green";
});

// Build the extension for Chrome and Firefox
await build({
  platforms: { chrome: true, firefox: true },
  outputDir: './dist'
});
```

### Advanced Key Handling

```javascript
import { contentScripts } from 'browserrc';

const keys = contentScripts.keyHandling();
keys.set('<leader>ww', () => {
  console.log('Window prefix triggered');
});
```

## Architecture

For a deeper dive into how `browserrc` works, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

Contributions are welcome!

## License

MIT
