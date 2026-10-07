// mako-sgp4 demo: propagate TLEs/OMMs with mako-sgp4 (WebAssembly) and draw them on a
// 3D inertial (TEME) globe and a 2D ground track.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const root = document.getElementById('mako-demo');
const { default: initWasm, Satellite } = await import(root.dataset.wasm);
await initWasm();

// ---------
// Constants
// ---------

const RE = 6378.137;            // Earth equatorial radius [km], 1 scene unit
const MAX_SATS = 8;              // one color per palette slot, never a generated 9th
const TRACK_SAMPLES = 360;      // samples per track (spans two orbits)
const TRACK_REFRESH_MS = 10000; // how often the ±1 orbit window slides
const MAP_REFRESH_MS = 250;
const DEG = Math.PI / 180;
const MAX_RADIUS = 50 * RE;     // beyond this an SGP4 result is treated as non-physical [km]
// Colorblind-safe categorical palette (dark steps), in its validated fixed order. Tracks can
// cross in any combination, so names are also drawn beside each marker and in the table.
const COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

// Stylized Earth colors; every palette color clears 3:1 contrast on both
const OCEAN = [12, 18, 28];      // #0c121c
const LAND = [26, 35, 51];       // #1a2333
const COAST = [86, 110, 150];    // thin coastline highlight
const LABEL_INK = '#e8e8e8';
const LABEL_HALO = 'rgba(12, 18, 28, 0.9)';
const MARKER_RING = '#0c121c';   // dark ring around fins, matching the Earth

// ----------------
// Example elements
// ----------------

// ISS (ZARYA) from Vallado's test set, with the epoch moved to today at 00:00 UTC
function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function tleChecksum(line) {
  let sum = 0;
  for (const c of line.slice(0, 68)) {
    if (c >= '0' && c <= '9') sum += Number(c);
    else if (c === '-') sum += 1;
  }
  return sum % 10;
}

