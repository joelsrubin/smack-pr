class DotGrid {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.interaction = 0;
    // Tunables (overridable per-instance)
    this.SPACING = options.spacing ?? 7;
    this.BASE_RADIUS = options.baseRadius ?? 3.2;
    this.DOT_COLOR = options.dotColor ?? "#B5D4F4";
    this.INFLUENCE = options.influence ?? 100;
    this.STRENGTH = options.strength ?? 0.2;
    this.EASING = options.easing ?? 0.22;
    this.DPR = Math.max(1, window.devicePixelRatio || 1);

    this.dots = [];
    this.mouse = { x: -9999, y: -9999, active: false };

    this._resize = this._resize.bind(this);
    this._draw = this._draw.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onLeave = this._onLeave.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this.canvas.addEventListener("mousemove", this._onMove);
    this.canvas.addEventListener("mouseleave", this._onLeave);
    this.canvas.addEventListener("touchmove", this._onTouchMove, {
      passive: false,
    });
    this.canvas.addEventListener("touchend", this._onTouchEnd);
    window.addEventListener("resize", this._resize);

    this._resize();
    requestAnimationFrame(this._draw);
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * this.DPR);
    this.canvas.height = Math.floor(rect.height * this.DPR);
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this._buildDots(rect.width, rect.height);
  }

  _buildDots(w, h) {
    this.dots = [];
    const cols = Math.floor(w / this.SPACING);
    const rows = Math.floor(h / this.SPACING);
    const offsetX = (w - (cols - 1) * this.SPACING) / 2;
    const offsetY = (h - (rows - 1) * this.SPACING) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * this.SPACING;
        const y = offsetY + r * this.SPACING;
        this.dots.push({ ox: x, oy: y, x: x, y: y, r: this.BASE_RADIUS });
      }
    }
  }

  _draw() {
    const rect = this.canvas.getBoundingClientRect();

    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.ctx.fillStyle = this.DOT_COLOR;
    const targetInteraction = this.mouse.active ? 1 : 0;
    this.interaction += (targetInteraction - this.interaction) * 0.08;
    const infl2 = this.INFLUENCE * this.INFLUENCE;

    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      let tx = d.ox,
        ty = d.oy,
        tr = this.BASE_RADIUS;

      if (this.interaction > 0.001) {
        const dx = d.ox - this.mouse.x;
        const dy = d.oy - this.mouse.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < infl2) {
          const dist = Math.sqrt(dist2) || 0.0001;

          const falloff = 1 - dist / this.INFLUENCE;
          const eased = falloff * falloff * this.interaction;

          // radius swell
          tr = this.BASE_RADIUS + eased * 5.5 * this.STRENGTH;

          // magnify / bulge effect
          const push = eased * 12 * this.STRENGTH;

          tx = d.ox + (dx / dist) * push;
          ty = d.oy + (dy / dist) * push;
        }
      }

      d.x += (tx - d.x) * this.EASING;
      d.y += (ty - d.y) * this.EASING;
      d.r += (tr - d.r) * this.EASING;

      this.ctx.beginPath();
      this.ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      this.ctx.fill();
    }

    requestAnimationFrame(this._draw);
  }

  _onMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.active = true;
  }

  _onLeave() {
    this.mouse.active = false;
  }

  _onTouchMove(e) {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.touches[0].clientX - rect.left;
      this.mouse.y = e.touches[0].clientY - rect.top;
      this.mouse.active = true;
      e.preventDefault();
    }
  }

  _onTouchEnd() {
    this.mouse.active = false;
  }
}

// --- Instantiate one per canvas ---
// const heroCanvas = document.getElementById("hero-canvas");
const headerCanvas = document.getElementById("dot-canvas-header");
const canvas = document.getElementById("dot-canvas");
const canvas2 = document.getElementById("dot-canvas-2");
const canvas3 = document.getElementById("dot-canvas-3");

const grids = [
  new DotGrid(headerCanvas),
  new DotGrid(canvas),
  new DotGrid(canvas2),
  new DotGrid(canvas3),
];

document.fonts.ready.then(() => {
  requestAnimationFrame(() => {
    grids.forEach((grid) => grid._resize());

    setTimeout(() => {
      grids.forEach((grid) => grid._resize());
    }, 100);
  });
});
