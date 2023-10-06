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
import {
  ConfigOptions,
  Server,
  config as _,
  constants
} from "karma"
import { randomBytes } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { DefinePlugin } from "webpack"

import { closest } from "@squidfunk/mono-resolve"

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
 * Bootstrap configuration options
 *
 * @param files - Test files
 * @param options - Options
 *
 * @returns Promise resolving with configuration options
 */
async function configuration(
  files: string[], options: Options
): Promise<ConfigOptions> {
  const config: ConfigOptions = {
    singleRun: true,

    // Test files
    files,

    // Frameworks to be used
    frameworks: ["webpack", "jasmine"],

    // Preprocessors
    preprocessors: {
      "**/*.{ts,tsx}": ["webpack", "sourcemap"]
    },

    // Webpack configuration
    webpack: {
      mode: "development",

      // Loaders
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            use: {
              loader: "ts-loader",
              options: {
                compilerOptions: {
                  declaration: false,
                  declarationMap: false
                },
                logLevel: "error"
              }
            },
            exclude: /\/node_modules\//
          },
          {
            test: /chance\.js$/,
            use: {
              loader: "string-replace-loader",
              options: {
                search: /^/,
                replace: [
                  `seed = "${options.seed}";`
                ].join("\n")
              }
            }
          }
        ]
      },

      // Plugins
      plugins: [
        new DefinePlugin({
          "process.env": {}
        })
      ],

      // Statistics
      stats: {
        entrypoints: false
      },

      // Hack: chunk splitting breaks source maps: https://bit.ly/2Zm4x50
      optimization: {
        splitChunks: false
      },

      // Module resolver
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".json"]
      },

      // Source map support
      devtool: "inline-source-map"
    },

    // Webpack middleware configuration
    webpackMiddleware: {
      noInfo: true
    },

    // Reporters
    reporters: ["spec"],

    // Browsers
    browsers: [
      process.env.CI
        ? "ChromeHeadless"
        : "Chrome"
    ],

    // Configuration for test reporter
    specReporter: {
      suppressErrorSummary: true
    },

    // Configuration for client
    client: {
      jasmine: {
        random: false
      }
    },

    // Log level
    logLevel: constants.LOG_WARN,

    // Hack: don't serve TypeScript files with "video/mp2t" mime type
    mime: {
      "text/x-typescript": ["ts", "tsx"]
    }
  }

  // Option: watch affected files for changes
  if (options.watch) {
    config.reporters!.push("clear-screen")
    config.specReporter!.suppressSkipped = true
    config.singleRun = false
  }

  // Option: instrument and compute coverage
  if (options.coverage) {
    config.reporters!.push("coverage-istanbul")
    config.webpack.module!.rules!.push({
      test: /\.tsx?$/,
      use: {
        loader: "babel-loader",
        options: {
          plugins: ["babel-plugin-istanbul"]
        }
      },
      include: closest("src", path.dirname(files[0])),
      enforce: "post"
    })
    // @ts-expect-error - false positive
    config.coverageIstanbulReporter = {
      reports: ["html", "text"]
    }
  }

  // Option: filter tests matching pattern
  if (options.filter)
    config.client!.args = ["--grep", options.filter]

  // We're good to go
  return config
}

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
 * @param files - Test files
 * @param options - Options
 *
 * @returns Promise resolving with result
 */
export async function execute(
  files: string[], options: Options
): Promise<boolean> {
  const seed = options.seed || randomBytes(4).toString("hex")

  // Bootstrap configuration
  const config = await configuration(files, { ...options, seed })
  const custom = closest("karma.conf.ts", path.dirname(files[0]))

  // Apply custom configuration
  if (typeof custom !== "undefined") {
    const { default: extend } = await import(custom)
    if (typeof extend !== "function")
      throw new Error(`Invalid configuration in: ${custom}`)

    // Shallow merge with configuration
    extend(Object.assign(config, {
      set(values: ConfigOptions) {
        Object.assign(config, values)
      }
    }))
  }

  // Execute tests
  const result = await _.parseConfig(undefined, config)
  return new Promise(done => {
    void new Server(result, code => {
      done(code === 0)
      if (typeof options.seed === "undefined")
        console.log(chalk.grey(`For repeatable results, add --seed ${seed}`))
    })
      .start()
  })
}

/**
 * Execute tests after resolving paths
 *
 * @param paths - Test paths
 * @param options - Options
 *
 * @returns Promise resolving with result
 */
export async function executeAll(
  paths: string[], options: Options
): Promise<boolean> {
  const files: string[] = []
  for (const pattern of paths.map(resolve))
    files.push(...glob.sync(pattern, { absolute: true }))

  // Terminate if there're no matching files
  if (!files.length)
    throw new Error(`Couldn't resolve tests in: ${paths.join(" ")}`)

  // Run tests in given file list
  return execute(files, options)
}
