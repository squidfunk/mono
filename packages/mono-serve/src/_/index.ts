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

import chalk from "chalk"
import { program } from "commander"
import kebab from "kebab-case"

import { serve, watch } from "../serve"

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Options
 */
interface Options {
  host?: string                        // Serve files on this host
  port?: number                        // Serve files on this port
  watch?: boolean | string[]           // Watch files matching patterns
  fallback?: boolean                   // Use History API fallback
  verbose?: boolean                    // Print file system events
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
  try {
    const { clients } = await serve(directory, options)
    if (options.watch) {
      if (typeof options.watch === "boolean")
        options.watch = ["*"]

      // Option: watch files matching patterns
      const patterns = options.watch
      const watchdog = watch(patterns, { cwd: directory })
      watchdog.on("all", (type, file) => {
        for (const client of clients)
          client.send(file)

        // Print message on event
        if (file && options.verbose) {
          const date = new Date().toISOString()
          console.log(`${chalk.grey(date)} ${kebab(type)} ${chalk.green(file)}`)
        }
      })

      // Print message on ready
      watchdog.on("ready", () => {
        console.log(`Watch ${chalk.green(directory)} ${patterns.join(" ")}`)
      })
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
  .name("mono-serve")
  .arguments("[directory]")
  .description("Static file server and watcher")

  // Option: serve files on this host
  .option(
    "-H, --host <string>",
    "Serve files on this host"
  )

  // Option: serve files on this port
  .option(
    "-p, --port <number>",
    "Serve files on this port",
    parseInt
  )

  // Option: watch files matching patterns
  .option(
    "-w, --watch [patterns...]",
    "Watch files matching patterns"
  )

  // Option: use History API fallback
  .option(
    "-f, --fallback",
    "Use History API fallback"
  )

  // Option: print file system events
  .option(
    "-v, --verbose",
    "Print file system events"
  )

  // Option: help
  .helpOption(
    "-h, --help",
    "Display this message"
  )

  // Execute program
  .action(handler)
  .parseAsync()
