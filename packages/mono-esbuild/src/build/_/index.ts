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

import * as esbuild from "esbuild"
import {
  BuildContext,
  BuildOptions,
  Platform
} from "esbuild"
import { glob } from "glob"
import * as fs from "node:fs"
import * as path from "node:path"

import { closest, exists, tsconfig } from "@squidfunk/mono-resolve"

import { ReportPlugin, recommended } from "../plugin"

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Resolve entrypoints
 *
 * @param directory - Working directory
 * @param base - Base directory
 *
 * @returns Entrypoints or nothing
 */
function entrypoints(directory: string, base: string): string[] | undefined {
  for (const pattern of ["**/bundle.{ts,tsx}", "index.{ts,tsx}"]) {
    const files = glob.sync(path.join(base, pattern), { cwd: directory })
    if (files.length)
      return files
  }
  return undefined
}

/**
 * Resolve externals from peer dependencies
 *
 * @param directory - Working directory
 *
 * @returns Externals or nothing
 */
function external(directory: string): string[] | undefined {
  const manifest = closest("package.json", directory)
  if (typeof manifest !== "undefined") {
    const { peerDependencies } = JSON.parse(fs.readFileSync(manifest, "utf8"))
    return Object.keys(peerDependencies ?? {})
  }
  return undefined
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Create a build context
 *
 * This function is a thin wrapper around esbuild's `context` function and sets
 * sensible defaults, which are then merged with the given options.
 *
 * @param options - Options
 *
 * @returns Promise resolving with context
 */
export function context(
  options?: BuildOptions
): Promise<BuildContext> {
  return esbuild.context({
    bundle: true,
    legalComments: "none",
    platform: "neutral",
    ...options,
    ...options?.format === "esm" && {
      splitting: options?.platform === "browser"
    },
    plugins: [
      ...options?.plugins ?? recommended(options),
      ReportPlugin
    ],
    metafile: true
  })
}

/**
 * Create a build context project in given directory
 *
 * This function resolves the `tsconfig.json` in the working directory, merges
 * the configuration with the given options and builds the project with esbuild.
 *
 * The source directory is scanned for files called `bundle.ts`, which are all
 * considered to be entrypoints, which makes it easy to add worker scripts. If
 * none is found, the function tries to load `index.ts` from the `baseUrl`
 * directory as specified in `tsconfig.json`.
 *
 * @param directory - Working directory (default: `.`)
 * @param options - Options
 *
 * @returns Promise resolving with context
 */
export async function contextAt(
  directory = ".", options?: BuildOptions
): Promise<BuildContext> {
  const file = path.resolve(directory, "tsconfig.json")!
  if (!exists(file))
    throw new Error(`Couldn't find tsconfig.json in: ${directory}`)

  // Resolve project configuration
  const { compilerOptions } = tsconfig(file)
  const {
    baseUrl,                           // Base directory
    jsxFactory,                        // JSX factory
    jsxFragmentFactory,                // JSX fragment factory
    lib,                               // Libraries
    module: format,                    // Module system
    outDir,                            // Output directory
    sourceMap,                         // Source maps
    sourceRoot,                        // Source map root
    target                             // Compilation target
  } = compilerOptions!

  // Compute platform
  const platform: Platform =
    lib?.includes("dom")
      ? "browser"
      : "node"

  // Create and return context
  return context({
    absWorkingDir: path.resolve(directory),
    entryPoints: entrypoints(directory, baseUrl!),
    alias: {
      "react":     "preact/compat",
      "react-dom": "preact/compat"
    },
    platform,
    external: external(directory),
    format: /^commonjs$/i.test(format!) ? "cjs" : "esm",
    jsxFactory,
    jsxFragment: jsxFragmentFactory,
    loader: {
      ".png": "file"
    },
    outbase: baseUrl,
    outdir: outDir,
    target: target!,
    sourcemap: sourceMap,
    sourceRoot,
    ...options
  })
}
