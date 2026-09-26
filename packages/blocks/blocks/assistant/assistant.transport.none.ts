// THE COMPOSITION-ONLY DATA MODE (spec 4, `create-kai add assistant --no-mock`):
// the page, the controller and the styles, with NO transport.
//
// This file is the seam, and the whole point of it is that the block cannot
// pretend. Every path into the model goes through `transport.reply`, so an
// unwired install fails at the moment it would have answered - with a sentence
// naming what the consumer has to write - rather than rendering an empty reply
// and leaving them to guess whether the block or their backend is at fault.
//
// Replace this file with your own transport: return a Response, a
// ReadableStream or an async iterable of SSE text from `reply`, and answer the
// tool calls your stream announces from `toolOutput`. Store, route and provider
// are all yours; the block only owns how the reply renders.
import type { StreamSource } from '@kitn.ai/ui/wire';
import type { AssistantTransport } from './assistant.controller';

/** Say what is missing, name the file to write, and throw. A shared helper
 *  because both halves of the seam fail for the same reason. */
function unwired(action: string): never {
  throw new Error(
    `assistant: this block was installed with --no-mock, so it has no transport - and ${action} needs one. ` +
      `Write your own in assistant.transport.ts: reply(messages) returns the reply stream ` +
      `(a Response, a ReadableStream, or an async iterable of SSE text) and toolOutput(type) answers the tool ` +
      `calls your stream announces. Or install the block again with a gateway (\`--gateway <id>\`), which emits ` +
      `a route for you.`,
  );
}

export const transport: AssistantTransport = {
  reply(): StreamSource {
    return unwired('sending a message');
  },
  toolOutput() {
    return unwired('settling a tool call');
  },
};
