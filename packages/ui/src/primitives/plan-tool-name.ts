// The `kai_plan` tool's name, alone. `kai_`-prefixed like the card tools, but NOT a card:
// `cardTypeFromToolName` refuses it, so a tool loop that asks `isCardTool` first does not render
// the plan as a fallback card. See ./plan for the rest of the plan tool.
export const PLAN_TOOL_NAME = 'kai_plan';
