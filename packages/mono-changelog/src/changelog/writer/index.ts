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

import { Commit, CommitGroup } from "~/commit"

import { ChangelogSection } from "../_"
import { getParserOptions } from "../parser"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Writer options
 */
export interface WriterOptions {
  types: ChangelogSection[]            // Changelog sections
  transform: TransformFn               // Commit transform function
  mainTemplate: string                 // Template
  headerPartial: string                // Template partial: header
  commitPartial: string                // Template partial: commit
  footerPartial: string                // Template partial: footer
  commitGroupsSort: OrderFn            // Commit group order function
}

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Transformation function for commits
 *
 * @param commit - Commit
 *
 * @returns Commit or nothing
 */
type TransformFn = (
  commit: Commit
) => Commit<string> | undefined

/**
 * Comparison function for commit groups
 *
 * @param a - 1st value
 * @param b - 2nd value
 *
 * @returns Comparison result
 */
type OrderFn = (
  a: CommitGroup, b: CommitGroup
) => number

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Load the given template
 *
 * @param name - Template name
 *
 * @returns Template string
 */
function template(name: string): string {
  const file = path.resolve(__dirname, "template", `${name}.hbs`)
  return fs.readFileSync(file, "utf8")
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Retrieve options for changelog writer
 *
 * @returns Writer options
 */
export function getWriterOptions(): WriterOptions {
  const { breakingHeaderPattern } = getParserOptions()

  // Commit types to changelog section mapping
  const sections: ChangelogSection[] = [
    { type: "build", section: "Reverts", hidden: true },
    { type: "chore", section: "Miscellaneous Changes", hidden: true },
    { type: "docs", section: "Documentation", hidden: true },
    { type: "feature", section: "Features" },
    { type: "fix", section: "Bug Fixes" },
    { type: "perf", section: "Performance Improvements" },
    { type: "refactor", section: "Code Refactoring", hidden: true },
    { type: "revert", section: "Reverts" },
    { type: "style", section: "Styles", hidden: true },
    { type: "test", section: "Tests", hidden: true }
  ]

  // Return writer options
  return {
    types: sections,
    transform: commit => {
      let breaking = false

      // Check if the commit is a breaking change
      if (breakingHeaderPattern.test(commit.header)) {
        breaking = true
        for (const note of commit.notes)
          note.title = "BREAKING CHANGES"
      }

      // Retrieve changelog section and check whether to discard commit
      const type = sections.find(section => section.type === commit.type)
      if (!breaking && (typeof type === "undefined" || type.hidden))
        return

      // Return commit
      return {
        ...commit,
        type: type!.section,
        shortHash: commit.hash.substring(0, 7)
      }
    },

    // Templates
    headerPartial: template("partial/header"),
    commitPartial: template("partial/commit"),
    footerPartial: template("partial/footer"),
    mainTemplate:  template("main"),

    // Ordering
    commitGroupsSort: (a: CommitGroup, b: CommitGroup) => {
      const order = [
        "Reverts",
        "Performance Improvements",
        "Bug Fixes",
        "Features"
      ]

      // Order commits by title
      return order.indexOf(b.title)
           - order.indexOf(a.title)
    }
  }
}
