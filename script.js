const COLORS = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E91E8C', '#FF6B6B', '#4A90D9', '#FDCB6E',
  '#A29BFE', '#00B894', '#6C5CE7', '#FD79A8', '#55EFC4'
];

// Durasi popup dalam detik — ubah angka ini untuk ganti durasi
const POPUP_DURASI = 30;

let items    = [];
let segments = [];
let history  = [];
let spinning = false;
let rotation = 0;
let popupTimeout  = null;
let popupInterval = null;

// ── Confirm Reset ──────────────────────────────────────────
function showConfirm() {
  document.getElementById('confirm-overlay').style.display = 'flex';
}

function hideConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

function doReset() {
  items    = [];
  segments = [];
  history  = [];
  spinning = false;
  rotation = 0;
  document.getElementById('inp-label').value = '';
  document.getElementById('inp-count').value = '1';
  document.getElementById('result-box').innerHTML = '<div class="sub">Klik SPIN untuk memutar roda!</div>';
  document.getElementById('btn-spin').disabled = false;
  renderItems();
  renderHistory();
  drawWheel();
  hideConfirm();
  switchTab('setup');
}

// ── Popup Selamat ──────────────────────────────────────────
function showPopup(label) {
  const durasi = POPUP_DURASI;
  document.getElementById('popup-nominal').textContent = label;
  document.getElementById('popup-timer').textContent   = 'Menutup dalam ' + durasi + ' detik...';

  const bar = document.getElementById('popup-bar');
  bar.style.transition = 'none';
  bar.style.width      = '100%';

  document.getElementById('popup-overlay').style.display = 'flex';
  spawnConfetti();

  setTimeout(() => {
    bar.style.transition = 'width ' + durasi + 's linear';
    bar.style.width      = '0%';
  }, 50);

  let remaining = durasi;
  popupInterval = setInterval(() => {
    remaining--;
    const el = document.getElementById('popup-timer');
    if (el) el.textContent = 'Menutup dalam ' + remaining + ' detik...';
    if (remaining <= 0) clearInterval(popupInterval);
  }, 1000);

  popupTimeout = setTimeout(() => closePopup(), durasi * 1000);
}

function closePopup() {
  clearTimeout(popupTimeout);
  clearInterval(popupInterval);
  document.getElementById('popup-overlay').style.display = 'none';
  document.getElementById('confetti').innerHTML = '';
}

function spawnConfetti() {
  const el = document.getElementById('confetti');
  el.innerHTML = '';
  const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#F5C842', '#E91E8C'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'c-piece';
    p.style.left              = Math.random() * 100 + '%';
    p.style.top               = '0';
    p.style.background        = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (1.5 + Math.random() * 2.5) + 's';
    p.style.animationDelay    = (Math.random() * 1) + 's';
    p.style.width             = (6 + Math.random() * 8) + 'px';
    p.style.height            = (6 + Math.random() * 8) + 'px';
    el.appendChild(p);
  }
}

// ── Format Rupiah ──────────────────────────────────────────
function formatRupiah(el) {
  const raw = el.value.replace(/\D/g, '');
  if (!raw) { el.value = ''; return; }
  el.value = parseInt(raw, 10).toLocaleString('id-ID');
}

function getRawValue() {
  return document.getElementById('inp-label').value
    .replace(/\./g, '').replace(/,/g, '').trim();
}

