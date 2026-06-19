import type { Integration } from '../types';

const cloudflare: Integration = {
  id: 'cloudflare',
  title: 'Cloudflare AI',
  category: 'provider',
  language: 'ts',
  streamFormat: 'openai-sse',
  envVars: ['CF_ACCOUNT_ID', 'CF_API_TOKEN'],
  routeTemplates: {
    next: `// app/api/chat/route.ts — proxy Workers AI, keep the token server-side
export async function POST(req: Request) {
  const { messages } = await req.json();

  const upstream = await fetch(
    \`https://api.cloudflare.com/client/v4/accounts/\${process.env.CF_ACCOUNT_ID}/ai/v1/chat/completions\`,
    {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${process.env.CF_API_TOKEN}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-3.1-8b-instruct',
        messages,
        stream: true,
      }),
    },
  );

  // Workers AI returns OpenAI-format SSE — pass it straight through.
  return new Response(upstream.body, { headers: { 'Content-Type': 'text/event-stream' } });
}`,
    worker: `// NOTE: env.AI emits Cloudflare-native SSE (data: {"response":"..."}), NOT OpenAI-format SSE.
// Remap these chunks to {choices:[{delta:{content}}]} before returning, or use the \`next\` route instead.
// Worker handler — env.AI is bound in wrangler.toml
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { messages } = await req.json();

    const stream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      stream: true,
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  },
};`,
  },
  streamMapping: "Workers AI via the OpenAI-compatible HTTP endpoint returns OpenAI-format SSE — pipe upstream.body straight to the browser; kai-chat's reader handles it. Caution: the native env.AI binding streams Cloudflare's own format (data: {\"response\":\"...token...\"}) — remap those chunks before returning, or use the OpenAI-compatible endpoint instead.",
  runNote: 'Set CF_ACCOUNT_ID and CF_API_TOKEN. Model ids are prefixed with @cf/, e.g. @cf/meta/llama-3.1-8b-instruct. For the AI binding (worker key), add an [ai] block with binding = "AI" in wrangler.toml.',
  docsSlug: 'integrations/cloudflare-ai',
};

export default cloudflare;
