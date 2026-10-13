import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { buildBodyGeometry, makeBody, zonesFor, zoneAt } from './body.js';
import { formats, renderPlaceholder, renderText, loadImageFile, processUpload } from './stencil.js';
import { waLink, mailLink } from '../../config.js';

const SKINS = [
  { id: 'hell', color: '#f0d0b6' },
  { id: 'hell-mittel', color: '#dcae8c' },
  { id: 'mittel', color: '#c08a63' },
  { id: 'dunkel', color: '#8a5a3c' },
  { id: 'sehr-dunkel', color: '#5b3a28' },
];
// Maximale Projektionstiefe je Körperteil (verhindert, dass die Vorlage auf Nachbarteile springt)
const DEPTH = { Rippen: 14, Unterarm: 8, Hand: 5, Oberarm: 11, Schulter: 12, Oberschenkel: 17, Wade: 11, Knöchel: 7, Fuß: 7, Hals: 11, Nacken: 11, Kopf: 16 };
const fmt = (n) => (Math.round(n * 2) / 2).toLocaleString('de-DE');
const sizeCompare = (cm) =>
  cm < 4 ? '≈ so groß wie eine Münze' :
  cm < 7 ? '≈ so groß wie eine Streichholzschachtel' :
  cm < 10 ? '≈ so groß wie eine Kreditkarte' :
  cm < 15 ? '≈ so groß wie eine Handfläche' :
  cm < 22 ? '≈ so groß wie ein Smartphone' :
  cm < 32 ? '≈ DIN-A5-Format' : '≈ großflächiges Projekt';

