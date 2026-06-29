// This page is a React Server Component (NO 'use client' here) — the App Router
// default. It renders plain server-rendered markup AND a client island
// (<KaiDemo/>) that hosts the kai-* web components.
//
// This is the recommended pattern: keep pages/layouts as Server Components and
// drop the interactive kit usage into a small `'use client'` component. See
// KaiDemo.tsx for the why.
import KaiDemo from './KaiDemo';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>@kitn.ai/ui in Next.js</h1>
      <p style={{ marginTop: 0, opacity: 0.7 }}>
        Next.js 15 App Router · React 19 · the kai-* web components, registered
        with <code>@kitn.ai/ui/elements</code> inside a <code>&apos;use client&apos;</code> island.
      </p>
      <KaiDemo />
    </main>
  );
}
