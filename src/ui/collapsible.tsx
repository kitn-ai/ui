import {
  createContext,
  useContext,
  createSignal,
  createUniqueId,
  splitProps,
  type JSX,
  type Accessor,
} from 'solid-js';
import { cn } from '../utils/cn';

// Extend SolidJS JSX to allow `bool:inert` (forces setAttribute so jsdom reflects it as an attribute).
declare module 'solid-js' {
  namespace JSX {
    interface ExplicitBoolAttributes {
      inert: boolean;
    }
  }
}

interface CollapsibleCtx {
  open: Accessor<boolean>;
  toggle: () => void;
  contentId: string;
}

const Ctx = createContext<CollapsibleCtx>();

const useCollapsible = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Collapsible parts must be used within <Collapsible>');
  return c;
};

export function Collapsible(props: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: JSX.Element;
  class?: string;
}) {
  const [local, rest] = splitProps(props, ['open', 'defaultOpen', 'onOpenChange', 'children', 'class']);
  const [uncontrolled, setUncontrolled] = createSignal(local.defaultOpen ?? false);
  const isControlled = () => local.open !== undefined;
  const open = () => (isControlled() ? !!local.open : uncontrolled());
  const toggle = () => {
    const next = !open();
    if (!isControlled()) setUncontrolled(next);
    local.onOpenChange?.(next);
  };
  const contentId = createUniqueId();
  return (
    <Ctx.Provider value={{ open, toggle, contentId }}>
      <div
        class={local.class}
        {...rest}
        data-expanded={open() ? '' : undefined}
        data-closed={open() ? undefined : ''}
        data-state={open() ? 'open' : 'closed'}
      >
        {local.children}
      </div>
    </Ctx.Provider>
  );
}

export function CollapsibleTrigger(props: {
  children?: JSX.Element;
  class?: string;
  as?: (props: Record<string, any>) => JSX.Element;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  [k: string]: any;
}) {
  const ctx = useCollapsible();
  const [local, rest] = splitProps(props, ['children', 'class', 'as', 'onClick']);

  const triggerProps = () => ({
    type: 'button' as const,
    'aria-expanded': ctx.open(),
    'aria-controls': ctx.contentId,
    'data-expanded': ctx.open() ? '' : undefined,
    'data-closed': ctx.open() ? undefined : '',
    'data-state': ctx.open() ? 'open' : 'closed',
    onClick: (e: MouseEvent) => {
      if (typeof local.onClick === 'function') {
        (local.onClick as (e: MouseEvent) => void)(e);
      }
      ctx.toggle();
    },
    class: local.class,
    ...rest,
  });

  return (
    <>
      {local.as
        ? local.as(triggerProps() as any)
        : (
          <button {...triggerProps()}>
            {local.children}
          </button>
        )}
    </>
  );
}

export function CollapsibleContent(props: { children?: JSX.Element; class?: string; [k: string]: any }) {
  const ctx = useCollapsible();
  const [local, rest] = splitProps(props, ['children', 'class']);
  return (
    <div
      {...rest}
      id={ctx.contentId}
      data-expanded={ctx.open() ? '' : undefined}
      data-closed={ctx.open() ? undefined : ''}
      class={cn(
        'grid transition-[grid-template-rows] duration-200 ease-out',
        ctx.open() ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
      bool:inert={!ctx.open()}
    >
      <div class={cn('overflow-hidden', local.class)}>{local.children}</div>
    </div>
  );
}
