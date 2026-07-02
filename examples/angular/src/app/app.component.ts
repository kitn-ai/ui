import { CUSTOM_ELEMENTS_SCHEMA, Component, computed, signal } from '@angular/core';
import { CONVERSATIONS, THREADS, SUGGESTIONS, TRIGGERS, newId, streamFakeReply } from '../chat-data';
import type { Theme } from './types';
import { createChat } from './state/chat.store';
import { createConversations } from './state/conversations.store';
import { SidebarComponent } from './sidebar.component';
import { ThreadViewComponent } from './thread-view.component';
import { ComposerComponent } from './composer.component';
import { ThemeToggleComponent } from './theme-toggle.component';

/**
 * A mini chat workspace COMPOSED BY HAND from @kitn.ai/ui's individual elements —
 * the Angular mirror of `examples/react` and `examples/vue`. It shows how the raw
 * `kai-*` web components fit together (vs. dropping in one batteries-included
 * `<kai-chat>`/`<kai-workspace>`):
 *
 *   <kai-resizable>/<kai-resizable-item>  — the draggable sidebar | main split (the
 *                                           divider is the kit's default `line` hairline)
 *   <kai-conversations>  — the sidebar list (fed `conversations`, emits select/new)
 *   <kai-thread>         — the scrolling message list (stick-to-bottom built in)
 *   <kai-prompt-input>   — the composer at the bottom
 *
 * The pieces are split into standalone sub-components + the example's own moon/sun
 * icons, and `state/` (`createChat` owns the message array + streaming,
 * `createConversations` the conversation stash, `useVoiceInput` the mic). Everything
 * else is plain Angular signals. Swap `streamFakeReply` for a real model call to ship.
 *
 * `CUSTOM_ELEMENTS_SCHEMA` tells Angular to allow the unknown `kai-*` tags and pass
 * property/event bindings straight through to the DOM.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, ThreadViewComponent, ComposerComponent, ThemeToggleComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="app" [class.dark]="theme() === 'dark'">
      <!-- <kai-resizable> owns the sidebar width + the divider. The handle defaults to
           the \`line\` hairline (transparent at rest, tinting on hover/drag); collapsing
           the sidebar maps to <kai-resizable-item [collapsed]>. Pass \`theme\` to the group
           AND every item so slotted chrome inherits the right light/dark tokens. -->
      <kai-resizable [theme]="theme()" orientation="horizontal">
        <kai-resizable-item [theme]="theme()" size="280px" min="220px" max="420px" [collapsed]="collapsed()">
          <app-sidebar
            [theme]="theme()"
            [conversations]="conversations()"
            [activeId]="activeId()"
            [collapsed]="collapsed()"
            (select)="selectConversation($event)"
            (newChat)="newChat()"
            (toggle)="collapsed.set(!collapsed())"
          ></app-sidebar>
        </kai-resizable-item>

        <kai-resizable-item [theme]="theme()">
          <main class="main">
            <header class="bar">
              <div class="bar-left">
                @if (collapsed()) {
                  <kai-button
                    [theme]="theme()"
                    variant="ghost"
                    size="icon"
                    icon="panel-left"
                    label="Show sidebar"
                    (click)="collapsed.set(false)"
                  ></kai-button>
                }
                <span class="brand">&#64;kitn.ai/ui · composed chat</span>
              </div>
              <app-theme-toggle [theme]="theme()" (toggle)="toggleTheme()"></app-theme-toggle>
            </header>

            <app-thread-view [theme]="theme()" [messages]="chat.messages()"></app-thread-view>

            <app-composer
              [theme]="theme()"
              [loading]="chat.loading()"
              [suggestions]="suggestions()"
              [triggers]="triggers"
              (submit)="send($event)"
              (suggestion)="send($event)"
            ></app-composer>
          </main>
        </kai-resizable-item>
      </kai-resizable>
    </div>
  `,
})
export class AppComponent {
  readonly theme = signal<Theme>('light');
  readonly collapsed = signal(false);

  readonly chat = createChat(THREADS[CONVERSATIONS[0].id] ?? []);
  private readonly convos = createConversations(this.chat, CONVERSATIONS);
  readonly conversations = this.convos.conversations;
  readonly activeId = this.convos.activeId;

  readonly suggestions = computed(() => (this.chat.messages().length <= 1 ? SUGGESTIONS : []));
  readonly triggers = TRIGGERS;

  toggleTheme() {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  selectConversation(id: string) {
    this.convos.selectConversation(id);
  }

  newChat() {
    this.convos.newChat();
  }

  async send(raw: string) {
    const text = raw.trim();
    if (!text) return;
    // The Composer already cleared its own input; here we just append the user
    // message and stream the (fake) assistant reply.
    this.chat.append({ id: newId(), role: 'user', content: text });
    const stream = this.chat.streamAssistant();
    await streamFakeReply(text, (delta) => stream.appendText(delta));
    stream.done();
  }
}