function getDisplayLabel(raw) {
  const num = parseInt(raw, 10);
  if (isNaN(num)) return null;
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ── Shuffle ────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Manajemen Item ─────────────────────────────────────────
function addItem() {
  const raw   = getRawValue();
  const count = parseInt(document.getElementById('inp-count').value) || 1;
  if (!raw || isNaN(parseInt(raw))) return alert('Masukkan nominal rupiah dulu!');

  const label    = getDisplayLabel(raw);
  const existing = items.findIndex(it => it.label === label);

  if (existing >= 0) {
    items[existing].count += count;
    renderItems(existing);
  } else {
    items.push({ label, count });
    renderItems();
  }

  document.getElementById('inp-label').value = '';
  document.getElementById('inp-count').value = '1';
  document.getElementById('inp-label').focus();
}

function changeCount(i, delta) {
  items[i].count += delta;
  if (items[i].count <= 0) items.splice(i, 1);
  renderItems();
}

function removeItem(i) {
  items.splice(i, 1);
  renderItems();
}

function renderItems(highlightIdx = -1) {
  const el = document.getElementById('items-list');
  document.getElementById('empty-msg').style.display = items.length ? 'none' : 'block';

  el.innerHTML = items.map((it, i) => `
    <div class="item-row" id="irow-${i}" style="${i === highlightIdx ? 'background:#E6F1FB' : ''}">
      <span class="name">
        ${it.label}
        ${i === highlightIdx ? '<span class="badge-new">+ditambah!</span>' : ''}
      </span>
      <div class="count-ctrl">
        <button class="count-btn" onclick="changeCount(${i}, -1)">−</button>
        <span class="count-num">${it.count}</span>
        <button class="count-btn" onclick="changeCount(${i}, 1)">+</button>
      </div>
      <span class="del" onclick="removeItem(${i})">✕</span>
    </div>
  `).join('');

  if (highlightIdx >= 0) {
    setTimeout(() => {
      const row = document.getElementById('irow-' + highlightIdx);
      if (row) row.style.background = '';
      renderItems();
    }, 1200);
  }
}

// ── Build Wheel ────────────────────────────────────────────
function buildWheel() {
  if (!items.length) return alert('Tambahkan minimal 1 hadiah dulu!');

  let raw = [];
  items.forEach(it => {
    for (let j = 0; j < it.count; j++) raw.push(it.label);
  });

  raw      = shuffle(raw);
  segments = raw.map((label, i) => ({ label, color: COLORS[i % COLORS.length] }));
  history  = [];
  rotation = 0;

  renderHistory();
  drawWheel();
  switchTab('spin');
}

// ── Tab ────────────────────────────────────────────────────
function switchTab(t) {
  document.querySelectorAll('.tab').forEach((el, i) =>
    el.classList.toggle('active', ['setup', 'spin'][i] === t)
  );
  document.getElementById('tab-setup').classList.toggle('active', t === 'setup');
  document.getElementById('tab-spin').classList.toggle('active',  t === 'spin');
  if (t === 'spin' && segments.length) drawWheel();
}

// ── Draw Wheel ─────────────────────────────────────────────
function drawWheel(winIdx = -1) {
  const canvas = document.getElementById('wheel');
  const ctx    = canvas.getContext('2d');
  const cx = 170, cy = 170, r = 160, n = segments.length;

  ctx.clearRect(0, 0, 340, 340);

  if (!n) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#eee';
    ctx.fill();
    ctx.fillStyle     = '#888';
    ctx.font          = '14px sans-serif';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillText('Semua hadiah sudah keluar!', cx, cy);
    document.getElementById('sisa').textContent = 'Semua hadiah sudah terbagi!';
    return;
  }

  const arc = 2 * Math.PI / n;

  segments.forEach((seg, i) => {
    const sa = rotation + i * arc;
    const ea = sa + arc;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, sa, ea);
    ctx.fillStyle = (i === winIdx) ? lighten(seg.color) : seg.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sa + arc / 2);
    ctx.textAlign    = 'right';
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold ' + (n > 10 ? 11 : 13) + 'px sans-serif';
    ctx.shadowColor  = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur   = 3;
    const maxLen = n > 10 ? 12 : 18;
    let txt = seg.label.length > maxLen ? seg.label.slice(0, maxLen - 1) + '…' : seg.label;
    ctx.fillText(txt, r - 10, 5);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
  ctx.fillStyle   = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth   = 1;
  ctx.stroke();

  document.getElementById('sisa').textContent = 'Sisa hadiah: ' + n;
}

function lighten(hex) {
  const rv = parseInt(hex.slice(1, 3), 16);
  const gv = parseInt(hex.slice(3, 5), 16);
  const bv = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, rv + 60)}, ${Math.min(255, gv + 60)}, ${Math.min(255, bv + 60)})`;
}

// ── Winner Detection ───────────────────────────────────────
function getWinnerIndex() {
  const n = segments.length;
  if (!n) return -1;
  const arc = 2 * Math.PI / n;
  const ptr = -Math.PI / 2;
  const rel = ((ptr - rotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(rel / arc) % n;
}

// ── History ────────────────────────────────────────────────
function renderHistory() {
  if (!history.length) {
    document.getElementById('history-wrap').style.display = 'none';
    return;
  }
  document.getElementById('history-wrap').style.display = 'block';
  document.getElementById('hist-list').innerHTML =
    history.map(h => `<span class="hist-chip">${h}</span>`).join('');
}

// ── Spin ───────────────────────────────────────────────────
function spin() {
  if (spinning || !segments.length) return;
  spinning = true;
  document.getElementById('btn-spin').disabled = true;
  document.getElementById('result-box').innerHTML = '<div class="sub">Sedang berputar...</div>';

  const totalSpin  = 2 * Math.PI * (6 + Math.random() * 6);
  const startRot   = rotation;
  const targetRot  = startRot - totalSpin;
  const duration   = 4500;
  const startTime  = performance.now();

  function frame(now) {
    const t    = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 4);
    rotation   = startRot + (targetRot - startRot) * ease;
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      rotation = targetRot;
      const wi     = getWinnerIndex();
      drawWheel(wi);
      const winner = segments[wi];

      document.getElementById('result-box').innerHTML =
        `<div class="winner">🎉 ${winner.label}</div><div class="sub">Hadiah sudah keluar!</div>`;

      showPopup(winner.label);

      setTimeout(() => {
        history.push(winner.label);
        segments.splice(wi, 1);
        segments = segments.map((s, i) => ({ label: s.label, color: COLORS[i % COLORS.length] }));
        renderHistory();
        drawWheel();

        if (segments.length > 0) {
          document.getElementById('btn-spin').disabled = false;
        } else {
          document.getElementById('result-box').innerHTML =
            `<div class="winner">🎊 Selesai!</div><div class="sub">Semua hadiah sudah terbagi!</div>`;
        }
        spinning = false;
      }, 1800);
    }
  }

  requestAnimationFrame(frame);
}

// ── Init ───────────────────────────────────────────────────
renderItems();
