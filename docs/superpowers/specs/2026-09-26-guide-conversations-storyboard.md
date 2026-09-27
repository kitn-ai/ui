# Guide conversations — storyboard (2026-09-26)

> A review copy. These are the conversations the assistant block ships, written as prose
> turns so they can be read and judged before any of it becomes code. Nothing here is
> implemented yet, and the parentheticals that say what each turn is FOR would not ship.

**How to read it.** Each guide opens from a card on the empty state. Each arc opens from a
short suggestion label. Assistant turns are two or three sentences and then the code or the
card they are explaining — if a turn runs longer than the thing it teaches, it is too long.

**On the code.** The `ts` fences are written to be extracted and compiled later, so they use
real exports and no pseudocode. Most are whole units. Where a fence is a fragment, it says
what surrounds it.

**On the `*Next:*` lines.** Three of the arc labels were corrected after this file was
first written, and the reasons are recorded here because the corrections are the whole point
of the rule: an arc's first entry must be the user's next INTENT, not a question whose answer
is already on screen and not a line a form cannot echo; and a conversation's last turn offers
the cross-links, so an arc that offers two where the others offer three has displaced one. Every assistant turn ends with the labels that would appear under
the composer at that moment, so a reader can walk a conversation by clicking rather than by
typing. The first entry is that conversation's own next step — or, at the end of a guide, the
next guide in the path. The cross-links to the other conversations come last and only once a
conversation has finished, because offering a different topic mid-thread breaks the one the
reader is in.

---

## Part 1 — the guides

### Get it running

*Card summary: Replace the scripted mock with your backend by swapping one file.*

**User:** How do I get this talking to my own backend?

**Assistant** — *(the seam: one file, and only one)* One file decides where replies come
from: `assistant.transport.ts`. The controller imports that name and nothing else, the three
modes ship as three versions of it, and the contract that type must satisfy is two methods,
not a file you add:

```ts
import type { ChatMessage } from '@kitn.ai/ui/state';
import type { StreamSource } from '@kitn.ai/ui/wire';

export interface AssistantTransport {
  reply(messages: ChatMessage[]): Promise<StreamSource> | StreamSource;
  toolOutput(toolType: string): Record<string, unknown> | undefined;
}
```

*Next:* `Show the real transport`

**Assistant** — *(the real mode; the key stays on the server)* Yours fetches your route and
returns the response. The browser never holds a credential — the route does.

```ts
import { toOpenAIMessages, type StreamSource } from '@kitn.ai/ui/wire';
import type { AssistantTransport } from './assistant.controller';

export const transport: AssistantTransport = {
  async reply(messages): Promise<StreamSource> {
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toOpenAIMessages(messages) }),
    });
  },
  // `undefined` leaves a tool call announced for your route to answer on the next request.
  toolOutput() {
    return undefined;
  },
};
```

*Next:* `Where does it get parsed?`

**Assistant** — *(where that response gets parsed)* The controller feeds whatever `reply`
returns to the kit's reader, which folds it into the thread. These are its two lines; `stream`
is the assistant stream built just above them.

```ts
const stream = createAssistantStream((update) => setMessages(update(messages)));
await readOpenAIStream(await transport.reply(messages), stream);
```

Swap `readAnthropicStream` if your route speaks Anthropic — nothing else changes. Install
with `--no-mock` instead and you get the third version, where `reply` throws with the file
you have to write named in the message: an unwired block fails where it would have answered
rather than rendering an empty reply.

*Next:* `Wire a model` · `Add voice` · `Send a card`

### Wire a model

*Card summary: Point the thread at OpenRouter, Anthropic, or your own route.*

**User:** Which provider does this use? I want to point it at OpenRouter.

**Assistant** — *(there is no client in the kit)* None, and that is deliberate: the kit parses
provider streams and never calls one. Your route holds the key, sends it a thread, and streams
back what the provider says. The four functions you need come from one entry:

```ts
import {
  readOpenAIStream, readAnthropicStream,
  toOpenAIMessages, toAnthropicMessages,
} from '@kitn.ai/ui/wire';
```

*Next:* `Show the OpenRouter route`

