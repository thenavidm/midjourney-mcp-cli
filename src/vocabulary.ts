/**
 * Midjourney's own words, given to Slipway: the flag spellings its prompt
 * syntax uses, and the words people type when they look for a command. Moved
 * verbatim from 1.3's CLI.
 */

/**
 * Midjourney's own parameter spellings, accepted as flags.
 *
 * The schema names things in full because a tool description is read by a model
 * that has never seen a Midjourney prompt. A person at a terminal has, and they
 * will type `--ar 16:9`, because that is what the parameter is called
 * everywhere Midjourney documents it. Refusing the name the whole ecosystem
 * uses, to protect a naming convention nobody outside this repo can see, would
 * be the wrong trade.
 */
export const FLAG_ALIASES: Record<string, string> = {
  ar: "aspect",
  v: "version",
  s: "stylize",
  c: "chaos",
  sref: "style_refs",
  sw: "style_weight",
  oref: "omni_refs",
  ow: "omni_weight",
  iw: "image_weight",
  q: "quality",
  no: "negative",
  p: "profile",
  r: "repeat",
  id: "job_id",
  job: "job_id",
};

/**
 * Words people use mapped onto words the tools use.
 *
 * Without this, "make a picture" matches nothing, because every tool says
 * "generate" and "image". A lookup that only works when you already know the
 * vocabulary is not a lookup.
 */
export const SYNONYMS: Record<string, string[]> = {
  picture: ["image"],
  pictures: ["image"],
  photo: ["image"],
  photos: ["image"],
  pic: ["image"],
  pics: ["image"],
  art: ["image"],
  artwork: ["image"],
  render: ["generate", "imagine"],
  renders: ["image"],
  make: ["generate", "imagine"],
  create: ["generate", "imagine"],
  draw: ["generate", "imagine"],
  generation: ["generate"],
  imagining: ["imagine"],
  save: ["download"],
  saving: ["download"],
  fetch: ["download"],
  grab: ["download"],
  disk: ["download"],
  history: ["jobs"],
  past: ["jobs"],
  previous: ["jobs"],
  recent: ["jobs"],
  running: ["queue"],
  rendering: ["queue"],
  pending: ["queue"],
  progress: ["queue"],
  redo: ["rerun"],
  again: ["rerun"],
  reroll: ["rerun"],
  retry: ["rerun"],
  account: ["whoami"],
  login: ["whoami"],
  logged: ["whoami"],
  signed: ["whoami"],
  auth: ["whoami"],
  session: ["whoami"],
  who: ["whoami"],
  style: ["explore"],
  styles: ["explore"],
  inspiration: ["explore"],
  browse: ["explore"],
  folder: ["folders"],
  moodboard: ["moodboards"],
  quota: ["storage"],
  space: ["storage"],
};
