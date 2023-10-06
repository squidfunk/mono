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
import * as fs from "node:fs/promises"
import { createRequire, isBuiltin } from "node:module"
import * as path from "node:path"

import { closest } from "@squidfunk/mono-resolve"

/* ----------------------------------------------------------------------------
 * Plugin
 * ------------------------------------------------------------------------- */

/**
 * Scope plugin for esbuild
 *
 * This plugin implements intelligent bundling for AWS Lambda functions, so that
 * external dependencies can be deployed as layers, while all packages in scope
 * are bundled into a single file. This allows for faster deployments, as the
 * bundle is much smaller, and simpler debugging.
 */
export const ScopePlugin: Plugin = {
  name: "squidfunk/scope",
  async setup(build) {
    const options = build.initialOptions
    const workdir = options.absWorkingDir!

    // Terminate if the platform is not supported
    if (options.platform !== "node")
      throw new Error(`Unsupported "platform" value: "${options.platform}"`)

    // Compute path to project lockfile
    const root     = path.dirname(closest("lerna.json", workdir)!)
    const lockfile = path.resolve(root, "package-lock.json")

    // Resolve project lockfile
    const { name, packages } = JSON.parse(await fs.readFile(lockfile, "utf8"))
    if (typeof packages === "undefined")
      throw new Error(`Couldn't find "packages" in: ${
        path.relative(".", lockfile)
      }`)

    // Compute path to package manifest and initialize dependency map
    const manifest = path.resolve(workdir, "package.json")
    const map = new Map<string, string>()

    // Resolve dependent packages and mark them as external, except for when
    // they belong to the same scope - we want to keep the size of the code we
    // ship to AWS Lambda as small as possible, so deployments are fast and it's
    // possible to use the web UI for quick debugging
    build.onResolve({ filter: /^[^/.]/ }, async args => {
      if (isBuiltin(args.path) || args.path.startsWith(name))
        return undefined

      // Stop if the package was already determined to be external
      if (options.external!.includes(args.path))
        return undefined

      // Require package for version resolution
      const require = createRequire(args.importer)
      const resolve = path.relative(root, require.resolve(args.path))

      // Resolve package version by moving up the tree
      for (let dir = path.dirname(resolve); dir !== ".";) {
        if (dir in packages) {
          if (!/^@aws-sdk/.test(args.path))
            map.set(args.path, packages[dir].version)

          // Mark package as external
          return { external: true }

        // Move up one directory
        } else {
          dir = path.dirname(dir)
        }
      }

      // Package could not be resolved
      return undefined
    })

    // Create manifest with resolved external dependencies - we need to create
    // this file, so we can install and package exact versions of all external
    // dependencies for AWS Lambda. Priorly, we symlinked `package-lock.json`
    // in the output directory, but this is simpler and more efficient.
    build.onEnd(async () => {
      const { name, type } = JSON.parse(await fs.readFile(manifest, "utf8"))

      // Compute path to package manifest in output directory
      const target = path.join(workdir, options.outdir!, "package.json")
      const dependencies = new Map([...map]
        .sort(([a], [b]) => a.localeCompare(b))
      )

      // Save manifest to output directory
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, JSON.stringify({
        name, type, main: "./index.js",
        dependencies: Object.fromEntries(dependencies)
      }, undefined, 2), "utf8")
    })
  }
}
