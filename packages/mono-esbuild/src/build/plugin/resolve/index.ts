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
import * as path from "node:path"

import { packages } from "@squidfunk/mono-resolve"

/* ----------------------------------------------------------------------------
 * Plugin
 * ------------------------------------------------------------------------- */

/**
 * Resolve plugin for esbuild
 *
 * This is an opinionated resolver, which maps all packages in scope to their
 * respective TypeScript sources and resolves common path mappings. The path
 * mappings are expected to follow certain rules, which we use across the
 * entirety of our code base:
 *
 * - Imports referring to packages in current scope are resolved to their `src`
 *   directories, so changes in sources always trigger a rebuild. This does not
 *   apply to packages which define the `exports` field in their `package.json`
 *   manifest, as resolution would incur too much overhead.
 *
 * - Imports starting with `~` are always resolved to the `src` directory of
 *   the containing package, ignoring any path mappings in `tsconfig.json`
 *
 * All other packages are resolved using the default node module resolution
 * algorithm as employed by esbuild.
 */
export const ResolvePlugin: Plugin = {
  name: "squidfunk/resolve",
  async setup(build) {

    // Resolve packages in current scope
    const scopes   = packages()
    const [[name]] = scopes

    // Exclude packages that define exports from TypeScript source resolution
    for (const [id, scope] of [...scopes]) {
      const manifest = path.resolve(scope.path, "package.json")

      // If the package has `exports`, bail out of TypeScript source resolution,
      // as we'd need to check conditions when importing (e.g. browser or node),
      // which is just infeasible for the tiny upside we get. In that case, the
      // caller is responsible for ensuring that the package is being built.
      const { exports } = JSON.parse(await fs.readFile(manifest, "utf8"))
      if (typeof exports !== "undefined")
        scopes.delete(id)
    }

    // Resolve dependent packages within current scope, if possible
    build.onResolve({ filter: new RegExp(name) }, async args => {
      const { path: id, ...rest } = args
      if (!scopes.has(id))
        return undefined

      // Resolve package path
      return build.resolve(
        path.join(scopes.get(id)!.path, "src"),
        rest
      )
    })

    // Resolve internal references within each package
    build.onResolve({ filter: /^~/, namespace: "file" }, async args => {
      const { path: id, ...rest } = args
      return build.resolve(
        path.join(
          args.resolveDir.replace(/(src|tests).*$/, "$1"),
          id.slice(2)
        ),
        rest
      )
    })
  }
}
