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
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Create a websocket for automatic reloading
 *
 * This implementation will reload a style sheet without reloading the entire
 * window, which allows for much faster development cycles. Additionally, it
 * will automatically try to reconnect once the connection is gone, happening
 * regularly while developing an application.
 *
 * Note that this function is serialized to a string, so it's absolutely vital
 * that we inline all functions and dependencies.
 *
 * @param port - Port
 */
export function client(port: number): void {
  const title = document.title

  /**
   * Update favicon and title
   *
   * @param state - Whether we're waiting for a connection
   */
  function pending(state: boolean) {

    // Ensure that favicon is present - for the purpose of serving the site and
    // to allow us to quickly see whether the websocket is connected or not, we
    // will change the favicon to a "server off" icon when the connection is
    // gone, and "server on" when we're connected
    let icon = document.querySelector<HTMLLinkElement>(`link[rel="icon"]`)
    if (icon === null) {
      icon = document.createElement("link")
      document.head.appendChild(icon)
    }

    // Update favicon image
    icon.rel  = "icon"
    icon.href = state
      ? "/internal/favicon/server-off.svg"
      : "/internal/favicon/server-on.svg"

    // Update document title
    document.title = state
      ? "Waiting for connection"
      : title
  }

  /**
   * Create websocket connection
   */
  function connect() {
    const socket = new WebSocket(`ws://localhost:${port}`)
    pending(true)

    // Reload style sheet or window
    socket.addEventListener("message", ev => {
      if (ev.data.endsWith(".css")) {
        const selector = `link[href*="${ev.data}"]`
        const link = document.querySelector<HTMLLinkElement>(selector)
        if (link) {
          link.href = link.href.replace(/(\?\d+)?$/, `?t=${Date.now()}`)
          return
        }
      }

      // Otherwise, reload window
      window.location.reload()
    })

    // Websocket is connected
    socket.addEventListener("open", () => {
      setTimeout(() => pending(false), 100)
      console.info(`Connected to ${socket.url}`)
    })

    // Reconnect after 1 second
    socket.addEventListener("close", () => {
      setTimeout(() => connect(), 1000)
    })
  }

  // Connect to server
  connect()
}
