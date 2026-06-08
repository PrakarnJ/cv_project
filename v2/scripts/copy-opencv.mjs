// Copies the vendored OpenCV.js build from the @techstark/opencv-js
// devDependency into public/opencv/opencv.js, where the app loads it from
// (/opencv/opencv.js). The bundle is ~11MB, so it is gitignored and produced
// here instead — run automatically via postinstall / predev / prebuild.
import { copyFileSync, mkdirSync, existsSync, statSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dest = resolve(here, '../public/opencv/opencv.js')

const require = createRequire(import.meta.url)
let src
try {
  // Resolve through node's module system so it works regardless of cwd.
  src = require.resolve('@techstark/opencv-js/dist/opencv.js')
} catch {
  console.error(
    '[copy-opencv] @techstark/opencv-js not found. Run `npm install` first.'
  )
  process.exit(1)
}

// Skip if the destination already matches (size is a cheap, sufficient check).
if (existsSync(dest) && statSync(dest).size === statSync(src).size) {
  process.exit(0)
}

mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log(`[copy-opencv] wrote ${dest} (${readFileSync(dest).length} bytes)`)
