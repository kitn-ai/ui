// THE MOCK DATA MODE (spec 4, "three modes, one axis"): the scripted transport
// an install without flags gets - no endpoint, no key, no provider. `create-kai
// add` writes THIS file's content (and its stripped twin) at
// `in-app-assistant.transport.ts`, the one name the controller imports, so mock
// mode is the demo it has always been and the two mock-free modes never ship
// this file.
//
// LEAF MODULE, DELIBERATELY: no relative imports. The CDN paste form inlines the
// entry, the controller and this file, and refuses anything deeper by name
// (src/registry.ts, inlineRelativeModule). A mock that imported a shared data
// module would make the paste form refuse to generate.
import { createMockResponder } from '@kitn.ai/ui/state';
import type { StreamSource } from '@kitn.ai/ui/wire';
import type { InAppAssistantTransport } from './in-app-assistant.controller';

/** The scripted thread: a rich first paint (reasoning plus a settled
 *  search_docs call), so the block demos what the components render. No
 *  citations by design - this matches the in-app assistant template's
 *  capability set, which declares no sources strip. Edit it freely - it is
 *  data, not wiring. */
export const MOCK_SCRIPT = [
  {
    reasoning: 'A question about the current page. Search the docs before answering from memory.',
    text: 'Checking the docs for that.',
    toolCalls: [{ name: 'search_docs', arguments: { query: 'deploy checklist' } }],
  },
  {
    text:
      'Found it: the deploy checklist wants a green canary before promoting. ' +
      "(Local mock, no provider contacted - the tool row above streamed through the kit's real parser.)",
  },
  {
    reasoning: 'Follow-up. Keep it short.',
    text: 'Anything else on this page? Swap the mock for your endpoint and this handler does not change shape.',
  },
];

/** Settled outputs the mock hands back, keyed by tool type. Annotated rather
 *  than inferred: the controller looks one up by the type the stream reports,
 *  which is a string, and an inferred object literal has no index signature to
 *  read it with. */
export const MOCK_TOOL_OUTPUTS: Record<string, Record<string, unknown>> = {
  search_docs: { matches: 3, top: 'Deploy checklist - promote only on a green canary.' },
};

const respond = createMockResponder({ replies: MOCK_SCRIPT });

export const transport: InAppAssistantTransport = {
  // THE THREAD IS NOT READ, and that is the mock's own decision rather than the
  // seam's: the script above is fixed, and the responder cycles it per turn.
  // The PARAMETER stays on the interface because a real backend's reply is a
  // function OF the thread - the conversation IS the request - and that is the
  // mode this one is swapped for.
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
