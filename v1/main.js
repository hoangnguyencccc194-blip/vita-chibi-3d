import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

// ---------- state ----------
const DEF = { eyeSize:1, eyeGap:1, eyeY:0, eyeTilt:0.08, pupil:1, eyeOpen:1, browY:0, browAng:0,
  smile:0.35, mouthOpen:0, pout:0, cheek:0.2, blush:0.35, headW:1, round:1, faceLen:1, chin:0.3 };
const SLIDERS = {
  'Mắt': [
    ['eyeSize','Cỡ mắt',0.7,1.45],['eyeGap','Khoảng cách mắt',0.8,1.25],['eyeY','Độ cao mắt',-0.12,0.12],
    ['eyeTilt','Độ nghiêng mắt',-0.35,0.35],['pupil','Cỡ đồng tử',0.4,1.8],['eyeOpen','Độ mở mắt',0.15,1],
  ],
  'Lông mày': [['browY','Độ cao mày',-1,1],['browAng','Góc mày',-1,1]],
  'Miệng & má': [
    ['smile','Cười ↔ mếu',-1,1],['mouthOpen','Há miệng',0,1],['pout','Chu môi',0,1],
    ['cheek','Phồng má',0,1],['blush','Má hồng',0,1],
  ],
  'Khuôn mặt': [
    ['headW','Độ rộng đầu',0.86,1.18],['round','Độ tròn đầu',0,1],['faceLen','Độ dài mặt',0.86,1.2],['chin','Cằm nhọn',0,1],
  ],
};
const HAIR = [['Xám tro (Vita)','#a99d9a'],['Bạch kim','#e4e0e8'],['Vàng nhạt (Sa)','#efdcaa'],['Hồng','#f2b3c9'],['Đen','#3b3139'],['Nâu','#80604f'],['Xanh công','#3f8f8a']];
const EYES = [['Đỏ hồng (Vita)','#d0307a'],['Tím','#8a4fd0'],['Xanh','#3b7fd6'],['Lục','#2f9a6e'],['Vàng','#d9a520']];
const PRESETS = {
  'Vita mặc định': {},
  'Chibi siêu cute': { eyeSize:1.35, eyeGap:1.08, eyeY:-0.05, pupil:1.2, cheek:0.75, blush:0.7, headW:1.08, round:1, faceLen:0.9, chin:0, smile:0.6, eyeTilt:0 },
  'Thanh lịch': { eyeSize:0.92, eyeTilt:0.28, pupil:0.75, smile:0.15, cheek:0, blush:0.15, headW:0.94, faceLen:1.12, chin:0.85, browAng:-0.2, browY:0.2 },
  'Ngái ngủ': { eyeOpen:0.42, browY:-0.3, smile:0.1, mouthOpen:0.15, blush:0.5, eyeTilt:-0.12 },
  'Phản diện': { eyeTilt:0.3, pupil:0.55, browAng:0.55, smile:0.5, eyeOpen:0.75, chin:0.7, blush:0.1 },
};
const EXPR = {
  'Bình thường': [{}, {}],
  'Cười': [{ smile:0.95, mouthOpen:0.45, blush:0.6, browY:0.3 }, { happy:true }],
  'Ngạc nhiên': [{ eyeSize:1.25, pupil:0.5, mouthOpen:0.8, smile:0, pout:0.5, browY:1, browAng:-0.6 }, {}],
  'Giận dỗi': [{ browAng:0.9, browY:-0.5, pout:0.9, smile:-0.4, cheek:1, blush:0.85, eyeOpen:0.8 }, {}],
  'Nháy mắt': [{ smile:0.8, mouthOpen:0.3, blush:0.5 }, { wink:true }],
};
const target = { ...DEF }, cur = { ...DEF };
let flags = { happy:false, wink:false };
let hairColor = HAIR[0][1], eyeColor = EYES[0][1];
let faceDirty = true, geoDirty = true;

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, preserveDrawingBuffer:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 2.6; controls.maxDistance = 14; controls.rotateSpeed = 0.8;
const VIEWS = { face:{ t:new THREE.Vector3(0,-0.05,0), d:5.7 }, body:{ t:new THREE.Vector3(0,-0.85,0), d:9.6 } };
let view = 'face', viewAnim = 1;
camera.position.set(0.95, 0.15, 5.6); controls.target.copy(VIEWS.face.t); controls.update();

