// THE REAL DATA MODE (spec 4): the composition streaming from a backend.
//
// `create-kai add in-app-assistant --gateway <id>` writes THIS file's content
// (and its stripped twin) at `in-app-assistant.transport.ts` - the one name the
// controller imports - and emits the provider route the scaffolder generates
// alongside it. The route lives at `/api/chat`; the block fetches it and parses
// the reply with the kit's reader, never by hand.
//
// KEY HANDLING IS NOT HERE. The browser sends a prompt, never a key: the route
// holds the credential, which is why this file is safe to ship to a bundle.
import { toOpenAIMessages } from '@kitn.ai/ui/wire';
import type { StreamSource } from '@kitn.ai/ui/wire';
import type { InAppAssistantTransport } from './in-app-assistant.controller';

export const transport: InAppAssistantTransport = {
  async reply(messages): Promise<StreamSource> {
    // `toOpenAIMessages` encodes the turn for the OpenAI wire (OpenRouter and
    // Anthropic routes are swapped by the emitted route, not here). The model and
    // the system prompt belong to the route: the block sends turns, never an id,
    // and never a key.
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toOpenAIMessages(messages) }),
    });
    // A non-ok response throws inside the reader (WireError, with the provider's
    // own error body attached), and the controller reports it on the message.
    return response;
  },
  // NOTHING TO SETTLE, and that is the wire's shape rather than a gap: a tool
  // CALL arrives as a delta and its RESULT is a message the consumer sends back
  // on the next request, so executing a tool is the consumer's server-side loop.
  // Return an output here to answer one in the browser instead.
  toolOutput() {
    return undefined;
  },
};
