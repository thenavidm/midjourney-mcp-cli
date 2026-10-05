/**
 * The Midjourney app: everything Slipway needs to ship the MCP server and the CLI.
 *
 * This file only describes. It never starts anything, so `slipway check` and
 * tests can import it; `index.ts` is what runs.
 */

import { createRequire } from "node:module";
import { slipway } from "@thenavidm/slipway";
import { MidjourneyClient } from "./api/client.js";
import { loadConfig } from "./config.js";
import { doctor } from "./doctor.js";
import { INSTRUCTIONS } from "./guide.js";
import { ALL_TOOLS } from "./tools/index.js";
import { makeContext, type ToolContext } from "./tools/kit.js";
import { FLAG_ALIASES, SYNONYMS } from "./vocabulary.js";

const require = createRequire(import.meta.url);
export const VERSION: string = (require("../package.json") as { version: string }).version;

/** `--seconds 150` and `--seconds=150` alike, as every other command takes them. */
function flagValue(args: readonly string[], name: string): string | undefined {
  const withEquals = args.find((token) => token.startsWith(`--${name}=`));
  if (withEquals) return withEquals.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  const next = index === -1 ? undefined : args[index + 1];
  return next && !next.startsWith("--") ? next : undefined;
}

export const app = slipway<ToolContext>({
  name: "midjourney",
  title: "Midjourney",
  version: VERSION,
  package: "@thenavidm/midjourney-mcp-cli",
  description: "generating images, following jobs to completion, downloading the results, and the account's library and explore feeds on Midjourney",
  instructions: INSTRUCTIONS,
  // There are no credentials: the session lives in a dedicated Chrome profile, and the browser starts on the first call that needs it.
  context: () => {
    const config = loadConfig();
    return makeContext(new MidjourneyClient(config), config);
  },
  tools: ALL_TOOLS,
  flagAliases: FLAG_ALIASES,
  synonyms: SYNONYMS,
  doctor,
  // Chrome, the window and the sign-in fail with the same refusal from a tool call, so doctor looks at all of them every time, as 1.3 did.
  doctorNetwork: true,
  login: {
    usage: "login",
    help: "open the controlled browser and sign in to Midjourney; the session stays in its own profile",
    run: async (io) => {
      const { runLogin } = await import("./doctor.js");
      return runLogin(io);
    },
  },
  commands: [
    {
      name: "capture",
      usage: "capture [--seconds N] [--out <file>] [--all]",
      help: "record what the web app calls, to build new tools",
      flags: ["--seconds", "--out", "--all"],
      run: async (_io, args) => {
        const { runCapture } = await import("./capture.js");
        const seconds = Number(flagValue(args, "seconds") ?? 60);
        return runCapture(loadConfig(), {
          seconds: Number.isFinite(seconds) ? Math.min(Math.max(seconds, 5), 1800) : 60,
          outPath: flagValue(args, "out"),
          all: args.includes("--all"),
        });
      },
    },
  ],
  settings: [
    { env: "MIDJOURNEY_CHROME_PROFILE", description: "The browser profile that holds the session. Defaults to ~/.midjourney-mcp/chrome-profile." },
    { env: "MIDJOURNEY_CHROME_PATH", description: "The Chrome binary, found automatically otherwise." },
    { env: "MIDJOURNEY_CDP_URL", description: "The DevTools endpoint. Defaults to http://127.0.0.1:9222." },
    { env: "MIDJOURNEY_CHROME_LAUNCH", description: "0 never starts Chrome, only attaches to a running one." },
    { env: "MIDJOURNEY_HEADLESS", description: "1 runs without a window. Signing in needs one, so do that first." },
    { env: "MIDJOURNEY_USER_ID", description: "Skips finding the user id." },
    { env: "MIDJOURNEY_DOWNLOAD_DIR", description: "Where downloads land. Defaults to ~/Downloads/midjourney." },
    { env: "MIDJOURNEY_DEFAULT_SPEED", description: "fast, relax or turbo. Defaults to fast." },
    { env: "MIDJOURNEY_DEFAULT_VERSION", description: "The model version appended as --v. Defaults to 8.2." },
    { env: "MIDJOURNEY_ORIGIN", description: "The web app. Defaults to https://www.midjourney.com.", tuning: true },
    { env: "MIDJOURNEY_REQUEST_TIMEOUT_MS", description: "Per-request deadline. Defaults to 30000.", tuning: true },
    { env: "MIDJOURNEY_MIN_REQUEST_INTERVAL_MS", description: "Spacing between requests. Defaults to 700.", tuning: true },
    { env: "MIDJOURNEY_MAX_RETRIES", description: "Retries on 429 and 5xx. Defaults to 3.", tuning: true },
    { env: "MIDJOURNEY_JOB_TIMEOUT_MS", description: "How long to wait for a job. Defaults to 600000.", tuning: true },
    { env: "MIDJOURNEY_JOB_POLL_INTERVAL_MS", description: "The first poll interval, widening after. Defaults to 3000.", tuning: true },
    { env: "MIDJOURNEY_REFRESH_VIEW", description: "0 leaves the open window alone after a generation.", tuning: true },
  ],
  links: { repository: "https://github.com/thenavidm/midjourney-mcp-cli" },
});
