import { build, js } from 'browserrc'

const FOO = "BAR"

js('test.js', async () => {
    console.log(FOO)
})

js('test2.js', () => {
    console.log('hello from test2' + FOO)
})

js('test3.js', () => {
    console.log('hello from test3')
})

build({
    outputDir: 'examples/jsSelfBundling/dist',
    platforms: {
        chrome: true,
        firefox: true,
    },
})

