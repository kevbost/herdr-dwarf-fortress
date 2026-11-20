// What the announcement line says about agents, in the game's voice: the three
// states worth announcing, how each is worded, and who and where an agent is. Pure.

/**
 * The states worth announcing, with the DF color name each is written in.
 */
export const ANNOUNCED = {
  blocked: { color: "LRED", text: (who, where) => `${who} needs you at ${where}!` },
  done: { color: "LGREEN", text: (who, where) => `${who} has finished at ${where}.` },
  working: { color: "LBLUE", text: (who, where) => `${who} has started working at ${where}.` },
};

const spaceOf = (agent) => agent.space_name || agent.title || agent.address;
const programOf = (agent) => agent.program?.name || agent.app || "An agent";
export { programOf as who, spaceOf as where };

/**
 * The status to announce for an agent that was `before` and is now `agent.status`.
 * Herdr sends `done` only for work that ends out of sight; work that ends in a
 * pane that is shown but does not have the focus goes straight to idle, and is
 * as finished as any, so it counts as done. The focused pane is the one being
 * watched: nothing to announce.
 */
export const announced = (before, agent) => (before === "working" && agent.status === "idle" && !agent.focused ? "done" : agent.status);
