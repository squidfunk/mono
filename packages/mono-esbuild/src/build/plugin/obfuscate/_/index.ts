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

import { Plugin, build } from "esbuild"
import * as fs from "node:fs/promises"
import * as path from "node:path"

import { compile } from "../compile"

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Build runtime and inject bytecode
 *
 * @param buffer - Bytecode
 *
 * @returns Promise resolving with runtime
 */
async function runtime(buffer: Buffer): Promise<string> {
  const { pathname } = new URL(
    path.join("..", "internal", "index.js"),
    import.meta.url
  )

  // Build runtime
  const { outputFiles: [file] } =
    await build({
      entryPoints: [pathname],
      platform: "node",
      define: {
        __CODE__: `"${buffer.toString("base64")}"`
      },
      bundle: true,
      minify: true,
      write: false
    })

  // Return runtime
  return file.text
}

/* ----------------------------------------------------------------------------
 * Plugin
 * ------------------------------------------------------------------------- */

/**
 * Obfuscate plugin for esbuild
 *
 * This plugin compiles each JavaScript file generated as part of the output by
 * esbuild to bytecode in order to obfuscate its source. The bytecode is wrapped
 * with a few lines of JavaScript which set up the runtime for the bytecode to
 * be executed. For more information, refer to the `compile` function.
 */
export const ObfuscatePlugin: Plugin = {
  name: "squidfunk/obfuscate",
  setup(build) {
    const options = build.initialOptions
    const workdir = options.absWorkingDir!

    // Terminate if the platform is not supported
    if (options.platform !== "node")
      throw new Error(`Unsupported "platform" value: "${options.platform}"`)

    // Terminate if the module type is not supported
    if (options.format !== "cjs")
      throw new Error(`Unsupported "format" value: "${options.format}"`)

    // Obfuscate JavaScript files
    build.onEnd(async ({ metafile }) => {
      if (typeof metafile === "undefined")
        throw new Error(`Couldn't find "metafile" in options`)

      // Filter output files to obfuscate
      const files: string[] = []
      for (const file in metafile.outputs)
        if (file.endsWith(".js"))
          files.push(file)

      // Compile output files to bytecode
      await Promise.all(files.map(async file => {
        const target = path.join(workdir, file)

        // Read JavaScript file and compile to bytecode
        const data = await fs.readFile(target, "utf8")
        const code = await runtime(compile(data, { filename: file }))

        // Save JavaScript file to output directory and update metafile
        await fs.writeFile(target, code)
        metafile.outputs[file].bytes = code.length
      }))
    })
  }
}
