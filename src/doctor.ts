/**
 * Say what is wrong, in the order it has to be fixed.
 *
 * Every failure mode here produces the same symptom from a tool call, a refused
 * request, and they need completely different fixes: install Chrome, start it,
 * sign in, wait out a challenge. Guessing between them is where people give up
 * on a tool like this, so the checks run in dependency order and stop at the
 * first one that fails, rather than printing four red lines and leaving the
 * reader to work out which one matters. Slipway runs them on every `doctor`, as
 * 1.3 did.
 */

import { access, constants, mkdir } from "node:fs/promises";

import { EXIT, type CliIO, type DoctorCheck } from "@thenavidm/slipway";
import { MidjourneyClient } from "./api/client.js";
import { loadConfig, type Config } from "./config.js";
import { CdpBrowser, findChrome } from "./transport/cdp.js";
import type { ToolContext } from "./tools/kit.js";

async function checkDownloadDir(config: Config): Promise<DoctorCheck> {
  try {
    await mkdir(config.downloadDir, { recursive: true });
    await access(config.downloadDir, constants.W_OK);
    return { name: "Download dir", ok: true, detail: config.downloadDir };
  } catch (error) {
    return {
      name: "Download dir",
      ok: false,
      detail: `${config.downloadDir}: ${(error as Error).message}`,
      fix: "Set MIDJOURNEY_DOWNLOAD_DIR to somewhere writable.",
    };
  }
}

export async function doctor(ctx: ToolContext, options: { network: boolean }): Promise<DoctorCheck[]> {
  const { config } = ctx;
  const checks: DoctorCheck[] = [
    { name: "Profile", ok: true, detail: config.profileDir },
    { name: "DevTools", ok: true, detail: config.cdpUrl },
    { name: "Origin", ok: true, detail: config.origin },
  ];

  try {
    checks.push({ name: "Chrome", ok: true, detail: findChrome(config.chromePath) });
  } catch (error) {
    checks.push({ name: "Chrome", ok: false, detail: (error as Error).message, fix: "Install Google Chrome, or set MIDJOURNEY_CHROME_PATH to the binary." });
    return checks;
  }
  if (!options.network) return checks;

  // Its own browser handle that never launches Chrome: doctor reports, it does not start things.
  const browser = new CdpBrowser({
    cdpUrl: config.cdpUrl,
    profileDir: config.profileDir,
    chromePath: config.chromePath,
    autoLaunch: false,
    headless: config.headless,
    timeoutMs: config.requestTimeoutMs,
    origin: config.origin,
  });
  const running = await browser.isRunning();
  checks.push({
    name: "Browser running",
    ok: running,
    detail: running ? ((await browser.version())?.Browser ?? "yes") : `nothing on ${config.cdpUrl}`,
    fix: `Run \`midjourney-cli login\` to start the controlled window and sign in. It also starts on demand on the first tool call${config.autoLaunch ? "" : ", except MIDJOURNEY_CHROME_LAUNCH=0 is set"}.`,
  });

  if (running) {
    const client = new MidjourneyClient(config, browser);
    try {
      checks.push({ name: "Signed in", ok: true, detail: `user ${await client.userId()}` });
    } catch (error) {
      checks.push({
        name: "Signed in",
        ok: false,
        detail: (error as Error).message,
        fix: "Run `midjourney-cli login`, sign in to Midjourney in the window that opens, then try again.",
      });
    }
    client.close();
  }

  checks.push(await checkDownloadDir(config));
  return checks;
}

/**
 * Open the controlled window and wait for the user to sign in.
 *
 * There is no password to collect and nothing to store: signing in happens in
 * the browser, and the browser profile keeps the session. This command exists
 * so nobody has to be told to construct a Chrome command line by hand.
 */
export async function runLogin(io: CliIO): Promise<number> {
  const config = loadConfig();
  const browser = new CdpBrowser({
    cdpUrl: config.cdpUrl,
    profileDir: config.profileDir,
    chromePath: config.chromePath,
    autoLaunch: true,
    // Signing in needs a window regardless of what the config says.
    headless: false,
    timeoutMs: config.requestTimeoutMs,
    origin: config.origin,
  });

  io.stderr(`\nOpening ${config.origin} in the controlled browser.\n`);
  io.stderr(`Profile: ${config.profileDir}\n\n`);

  try {
    await browser.launch();
  } catch (error) {
    io.stderr(`${(error as Error).message}\n`);
    return EXIT.api;
  }

  const client = new MidjourneyClient(config, browser);
  io.stderr("Sign in to Midjourney in that window. Waiting...\n");

  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    try {
      const userId = await client.userId();
      io.stderr(`\nSigned in as ${userId}.\n`);
      io.stderr("The session persists in this profile, so this is a one-time step.\n\n");
      client.close();
      return EXIT.ok;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  io.stderr("\nStill not signed in after five minutes. Leave the window open and run `midjourney-cli doctor` once you are.\n");
  client.close();
  return EXIT.auth;
}
