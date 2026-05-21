class DotGrid {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.interaction = 0;
    this.ready = false;

    // -----------------------------
    // Tunables
    // -----------------------------

    this.SPACING = options.spacing ?? 7;

    this.BASE_RADIUS = options.baseRadius ?? 2.8;

    this.INFLUENCE = options.influence ?? 120;

    this.STRENGTH = options.strength ?? 0.5;

    this.EASING = options.easing ?? 0.16;

    this.GRADIENT = options.gradient ?? "radial";

    this.NOISE = options.noise ?? 0.04;

    this.BRIGHTNESS = options.brightness ?? 1;

    this.HOVER_BRIGHTNESS = options.hoverBrightness ?? 12;

    this.DPR = Math.max(1, window.devicePixelRatio || 1);

    this.dots = [];

    this.mouse = {
      x: -9999,
      y: -9999,
      active: false,
    };

    // -----------------------------
    // Bindings
    // -----------------------------

    this._resize = this._resize.bind(this);
    this._draw = this._draw.bind(this);

    this._onMove = this._onMove.bind(this);
    this._onLeave = this._onLeave.bind(this);

    this._onTouchMove = this._onTouchMove.bind(this);

    this._onTouchEnd = this._onTouchEnd.bind(this);

    // -----------------------------
    // Events
    // -----------------------------

    this.canvas.addEventListener("mousemove", this._onMove);

    this.canvas.addEventListener("mouseleave", this._onLeave);

    this.canvas.addEventListener("touchmove", this._onTouchMove, {
      passive: false,
    });

    this.canvas.addEventListener("touchend", this._onTouchEnd);

    window.addEventListener("resize", this._resize);

    // -----------------------------
    // Init
    // -----------------------------

    this._resize();

    requestAnimationFrame(this._draw);
  }

  // -----------------------------
  // Resize
  // -----------------------------

  _resize() {
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = Math.floor(rect.width * this.DPR);

    this.canvas.height = Math.floor(rect.height * this.DPR);

    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);

    this._buildDots(rect.width, rect.height);
  }

  // -----------------------------
  // Gradient Functions
  // -----------------------------

  _getGradient(nx, ny) {
    // Flat
    if (this.GRADIENT === "flat") {
      return 0.5;
    }

    // Linear
    if (this.GRADIENT === "linear") {
      return 0.2 + nx * 0.6;
    }

    // Vertical
    if (this.GRADIENT === "vertical") {
      return ny;
    }

    // Radial
    if (this.GRADIENT === "radial") {
      const cx = 0.72;
      const cy = 0.48;

      const dx = nx - cx;
      const dy = ny - cy;

      const dist = Math.sqrt(dx * dx + dy * dy);

      return 1 - Math.min(dist * 1.7, 1);
    }

    // Blob
    if (this.GRADIENT === "blob") {
      const blob1 =
        1 - Math.min(Math.sqrt((nx - 0.25) ** 2 + (ny - 0.45) ** 2) * 2, 1);

      const blob2 =
        1 - Math.min(Math.sqrt((nx - 0.75) ** 2 + (ny - 0.55) ** 2) * 2, 1);

      return blob1 * 0.5 + blob2;
    }

    // Organic
    if (this.GRADIENT === "organic") {
      return nx * 0.5 + Math.sin(nx * 6) * 0.08 + Math.cos(ny * 8) * 0.08;
    }

    return nx;
  }

  // -----------------------------
  // Build Dots
  // -----------------------------

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

        const nx = x / w;
        const ny = y / h;

        let gradient = this._getGradient(nx, ny);

        // subtle noise
        gradient +=
          Math.sin(nx * 10) * this.NOISE + Math.cos(ny * 12) * this.NOISE;

        gradient = Math.max(0, Math.min(1, gradient));

        // size tied to gradient
        const sizeScale = 0.8 + gradient * 0.7;

        this.dots.push({
          ox: x,
          oy: y,

          x,
          y,

          r: this.BASE_RADIUS * sizeScale,

          baseR: this.BASE_RADIUS * sizeScale,

          gradient,
        });
      }
    }
  }

  // -----------------------------
  // Draw
  // -----------------------------

  _draw() {
    const rect = this.canvas.getBoundingClientRect();

    this.ctx.clearRect(0, 0, rect.width, rect.height);

    const targetInteraction = this.mouse.active ? 1 : 0;

    this.interaction += (targetInteraction - this.interaction) * 0.08;

    const infl2 = this.INFLUENCE * this.INFLUENCE;

    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];

      let tx = d.ox;
      let ty = d.oy;

      let tr = d.baseR;

      let glow = 0;

      // -----------------------------
      // Hover Interaction
      // -----------------------------

      if (this.interaction > 0.001) {
        const dx = d.ox - this.mouse.x;

        const dy = d.oy - this.mouse.y;

        const dist2 = dx * dx + dy * dy;

        if (dist2 < infl2) {
          const dist = Math.sqrt(dist2) || 0.0001;

          const falloff = 1 - dist / this.INFLUENCE;

          // smoother lens falloff
          const eased = Math.pow(falloff, 2.1) * this.interaction;

          glow = eased;

          // -----------------------------
          // Bulge Radius
          // -----------------------------

          tr = d.baseR * (1 + eased * 1.1 * this.STRENGTH);

          // -----------------------------
          // Bulge Displacement
          // -----------------------------

          const bulge = eased * 8 * this.STRENGTH;

          // push outward
          tx = d.ox + (dx / dist) * bulge;

          ty = d.oy + (dy / dist) * bulge;
        }
      }

      // -----------------------------
      // Easing
      // -----------------------------

      d.x += (tx - d.x) * this.EASING;

      d.y += (ty - d.y) * this.EASING;

      d.r += (tr - d.r) * this.EASING;

      // -----------------------------
      // Brand Color System
      // base: #B5D4F4
      // -----------------------------

      const hue = 210 - d.gradient * 4 + glow * 3;

      const saturation = 75 - d.gradient * 8 + glow * 10;

      const lightness =
        (72 + d.gradient * 10 + glow * this.HOVER_BRIGHTNESS) * this.BRIGHTNESS;

      this.ctx.fillStyle = `
          hsl(
            ${hue},
            ${saturation}%,
            ${lightness}%
          )
        `;

      // -----------------------------
      // Draw Dot
      // -----------------------------

      this.ctx.beginPath();

      this.ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);

      this.ctx.fill();
    }

    requestAnimationFrame(this._draw);
  }

  // -----------------------------
  // Mouse
  // -----------------------------

  _onMove(e) {
    if (!this.ready) return;

    const rect = this.canvas.getBoundingClientRect();

    this.mouse.x = e.clientX - rect.left;

    this.mouse.y = e.clientY - rect.top;

    this.mouse.active = true;
  }

  _onLeave() {
    this.mouse.active = false;
  }

  // -----------------------------
  // Touch
  // -----------------------------

  _onTouchMove(e) {
    if (!this.ready) return;

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

// ------------------------------------
// Canvases
// ------------------------------------

const headerCanvas = document.getElementById("dot-canvas-header");

const canvas = document.getElementById("dot-canvas");

const canvas2 = document.getElementById("dot-canvas-2");

const canvas3 = document.getElementById("dot-canvas-3");

// ------------------------------------
// Instances
// ------------------------------------

const grids = [
  // HERO
  new DotGrid(headerCanvas, {
    spacing: 8,
    baseRadius: 2.4,

    influence: 150,
    strength: 0.8,

    gradient: "flat",

    brightness: 1,
    noise: 0,

    hoverBrightness: 16,
  }),

  // ABOUT
  new DotGrid(canvas, {
    spacing: 7,
    baseRadius: 2.8,

    influence: 120,
    strength: 0.55,

    gradient: "linear",

    brightness: 1,
    noise: 0.03,
  }),

  // SERVICES
  new DotGrid(canvas2, {
    spacing: 8,
    baseRadius: 2.6,

    influence: 140,
    strength: 0.7,

    gradient: "flat",

    brightness: 1,
    noise: 0,

    hoverBrightness: 15,
  }),

  // CONTACT
  new DotGrid(canvas3, {
    spacing: 7,
    baseRadius: 2.8,

    influence: 120,
    strength: 0.55,

    gradient: "linear",

    brightness: 1,
    noise: 0.03,
  }),
];

// ------------------------------------
// Font/Layout Recalibration
// ------------------------------------

document.fonts.ready.then(() => {
  requestAnimationFrame(() => {
    grids.forEach((grid) => {
      grid._resize();
      grid.ready = true;
    });

    // safari/layout safety pass
    setTimeout(() => {
      grids.forEach((grid) => {
        grid._resize();
      });
    }, 100);
  });
});
