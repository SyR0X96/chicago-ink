import '@fontsource-variable/inter';
import '@fontsource-variable/big-shoulders-display';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './styles/main.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { site, artists, waLink, mailLink } from './config.js';
import { gallery, styleLabels } from './data/gallery.js';
import { reviews } from './data/reviews.js';
import imagesMeta from './data/images.json';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const BASE = import.meta.env.BASE_URL;
const imgUrl = (group, slug, w) => `${BASE}img/${group}/${slug}-${w}.webp`;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const artistName = (id) => artists.find((a) => a.id === id)?.name;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let lenis;

// ---------------------------------------------------------------------------
//  WhatsApp-Links mit vorbereiteter Nachricht
// ---------------------------------------------------------------------------
function initWaLinks(root = document) {
  $$('[data-wa]', root).forEach((a) => {
    a.href = waLink(a.dataset.wa);
  });
}

// ---------------------------------------------------------------------------
//  Öffnungszeiten + Live-Status (Zeitzone Berlin)
// ---------------------------------------------------------------------------
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
function berlinNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, min: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10) };
}
const toMin = (t) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10);

function initHours() {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups = [];
  for (const d of order) {
    const h = site.hours[d];
    const key = h ? h.join('–') : 'zu';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.days.push(d);
    else groups.push({ key, h, days: [d] });
  }
  const html = groups
    .map((g) => {
      const label = g.days.length > 1 ? `${DAYS[g.days[0]]} – ${DAYS[g.days[g.days.length - 1]]}` : DAYS[g.days[0]];
      return `<span><b>${label}</b>${g.h ? `${g.h[0]} – ${g.h[1]} Uhr` : 'geschlossen'}</span>`;
    })
    .join('');
  $$('[data-hours]').forEach((el) => (el.innerHTML = html + '<span class="hours__note">Tattoos nur nach Termin</span>'));

  const { day, min } = berlinNow();
  const today = site.hours[day];
  let open = false, text;
  if (today && min >= toMin(today[0]) && min < toMin(today[1])) {
    open = true;
    text = `Jetzt geöffnet · bis ${today[1]}`;
  } else {
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      const h = site.hours[d];
      if (!h) continue;
      if (i === 0 && min >= toMin(h[0])) continue;
      text = `Geschlossen · öffnet ${i === 0 ? 'heute' : i === 1 ? 'morgen' : DAYS[d]} ${h[0]}`;
      break;
    }
  }
  $$('[data-open-status]').forEach((el) => {
    el.classList.toggle('is-open', open);
    el.querySelector('span').textContent = text;
  });
}

// ---------------------------------------------------------------------------
//  Smooth Scroll, Header, Menü
// ---------------------------------------------------------------------------
function initScroll() {
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    if (import.meta.env.DEV) window.__lenis = lenis;
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id.length > 1 && $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -70, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  const header = $('.header');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
    document.body.classList.toggle('past-hero', y > window.innerHeight * 0.6);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('.burger');
  burger.addEventListener('click', () => (document.body.classList.contains('menu-open') ? closeMenu() : openMenu()));
}
function openMenu() {
  document.body.classList.add('menu-open');
  $('.burger').setAttribute('aria-expanded', 'true');
  $('#menu').setAttribute('aria-hidden', 'false');
  lenis?.stop();
  gsap.fromTo('.menu__nav a', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.7, ease: 'power3.out', delay: 0.15 });
}
function closeMenu() {
  if (!document.body.classList.contains('menu-open')) return;
  document.body.classList.remove('menu-open');
  $('.burger').setAttribute('aria-expanded', 'false');
  $('#menu').setAttribute('aria-hidden', 'true');
  lenis?.start();
}

// ---------------------------------------------------------------------------
//  Hero
// ---------------------------------------------------------------------------
let hero;
async function initHero() {
  const canvas = $('.hero__canvas');
  const supportsGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  })();
  if (!supportsGL) {
    document.body.classList.add('no-webgl');
    return;
  }
  const { HeroScene } = await import('./modules/hero/HeroScene.js');
  const safeArea = () => {
    const h = $('.hero').getBoundingClientRect();
    const top = $('.hero__top').getBoundingClientRect().bottom - h.top + 8;
    const bottom = $('.hero__title').getBoundingClientRect().top - h.top - 12;
    return { top, bottom };
  };
  hero = new HeroScene(canvas, { logoUrl: `${BASE}img/brand/logo-1024.png`, mobile, reduced, safeArea });
  try {
    await hero.init();
  } catch (e) {
    console.warn('Hero-WebGL fehlgeschlagen', e);
    document.body.classList.add('no-webgl');
    hero = null;
    return;
  }
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (st) => hero.setScroll(st.progress),
  });
}

