import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { unzipSync } from 'three/addons/libs/fflate.module.js';

// ---------- official model sources (fetched at runtime from miHoYo's bilibili distribution page, not re-hosted) ----------
const SRC_PAGE = 'https://www.bilibili.com/blackboard/activity-enUvYDBdNv.html';
const OUTFITS = {
  boss: { name: 'Lữ khách cô độc (bản boss, lông công)', url: 'https://activity.hdslb.com/blackboard/static/20230804/c5a22796cbc31f5e9b4f05b38ba40c0c/8JoEqhLYe7.zip' },
  daily: { name: 'Thường phục', url: 'https://activity.hdslb.com/blackboard/static/20230804/c5a22796cbc31f5e9b4f05b38ba40c0c/IZsO11m64N.zip' },
};

// ---------- morph labels ----------
const LBL = {
  '真面目':'Mày nghiêm','怒り':'Mày giận','困る':'Mày lo lắng','困る0':'Mày lo lắng 2','困る1':'Mày lo lắng 3','困る2':'Mày lo lắng 4','にこり':'Mày vui','上':'Nhướn mày','下':'Hạ mày',
  'あ':'Miệng “A”','い':'Miệng “I”','う':'Miệng “U”','え':'Miệng “E”','お':'Miệng “O”','お1':'Miệng “O” 2','え1':'Miệng “E” 2',
  '口角上げ':'Khóe miệng cười','口角下げ':'Khóe miệng trễ','口横広げ':'Miệng kéo rộng','口横缩げ':'Miệng chụm nhỏ','ワ':'Há to “Wa”','ワ0':'Há to “Wa” 2','ワ1':'Há to “Wa” 3','邪笑':'Cười gian','にやり２':'Cười nhếch',
  'まばたき':'Nhắm mắt','笑い':'Mắt cười ^^','ウィンク':'Nháy mắt trái','ウィンク右':'Nháy mắt phải','ウィンク２':'Nháy cười trái','ｳｨﾝｸ２右':'Nháy cười phải',
  'じと目':'Mắt lườm','じと目1':'Mắt lườm 2','ｷﾘｯ':'Mắt sắc lạnh','びっくり':'Mắt ngạc nhiên','びっくり1':'Mắt ngạc nhiên 2','びっくり2':'Mắt ngạc nhiên 3',
  '眼睑下':'Mí mắt dưới','眼亮下':'Ánh mắt hạ','瞳小':'Đồng tử nhỏ','瞳縦潰れ':'Đồng tử dẹt','恐ろしい子！':'Mắt hoảng hốt','なごみ':'Mắt hiền','はちゅ目':'Mắt chấm tròn','はぅ':'Mắt > <',
  '照れ':'Má hồng (ngượng)',
};
const vn = n => { if (LBL[n]) return LBL[n]; const m = n.match(/^(.*?)(左|右)$/); if (m && LBL[m[1]]) return LBL[m[1]] + (m[2] === '左' ? ' (trái)' : ' (phải)'); return n; };
const GROUPS = {
  'Mắt': ['まばたき','笑い','なごみ','じと目','ｷﾘｯ','びっくり','瞳小','瞳縦潰れ','はぅ','はちゅ目','恐ろしい子！','ウィンク','ウィンク右','眼睑下'],
  'Lông mày': ['真面目','怒り','困る','にこり','上','下'],
  'Miệng': ['あ','い','う','え','お','口角上げ','口角下げ','口横広げ','口横缩げ','ワ','邪笑','にやり２'],
};
const BONEP = [ // [key, label, min, max, default]
  ['blush','Má hồng',0,1,0],
  ['headSize','Cỡ đầu (chibi hoá)',0.9,1.6,1],
  ['headTilt','Nghiêng đầu',-1,1,0],
  ['headTurn','Quay đầu',-1,1,0],
  ['headNod','Cúi / ngẩng',-1,1,0],
  ['lookX','Liếc trái ↔ phải',-1,1,0],
  ['lookY','Liếc lên ↕ xuống',-1,1,0],
];
const EXPR = {
  'Bình thường': {},
  'Mỉm cười': { 'なごみ':0.45, '口角上げ':0.8, 'にこり':0.5 },
  'Cười': { '笑い':1, 'にこり':0.7, 'あ':0.35, '口角上げ':0.6, blush:0.3 },
  'Ngạc nhiên': { 'びっくり':1, '瞳小':0.5, '上':0.9, 'お':0.7 },
  'Giận dỗi': { '怒り':1, 'じと目':0.45, '口角下げ':0.6, '口横缩げ':0.7, blush:0.6 },
  'Nháy mắt': { 'ウィンク２':1, '口角上げ':0.7, 'あ':0.25, 'にこり':0.5 },
  'Ngượng': { blush:1, '困る':0.7, 'なごみ':0.35, '口横缩げ':0.5, headTilt:0.35 },
  'Phản diện': { 'ｷﾘｯ':0.7, '邪笑':1, '怒り':0.25, '瞳小':0.35, headNod:-0.25 },
  'Buồn': { '困る':1, '口角下げ':0.8, 'じと目':0.3, headNod:0.3 },
  '> <': { 'はぅ':1, 'ワ':0.6, blush:0.8 },
  'Ngái ngủ': { 'まばたき':0.55, 'なごみ':0.4, 'う':0.2, headTilt:-0.3 },
};
const PRESETS = {
  'Vita mặc định': {},
  'Chibi đầu to': { headSize:1.45, 'なごみ':0.3, '口角上げ':0.5, blush:0.4 },
  'Chibi siêu cute': { headSize:1.5, 'はちゅ目':0.4, 'にこり':0.6, 'ワ':0.35, blush:0.8, headTilt:0.3 },
  'Ánh nhìn phản diện': { 'ｷﾘｯ':0.8, '邪笑':0.7, lookX:0.6, headTurn:-0.3, headNod:-0.2 },
};