scene.add(new THREE.HemisphereLight(0xfff4fa, 0xb9b3d6, 1.25));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0xd8c8ff, 0.7); rim.position.set(-4, 2, -4); scene.add(rim);

// toon ramp
const ramp = new THREE.DataTexture(new Uint8Array([150,150,150,255, 215,215,215,255, 255,255,255,255]), 3, 1, THREE.RGBAFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const toon = (color, extra={}) => new THREE.MeshToonMaterial({ color, gradientMap:ramp, ...extra });

const M = {
  skin: toon(0xffe6da), hair: toon(hairColor, { side:THREE.DoubleSide }), black: toon(0x23202a), white: toon(0xf6f3ef),
  gold: toon(0xe0b45a), teal: toon(0x1f8f82, { side:THREE.DoubleSide }), green: toon(0x3aa06a, { side:THREE.DoubleSide }),
  navy: toon(0x223f9c, { side:THREE.DoubleSide }), goldS: toon(0xe9c36a, { side:THREE.DoubleSide }), tights: toon(0x5a4448),
  blackS: toon(0x23202a, { side:THREE.DoubleSide }), whiteS: toon(0xf6f3ef, { side:THREE.DoubleSide }), red: toon(0xd23a4a),
};
const outlineMat = new THREE.ShaderMaterial({
  uniforms:{ uT:{ value:0.014 }, uC:{ value:new THREE.Color(0x4a2f3f) } }, side:THREE.BackSide,
  vertexShader:`uniform float uT; void main(){ vec3 p = position + normal*uT; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);} `,
  fragmentShader:`uniform vec3 uC; void main(){ gl_FragColor = vec4(uC,1.0);} `,
});
function outline(mesh, t){ const o = new THREE.Mesh(mesh.geometry, t ? outlineMat.clone() : outlineMat); if (t) o.material.uniforms.uT.value = t; o.raycast=()=>{}; mesh.add(o); return mesh; }

const root = new THREE.Group(); scene.add(root);
const bodyG = new THREE.Group(); root.add(bodyG);
const headPivot = new THREE.Group(); headPivot.position.y = -1.05; root.add(headPivot);
const headG = new THREE.Group(); headG.position.y = 1.05; headPivot.add(headG);

// ---------- face texture ----------
const S = 1024, fc = document.createElement('canvas'); fc.width = fc.height = S;
const ctx = fc.getContext('2d');
const faceTex = new THREE.CanvasTexture(fc); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
const U = x => (x + 1) / 2 * S, V = y => (1 - y) / 2 * S;
const SKIN = '#ffe6da';
function shade(hex, f){ const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }

function drawEye(p, side, open, mode){
  const cx = U(side * 0.35 * p.eyeGap), cy = V(-0.13 + p.eyeY), s = p.eyeSize * 1.05;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(side * s, s); ctx.rotate(-p.eyeTilt);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const lash = '#2a1720';
  if (mode === 'happy') {
    ctx.strokeStyle = lash; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-66, 28); ctx.quadraticCurveTo(5, -58, 76, 20); ctx.stroke();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(70, 8); ctx.lineTo(92, -6); ctx.stroke(); ctx.restore(); return;
  }
  const d = 1 - open;
  const ls = [-74, -34 + 59*d], lc = [0, -108 + 148*d], le = [80, -52 + 72*d];
  if (open < 0.12) {
    ctx.strokeStyle = lash; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(...ls); ctx.quadraticCurveTo(...lc, ...le); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(le[0]-6, le[1]); ctx.lineTo(le[0]+14, le[1]+8); ctx.stroke(); ctx.restore(); return;
  }
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-74,-34); ctx.quadraticCurveTo(0,-108,80,-52); ctx.quadraticCurveTo(86,10,58,52); ctx.quadraticCurveTo(0,86,-58,50); ctx.quadraticCurveTo(-84,10,-74,-34); ctx.closePath(); ctx.clip();
  ctx.fillStyle = '#fffdfd'; ctx.fillRect(-100,-130,200,230);
  // iris
  const ix = 4, iy = 10, rx = 50, ry = 72;
  const g = ctx.createLinearGradient(0, iy-ry, 0, iy+ry);
  g.addColorStop(0, shade(eyeColor, 0.35)); g.addColorStop(0.45, eyeColor); g.addColorStop(1, '#ffc0dc');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ix, iy, rx, ry, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = shade(eyeColor, 0.3); ctx.lineWidth = 4; ctx.stroke();
  // pupil (Vita: yellow)
  const pr = p.pupil;
  ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.ellipse(ix, iy+4, 18*pr, 27*pr, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f0a020'; ctx.beginPath(); ctx.ellipse(ix, iy+4, 8*pr, 13*pr, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = shade(eyeColor,0.45); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(ix, iy+4, 18*pr, 27*pr, 0, 0, Math.PI*2); ctx.stroke();
  // top shadow
  const sh = ctx.createLinearGradient(0, -100, 0, 0); sh.addColorStop(0, 'rgba(80,20,50,0.55)'); sh.addColorStop(1, 'rgba(80,20,50,0)');
  ctx.fillStyle = sh; ctx.fillRect(-100, -130, 200, 130);
  // highlights
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-20, -26, 15, 19, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(28, 42, 7, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(26, -22, 5, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
  // lid skin
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.moveTo(-110,-160); ctx.lineTo(-110, ls[1]); ctx.lineTo(...ls); ctx.quadraticCurveTo(...lc, ...le); ctx.lineTo(110, le[1]); ctx.lineTo(110,-160); ctx.closePath(); ctx.fill();
  ctx.restore();
  // lashes
  ctx.strokeStyle = lash; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(...ls); ctx.quadraticCurveTo(...lc, ...le); ctx.stroke();
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(le[0]-4, le[1]); ctx.quadraticCurveTo(le[0]+12, le[1]-4, le[0]+20, le[1]-16); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(le[0]-10, le[1]+2); ctx.lineTo(le[0]+16, le[1]+6); ctx.stroke();
  if (open > 0.3) { ctx.strokeStyle = 'rgba(60,25,40,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-28, 68); ctx.quadraticCurveTo(25, 80, 58, 52); ctx.stroke(); }
  ctx.restore();
}
function drawBrow(p, side){
  const cx = U(side * 0.35 * p.eyeGap), cy = V(-0.13 + p.eyeY) - (140 + p.browY*40) * (0.6 + 0.4*p.eyeSize);
  ctx.save(); ctx.translate(cx + side*4, cy); ctx.scale(side, 1); ctx.rotate(-p.browAng*0.42);
  ctx.strokeStyle = shade(hairColor, 0.55); ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-50, 6); ctx.quadraticCurveTo(5, -12, 56, 2); ctx.stroke(); ctx.restore();
}
function drawMouth(p){
  const cx = U(0), cy = V(-0.47);
  ctx.save(); ctx.translate(cx, cy); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const s = p.smile, o = p.mouthOpen, pt = p.pout;
  const w = (36 + 10*s) * (1 - 0.55*pt);
  ctx.strokeStyle = '#6a2430';
  if (o > 0.06) {
    const top = -10*s*(1-pt), bot = 14 + 70*o + 8*s;
    ctx.fillStyle = '#9a2f42'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-w, -s*6); ctx.quadraticCurveTo(0, top, w, -s*6); ctx.quadraticCurveTo(w*0.6, bot, 0, bot*0.95); ctx.quadraticCurveTo(-w*0.6, bot, -w, -s*6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#f27f95'; ctx.beginPath(); ctx.ellipse(0, bot*0.9, w*0.6, bot*0.35, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
  } else if (pt > 0.5) {
    ctx.lineWidth = 5; ctx.fillStyle = '#e87d8e';
    ctx.beginPath(); ctx.ellipse(0, 4, 12 + 6*(1-pt), 9, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  } else {
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-w, -s*9); ctx.quadraticCurveTo(0, 16*s, w, -s*9); ctx.stroke();
  }
  ctx.restore();
}
function drawFace(blink){
  const p = cur;
  ctx.fillStyle = SKIN; ctx.fillRect(0, 0, S, S);
  // blush
  if (p.blush > 0.01) for (const side of [-1, 1]) {
    const x = U(side*0.5), y = V(-0.33), r = 95;
    const g = ctx.createRadialGradient(x, y, 5, x, y, r);
    g.addColorStop(0, `rgba(255,120,150,${0.55*p.blush})`); g.addColorStop(1, 'rgba(255,120,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r*1.1, r*0.7, 0, 0, Math.PI*2); ctx.fill();
    if (p.blush > 0.55) { ctx.strokeStyle = `rgba(230,80,110,${(p.blush-0.55)*1.6})`; ctx.lineWidth = 4; ctx.lineCap='round';
      for (let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(x+i*24-8, y+12); ctx.lineTo(x+i*24+8, y-12); ctx.stroke(); } }
  }
  // nose
  ctx.fillStyle = 'rgba(200,120,110,0.5)'; ctx.beginPath(); ctx.ellipse(U(0.01), V(-0.3), 5, 3, 0, 0, Math.PI*2); ctx.fill();
  for (const side of [-1, 1]) {
    let mode = flags.happy ? 'happy' : null;
    if (flags.wink && side === 1) mode = 'happy';
    drawEye(p, side, Math.max(0, p.eyeOpen * blink), mode);
    drawBrow(p, side);
  }
  drawMouth(p);
  // small tattoo-like beauty mark? (no) — keep clean
  faceTex.needsUpdate = true;
}

// ---------- head geometry ----------
const headGeo = new THREE.SphereGeometry(1, 72, 54);
const basePos = headGeo.attributes.position.array.slice();
{ // planar front UVs
  const uv = headGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const x = basePos[i*3], y = basePos[i*3+1], z = basePos[i*3+2];
    if (z > -0.05) uv.setXY(i, 0.5 + x*0.5, 0.5 + y*0.5); else uv.setXY(i, -0.5, -0.5);
  }
}
faceTex.wrapS = faceTex.wrapT = THREE.ClampToEdgeWrapping;
const faceRamp = new THREE.DataTexture(new Uint8Array([212,212,212,255, 236,236,236,255, 255,255,255,255]), 3, 1, THREE.RGBAFormat);
faceRamp.minFilter = faceRamp.magFilter = THREE.LinearFilter; faceRamp.needsUpdate = true;
const headMat = new THREE.MeshToonMaterial({ map:faceTex, gradientMap:faceRamp });
const head = outline(new THREE.Mesh(headGeo, headMat)); headG.add(head);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3 - 2*t); };
function deformHead(){
  const p = cur, pos = headGeo.attributes.position;
  const n = 2 + (1 - p.round) * 1.4;
  for (let i = 0; i < pos.count; i++) {
    let x = basePos[i*3], y = basePos[i*3+1], z = basePos[i*3+2];
    // squareness on lower/front face
    const w = smooth(0.35, -0.25, y) * smooth(-0.6, 0.1, z) * (1 - p.round);
    if (w > 0) { const k = 1 / Math.pow(Math.abs(x)**n + Math.abs(y)**n + Math.abs(z)**n, 1/n); const f = 1 + (k - 1) * w; x *= f; y *= f; z *= f; }
    // cheek puff
    const cg = Math.exp(-(((Math.abs(x) - 0.58)**2) + (y + 0.32)**2) / 0.05) * smooth(-0.1, 0.4, z);
    const b = 1 + p.cheek * 0.13 * cg; x *= b; y *= b; z *= b;
    // chin taper
    if (y < 0) { const t = (-y) ** 2; x *= 1 - p.chin * 0.32 * t; z *= 1 - p.chin * 0.12 * t; y *= p.faceLen * (1 + p.chin*0.08); }
    x *= p.headW;
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true; headGeo.computeVertexNormals();
}

// ---------- hair ----------
const hairG = new THREE.Group(); headG.add(hairG);
function strandGeo(L, W, T, curve = 1, sweep = 0){
  const g = new THREE.SphereGeometry(1, 10, 18); const a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    const ring = Math.sqrt(Math.max(1e-6, 1 - y*y)); const cx = ring > 1e-3 ? x / ring : 0, cz = ring > 1e-3 ? z / ring : 0;
    const t = (1 - y) / 2, s = t * L;
    const prof = Math.pow(Math.sin(Math.PI * (0.12 + 0.88*t)), 0.65) * (1 - 0.6*t) * ring ** 0.2;
    a.setXYZ(i, cx*W*prof + sweep*s*s, -s, cz*T*prof - curve*s*s/2.1);
  }
  g.computeVertexNormals(); return g;
}
function placeStrand(geo, az, el, R, roll = 0){
  const n = new THREE.Vector3(Math.sin(az)*Math.cos(el), Math.sin(el), Math.cos(az)*Math.cos(el));
  const up = new THREE.Vector3(0,1,0).sub(n.clone().multiplyScalar(n.y)).normalize().applyAxisAngle(n, roll);
  const xA = up.clone().cross(n);
  const m = outline(new THREE.Mesh(geo, M.hair), 0.01);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, up, n)); m.position.copy(n).multiplyScalar(R);
  hairG.add(m); return m;
}
// skull cap + back shell
const cap = outline(new THREE.Mesh(new THREE.SphereGeometry(1.075, 56, 30, 0, Math.PI*2, 0, Math.PI*0.36), M.hair), 0.012); hairG.add(cap);
const back = outline(new THREE.Mesh(new THREE.SphereGeometry(1.09, 56, 40, Math.PI*1.08, Math.PI*0.84, 0, Math.PI*0.78), M.hair), 0.012); hairG.add(back);
// bangs
const bangs = [[-0.95,0.62,0.3],[-0.72,0.7,0.12],[-0.48,0.72,0.06],[-0.22,0.82,-0.05],[0.02,0.86,0.04],[0.22,0.92,0.08],[0.46,0.72,-0.02],[0.7,0.66,-0.1],[0.93,0.62,-0.28]];
for (const [az, L, roll] of bangs) placeStrand(strandGeo(L, 0.22, 0.07, 1, 0), az, 1.0, 1.05, roll);
// side locks (frame the face)
for (const side of [-1, 1]) {
  placeStrand(strandGeo(1.55, 0.2, 0.08, 0.32, 0), side*1.25, 0.55, 1.03, -side*0.06);
  placeStrand(strandGeo(1.25, 0.17, 0.07, 0.36, 0), side*1.55, 0.6, 1.04, 0);
}
// long back hair curtain
{
  const pts = [[0.98,0.25],[1.12,-0.3],[1.12,-0.9],[1.0,-1.5],[0.82,-2.05],[0.0,-2.15]].map(([r,y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 40, Math.PI*0.5, Math.PI);
  const m = outline(new THREE.Mesh(g, M.hair), 0.012); m.scale.set(1, 1, 0.62); m.position.z = -0.12; hairG.add(m);
  // tips
  for (let i = -3; i <= 3; i++) { const t = placeStrand(strandGeo(0.6, 0.22, 0.08, 0, 0), Math.PI + i*0.32, -0.9, 0.1, 0); t.position.set(Math.sin(i*0.4)*0.85, -1.95, -0.15 - Math.cos(i*0.4)*0.45); t.quaternion.identity(); }
}
// ahoge
{
  const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.02,1.02,0.15), new THREE.Vector3(0.06,1.32,0.22), new THREE.Vector3(0.26,1.46,0.12), new THREE.Vector3(0.36,1.3,0.02)]);
  hairG.add(outline(new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.05, 8), M.hair), 0.01));
}
// peacock feather
function feather(scale = 1, eye = true){
  const g = new THREE.Group();
  const vane = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M.teal); vane.scale.set(0.13, 0.36, 0.02); vane.position.y = 0.36; g.add(vane);
  const vane2 = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M.green); vane2.scale.set(0.1, 0.3, 0.025); vane2.position.y = 0.33; g.add(vane2);
  if (eye) {
    const mk = (r, m, z) => { const d = new THREE.Mesh(new THREE.CircleGeometry(r, 24), m); d.position.set(0, 0.52, z); g.add(d); d.scale.y = 1.25; };
    mk(0.085, M.goldS, 0.03); mk(0.064, M.teal, 0.034); mk(0.045, M.navy, 0.038);
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24), M.goldS); b.position.set(0,0.52,-0.03); b.rotation.y = Math.PI; b.scale.y = 1.25; g.add(b);
  }
  const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.7, 6), M.goldS); quill.position.y = 0.32; g.add(quill);
  g.scale.setScalar(scale); return g;
}
{ // hair ornament on her left side
  const orn = new THREE.Group(); orn.position.set(0.72, 0.62, 0.42); orn.lookAt(1.6, 1.3, 1.1);
  for (const [r, s] of [[-0.5, 0.75], [0.0, 0.9], [0.5, 0.7]]) { const f = feather(s); f.rotation.z = r; f.position.y = -0.05; orn.add(f); }
  const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), M.gold); orn.add(outline(clasp, 0.008));
  headG.add(orn);
}
// ears + earrings
for (const side of [-1, 1]) {
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), M.skin); ear.scale.set(0.6, 1, 0.8); ear.position.set(side*0.97, -0.18, 0.02); headG.add(ear);
  const ring = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.gold); ring.position.set(side*1.0, -0.3, 0.06); headG.add(ring);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), M.teal); drop.scale.set(0.8, 1.5, 0.8); drop.position.set(side*1.01, -0.42, 0.06); headG.add(outline(drop, 0.006));
}

