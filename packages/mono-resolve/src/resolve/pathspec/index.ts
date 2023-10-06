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

import { closest } from "../_"

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Resolve patterns from closest pathspec file matching the given name
 *
 * If only pathspec would be universally implemented to behave like `.gitignore`
 * files, i.e. searched up the folder hierarchy, we wouldn't need to do it here,
 * but unfortunately they aren't. Thus, we're searching for the closest file
 * and strip all empty lines and comments out of it.
 *
 * This function is implemented synchronously, as it's exclusively intended for
 * our build tools, many of which don't support asynchronous operations.
 *
 * @param name - File name
 * @param directory - Working directory (default: `.`)
 *
 * @returns Patterns
 */
export function pathspec(name: string, directory = "."): string[] {
  const file = closest(name, directory)
  if (typeof file === "undefined")
    return []

  // Extract patterns and filter comments
  return fs.readFileSync(file, "utf8")
    .split("\n")
    .filter(pattern => pattern.trim() && !pattern.startsWith("#"))
}
