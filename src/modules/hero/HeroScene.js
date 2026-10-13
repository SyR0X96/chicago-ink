import * as THREE from 'three';
import { snoise, fbm2 } from './glsl.js';

// ---------------------------------------------------------------------------
//  Touch-Textur: die Maus zieht eine weiche Spur, die langsam verblasst –
//  die Partikel lesen sie aus und weichen aus wie Tinte, die man umrührt.
// ---------------------------------------------------------------------------
class TouchTexture {
  constructor(size = 96) {
    this.size = size;
    this.maxAge = 70;
    this.radius = size * 0.13;
    this.trail = [];
    this.last = null;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, size, size);
    this.texture = new THREE.CanvasTexture(this.canvas);
  }
  add(u, v) {
    let force = 0;
    if (this.last) {
      const d = Math.hypot(u - this.last.u, v - this.last.v);
      force = Math.min(d * 18, 1);
    }
    this.last = { u, v };
    if (force > 0.02) this.trail.push({ u, v, age: 0, force });
  }
  update() {
    const { ctx, size } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    this.trail = this.trail.filter((p) => ++p.age < this.maxAge);
    for (const p of this.trail) {
      const t = p.age / this.maxAge;
      const k = t < 0.25 ? Math.sin((t / 0.25) * Math.PI * 0.5) : Math.sin((1 - (t - 0.25) / 0.75) * Math.PI * 0.5);
      const a = k * p.force;
      const x = p.u * size;
      const y = (1 - p.v) * size;
      const g = ctx.createRadialGradient(x, y, this.radius * 0.15, x, y, this.radius);
      g.addColorStop(0, `rgba(255,255,255,${a * 0.55})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    this.texture.needsUpdate = true;
  }
}

const particleVert = /* glsl */ `
  uniform float uTime;
  uniform float uIntro;
  uniform float uScatter;
  uniform float uScale;
  uniform float uSize;
  uniform vec2 uLogo;
  uniform sampler2D uTouch;
  attribute vec3 aColor;
  attribute vec4 aRand;
  varying vec3 vColor;
  varying float vAlpha;
  ${snoise}

  vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }

  void main() {
    vec3 home = position;
    vec2 uv = home.xy / uLogo + 0.5;

    // Intro: Partikel wirbeln aus einer Tintenwolke ins Logo
    float delay = aRand.x * 0.45 + (1.0 - uv.y) * 0.15;
    float p = clamp((uIntro - delay) / 0.55, 0.0, 1.0);
    p = 1.0 - pow(1.0 - p, 3.0);
    float a0 = aRand.z * 6.2831;
    float r0 = 0.7 + aRand.y * 2.2;
    vec3 start = vec3(cos(a0) * r0, sin(a0) * r0 * 0.6, (aRand.w - 0.5) * 1.6);
    vec3 pos = mix(start, home, p);
    pos.xy = rot(pos.xy, (1.0 - p) * (2.4 + aRand.x * 2.2));

    // Atmen
    float t = uTime * 0.18;
    pos.x += snoise(vec3(home.xy * 1.1, t + aRand.x * 3.0)) * 0.012;
    pos.y += snoise(vec3(home.yx * 1.1, t + 7.0)) * 0.012;
    pos.z += snoise(vec3(home.xy * 0.7, t * 0.7)) * 0.07;

    // Maus rührt die Tinte um
    float touch = texture2D(uTouch, uv).r;
    float ang = aRand.y * 6.2831 + snoise(vec3(home.xy * 2.0, uTime * 0.4)) * 2.0;
    pos.xy += vec2(cos(ang), sin(ang)) * touch * (0.05 + aRand.z * 0.16);
    pos.z += touch * (aRand.w - 0.3) * 0.5;

    // Scroll: Logo verweht wie Tinte im Wasser
    float sc = uScatter * uScatter;
    vec3 flow = vec3(
      snoise(vec3(home.xy * 0.45, 1.3)),
      snoise(vec3(home.xy * 0.45, 4.1)) + 0.9,
      snoise(vec3(home.xy * 0.45, 8.7)) * 0.5
    );
    pos += flow * sc * (0.6 + aRand.x * 2.2);
    pos.z = min(pos.z, 1.2);
    pos.xy = mix(pos.xy, rot(pos.xy, (aRand.y - 0.5) * 1.6), sc);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = uSize * (0.55 + aRand.w * 0.9) * (1.0 + touch * 1.4 + (1.0 - p) * 0.8);
    gl_PointSize = max(size * uScale / -mv.z, 1.0);

    float twinkle = 0.82 + 0.18 * sin(uTime * (1.0 + aRand.z * 3.0) + aRand.x * 40.0);
    vColor = aColor * (1.0 + touch * 0.6);
    vAlpha = mix(0.25, 1.0, p) * twinkle * (1.0 - smoothstep(0.35, 1.0, uScatter));
  }
`;

const particleFrag = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
  }
`;

const dustVert = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  attribute vec4 aRand;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.05 + aRand.x * 0.12) + 6.0, 12.0) - 6.0;
    p.x += sin(uTime * 0.2 + aRand.y * 6.28) * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.02 + aRand.z * 0.08) * uScale / -mv.z;
    vAlpha = 0.08 + aRand.w * 0.22;
  }
