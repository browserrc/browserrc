import { build, contentScripts } from 'browserrc'


contentScripts.create('test.js', () => {
    console.log('hello from test')
})

contentScripts.create('test.js', () => {
    console.log('hello from test again')
})


build({
    outputDir: 'examples/contentScriptBundling/dist',
    platforms: {
        chrome: true,
    },
    dev: {
        minify: false,
    }
})
