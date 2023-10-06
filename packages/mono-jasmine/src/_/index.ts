#!/usr/bin/env tsx

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
import { ChildProcess, spawn } from "node:child_process"
import * as path from "node:path"

import { watch } from "@squidfunk/mono-serve"

import { executeAll } from "../execute"

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Options
 */
interface Options {
  watch?: boolean                      // Watch affected files for changes
  coverage?: boolean                   // Instrument and compute coverage
  filter?: string                      // Filter tests matching pattern
  seed?: string                        // Seed for repeatable results
}

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Filter an option from the list of arguments
 *
 * @param args - List of arguments
 * @param option - Option to filter
 *
 * @returns Filtered arguments
 */
function without(args: string[], option: keyof Options): string[] {
  return args.filter(arg => (
    ![`--${option}`, `-${option[0]}`].includes(arg)
  ))
}

/* ------------------------------------------------------------------------- */

/**
 * Program handler
 *
 * @param files - Test files
 * @param options - Options
 *
 * @returns Promise resolving with no result
 */
async function handler(
  files: string[], options: Options = {}
): Promise<void> {
  const [node, script, ...rest] = process.argv
  try {
    files = files.length ? files : ["."]
    if (options.watch) {
      const args = without(rest, "watch")

      // Option: watch affected files for changes
      const watchdog = watch("**/*.{json,ts}", { ignoreInitial: true })
      const listener = (() => {
        let child: ChildProcess
        return () => {
          process.stdout.write("\x1b[2J\x1b[3J\x1b[H\x1bc")

          // Respawn child process
          child?.kill()
          child = spawn(script, args, { stdio: "inherit" })
        }
      })()

      // Attach event listeners
      for (const event of ["ready", "all"])
        watchdog.on(event, listener)

    // Option: instrument and compute coverage
    } else if (options.coverage) {
      const base = path.dirname(script)
      const args = without(rest, "coverage")
      spawn(node, [`${base}/c8`, ...[
        "--exclude", "**/{support,tests}/**",
        ...["html", "lcov", "text"].flatMap(type => [
          "--reporter", type
        ])
      ], script, ...args], {
        stdio: "inherit"
      })

    // Execute tests
    } else {
      await executeAll(files, options)
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
  .name("mono-jasmine")
  .arguments("[files...]")
  .description("Jasmine test runner")

  // Option: watch affected files for changes
  .option(
    "-w, --watch",
    "Watch affected files for changes"
  )

  // Option: instrument and compute coverage
  .option(
    "-c, --coverage",
    "Instrument and compute coverage"
  )

  // Option: filter tests matching pattern
  .option(
    "-f, --filter <pattern>",
    "Filter tests matching pattern"
  )

  // Option: seed for repeatable results
  .option(
    "-s, --seed <value>",
    "Seed for repeatable results"
  )

  // Option: help
  .helpOption(
    "-h, --help",
    "Display this message"
  )

  // Execute program
  .action(handler)
  .parseAsync()
