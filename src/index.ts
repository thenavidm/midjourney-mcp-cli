#!/usr/bin/env node
/**
 * Both binaries. `midjourney-mcp` with no arguments serves MCP over stdio,
 * `--http` serves it over HTTP, and any command runs one tool from the shell.
 *
 * Node's compile cache goes on before the app loads, so every launch after the
 * first skips compiling it again. Node before 22.8 has no compile cache and
 * starts as before; NODE_DISABLE_COMPILE_CACHE=1 turns it off.
 */

import * as nodeModule from "node:module";

nodeModule.enableCompileCache?.();
const { app } = await import("./app.js");
await app.main();
