const rollup = require('rollup')
const babel = require('rollup-plugin-babel')
const cleanup = require('rollup-plugin-cleanup')

const esm = {
  input: 'src/index.js',
  output: {
    file: 'dist/promise.esm.js',
    format: 'es',
  }
}

const umd = {
  input: 'src/index.js',
  output: {
    file: 'dist/promise.min.js',
    format: 'umd',
    name: 'Promise',
  }
}

const cjs = {
  input: 'src/index.js',
  output: {
    file: 'dist/promise.common.js',
    format: 'cjs',
  }
}

async function build (cfg) {
  const bundle = await rollup.rollup({
    input: cfg.input,
    plugins: [
      cleanup(),
      babel({
        exclude: 'node_modules/**',
        presets: ['es2015-rollup'],
      }),
    ]
  })
  await bundle.generate(cfg.output)
  await bundle.write(cfg.output)
}

build(esm)
build(cjs)
build(umd)

