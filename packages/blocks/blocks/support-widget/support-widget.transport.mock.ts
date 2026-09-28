// THE MOCK DATA MODE (spec 4, "three modes, one axis"): the scripted transport
// an install without flags gets - no endpoint, no key, no provider. `create-kai
// add` writes THIS file's content (and its stripped twin) at
// `support-widget.transport.ts`, the one name the controller imports, so mock
// mode is the demo it has always been and the two mock-free modes never ship
// this file.
//
// LEAF MODULE, DELIBERATELY: no relative imports. The CDN paste form inlines the
// entry, the controller and this file, and refuses anything deeper by name
// (src/registry.ts, inlineRelativeModule). A mock that imported a shared data
// module would make the paste form refuse to generate.
import { createMockResponder } from '@kitn.ai/ui/state';
import type { StreamSource } from '@kitn.ai/ui/wire';
import type { SupportWidgetTransport } from './support-widget.controller';

/** The scripted thread: a rich first paint (reasoning plus a settled tool call),
 *  so the block demos what the components render rather than two plain text
 *  bubbles. Edit it freely - it is data, not wiring. */
export const MOCK_SCRIPT = [
  {
    reasoning:
      'An order question. Look the order up before answering - guessing a delivery date is worse than a short wait.',
    text: 'Let me pull up that order.',
    toolCalls: [{ name: 'lookup_order', arguments: { order: 'KAI-1042' } }],
  },
  {
    text: "Order KAI-1042 shipped with DHL and should arrive Thursday. (I'm a local mock - no provider was contacted - but a real model's tool call renders exactly like the row above.)",
  },
  {
    text: 'Anything else? Still the mock: swap the provider seam for your endpoint and this handler keeps its exact shape.',
  },
];

/** Settled outputs the mock hands back, keyed by tool type. Annotated rather
 *  than inferred: the controller looks one up by the type the stream reports,
 *  which is a string, and an inferred object literal has no index signature to
 *  read it with. */
export const MOCK_TOOL_OUTPUTS: Record<string, Record<string, string>> = {
  lookup_order: { order: 'KAI-1042', status: 'shipped', carrier: 'DHL', eta: 'Thursday' },
};

const respond = createMockResponder({ replies: MOCK_SCRIPT });

export const transport: SupportWidgetTransport = {
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
