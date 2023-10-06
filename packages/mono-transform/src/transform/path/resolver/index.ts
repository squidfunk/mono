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

import * as path from "node:path"
import * as resolve from "resolve"
import {
  CompilerOptions,
  ModuleKind
} from "typescript"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Resolver
 *
 * @param directory - Directory
 * @param spec - Module specifier
 *
 * @returns Module specifier (resolved)
 */
export type Resolver = (
  directory: string, spec: string
) => string

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Resolver factory
 *
 * @param options - Compiler options
 *
 * @returns Resolver
 */
export function resolver(options: CompilerOptions): Resolver {
  const src = path.resolve(options.baseUrl || ".")

  // Retrieve path mappings and strip wildcards
  const map = new Map<string, string[]>()
  if (typeof options.paths !== "undefined")
    for (const [alias, paths] of Object.entries(options.paths))
      map.set(
        alias.replace(/(?:^|\/)\*$/, ""),
        paths.map(part => part.replace(/(?:^|\/)\*$/, ""))
      )

  // Return resolver
  return (directory, spec) => {
    let file = spec

    // Handle path mappings
    for (const [alias, [candidate]] of map)
      if (spec.startsWith(alias)) {
        file = path.join(src, spec.replace(alias, candidate))
        break
      }

    // Handle internal module specifiers
    if (/^\.{0,2}\//.test(file)) {

      // Resolve path to file when using ES modules
      if (
        options.module === ModuleKind.ES2020 ||
        options.module === ModuleKind.ESNext
      )
        file = resolve.sync(file, {
          basedir: directory,
          extensions: [".ts", ".tsx"]
        })
          .replace(/\.t(?=sx?$)/, ".j")

      // Convert to absolute path
      if (!path.isAbsolute(file))
        file = path.resolve(directory, file)

      // Convert to relative path again
      spec = path.relative(directory, file)
      if (!spec.startsWith("."))
        spec = `./${spec}`
    }

    // Return module specifier
    return spec
  }
}
