import { build, isBackground, isChrome, isContentScript, manifest } from 'browserrc'

// Both background and content scripts use the same conditional pattern for minimal bundles:
if (isBackground()) {
    console.log('hello from background')
}

manifest.action = (tab) => {
    console.log('clicked', tab?.id)
}

if (isChrome() && isContentScript('content.js', {})) {
    console.log('hello from content')
}

build({
    outputDir: 'examples/backgroundScriptFeatures/dist',
    platforms: {
        chrome: true,
        firefox: true,
    },
    dev: {
        minify: true,
    }
})
