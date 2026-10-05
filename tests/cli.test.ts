/**
 * The two surfaces, now that Slipway builds both from ALL_TOOLS.
 *
 * Parsing, help and the exit-code contract are Slipway's and tested there,
 * along with the `--select` cases this file used to hold. What matters here:
 * every tool arrives on both surfaces intact, spending GPU time needs a yes and
 * stops with MIDJOURNEY_ALLOW_DESTRUCTIVE=0, Midjourney's own flag spellings
 * and search words still work, and its errors keep their exit codes.
 */

import { describe, expect, it } from "vitest";
import { EXIT, toSlipwayError } from "@thenavidm/slipway";
import { checkApp, cli, connect } from "@thenavidm/slipway/testing";
import {
  BrowserError,
  ChallengeError,
  JobTimeoutError,
  MidjourneyError,
  NotFoundError,
  NotSignedInError,
  RateLimitError,
  ServerError,
  ValidationError,
  WriteBlockedError,
} from "../src/api/errors.js";
import { app } from "../src/app.js";
import { ALL_TOOLS } from "../src/tools/index.js";
import { toSlipway } from "../src/tools/kit.js";
import { FLAG_ALIASES, SYNONYMS } from "../src/vocabulary.js";

const env = {};
const first = async (...words: string[]) => (await cli(app, ["which", ...words], { env })).stdout.split("\n")[0] ?? "";

describe("Midjourney on Slipway", () => {
  it("offers every tool as a command and over MCP, under the same names", async () => {
    const list = await cli(app, [], { env });
    for (const tool of ALL_TOOLS) expect(list.stdout).toContain(tool.command);
    const mcp = await connect(app, { env });
    const names = (await mcp.listTools()).map((tool) => tool.name).sort();
    await mcp.close();
    expect(names).toEqual(ALL_TOOLS.map((tool) => tool.name).sort());
  });

  it("refuses to spend GPU time without --confirm, and says so, before the browser is touched", async () => {
    const run = await cli(app, ["imagine", "a lighthouse at dusk"], { env });
    expect(run.code).toBe(2);
    expect(JSON.parse(run.stderr).error).toMatch(/^imagine spends GPU time off the Midjourney plan and cannot be refunded, so it will not run without --confirm/);
  });

  it("refuses spending with MIDJOURNEY_ALLOW_DESTRUCTIVE=0, even confirmed, and hides it in read-only mode", async () => {
    const off = await cli(app, ["imagine", "a lighthouse", "--confirm"], { env: { MIDJOURNEY_ALLOW_DESTRUCTIVE: "0" } });
    expect(off.code).toBe(2);
    expect(JSON.parse(off.stderr).code).toBe("refused");
    const mcp = await connect(app, { env: { MIDJOURNEY_READ_ONLY: "1" } });
    const tools = await mcp.listTools();
    await mcp.close();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("shows clients a paid generation as a write, not a destructive one", async () => {
    const mcp = await connect(app, { env });
    const imagine = (await mcp.listTools()).find((tool) => tool.name === "imagine")!;
    await mcp.close();
    expect(imagine.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: false });
  });

  it("asks for confirmation on what spends or destroys, and on nothing else", () => {
    for (const tool of ALL_TOOLS) {
      const costly = tool.spends || tool.risk === "destructive";
      expect(tool.requireConfirm, tool.name).toBe(costly);
      if (costly) expect(tool.summary, `${tool.name} needs a summary for the audit log`).toBeTypeOf("function");
    }
  });

  it("describes every argument, because the description is the interface", () => {
    for (const tool of ALL_TOOLS) {
      const properties = (tool.jsonSchema.properties ?? {}) as Record<string, { description?: string }>;
      for (const [key, property] of Object.entries(properties)) {
        if (key === "confirm") continue;
        expect(property.description?.length ?? 0, `${tool.name}.${key} has no description`).toBeGreaterThan(0);
      }
    }
  });

  it("takes Midjourney's own spellings, --ar, --sref and --q, and shows them in help", async () => {
    const run = await cli(app, ["imagine", "a lighthouse", "--ar", "16:9", "--sref", "1234", "--q", "2", "--dry-run", "--compact"], { env });
    expect(run.code).toBe(0);
    expect(JSON.parse(run.stdout).would_run).toMatchObject({ aspect: "16:9", style_refs: ["1234"], quality: 2 });
    expect((await cli(app, ["imagine", "--help"], { env })).stdout).toContain("--aspect, --ar");
    expect(Object.keys(FLAG_ALIASES).length).toBeGreaterThan(10);
  });

  it("finds a command from what someone would actually type", async () => {
    expect(await first("make", "a", "picture")).toContain(" imagine ");
    expect(await first("vary", "that", "image")).toContain(" vary-image ");
    expect(await first("save", "my", "pictures", "to", "disk")).toContain(" download-job ");
    expect(await first("what", "is", "rendering", "right", "now")).toContain(" get-queue ");
    expect(await first("redo", "that", "one", "again")).toContain(" rerun-job ");
    expect(await first("am", "i", "logged", "in")).toContain(" whoami ");
    expect(await first("how", "much", "space", "am", "i", "using")).toContain(" get-storage ");
    expect(await first("the", "a", "of", "and")).toContain("No command matches");
    expect((await cli(app, ["which", "image", "job", "download", "generate"], { env })).stdout.trim().split("\n").length).toBeLessThanOrEqual(5);
    expect(Object.keys(SYNONYMS).length).toBeGreaterThan(20);
  });

  it("keeps login and capture reachable, capture's own --out included", async () => {
    const help = (await cli(app, ["--help"], { env })).stdout;
    expect(help).toContain("midjourney-cli login");
    expect(help).toContain("midjourney-cli capture [--seconds N] [--out <file>] [--all]");
    expect((await cli(app, ["login", "--help"], { env })).stdout).toContain("Usage: midjourney-cli login");
  });

  it("passes slipway check, aliases and synonyms included", async () => {
    const report = await checkApp(app, { env });
    expect(report.findings.filter((finding) => finding.level === "error")).toEqual([]);
    expect(report.findings.filter((finding) => finding.check === "synonyms")).toEqual([]);
  });
});

describe("Midjourney's errors keep their exit codes", () => {
  const at = "/api/submit-jobs";
  it.each([
    ["a bad --ar", new ValidationError("bad --ar", 400, at), EXIT.usage],
    ["a refused write", new WriteBlockedError("imagine will not run without --confirm."), EXIT.usage],
    ["a missing job", new NotFoundError("no such job", 404, "/api/job"), EXIT.notFound],
    ["a signed-out session", new NotSignedInError("not signed in", 403, at), EXIT.auth],
    ["a Cloudflare challenge", new ChallengeError("challenge", 403, at), EXIT.auth],
    ["a rate limit", new RateLimitError("slow down", 429, at), EXIT.rateLimited],
    ["a server failure", new ServerError("boom", 502, at), EXIT.api],
    ["a job that never finished", new JobTimeoutError("still running after 600 s", "job-1"), EXIT.api],
    ["no browser", new BrowserError("Chrome is not running"), EXIT.api],
    ["anything else Midjourney says", new MidjourneyError("odd", 418, at), EXIT.api],
  ])("maps %s", (_label, error, code) => {
    expect(toSlipwayError(toSlipway(error)).exitCode).toBe(code);
  });

  it("keeps the job id of a job that timed out", () => {
    expect(toSlipway(new JobTimeoutError("still running", "job-1")).toJSON()).toMatchObject({ code: "timeout", details: { job_id: "job-1" } });
  });
});
