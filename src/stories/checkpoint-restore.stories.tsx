import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import {
  ChatContainer, ChatContainerContent, ChatContainerScrollAnchor,
  Message, MessageAvatar, MessageContent, MessageActions,
  PromptInput, PromptInputTextarea, PromptInputActions,
  Checkpoint, CheckpointIcon, CheckpointTrigger,
  Button, Separator,
} from '../index';
import { Copy, ThumbsUp, ThumbsDown, ArrowUp, RotateCcw } from 'lucide-solid';

const meta: Meta = {
  title: 'Examples/Checkpoint & Restore',
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [restoredTo, setRestoredTo] = createSignal<string | null>(null);

    return (
      <div class="flex flex-col h-[700px] w-full max-w-2xl bg-background rounded-xl shadow-lg overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3">
          <h2 class="text-sm font-semibold text-foreground">API Design Session</h2>
          {restoredTo() && (
            <span class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              Restored to checkpoint: {restoredTo()}
            </span>
          )}
        </div>
        <Separator />

        <ChatContainer class="flex-1 p-4">
          <ChatContainerContent class="space-y-6 py-4">

            {/* Initial exchange */}
            <Message>
              <MessageAvatar src="" fallback="U" alt="User" />
              <MessageContent>
                I'm designing a REST API for a task management app. What should the core endpoints look like?
              </MessageContent>
            </Message>

            <Message>
              <MessageAvatar src="" fallback="AI" alt="Assistant" />
              <div class="flex-1 space-y-2">
                <MessageContent markdown>
{`Here's a clean REST resource design for task management:

\`\`\`
GET    /api/tasks              # List tasks (with filters)
POST   /api/tasks              # Create task
GET    /api/tasks/:id          # Get single task
PATCH  /api/tasks/:id          # Update task
DELETE /api/tasks/:id          # Delete task

GET    /api/projects           # List projects
POST   /api/projects           # Create project
GET    /api/projects/:id/tasks # Tasks within a project
\`\`\`

Key design decisions:
- Use **PATCH** over PUT for partial updates
- Nest tasks under projects for scoped queries
- Support filtering via query params: \`?status=active&assignee=me\``}
                </MessageContent>
                <MessageActions>
                  <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
                </MessageActions>
              </div>
            </Message>

            {/* First checkpoint */}
            <Checkpoint>
              <CheckpointIcon />
              <CheckpointTrigger
                tooltip="Restore to this point"
                onClick={() => setRestoredTo('API structure defined')}
              >
                <div class="flex items-center gap-1.5 text-xs">
                  <RotateCcw class="size-3" />
                  <span>API structure defined</span>
                </div>
              </CheckpointTrigger>
            </Checkpoint>

            {/* Second exchange */}
            <Message>
              <MessageAvatar src="" fallback="U" alt="User" />
              <MessageContent>
                What about authentication? Should I use JWT or session cookies?
              </MessageContent>
            </Message>

            <Message>
              <MessageAvatar src="" fallback="AI" alt="Assistant" />
              <div class="flex-1 space-y-2">
                <MessageContent markdown>
{`For a task management API, I'd recommend **JWT with refresh tokens**:

\`\`\`typescript
// Auth endpoints
POST /api/auth/login     // Returns access + refresh tokens
POST /api/auth/refresh   // Exchanges refresh for new access token
POST /api/auth/logout    // Invalidates refresh token

// Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
\`\`\`

**Why JWT over sessions:**
- Stateless -- no server-side session store needed
- Works across subdomains and mobile apps
- Access tokens expire in 15min, limiting damage from theft

**The tradeoff:** you can't instantly revoke JWTs. Mitigate this with short expiry + a blocklist for critical cases (password change, account compromise).`}
                </MessageContent>
                <MessageActions>
                  <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
                </MessageActions>
              </div>
            </Message>

            {/* Second checkpoint */}
            <Checkpoint>
              <CheckpointIcon />
              <CheckpointTrigger
                tooltip="Restore to this point"
                onClick={() => setRestoredTo('Auth strategy chosen')}
              >
                <div class="flex items-center gap-1.5 text-xs">
                  <RotateCcw class="size-3" />
                  <span>Auth strategy chosen</span>
                </div>
              </CheckpointTrigger>
            </Checkpoint>

            {/* Third exchange after checkpoint */}
            <Message>
              <MessageAvatar src="" fallback="U" alt="User" />
              <MessageContent>
                Now help me think about error handling. What's a good error response format?
              </MessageContent>
            </Message>

            <Message>
              <MessageAvatar src="" fallback="AI" alt="Assistant" />
              <div class="flex-1 space-y-2">
                <MessageContent markdown>
{`Use a consistent error envelope inspired by the **RFC 7807 Problem Details** spec:

\`\`\`typescript
interface ApiError {
  status: number;        // HTTP status code
  code: string;          // Machine-readable error code
  message: string;       // Human-readable description
  details?: unknown[];   // Validation errors, field-level info
  requestId: string;     // For debugging/support
}

// Example responses
// 400 Bad Request
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid task data",
  "details": [
    { "field": "title", "error": "Required field missing" },
    { "field": "dueDate", "error": "Must be a future date" }
  ],
  "requestId": "req_abc123"
}

// 404 Not Found
{
  "status": 404,
  "code": "RESOURCE_NOT_FOUND",
  "message": "Task not found",
  "requestId": "req_def456"
}
\`\`\`

Always include the \`requestId\` -- it's invaluable for correlating client errors with server logs.`}
                </MessageContent>
                <MessageActions>
                  <Button variant="ghost" size="icon-sm"><Copy class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm"><ThumbsUp class="size-3.5" /></Button>
                  <Button variant="ghost" size="icon-sm"><ThumbsDown class="size-3.5" /></Button>
                </MessageActions>
              </div>
            </Message>

            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainer>

        <div class="px-4 pb-4">
          <PromptInput>
            <PromptInputTextarea placeholder="Continue the API design..." />
            <PromptInputActions class="justify-end">
              <Button variant="default" size="icon-sm" class="rounded-full">
                <ArrowUp class="size-4" />
              </Button>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    );
  },
};
