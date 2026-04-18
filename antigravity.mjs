/**
 * Antigravity – Vanilla Three.js port of react-bits Antigravity component.
 * Renders instanced capsule particles that form a magnetic ring around the pointer.
 *
 * Usage:
 *   import { initAntigravity } from './antigravity.mjs';
 *   const cleanup = initAntigravity(document.getElementById('canvas-container'), { color: '#90d8ff' });
 *   // later: cleanup();
 */

import * as THREE from 'three';

const DEFAULTS = {
  count: 300,
  magnetRadius: 6,
  ringRadius: 13,
  waveSpeed: 2.7,
  waveAmplitude: 1,
  particleSize: 1.4,
  lerpSpeed: 0.05,
  color: '#90d8ff',
  autoAnimate: true,
  particleVariance: 1,
  rotationSpeed: 0,
  depthFactor: 1,
  pulseSpeed: 3,
  particleShape: 'capsule',
  fieldStrength: 10
};

export function initAntigravity(container, userOpts = {}) {
  const opts = { ...DEFAULTS, ...userOpts };

  /* ---- renderer + scene + camera ---- */
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  let cw = container.clientWidth || 500;
  let ch = container.clientHeight || 500;
  renderer.setSize(cw, ch);
  container.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '0',
    borderRadius: 'inherit',
  });

  const scene = new THREE.Scene();
  const fov = 35;
  const camera = new THREE.PerspectiveCamera(fov, cw / ch, 0.1, 1000);
  camera.position.set(0, 0, 50);

  /* ---- viewport helper (visible area at z=0) ---- */
  function visibleSize() {
    const vFov = (fov * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * camera.position.z;
    const w = h * camera.aspect;
    return { w, h };
  }

  /* ---- geometry ---- */
  let geo;
  switch (opts.particleShape) {
    case 'sphere':      geo = new THREE.SphereGeometry(0.2, 16, 16); break;
    case 'box':          geo = new THREE.BoxGeometry(0.3, 0.3, 0.3); break;
    case 'tetrahedron':  geo = new THREE.TetrahedronGeometry(0.3); break;
    default:             geo = new THREE.CapsuleGeometry(0.1, 0.4, 4, 8); break;
  }
  const mat = new THREE.MeshBasicMaterial({ color: opts.color });
  const mesh = new THREE.InstancedMesh(geo, mat, opts.count);
  scene.add(mesh);

  const dummy = new THREE.Object3D();

  /* ---- particles ---- */
  const vs = visibleSize();
  const particles = [];
  for (let i = 0; i < opts.count; i++) {
    const x = (Math.random() - 0.5) * vs.w;
    const y = (Math.random() - 0.5) * vs.h;
    const z = (Math.random() - 0.5) * 20;
    particles.push({
      t: Math.random() * 100,
      speed: 0.01 + Math.random() / 200,
      mx: x, my: y, mz: z,
      cx: x, cy: y, cz: z,
      randomRadiusOffset: (Math.random() - 0.5) * 2
    });
  }

  /* ---- pointer ---- */
  const pointer = { x: 0, y: 0 };
  const lastMove = { x: 0, y: 0, time: 0 };
  const virtualMouse = { x: 0, y: 0 };

  function onMove(e) {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', e => {
    if (e.touches.length) onMove(e.touches[0]);
  }, { passive: true });

  /* ---- animation loop ---- */
  const clock = new THREE.Clock();
  let rafId;

  function animate() {
    rafId = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    const mouseDist = Math.hypot(pointer.x - lastMove.x, pointer.y - lastMove.y);
    if (mouseDist > 0.001) {
      lastMove.x = pointer.x;
      lastMove.y = pointer.y;
      lastMove.time = Date.now();
    }

    const vp = visibleSize();
    let destX = (pointer.x * vp.w) / 2;
    let destY = (pointer.y * vp.h) / 2;

    if (opts.autoAnimate && Date.now() - lastMove.time > 2000) {
      destX = Math.sin(elapsed * 0.5) * (vp.w / 4);
      destY = Math.cos(elapsed) * (vp.h / 4);
    }

    virtualMouse.x += (destX - virtualMouse.x) * 0.05;
    virtualMouse.y += (destY - virtualMouse.y) * 0.05;

    const tx = virtualMouse.x;
    const ty = virtualMouse.y;
    const globalRot = elapsed * opts.rotationSpeed;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.t += p.speed / 2;

      const proj = 1 - p.cz / 50;
      const ptx = tx * proj;
      const pty = ty * proj;

      const dx = p.mx - ptx;
      const dy = p.my - pty;
      const dist = Math.hypot(dx, dy);

      let tpx = p.mx, tpy = p.my, tpz = p.mz * opts.depthFactor;

      if (dist < opts.magnetRadius) {
        const angle = Math.atan2(dy, dx) + globalRot;
        const wave = Math.sin(p.t * opts.waveSpeed + angle) * (0.5 * opts.waveAmplitude);
        const dev = p.randomRadiusOffset * (5 / (opts.fieldStrength + 0.1));
        const r = opts.ringRadius + wave + dev;
        tpx = ptx + r * Math.cos(angle);
        tpy = pty + r * Math.sin(angle);
        tpz = p.mz * opts.depthFactor + Math.sin(p.t) * opts.waveAmplitude * opts.depthFactor;
      }

      p.cx += (tpx - p.cx) * opts.lerpSpeed;
      p.cy += (tpy - p.cy) * opts.lerpSpeed;
      p.cz += (tpz - p.cz) * opts.lerpSpeed;

      dummy.position.set(p.cx, p.cy, p.cz);
      dummy.lookAt(ptx, pty, p.cz);
      dummy.rotateX(Math.PI / 2);

      const dRing = Math.abs(Math.hypot(p.cx - ptx, p.cy - pty) - opts.ringRadius);
      let sf = Math.max(0, Math.min(1, 1 - dRing / 10));
      const finalScale = sf * (0.8 + Math.sin(p.t * opts.pulseSpeed) * 0.2 * opts.particleVariance) * opts.particleSize;
      dummy.scale.set(finalScale, finalScale, finalScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  }

  animate();

  /* ---- resize ---- */
  function onResize() {
    cw = container.clientWidth || 500;
    ch = container.clientHeight || 500;
    renderer.setSize(cw, ch);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  /* ---- cleanup ---- */
  return function cleanup() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMove);
    ro.disconnect();
    renderer.dispose();
    geo.dispose();
    mat.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  };
}
