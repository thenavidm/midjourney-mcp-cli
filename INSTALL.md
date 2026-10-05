# Install

Midjourney publishes no API. This server drives a real Chrome that is signed in
as you, in a browser profile of its own, so setup is two things: install it, and
sign in once in a window. There is no key to paste and no cookie to export.

## Prerequisites

| You need | Check with | If missing |
|---|---|---|
| Node 22 or newer | `node -v` | [nodejs.org](https://nodejs.org) |
| Google Chrome | open it once | [google.com/chrome](https://www.google.com/chrome/) |
| A Midjourney plan | sign in at midjourney.com | generating needs GPU time from a paid plan |

Node 22 is the floor because the browser connection uses the `WebSocket` built
into that release.

## Sign in once

```bash
npx -y @thenavidm/midjourney-mcp-cli@latest login
```

A Chrome window opens on midjourney.com. Sign in. The command waits, notices,
and exits. The session lives in `~/.midjourney-mcp/chrome-profile`, separate from
your everyday Chrome, so nothing here sees your normal browsing.

If the window shows a Cloudflare check, let it finish once. If five minutes pass
without a sign-in, the command stops; leave the window open and run `doctor`
once you are in.

## Add it to your client

The quickest route for most clients is the CLI's own installer, which writes the
entry in each client's format and keeps a backup of the file it changes:

```bash
npx -y -p @thenavidm/midjourney-mcp-cli midjourney-cli install claude-code
npx -y -p @thenavidm/midjourney-mcp-cli midjourney-cli install claude-desktop --dry-run
```

It takes `claude-code`, `codex`, `claude-desktop`, `cursor`, `vscode` or
`gemini`. By hand:

### Claude Code

```bash
claude mcp add midjourney -- npx -y @thenavidm/midjourney-mcp-cli@latest
```

`--scope user` makes it available in every project rather than the current one.

### Claude Desktop

The one-click route is the `.mcpb` on the
[latest release](https://github.com/thenavidm/midjourney-mcp-cli/releases/latest):
download it and double-click it, or install it through **Settings**,
**Extensions**, **Install Extension**. It carries its own dependencies.

By hand, open **Settings**, **Developer**, **Edit Config**, and add:

```json
{
  "mcpServers": {
    "midjourney": {
      "command": "npx",
      "args": ["-y", "@thenavidm/midjourney-mcp-cli@latest"]
    }
  }
}
```

| Platform | Config file |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

Quit Claude Desktop fully and reopen it; closing the window is not enough.
Claude Desktop does not inherit your shell's `PATH`, so if a bare `npx` fails
silently, use the absolute path from `which npx` as the `command`.

### Cursor

`.cursor/mcp.json` in a project, or `~/.cursor/mcp.json` for every project, with
the same JSON as Claude Desktop.

### VS Code

`.vscode/mcp.json`. The key is `servers`, not `mcpServers`, and the entry takes
`"type": "stdio"`:

```json
{
  "servers": {
    "midjourney": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@thenavidm/midjourney-mcp-cli@latest"]
    }
  }
}
```

### Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.midjourney]
command = "npx"
args = ["-y", "@thenavidm/midjourney-mcp-cli@latest"]
```

## The command line

The same package installs both binaries:

```bash
npm install -g @thenavidm/midjourney-mcp-cli
midjourney-cli                     # every command, one line each
midjourney-cli which make a picture
```

## Verify

```bash
npx -y @thenavidm/midjourney-mcp-cli@latest doctor
```

It checks Chrome, the controlled window, the sign-in and the download folder, in
the order they have to be fixed, and names the fix for the first one that fails.

## Spending, and turning it off

Anything that spends GPU time waits for your approval: Claude Code shows its own
prompt for each one, and a client that can show forms asks with one.
`MIDJOURNEY_READ_ONLY=1` hides every tool that is not a read, and
`MIDJOURNEY_ALLOW_DESTRUCTIVE=0` keeps reads and downloads while refusing
anything that spends.

## When it breaks

| Symptom | Fix |
|---|---|
| `doctor` says Chrome is missing | Install Google Chrome, or set `MIDJOURNEY_CHROME_PATH` |
| `Browser running` fails | Chrome starts on the first tool call; run `login` to start it by hand, or unset `MIDJOURNEY_CHROME_LAUNCH=0` |
| `Signed in` fails | The profile is signed out. Run `login` again |
| `DevTools never answered` | Another Chrome uses that profile. Quit it, or set `MIDJOURNEY_CHROME_PROFILE` elsewhere |
| The server does not appear in Claude Desktop | Use the absolute path to `npx`, and quit the app fully |

## Removing it

Remove the entry from your client's config, then delete the profile to sign out
for good:

```bash
rm -rf ~/.midjourney-mcp/chrome-profile
```
