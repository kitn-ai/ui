// THE MOCK DATA MODE (spec 4, "three modes, one axis"): the scripted transport
// an install without flags gets - no endpoint, no key, no provider. `create-kai
// add` writes THIS file's content (and its stripped twin) at
// `assistant.transport.ts`, the one name the controller imports, so mock mode is
// the demo it has always been and the two mock-free modes never ship this file.
//
// LEAF MODULE, DELIBERATELY: no relative imports. The CDN paste form inlines the
// entry, the controller and this file, and refuses anything deeper by name
// (src/registry.ts, inlineRelativeModule). A mock that imported a shared data
// module would make the paste form refuse to generate.
import { createMockResponder } from '@kitn.ai/ui/state';
import type { StreamSource } from '@kitn.ai/ui/wire';
import type { AssistantTransport } from './assistant.controller';

// The scripted script: a rich first conversation (reasoning, a settled tool
// call, citations), so the block demos what the components render rather than
// two plain text bubbles. Edit it freely - it is data, not wiring.
export const MOCK_SCRIPT = [
  {
    reasoning:
      'Summarizing means reading first. Fetch the document, then compress - numbers before narrative.',
    text: 'Reading q3-metrics.pdf now.',
    toolCalls: [{ name: 'read_document', arguments: { name: 'q3-metrics.pdf' } }],
  },
  {
    reasoning:
      'The numbers agree across sections. Cite where each claim comes from so the strip below is real.',
    text:
      'Summary: revenue up 12% QoQ, retention flat, both launches on schedule. ' +
      "(I'm a local mock - no provider was contacted - but these citations render through the exact path a real model's take.)",
    sources: [
      {
        url: 'https://ui.kitn.ai/guides/state-and-hooks/',
        title: 'State and hooks - AI/UI docs',
        snippet: 'A message is an ordered list of parts: text, reasoning, tool, card, source, file.',
      },
      {
        url: 'https://ui.kitn.ai/guides/recipes/wire-adapter/',
        title: 'The wire adapter - AI/UI docs',
      },
    ],
  },
  {
    reasoning:
      'A destructive step comes next, so ask for it rather than taking it.',
    text: 'Before that goes to the channel:',
    toolCalls: [
      {
        // A CARD TOOL. `kai_` is the kit's prefix for one, and the call's
        // ARGUMENTS ARE THE CARD'S DATA - the controller hands this to
        // `cardFromToolCall`, which builds the envelope. The name is the card
        // type, so `kai_confirm` renders the confirm card and a hand-written
        // envelope is never needed (or wanted: it would demo a shape the app
        // never takes).
        name: 'kai_confirm',
        arguments: {
          heading: 'Post the summary to #team?',
          body: '#team sees the numbers above, with the deck attached. One post.',
          actions: [
            { id: 'post', label: 'Post it', default: true },
            { id: 'edit', label: 'Let me edit first' },
          ],
        },
      },
    ],
  },
];

/** Settled outputs the mock hands back, keyed by tool type. Annotated rather
 *  than inferred: the controller looks one up by the type the stream reports,
 *  which is a string, and an inferred object literal has no index signature to
 *  read it with. */
export const MOCK_TOOL_OUTPUTS: Record<string, Record<string, unknown>> = {
  read_document: { pages: 14, headline: 'Revenue up 12% QoQ; retention flat.' },
};

const respond = createMockResponder({ replies: MOCK_SCRIPT });

export const transport: AssistantTransport = {
  // The prompt is ignored: a script answers the same way to anything. A real
  // backend reads it (see assistant.transport.route.ts).
  reply(): StreamSource {
    return respond();
  },
  // The wire only ever ANNOUNCES a tool call - running it and answering is the
  // host's side of the seam. The mock's host is this map: settle the call so its
  // row reaches output-available instead of spinning forever. A real backend's
  // tool loop replaces this, which is why the other two modes answer differently.
  toolOutput(type) {
    return MOCK_TOOL_OUTPUTS[type];
  },
};
