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

import { ParserOptions, getParserOptions } from "~/changelog"

import { Commit } from "../_"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Recommended bump
 */
export interface RecommendedBump {
  level: number                        // Bump version level
  reason?: string                      // Bump reason
}

/**
 * Recommended bump options
 */
export interface RecommendedBumpOptions {
  parserOpts: ParserOptions            // Parser options
  whatBump: VisitorFn                  // Visitor function
}

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Visitor function deciding on recommended bump
 *
 * @param commits - Commits
 *
 * @returns Recommended bump or nothing
 */
type VisitorFn = (
  commits: Commit[]
) => RecommendedBump | undefined

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Retrieve options for recommended bump
 *
 * @returns Recommended bump options
 */
export function getRecommendedBumpOptions(): RecommendedBumpOptions {
  const parserOpts = getParserOptions()
  return {
    parserOpts,
    whatBump: commits => {
      let level

      // Determine recommended bump from commits
      for (const commit of commits) {
        const { breakingHeaderPattern } = parserOpts
        const capture = commit.header.match(breakingHeaderPattern)
        if (capture && !commit.notes.length)
          commit.notes.push({
            text: capture[3]
          })

        // Bump major for breaking changes
        if (commit.notes.length) {
          level = 0

        // All other commit types
        } else if (level !== 0) {
          switch (commit.type) {

            // Bump minor for features
            case "feature":
              level = 1
              break

            // Bump patch for internal changes
            case "fix":
            case "perf":
            case "refactor":
            case "revert":
              level = level ?? 2
              break
          }
        }
      }

      // Return nothing if there's nothing to release
      if (typeof level === "undefined")
        return

      // Return recommended bump
      return {
        level,
        ...level === 0 && {
          reason: "Breaking changes"
        }
      }
    }
  }
}