function heroIntro() {
  hero?.playIntro(gsap);
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.from('.hero__title .line > span', { yPercent: 115, duration: 1.4, stagger: 0.12 }, reduced ? 0 : 0.9)
    .from('.hero__text, .hero__ctas > *', { y: 30, opacity: 0, duration: 1, stagger: 0.08 }, '-=1')
    .from('.hero__top > *, .hero__meta > *', { opacity: 0, y: 12, duration: 0.9, stagger: 0.06 }, '-=0.9')
    .from('.header', { yPercent: -100, opacity: 0, duration: 1 }, '-=1')
    .from('.wa-fab, .dock', { y: 120, duration: 1.1, ease: 'expo.out' }, '-=0.6');

  if (!reduced) {
    gsap.to('.hero__bottom, .hero__top, .hero__meta', {
      yPercent: -30,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true },
    });
  }
}

// ---------------------------------------------------------------------------
//  Preloader
// ---------------------------------------------------------------------------
async function preload(heroReady) {
  const count = $('[data-count]');
  const bar = $('.preloader__bar span');
  const state = { v: 0 };
  const min = new Promise((r) => setTimeout(r, reduced ? 200 : 1200));
  const max = new Promise((r) => setTimeout(r, 4000));
  const tween = gsap.to(state, {
    v: 90,
    duration: 2.2,
    ease: 'power2.out',
    onUpdate: () => {
      count.textContent = Math.round(state.v);
      bar.style.transform = `scaleX(${state.v / 100})`;
    },
  });
  await Promise.race([Promise.all([heroReady, document.fonts.ready, min]), max]);
  tween.kill();
  await gsap.to(state, {
    v: 100,
    duration: 0.35,
    onUpdate: () => {
      count.textContent = Math.round(state.v);
      bar.style.transform = `scaleX(${state.v / 100})`;
    },
  });
  await gsap.to('.preloader__inner', { opacity: 0, y: -20, duration: 0.45, ease: 'power2.in' });
  gsap.to('.preloader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut', onComplete: () => $('.preloader').remove() });
  document.body.classList.remove('is-loading');
  lenis?.start();
}

// ---------------------------------------------------------------------------
//  Statement, Zähler, Reveals
// ---------------------------------------------------------------------------
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w));
          else {
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = w;
            frag.appendChild(s);
          }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
  return $$('.w', el);
}