**Assistant** — *(the OpenAI-shaped route, which is also OpenRouter's)* OpenRouter speaks the
OpenAI wire, so it is the same encode-read pair end to end. `toOpenAIMessages` keeps tool
calls and their results on the way back, which is what makes a second round possible.

```ts
import { toOpenAIMessages } from '@kitn.ai/ui/wire';

export async function POST(request: Request) {
  const { messages } = await request.json();
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'anthropic/claude-sonnet-4.5', messages: toOpenAIMessages(messages) }),
  });
}
```

*Next:* `What changes for Anthropic?`

**Assistant** — *(what Anthropic changes)* Two things: the key header, and the system prompt,
which is a top-level field rather than a message. These are the two differing lines of that
route; the surrounding fetch is identical to the one above.

```ts
headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
body: JSON.stringify({ model: 'claude-sonnet-4-5', system, messages: toAnthropicMessages(messages) }),
```

*Next:* `What about the model ids?`

**Assistant** — *(the model id)* One gotcha: the ids the switcher lists are the mock's.
Replace them with real ones from your provider before you point this at a gateway, or the
provider rejects the request.

*Next:* `Add voice` · `Send a card` · `Get it running`

### Add voice

*Card summary: Record and transcribe speech, and the events that drive your UI.*

**User:** Can users talk to this instead of typing?

**Assistant** — *(the element does the work)* `<kai-voice-input>` records and transcribes.
Dropped on a page it uses the browser's own speech recognition, which Chrome and Safari have
and Firefox does not:

```html
<kai-voice-input recognition-lang="en-US" interim></kai-voice-input>
```

*Next:* `Use my own transcriber`

**Assistant** — *(one path for every browser)* Point `transcribe` at your own service and
every browser takes the same route. It gets the recorded audio and returns the text:

```ts
const voice = document.querySelector('kai-voice-input');
if (!voice) throw new Error('kai-voice-input is not on the page');

voice.transcribe = async (audio) => {
  const body = new FormData();
  body.append('file', audio, 'speech.webm');
  const response = await fetch('/api/transcribe', { method: 'POST', body });
  return (await response.json()).text;
};
```

*Next:* `What events does it fire?`

**Assistant** — *(everything else is one of five events, on the element itself)* They do not
bubble, so listen on the element:

```ts
voice.addEventListener('kai-recording-change', (e) => setRecording(e.detail.recording));
voice.addEventListener('kai-transcript-interim', (e) => showPartial(e.detail.text));
voice.addEventListener('kai-transcription', (e) => insert(e.detail.text));
voice.addEventListener('kai-audio-captured', (e) => keep(e.detail.blob));
voice.addEventListener('kai-voice-error', (e) => report(e.detail.message));
```

`start()` and `stop()` on the element do the same thing a click does, which is what a
push-to-talk key needs.

*Next:* `Send a card` · `Get it running` · `Wire a model`

> **Note on scope.** Device selection and a microphone preview are designed but not built
> yet, so nothing in this conversation mentions them. This guide grows when they land.

### Send a card

*Card summary: Let a tool return a card the thread renders and reads back.*

**User:** Can the model send a form instead of another paragraph?

**Assistant** — *(the naming convention is the whole protocol)* Name a tool with the `kai_`
prefix and the call renders as a card: `kai_confirm` renders the confirm card, `kai_tasks` the
task list. The part after the prefix is the card type, and the call's arguments ARE the card's
data — nothing is renamed or defaulted.

*Next:* `How does the model know?`

**Assistant** — *(declare them to the model from the registry)* One registry, threaded to both
ends: the route advertises the tools, the client says which card types it can render.

```ts
import { cardTools, createCardRegistry } from '@kitn.ai/ui/schemas';

const cards = createCardRegistry({ use: ['confirm', 'tasks'] });
const tools = cardTools(cards); // the route hands these to the model
chat.cardTypes = cards.tags;    // the client renders these tags
```

*Next:* `Show me the tool loop`

**Assistant** — *(three lines in your tool loop)* A card tool renders and stops; anything else
runs. Passing the provider's `tool_call_id` through as the envelope's `id` is what makes a
revised card replace itself instead of stacking a second copy.

```ts
import { applyToolOutput } from '@kitn.ai/ui/wire';
import { cardFromToolCall } from '@kitn.ai/ui/schemas';

// `runTool` is your own dispatch; `stream` is the assistant stream you are folding into.
for (const call of pendingCalls) {
  const card = cardFromToolCall(call.name, call.input ?? {}, { id: call.id });
  if (card) {
    stream.addCard(card);
    applyToolOutput(stream, call.id, { status: 'awaiting_user' });
    continue;
  }
  applyToolOutput(stream, call.id, await runTool(call.name, call.input ?? {}));
}
```

*Next:* `What about citations?`

**Assistant** — *(citations come through the same fold)* A `url_citation` annotation on the
stream becomes a `source` part on the message, and the thread renders it under the text. You
do not handle those separately.

*Next:* `Get it running` · `Wire a model` · `Add voice`

---

## Part 2 — the suggestion arcs

Each arc is a scripted conversation a user starts by clicking one short label. The turns are
fixed, so an arc **cannot branch on an answer a card asks for** — the next turn plays whether
or not the user clicked. That is worth knowing while reading these: the cards show what the
shape does rather than waiting on it.

### `Summarize a document`

**User:** Summarize a document          *(the label IS the first turn — clicking it sends this text)*

*The arc then behaves as though they had named q3-metrics.pdf: the mock chooses the document, so the reply can be about one.*

**Assistant** — *(a tool call that settles, then the answer)* "Reading it now" plus a
`read_document` call, then three bullets: revenue up 12%, churn flat, the enterprise tier
carrying the quarter.

*Next:* `Post it to #metrics`

**Assistant** — *(a card asking for permission)* The `kai_confirm` card — *Post this summary to
#metrics?* with **Post** and **Edit first**. Its two buttons answer the tool call the first turn
announced, so the arc ends with a settled tool rather than a dangling one.

*Next:* `Make a task list` · `Compare two options` · `Draft a short brief`

### `Make a task list`

**User:** Make a task list          *(the label IS the first turn)*

*The arc behaves as though they had named the migration plan.*

**Assistant** — *(a request becomes a card)* "Broke it into four." Plus a `kai_tasks` call: four
items, the first marked in progress. The card is the task list the thread renders — an ordinary
tool call, no special casing.

*Next:* `Mark the first one done`

**Assistant** — *(one item marked off)* The first item flips to done, which shows the card
writing back to its own tool call rather than a static picture.

*Next:* `Summarize a document` · `Compare two options` · `Draft a short brief`

### `Compare two options`

**User:** Compare two options          *(the label IS the first turn)*

*The arc behaves as though they had named Postgres and SQLite.*

**Assistant** — *(two weighed, briefly)* Two sentences each, in the answer's own terms —
Postgres costs you a service and buys concurrency; SQLite costs you nothing and serializes
writes. Then a `kai_choice` card offering both.

*Next:* `Use Postgres` · `Use SQLite`

**Assistant** — *(the assistant commits)* The follow-up picks one and says why in one line,
which is the point: a comparison that never lands is not a recommendation.

*Next:* `Summarize a document` · `Make a task list` · `Draft a short brief`

### `Draft a short brief`

**User:** Draft a short brief          *(the label IS the first turn)*

*The arc behaves as though they had named the launch.*

**Assistant** — *(it asks for what it is missing)* "Two things I do not have: who this is for,
and when." Then a `kai_form` card with just those two fields, rather than a paragraph
explaining that it needs them.

*Next:* `Use what I typed`

**Assistant** — *(then it writes)* A four-sentence brief using the two answers, and one line
naming what it assumed.

*Next:* `Summarize a document` · `Make a task list` · `Compare two options`

---

## Part 3 — the empty state's suggestions

Four labels, rendered as full-width rows (`PromptSuggestion` `block`), in this order:

```
Summarize a document
Make a task list
Compare two options
Draft a short brief
```

Above them: the four guide cards — **Get it running**, **Wire a model**, **Add voice**,
**Send a card**.

---

## What the mock cannot do, while you read

Two limits worth knowing before you approve, because both shaped what is written above.

- **An arc cannot branch.** The turns are fixed by index, so a card that asks a question gets
  its answer only in the next scripted turn.
- **A scripted turn cannot produce a `file` part.** The stream can (`addFile` is right beside
  `addCard`), but the mock's turn type has no field for one, so it is unreachable from a script
  — which is why no arc mentions attachments. The one real file part in the block comes from the
  submit path, when a user stages an attachment. Adding a `files` field to the turn type is the
  small fix that closes it.
