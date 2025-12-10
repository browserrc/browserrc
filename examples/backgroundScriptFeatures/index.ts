import { build, isBackground, isContentScript } from 'browserrc'

// Both background and content scripts use the same conditional pattern for minimal bundles:
if (isBackground()) {
    console.log('hello from background')
}

if (isContentScript('content.js')) {
    console.log('hello from content')
}

build({
    outputDir: 'examples/backgroundScriptFeatures/dist',
    platforms: {
        chrome: true,
    },
    dev: {
        minify: true,
    }
})
