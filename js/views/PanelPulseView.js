const PULSE_MS = 1200;

// Briefly lights up a panel's heading when a step changes what that panel shows, so the
// reader knows where to look.
export class PanelPulseView {
  #heads = new Map();    // panel name -> heading element
  #timers = new Map();

  constructor(panels = { display: 'display' }) {
    for (const [name, id] of Object.entries(panels)) {
      this.#heads.set(name, document.getElementById(id).querySelector('.panel-head'));
    }
  }

  pulse(name) {
    const head = this.#heads.get(name);
    if (!head) return;
    clearTimeout(this.#timers.get(name));
    head.classList.remove('pulse');
    void head.offsetWidth;  // restart the animation
    head.classList.add('pulse');
    this.#timers.set(name, setTimeout(() => head.classList.remove('pulse'), PULSE_MS));
  }
}
