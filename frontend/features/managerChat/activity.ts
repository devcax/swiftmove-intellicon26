/** Short, plain status lines for what the assistant did. The tool name is the action name with the dot replaced by an underscore. */
const OUTCOME_TEXT: Record<string, string> = {
  ok: "Done",
  blocked: "Blocked by a rule",
  needs_confirmation: "Waiting for your confirmation",
  invalid: "Missing or wrong details",
  refused: "Not allowed",
  error: "Did not work",
  cancelled: "Cancelled",
};

const words = (text: string) => text.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_.]/g, " ").toLowerCase();

export function describeActivity(tool: string | undefined, outcome: string): string {
  const what = tool ? words(tool) : "a step";
  return `${OUTCOME_TEXT[outcome] ?? outcome}: ${what}`;
}
