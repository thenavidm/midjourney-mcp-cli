# Changelog

## 2.0.1, 2026-10-05

- **Built on Slipway 0.1.17**, which a fresh install of 2.0.0 already used. Since the Slipway 2.0.0 was measured on, 0.1.8, `which` also reads a tool's argument names and prints a title once where a description opens with it, and the general help names the settings that connect an account and the safety switches and counts the rest, which `agent-context` describes one by one. [Slipway's changelog](https://github.com/thenavidm/slipway/blob/main/CHANGELOG.md) lists the rest.
- **A test checks that every setting is named in `--help` or described by `agent-context`**, where it asked `--help` to name each one.

## 2.0.0, 2026-10-05

Built on [Slipway](https://github.com/thenavidm/slipway) 0.1.8. The 32 tools keep their names and arguments, and every difference below was measured against 1.3.1 before release.

- **A person approves each generation over MCP.** Claude Code (2.1.246 and later) shows its own prompt for each tool that spends GPU time, and a client that can show forms asks with an approval form whose one box starts unticked. Approvals are signed, bound to the exact call and work once. Where a client can do neither, the model's `confirm: true` still counts, and `MIDJOURNEY_CONFIRM=model` makes it enough everywhere. A paid generation is still a write to clients, never "destructive", the refusal still says it spends GPU time that cannot be refunded, `MIDJOURNEY_ALLOW_DESTRUCTIVE=0` still refuses it, and the audit log records who approved each one.
- **A smaller tool list.** 13,904 tokens in Claude Code with every tool loaded, down from 15,243: the per-tool `$schema` line, an `execution` field and `additionalProperties: false` are gone. The last one advertised strict input while unknown keys were dropped anyway; the schema now says what happens.
- **Your Midjourney words still work in the terminal.** `--ar`, `--sref`, `--q` and the rest of the prompt syntax's spellings are flags, `which make a picture` still finds `imagine`, and `--select id` on a list still reaches into its results. Each moved into Slipway, so help now shows the spelling beside its flag.
- **`schema <command>` prints the JSON Schema.** 1.3.1 printed Zod's internal object for every command instead.
- **Exit codes follow the house contract everywhere.** An unknown command and a tool hidden by read-only mode exit 2 instead of 1, and a sign-in that never finishes exits 4. The error's class still decides, so a Cloudflare check is 4 and a bad `--ar` is 2, and a job that timed out keeps its id in the error.
- **`install <client>`** adds the server to Claude Code, Codex, Claude Desktop, Cursor, VS Code or Gemini CLI in each one's own format.
- **Cheaper to find a command through the CLI.** In Codex, finding the command that makes variations of one image and the flags it requires took 84,264 input tokens instead of 85,194 (median of five). Over MCP the same task read 14 more out of about 49,000. Codex cuts the tool list it prints to the same length on both sides, and its full list is longer only because `imagine` now arrives with its 31 argument descriptions: 1.3.1's longer approval note pushed `imagine` past the size where Codex leaves them out.
- **Less work to start.** The entry turns on Node's compile cache, and the server spends 177 ms of CPU before its first answer where 1.3.1 spent 206 (median of 21 runs, taking turns on one busy Mac). npx installs 4 dependencies instead of 94.
- **Docs fixes.** INSTALL.md exists now, every client click by click. The README listed 27 tools in its contents where 32 ship, gave 7 as the default model where it is 8.2, and the release never carried the desktop extension the changelog promised; all three are fixed. SKILL.md names all ten tools that spend. Images load from cdn.navid.me, and THIRD_PARTY_NOTICES.md lists the production dependencies' licenses.

### Upgrading

Node 22 or newer, as before. Scripts keep working for success, usage errors and the codes they already branched on; one that treated exit 1 as "unknown command" should read 2. Over MCP, expect an approval prompt or form for each generation; a headless agent that should generate with `confirm: true` alone needs `MIDJOURNEY_CONFIRM=model`. A script that pipes JSON-RPC into the server must keep stdin open until it reads the answer: the server now stops when its input ends, as the MCP stdio binding asks. `--select a.b` now keeps the shape, `{"a":{"b":…}}`, where 1.3.1 flattened it to `{"a.b":…}`. The server names itself `midjourney` to clients, not `midjourney-mcp`. `--http` refuses a request from a page on another site unless `MIDJOURNEY_HTTP_ALLOWED_ORIGINS` lists it. Three terminal screens grew: `which` lines now say what each command does, 24 tokens more for "make a picture"; a missing argument's error carries its code and the `--help` to read, 15 more; and `download-job --help` lists `--dry-run`, which is new, and the `--job` spelling 1.3.1 accepted without showing, 20 more.

## 1.3.1, 2026-10-04

- **`npx -y @thenavidm/midjourney-mcp-cli` always starts the MCP server.** npx starts whichever binary the npm registry lists first when they share one file, and the registry does not keep the published order, so an MCP client set up with this README's install line could get `midjourney-cli` and its command list instead of a server. A third binary named after the package now always starts the server, and npx picks it by name.

## 1.3.0

- Exit codes follow the house contract, so a script branches the same way on every one of these CLIs: 0 ok, 2 typed wrong or a refused write, 3 not found, 4 signed out or a Cloudflare check waiting, 5 Midjourney or the browser failed, 7 rate limited. Before, everything that was not a typing mistake exited 1.
- The moodboard and default-model changes listed under 1.2.0 were committed after 1.2.0 went to npm, so they reach npm with this release.
- The README named 5 of the tools that ask first. It now names all 10 that spend GPU time, and `remove_from_moodboard`.
- Releases come from `publish.yml` on a tag, which publishes to npm and then creates the GitHub release. The Claude Desktop extension is attached to each release.

## 1.2.0

- `moodboard` now applies a board the way the web app does, as a personalization code, rather than sampling its images into `--sref`. The code is the board id with an `m` prefix, which is neither documented nor guessable; the sref approximation only registered at a high `--sw`, and that weight was what made output look over-processed.
- Default model is v8.2, the current one. It was a version behind.
- `stylize`, `chaos`, `weird` and `style_weight` are no longer encouraged by their own descriptions. Midjourney's defaults sit near the minimum and raising them costs fidelity.
- SKILL.md carries the craft: what to specify in a prompt so the model is not left inventing it, which of the four styling tools fits which job, and the explore-to-finish pipeline through vary, remix, zoom, upscale and animate.

## 1.1.0

Five job types, read out of the web app's compiled bundle rather than guessed or clicked.

- `upscale_image`, `animate_image` (image to video), `pan_image`, `zoom_out` and `remix_image`.
- The upscaler name is version-specific and not what the menu says: a v8.1 image wants `v8r1_2x_subtle`, not `subtle`. It is derived from the job's own model version now.
- Video nests its source under `parentJob` as `image_num`, not the flat `index` every other type uses, and `newPrompt` carries the image's prompt rather than the motion. A motion note is appended to the original instead of replacing it.
- Video files live under `/video/<job>/<n>.mp4`, so deriving image names for a video job produced four URLs that all 404. `download_job` handles both.
- Filenames no longer repeat the index: `<job>-0.mp4`, not `<job>-0-0.mp4`.

## 1.0.0

First release.

- MCP server and CLI generated from one tool array, so the two surfaces cannot drift. 27 tools on each.
- Drives a dedicated logged-in Chrome over the DevTools Protocol. No credential is handled, and no TLS impersonation is involved: `cf_clearance` is bound to IP, User-Agent and fingerprint together, so replaying a cookie could never have worked.
- `imagine` submits, waits for the job and returns the images, optionally saving them to disk.
- Job status comes from Midjourney's own status endpoint rather than being inferred, so a running job reports as running.
- Downloads are the real files from the CDN, read with an in-page fetch. No new tab, no visible activity, and not a screenshot of the rendered element.
- Moodboards are first class: create one, add a job's renders to it, then name it on a later generation to reproduce the look from a short prompt.
- Midjourney's parameter grammar is typed and validated before anything is spent, because Midjourney clamps or ignores bad values instead of reporting them.
- `capture` records what the web app calls, so new tools come from observed traffic rather than guesswork. Every write endpoint here was found that way.
- Spending is its own risk level, gated behind `confirm` and separate from destructive, so a client deciding what to auto-approve is told the truth.
- Native browser dialogs are auto-dismissed. One left open freezes the renderer and every command times out, including the ones that would clear it.