function initReveals() {
  const words = splitWords($('[data-words]'));
  if (!reduced) {
    gsap.fromTo(
      words,
      { opacity: 0.12 },
      { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '.statement__text', start: 'top 80%', end: 'bottom 45%', scrub: true } }
    );
  }

  $$('[data-counter]').forEach((el) => {
    const end = parseFloat(el.dataset.counter);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const fmt = (v) => v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    el.textContent = fmt(reduced ? end : 0);
    if (reduced) return;
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v)) }),
    });
  });

  if (reduced) return;
  const batch = (sel, vars = {}) =>
    ScrollTrigger.batch(sel, {
      start: 'top 88%',
      once: true,
      onEnter: (els) => gsap.fromTo(els, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.08, ease: 'power3.out', ...vars }),
    });
  gsap.set('.section-head > *, .style-row, .stats li, .process__list li, .faq__list details, .contact__channels a, .studio__info > *, .quick', { opacity: 0 });
  batch('.section-head > *');
  batch('.style-row');
  batch('.stats li');
  batch('.process__list li');
  batch('.faq__list details');
  batch('.contact__channels a');
  batch('.studio__info > *');
  batch('.quick');

  $$('.h-display').forEach((h) => {
    gsap.fromTo(h, { clipPath: 'inset(-25% -5% 100% -5%)', y: 40 }, { clipPath: 'inset(-25% -5% -25% -5%)', y: 0, duration: 1.3, ease: 'power4.out', clearProps: 'clipPath', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });

  $$('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { yPercent: -parseFloat(el.dataset.parallax) }, { yPercent: parseFloat(el.dataset.parallax), ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Ablauf-Linie wird beim Scrollen "gestochen"
  const path = $('.process__line path');
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.process__wrap', start: 'top 70%', end: 'bottom 60%', scrub: true } });
}

// ---------------------------------------------------------------------------
//  Stile: Bild folgt der Maus
// ---------------------------------------------------------------------------
function initStyleHover() {
  const box = $('.style-hover');
  if (!finePointer) return;
  // Alle Vorschaubilder vorab laden und übereinanderlegen -> nie ein falsches Bild
  const slugs = [...new Set($$('.style-row').map((r) => r.dataset.img).filter(Boolean))];
  box.innerHTML = slugs.map((s) => `<img src="${imgUrl('gallery', s, 640)}" data-slug="${s}" alt="" decoding="async" />`).join('');
  const xTo = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3' });
  const rTo = gsap.quickTo(box, 'rotation', { duration: 0.8, ease: 'power3' });
  let lastX = 0;
  $('.style-list').addEventListener('mousemove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    rTo(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6));
    lastX = e.clientX;
  });
  window.addEventListener('scroll', () => box.classList.remove('is-on'), { passive: true });
  $$('.style-row').forEach((row) => {
    row.addEventListener('mouseenter', (e) => {
      const slug = row.dataset.img;
      if (!slug) return box.classList.remove('is-on');
      if (!box.classList.contains('is-on')) gsap.set(box, { x: e.clientX, y: e.clientY });
      $$('img', box).forEach((img) => img.classList.toggle('is-active', img.dataset.slug === slug));
      box.classList.add('is-on');
    });
    row.addEventListener('mouseleave', () => box.classList.remove('is-on'));
  });
}

// ---------------------------------------------------------------------------
//  Laufband: per Script, Tempo folgt dem Scrollen (ohne Sprünge)
// ---------------------------------------------------------------------------
function initMarquee() {
  const track = $('[data-marquee]');
  if (reduced) return;
  let x = 0, vel = 0, half = track.scrollWidth / 2;
  window.addEventListener('resize', () => (half = track.scrollWidth / 2));
  document.fonts.ready.then(() => (half = track.scrollWidth / 2));
  lenis?.on('scroll', (e) => (vel = e.velocity));
  gsap.ticker.add((time, delta) => {
    vel *= 0.92;
    const speed = 70 * (1 + Math.min(Math.abs(vel) * 0.12, 5));
    x -= (speed * delta) / 1000;
    if (x <= -half) x += half;
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  });
}

// ---------------------------------------------------------------------------
//  Showcase (horizontal, gepinnt)
// ---------------------------------------------------------------------------
function initShowcase() {
  const track = $('[data-showcase]');
  const items = gallery.filter((g) => g.featured).sort((a, b) => a.featured - b.featured);
  track.innerHTML = items
    .map((g, i) => {
      const m = imagesMeta.gallery[g.slug];
      return `<figure class="sc-card" data-index="${i}" data-cursor="Ansehen" data-slug="${g.slug}">
        <div class="sc-card__img"><img src="${imgUrl('gallery', g.slug, 1400)}" srcset="${imgUrl('gallery', g.slug, 640)} 640w, ${imgUrl('gallery', g.slug, 1400)} 1400w" sizes="(max-width: 760px) 80vw, 40vw" alt="${esc(g.title)}" loading="lazy" width="${m.w}" height="${m.h}" /></div>
        <figcaption><span class="sc-card__num">${String(i + 1).padStart(2, '0')}</span><strong>${esc(g.title)}</strong><em>${styleLabels[g.style]} · ${g.place}${g.artist ? ` · ${artistName(g.artist)}` : ''}</em></figcaption>
      </figure>`;
    })
    .join('');
  $('[data-sc-total]').textContent = String(items.length).padStart(2, '0');
  track.addEventListener('click', (e) => {
    const f = e.target.closest('[data-slug]');
    if (f) openLightbox(gallery.findIndex((g) => g.slug === f.dataset.slug), gallery);
  });

  const cur = $('[data-sc-current]');
  if (mobile || reduced) {
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / (track.scrollWidth / items.length));
      cur.textContent = String(Math.min(items.length, i + 1)).padStart(2, '0');
    }, { passive: true });
    return;
  }
  const dist = () => track.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(track).paddingLeft);
  gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.showcase',
      start: 'top top',
      end: () => `+=${dist()}`,
      pin: '.showcase__pin',
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (st) => {
        cur.textContent = String(Math.min(items.length, Math.floor(st.progress * items.length) + 1)).padStart(2, '0');
      },
    },
  });
  $$('.sc-card__img img', track).forEach((img) => {
    gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.showcase', start: 'top top', end: () => `+=${dist()}`, scrub: true } });
  });
}

