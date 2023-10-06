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

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Commit type
 */
export type CommitType =
  | "build"                            // Build system
  | "chore"                            // Miscellaneous
  | "docs"                             // Documentation
  | "feature"                          // Feature
  | "fix"                              // Bug fix
  | "perf"                             // Performance improvement
  | "refactor"                         // Code refactoring
  | "revert"                           // Code revert
  | "style"                            // Code style
  | "test"                             // Test

/* ------------------------------------------------------------------------- */

/**
 * Commit note
 */
export interface CommitNote {
  title?: string                       // Note title
  text: string                         // Note text
}

/**
 * Commit
 *
 * @template T - Commit type
 */
export interface Commit<
  T extends string = CommitType
> {
  scope: string                        // Commit scope
  type: T                              // Commit type
  subject: string                      // Commit subject
  header: string                       // Commit header
  body: string                         // Commit body
  footer: string                       // Commit footer
  notes: CommitNote[]                  // Commit notes
  hash: string                         // Commit hash
}

/**
 * Commit group
 */
export interface CommitGroup {
  title: string                        // Group title
  commits: Commit[]                    // Group commits
}
