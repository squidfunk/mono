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
import connect, { NextHandleFunction } from "connect"
import {
  Options as Proxy,
  createProxyMiddleware
} from "http-proxy-middleware"
import { createHttpTerminator } from "http-terminator"
import * as fs from "node:fs"
import * as http from "node:http"
import * as path from "node:path"
import handler from "serve-handler"
import WebSocket, { WebSocketServer } from "ws"

import { closest, exists } from "@squidfunk/mono-resolve"

import { client } from "../internal"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Server
 */
export interface Server {
  clients: Set<WebSocket>              // Connected clients
  stop(): Promise<void>                // Terminate server
}

/* ----------------------------------------------------------------------------
 * Helper types
 * ------------------------------------------------------------------------- */

/**
 * Options
 */
interface Options {
  host?: string                        // Serve files on this host
  port?: number                        // Serve files on this port
  watch?: boolean | string[]           // Watch files matching patterns
  fallback?: boolean                   // Use History API fallback
}

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Middleware for websocket client injection
 *
 * @param directory - Working directory
 * @param options - Options
 *
 * @returns Handler function
 */
function websocket(
  directory: string, options: Required<Omit<Options, "host">>
): NextHandleFunction {
  return (req, res, next) => {
    const extension = path.extname(req.url!)
    if (req.method !== "GET" || extension !== "")
      return next()

    // Resolve file with optional fallback
    let index = path.join(directory, req.url!, "index.html")
    if (!exists(index) && options.fallback)
      index = path.join(directory, "index.html")

    // Try to load and serve file - if watch mode is enabled, we add our client
    // script to the response, so the client automatically (re-)connects to our
    // websocket server. We can just append it to the response without parsing
    // the HTML, as the browser will move it into the body for us.
    try {
      res.statusCode = 200
      res.write(fs.readFileSync(index, "utf8"))
      if (options.watch) {
        res.write(`
          <script>
            ${client}
            ${client.name}(${options.port})
          </script>
        `)
      }

      // End response
      res.end()

    // Just swallow and continue with next middleware
    } catch {
      next()
    }
  }
}

/**
 * Middleware for internal static file server
 *
 * @returns Handler function
 */
function internal(): NextHandleFunction {
  const { pathname } = new URL("..", import.meta.url)
  return (req, res, next) => {
    if (!req.url?.startsWith("/internal"))
      return next()

    // Serve internal assets
    void handler(req, res, {
      public: pathname,
      headers: [
        {
          source: "**/*.svg",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable"
            }
          ]
        }
      ]
    })
  }
}

/**
 * Middleware for static file server
 *
 * @param directory - Working directory
 *
 * @returns Handler function
 */
function files(directory: string): NextHandleFunction {
  return (req, res) => {
    void handler(req, res, {
      public: directory
    })
  }
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Serve files from the given directory
 *
 * @param directory - Working directory (default: `.`)
 * @param options - Options
 *
 * @returns Promise resolving with server
 */
export async function serve(
  directory = ".", options: Options = {}
): Promise<Server> {
  const {
    host = "0.0.0.0",
    port = 8000,
    watch = false,
    fallback = false
  } = options

  // Create application server
  const app = connect()

  // Resolve and load runtime configuration
  const manifest = closest(".serverc", directory)
  if (typeof manifest !== "undefined") {
    const config = JSON.parse(fs.readFileSync(manifest, "utf8"))

    // Set up proxy middlewares, if any
    if (typeof config.proxy !== "undefined")
      for (const [key, proxy] of Object.entries<Proxy>(config.proxy))
        app.use(key, createProxyMiddleware(proxy))
  }

  // Set up websocket server for reloading
  const clients = new Set<WebSocket>()
  const websocketserver =
    new WebSocketServer({ port: port + 1 })
      .on("connection", ws => clients.add(
        ws.on("close", () => clients.delete(ws))
      ))

  // Set up websocket and file server middleware
  app.use(websocket(directory, { port: port + 1, watch, fallback }))
  app.use(internal())
  app.use(files(directory))

  // Start application server
  const server = http.createServer(app)
    .on("close", () => websocketserver.close())
    .listen(port, host, () => {
      const url = chalk.underline(`http://${host}:${port}/`)
      console.log(`Serve ${chalk.green(directory)} at ${url}`)
    })

  // Wait until ready to serve
  await new Promise(resolve => {
    server.on("listening", resolve)
  })

  // Create termination handler and return server
  const handle = createHttpTerminator({ server })
  return {
    clients,
    stop: handle.terminate
  }
}