// ---------------------------------------------------------------------------
//  Konfigurator (lädt erst, wenn er in die Nähe kommt)
// ---------------------------------------------------------------------------
function initConfigurator() {
  const root = $('[data-cfg]');
  let started = false;
  const io = new IntersectionObserver(
    async ([e]) => {
      if (!e.isIntersecting || started) return;
      started = true;
      io.disconnect();
      const { Configurator } = await import('./modules/configurator/Configurator.js');
      const cfg = new Configurator(root);
      if (import.meta.env.DEV) window.__cfg = cfg;
      await cfg.init();
      ScrollTrigger.refresh();
    },
    { rootMargin: '900px 0px' }
  );
  io.observe(root);
}

// ---------------------------------------------------------------------------
//  Crew
// ---------------------------------------------------------------------------
function initCrew() {
  const el = $('[data-crew]');
  el.innerHTML = artists
    .map((a) => {
      const m = a.photo && imagesMeta.artists[a.photo];
      const photo = a.photo
        ? `<img src="${imgUrl('artists', a.photo, 900)}" srcset="${imgUrl('artists', a.photo, 520)} 520w, ${imgUrl('artists', a.photo, 900)} 900w" sizes="(max-width: 760px) 90vw, 25vw" alt="${a.name}" loading="lazy" width="${m.w}" height="${m.h}" />`
        : `<div class="crew-card__placeholder" aria-hidden="true"><span>${a.name[0]}</span><small>Foto folgt</small></div>`;
      const msg = a.id === 'tanja' ? 'Hi Tanja! 👋 Ich hätte eine Frage zu einem Termin:' : `Hi ${a.name}! 👋 Ich hätte gern ein Tattoo von dir. Meine Idee:`;
      const count = gallery.filter((g) => g.artist === a.id).length;
      return `<article class="crew-card" data-tilt>
        <div class="crew-card__media">${photo}<span class="crew-card__role">${a.role}</span></div>
        <div class="crew-card__body">
          <h3>${a.name}${a.alias ? ` <small>aka ${a.alias}</small>` : ''}</h3>
          <ul class="tags">${a.styles.map((s) => `<li>${s}</li>`).join('')}</ul>
          <p>${a.bio}</p>
          <div class="crew-card__actions">
            <a class="btn btn--wa btn--sm" data-wa="${esc(msg)}" target="_blank" rel="noopener"><svg class="ico"><use href="#i-wa"/></svg>${a.id === 'tanja' ? 'Frag Tanja' : `Bei ${a.name} anfragen`}</a>
            ${a.instagram ? `<a class="icon-link" href="${a.instagram}" target="_blank" rel="noopener" aria-label="${a.name} auf Instagram"><svg class="ico"><use href="#i-ig"/></svg></a>` : ''}
            ${count ? `<button class="text-link" data-show-artist="${a.id}">${count} Arbeiten ansehen</button>` : ''}
          </div>
        </div>
      </article>`;
    })
    .join('');
  initWaLinks(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-show-artist]');
    if (!b) return;
    setGalleryFilter('artist', b.dataset.showArtist);
    const g = $('#galerie');
    lenis ? lenis.scrollTo(g, { offset: -70 }) : g.scrollIntoView({ behavior: 'smooth' });
  });

  if (!finePointer || reduced) return;
  $$('[data-tilt]').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 10);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
    });
    card.addEventListener('mouseleave', () => {
      rx(0);
      ry(0);
    });
  });
  gsap.from('.crew-card', { y: 80, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.crew__grid', start: 'top 85%', once: true } });
}

// ---------------------------------------------------------------------------
//  Galerie + Lightbox
// ---------------------------------------------------------------------------
const filter = { style: 'all', artist: 'all' };
let shown = mobile ? 10 : 16;
let currentList = gallery;

function renderGallery() {
  const list = gallery.filter((g) => (filter.style === 'all' || g.style === filter.style) && (filter.artist === 'all' || g.artist === filter.artist));
  currentList = list;
  const el = $('[data-gallery]');
  el.innerHTML = list
    .slice(0, shown)
    .map((g, i) => {
      const m = imagesMeta.gallery[g.slug];
      return `<figure class="g-item" data-i="${i}" data-cursor="Ansehen" tabindex="0" role="button" aria-label="${esc(g.title)} ansehen">
        <img src="${imgUrl('gallery', g.slug, 640)}" alt="${esc(g.title)} – ${styleLabels[g.style]} Tattoo${g.artist ? ` von ${artistName(g.artist)}` : ''}" loading="lazy" width="${m.w}" height="${m.h}" />
        <figcaption><strong>${esc(g.title)}</strong><span>${styleLabels[g.style]}${g.artist ? ` · ${artistName(g.artist)}` : ''}</span></figcaption>
      </figure>`;
    })
    .join('');
  $('[data-gallery-more]').hidden = list.length <= shown;
  if (!list.length) el.innerHTML = '<p class="empty">Für diese Kombination haben wir hier noch nichts – schau auf Instagram vorbei oder frag direkt per WhatsApp.</p>';
  if (!reduced) gsap.fromTo('.g-item', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.03, ease: 'power2.out' });
  ScrollTrigger.refresh();
}

