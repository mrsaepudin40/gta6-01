// Keyboard + mouse input. Tracks held keys and click-to-shoot.
export const keys = {};
export const mouse = { x: 0, y: 0, down: false, clicked: false };
export function initInput() {
  addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(e.key.toLowerCase())) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  addEventListener('mousedown', (e) => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
  addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; mouse.down = false; });
}
export function pressed(code) { return !!keys[code]; }
export function consumeClick() { const c = mouse.clicked; mouse.clicked = false; return c; }
