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

import chokidar, {
  FSWatcher,
  WatchOptions
} from "chokidar"

import { pathspec } from "@squidfunk/mono-resolve"

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Resolve patterns from closest `.gitignore`
 *
 * @param directory - Working directory (default: `.`)
 *
 * @returns Ignore patterns
 */
function ignored(directory = "."): string[] {
  return pathspec(".gitignore", directory)
    .filter(pattern => !pattern.includes("dist"))
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Watch files matching the given paths
 *
 * @param paths - File paths
 * @param options - Options
 *
 * @returns Promise resolving with file system watcher
 */
export function watch(
  paths: string | string[], options?: WatchOptions
): FSWatcher {
  return chokidar.watch(paths, {
    ...options,
    ignored: [
      ...ignored(options?.cwd),
      ...[options?.ignored ?? []].flat()
    ],
    awaitWriteFinish: {
      stabilityThreshold: 100
    }
  })
}