function setGalleryFilter(kind, v) {
  filter[kind] = v;
  $$(`[data-filter-${kind}] button`).forEach((b) => b.classList.toggle('is-active', b.dataset.v === v));
  shown = mobile ? 10 : 16;
  renderGallery();
}

function initGallery() {
  renderGallery();
  $('[data-filter-style]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setGalleryFilter('style', b.dataset.v);
  });
  $('[data-filter-artist]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setGalleryFilter('artist', b.dataset.v);
  });
  $('[data-gallery-more]').addEventListener('click', () => {
    shown += 12;
    renderGallery();
  });
  const grid = $('[data-gallery]');
  const open = (e) => {
    const f = e.target.closest('.g-item');
    if (f) openLightbox(+f.dataset.i, currentList);
  };
  grid.addEventListener('click', open);
  grid.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(e);
    }
  });
  initLightbox();
}

let lb = { i: 0, list: gallery };
function openLightbox(i, list) {
  lb = { i, list };
  const box = $('.lightbox');
  box.classList.add('is-open');
  box.setAttribute('aria-hidden', 'false');
  lenis?.stop();
  showLb();
  $('.lightbox__close').focus();
}
function showLb() {
  const g = lb.list[lb.i];
  const img = $('.lightbox img');
  img.src = imgUrl('gallery', g.slug, 1400);
  img.alt = g.title;
  $('[data-lb-title]').textContent = g.title;
  $('[data-lb-meta]').textContent = `${styleLabels[g.style]} · ${g.place}${g.artist ? ` · ${artistName(g.artist)}` : ''}`;
  const who = g.artist ? ` (${styleLabels[g.style]}, ${artistName(g.artist)})` : ` (${styleLabels[g.style]})`;
  $('[data-lb-wa]').href = waLink(`Hi Chicago Ink! 👋 Ich habe auf eurer Website das Tattoo „${g.title}“${who} gesehen und hätte gern etwas in der Art. Meine Idee:`);
  gsap.fromTo(img, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
}
function closeLightbox() {
  const box = $('.lightbox');
  box.classList.remove('is-open');
  box.setAttribute('aria-hidden', 'true');
  lenis?.start();
}
function initLightbox() {
  const box = $('.lightbox');
  const step = (d) => {
    lb.i = (lb.i + d + lb.list.length) % lb.list.length;
    showLb();
  };
  $('.lightbox__close').addEventListener('click', closeLightbox);
  $('.lightbox__nav--prev').addEventListener('click', () => step(-1));
  $('.lightbox__nav--next').addEventListener('click', () => step(1));
  box.addEventListener('click', (e) => {
    if (e.target === box) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  let sx = null;
  box.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
  box.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    sx = null;
  });
}

// ---------------------------------------------------------------------------
//  Bewertungen
// ---------------------------------------------------------------------------
function initReviews() {
  const card = (r) => `<figure class="review"><div class="review__stars" aria-label="${r.stars} von 5 Sternen">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div><blockquote>„${esc(r.text)}“</blockquote><figcaption>${esc(r.name)}</figcaption></figure>`;
  const a = reviews.slice(0, 3), b = reviews.slice(3);
  const row = (list, dir) => `<div class="reviews__row reviews__row--${dir}"><div class="reviews__track">${[...list, ...list].map(card).join('')}</div></div>`;
  $('[data-reviews]').innerHTML = row([...a, ...b], 'l') + row([...b, ...a], 'r');
  if (site.googleReviews) {
    const w = $('[data-google-reviews]');
    w.hidden = false;
    $('a', w).href = site.googleReviews;
  }
}

// ---------------------------------------------------------------------------
//  Karte (erst nach Klick – DSGVO)
// ---------------------------------------------------------------------------
function initMap() {
  $('[data-map-load]').addEventListener('click', () => {
    const q = encodeURIComponent(`${site.address.street}, ${site.address.zip} ${site.address.city}`);
    $('[data-map]').innerHTML = `<iframe title="Standort Chicago Ink auf Google Maps" src="https://maps.google.com/maps?q=${q}&t=m&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  });
}

// ---------------------------------------------------------------------------
//  Schnellanfrage -> WhatsApp
// ---------------------------------------------------------------------------
function initQuick() {
  const form = $('[data-quick]');
  let type = 'Tattoo';
  $$('[data-q-type] button', form).forEach((b) =>
    b.addEventListener('click', () => {
      type = b.dataset.v;
      $$('[data-q-type] button', form).forEach((x) => x.classList.toggle('is-active', x === b));
      const idea = form.elements.idea;
      idea.placeholder = type === 'Piercing' ? 'Welches Piercing? Ohr, Nase, Body …' : type === 'Frage' ? 'Deine Frage …' : 'Motiv, Größe, Körperstelle, Wunschtermin …';
    })
  );
  const build = () => {
    const f = form.elements;
    const lines = [`Hi Chicago Ink! 👋 ${type === 'Frage' ? 'Ich habe eine Frage.' : `Anfrage: ${type}`}`, ''];
    lines.push(f.idea.value.trim());
    if (type === 'Tattoo') {
      if (f.stil.value) lines.push(`Stil: ${f.stil.value}`);
      lines.push(`Artist: ${f.artist.value || 'Egal / empfehlt mir wen'}`);
    }
    lines.push('', `Name: ${f.name.value.trim()}`);
    return lines.join('\n');
  };
  const valid = () => {
    let ok = true;
    ['name', 'idea'].forEach((n) => {
      const el = form.elements[n];
      const bad = !el.value.trim();
      el.closest('.field').classList.toggle('is-error', bad);
      if (bad) ok = false;
    });
    return ok;
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!valid()) return;
    window.open(waLink(build()), '_blank', 'noopener');
  });
  $('[data-q-mail]').addEventListener('click', () => {
    if (!valid()) return;
    location.href = mailLink(`Anfrage über die Website: ${type}`, build());
  });
  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-error'));
}

// ---------------------------------------------------------------------------
//  Cursor + magnetische Buttons
// ---------------------------------------------------------------------------
function initCursor() {
  if (!finePointer || reduced) return;
  document.body.classList.add('has-cursor');
  const dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.12 }), dy = gsap.quickTo(dot, 'y', { duration: 0.12 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    dx(e.clientX);
    dy(e.clientY);
    rx(e.clientX);
    ry(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    const c = e.target.closest('[data-cursor]');
    const link = e.target.closest('a, button, summary, label, input, select, textarea');
    const canvas = e.target.closest('.cfg__canvas');
    document.body.classList.toggle('cursor-label', !!c);
    document.body.classList.toggle('cursor-link', !!link && !c);
    document.body.classList.toggle('cursor-3d', !!canvas);
    label.textContent = c ? c.dataset.cursor : canvas ? 'Drehen' : '';
  });

  $$('.magnetic').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.3);
      y((e.clientY - r.top - r.height / 2) * 0.4);
    });
    el.addEventListener('mouseleave', () => {
      x(0);
      y(0);
    });
  });
}

// ---------------------------------------------------------------------------
//  Start
// ---------------------------------------------------------------------------
initWaLinks();
initHours();
initScroll();
const heroReady = initHero();
initReveals();
initStyleHover();
initMarquee();
initShowcase();
initConfigurator();
initCrew();
initGallery();
initReviews();
initMap();
initQuick();
initCursor();
preload(heroReady).then(() => {
  heroIntro();
  ScrollTrigger.refresh();
});
window.addEventListener('load', () => ScrollTrigger.refresh());
