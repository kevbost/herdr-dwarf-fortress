// The report letters of the game's left border: one letter per thing that
// happened to an agent, newest at the top, each gone after a while. Pure.

import { announced } from "./announce.js";

/** What happened, as a letter in a DF color name: the game's C (combat), H (hunting) and S (sparring). */
export const REPORTS = {
  blocked: { letter: "C", color: "LRED" },
  done: { letter: "H", color: "LGREEN" },
  working: { letter: "S", color: "LBLUE" },
};

/** How long a letter stays, ms, and how many the border keeps. */
export const REPORT_TTL = 90_000;
export const REPORT_MAX = 12;

/**
 * log: [{ address, status, at }], newest last, from the previous call ([] at first).
 * statuses: Map(address -> status) from the previous call (null at the first call).
 * list: [{ address, status }]. now: ms.
 * Returns the log with each agent that just entered a reported state added,
 * letters older than REPORT_TTL and the oldest beyond REPORT_MAX dropped, and
 * the statuses to remember. At the first look, only blocked and done count:
 * an agent that is working then has not started anything.
 */
export function report({ log, statuses, list, now }) {
  const first = statuses === null;
  const next = log.filter((entry) => now - entry.at < REPORT_TTL);
  for (const agent of list) {
    const before = statuses?.get(agent.address);
    const status = announced(before, agent);
    if (!Object.hasOwn(REPORTS, status) || before === agent.status) continue;
    if (first && status === "working") continue;
    next.push({ address: agent.address, status, at: now });
  }
  return {
    log: next.slice(-REPORT_MAX),
    statuses: new Map(list.map((agent) => [agent.address, agent.status])),
  };
}

/** When the oldest letter goes, ms, or null with none. */
export const nextExpiry = (log) => (log.length ? log[0].at + REPORT_TTL : null);
