/* =========================================================================
   What-A-Toy! — js/hero3d.js
   A transparent, viewport-fixed three.js canvas that shows the bears.glb model
   travelling with scroll:
     • Page 1 (hero):  bears sit on the RIGHT, vertically centered, facing us.
     • Page 1 -> 2:    bears glide to horizontal CENTER.
     • Page 2 -> 3:    bears fade + float away (gone by the products page).
   The page background colors are painted by #bg-layer (css), so this canvas is
   transparent and only carries the bears.
   Performance: DPR-capped, resize-aware, RAF paused when hidden / off-stage.
   Reduced motion: static, faces-forward, no scroll travel.
   Exports: initHero3D()
   ========================================================================= */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const RIGHT_X = 3.3;     // world-x of the bears on page 1 (right of the content)
const LEFT_X = 3.3;      // world-x on page 2 (left of the content)
const TARGET_SPAN = 2.0; // desired world max-dimension (kept clear of the text)
const FACE_ROT_Y = 0.2;  // gentle angle so faces turn toward the content (left)
const FADE_START = 1.0;  // scroll-progress (in viewport heights) where fade begins
const FADE_END = 1.7;    // fully gone by here

export function initHero3D() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !THREE) return;

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Hero morphing-blob background: fade out as we leave the hero so it
  //     never tints the red/navy pages. Set up first + on its own scroll
  //     listener so it works even if WebGL is unavailable below. ---
  const heroBg = document.getElementById('hero-bg');
  function updateHeroBg() {
    if (!heroBg) return;
    const vh = window.innerHeight || 1;
    const p = window.scrollY / vh; // viewport heights scrolled
    // full through hero+intro (golden), fade to 0 before the products page
    heroBg.style.opacity = String(Math.min(Math.max(1 - (p - 0.6), 0), 1));
  }
  updateHeroBg();
  window.addEventListener('scroll', updateHeroBg, { passive: true });

  // --- Renderer (transparent; DPR-capped) ---
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    console.warn('initHero3D: WebGL unavailable —', err);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // fully transparent — #bg-layer shows through
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // --- Scene + camera (looking straight at the origin -> vertical center) ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6.4);
  camera.lookAt(0, 0, 0);

  // --- Lights (warm, soft, with contrast so the plush reads) ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.5);
  keyLight.position.set(2.5, 4, 4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xC98A2B, 0.45);
  fillLight.position.set(-3, 1, 2);
  scene.add(fillLight);

  // --- Bear model ---
  let bear = null;
  const bearMaterials = [];
  let curX = RIGHT_X; // smoothed x for buttery travel
  const bearGroup = new THREE.Group();
  scene.add(bearGroup);

  const loader = new GLTFLoader();
  loader.load(
    './bears.glb',
    (gltf) => {
      bear = gltf.scene;

      // The GLB ships an oversized flat backdrop mesh (~14x11) that would
      // inflate the bbox + offset the center. Hide it and frame using only the
      // real bear geometry.
      const keep = [];
      bear.traverse((o) => {
        if (!o.isMesh) return;
        const s = new THREE.Vector3();
        new THREE.Box3().setFromObject(o).getSize(s);
        if (Math.max(s.x, s.y, s.z) > 6) {
          o.visible = false; // backdrop/decal — never show it
        } else {
          keep.push(o);
        }
      });
      const boxOf = (list) => {
        const b = new THREE.Box3();
        list.forEach((o) => b.union(new THREE.Box3().setFromObject(o)));
        return b;
      };

      // Scale by the largest dimension (this is a WIDE two-bear model, so
      // sizing by max-dim keeps the horizontal footprint in check), then
      // recenter on the real bears so they sit vertically centered.
      const size = new THREE.Vector3();
      boxOf(keep).getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      bear.scale.setScalar(TARGET_SPAN / maxDim);
      bear.updateMatrixWorld(true);

      const center = new THREE.Vector3();
      boxOf(keep).getCenter(center);
      bear.position.sub(center); // center at origin -> vertically centered

      // Turn the bears so their faces are toward the viewer, and collect
      // materials so we can fade them out as they leave.
      bear.rotation.y = FACE_ROT_Y;
      keep.forEach((o) => {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (m) {
            m.transparent = true;
            bearMaterials.push(m);
          }
        });
      });

      bearGroup.add(bear);
    },
    undefined,
    (err) => console.warn('initHero3D: failed to load bears.glb —', err)
  );

  function setBearOpacity(o) {
    for (let i = 0; i < bearMaterials.length; i++) bearMaterials[i].opacity = o;
  }

  // --- Sizing: the canvas is viewport-fixed (full screen) ---
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  let resizeRAF = 0;
  window.addEventListener(
    'resize',
    () => {
      cancelAnimationFrame(resizeRAF);
      resizeRAF = requestAnimationFrame(resize);
    },
    { passive: true }
  );

  // --- Render loop ---
  const clock = new THREE.Clock();
  let rafId = 0;
  let running = false;

  function renderFrame() {
    const elapsed = clock.getElapsedTime();

    if (bear) {
      const vh = window.innerHeight || 1;
      // Scroll progress in viewport heights: 0 = hero top, 1 = page 2, 2 = page 3.
      const p = prefersReduced ? 0 : window.scrollY / vh;

      // Horizontal travel: RIGHT of the content on page 1 -> LEFT of the
      // content on page 2 (content sits on the opposite side each page).
      const t = Math.min(Math.max(p, 0), 1);
      const targetX = RIGHT_X + (-LEFT_X - RIGHT_X) * t; // RIGHT_X -> -LEFT_X
      curX += (targetX - curX) * 0.12;   // smooth follow for buttery motion
      bearGroup.position.x = curX;

      // Fade + float away after page 2.
      const fade = Math.min(Math.max((p - FADE_START) / (FADE_END - FADE_START), 0), 1);
      setBearOpacity(1 - fade);
      bearGroup.visible = fade < 1;

      // Gentle idle bob + a lift as it leaves.
      const bob = prefersReduced ? 0 : Math.sin(elapsed * 1.4) * 0.06;
      bearGroup.position.y = bob + fade * 0.9;
      const s = 1 - fade * 0.25;
      bearGroup.scale.setScalar(s);
      if (!prefersReduced) bear.rotation.z = Math.sin(elapsed * 0.8) * 0.015;
    }

    renderer.render(scene, camera);
  }

  function loop() {
    renderFrame();
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    loop();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  if (prefersReduced) {
    renderFrame();
    setTimeout(renderFrame, 400);
    setTimeout(renderFrame, 1200);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => {
    if (prefersReduced) return;
    if (document.hidden) stop();
    else start();
  });
}