// ---------- body ----------
const lathe = (pts, mat, seg = 32) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r,y]) => new THREE.Vector2(r, y)), seg), mat);
const add = (m, o = 0.012) => { bodyG.add(o ? outline(m, o) : m); return m; };
add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.34, 16), M.skin)).position.y = -1.18;
add(lathe([[0.001,-1.25],[0.28,-1.29],[0.37,-1.4],[0.33,-1.6],[0.27,-1.78],[0.001,-1.8]], M.black));
add(lathe([[0.3,-1.26],[0.395,-1.38],[0.38,-1.5],[0.36,-1.54]], M.whiteS));
{ const col = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 24), M.gold); col.rotation.x = Math.PI/2; col.position.y = -1.28; add(col, 0); }
{ const tat = new THREE.Mesh(new THREE.CircleGeometry(0.03, 3), M.red); tat.position.set(0, -1.36, 0.296); tat.rotation.z = -Math.PI/2; bodyG.add(tat); }
add(lathe([[0.27,-1.74],[0.36,-1.86],[0.5,-2.15],[0.58,-2.32]], M.blackS, 40));
{ const hem = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.025, 8, 48), M.teal); hem.rotation.x = Math.PI/2; hem.position.y = -2.32; add(hem, 0);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 8, 32), M.gold); belt.rotation.x = Math.PI/2; belt.position.y = -1.76; add(belt, 0); }
for (let i = -2; i <= 2; i++) { const f = feather(1.0 - Math.abs(i)*0.1); f.rotation.set(Math.PI - 0.35, 0, i*0.28); f.position.set(i*0.16, -1.8, -0.42); bodyG.add(f); }
for (const side of [-1, 1]) {
  const leg = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.36, 6, 12), M.tights)); leg.position.set(side*0.15, -2.48, 0);
  const shoe = add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M.black)); shoe.scale.set(0.11, 0.08, 0.17); shoe.position.set(side*0.15, -2.76, 0.05);
  const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.1, 6), M.gold); heel.position.set(side*0.15, -2.79, -0.08); bodyG.add(heel);
  if (side === 1) { const strap = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 6, 20), M.white); strap.rotation.x = Math.PI/2; strap.position.set(0.15, -2.36, 0); bodyG.add(strap); }
  // arms
  const arm = new THREE.Group(); arm.position.set(side*0.36, -1.34, 0); arm.rotation.z = side*0.28; bodyG.add(arm);
  const glove = side === -1;
  const up = outline(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 6, 12), glove ? M.black : M.skin), 0.01); up.position.y = -0.24; arm.add(up);
  const hand = outline(new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), glove ? M.black : M.skin), 0.01); hand.position.y = -0.5; arm.add(hand);
  if (!glove) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 6, 18), M.white); band.rotation.x = Math.PI/2; band.position.y = -0.12; arm.add(band); }
  const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 12, 1, true), M.whiteS); sleeve.position.y = -0.06; arm.add(sleeve);
}
// peacock halo
const halo = new THREE.Group(); halo.position.set(0, -1.1, -0.85); bodyG.add(halo);
for (let i = 0; i < 13; i++) { const a = Math.PI*1.12 - i*(Math.PI*1.24/12); const f = feather(1.5); f.position.set(Math.cos(a)*1.05, Math.sin(a)*1.05, 0); f.rotation.z = a - Math.PI/2; halo.add(f); }
// shadow
{
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const c = sc.getContext('2d');
  const g = c.createRadialGradient(64,64,4,64,64,64); g.addColorStop(0,'rgba(120,60,110,0.35)'); g.addColorStop(1,'rgba(120,60,110,0)'); c.fillStyle = g; c.fillRect(0,0,128,128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(sc), transparent:true, depthWrite:false }));
  sh.rotation.x = -Math.PI/2; sh.position.y = -2.85; root.add(sh);
}