`;
const dustFrag = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(0.93, 0.86, 0.74, a * a * vAlpha);
  }
`;

const smokeFrag = /* glsl */ `
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uMouse;
  uniform float uScroll;
  varying vec2 vUv;
  ${fbm2}
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    float t = uTime * 0.035;
    vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t)), fbm(p * 1.4 + vec2(5.2, -t)));
    vec2 r = vec2(fbm(p * 1.8 + q * 2.0 + vec2(1.7, 9.2) + t * 1.3), fbm(p * 1.8 + q * 2.0 + vec2(8.3, 2.8) - t));
    float f = fbm(p * 1.6 + r * 1.8 + uMouse * 0.15);
    vec3 col = mix(vec3(0.028, 0.025, 0.022), vec3(0.085, 0.072, 0.06), smoothstep(0.25, 0.85, f));
    col += vec3(0.33, 0.26, 0.17) * pow(smoothstep(0.55, 1.0, f), 2.0) * 0.45;
    float m = smoothstep(0.7, 0.0, length(p - uMouse));
    col += vec3(0.93, 0.86, 0.74) * m * m * 0.05;
    col *= 1.0 - smoothstep(0.3, 1.25, length(p * vec2(0.8, 1.0)));
    col *= 1.0 - uScroll * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const blitFrag = /* glsl */ `
  uniform sampler2D uTex;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D(uTex, vUv); }
