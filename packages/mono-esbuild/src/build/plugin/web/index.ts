/*
 * Copyright (c) 2019-2023 Martin Donath <martin.donath@squidfunk.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import { BuildOptions, Metafile, Plugin } from "esbuild"
import { glob } from "glob"
import * as fs from "node:fs/promises"
import * as path from "node:path"

import { optimizeHTML } from "@squidfunk/mono-optimize"

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Minify HTML and inject preload directives
 *
 * @param data - HTML
 * @param metafile - Metafile
 * @param options - Options
 *
 * @returns Optimized HTML
 */
function optimize(
  data: string, metafile: Metafile, options: BuildOptions
): string {
  const index = data.indexOf("<!-- esbuild:preload:js -->")
  if (index !== -1) {
    const chunks =
      Object.keys(metafile.outputs)
        .filter(name => /\.js$/.test(name))
        .map(name => path.relative(options.outdir!, name))
        .map(name => `<link rel="modulepreload" href="/${name}">`)

    // Insert chunk URLs
    data =
      data.slice(0, index) +
      chunks.join("\n") +
      data.slice(index)
  }

  // Return optimized HTML
  return optimizeHTML(data)
}

/* ----------------------------------------------------------------------------
 * Plugin
 * ------------------------------------------------------------------------- */

/**
 * Web plugin for esbuild
 *
 * This plugin is responsible for setting up the build pipeline for Preact,
 * removing `preact/debug` for production builds, copying HTML files to the
 * output directory, and if minification is enabled, making sure that HTML
 * files reference the hashed versions of JavaScript and CSS files.
 */
export const WebPlugin: Plugin = {
  name: "squidfunk/web",
  setup(build) {
    const options = build.initialOptions
    const workdir = options.absWorkingDir!

    // Replace `preact/debug` in production
    if (options.minify) {
      const filter = /^preact\/debug$/

      // Resolve using the ignore namespace
      build.onResolve({ filter }, args => ({
        path: args.path, namespace: "ignore"
      }))

      // Replace contents with empty string
      build.onLoad({ filter, namespace: "ignore" }, () => ({
        contents: ""
      }))
    }

    // Retrieve HTML files and compute names of entrypoints
    const files = glob.sync("**/*.html", { cwd: path.join(workdir, "src") })
    if (files.length && options?.minify)
      options.assetNames = options.entryNames = "[name].[hash]"

    // Replace JavaScript and CSS URLs in HTML files
    build.onEnd(async ({ errors, metafile }) => {
      if (errors.length || !metafile)
        return

      // Resolve and process HTML files
      await Promise.all(files.map(async file => {
        const source = path.join(workdir, "src", file)
        const target = path.join(workdir, options.outdir!, file)

        // Read HTML file contents
        let data = await fs.readFile(source, "utf8")
        if (options.minify) {
          data = optimize(data, metafile, options)

          // Update JavaScript and CSS URLs
          for (const name in metafile?.outputs) {
            if (!/\.(js|css)$/.test(name))
              continue

            // Replace unhashed URL with hashed URL
            const href = path.relative(options.outdir!, name)
            data = data.replace(
              href.replace(/\.\w{8}\./, "."),
              href
            )
          }
        }

        // Save HTML file to output directory
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.writeFile(target, data, "utf8")

        // Update metafile
        file = path.relative(workdir, target)
        metafile.outputs[file] = {
          imports: [], inputs: {},
          exports: [], bytes: data.length
        }
      }))
    })
  }
}
