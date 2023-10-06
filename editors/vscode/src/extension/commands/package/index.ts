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
import { window } from "vscode"

import { closest, tsconfig } from "@squidfunk/mono-resolve"

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Resolve package folder for open file
 *
 * @returns Package folder or nothing
 */
export function resolvePackageFolder(): string | void {
  const file = window.activeTextEditor?.document.fileName
  if (typeof file !== "undefined") {
    const manifest = closest("package.json", path.dirname(file))
    if (typeof manifest === "undefined")
      throw new Error(`Couldn't resolve package.json relative to: ${
        path.relative(".", path.dirname(file))
      }`)

    // Return package folder
    return path.dirname(manifest)
  }
}

/**
 * Resolve package source folder for open file
 *
 * @returns Package source folder or nothing
 */
export function resolvePackageSourceFolder(): string | void {
  const base = resolvePackageFolder()
  if (typeof base !== "undefined") {
    const config = path.resolve(base, "tsconfig.json")

    // Ensure package source folder is set in compiler options
    const { compilerOptions } = tsconfig(config)
    if (typeof compilerOptions?.baseUrl === "undefined")
      throw new Error(`Couldn't find "compilerOptions.baseUrl" in: ${
        path.relative(".", config)
      }`)

    // Return package source folder
    return path.resolve(base, compilerOptions.baseUrl)
  }
}

/**
 * Resolve package output folder for open file
 *
 * @returns Package output folder or nothing
 */
export function resolvePackageOutputFolder(): string | void {
  const base = resolvePackageFolder()
  if (typeof base !== "undefined") {
    const config = path.resolve(base, "tsconfig.json")

    // Ensure package output folder is set in compiler options
    const { compilerOptions } = tsconfig(config)
    if (typeof compilerOptions?.outDir === "undefined")
      throw new Error(`Couldn't find "compilerOptions.outDir" in: ${
        path.relative(".", config)
      }`)

    // Return package output folder
    return path.resolve(base, compilerOptions.outDir)
  }
}