export class Configurator {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector('.cfg__stage');
    this.canvas = root.querySelector('.cfg__canvas');
    this.q = (s) => root.querySelector(s);
    this.qa = (s) => [...root.querySelectorAll(s)];
    this.mobile = matchMedia('(max-width: 760px)').matches;
    this.state = {
      kind: 'motif',
      idea: '',
      format: 'hoch',
      text: '',
      upload: null,
      uploadMode: 'original',
      sex: 'm',
      build: 'normal',
      skin: 1,
      size: 12,
      rotation: 0,
      mirror: false,
      side: 1,
      zoneId: 'forearm',
      zone: 'Unterarm links',
      step: 0,
      id: `CI-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    this.point = null;
    this.normal = null;
    this.interacted = false;
  }

  async init() {
    this.buildUI();
    try {
      this.initThree();
    } catch {
      this.q('[data-cfg-loading]').textContent = '3D wird von deinem Browser leider nicht unterstützt – schick uns deine Idee einfach per WhatsApp.';
      return;
    }
    await this.loadBody();
    await this.refreshTexture();
    this.placeDecalAtZone('forearm');
    // Startansicht: Oberkörper schräg von vorne, Vorlage gut sichtbar
    this.camera.position.set(130, 140, 215);
    this.controls.target.set(12, 110, 0);
    this.q('[data-cfg-loading]').classList.add('is-done');
    this.ready = true;
  }

  // -------------------------------------------------------------------------
  //  Körper
  // -------------------------------------------------------------------------
  async loadBody() {
    const { sex, build } = this.state;
    this.bodyDef = makeBody(sex, build);
    this.zones = zonesFor(this.bodyDef);
    const geo = await buildBodyGeometry(this.mobile ? 1.15 : 1.0, sex, build);
    if (!this.body) {
      this.body = new THREE.Mesh(geo, this.bodyMat);
      this.scene.add(this.body);
    } else {
      this.body.geometry.dispose();
      this.body.geometry = geo;
    }
  }

  async changeBody() {
    const loading = this.q('[data-cfg-loading]');
    loading.innerHTML = '<span class="spinner"></span>Körper wird angepasst …';
    loading.classList.remove('is-done');
    const old = this.point && { p: this.point.clone(), n: this.normal.clone() };
    await this.loadBody();
    this.renderZoneChips();
    // Vorlage auf den neuen Körper übertragen
    let placed = false;
    if (old && !this.state.zoneId) {
      this.raycaster.set(old.p.clone().addScaledVector(old.n, 25), old.n.clone().negate());
      const h = this.raycaster.intersectObject(this.body, false)[0];
      if (h) {
        this.setPoint(h.point.clone(), h.face.normal.clone());
        placed = true;
      }
    }
    if (!placed) this.placeDecalAtZone(this.state.zoneId || 'forearm');
    loading.classList.add('is-done');
  }

  // -------------------------------------------------------------------------
  //  Three.js
  // -------------------------------------------------------------------------
  initThree() {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.outputColorSpace = THREE.SRGBColorSpace;

    const scene = (this.scene = new THREE.Scene());
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;

    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 3000);
    this.camera.position.set(90, 125, 300);

    scene.add(new THREE.HemisphereLight(0xfff1de, 0x1a1410, 0.55));
    const key = new THREE.DirectionalLight(0xffe6c8, 1.9);
    key.position.set(80, 220, 180);
    scene.add(key);
    const rim1 = new THREE.DirectionalLight(0xeeddbf, 3.4);
    rim1.position.set(-180, 140, -140);
    scene.add(rim1);
    const rim2 = new THREE.DirectionalLight(0xc9a86a, 2.2);
    rim2.position.set(200, 90, -120);
    scene.add(rim2);
    const fill = new THREE.DirectionalLight(0xa8b4ff, 0.35);
    fill.position.set(-120, 40, 160);
    scene.add(fill);

    this.bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(SKINS[this.state.skin].color),
      roughness: 0.58,
      metalness: 0,
      sheen: 0.55,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color('#ffd9c2'),
      clearcoat: 0.06,
      clearcoatRoughness: 0.7,
    });

    // Boden: weicher Schatten + feiner Ring
    const floorMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; void main(){
        float d = length(vUv - 0.5) * 2.0;
        float shadow = smoothstep(0.42, 0.0, d) * 0.55;
        float ring = smoothstep(0.012, 0.0, abs(d - 0.78)) * 0.35 + smoothstep(0.006, 0.0, abs(d - 0.92)) * 0.18;
        gl_FragColor = vec4(mix(vec3(0.0), vec3(0.93,0.86,0.74), ring / max(ring + shadow, 0.001)), shadow + ring);
      }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.1;
    scene.add(floor);

    this.decalMat = new THREE.MeshStandardMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      roughness: 0.55,
      metalness: 0,
      opacity: 0.94,
      alphaTest: 0.01,
    });
    this.decal = new THREE.Mesh(new THREE.BufferGeometry(), this.decalMat);
    this.decal.renderOrder = 2;
    scene.add(this.decal);

    const controls = (this.controls = new OrbitControls(this.camera, this.canvas));
    controls.target.set(0, 95, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 40;
    controls.maxDistance = 420;
    controls.rotateSpeed = 0.7;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.addEventListener('start', () => this.stopAutoRotate());
    // Touch: senkrechtes Wischen scrollt die Seite, seitlich dreht, Tippen platziert
    if (matchMedia('(pointer: coarse)').matches) {
      this.canvas.style.touchAction = 'pan-y';
      const hint = this.q('[data-cfg-hint]');
      if (hint) hint.textContent = 'Tippen = Vorlage platzieren · seitlich wischen = drehen';
    }

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.helper = new THREE.Object3D();
    this.bindPointer();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.stage);
    this.resize();

    new IntersectionObserver(([e]) => {
      r.setAnimationLoop(e.isIntersecting ? () => this.render() : null);
    }).observe(this.stage);
  }

  stopAutoRotate() {
    this.controls.autoRotate = false;
    if (!this.interacted) {
      this.interacted = true;
      this.q('[data-cfg-hint]')?.classList.add('is-faded');
    }
  }

  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // -------------------------------------------------------------------------
  //  Zeiger: Tippen platziert, Ziehen an der Vorlage verschiebt, sonst Orbit
  // -------------------------------------------------------------------------
  hit(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const h = this.body && this.raycaster.intersectObject(this.body, false)[0];
    if (!h) return null;
    return { point: h.point.clone(), normal: h.face.normal.clone() };
  }

  overDecal(h) {
    return h && this.point && h.point.distanceTo(this.point) < Math.max(3, this.state.size * 0.45);
  }

  bindPointer() {
    let down = null;
    this.dragging = false;
    // Capture-Phase am Eltern-Element: kommt vor OrbitControls an
    this.stage.addEventListener(
      'pointerdown',
      (e) => {
        if (e.target !== this.canvas || !this.ready) return;
        down = { x: e.clientX, y: e.clientY, t: performance.now() };
        if (e.pointerType === 'mouse' && this.overDecal(this.hit(e))) {
          this.dragging = true;
          this.stopAutoRotate();
          this.canvas.setPointerCapture(e.pointerId);
          this.stage.classList.add('is-dragging');
          e.stopPropagation();
        }
      },
      true
    );
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) {
        if (this.ready && e.pointerType === 'mouse' && !e.buttons) this.stage.classList.toggle('is-over-decal', !!this.overDecal(this.hit(e)));
        return;
      }
      const h = this.hit(e);
      if (h) this.setPoint(h.point, h.normal);
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (this.dragging) {
        this.dragging = false;
        this.stage.classList.remove('is-dragging');
        return;
      }
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 6 && performance.now() - down.t < 450) {
        const h = this.hit(e);
        if (h) {
          this.stopAutoRotate();
          this.setPoint(h.point, h.normal);
        }
      }
      down = null;
    });
    this.canvas.addEventListener('pointercancel', () => {
      this.dragging = false;
      down = null;
    });
  }

  setPoint(point, normal, keepZoneId = false) {
    this.point = point;
    this.normal = normal;
    if (!keepZoneId) this.state.zoneId = null;
    this.state.zone = zoneAt(point, this.bodyDef);
    this.state.side = point.x >= 0 ? 1 : -1;
    this.q('[data-cfg-zone]').textContent = this.state.zone;
    this.highlightZone();
    this.scheduleDecal();
  }

  scheduleDecal() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      this.updateDecal();
    });
  }

  dims() {
    const a = this.texCanvas ? this.texCanvas.width / this.texCanvas.height : 1;
    const s = this.state.size;
    return a >= 1 ? { w: s, h: s / a } : { w: s * a, h: s };
  }

  updateDecal() {
    const { w, h } = this.dims();
    this.q('[data-cfg-size]').textContent = `${fmt(w)} × ${fmt(h)} cm`;
    if (!this.point || !this.body || !this.texCanvas) return;
    const part = this.state.zone.split(' ')[0];
    const depth = Math.min(Math.max(w, h) * 0.9, DEPTH[part] ?? 26);

    const helper = this.helper;
    helper.position.copy(this.point);
    helper.up.set(0, 1, 0);
    if (Math.abs(this.normal.y) > 0.92) helper.up.set(0, 0, this.normal.y > 0 ? -1 : 1);
    helper.lookAt(this.point.clone().add(this.normal));
    helper.rotateZ(THREE.MathUtils.degToRad(-this.state.rotation));

    const raw = new DecalGeometry(this.body, this.point, helper.rotation, new THREE.Vector3(w, h, depth));
    // Rückseiten und streifende Flächen entfernen (sonst gespiegelte Kopie auf der Rückseite)
    const pos = raw.attributes.position, nor = raw.attributes.normal, uv = raw.attributes.uv;
    const keepP = [], keepN = [], keepU = [];
    const n = this.normal;
    for (let i = 0; i < pos.count; i += 3) {
      const d = (nor.getX(i) + nor.getX(i + 1) + nor.getX(i + 2)) * n.x + (nor.getY(i) + nor.getY(i + 1) + nor.getY(i + 2)) * n.y + (nor.getZ(i) + nor.getZ(i + 1) + nor.getZ(i + 2)) * n.z;
      if (d / 3 < 0.12) continue;
      for (let k = 0; k < 3; k++) {
        keepP.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
        keepN.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k));
        keepU.push(uv.getX(i + k), uv.getY(i + k));
      }
    }
    raw.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(keepP, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(keepN, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(keepU, 2));
    this.decal.geometry.dispose();
    this.decal.geometry = geo;
  }

  zone(id) {
    const z = this.zones.find((x) => x.id === id);
    if (!z) return null;
    const s = this.state.side;
    const target = z.target.clone();
    const dir = z.dir.clone();
    const cam = z.cam.clone();
    target.x *= s;
    dir.x *= s;
    cam.x *= s;
    return { target, dir, cam };
  }

  placeDecalAtZone(id) {
    const z = this.zone(id);
    if (!z || !this.body) return;
    this.raycaster.set(z.target.clone().addScaledVector(z.dir, 60), z.dir.clone().negate());
    const h = this.raycaster.intersectObject(this.body, false)[0];
    if (h) {
      this.state.zoneId = id;
      this.setPoint(h.point.clone(), h.face.normal.clone(), true);
    }
  }

  placeAtZone(id) {
    this.placeDecalAtZone(id);
    const z = this.zone(id);
    if (z) this.flyTo(z.cam, z.target);
  }

  flyTo(pos, target) {
    this.controls.autoRotate = false;
    gsap.to(this.camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: 1.1, ease: 'power3.inOut' });
    gsap.to(this.controls.target, { x: target.x, y: target.y, z: target.z, duration: 1.1, ease: 'power3.inOut' });
  }

  view(kind) {
    this.stopAutoRotate();
    const t = new THREE.Vector3(0, this.bodyDef.J.height * 0.5, 0);
    if (kind === 'front') this.flyTo(new THREE.Vector3(55, t.y + 10, 340), t);
    if (kind === 'back') this.flyTo(new THREE.Vector3(-55, t.y + 10, -340), t);
    if (kind === 'zoom' && this.point) {
      const dist = Math.max(45, this.state.size * 3.2);
      this.flyTo(this.point.clone().addScaledVector(this.normal, dist).add(new THREE.Vector3(0, dist * 0.08, 0)), this.point.clone());
    }
  }

  // -------------------------------------------------------------------------
  //  Textur
  // -------------------------------------------------------------------------
  async refreshTexture() {
    const s = this.state;
    let c;
    if (s.kind === 'text') c = await renderText(s.text);
    else if (s.kind === 'upload' && s.upload) c = processUpload(s.upload, s.uploadMode);
    else c = await renderPlaceholder(s.format, s.kind === 'motif' ? s.idea : '');

    if (s.mirror && s.kind !== 'motif') {
      const m = document.createElement('canvas');
      m.width = c.width;
      m.height = c.height;
      const ctx = m.getContext('2d');
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0);
      c = m;
    }
    this.texCanvas = c;
    if (!this.decalMat) return;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.decalMat.map?.dispose();
    this.decalMat.map = tex;
    this.decalMat.needsUpdate = true;
    this.updateDecal();
  }

  // -------------------------------------------------------------------------
  //  UI
  // -------------------------------------------------------------------------
  buildUI() {
    const s = this.state;
    const seg = (sel, key, after) =>
      this.qa(`${sel} button`).forEach((b) =>
        b.addEventListener('click', () => {
          this.qa(`${sel} button`).forEach((x) => x.classList.toggle('is-active', x === b));
          s[key] = b.dataset.v;
          after?.();
        })
      );

    // Art der Idee
    this.qa('[data-kind]').forEach((b) =>
      b.addEventListener('click', () => {
        s.kind = b.dataset.kind;
        this.qa('[data-kind]').forEach((x) => x.classList.toggle('is-active', x === b));
        this.qa('[data-kind-pane]').forEach((p) => p.classList.toggle('is-active', p.dataset.kindPane === s.kind));
        this.q('[data-mirror]').hidden = s.kind === 'motif';
        this.refreshTexture();
      })
    );

    // Motiv: Beschreibung + Format
    let it;
    this.q('[data-idea]').addEventListener('input', (e) => {
      s.idea = e.target.value;
      clearTimeout(it);
      it = setTimeout(() => this.refreshTexture(), 250);
    });
    const fmtRow = this.q('[data-format]');
    fmtRow.innerHTML = formats.map((f) => `<button data-v="${f.id}" class="${f.id === s.format ? 'is-active' : ''}">${f.label}</button>`).join('');
    seg('[data-format]', 'format', () => this.refreshTexture());

    // Text
    let tt;
    this.q('[data-text-input]').addEventListener('input', (e) => {
      s.text = e.target.value;
      clearTimeout(tt);
      tt = setTimeout(() => this.refreshTexture(), 200);
    });

    // Upload
    this.q('[data-upload]').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      s.upload = await loadImageFile(f);
      this.q('[data-upload-mode]').hidden = false;
      this.q('.upload strong').textContent = f.name.length > 28 ? f.name.slice(0, 26) + '…' : f.name;
      this.refreshTexture();
    });
    seg('[data-upload-mode]', 'uploadMode', () => this.refreshTexture());

    // Körper
    seg('[data-sex]', 'sex', () => this.ready && this.changeBody());
    seg('[data-build]', 'build', () => this.ready && this.changeBody());
    const skin = this.q('[data-skin-row]');
    skin.innerHTML = SKINS.map((k, i) => `<button class="skin${i === s.skin ? ' is-active' : ''}" style="--c:${k.color}" data-skin="${i}" aria-label="Hautton ${k.id}"></button>`).join('');
    skin.addEventListener('click', (e) => {
      const b = e.target.closest('[data-skin]');
      if (!b) return;
      s.skin = +b.dataset.skin;
      this.qa('[data-skin]').forEach((x) => x.classList.toggle('is-active', x === b));
      const c = new THREE.Color(SKINS[s.skin].color);
      gsap.to(this.bodyMat.color, { r: c.r, g: c.g, b: c.b, duration: 0.5 });
    });

    // Zonen
    this.renderZoneChips();
    this.q('[data-zone-grid]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-zone]');
      if (!b || !this.ready) return;
      this.stopAutoRotate();
      this.placeAtZone(b.dataset.zone);
    });

    // Größe / Drehung
    const size = this.q('[data-size]');
    size.addEventListener('input', () => {
      s.size = parseFloat(size.value);
      this.q('[data-size-out]').textContent = `${fmt(s.size)} cm`;
      this.q('[data-size-compare]').textContent = sizeCompare(s.size);
      this.scheduleDecal();
    });
    const rot = this.q('[data-rot]');
    rot.addEventListener('input', () => {
      s.rotation = parseFloat(rot.value);
      this.q('[data-rot-out]').textContent = `${s.rotation}°`;
      this.scheduleDecal();
    });
    this.q('[data-mirror]').hidden = true;
    this.q('[data-mirror]').addEventListener('click', () => {
      s.mirror = !s.mirror;
      this.q('[data-mirror]').classList.toggle('is-active', s.mirror);
      this.refreshTexture();
    });
    this.q('[data-other-side]').addEventListener('click', () => {
      if (!this.point || !this.ready) return;
      this.stopAutoRotate();
      if (s.zoneId) {
        s.side *= -1;
        this.placeAtZone(s.zoneId);
        return;
      }
      const p = this.point.clone();
      p.x *= -1;
      const n = this.normal.clone();
      n.x *= -1;
      this.raycaster.set(p.clone().addScaledVector(n, 30), n.clone().negate());
      const h = this.raycaster.intersectObject(this.body, false)[0];
      if (h) this.setPoint(h.point.clone(), h.face.normal.clone());
      const cam = this.camera.position.clone();
      cam.x *= -1;
      const tg = this.controls.target.clone();
      tg.x *= -1;
      this.flyTo(cam, tg);
    });

    // Ansichten
    this.qa('[data-view]').forEach((b) => b.addEventListener('click', () => this.ready && this.view(b.dataset.view)));

    // Schritte
    this.qa('[data-step]').forEach((b) => b.addEventListener('click', () => this.go(+b.dataset.step)));
    this.q('[data-next]').addEventListener('click', () => this.go(Math.min(3, s.step + 1)));
    this.q('[data-prev]').addEventListener('click', () => this.go(Math.max(0, s.step - 1)));

    // Senden
    this.q('[data-send-wa]').addEventListener('click', () => {
      if (!this.checkAge()) return;
      window.open(waLink(this.message()), '_blank', 'noopener');
    });
    this.q('[data-send-mail]').addEventListener('click', (e) => {
      if (!this.checkAge()) {
        e.preventDefault();
        return;
      }
      e.currentTarget.href = mailLink(`Tattoo-Anfrage ${s.id}`, this.message());
    });
    this.q('[data-share]').addEventListener('click', () => this.share());
    this.q('[data-f-age]').addEventListener('change', (e) => e.target.closest('.check').classList.remove('is-error'));
    this.go(0);
  }

  renderZoneChips() {
    const body = this.bodyDef || makeBody(this.state.sex, this.state.build);
    this.q('[data-zone-grid]').innerHTML = zonesFor(body)
      .map((z) => `<button class="chip" data-zone="${z.id}">${z.label}</button>`)
      .join('');
    this.highlightZone();
  }

  go(step) {
    const prev = this.state.step;
    this.state.step = step;
    this.qa('[data-step]').forEach((b) => b.classList.toggle('is-active', +b.dataset.step === step));
    this.qa('[data-pane]').forEach((p) => p.classList.toggle('is-active', +p.dataset.pane === step));
    this.q('[data-prev]').style.visibility = step === 0 ? 'hidden' : 'visible';
    this.q('[data-next]').style.display = step === 3 ? 'none' : '';
    if (!this.ready || prev === step) {
      if (step === 3) this.renderSummary();
      return;
    }
    if (step === 1) this.view('front');
    if (step === 2) this.view('zoom');
    if (step === 3) this.renderSummary();
  }

  highlightZone() {
    const id = this.state.zoneId;
    this.qa('[data-zone]').forEach((b) => b.classList.toggle('is-active', b.dataset.zone === id));
  }

  ideaLabel() {
    const s = this.state;
    if (s.kind === 'text') return `Schriftzug „${s.text.trim() || '…'}“`;
    if (s.kind === 'upload') return s.upload ? 'Eigenes Bild (schicke ich mit)' : 'Eigenes Bild';
    const f = formats.find((x) => x.id === s.format)?.label;
    return s.idea.trim() ? `Motiv „${s.idea.trim()}“ (${f})` : `Motiv (${f}) – Details per Nachricht`;
  }

  values() {
    const v = (sel) => this.q(sel).value.trim();
    return {
      name: v('[data-f-name]'),
      style: v('[data-f-style]') || 'Weiß ich noch nicht',
      artist: v('[data-f-artist]') || 'Empfehlt mir jemanden',
      when: v('[data-f-when]'),
      first: v('[data-f-first]'),
      note: v('[data-f-note]'),
    };
  }

  message() {
    const s = this.state;
    const f = this.values();
    const { w, h } = this.dims();
    const lines = [
      'Hi Chicago Ink! 👋',
      `Ich habe meine Tattoo-Idee im 3D-Konfigurator geplant (Anfrage #${s.id}):`,
      '',
      `• Idee: ${this.ideaLabel()}`,
      `• Stelle: ${s.zone}`,
      `• Größe: ca. ${fmt(w)} × ${fmt(h)} cm`,
      `• Stil-Wunsch: ${f.style}`,
      `• Wunsch-Artist: ${f.artist}`,
      `• Zeitraum: ${f.when}`,
      `• Erstes Tattoo: ${f.first}`,
    ];
    if (f.note) lines.push(`• Notiz: ${f.note}`);
    lines.push('');
    if (f.name) lines.push(`Name: ${f.name}`);
    lines.push(s.kind === 'upload' ? 'Mein Referenzbild und die Vorschau schicke ich gleich hinterher.' : 'Das Vorschau-Bild schicke ich gleich hinterher.');
    return lines.join('\n');
  }