// ---------- state ----------
const tgt = {}, cur = {};
for (const [k, , , , d] of BONEP) tgt[k] = cur[k] = d;
let outfit = 'boss', mesh = null, dict = {}, bones = {}, rest = {}, idle = true, hideBackFeathers = false, hideWings = true;

// ---------- three setup ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const effect = new OutlineEffect(renderer, { defaultThickness: 0.0035 });
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xb4b0b8, 3.2));
const dl = new THREE.DirectionalLight(0xffffff, 3); dl.position.set(-1, 1, 1).normalize(); scene.add(dl);
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
const controls = new OrbitControls(camera, canvas);
controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 4; controls.maxDistance = 90; controls.rotateSpeed = 0.8;
const VIEWS = { face: { t: new THREE.Vector3(0, 17.2, 0), d: 10 }, body: { t: new THREE.Vector3(0, 10.5, 0), d: 46 } };
let view = 'face', viewAnim = 1;
camera.position.set(2.2, 17.6, 9.8); controls.target.copy(VIEWS.face.t); controls.update();

// ---------- loading ----------
const ld = document.getElementById('loading'), ldTxt = document.getElementById('ldTxt'), ldBar = document.getElementById('ldBar'), ldSub = document.getElementById('ldSub');
const zipCache = {};
async function fetchZip(url) {
  const r = await fetch(url, { mode: 'cors' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const total = +r.headers.get('content-length') || 0;
  if (!r.body || !total) return new Uint8Array(await r.arrayBuffer());
  const reader = r.body.getReader(), parts = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; ldBar.style.width = Math.round(got / total * 80) + '%'; ldTxt.textContent = `Đang tải mô hình Vita… ${Math.round(got / total * 100)}%`; }
  const out = new Uint8Array(got); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
function unpack(u8) {
  const files = unzipSync(u8), out = {};
  for (const [n, data] of Object.entries(files)) {
    if (!data.length || n.endsWith('/')) continue;
    let name = n;
    if ([...n].every(c => c.charCodeAt(0) < 256)) { try { name = new TextDecoder('gbk').decode(Uint8Array.from(n, c => c.charCodeAt(0))); } catch {} }
    out[name.split('/').pop().toLowerCase()] = data;
  }
  return out;
}
let blobUrls = [];
function loadFromFiles(files) {
  return new Promise((resolve, reject) => {
    blobUrls.forEach(URL.revokeObjectURL); blobUrls = [];
    const map = {};
    const pmxNames = Object.keys(files).filter(n => n.endsWith('.pmx'));
    if (!pmxNames.length) return reject(new Error('Không thấy file .pmx trong zip'));
    const pmx = pmxNames.find(n => n.includes('薇塔')) || pmxNames.sort((a, b) => files[b].length - files[a].length)[0];
    for (const [n, d] of Object.entries(files)) {
      const type = n.endsWith('.png') ? 'image/png' : n.endsWith('.jpg') || n.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream';
      const u = URL.createObjectURL(new Blob([d], { type })); blobUrls.push(u); map[n] = u;
    }
    map['__model.pmx'] = map[pmx];
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => { if (url.startsWith('data:') || url.startsWith('blob:')) return url; const b = decodeURIComponent(url.replace(/\\/g, '/').split('/').pop()).toLowerCase(); return map[b] || url; });
    let texDone = false, model = null;
    manager.onLoad = () => { texDone = true; if (model) resolve(model); };
    new MMDLoader(manager).load('mmd/__model.pmx', m => { model = m; ldBar.style.width = '95%'; if (texDone) resolve(m); setTimeout(() => resolve(m), 4000); }, undefined, reject);
  });
}
async function loadOutfit(key, filesOverride) {
  ld.style.display = 'flex'; ld.classList.remove('err'); ldBar.style.width = '0'; ldTxt.textContent = 'Đang tải mô hình Vita…';
  try {
    let files = filesOverride;
    if (!files) { zipCache[key] = zipCache[key] || await fetchZip(OUTFITS[key].url); files = unpack(zipCache[key]); }
    ldTxt.textContent = 'Đang dựng mô hình…'; ldBar.style.width = '88%';
    const m = await loadFromFiles(files);
    outfit = key; setModel(m); ld.style.display = 'none';
  } catch (e) {
    console.warn('load failed', e);
    ld.classList.add('err'); ldTxt.textContent = 'Không tải được mô hình từ bilibili 😢';
    ldSub.innerHTML = `Lỗi: ${String(e.message || e)}<br>Bạn có thể tải file zip “薇塔” ở <a href="${SRC_PAGE}" target="_blank" rel="noopener">trang chính thức</a> rồi chọn nó ở đây:`;
  }
}
document.getElementById('zipPick').onchange = async e => { const f = e.target.files[0]; if (!f) return; await loadOutfit(outfit, unpack(new Uint8Array(await f.arrayBuffer()))); };

function setModel(m) {
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(x => { for (const k in x) if (x[k] && x[k].isTexture) x[k].dispose(); x.dispose(); }); }
  mesh = m; scene.add(mesh); dict = mesh.morphTargetDictionary || {};
  bones = {}; rest = {};
  for (const b of mesh.skeleton.bones) { bones[b.name] = b; rest[b.name] = { q: b.quaternion.clone(), s: b.scale.clone() }; }
  for (const n in dict) { if (!(n in tgt)) tgt[n] = 0; if (!(n in cur)) cur[n] = 0; }
  // relax T-pose: lower the arms
  armPose();
  mesh.updateMatrixWorld(true);
  const hp = new THREE.Vector3(); (bones['頭'] || mesh).getWorldPosition(hp);
  VIEWS.face.t.set(0, hp.y + 0.3, 0); VIEWS.body.t.set(0, hp.y * 0.6, 0);
  applyMaterialToggles(); buildUI(); syncInputs();
  if (!camInit) { camInit = true; controls.target.copy(VIEWS.face.t); camera.position.set(2.2, hp.y + 0.8, 9.8); controls.update(); }
  window.__vita.ready = true;
}
let camInit = false;
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function setBone(name, x, y, z, s) {
  const b = bones[name]; if (!b) return;
  b.quaternion.copy(rest[name].q).multiply(_q.setFromEuler(_e.set(x, y, z)));
  if (s !== undefined) b.scale.copy(rest[name].s).multiplyScalar(s);
}
const ARM = 0.6; // radians to bring arms further down from the A-pose
function armPose() { setBone('左腕', 0, 0, -ARM); setBone('右腕', 0, 0, ARM); }
function applyMaterialToggles() {
  if (!mesh) return;
  for (const m of [].concat(mesh.material)) { if (m.name === '背羽') m.visible = !hideBackFeathers; if (['羽', '羽1', '羽饰铁'].includes(m.name)) m.visible = !hideWings; }
}

