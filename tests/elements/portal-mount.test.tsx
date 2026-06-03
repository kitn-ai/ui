import { render } from '@solidjs/testing-library';
import { ChatConfig } from '../../src/primitives/chat-config';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '../../src/ui/dropdown';

test('dropdown content portals into the configured mount node when open', () => {
  const mount = document.createElement('div');
  mount.id = 'kitn-portal';
  document.body.appendChild(mount);

  render(() => (
    <ChatConfig portalMount={mount}>
      <Dropdown open>
        <DropdownTrigger>open</DropdownTrigger>
        <DropdownContent>
          <DropdownItem>Item A</DropdownItem>
        </DropdownContent>
      </Dropdown>
    </ChatConfig>
  ));

  expect(mount.textContent).toContain('Item A');
  mount.remove();
});