function exampleTle(epoch) {
  const year = epoch.getUTCFullYear();
  const doy = Math.round((epoch - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const epochField = String(year % 100).padStart(2, '0') + String(doy).padStart(3, '0') + '.00000000';
  const body = '1 25544U 98067A   ' + epochField + ' -.00002182 -00100-2 -11606-4 0  292';
  return [
    'ISS (ZARYA)',
    body + tleChecksum(body),
    '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537',
  ].join('\n');
}

function exampleOmm(epoch) {
  const date = epoch.toISOString().slice(0, 10);
  return `CCSDS_OMM_VERS = 2.0
CREATION_DATE  =
ORIGINATOR     =

OBJECT_NAME    = ISS (ZARYA)
OBJECT_ID      = 1998-067A
CENTER_NAME    = EARTH
REF_FRAME      = TEME
TIME_SYSTEM    = UTC
MEAN_ELEMENT_THEORY = SGP/SGP4

EPOCH          = ${date}T00:00:00.000000
MEAN_MOTION    = 15.72125391
ECCENTRICITY   = .0006703
INCLINATION    = 51.6416
RA_OF_ASC_NODE = 247.4627
ARG_OF_PERICENTER = 130.536
MEAN_ANOMALY   = 325.0288

EPHEMERIS_TYPE = 0
CLASSIFICATION_TYPE = U
NORAD_CAT_ID   = 25544
ELEMENT_SET_NO = 292
REV_AT_EPOCH   = 56353
BSTAR          = -.11606E-4
MEAN_MOTION_DOT = -.2182E-4
MEAN_MOTION_DDOT = -.1E-4`;
}

const examples = { tle: exampleTle(todayUtc()), omm: exampleOmm(todayUtc()) };

// -------------
// Input parsing
// -------------

// Split pasted text into individual element sets (the WASM parser reads one at a time)
function splitElementSets(text) {
  if (/^\s*CCSDS_OMM_VERS/m.test(text)) {
    return text.split(/^(?=\s*CCSDS_OMM_VERS)/m).map((s) => s.trim()).filter(Boolean);
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const isLine = (l, n) => l !== undefined && l.startsWith(n + ' ');
  const sets = [];
  for (let i = 0; i < lines.length; i++) {
    if (isLine(lines[i], '1') && isLine(lines[i + 1], '2')) {
      const prev = lines[i - 1];
      const hasName = i > 0 && !isLine(prev, '1') && !isLine(prev, '2');
      sets.push((hasName ? prev + '\n' : '') + lines[i] + '\n' + lines[i + 1]);
      i++;
    }
  }
  return sets;
}

// ---------
// Astronomy
// ---------

// Low-precision Sun direction in the inertial frame (Astronomical Almanac, ~0.01 deg)
function sunDirection(unixMs) {
  const n = unixMs / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.460 + 0.9856474 * n) * DEG;
  const g = (357.528 + 0.9856003 * n) * DEG;
  const lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;
  const eps = (23.439 - 0.0000004 * n) * DEG;
  return [Math.cos(lambda), Math.cos(eps) * Math.sin(lambda), Math.sin(eps) * Math.sin(lambda)];
}

// SGP4 can return huge positions without an error for stale element sets (python-sgp4 does
// the same), so flag anything inside the Earth or beyond MAX_RADIUS
function physical(x, y, z) {
  const r = Math.hypot(x, y, z);
  return r > 0.98 * RE && r < MAX_RADIUS;
}

// Shark fin in profile with its base centered at (x, y), leading edge toward +x (or -x if
// flipped) so it points in the direction of travel
function finPath(ctx, x, y, size, flip) {
  const sx = flip ? -1 : 1;
  const px = (u) => x + sx * (u - 0.5) * size;
  const py = (v) => y - (1 - v) * size * 0.9;
  ctx.beginPath();
  ctx.moveTo(px(0), py(1));
  ctx.lineTo(px(1), py(1));
  ctx.quadraticCurveTo(px(0.92), py(0.3), px(0.22), py(0));
  ctx.quadraticCurveTo(px(0.42), py(0.6), px(0), py(1));
  ctx.closePath();
}

const FIN_SVG_PATH = 'M0 0.9 L1 0.9 Q0.92 0.27 0.22 0 Q0.42 0.54 0 0.9 Z';

// TEME [x, y, z] to scene coordinates (three.js is y-up)
function toScene(x, y, z) {
  return new THREE.Vector3(x / RE, z / RE, -y / RE);
}

// -----
// State
// -----

let sats = [];        // { sat, name, noradId, color, period, inclination, start, step, teme, geo, line, marker, label, ok }
let format = 'tle';
let lastTrackUpdate = 0;
let lastMapDraw = 0;
let lastTableUpdate = 0;

// --------
// 3D scene
// --------

const globeEl = document.getElementById('demo-globe');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
globeEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(2.2, 1.6, 3.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.3;
controls.maxDistance = 80;

// Stylized Earth: flat land/ocean from a land mask, thin coastlines, faint graticule. The same
// canvas is the globe texture and the 2D map background.
const earthCanvas = document.createElement('canvas');
earthCanvas.width = 2048;
earthCanvas.height = 1024;
const earthTexture = new THREE.CanvasTexture(earthCanvas);
earthTexture.colorSpace = THREE.SRGBColorSpace;
earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

async function paintEarth() {
  const mask = new Image();
  mask.src = root.dataset.earth;
  await mask.decode();
  const ctx = earthCanvas.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = earthCanvas;
  ctx.drawImage(mask, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i] / 255;                   // 0 ocean, 1 land, in between at the coast
    const edge = 1 - Math.abs(2 * a - 1);
    for (let k = 0; k < 3; k++) {
      d[i + k] = OCEAN[k] + (LAND[k] - OCEAN[k]) * a + (COAST[k] - LAND[k]) * edge;
    }
  }
  ctx.putImageData(img, 0, 0);

  ctx.strokeStyle = 'rgba(150, 175, 215, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let lon = -150; lon < 180; lon += 30) {
    const x = ((lon + 180) / 360) * w;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * h;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  earthTexture.needsUpdate = true;
  lastMapDraw = 0;
}

const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshLambertMaterial({ map: earthTexture }));
scene.add(earth);

// Soft day/night: mostly ambient, with a gentle sunlit side
scene.add(new THREE.AmbientLight(0xffffff, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
scene.add(sun);

// Atmosphere rim glow
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1.08, 64, 48),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { glow: { value: new THREE.Color('#3f6fc4') } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 glow;
      varying vec3 vNormal;
      void main() {
        float k = pow(0.78 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(glow, 1.0) * k * 1.2;
      }`,
  })
));

// Speckled star background on a distant sphere, fixed in the inertial frame. A seeded random
// generator keeps the same sky on every load.
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

const random = seededRandom(25544);
const dot = starDot();
for (const [count, size, minBright, maxBright] of [[5000, 1.6, 0.35, 0.65], [1000, 2.4, 0.55, 0.9], [160, 3.4, 0.8, 1.0]]) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Uniform direction on the sphere, with a slight blue/warm tint per star
    const z = 2 * random() - 1;
    const phi = 2 * Math.PI * random();
    const r = Math.sqrt(1 - z * z);
    positions.set([300 * r * Math.cos(phi), 300 * z, 300 * r * Math.sin(phi)], i * 3);
    const b = minBright + (maxBright - minBright) * random();
    const tint = random();
    colors.set([b * (tint > 0.8 ? 1.0 : 0.85), b * 0.9, b * (tint < 0.3 ? 0.8 : 1.0)], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({
    size, map: dot, vertexColors: true, sizeAttenuation: false,
    transparent: true, depthWrite: false,
  })));
}

// Name labels over the globe
const labelLayer = document.createElement('div');
labelLayer.className = 'demo-labels';
globeEl.appendChild(labelLayer);

// Fin sprite texture for one color
function finTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  finPath(ctx, 64, 120, 104, false);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = MARKER_RING;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// True if the unit-sphere Earth hides scene point p from the camera
function occluded(p) {
  const c = camera.position;
  const d = p.clone().sub(c);
  const len = d.length();
  d.divideScalar(len);
  const b = c.dot(d);
  const disc = b * b - (c.lengthSq() - 1);
  if (disc < 0) return false;
  const t = -b - Math.sqrt(disc);
  return t > 0 && t < len;
}

function resizeGlobe() {
  const w = globeEl.clientWidth;
  const h = globeEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  for (const s of sats) s.line.material.resolution.set(w, h);
}
new ResizeObserver(resizeGlobe).observe(globeEl);

// Color past samples dimmer than future ones
function trackColors(count, nowIndex, hex) {
  const c = new THREE.Color(hex);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const k = i < nowIndex ? 0.35 : 1.0;
    colors.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  return colors;
}

// Frame the camera so every orbit fits
function frameOrbits() {
  let maxR = 1.2;
  for (const s of sats.filter((x) => x.ok)) {
    for (let i = 0; i < s.teme.length; i += 3) {
      maxR = Math.max(maxR, Math.hypot(s.teme[i], s.teme[i + 1], s.teme[i + 2]) / RE);
    }
  }
  const dist = Math.min(controls.maxDistance, maxR * 2.8);

  // Look at the first satellite from slightly above its orbit plane
  const target = sats.find((s) => s.ok);
  const dir = target ? target.marker.position.clone().normalize() : new THREE.Vector3(1, 0.5, 1).normalize();
  dir.y += 0.35;
  camera.position.copy(dir.normalize().multiplyScalar(dist));
  controls.update();
}

// ------
// 2D map
// ------

const mapCanvas = document.getElementById('demo-map');
const mapCtx = mapCanvas.getContext('2d');

function resizeMap() {
  const ratio = Math.min(window.devicePixelRatio, 2);
  mapCanvas.width = Math.round(mapCanvas.clientWidth * ratio);
  mapCanvas.height = Math.round(mapCanvas.clientHeight * ratio);
  lastMapDraw = 0;
}
new ResizeObserver(resizeMap).observe(mapCanvas);

function drawNight(ctx, w, h, sunLon, sunDec) {
  // Terminator latitude for each longitude; night is on the pole facing away from the Sun
  const dec = Math.abs(sunDec) < 1e-4 ? 1e-4 : sunDec;
  const xy = (lon, lat) => [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
  ctx.beginPath();
  for (let lon = -180; lon <= 180; lon += 2) {
    const lat = Math.atan(-Math.cos((lon - sunLon) * DEG) / Math.tan(dec)) / DEG;
    const [x, y] = xy(lon, lat);
    if (lon === -180) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const poleY = dec > 0 ? h : 0;
  ctx.lineTo(w, poleY);
  ctx.lineTo(0, poleY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();
}

function drawMap(now, gmst) {
  const w = mapCanvas.width;
  const h = mapCanvas.height;
  const scale = w / 1000;
  mapCtx.clearRect(0, 0, w, h);
  mapCtx.drawImage(earthCanvas, 0, 0, w, h);

  // Night side
  const [sx, sy, sz] = sunDirection(now);
  const sunLon = ((((Math.atan2(sy, sx) - gmst) / DEG + 540) % 360) - 180);
  drawNight(mapCtx, w, h, sunLon, Math.asin(sz));

  const xy = (lat, lon) => [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];

  for (const s of sats) {
    if (!s.geo.length) continue;
    const nowIndex = Math.round((s.tNow - s.start) / s.step);
    mapCtx.lineWidth = 2 * scale;
    mapCtx.strokeStyle = s.color;
    // Split at the antimeridian and dim the past half
    for (const [from, to, alpha] of [[0, nowIndex, 0.4], [nowIndex, s.geo.length / 3 - 1, 1]]) {
      mapCtx.globalAlpha = alpha;
      mapCtx.beginPath();
      for (let i = Math.max(0, from); i <= to && i < s.geo.length / 3; i++) {
        const [x, y] = xy(s.geo[i * 3], s.geo[i * 3 + 1]);
        const jump = i > from && Math.abs(s.geo[i * 3 + 1] - s.geo[(i - 1) * 3 + 1]) > 180;
        if (i === Math.max(0, from) || jump) mapCtx.moveTo(x, y);
        else mapCtx.lineTo(x, y);
      }
      mapCtx.stroke();
    }
    mapCtx.globalAlpha = 1;

    if (s.now) {
      // Fin faces the direction of travel along the track
      const [x, y] = xy(s.now.lat, s.now.lon);
      const i = Math.min(Math.max(nowIndex, 0), s.geo.length / 3 - 2);
      const dlon = ((s.geo[(i + 1) * 3 + 1] - s.geo[i * 3 + 1] + 540) % 360) - 180;
      const size = 18 * scale;
      finPath(mapCtx, x, y + size * 0.25, size, dlon < 0);
      mapCtx.lineJoin = 'round';
      mapCtx.lineWidth = 3 * scale;
      mapCtx.strokeStyle = MARKER_RING;
      mapCtx.stroke();
      mapCtx.fillStyle = s.color;
      mapCtx.fill();

      // Name label in text ink, flipped to the left near the right edge
      const right = x < w - 160 * scale;
      mapCtx.font = `${12 * scale}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      mapCtx.textAlign = right ? 'left' : 'right';
      mapCtx.textBaseline = 'middle';
      const lx = x + (right ? 1 : -1) * size * 0.75;
      const ly = y - size * 0.35;
      mapCtx.lineWidth = 3 * scale;
      mapCtx.strokeStyle = LABEL_HALO;
      mapCtx.strokeText(s.name, lx, ly);
      mapCtx.fillStyle = LABEL_INK;
      mapCtx.fillText(s.name, lx, ly);
    }
  }
}

// -----------
// Propagation
// -----------

// Geodetic latitude/longitude/altitude of one time, via a single-sample track
function geodeticAt(sat, t) {
  const g = sat.trackGeodetic(t, t, 1);
  return g.length ? { lat: g[0], lon: g[1], alt: g[2] } : null;
}

function updateTracks(now) {
  for (const s of sats) {
    s.tNow = s.sat.minutesSinceEpoch(now);
    s.start = s.tNow - s.period;
    s.step = (2 * s.period) / TRACK_SAMPLES;
    s.teme = s.sat.trackTeme(s.start, s.start + 2 * s.period, s.step);
    s.geo = s.sat.trackGeodetic(s.start, s.start + 2 * s.period, s.step);
    for (let i = 0; i < s.teme.length; i += 3) {
      if (!physical(s.teme[i], s.teme[i + 1], s.teme[i + 2])) {
        s.teme = [];
        s.geo = [];
        break;
      }
    }

    const count = s.teme.length / 3;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = toScene(s.teme[i * 3], s.teme[i * 3 + 1], s.teme[i * 3 + 2]);
      positions.set([p.x, p.y, p.z], i * 3);
    }
    s.line.geometry.dispose();
    s.line.geometry = new LineGeometry();
    s.line.visible = count >= 2;
    if (s.line.visible) {
      s.line.geometry.setPositions(positions);
      s.line.geometry.setColors(trackColors(count, Math.round(s.period / s.step), s.color));
    }
  }
}

