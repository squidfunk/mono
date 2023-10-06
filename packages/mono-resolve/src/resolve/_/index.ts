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

import * as fs from "node:fs"
import * as path from "node:path"

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Check whether the given file exists
 *
 * This function is implemented synchronously, as it's exclusively intended for
 * our build tools, many of which don't support asynchronous operations.
 *
 * @param file - File path
 *
 * @returns Test result
 */
export function exists(file: string): boolean {
  return fs.existsSync(file)
}

/**
 * Resolve the closest file matching the given name up from the given directory
 *
 * This function is implemented synchronously, as it's exclusively intended for
 * our build tools, many of which don't support asynchronous operations.
 *
 * @param name - File name
 * @param directory - Working directory (default: `.`)
 *
 * @returns Path to closest file or nothing
 */
export function closest(
  name: string, directory = "."
): string | undefined {
  directory = path.resolve(directory)
  for (;;) {
    const file = path.join(directory, name)
    if (exists(file))
      return file

    // Move up one directory
    const parent = path.dirname(directory)
    if (parent === directory)
      return undefined

    // Update directory
    directory = parent
  }
}
