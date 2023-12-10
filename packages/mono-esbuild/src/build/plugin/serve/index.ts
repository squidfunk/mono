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

import { Plugin } from "esbuild"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"

import { serve } from "@squidfunk/mono-serve"

/* ----------------------------------------------------------------------------
 * Plugin
 * ------------------------------------------------------------------------- */

/**
 * Serve plugin for esbuild
 */
export const ServePlugin: Plugin = {
  name: "squidfunk/serve",
  async setup(build) {
    const options = build.initialOptions
    const workdir = options.absWorkingDir!

    // Start file server
    const output = path.join(workdir, options.outdir!)
    const server = await serve(path.relative(".", output), {
      watch: true, fallback: options.platform === "browser"
    })

    // Initialize content hash table
    const table = new Map<string, string>()

    // Compute changed files and notify clients
    build.onEnd(async ({ errors, metafile }) => {
      if (errors.length || !metafile)
        return

      // Filter output files to analyze
      const files: string[] = []
      for (const file in metafile.outputs)
        if (!file.endsWith(".map"))
          files.push(file)

      // Compute content hashes
      const check = new Map(
        await Promise.all(files.map(async file => {
          const target = path.join(workdir, file)

          // Read output file and compute digest
          const data = await fs.readFile(target)
          const hash = createHash("sha1").update(data)
          return [
            file,
            hash.digest("hex")
          ] as const
        }))
      )

      // Compute changed files
      const changed: string[] = []
      for (const [file, hash] of check) {
        if (hash !== table.get(file))
          changed.push(file)

        // Update content hash table
        table.set(file, hash)
      }

      // Notify clients to reload style sheet
      if (changed.length === 1 && changed[0].endsWith(".css")) {
        for (const client of server.clients)
          client.send(path.relative(options.outdir!, changed[0]))

      // Notify clients to reload window
      } else {
        for (const client of server.clients)
          client.send("unknown")
      }
    })
  }
}