// Flip each fin toward its on-screen direction of travel and place its name label
function updateGlobeMarkers() {
  const w = globeEl.clientWidth;
  const h = globeEl.clientHeight;
  for (const s of sats) {
    const p = s.marker.position;
    const hidden = !s.ok || occluded(p);
    s.label.hidden = hidden;
    if (!s.ok) continue;
    const a = p.clone().project(camera);
    const b = s.ahead.clone().project(camera);
    const flip = b.x < a.x;
    s.marker.material.map.repeat.x = flip ? -1 : 1;
    s.marker.material.map.offset.x = flip ? 1 : 0;
    if (!hidden && a.z < 1) {
      s.label.style.transform = `translate(${((a.x + 1) / 2) * w + 14}px, ${((1 - a.y) / 2) * h - 24}px)`;
    } else {
      s.label.hidden = true;
    }
  }
}

function updateNow(now) {
  for (const s of sats) {
    s.tNow = s.sat.minutesSinceEpoch(now);
    try {
      const r = s.sat.propagate(s.tNow);
      s.ok = physical(r[0], r[1], r[2]);
      s.status = s.ok ? '' : 'non-physical result';
      if (s.ok) {
        s.marker.position.copy(toScene(r[0], r[1], r[2]));
        s.ahead = toScene(r[0] + 30 * r[3], r[1] + 30 * r[4], r[2] + 30 * r[5]);
      }
    } catch {
      s.ok = false;
      s.status = 'propagation failed';
    }
    s.marker.visible = s.ok;
    s.now = s.ok ? geodeticAt(s.sat, s.tNow) : null;
  }
}

