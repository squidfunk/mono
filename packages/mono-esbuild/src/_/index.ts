#!/usr/bin/env node

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

import { program } from "commander"
import { Platform } from "esbuild"
import * as path from "node:path"

import { exists, tsconfig } from "@squidfunk/mono-resolve"

import {
  CleanPlugin,
  ObfuscatePlugin,
  ScopePlugin,
  WatchPlugin,
  contextAt,
  recommended
} from "../build"

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Options
 */
interface Options {
  watch?: boolean                      // Watch affected files for changes
  clean?: boolean                      // Clean previously built artifacts
  scope?: boolean                      // Bundle packages in local scope only
  minify?: boolean                     // Minify source after bundling
  obfuscate?: boolean                  // Obfuscate by compiling to bytecode
}

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Program handler
 *
 * @param directory - Working directory (default: `.`)
 * @param options - Options
 *
 * @returns Promise resolving with no result
 */
async function handler(
  directory = ".", options: Options = {}
): Promise<void> {
  const file = path.resolve(directory, "tsconfig.json")
  try {
    if (!exists(file))
      throw new Error(`Couldn't find tsconfig.json in: ${directory}`)

    // Resolve project configuration
    const { compilerOptions } = tsconfig(file)
    const { lib } = compilerOptions!

    // Compute platform
    const platform: Platform =
      lib?.includes("dom")
        ? "browser"
        : "node"

    // Retrieve recommended plugins for platform
    const plugins = recommended({
      platform,
      minify: options.minify
    })

    // Option: watch affected files for changes
    if (options.watch)
      plugins.push(WatchPlugin)

    // Option: clean previously built artifacts
    if (options.clean)
      plugins.push(CleanPlugin)

    // Option: bundle packages in local scope only
    if (options.scope)
      plugins.push(ScopePlugin)

    // Option: obfuscate by compiling to bytecode
    if (options.obfuscate)
      plugins.push(ObfuscatePlugin)

    // Create build context in working directory
    const context = await contextAt(directory, {
      plugins,
      minify: options.minify || options.obfuscate
    })

    // Build project and start watch mode
    if (options.watch) {
      await context.watch()

    // Build project and exit
    } else {
      await context.rebuild()
      await context.dispose()
    }

  // Catch and log all errors
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

/* ----------------------------------------------------------------------------
 * Program
 * ------------------------------------------------------------------------- */

void program
  .name("mono-esbuild")
  .arguments("[directory]")
  .description("TypeScript bundler")

  // Option: watch affected files for changes
  .option(
    "-w, --watch",
    "Watch affected files for changes"
  )

  // Option: clean previously built artifacts
  .option(
    "-c, --clean",
    "Clean previously built artifacts"
  )

  // Option: bundle packages in local scope only
  .option(
    "-s, --scope",
    "Bundle packages in local scope only"
  )

  // Option: minify source after bundling
  .option(
    "-m, --minify",
    "Minify source after bundling"
  )

  // Option: obfuscate by compiling to bytecode
  .option(
    "-x, --obfuscate",
    "Obfuscate by compiling to bytecode"
  )

  // Option: help
  .helpOption(
    "-h, --help",
    "Display this message"
  )

  // Execute program
  .action(handler)
  .parseAsync()