// ---------- UI ----------
const tabsEl = document.getElementById('tabs'), bodyEl = document.getElementById('body');
const inputs = {};
const TABS = ['Biểu cảm', ...Object.keys(SLIDERS), 'Màu sắc'];
function fmt(v){ return (Math.round(v*100)/100).toFixed(2); }
function syncInputs(){ for (const k in inputs) { inputs[k].i.value = target[k]; inputs[k].o.textContent = fmt(target[k]); } }
function setTarget(obj, fl){ Object.assign(target, DEF, obj); if (fl) flags = { happy:false, wink:false, ...fl }; syncInputs(); }
const pages = {};
function btnGrid(names, fn, cls){ const d = document.createElement('div'); d.className = 'grid'; for (const n of names) { const b = document.createElement('button'); b.textContent = n; b.onclick = () => { d.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); fn(n); }; if (cls) b.dataset.k = n; d.appendChild(b); } return d; }
for (const t of TABS) {
  const pg = document.createElement('div'); pg.style.display = 'none'; pages[t] = pg; bodyEl.appendChild(pg);
  const tb = document.createElement('button'); tb.textContent = t; tb.onclick = () => showTab(t); tb.dataset.tab = t; tabsEl.appendChild(tb);
  if (SLIDERS[t]) for (const [k, label, mn, mx] of SLIDERS[t]) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<label for="s_${k}">${label}</label><input id="s_${k}" type="range" min="${mn}" max="${mx}" step="0.01"><output></output>`;
    const i = row.querySelector('input'), o = row.querySelector('output');
    i.addEventListener('input', () => { target[k] = parseFloat(i.value); o.textContent = fmt(target[k]); if (k.startsWith('eye') || k === 'pupil') flags = { happy:false, wink:false }; });
    inputs[k] = { i, o }; pg.appendChild(row);
  }
}
{ const pg = pages['Biểu cảm'];
  const h1 = document.createElement('div'); h1.className = 'sub'; h1.textContent = 'Biểu cảm'; pg.appendChild(h1);
  pg.appendChild(btnGrid(Object.keys(EXPR), n => { const [o, f] = EXPR[n]; Object.assign(target, o); flags = { happy:false, wink:false, ...f }; if (n === 'Bình thường') Object.assign(target, { smile:DEF.smile, mouthOpen:0, pout:0, browAng:0, browY:0, eyeOpen:1 }); syncInputs(); }, true));
  const h2 = document.createElement('div'); h2.className = 'sub'; h2.textContent = 'Kiểu mặt có sẵn'; pg.appendChild(h2);
  pg.appendChild(btnGrid(Object.keys(PRESETS), n => setTarget(PRESETS[n], {})));
}
{ const pg = pages['Màu sắc'];
  const mk = (title, list, fn, curv) => { const h = document.createElement('div'); h.className = 'sub'; h.textContent = title; pg.appendChild(h);
    const d = document.createElement('div'); d.className = 'sw';
    for (const [n, c] of list) { const b = document.createElement('button'); b.style.background = c; b.title = n; b.setAttribute('aria-label', n); if (c === curv) b.classList.add('on');
      b.onclick = () => { d.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); fn(c); }; d.appendChild(b); }
    pg.appendChild(d); };
  mk('Màu tóc', HAIR, c => { hairColor = c; M.hair.color.set(c); faceDirty = true; }, hairColor);
  mk('Màu mắt', EYES, c => { eyeColor = c; faceDirty = true; }, eyeColor);
  const tg = document.createElement('label'); tg.className = 'tog'; tg.innerHTML = '<input type="checkbox" id="haloT" checked> Vòng lông công phía sau'; pg.appendChild(tg);
  tg.querySelector('input').onchange = e => { halo.visible = e.target.checked; };
  const tg2 = document.createElement('label'); tg2.className = 'tog'; tg2.innerHTML = '<input type="checkbox" id="animT" checked> Thở & chớp mắt'; pg.appendChild(tg2);
  tg2.querySelector('input').onchange = e => { idle = e.target.checked; };
}
let idle = true;
function showTab(t){ for (const k in pages) pages[k].style.display = k === t ? '' : 'none'; tabsEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); }
showTab('Biểu cảm'); syncInputs();
const panel = document.getElementById('panel');
document.getElementById('handle').onclick = () => { panel.classList.toggle('open'); document.getElementById('handleTxt').textContent = panel.classList.contains('open') ? 'Thu gọn ▼' : 'Chỉnh mặt ▲'; };
document.getElementById('btnReset').onclick = () => { setTarget({}, {}); hairColor = HAIR[0][1]; M.hair.color.set(hairColor); eyeColor = EYES[0][1]; faceDirty = true; document.querySelectorAll('.grid button.on').forEach(b => b.classList.remove('on')); };
document.getElementById('btnRand').onclick = () => {
  for (const t in SLIDERS) for (const [k, , mn, mx] of SLIDERS[t]) { const mid = DEF[k]; const r = Math.random(); target[k] = Math.min(mx, Math.max(mn, mid + (mn + r*(mx - mn) - mid) * 0.75)); }
  target.eyeOpen = Math.max(0.55, target.eyeOpen); flags = { happy:false, wink:false }; syncInputs();
};
const btnView = document.getElementById('btnView');
btnView.onclick = () => { view = view === 'face' ? 'body' : 'face'; viewAnim = 0; btnView.textContent = view === 'face' ? '🧍 Toàn thân' : '🙂 Cận mặt'; };
document.getElementById('btnShot').onclick = () => {
  renderer.render(scene, camera);
  canvas.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `vita-chibi-${Date.now()}.png`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }, 'image/png');
};
setTimeout(() => { const h = document.getElementById('hint'); if (h) h.style.opacity = 0; }, 4500);

// ---------- resize ----------
const stage = document.getElementById('stage');
function resize(){ const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(stage); resize();

// ---------- loop ----------
const clock = new THREE.Clock(); let nextBlink = 2, blinkT = -1, lastBlink = 1;
function tick(){
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  let changed = false;
  const k = Math.min(1, dt * 12);
  for (const key in target) { const d = target[key] - cur[key]; if (Math.abs(d) > 1e-4) { cur[key] += d * k; changed = true; } else if (d !== 0) { cur[key] = target[key]; changed = true; } }
  if (changed) { faceDirty = true; geoDirty = true; }
  let blink = 1;
  if (idle) {
    if (t > nextBlink && blinkT < 0) blinkT = 0;
    if (blinkT >= 0) { blinkT += dt; const ph = blinkT / 0.16; blink = ph < 0.5 ? 1 - ph*2 : Math.min(1, (ph - 0.5)*2); if (ph >= 1) { blinkT = -1; nextBlink = t + 2 + Math.random()*3.5; blink = 1; } }
    bodyG.scale.y = 1 + Math.sin(t*2.1)*0.012; headPivot.position.y = -1.05 + Math.sin(t*2.1)*0.015;
    headPivot.rotation.z = Math.sin(t*0.8)*0.035; headPivot.rotation.x = Math.sin(t*0.55)*0.025; halo.rotation.z = Math.sin(t*0.6)*0.03;
  }
  if (blink !== lastBlink) { faceDirty = true; lastBlink = blink; }
  if (geoDirty) { deformHead(); hairG.scale.x = cur.headW; geoDirty = false; }
  if (faceDirty) { drawFace(blink); faceDirty = false; }
  if (viewAnim < 1) {
    viewAnim = Math.min(1, viewAnim + dt*2.2); const v = VIEWS[view], e = 1 - Math.pow(1 - viewAnim, 3);
    controls.target.lerp(v.t, e*0.25 + (viewAnim === 1 ? 1 : 0));
    const dir = camera.position.clone().sub(controls.target).normalize(); const dist = camera.position.distanceTo(controls.target);
    camera.position.copy(controls.target).add(dir.multiplyScalar(dist + (v.d - dist) * (e*0.25 + (viewAnim === 1 ? 1 : 0))));
  }
  controls.update(); renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
document.getElementById('loading').remove();
window.__vita = { target, cur, flags: () => flags };
tick();
