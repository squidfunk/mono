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

import chalk from "chalk"
import {
  BuildOptions,
  Plugin,
  analyzeMetafile
} from "esbuild"
import * as fs from "node:fs/promises"
import * as path from "node:path"

import { closest } from "@squidfunk/mono-resolve"

import { OptimizePlugin } from "../optimize"
import { ResolvePlugin } from "../resolve"
import { StylePlugin } from "../style"
import { WebPlugin } from "../web"

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Retrieve list of recommended plugins
 *
 * This function returns a list of recommended plugins based on the given build
 * options. It's normally invoked internally as part of the executable, but can
 * also be used by the caller to alter the list of recommended plugins prior to
 * executing the build.
 *
 * @param options - Options
 *
 * @returns Plugins
 */
export function recommended(options?: BuildOptions): Plugin[] {
  const plugins: Plugin[] = [ResolvePlugin]

  // Add plugins for browser platform
  if (options?.platform === "browser")
    plugins.push(WebPlugin, StylePlugin)

  // Add plugins for production build
  if (options?.minify)
    plugins.push(OptimizePlugin)

  // Return plugins
  return plugins
}

/* ----------------------------------------------------------------------------
 * Plugin
 * ------------------------------------------------------------------------- */

/**
 * Report plugin for esbuild
 */
export const ReportPlugin: Plugin = {
  name: "squidfunk/report",
  setup(build) {
    const options = build.initialOptions
    const workdir = options.absWorkingDir!

    // Compute path to project manifest
    const manifest = closest("package.json", workdir)!
    if (typeof manifest === "undefined")
      throw new Error(`Couldn't find package.json in: ${
        path.relative(".", workdir)
      }`)

    // Initialize build metrics
    let start: Date

    // Track start time of build
    build.onStart(() => {
      start = new Date()
    })

    // Print build summary
    build.onEnd(async ({ errors, metafile }) => {
      const duration = `${+new Date() - +start}ms`
      if (errors.length || !metafile)
        return

      // Resolve project manifest and print duration
      const { name } = JSON.parse(await fs.readFile(manifest, "utf8"))
      console.log(`\n  Built ${chalk.green(name)} in ${chalk.yellow(duration)}`)
      if (typeof metafile !== "undefined")
        console.log(await analyzeMetafile(metafile, { color: true }))
    })
  }
}
