// ---------------------------------------------------------------------------
// Static configuration for the conversations pages.
// ---------------------------------------------------------------------------

import type { ApiFlowTriggerType } from "@/features/flows/types";

/** The lists on the Conversations page, in the words managers use. */
export const GROUPS: { type: ApiFlowTriggerType; title: string; hint: string }[] = [
  { type: "INTENT", title: "When a driver writes to the bot", hint: "The bot understands what the driver wants, and this conversation answers it." },
  { type: "BUTTON", title: "When a driver taps a button", hint: "The bot sends buttons in its messages. These conversations answer the taps." },
  { type: "EVENT", title: "When the bot steps in by itself", hint: "Something happened (a late delivery, an incident) and the bot starts talking. You can reword these but not create new ones." },
];
