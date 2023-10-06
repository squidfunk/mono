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

import { setFlagsFromString } from "node:v8"
import {
  RunningScriptOptions,
  Script,
  ScriptOptions
} from "node:vm"

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Set necessary `v8` flags
 *
 * @see https://bit.ly/3E0HRd2 - GitHub issue comment
 */
function setNecessaryFlags(): void {
  setFlagsFromString("--no-lazy")
  setFlagsFromString("--no-flush-bytecode")
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Compile source code to bytecode
 *
 * @see https://bit.ly/3FIXTZB - Original source
 *
 * @param code - Source code
 * @param options - Options
 *
 * @returns Bytecode
 */
export function compile(
  code: string, options?: ScriptOptions
): Buffer {
  setNecessaryFlags()

  // Compile and return bytecode
  const script = new Script(code, options)
  return script.createCachedData()
}

/**
 * Run previously compiled bytecode
 *
 * This function is a thin wrapper around the `vm` module that allows for the
 * execution of previously compiled bytecode in the current context. Prior to
 * calling this function the caller must execute the following statements, or
 * module resolution will fail:
 *
 * - `global.require = require`
 * - `global.exports = exports`
 *
 * @see https://bit.ly/30UIAxU - Original source
 *
 * @template T - Result type
 *
 * @param buffer - Bytecode
 * @param options - Options
 *
 * @returns Result of last statement
 */
export function run<T>(
  buffer: Buffer, options?: RunningScriptOptions
): T {
  setNecessaryFlags()

  // Compile and validate script from bytecode
  const code = "\r".repeat(buffer.readUInt32LE(8) - 2)
  const script = new Script(`"${code}"`, { cachedData: buffer })
  if (script.cachedDataRejected)
    throw new Error("Incompatible or invalid bytecode")

  // Run script and return result
  return script.runInThisContext(options)
}
