import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, Show } from 'solid-js';
import { Mail, Lock, Eye, EyeOff, Github, ArrowRight, Sparkles } from 'lucide-solid';

// Labs/Proofs/Auth: a TOKEN-DRIVEN proof screen. The kit ships no auth/form
// components, so this Sign-in screen is built ENTIRELY from design tokens +
// raw markup (the Tailwind utilities that theme.css emits over the --color-*
// tokens: bg-card, bg-surface-sunken, border-input, text-muted-foreground,
// ring-ring, ...). The only non-markup pieces are lucide-solid glyphs rendered
// as inline SVG (NOT kai-icon) - so what you see is purely the token system
// proving it can dress a polished screen we have no purpose-built component for.
//
// It themes light/dark for free: every color is a token utility, no hardcoded
// hex. The page sits on bg-surface-sunken so the bg-card card lifts off it with
// its border + the token-driven .kai-elevation shadow in both modes.

const meta = {
  // Title is the GROUP path; the `Auth` story leaf yields the id `labs-proofs--auth`.
  title: 'Labs/Proofs',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Inline, monochrome Google "G" (fill=currentColor so it themes with the button
// text - no brand hex, keeping the screen 100% token/currentColor driven).
function GoogleGlyph(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={props.class}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  );
}

// Shared, token-driven control classes (factored out so the email + password
// fields and the two button kinds stay visually identical). These ARE the gap:
// in a real app each of these would be a kit primitive, not a class string.
const inputClass =
  'w-full rounded-md border border-input bg-background py-2.5 pl-10 text-sm text-foreground ' +
  'placeholder:text-muted-foreground transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring';

const oauthButtonClass =
  'inline-flex w-full items-center justify-center gap-2.5 rounded-md border border-input bg-background ' +
  'px-4 py-2.5 text-sm font-medium text-foreground transition-colors ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const Auth: Story = {
  name: 'Auth',
  render: () => {
    const [show, setShow] = createSignal(false);

    return (
      // OUTER = the bounded scroll container: full-height, scrolls when the
      // viewport is short. NO items-center (that would clip the top on overflow);
      // min-h-0 lets it shrink below content height and actually scroll.
      <div class="flex h-screen flex-col overflow-y-auto min-h-0 bg-surface-sunken text-foreground">
        {/* INNER = the centering wrapper. m-auto v-centers the card when there's
            spare room and collapses to top-aligned (scrollable) when content is
            taller than the viewport. py-10 is the comfortable overflow padding. */}
        <div class="m-auto w-full max-w-sm px-4 py-10">
          <div class="rounded-2xl border border-border bg-card p-7 text-card-foreground kai-elevation sm:p-8">
            {/* Brand mark + heading. The mark is a token-tinted rounded square. */}
            <div class="mb-7 flex flex-col items-center text-center">
              <div class="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles class="size-5" />
              </div>
              <h1 class="text-xl font-semibold tracking-tight text-foreground">Sign in</h1>
              <p class="mt-1 text-sm text-muted-foreground">Welcome back. Sign in to your account to continue.</p>
            </div>

            {/* FORM */}
            <form class="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              {/* Email field */}
              <div class="flex flex-col gap-1.5">
                <label for="auth-email" class="text-sm font-medium text-foreground">
                  Email
                </label>
                <div class="relative">
                  <Mail class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="auth-email"
                    type="email"
                    autocomplete="email"
                    placeholder="you@example.com"
                    class={inputClass + ' pr-3'}
                  />
                </div>
              </div>

              {/* Password field, with an inline Forgot link and a show/hide toggle */}
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between">
                  <label for="auth-password" class="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <a
                    href="#"
                    class="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div class="relative">
                  <Lock class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="auth-password"
                    type={show() ? 'text' : 'password'}
                    autocomplete="current-password"
                    placeholder="Enter your password"
                    class={inputClass + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show() ? 'Hide password' : 'Show password'}
                    class="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Show when={show()} fallback={<Eye class="size-4" />}>
                      <EyeOff class="size-4" />
                    </Show>
                  </button>
                </div>
              </div>

              {/* Primary submit, full width */}
              <button
                type="submit"
                class="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Sign in
                <ArrowRight class="size-4" />
              </button>
            </form>

            {/* Divider with "or" (kai-separator exists, but this proof stays raw markup) */}
            <div class="my-6 flex items-center gap-3">
              <div class="h-px flex-1 bg-border" />
              <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">or</span>
              <div class="h-px flex-1 bg-border" />
            </div>

            {/* OAuth / social buttons */}
            <div class="flex flex-col gap-2.5">
              <button type="button" class={oauthButtonClass}>
                <GoogleGlyph class="size-4" />
                Continue with Google
              </button>
              <button type="button" class={oauthButtonClass}>
                <Github class="size-4" />
                Continue with GitHub
              </button>
            </div>
          </div>

          {/* Footer link, outside the card */}
          <p class="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <a
              href="#"
              class="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
            >
              Create account
            </a>
          </p>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      source: {
        language: 'html',
        // Representative skeleton: a centered auth card built from token utilities
        // only (no kit components, lucide glyphs for icons). Themes light/dark for
        // free because every color is a --color-* token utility.
        code: `<!-- Double-container centering: outer scrolls (no items-center), inner m-auto -->
<div class="flex h-screen overflow-y-auto min-h-0 bg-surface-sunken text-foreground">
  <div class="m-auto w-full max-w-sm px-4 py-10">
    <div class="rounded-2xl border border-border bg-card p-8 kai-elevation">
      <!-- brand mark + heading -->
      <div class="rounded-xl bg-primary text-primary-foreground"><!-- glyph --></div>
      <h1 class="text-xl font-semibold tracking-tight">Sign in</h1>
      <p class="text-sm text-muted-foreground">Welcome back...</p>

      <form>
        <label class="text-sm font-medium">Email</label>
        <input type="email" placeholder="you@example.com"
          class="w-full rounded-md border border-input bg-background py-2.5 pl-10 text-sm
                 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />

        <label class="text-sm font-medium">Password</label>
        <input type="password" class="... border-input bg-background focus-visible:ring-ring" />

        <button type="submit"
          class="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground
                 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring">Sign in</button>
      </form>

      <!-- divider with "or" -->
      <div class="flex items-center gap-3">
        <div class="h-px flex-1 bg-border"></div>
        <span class="text-xs uppercase text-muted-foreground">or</span>
        <div class="h-px flex-1 bg-border"></div>
      </div>

      <!-- OAuth buttons -->
      <button class="w-full rounded-md border border-input bg-background py-2.5 text-sm
                     hover:bg-accent hover:text-accent-foreground">Continue with Google</button>
      <button class="...">Continue with GitHub</button>
    </div>
    <p class="text-center text-sm text-muted-foreground">Don't have an account?
      <a class="font-medium text-foreground hover:underline">Create account</a></p>
  </div>
</div>`,
      },
    },
  },
};
