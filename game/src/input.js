// Keyboard + mouse input, with edge-triggered "pressed" keys.
export const input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 0, y: 0, down: false, clicked: false },
  attach(canvas) {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  down(...codes) { return codes.some((c) => this.keys.has(c)); },
  hit(...codes) { return codes.some((c) => this.pressed.has(c)); },
  endFrame() { this.pressed.clear(); this.mouse.clicked = false; },
};

// Movement vector from WASD/arrows, normalized.
export function moveVector(inp) {
  let x = 0, y = 0;
  if (inp.down('KeyA', 'ArrowLeft')) x -= 1;
  if (inp.down('KeyD', 'ArrowRight')) x += 1;
  if (inp.down('KeyW', 'ArrowUp')) y -= 1;
  if (inp.down('KeyS', 'ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
  return { x, y };
}
