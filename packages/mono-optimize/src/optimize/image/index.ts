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

import { spawn } from "node:child_process"

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Options
 */
interface Options {
  speed?: number                       // Speed/quality trade-off
  strip?: boolean                      // Remove optional metadata
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Optimize a PNG image
 *
 * Before invoking pngquant manuallyvia `child_process`, we used the library
 * `imagemin`, which now seems largely unmaintained. The `imagemin-pngquant`
 * plugin is based on `pngquant-bin`, which is also unmaintained. Thus, we just
 * do the legwork ourselves and invoke `pngquant` directly.
 *
 * @param data - Buffer
 * @param options - Options
 *
 * @returns Promise resolving with buffer
 */
export async function optimizePNG(
  data: Buffer, options?: Options
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { speed = 4, strip = true } = options ?? {}

    // Map options to arguments
    const args = ["-"]
    if (speed) args.push("--speed", `${speed}`)
    if (strip) args.push("--strip")

    // Invoke pngquant executable
    const pngquant = spawn("pngquant", args)

    // Register event handlers
    pngquant.on("error", reject)
    pngquant.on("close", code => {
      if (code === 0)
        resolve(output)
      else
        reject(new Error(`pngquant exited with code ${code}`))
    })

    // Register event handlers for stdout
    let output = Buffer.alloc(0)
    pngquant.stdout.on("data", (chunk: Buffer) => {
      output = Buffer.concat([output, chunk])
    })

    // Write image to stdin
    pngquant.stdin.write(data)
    pngquant.stdin.end()
  })
}
