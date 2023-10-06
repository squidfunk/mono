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

import { glob } from "glob"
import * as fs from "node:fs"
import * as path from "node:path"

import { closest, exists } from "../../_"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Package
 */
export interface Package {
  name: string                         // Package name
  path: string                         // Package path
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Resolve all packages in the current scope
 *
 * This function is implemented synchronously, as it's exclusively intended for
 * our build tools, many of which don't support asynchronous operations.
 *
 * @param directory - Working directory (default: `.`)
 *
 * @returns Package map
 */
export function packages(directory: string = "."): Map<string, Package> {
  const root     = path.dirname(closest("lerna.json", directory)!)
  const manifest = path.resolve(root, "package.json")

  // Resolve project manifest
  const { name, workspaces } = JSON.parse(fs.readFileSync(manifest, "utf8"))
  if (!Array.isArray(workspaces))
    throw new Error(`Couldn't find "workspaces" in: ${
      path.relative(directory, manifest)
    }`)

  // Resolve project package specifiers
  const specs = new Map([[name, manifest]])
  for (const pattern of workspaces)
    for (const workspace of glob.sync(pattern, {
      cwd: root, absolute: true
    }).sort()) {
      const manifest = path.resolve(workspace, "package.json")
      if (exists(manifest)) {
        const { name } = JSON.parse(fs.readFileSync(manifest, "utf8"))
        if (name.startsWith("@"))
          specs.set(name, workspace)
      }
    }

  // Compute and return packages
  return new Map([[name, manifest], ...specs].map(([name, workspace]) => [
    name, { name: name.split("/", 2).pop(), path: workspace }
  ]))
}
