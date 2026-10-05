/**
 * Shared plumbing every tool uses, now on Slipway.
 *
 * Tool modules keep describing themselves with a Zod shape, a risk and a
 * handler. This adapter turns each into a Slipway tool, so the MCP server, the
 * CLI, the write guard, annotations and errors all come from the framework
 * instead of a copy kept in this repo.
 */

import { EXIT, SlipwayError, toolkit, z, type ErrorCode, type Risk as SlipwayRisk, type Tool } from "@thenavidm/slipway";
import type { MidjourneyClient } from "../api/client.js";
import type { Config } from "../config.js";
import { MidjourneyError } from "../api/errors.js";

/**
 * Four levels, one more than Slipway names: `spend` costs GPU time from the
 * plan. It reaches Slipway as a write that spends, so it needs confirming and
 * MIDJOURNEY_ALLOW_DESTRUCTIVE=0 refuses it, while clients still see a write.
 */
export type Risk = SlipwayRisk | "spend";

export type ToolContext = {
  client: MidjourneyClient;
  config: Config;
};

const kit = toolkit<ToolContext>();

/** Paging, on every tool that returns a list. */
export const pageArgs = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("How many to return, 1-100. Defaults to 25."),
  cursor: z
    .string()
    .optional()
    .describe("Continue from a previous page. Pass the `cursor` from the last result."),
};

export type ToolSpec<S extends Shape> = {
  name: string;
  /** One line, imperative. Shown in tool pickers. */
  title: string;
  description: string;
  schema: S;
  risk: Risk;
  /** True when calling twice has the same effect as calling once. */
  idempotent?: boolean;
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<unknown>;
  /** One line for the audit log and the confirm message, when this changes something. */
  summary?: (args: z.infer<z.ZodObject<S>>) => string;
};

export type AnyToolSpec = Tool<ToolContext>;

export function makeContext(
  client: MidjourneyClient,
  config: Config,
): ToolContext {
  return { client, config };
}

/** Clamp a caller-supplied limit into something the app will accept. */
export function clamp(value: number | undefined, fallback: number, max = 100): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), 1), max);
}


/**
 * Kept so tool modules read the same, but never sent: Slipway adds `confirm`
 * to every irreversible tool itself, with one description everywhere.
 */
export const confirmArg = {
  confirm: z.boolean().optional(),
};

type Shape = Record<string, z.ZodType>;

/**
 * The class decides the exit code, never the status: a Cloudflare challenge and
 * a missing permission both arrive as 403, and only one is fixed by signing in.
 * `api/errors.ts` already sorts every failure, as 1.3's CLI relied on. What
 * else the error knew, the endpoint or the job id, rides along in `details`.
 */
function classify(error: MidjourneyError): { code: ErrorCode; exitCode: number } {
  switch (error.name) {
    case "ValidationError":
      return { code: "usage", exitCode: EXIT.usage };
    case "WriteBlockedError":
      return { code: "refused", exitCode: EXIT.usage };
    case "NotFoundError":
      return { code: "not_found", exitCode: EXIT.notFound };
    // Both need a person in the browser window: sign in, or let the check finish.
    case "NotSignedInError":
    case "ChallengeError":
      return { code: "auth", exitCode: EXIT.auth };
    case "RateLimitError":
      return { code: "rate_limited", exitCode: EXIT.rateLimited };
    case "TimeoutError":
    case "JobTimeoutError":
      return { code: "timeout", exitCode: EXIT.api };
    default:
      return { code: "api", exitCode: EXIT.api };
  }
}

export function toSlipway(error: MidjourneyError): SlipwayError {
  const { code, exitCode } = classify(error);
  const { error: _message, type: _type, status: _status, ...rest } = error.toJSON();
  const details = Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined && value !== ""));
  return new SlipwayError(error.message, code, exitCode, {
    ...(error.status ? { status: error.status } : {}),
    ...(Object.keys(details).length ? { details } : {}),
    cause: error,
  });
}

export function defineTool<S extends Shape>(spec: ToolSpec<S>): Tool<ToolContext> {
  const { confirm: _confirm, ...shape } = spec.schema as Shape;
  const handler = spec.handler as (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
  return kit.defineTool({
    name: spec.name,
    title: spec.title,
    description: spec.description,
    input: z.object(shape),
    risk: spec.risk === "spend" ? "write" : spec.risk,
    // 1.3's refusals said these, and "is public" is wrong for a private image.
    ...(spec.risk === "spend" ? { spends: true, consequence: "spends GPU time off the Midjourney plan and cannot be refunded" } : {}),
    ...(spec.risk === "destructive" ? { consequence: "cannot be undone" } : {}),
    ...(spec.idempotent !== undefined ? { idempotent: spec.idempotent } : {}),
    ...(spec.summary ? { summary: spec.summary as (args: Record<string, unknown>) => string } : {}),
    handler: async (args, ctx) => {
      try {
        return await handler(args, ctx);
      } catch (error) {
        throw error instanceof MidjourneyError ? toSlipway(error) : error;
      }
    },
  });
}
