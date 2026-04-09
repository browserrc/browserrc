# browserrc Architecture

`browserrc` is a framework designed to simplify the creation of browser extensions by allowing developers to define an entire extension in a single JavaScript file. It bridges the gap between high-level declarative configuration and the low-level browser extension APIs.

## Core Components

The framework is built around four main pillars:

### 1. Build-Time System (`core/buildtime/`)
This is the heart of the "single-file" experience. It uses Bun's bundling capabilities to process your extension's code and assets.
- **Manifest Generation (`manifest.ts`)**: Automatically generates `manifest.json` for both Chrome and Firefox, handling the differences between MV3 implementations.
- **CodeFile Container (`code.js`)**: A sophisticated abstraction for managing code blocks. It supports Handlebars templating, constant injection, and on-the-fly bundling.
- **Background & Content Scripts**: Specialized modules that manage the lifecycle and registration of these scripts within the manifest.

### 2. Key Processing Engine (`core/keyProcessor.js`)
A powerful, vim-inspired key sequence matching system.
- **Trie Data Structure (`trie.js`)**: Efficiently stores and looks up key sequences.
- **Key Parser (`keyParser.js`)**: Translates standard keyboard events and Vim-style notation (e.g., `<C-a>`, `<leader>`) into a normalized format.
- **Processor**: Handles multi-mode support (like Vim's normal/insert modes), timeouts for ambiguous sequences, and key repeating.

### 3. RPC & Action System (`core/rpc.js`)
Enables seamless communication between different extension environments (e.g., background script vs. content script).
- **Deterministic Action IDs**: Uses a hashing algorithm based on the function's source code and execution environment to create unique, serializable identifiers.
- **Environment Inference**: Automatically detects if code is running in a page, background, Node.js, or Bun environment.

### 4. Code Generation (`core/codegen/`)
Utilities for generating auxiliary files needed by extensions.
- **HTML Codegen**: Facilitates the creation of popup pages and other HTML assets from within the main JavaScript file, often using JSX-like syntax.

## How it Works

1.  **Definition**: The developer defines the extension using the `browserrc` API (manifest, content scripts, actions).
2.  **Build**: When the `build()` function is called:
    - Build-time hooks are triggered.
    - `CodeFile` objects are bundled and transformed.
    - Assets like popups are compiled.
    - Manifest files are generated for the target platforms.
3.  **Output**: A standard browser extension directory structure is created (e.g., `dist/chrome/`, `dist/firefox/`), ready for loading into a browser.

## Philosophy

- **Unified Entrypoint**: Reduce the cognitive load of managing multiple files and complex directory structures.
- **Declarative Manifest**: Configure the extension via code rather than manual JSON editing.
- **Modern Tooling**: Leverage Bun for fast bundling and a modern developer experience.
- **Vim-like Power**: Provide first-class support for keyboard-driven interfaces.