// ---------- UI ----------
const tabsEl = document.getElementById('tabs'), bodyEl = document.getElementById('body');
const inputs = {};
let curTab = 'Biểu cảm';
function fmt(v) { return (Math.round(v * 100) / 100).toFixed(2); }
function syncInputs() { for (const k in inputs) for (const r of inputs[k]) { r.i.value = tgt[k]; r.o.textContent = fmt(tgt[k]); } }
function sliderRow(k, label, mn, mx, jp) {
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<label>${label}${jp ? `<small>${jp}</small>` : ''}</label><input type="range" min="${mn}" max="${mx}" step="0.01" data-k="${k}"><output></output>`;
  const i = row.querySelector('input'), o = row.querySelector('output');
  i.addEventListener('input', () => { tgt[k] = parseFloat(i.value); o.textContent = fmt(tgt[k]); for (const r of inputs[k]) if (r.i !== i) { r.i.value = i.value; r.o.textContent = o.textContent; } });
  (inputs[k] = inputs[k] || []).push({ i, o }); return row;
}
function btnGrid(names, fn) {
  const d = document.createElement('div'); d.className = 'grid';
  for (const n of names) { const b = document.createElement('button'); b.textContent = n; b.onclick = () => { document.querySelectorAll('.grid button.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); fn(n); }; d.appendChild(b); }
  return d;
}
const sub = (pg, t) => { const h = document.createElement('div'); h.className = 'sub'; h.textContent = t; pg.appendChild(h); };
function clearFace() { for (const n in dict) tgt[n] = 0; for (const [k, , , , d] of BONEP) tgt[k] = d; }
function applyCombo(o, keepBones) {
  const save = keepBones ? Object.fromEntries(BONEP.filter(([k]) => k !== 'blush').map(([k]) => [k, tgt[k]])) : null;
  clearFace(); if (save) Object.assign(tgt, save);
  for (const k in o) if (k in tgt || k in dict) tgt[k] = o[k];
  syncInputs();
}
function buildUI() {
  tabsEl.innerHTML = ''; bodyEl.innerHTML = ''; for (const k in inputs) delete inputs[k];
  const pages = {};
  const tabs = ['Biểu cảm', 'Mắt', 'Lông mày', 'Miệng', 'Má & đầu', 'Trang phục', 'Tất cả morph', 'Thông tin'];
  for (const t of tabs) {
    const pg = document.createElement('div'); pg.style.display = 'none'; pages[t] = pg; bodyEl.appendChild(pg);
    const tb = document.createElement('button'); tb.textContent = t; tb.dataset.tab = t; tb.onclick = () => show(t); tabsEl.appendChild(tb);
  }
  function show(t) { curTab = t; for (const k in pages) pages[k].style.display = k === t ? '' : 'none'; tabsEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); }
  sub(pages['Biểu cảm'], 'Biểu cảm'); pages['Biểu cảm'].appendChild(btnGrid(Object.keys(EXPR), n => applyCombo(EXPR[n], true)));
  sub(pages['Biểu cảm'], 'Kiểu có sẵn'); pages['Biểu cảm'].appendChild(btnGrid(Object.keys(PRESETS), n => applyCombo(PRESETS[n], false)));
  for (const g in GROUPS) for (const n of GROUPS[g]) if (n in dict) pages[g].appendChild(sliderRow(n, vn(n), 0, 1, n));
  for (const [k, l, mn, mx] of BONEP) pages['Má & đầu'].appendChild(sliderRow(k, l, mn, mx, k === 'blush' ? '照れ' : (k === 'headSize' ? 'xương 頭' : '')));
  { const pg = pages['Trang phục']; sub(pg, 'Chọn trang phục');
    const sel = document.createElement('select'); for (const k in OUTFITS) { const o = document.createElement('option'); o.value = k; o.textContent = OUTFITS[k].name; if (k === outfit) o.selected = true; sel.appendChild(o); }
    sel.onchange = () => loadOutfit(sel.value); pg.appendChild(sel);
    const tg = document.createElement('label'); tg.className = 'tog'; tg.innerHTML = `<input type="checkbox" ${hideBackFeathers ? '' : 'checked'}> Tà áo lông vũ trong suốt sau lưng (bản boss)`; pg.appendChild(tg);
    tg.querySelector('input').onchange = e => { hideBackFeathers = !e.target.checked; applyMaterialToggles(); };
    const tw = document.createElement('label'); tw.className = 'tog'; tw.innerHTML = `<input type="checkbox" ${hideWings ? '' : 'checked'}> Cánh lông vũ bay bên cạnh (bản boss)`; pg.appendChild(tw);
    tw.querySelector('input').onchange = e => { hideWings = !e.target.checked; applyMaterialToggles(); };
    const tg2 = document.createElement('label'); tg2.className = 'tog'; tg2.innerHTML = `<input type="checkbox" ${idle ? 'checked' : ''}> Thở & chớp mắt`; pg.appendChild(tg2);
    tg2.querySelector('input').onchange = e => { idle = e.target.checked; };
  }
  { const pg = pages['Tất cả morph']; const p = document.createElement('div'); p.className = 'info'; p.textContent = `Toàn bộ ${Object.keys(dict).length} morph khuôn mặt của mô hình (tên gốc tiếng Nhật).`; pg.appendChild(p);
    for (const n of Object.keys(dict)) pg.appendChild(sliderRow(n, vn(n), 0, 1, n)); }
  pages['Thông tin'].innerHTML = `<div class="info">
    <p><b>Mô hình:</b> Vita (薇塔) – mô hình MMD chính thức của <b>崩坏3 / Honkai Impact 3rd</b>, phát hành trong sự kiện bilibili 「裁梦启明」创作激励计划 (bản 6.9).<br>
    <b>Bản quyền mô hình:</b> 模型版权所属 miHoYo · <b>Chỉnh sửa:</b> 模型编辑：神帝宇.</p>
    <p><b>Điều khoản gốc (使用规则):</b> 允许改造，优化骨骼和刚体，重制UV · 请勿二次配布 · 请勿用于18禁作品，极端宗教宣传，血腥恐怖猎奇作品，人身攻击等 · 请勿用于商业用途 · 他人使用本模型所造成的一切不良后果，不由模型改造者与miHoYo承担.<br>
    (Được chỉnh sửa; <b>không được phân phối lại</b>; không dùng cho nội dung 18+, tôn giáo cực đoan, máu me, công kích cá nhân; <b>không dùng thương mại</b>.)</p>
    <p>Vì không được phân phối lại, trang này <b>không lưu file mô hình</b>: trình duyệt của bạn tải trực tiếp từ <a href="${SRC_PAGE}" target="_blank" rel="noopener">trang phát hành chính thức trên bilibili</a>. Đây là trang fan, phi thương mại.</p>
    <p>Vật lý tóc/váy không được mô phỏng. Bản tự dựng cũ: <a href="v1/">v1</a>.</p></div>`;
  show(tabs.includes(curTab) ? curTab : 'Biểu cảm');
}
const panel = document.getElementById('panel');
document.getElementById('handle').onclick = () => { panel.classList.toggle('open'); document.getElementById('handleTxt').textContent = panel.classList.contains('open') ? 'Thu gọn ▼' : 'Chỉnh mặt ▲'; };
document.getElementById('btnReset').onclick = () => { applyCombo({}, false); document.querySelectorAll('.grid button.on').forEach(b => b.classList.remove('on')); };
const pick = a => a[Math.floor(Math.random() * a.length)];
document.getElementById('btnRand').onclick = () => {
  const o = {};
  o[pick(['なごみ','笑い','じと目','ｷﾘｯ','びっくり','はちゅ目','ウィンク２','瞳小'])] = 0.4 + Math.random() * 0.6;
  o[pick(['真面目','怒り','困る','にこり','上','下'])] = 0.3 + Math.random() * 0.7;
  o[pick(['あ','い','う','え','お','口角上げ','口角下げ','ワ','邪笑','にやり２','口横缩げ'])] = 0.3 + Math.random() * 0.7;
  o.blush = Math.random() < 0.5 ? Math.random() : 0; o.headTilt = (Math.random() - 0.5) * 1.2; o.lookX = (Math.random() - 0.5) * 1.4; o.lookY = (Math.random() - 0.5) * 0.8;
  o.headSize = Math.random() < 0.3 ? 1.2 + Math.random() * 0.35 : 1;
  applyCombo(o, false);
};
const btnView = document.getElementById('btnView');
btnView.onclick = () => { view = view === 'face' ? 'body' : 'face'; viewAnim = 0; btnView.textContent = view === 'face' ? '🧍 Toàn thân' : '🙂 Cận mặt'; };
document.getElementById('btnShot').onclick = () => {
  effect.render(scene, camera);
  const c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height; const x = c2.getContext('2d');
  const g = x.createRadialGradient(c2.width / 2, c2.height * 0.35, 10, c2.width / 2, c2.height * 0.35, Math.max(c2.width, c2.height) * 0.8);
  g.addColorStop(0, '#fff6fb'); g.addColorStop(0.45, '#f3dcec'); g.addColorStop(1, '#d9e4f7'); x.fillStyle = g; x.fillRect(0, 0, c2.width, c2.height);
  x.drawImage(canvas, 0, 0);
  x.font = `${Math.round(11 * renderer.getPixelRatio())}px sans-serif`; x.fillStyle = 'rgba(110,60,95,.7)'; x.fillText('Model © miHoYo · 模型编辑：神帝宇 · fan-made, non-commercial', 8 * renderer.getPixelRatio(), c2.height - 8 * renderer.getPixelRatio());
  c2.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `vita-${Date.now()}.png`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }, 'image/png');
};
setTimeout(() => { const h = document.getElementById('hint'); if (h) h.style.opacity = 0; }, 5000);

// ---------- resize ----------
const stage = document.getElementById('stage');
function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(stage); resize();

// ---------- loop ----------
const clock = new THREE.Clock(); let nextBlink = 2.5, blinkT = -1;
function tick() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime, k = Math.min(1, dt * 12);
  for (const key in tgt) { const d = tgt[key] - cur[key]; cur[key] = Math.abs(d) < 1e-4 ? tgt[key] : cur[key] + d * k; }
  if (mesh) {
    let blink = 0;
    if (idle) {
      if (t > nextBlink && blinkT < 0) blinkT = 0;
      if (blinkT >= 0) { blinkT += dt; const ph = blinkT / 0.18; blink = ph < 0.5 ? ph * 2 : Math.max(0, 2 - ph * 2); if (ph >= 1) { blinkT = -1; nextBlink = t + 2 + Math.random() * 3.5; blink = 0; } }
    }
    const busyEyes = (cur['笑い'] || 0) + (cur['はぅ'] || 0) + (cur['ウィンク２'] || 0) + (cur['ウィンク'] || 0) + (cur['ウィンク右'] || 0) + (cur['ｳｨﾝｸ２右'] || 0);
    const inf = mesh.morphTargetInfluences;
    for (const n in dict) { let v = cur[n] || 0; if (n === 'まばたき' && busyEyes < 0.3) v = Math.max(v, blink); if (n === '照れ') v = Math.max(v, cur.blush); inf[dict[n]] = v; }
    const br = idle ? Math.sin(t * 2.0) : 0, sw = idle ? Math.sin(t * 0.7) : 0;
    setBone('上半身', br * 0.012, 0, sw * 0.01);
    setBone('首', 0, 0, 0);
    setBone('頭', cur.headNod * 0.35 + br * 0.01, cur.headTurn * 0.6, -cur.headTilt * 0.3 + sw * 0.02, cur.headSize);
    setBone('両目', -cur.lookY * 0.25, cur.lookX * 0.35, 0);
  }
  if (viewAnim < 1) {
    viewAnim = Math.min(1, viewAnim + dt * 2.2); const v = VIEWS[view], f = viewAnim === 1 ? 1 : 0.2;
    controls.target.lerp(v.t, f);
    const dir = camera.position.clone().sub(controls.target).normalize(), dist = camera.position.distanceTo(controls.target);
    camera.position.copy(controls.target).add(dir.multiplyScalar(dist + (v.d - dist) * f));
  }
  controls.update(); effect.render(scene, camera);
  requestAnimationFrame(tick);
}
window.__vita = { tgt, cur, get dict() { return dict; }, get mesh() { return mesh; }, get bones() { return bones; }, ready: false };
tick();
loadOutfit('boss');
