// What the announcement line says, kept for the announcements list: an agent
// became blocked, started working, or finished out of sight (Herdr's `done`).
// shownLine says which of them the announcement line shows now. Pure.
// Kept in memory only, newest last, at most HISTORY_MAX lines: a restart or a
// save of the mod starts it empty, as the game's list starts with a new world.

import { ANNOUNCED, announced, who, where } from "./announce.js";

export const HISTORY_MAX = 200;

/**
 * Holder shared by the status line (which writes) and the announcements list
 * (which reads), so neither needs the other's instance.
 */
export const chronicle = { history: [], statuses: null };

/**
 * history: [{ at, color, text, address, status }], newest last. statuses:
 * Map(address -> status) from the previous call (null at the first call). list: the
 * agents. now: ms.
 * Returns the history with one line added for each agent that just became
 * blocked, working or done (a finish in a shown pane without the focus counts; the text it was announced with), the oldest beyond
 * HISTORY_MAX dropped, and the statuses to remember. At the first look an
 * agent that is working has not started anything, so it is not written down.
 */
export function remember({ history, statuses, list, now }) {
  const first = statuses === null;
  const next = [...history];
  for (const agent of list) {
    const before = statuses?.get(agent.address);
    const status = announced(before, agent);
    const said = ANNOUNCED[status];
    if (!said || before === agent.status) continue;
    if (first && status === "working") continue;
    next.push({ at: now, color: said.color, text: said.text(who(agent), where(agent)), address: agent.address, status });
  }
  return {
    history: next.slice(-HISTORY_MAX),
    statuses: new Map(list.map((agent) => [agent.address, agent.status])),
  };
}

/**
 * The line the announcement line shows: the newest one that is still true.
 * A blocked or working line is true while its agent is still in that state; a
 * finished line is true until its agent works or needs you again. No timers: a
 * newer line always replaces an older one, and a line that stops being true
 * gives way to the newest older one that still is, or to nothing.
 */
export function shownLine({ history, list }) {
  const holds = (line) => {
    const now = list.find((agent) => agent.address === line.address)?.status;
    return line.status === "done" ? now !== "working" && now !== "blocked" : now === line.status;
  };
  return history.findLast(holds) ?? null;
}

/** A line's time of day as HH:MM:SS, local. */
export const clock = (ms) => new Date(ms).toTimeString().slice(0, 8);