// ------------
// UI and table
// ------------

const textarea = document.getElementById('demo-elements');
const message = document.getElementById('demo-message');
const tableBody = document.getElementById('demo-sats');
const clock = document.getElementById('demo-clock');

function showMessage(lines, isError) {
  message.hidden = lines.length === 0;
  message.className = 'demo-message' + (isError ? ' demo-error' : '');
  message.textContent = lines.join('\n');
}

function epochAge(epochMs) {
  const days = (Date.now() - epochMs) / 86400000;
  const text = Math.abs(days) < 1 ? `${(Math.abs(days) * 24).toFixed(1)} h` : `${Math.round(Math.abs(days))} d`;
  return days >= 0 ? `${text} ago` : `in ${text}`;
}

function buildTable() {
  tableBody.replaceChildren();
  for (const s of sats) {
    const row = document.createElement('tr');
    const cells = ['', s.name, s.noradId, epochAge(s.epoch), `${s.period.toFixed(1)} min`, `${s.inclination.toFixed(2)}°`, '', '', ''];
    for (const text of cells) {
      const td = document.createElement('td');
      td.textContent = text;
      row.appendChild(td);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1 0.9');
    svg.setAttribute('class', 'demo-swatch');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', FIN_SVG_PATH);
    path.setAttribute('fill', s.color);
    svg.appendChild(path);
    row.cells[0].appendChild(svg);
    s.row = row;
    tableBody.appendChild(row);
  }
}

function updateTable() {
  for (const s of sats) {
    const [lat, lon, alt] = [6, 7, 8].map((i) => s.row.cells[i]);
    if (s.now) {
      lat.textContent = `${s.now.lat.toFixed(2)}°`;
      lon.textContent = `${s.now.lon.toFixed(2)}°`;
      alt.textContent = `${Math.round(s.now.alt).toLocaleString()} km`;
    } else {
      lat.textContent = lon.textContent = '';
      alt.textContent = s.status;
    }
  }
}

function clearSats() {
  for (const s of sats) {
    scene.remove(s.line, s.marker);
    s.line.geometry.dispose();
    s.line.material.dispose();
    s.marker.material.map.dispose();
    s.marker.material.dispose();
    s.label.remove();
    s.sat.free();
  }
  sats = [];
}

function run() {
  const text = textarea.value.trim() || examples[format];
  const sets = splitElementSets(text);
  const notes = [];
  if (sets.length === 0) {
    showMessage(['No element sets found. Paste TLEs (two or three lines each) or OMM KVN messages.'], true);
    return;
  }
  if (sets.length > MAX_SATS) notes.push(`Showing the first ${MAX_SATS} of ${sets.length} element sets.`);

  const parsed = [];
  sets.slice(0, MAX_SATS).forEach((set, i) => {
    try {
      parsed.push(new Satellite(set));
    } catch (e) {
      notes.push(`Element set ${i + 1}: ${e.message ?? e}`);
    }
  });
  if (parsed.length === 0) {
    showMessage(notes, true);
    return;
  }

  clearSats();
  sats = parsed.map((sat, i) => {
    const color = COLORS[i % COLORS.length];
    const line = new Line2(new LineGeometry(), new LineMaterial({ linewidth: 2, vertexColors: true }));
    line.material.resolution.set(globeEl.clientWidth, globeEl.clientHeight);
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: finTexture(color), sizeAttenuation: false }));
    marker.center.set(0.5, 0.08);
    marker.scale.set(0.045, 0.045, 1);
    scene.add(line, marker);
    const name = sat.name || `Object ${sat.noradId}`;
    const label = document.createElement('div');
    label.className = 'demo-label';
    label.textContent = name;
    labelLayer.appendChild(label);
    return {
      sat, color, line, marker, label, name,
      noradId: sat.noradId,
      epoch: sat.epochUnixMs,
      period: sat.periodMinutes,
      inclination: sat.inclination,
      teme: [], geo: [],
    };
  });

  const now = Date.now();
  updateTracks(now);
  updateNow(now);
  lastTrackUpdate = now;
  lastMapDraw = 0;
  for (const s of sats.filter((x) => !x.ok)) {
    notes.push(`${s.name}: ${s.status} at the current time (epoch ${epochAge(s.epoch)}). A more recent element set should work.`);
  }
  buildTable();
  updateTable();
  frameOrbits();
  showMessage(notes, false);
}