  renderSummary() {
    const s = this.state;
    const { w, h } = this.dims();
    let img = '';
    if (this.ready) {
      this.render();
      img = `<img src="${this.canvas.toDataURL('image/jpeg', 0.82)}" alt="Vorschau deiner Tattoo-Platzierung" />`;
    }
    this.q('[data-summary]').innerHTML = `${img}<dl>
      <div><dt>Anfrage</dt><dd>#${s.id}</dd></div>
      <div><dt>Idee</dt><dd>${escapeHTML(this.ideaLabel())}</dd></div>
      <div><dt>Stelle</dt><dd>${s.zone}</dd></div>
      <div><dt>Größe</dt><dd>ca. ${fmt(w)} × ${fmt(h)} cm</dd></div>
    </dl>`;
  }

  checkAge() {
    const box = this.q('[data-f-age]');
    if (box.checked) return true;
    const wrap = box.closest('.check');
    wrap.classList.add('is-error');
    gsap.fromTo(wrap, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    return false;
  }

  // Vorschau-Bild: 3D-Ansicht + Eckdaten, zum Anhängen in WhatsApp
  async share() {
    if (!this.ready) return;
    this.render();
    const shot = this.canvas;
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b0a09';
    ctx.fillRect(0, 0, W, H);
    const sc = Math.max(W / shot.width, 1080 / shot.height);
    const dw = shot.width * sc, dh = shot.height * sc;
    ctx.drawImage(shot, (W - dw) / 2, (1080 - dh) / 2, dw, dh);
    const g = ctx.createLinearGradient(0, 900, 0, 1100);
    g.addColorStop(0, 'rgba(11,10,9,0)');
    g.addColorStop(1, 'rgba(11,10,9,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 900, W, 200);
    const st = this.state;
    const { w, h } = this.dims();
    await document.fonts.load('700 64px "Big Shoulders Display Variable"');
    ctx.fillStyle = '#eeddbf';
    ctx.font = '700 64px "Big Shoulders Display Variable", sans-serif';
    ctx.fillText(`ANFRAGE #${st.id}`, 64, 1130);
    ctx.font = '400 34px "Inter Variable", sans-serif';
    ctx.fillStyle = '#ede6da';
    ctx.fillText(this.ideaLabel().slice(0, 54), 64, 1188);
    ctx.fillStyle = '#9a9183';
    ctx.fillText(`${st.zone} · ca. ${fmt(w)} × ${fmt(h)} cm`, 64, 1236);
    ctx.font = '600 26px "Inter Variable", sans-serif';
    ctx.fillStyle = '#c9a86a';
    ctx.fillText('CHICAGO INK ERFTSTADT · 3D-TATTOO-KONFIGURATOR', 64, 1300);

    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const file = new File([blob], `chicago-ink-${st.id}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Tattoo-Anfrage ${st.id}`, text: this.message() });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
