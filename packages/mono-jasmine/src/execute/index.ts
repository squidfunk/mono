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
import { glob } from "glob"
import Jasmine from "jasmine"
import {
  SpecReporter,
  StacktraceOption
} from "jasmine-spec-reporter"
import { randomBytes } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"

import { exists } from "@squidfunk/mono-resolve"

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Options
 */
interface Options {
  filter?: string                      // Filter tests matching pattern
  seed?: string                        // Seed for repeatable results
}

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Try to resolve the file pattern
 *
 * @param pattern - File pattern
 *
 * @returns File pattern (resolved)
 */
function resolve(pattern: string): string {
  try {
    const stat = fs.statSync(pattern)
    if (stat.isDirectory())
      return path.resolve(pattern, "**", "*.spec.{ts,tsx}")
  } catch {
    // File does not exist, just return pattern
  }
  return path.resolve(pattern)
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Execute tests
 *
 * Note that this function cannot be called multiple times in the same process,
 * as Jasmine (as many other test frameworks) pollutes the global scope.
 *
 * @see https://bit.ly/3MlNmH1 - Original stacktrace filter
 *
 * @param files - Test files
 * @param options - Options
 *
 * @returns Promise resolving with result
 */
export async function execute(
  files: string[], options: Options
): Promise<jasmine.JasmineDoneInfo> {
  if (!exists("tsconfig.json"))
    throw new Error("Couldn't find tsconfig.json")

  // Initialize Jasmine
  const jasmine = new Jasmine({})
  jasmine.loadConfig({
    random: false
  })

  // Configure test reporter and improve stacktrace
  jasmine.env.clearReporters()
  jasmine.env.addReporter(new SpecReporter({
    spec: { displayStacktrace: StacktraceOption.RAW },
    stacktrace: {
      filter: trace => {
        const index = trace.lastIndexOf("at <Jasmine>")
        return -1 !== index
          ? trace.slice(0, index + 12)
          : trace
      }
    }
  }))

  // Configure seed for repeatable results
  global.seed = options.seed || randomBytes(4).toString("hex")
  if (typeof options.seed === "undefined")
    jasmine.env.addReporter({
      jasmineDone() {
        console.log(chalk.grey(`For repeatable results, add --seed ${seed}`))
      }
    })

  // Execute tests
  return jasmine.execute(files, options.filter)
}

/**
 * Execute tests after resolving paths
 *
 * Note that this function cannot be called multiple times in the same process,
 * as Jasmine (as many other test frameworks) pollutes the global scope.
 *
 * @param paths - Test paths
 * @param options - Options
 *
 * @returns Promise resolving with result
 */
export async function executeAll(
  paths: string[], options: Options
): Promise<jasmine.JasmineDoneInfo> {
  const files: string[] = []
  for (const pattern of paths.map(resolve))
    files.push(...glob.sync(pattern, { absolute: true }))

  // Terminate if there're no matching files
  if (!files.length)
    throw new Error(`Couldn't resolve tests in: ${paths.join(" ")}`)

  // Run tests in given file list
  return execute(files, options)
}
