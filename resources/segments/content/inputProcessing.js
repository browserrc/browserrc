// Input handling code for content scripts - Template Example
// Rename to inputProcessing.hbs to enable Handlebars templating
import { KeyProcessor } from "../../../core/keyProcessor";

const keyProcessor = new KeyProcessor({
    enabled: {{enabled}},
    debugMode: {{debugMode}},
    keymap: {{{json keymap}}}
});

{{#if debugMode}}
console.log('Input processing initialized');
{{/if}}

document.addEventListener('keydown', (event) => {
    keyProcessor.processKeyEvent(event, true);
});

document.addEventListener('keyup', (event) => {
    keyProcessor.processKeyEvent(event, false);
});

// Usage with fluent API:
// const segment = new CodeFile()
//   .setContext({ enabled: true, debugMode: false })
//   .setContext('keymap', userConfig.keymap)
//   .renderTemplate()
//   .bundle(); 