`;

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export class HeroScene {
  constructor(canvas, { logoUrl, mobile = false, reduced = false, safeArea = null }) {
    this.canvas = canvas;
    this.safeArea = safeArea;
    this.logoUrl = logoUrl;
    this.mobile = mobile;
    this.reduced = reduced;
    this.visible = true;
    this.mouse = new THREE.Vector2(0, 0);
    this.mouseEased = new THREE.Vector2(0, 0);
    this.timer = new THREE.Timer();
    this.scroll = 0;
  }

  async init() {
    const renderer = (this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    }));
    renderer.setClearColor(0x0b0a09, 1);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.75 : 2);
    renderer.setPixelRatio(this.dpr);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.touch = new TouchTexture();
    await this.buildParticles();
    this.buildDust();
    this.buildSmoke();

    this.onResize = this.resize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.onMove = this.pointer.bind(this);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    this.resize();

    this.io = new IntersectionObserver(([e]) => (this.visible = e.isIntersecting), { threshold: 0 });
    this.io.observe(this.canvas);

    renderer.setAnimationLoop(() => this.render());
  }

  async buildParticles() {
    const img = await loadImage(this.logoUrl);
    const S = this.mobile ? 300 : 460;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, S, S);
    const data = ctx.getImageData(0, 0, S, S).data;

    const pts = [];
    let minX = S, minY = S, maxX = 0, maxY = 0;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4;
        if (data[i + 3] > 120) {
          pts.push(x, y, data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const total = pts.length / 5;
    const cap = this.mobile ? 26000 : 64000;
    const keep = Math.min(1, cap / total);

    const w = maxX - minX, h = maxY - minY;
    this.logoAspect = w / h;
    const positions = [], colors = [], rands = [];
    for (let k = 0; k < total; k++) {
      if (Math.random() > keep) continue;
      const o = k * 5;
      const nx = (pts[o] - minX) / h - this.logoAspect / 2 + (Math.random() - 0.5) / h;
      const ny = -((pts[o + 1] - minY) / h - 0.5) + (Math.random() - 0.5) / h;
      positions.push(nx, ny, (Math.random() - 0.5) * 0.02);
      // Gold/Creme leicht anheben, damit es auf Schwarz leuchtet
      colors.push(Math.min(1, pts[o + 2] * 1.05), Math.min(1, pts[o + 3] * 1.03), Math.min(1, pts[o + 4] * 0.98));
      rands.push(Math.random(), Math.random(), Math.random(), Math.random());
    }
    this.count = positions.length / 3;
    this.spacing = 1 / h; // Abstand in normierten Einheiten

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('aRand', new THREE.Float32BufferAttribute(rands, 4));

    this.pMat = new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uTime: { value: 0 },
        uIntro: { value: this.reduced ? 1.2 : 0 },
        uScatter: { value: 0 },
        uScale: { value: 1 },
        uSize: { value: 0.01 },
        uLogo: { value: new THREE.Vector2(1, 1) },
        uTouch: { value: this.touch.texture },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.pMat);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  buildDust() {
    const n = this.mobile ? 120 : 260;
    const pos = new Float32Array(n * 3);
    const rnd = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = -6 + Math.random() * 11;
      for (let k = 0; k < 4; k++) rnd[i * 4 + k] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
    this.dMat = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(geo, this.dMat);
    dust.frustumCulled = false;
    this.scene.add(dust);
  }

  buildSmoke() {
    // Rauch wird in niedriger Auflösung gerendert und hochskaliert (spart GPU)
    this.smokeRT = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
    this.smokeScene = new THREE.Scene();
    this.smokeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.sMat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: smokeFrag,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uScroll: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.smokeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.sMat));

    const blit = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: blitFrag,
        uniforms: { uTex: { value: this.smokeRT.texture } },
        depthTest: false,
        depthWrite: false,
      })
    );
    blit.renderOrder = -1;
    blit.frustumCulled = false;
    this.bgScene = new THREE.Scene();
    this.bgScene.add(blit);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const fovH = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const viewH = fovH * this.camera.position.z;
    const viewW = viewH * this.camera.aspect;
    const narrow = w < 760;
    // Logo-Höhe: groß, aber mit Platz für Headline unten
    let lh = viewH * 0.5;
    lh = Math.min(lh, (viewW * (narrow ? 0.86 : 0.7)) / this.logoAspect);
    let cy = viewH * 0.13;
    const safe = narrow && this.safeArea?.();
    if (safe && safe.bottom > safe.top) {
      // Auf dem Handy: Logo exakt in den freien Raum zwischen Header und Headline setzen
      const pxToWorld = viewH / h;
      lh = Math.min(lh, (safe.bottom - safe.top) * 0.9 * pxToWorld);
      cy = (h / 2 - (safe.top + safe.bottom) / 2) * pxToWorld;
    }
    this.points.scale.setScalar(lh);
    this.points.position.y = cy;
    this.pMat.uniforms.uLogo.value.set(this.logoAspect, 1);
    // Partikelgröße so, dass die Lücken gerade geschlossen sind
    this.pMat.uniforms.uSize.value = lh * this.spacing * (narrow ? 2.3 : 2.1);
    const scale = (h * this.dpr) / fovH;
    this.pMat.uniforms.uScale.value = scale;
    this.dMat.uniforms.uScale.value = scale;

    const f = this.mobile ? 0.3 : 0.38;
    this.smokeRT.setSize(Math.max(2, Math.round(w * f)), Math.max(2, Math.round(h * f)));
    this.sMat.uniforms.uRes.value.set(w, h);
    this.viewW = viewW;
    this.viewH = viewH;
  }

  pointer(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -((e.clientY - r.top) / r.height) * 2 + 1;
    this.mouse.set(x, y);
    if (e.clientY > r.bottom || !this.points) return;
    // Mausposition in Logo-UV umrechnen
    const wx = (x * this.viewW) / 2;
    const wy = (y * this.viewH) / 2 - this.points.position.y;
    const s = this.points.scale.x;
    const u = wx / (s * this.logoAspect) + 0.5;
    const v = wy / s + 0.5;
    this.touch.add(u, v);
  }

  setScroll(p) {
    this.scroll = p;
  }

  playIntro(gsap) {
    if (this.reduced) return;
    gsap.fromTo(this.pMat.uniforms.uIntro, { value: 0 }, { value: 1.05, duration: 3.2, ease: 'power2.out' });
  }

  render() {
    if (!this.visible) return;
    this.timer.update();
    const t = this.timer.getElapsed();
    this.touch.update();

    this.mouseEased.lerp(this.mouse, 0.05);
    const k = this.reduced ? 0.2 : 1;
    this.group.rotation.y = this.mouseEased.x * 0.28 * k;
    this.group.rotation.x = -this.mouseEased.y * 0.16 * k;
    this.camera.position.z = 10 + this.scroll * 1.5;

    this.pMat.uniforms.uTime.value = t;
    this.pMat.uniforms.uScatter.value = this.scroll;
    this.dMat.uniforms.uTime.value = t;
    this.sMat.uniforms.uTime.value = this.reduced ? 0 : t;
    this.sMat.uniforms.uScroll.value = this.scroll;
    this.sMat.uniforms.uMouse.value.set(
      this.mouseEased.x * (this.camera.aspect / 2),
      this.mouseEased.y * 0.5
    );

    const r = this.renderer;
    r.setRenderTarget(this.smokeRT);
    r.render(this.smokeScene, this.smokeCam);
    r.setRenderTarget(null);
    r.autoClear = false;
    r.clear();
    r.render(this.bgScene, this.smokeCam);
    r.render(this.scene, this.camera);
    r.autoClear = true;
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onMove);
    this.io?.disconnect();
    this.renderer.dispose();
  }
}