function setFormat(next) {
  format = next;
  for (const b of root.querySelectorAll('.demo-toggle button')) {
    b.classList.toggle('active', b.dataset.format === next);
  }
  textarea.placeholder = examples[next];
  if (!textarea.value.trim()) run();
}

for (const b of root.querySelectorAll('.demo-toggle button')) {
  b.addEventListener('click', () => setFormat(b.dataset.format));
}
document.getElementById('demo-run').addEventListener('click', run);

// ---------
// Main loop
// ---------

function frame() {
  const now = Date.now();
  if (now - lastTrackUpdate > TRACK_REFRESH_MS) {
    updateTracks(now);
    lastTrackUpdate = now;
  }
  updateNow(now);

  // Earth rotation and lighting share the first satellite's GMST
  const gmst = sats.length ? sats[0].sat.gmst(sats[0].tNow) : 0;
  earth.rotation.y = gmst;
  const [sx, sy, sz] = sunDirection(now);
  sun.position.copy(toScene(sx * RE * 10, sy * RE * 10, sz * RE * 10));

  if (now - lastMapDraw > MAP_REFRESH_MS) {
    drawMap(now, gmst);
    lastMapDraw = now;
  }
  if (now - lastTableUpdate > 1000) {
    updateTable();
    clock.textContent = new Date(now).toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
    lastTableUpdate = now;
  }

  controls.update();
  updateGlobeMarkers();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

textarea.placeholder = examples.tle;
paintEarth();
resizeGlobe();
resizeMap();
run();
requestAnimationFrame(frame);
