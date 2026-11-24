/* Ước điểm — ước lượng điểm học phần theo thang điểm UET.
   Mỗi môn có các đầu điểm (trọng số %), mỗi đầu điểm có nhiều bài; điểm một đầu điểm là
   trung bình các bài trong nó. Điểm học phần = Σ trọng số × điểm đầu điểm, làm tròn 1 chữ số. */
(() => {
  'use strict';

  const KEY = 'uoc-diem-uet-v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const G = window.gsap || null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animOn = () => !!G && !reduce;

  /* ---------- UET scale ---------- */
  const LETTERS = [
    { l: 'A+', min: 9.0, g: 4.0 },
    { l: 'A', min: 8.5, g: 3.7 },
    { l: 'B+', min: 8.0, g: 3.5 },
    { l: 'B', min: 7.0, g: 3.0 },
    { l: 'C+', min: 6.5, g: 2.5 },
    { l: 'C', min: 5.5, g: 2.0 },
    { l: 'D+', min: 5.0, g: 1.5 },
    { l: 'D', min: 4.0, g: 1.0 },
    { l: 'F', min: 0, g: 0 },
  ];
  const BANDS = LETTERS.slice().reverse().map((L, i, arr) => ({ ...L, lo: L.min, hi: i < arr.length - 1 ? arr[i + 1].min : 10 }));
  const RANKS = [
    { name: 'Xuất sắc', min: 3.6 },
    { name: 'Giỏi', min: 3.2 },
    { name: 'Khá', min: 2.5 },
    { name: 'Trung bình', min: 2.0 },
    { name: 'Yếu', min: 0 },
  ];
  const r1 = (v) => Math.round(v * 10 + 1e-9) / 10;
  const ceil1 = (v) => Math.ceil(v * 10 - 1e-9) / 10;
  const letterOf = (v) => LETTERS.find((L) => r1(v) >= L.min - 1e-9);
  const rankOf = (gpa) => RANKS.find((R) => gpa >= R.min - 1e-9);
  const f1 = (v) => (v == null ? '—' : r1(v).toFixed(1));
  const f2 = (v) => (v == null ? '—' : (Math.round(v * 100 + 1e-9) / 100).toFixed(2));
  const fScore = (v) => (v == null ? '' : String(Math.round(v * 100) / 100));
  const fW = (v) => String(Math.round((v || 0) * 100) / 100);

  /* ---------- Data ---------- */
  const mkComp = (name, weight, items) => ({
    id: uid(), name, weight,
    items: items.map(([label, score]) => ({ id: uid(), label, score })),
  });
  const mkCourse = (name, code, credits, comps, id) => ({ id: id || uid(), name, code, credits, assume: null, comps });

  function sampleState() {
    return {
      semester: 'Học kì I · 2026–2027',
      courses: [
        mkCourse('Cấu trúc dữ liệu và giải thuật', 'INT2210', 4, [
          mkComp('Chuyên cần', 10, [['Điểm danh', 9]]),
          mkComp('Bài tập', 10, [['Tuần 3', 8], ['Tuần 6', 9.5], ['Tuần 9', 7], ['Tuần 12', null]]),
          mkComp('Giữa kì', 20, [['Bài thi', 7.5]]),
          mkComp('Cuối kì', 60, [['Bài thi', null]]),
        ], 'ctdl'),
        mkCourse('Xác suất thống kê', 'MAT1101', 3, [
          mkComp('Chuyên cần', 10, [['Điểm danh', 10]]),
          mkComp('Giữa kì', 30, [['Bài thi', 6.5]]),
          mkComp('Cuối kì', 60, [['Bài thi', null]]),
        ], 'xstk'),
        mkCourse('Lập trình hướng đối tượng', 'INT2204', 3, [
          mkComp('Chuyên cần', 10, [['Điểm danh', 10]]),
          mkComp('Bài tập', 10, [['Lab 1', 9], ['Lab 2', 8.5], ['Lab 3', null]]),
          mkComp('Bài tập lớn', 20, [['Demo', null]]),
          mkComp('Cuối kì', 60, [['Bài thi', null]]),
        ], 'oop'),
        mkCourse('Triết học Mác – Lênin', 'PHI1006', 3, [
          mkComp('Chuyên cần', 10, [['Điểm danh', 9]]),
          mkComp('Giữa kì', 30, [['Bài thi', 8]]),
          mkComp('Cuối kì', 60, [['Bài thi', 7.5]]),
        ], 'triet'),
      ],
    };
  }

  const PRESETS = [
    { title: '60 · 20 · 10 · 10', desc: 'Cuối kì, giữa kì, chuyên cần, bài tập', comps: [['Chuyên cần', 10], ['Bài tập', 10], ['Giữa kì', 20], ['Cuối kì', 60]] },
    { title: '60 · 40', desc: 'Cuối kì, giữa kì', comps: [['Giữa kì', 40], ['Cuối kì', 60]] },
    { title: '70 · 30', desc: 'Cuối kì, điểm quá trình', comps: [['Quá trình', 30], ['Cuối kì', 70]] },
    { title: 'Tự tạo', desc: 'Một đầu điểm trống, tự thêm tiếp', comps: [['Đầu điểm 1', 100]] },
  ];

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.courses)) return s;
    } catch (e) { /* storage unavailable */ }
    return sampleState();
  }
  let state = load();
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }, 150);
  }

  /* ---------- Maths ---------- */
  // total(x) = K + R·x, where x is the score assumed for every test still missing.
  function compute(c) {
    let K = 0, R = 0, known = 0, wsum = 0, nKnown = 0, sumKnown = 0;
    const comps = c.comps.map((p) => {
      const w = Number(p.weight) || 0;
      wsum += w;
      const n = p.items.length;
      const ks = p.items.filter((i) => i.score != null);
      const s = ks.reduce((a, i) => a + i.score, 0);
      nKnown += ks.length; sumKnown += s;
      if (n === 0) { R += w / 100; return { w, n, nk: 0, avg: null, contrib: 0, pending: 1 }; }
      K += (w / 100) * (s / n);
      R += (w / 100) * ((n - ks.length) / n);
      known += w * (ks.length / n);
      return { w, n, nk: ks.length, avg: ks.length ? s / ks.length : null, contrib: (w / 100) * (s / n), pending: n - ks.length };
    });
    return {
      K, R, known, wsum, comps,
      empty: c.comps.length === 0,
      complete: c.comps.length > 0 && R < 1e-9,
      meanKnown: nKnown ? sumKnown / nKnown : null,
    };
  }
  function assumeOf(c, m) {
    if (c.assume != null) return c.assume;
    return m.meanKnown != null ? Math.round(m.meanKnown * 2) / 2 : 7;
  }
  function result(c) {
    const m = compute(c);
    if (m.empty) return { m, p: null, L: null };
    const x = m.complete ? m.K : m.K + m.R * assumeOf(c, m);
    const p = r1(Math.min(10, Math.max(0, x)));
    return { m, p, L: letterOf(p) };
  }
  // Score the missing tests must average to reach a letter (with UET's 1-decimal rounding).
  function need(m, L) {
    if (m.R < 1e-9) return null;
    return (L.min - 0.05 - m.K) / m.R;
  }
  function pendingPhrase(c, m) {
    const pend = c.comps.map((p, i) => ({ p, s: m.comps[i] })).filter((x) => x.s.pending > 0);
    if (pend.length === 1 && pend[0].s.n <= 1) return { one: true, name: pend[0].p.name || 'Bài còn lại' };
    return { one: false, name: 'các bài còn lại' };
  }

  /* ---------- Routing ---------- */
  const main = $('#main');
  let view = 'overview';
  let currentId = null;
  let openEditFor = null;
  const courseById = (id) => state.courses.find((c) => c.id === id);
  const current = () => (view === 'course' ? courseById(currentId) : null);

  function route() {
    const h = location.hash;
    if (h.startsWith('#/c/') && courseById(h.slice(4))) { view = 'course'; currentId = h.slice(4); }
    else if (h === '#/scale') { view = 'scale'; currentId = null; }
    else { view = 'overview'; currentId = null; }
    render(true);
  }

  /* ---------- Nav ---------- */
  function renderNav() {
    $('#brandScope').textContent = state.semester || 'Học kì';
    $('#courseNav').innerHTML = state.courses.map((c) => {
      const { L } = result(c);
      const cur = view === 'course' && c.id === currentId;
      return `<a class="nav-item" href="#/c/${c.id}" data-navc="${c.id}"${cur ? ' aria-current="page"' : ''}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>
        <span class="nav-label">${esc(c.name || 'Môn chưa đặt tên')}</span>
        <span class="nav-meta num" data-navl="${c.id}">${L ? L.l : '—'}</span></a>`;
    }).join('');
    $$('.sidebar [data-view]').forEach((a) => {
      if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const c = current();
    $('#topbarTitle').textContent = c ? (c.name || 'Môn học') : view === 'scale' ? 'Thang điểm UET' : 'Tổng quan học kì';
    document.title = (c ? (c.name || 'Môn học') : view === 'scale' ? 'Thang điểm' : 'Tổng quan') + ' · Ước điểm UET';
  }

  /* ---------- Render ---------- */
  function render(fresh) {
    renderNav();
    if (view === 'course') main.innerHTML = courseHTML(current());
    else if (view === 'scale') main.innerHTML = scaleHTML();
    else main.innerHTML = overviewHTML();
    if (view === 'course') {
      updateCourse(current(), false);
      if (openEditFor === currentId) {
        openEditFor = null;
        const btn = main.querySelector('[data-act="edit-course"]');
        if (btn) { btn.click(); $('#fName').select(); }
      }
    }
    if (fresh && animOn()) {
      G.fromTo('.view > *', { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.28, stagger: 0.04, ease: 'power2.out', clearProps: 'opacity,transform' });
    }
  }

  const ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function courseHTML(c) {
    const bands = BANDS.map((B) => `<div class="band" data-band="${B.l}" style="left:calc(${B.lo * 10}% + 1px);width:calc(${(B.hi - B.lo) * 10}% - 2px)">${B.l}</div>`).join('');
    const ticks = [0, 4, 5, 5.5, 6.5, 7, 8, 8.5, 9, 10].map((t) => {
      const minor = ![0, 4, 7, 10].includes(t);
      return `<span class="tick num${minor ? ' minor' : ''}" style="left:${t * 10}%">${t === 0 || t === 10 ? t : t.toFixed(t % 1 ? 1 : 0)}</span>`;
    }).join('');
    return `<div class="view">
      <div class="title-row">
        <div class="title-block">
          <h1 id="cTitle">${esc(c.name || 'Môn chưa đặt tên')}</h1>
          <p class="subline num" id="cMeta">${metaText(c)}</p>
          <p class="finding" id="finding"></p>
        </div>
        <div class="title-actions">
          <button class="btn btn-secondary" type="button" data-act="edit-course" aria-expanded="false" aria-controls="editPanel">Sửa môn</button>
          <button class="btn btn-primary" type="button" data-act="add-comp">${ICON_PLUS}Thêm đầu điểm</button>
        </div>
      </div>

      <section class="panel edit-panel" id="editPanel" aria-label="Thông tin môn" hidden>
        <div class="edit-grid">
          <div class="field field-name"><label for="fName">Tên môn</label><input id="fName" data-f="name" value="${esc(c.name)}" autocomplete="off"></div>
          <div class="field"><label for="fCode">Mã môn</label><input id="fCode" data-f="code" value="${esc(c.code)}" autocomplete="off"></div>
          <div class="field"><label for="fCredits">Số tín chỉ</label><input id="fCredits" data-f="credits" inputmode="numeric" value="${esc(c.credits)}" autocomplete="off"></div>
          <div class="edit-del"><button class="btn btn-danger" type="button" data-act="del-course">Xóa môn này</button></div>
        </div>
      </section>

      <div class="lead-grid">
        <section class="panel lead" aria-labelledby="leadH">
          <div class="panel-head"><h2 id="leadH">Điểm dự kiến</h2></div>
          <div class="figs">
            <div class="fig fig-lead"><div class="fig-label">Điểm chữ</div><div class="fig-val" id="fLetter">—</div></div>
            <div class="fig"><div class="fig-label">Hệ 10</div><div class="fig-val num" id="f10">—</div></div>
            <div class="fig"><div class="fig-label">Hệ 4</div><div class="fig-val num" id="f4">—</div></div>
          </div>
          <div class="ladder" aria-hidden="true">
            <div class="ladder-track" id="track">${bands}</div>
            <div class="ladder-marker" id="lmark"><span class="lm-label num" id="lmLabel"></span></div>
          </div>
          <div class="assume" id="assumeRow">
            <label for="assume">Bài còn trống được</label>
            <input type="range" id="assume" data-f="assume" min="0" max="10" step="0.1" value="${assumeOf(c, compute(c))}">
            <output class="num" id="assumeOut" for="assume"></output>
          </div>
        </section>
        <section class="panel need" aria-labelledby="needH">
          <div class="panel-head"><h2 id="needH">Cần bao nhiêu</h2></div>
          <div id="needList"></div>
        </section>
      </div>

      <section class="panel comps" aria-labelledby="compsH">
        <div class="panel-head"><h2 id="compsH">Đầu điểm</h2><span class="panel-meta num" id="wsum"></span></div>
        <div id="compList">${compListHTML(c)}</div>
      </section>
    </div>`;
  }

  function metaText(c) {
    const parts = [];
    if (c.code) parts.push(esc(c.code));
    parts.push(`${Number(c.credits) || 0} tín chỉ`);
    return parts.join(' · ');
  }

  function compListHTML(c) {
    if (!c.comps.length) {
      return `<div class="empty">

        <div class="presets">${PRESETS.map((P, i) => `<button class="preset" type="button" data-act="preset" data-i="${i}"><b class="num">${P.title}</b><span>${P.desc}</span></button>`).join('')}</div>
      </div>`;
    }
    return c.comps.map(compHTML).join('') +
      `<div class="comps-foot"><button class="btn-text" type="button" data-act="add-comp">+ Thêm đầu điểm</button></div>`;
  }

  function compHTML(p) {
    return `<div class="comp" data-comp="${p.id}">
      <div class="comp-meta">
        <input class="in-name" data-f="cname" value="${esc(p.name)}" aria-label="Tên đầu điểm" autocomplete="off">
        <div class="comp-row"><label class="weight"><input class="num" data-f="weight" inputmode="decimal" value="${fW(p.weight)}" aria-label="Trọng số của ${esc(p.name)}" autocomplete="off"><span>%</span></label>
        <button class="link-danger" type="button" data-act="del-comp" aria-label="Xóa đầu điểm ${esc(p.name)}">Xóa</button></div>
      </div>
      <div class="items">${p.items.map(itemHTML).join('')}<button class="item-add" type="button" data-act="add-item" aria-label="Thêm bài">+</button></div>
    </div>`;
  }

  function itemHTML(it) {
    return `<div class="item${it.score == null ? ' pending' : ''}" data-item="${it.id}">
      <input class="in-label" data-f="label" value="${esc(it.label)}" aria-label="Tên bài" autocomplete="off">
      <input class="in-score num" data-f="score" inputmode="decimal" placeholder="—" value="${fScore(it.score)}" aria-label="Điểm ${esc(it.label)}" autocomplete="off">
      <button class="item-del" type="button" data-act="del-item" aria-label="Xóa ${esc(it.label)}">${ICON_X}</button>
    </div>`;
  }

  /* ---------- Course: derived values ---------- */
  function setNum(el, v, dec, animate) {
    if (!el) return;
    if (el._tw) { el._tw.kill(); el._tw = null; }
    if (v == null) { el.textContent = '—'; el.classList.add('dash'); el._v = null; return; }
    el.classList.remove('dash');
    const from = el._v;
    el._v = v;
    if (!animate || !animOn() || from == null || from === v) { el.textContent = v.toFixed(dec); return; }
    const o = { v: from };
    el._tw = G.to(o, { v, duration: 0.45, ease: 'power2.out', onUpdate: () => { el.textContent = o.v.toFixed(dec); } });
  }

  function placeLadder(m, p, animate) {
    const track = $('#track');
    if (!track) return;
    const w = track.clientWidth;
    const mark = $('#lmark');
    const show = p != null;
    mark.style.visibility = show ? 'visible' : 'hidden';
    $$('.band', track).forEach((b) => b.classList.toggle('on', show && letterOf(p).l === b.dataset.band));
    if (!show) return;
    const t = { duration: animate && animOn() ? 0.5 : 0, ease: 'power3.out', overwrite: 'auto' };
    if (G) {
      G.to(mark, { x: (p / 10) * w, ...t });
    } else {
      mark.style.transform = `translateX(${(p / 10) * w}px)`;
    }
    $('#lmLabel').textContent = p.toFixed(1);
  }

  function updateCourse(c, animate = true) {
    if (!c) return;
    const { m, p, L } = result(c);
    const x = assumeOf(c, m);

    // figures
    const letterEl = $('#fLetter');
    const prev = letterEl.textContent;
    letterEl.textContent = L ? L.l : '—';
    letterEl.classList.toggle('dash', !L);
    if (animate && animOn() && L && prev !== L.l && prev !== '—') {
      G.fromTo(letterEl, { y: -8, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(2)' });
    }
    setNum($('#f10'), p, 1, animate);
    setNum($('#f4'), L ? L.g : null, 1, animate);

    // lead meta + ladder
    placeLadder(m, p, animate);

    // assumption
    const row = $('#assumeRow'), range = $('#assume');
    const dis = m.empty || m.complete;
    row.classList.toggle('disabled', dis);
    range.disabled = dis;
    if (document.activeElement !== range) range.value = x;
    $('#assumeOut').textContent = dis ? '—' : x.toFixed(1);

    // need list
    renderNeed(c, m, p, L, animate);

    // finding
    const fd = $('#finding');
    fd.classList.remove('warn');
    if (m.empty) fd.textContent = 'Chọn cơ cấu điểm để bắt đầu.';
    else if (Math.abs(m.wsum - 100) > 1e-6) {
      fd.classList.add('warn');
      fd.textContent = `Tổng trọng số đang là ${fW(m.wsum)}%, cần đúng 100%.`;
    } else if (m.complete) {
      fd.textContent = `Đã đủ điểm: ${L.l}.`;
    } else {
      const ph = pendingPhrase(c, m);
      const idx = LETTERS.indexOf(L);
      const nextUp = idx > 0 ? LETTERS[idx - 1] : null;
      const vNext = nextUp ? need(m, nextUp) : null;
      let s = '';
      if (nextUp && vNext <= 10) {
        s += `${ph.one ? ph.name : 'Các bài còn lại'} cần ${Math.max(0, ceil1(vNext)).toFixed(1)} để lên ${nextUp.l}.`;
      } else if (!nextUp) {
        s += 'Đang ở mức A+.';
      } else {
        const best = letterOf(Math.min(10, m.K + m.R * 10));
        s += `Cao nhất có thể đạt ${best.l}.`;
      }
      fd.textContent = s;
    }

    // components
    $('#wsum').innerHTML = m.empty ? '' : Math.abs(m.wsum - 100) > 1e-6
      ? `<span class="warn-text">Tổng ${fW(m.wsum)}%</span>`
      : 'Tổng 100%';
    c.comps.forEach((pc, i) => {
      const el = main.querySelector(`[data-comp="${pc.id}"]`);
      if (!el) return;
      const s = m.comps[i];
      void s;
    });

    // nav letter
    const nl = document.querySelector(`[data-navl="${c.id}"]`);
    if (nl) nl.textContent = L ? L.l : '—';
  }

  function renderSplit(c, m) {
    const box = $('#split');
    if (!box) return;
    if (m.empty) { box.innerHTML = ''; return; }
    const scale = Math.max(100, m.wsum);
    box.innerHTML = c.comps.map((p, i) => {
      const s = m.comps[i];
      const max = s.w / 10;
      const n = Math.max(1, s.n);
      const earned = s.contrib;
      const pend = (s.w / 10) * (s.n ? s.pending / n : 1);
      const lost = Math.max(0, max - earned - pend);
      const pc = (v) => (max > 0 ? (v / max) * 100 : 0);
      return `<div class="seg" style="width:${(s.w / scale) * 100}%" title="${esc(p.name)}: ${f2(earned)} / ${f2(max)}">
        <div class="seg-bar"><i class="e" style="width:${pc(earned)}%"></i><i class="x" style="width:${pc(lost)}%"></i><i class="p" style="width:${pc(pend)}%"></i></div>
        <div class="seg-l">${esc(p.name || 'Không tên')}</div>
        <div class="seg-v">${f2(earned)}${s.w / scale >= 0.2 ? `<span class="quiet"> / ${f2(max)}</span>` : ''}</div>
      </div>`;
    }).join('');
  }

  function renderNeed(c, m, p, L, animate) {
    const box = $('#needList');
    if (m.empty) { box.innerHTML = '<p class="need-note">—</p>'; return; }
    const rows = LETTERS.filter((x) => x.l !== 'F').map((Lx) => {
      const hi = LETTERS[LETTERS.indexOf(Lx) - 1];
      const rg = `${Lx.min.toFixed(1)}${hi ? '–' + (hi.min - 0.1).toFixed(1) : '–10'}`;
      let v = '', quiet = true, val = null;
      if (m.complete) v = p >= Lx.min ? 'Đạt' : '—';
      else {
        const n = need(m, Lx);
        if (n <= 0) v = 'Đã chắc';
        else if (n > 10) v = '—';
        else { val = ceil1(n); v = val.toFixed(1); quiet = false; }
      }
      const isCur = L && L.l === Lx.l;
      const label = val != null ? `Đặt giả định ${v} để xem ${Lx.l}` : `${Lx.l}: ${v}`;
      return `<button type="button" class="need-row${isCur ? ' is-current' : ''}" ${val != null ? `data-act="set-assume" data-v="${val}"` : 'disabled'} aria-label="${label}">
        <span class="l">${Lx.l}</span><span class="v num${quiet ? ' quiet' : ''}">${v}</span></button>`;
    }).join('');
    box.innerHTML = rows;
    if (animate && animOn()) {
      const cur = box.querySelector('.is-current');
      if (cur && box._lastCur !== (L && L.l)) G.fromTo(cur, { backgroundColor: '#dfe3ea' }, { backgroundColor: '#eeeeee', duration: 0.6, ease: 'power1.out', clearProps: 'backgroundColor' });
    }
    box._lastCur = L && L.l;
  }

  /* ---------- Overview ---------- */
  function overviewHTML() {
    if (!state.courses.length) {
      return `<div class="view">
        <div class="title-row"><div class="title-block"><h1>Tổng quan học kì</h1><p class="subline">${esc(state.semester)}</p></div></div>
        <section class="panel first-run" aria-labelledby="frH">
          <div class="panel-head"><h2 id="frH">Chưa có môn nào</h2></div>
          <p>Thêm từng môn của học kì, nhập cơ cấu điểm theo đề cương và điểm các bài đã có. Trang sẽ tính điểm dự kiến và GPA cho bạn.</p>
          <div class="actions"><button class="btn btn-primary" type="button" data-act="new-course">${ICON_PLUS}Thêm môn đầu tiên</button><button class="btn btn-secondary" type="button" data-act="load-sample">Dùng dữ liệu mẫu</button></div>
        </section>
      </div>`;
    }
    const rows = state.courses.map((c) => ({ c, ...result(c) }));
    const graded = rows.filter((r) => r.L && (Number(r.c.credits) || 0) > 0);
    const cred = graded.reduce((a, r) => a + Number(r.c.credits), 0);
    const gpa = cred ? graded.reduce((a, r) => a + Number(r.c.credits) * r.L.g, 0) / cred : null;
    const avg10 = cred ? graded.reduce((a, r) => a + Number(r.c.credits) * r.p, 0) / cred : null;
    const done = rows.filter((r) => r.m.complete).length;
    const waiting = rows.length - done;
    const rank = gpa != null ? rankOf(Math.round(gpa * 100) / 100) : null;
    const totalCred = state.courses.reduce((a, c) => a + (Number(c.credits) || 0), 0);

    const mini = (r) => {
      if (!r.L) return '<span class="quiet">—</span>';
      const seams = BANDS.map((B) => `<i style="left:calc(${B.lo * 10}% + 1px);width:calc(${(B.hi - B.lo) * 10}% - 2px)"></i>`).join('');
      return `<div class="mini" aria-hidden="true">${seams}<span class="mini-mark" style="left:${r.p * 10}%"></span></div>`;
    };
    const tr = rows.map((r) => {
      const cr = Number(r.c.credits) || 0;
      const knownTxt = r.m.empty ? '—' : r.m.complete ? 'Đủ điểm' : `${Math.round(r.m.known)}%`;
      return `<tr data-go="${r.c.id}">
        <td class="td-name"><a class="c-name" href="#/c/${r.c.id}">${esc(r.c.name || 'Môn chưa đặt tên')}</a>${r.c.code ? `<span class="c-code">${esc(r.c.code)}</span>` : ''}</td>
        <td class="num hide-sm">${cr}</td>
        <td class="num hide-sm">${f1(r.p)}</td>
        <td class="td-letter t-letter num">${r.L ? r.L.l : '<span class="quiet">—</span>'}</td>
        <td class="td-sub num">${cr} tín chỉ · ${f1(r.p)}</td>
      </tr>`;
    }).join('');

    return `<div class="view">
      <div class="title-row">
        <div class="title-block">
          <h1>Tổng quan học kì</h1>
          <p class="subline">${esc(state.semester)}</p>
        </div>
        <div class="title-actions"><button class="btn btn-primary" type="button" data-act="new-course">${ICON_PLUS}Thêm môn</button></div>
      </div>
      <section class="panel kpis" aria-label="Chỉ số học kì">
        <div class="kpi lead"><div class="fig-label">GPA dự kiến</div><div class="fig-val num">${gpa != null ? gpa.toFixed(2) : '—'}</div><div class="kpi-sub">${rank ? rank.name : ''}</div></div>
        <div class="kpi"><div class="fig-label">Hệ 10</div><div class="fig-val num">${avg10 != null ? avg10.toFixed(2) : '—'}</div></div>
        <div class="kpi"><div class="fig-label">Tín chỉ</div><div class="fig-val num">${totalCred}</div></div>
      </section>
      <section class="panel" aria-labelledby="coursesH">
        <div class="panel-head"><h2 id="coursesH">Các môn</h2></div>
        <table class="table courses">
          <thead><tr><th>Môn</th><th class="num">Tín chỉ</th><th class="num">Hệ 10</th><th class="num">Chữ</th></tr></thead>
          <tbody>${tr}</tbody>
        </table>
      </section>
    </div>`;
  }

  /* ---------- Scale ---------- */
  function scaleHTML() {
    const rows = LETTERS.map((L, i) => {
      const hi = LETTERS[i - 1];
      const rg = L.l === 'F' ? '< 4.0' : `${L.min.toFixed(1)} – ${hi ? (hi.min - 0.1).toFixed(1) : '10.0'}`;
      const group = i === 0 ? `<td class="group-cell" rowspan="8">Đạt</td>` : L.l === 'F' ? '<td class="group-cell">Không đạt</td>' : '';
      return `<tr>${group}<td class="num">${rg}</td><td class="t-letter">${L.l}</td><td class="num">${L.g.toFixed(1)}</td></tr>`;
    }).join('');
    const ranks = RANKS.map((R, i) => {
      const hi = RANKS[i - 1];
      return `<tr><td>${R.name}</td><td class="num">${R.min === 0 ? '< 2.00' : `${R.min.toFixed(2)} – ${hi ? (hi.min - 0.01).toFixed(2) : '4.00'}`}</td></tr>`;
    }).join('');
    return `<div class="view">
      <div class="title-row"><div class="title-block">
        <h1>Thang điểm UET</h1>
      </div></div>
      <section class="panel scale-grid" aria-label="Bảng quy đổi">
        <div>
          <div class="panel-head"><h2 id="scH">Điểm học phần</h2></div>
          <table class="table plain">
            <thead><tr><th>Loại</th><th class="num">Hệ 10</th><th>Điểm chữ</th><th class="num">Hệ 4</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div>
          <div class="panel-head"><h2 id="rkH">Xếp loại theo GPA</h2></div>
          <table class="table plain">
            <thead><tr><th>Xếp loại</th><th class="num">GPA hệ 4</th></tr></thead>
            <tbody>${ranks}</tbody>
          </table>
        </div>
      </section>
    </div>`;
  }

  /* ---------- Undo toast ---------- */
  let undoSnap = null, toastTimer = 0;
  function toast(text, snap) {
    undoSnap = snap;
    const t = $('#toast');
    $('#toastText').textContent = text;
    $('#toastUndo').hidden = !snap;
    t.hidden = false;
    if (animOn()) G.fromTo(t, { y: 16, opacity: 0, xPercent: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 6000);
  }
  function hideToast() {
    const t = $('#toast');
    if (t.hidden) return;
    const done = () => { t.hidden = true; undoSnap = null; };
    if (animOn()) G.to(t, { y: 16, opacity: 0, duration: 0.2, onComplete: done }); else done();
  }
  $('#toastUndo').addEventListener('click', () => {
    if (!undoSnap) return;
    state = JSON.parse(undoSnap.state);
    save();
    if (undoSnap.hash && location.hash !== undoSnap.hash) location.hash = undoSnap.hash; else route();
    hideToast();
  });
  const snapshot = () => ({ state: JSON.stringify(state), hash: location.hash });

  /* ---------- Parsing ---------- */
  function parseNum(s, min, max) {
    const t = String(s).trim().replace(',', '.');
    if (t === '') return null;
    if (!/^\d+(\.\d*)?$|^\.\d+$/.test(t)) return undefined;
    const n = parseFloat(t);
    if (n < min || n > max) return undefined;
    return n;
  }

  /* ---------- Events ---------- */
  main.addEventListener('input', (e) => {
    const t = e.target;
    const f = t.dataset.f;
    if (!f) return;
    const c = current();
    if (!c) return;
    const compEl = t.closest('[data-comp]');
    const pc = compEl ? c.comps.find((x) => x.id === compEl.dataset.comp) : null;
    const itemEl = t.closest('[data-item]');
    const it = pc && itemEl ? pc.items.find((x) => x.id === itemEl.dataset.item) : null;

    switch (f) {
      case 'score': {
        const v = parseNum(t.value, 0, 10);
        itemEl.classList.toggle('invalid', v === undefined);
        t.setAttribute('aria-invalid', String(v === undefined));
        if (v === undefined) return;
        it.score = v;
        itemEl.classList.toggle('pending', v == null);
        break;
      }
      case 'label':
        it.label = t.value;
        t.nextElementSibling.setAttribute('aria-label', `Điểm ${t.value}`);
        save(); return;
      case 'cname':
        pc.name = t.value; save(); updateCourse(c); return;
      case 'weight': {
        const v = parseNum(t.value, 0, 100);
        t.closest('.weight').classList.toggle('invalid', v === undefined);
        if (v === undefined) return;
        pc.weight = v ?? 0;
        break;
      }
      case 'assume':
        c.assume = Number(t.value);
        break;
      case 'name':
        c.name = t.value;
        $('#cTitle').textContent = c.name || 'Môn chưa đặt tên';
        renderNav(); save(); return;
      case 'code':
        c.code = t.value.trim(); $('#cMeta').innerHTML = metaText(c); save(); return;
      case 'credits': {
        const v = parseNum(t.value, 0, 30);
        if (v === undefined || (v != null && v % 1)) return;
        c.credits = v ?? 0; $('#cMeta').innerHTML = metaText(c); save(); return;
      }
      default: return;
    }
    save();
    updateCourse(c);
  });

  // tidy the shown value of a field when it loses focus
  main.addEventListener('focusout', (e) => {
    const t = e.target;
    const c = current();
    if (!c || !t.dataset || !t.dataset.f) return;
    const compEl = t.closest('[data-comp]');
    const pc = compEl ? c.comps.find((x) => x.id === compEl.dataset.comp) : null;
    if (t.dataset.f === 'score') {
      const it = pc.items.find((x) => x.id === t.closest('[data-item]').dataset.item);
      t.value = fScore(it.score);
      t.closest('.item').classList.remove('invalid');
      t.setAttribute('aria-invalid', 'false');
    } else if (t.dataset.f === 'weight') {
      t.value = fW(pc.weight);
      t.closest('.weight').classList.remove('invalid');
    } else if (t.dataset.f === 'credits') {
      t.value = c.credits;
    }
  });

  // Enter in a score jumps to the next score
  main.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.dataset.f !== 'score') return;
    e.preventDefault();
    const all = $$('.in-score', main);
    const next = all[all.indexOf(e.target) + 1];
    if (next) { next.focus(); next.select(); } else e.target.blur();
  });

  main.addEventListener('click', (e) => {
    const goRow = e.target.closest('tr[data-go]');
    if (goRow && !e.target.closest('a')) { location.hash = `#/c/${goRow.dataset.go}`; return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const c = current();
    const compEl = b.closest('[data-comp]');
    const pc = c && compEl ? c.comps.find((x) => x.id === compEl.dataset.comp) : null;

    if (act === 'new-course') return addCourse();
    if (act === 'load-sample') { state = sampleState(); save(); location.hash = '#/overview'; route(); return; }
    if (!c) return;

    switch (act) {
      case 'edit-course': {
        const panel = $('#editPanel');
        const open = panel.hidden;
        panel.hidden = !open;
        b.setAttribute('aria-expanded', String(open));
        b.textContent = open ? 'Xong' : 'Sửa môn';
        if (open) {
          if (animOn()) G.fromTo(panel, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
          $('#fName').focus();
        }
        break;
      }
      case 'del-course': {
        const snap = snapshot();
        state.courses = state.courses.filter((x) => x.id !== c.id);
        save();
        location.hash = '#/overview';
        toast(`Đã xóa môn “${c.name || 'chưa đặt tên'}”`, snap);
        break;
      }
      case 'preset': {
        const P = PRESETS[Number(b.dataset.i)];
        c.comps = P.comps.map(([n, w]) => mkComp(n, w, [['Bài 1', null]]));
        save();
        $('#compList').innerHTML = compListHTML(c);
        updateCourse(c);
        if (animOn()) G.from('#compList .comp', { opacity: 0, y: 10, duration: 0.3, stagger: 0.05, ease: 'power2.out', clearProps: 'opacity,transform' });
        const first = $('#compList .in-score');
        if (first) first.focus();
        break;
      }
      case 'add-comp': {
        const m = compute(c);
        const p = mkComp('Đầu điểm mới', Math.max(0, Math.round((100 - m.wsum) * 100) / 100), [['Bài 1', null]]);
        const wasEmpty = !c.comps.length;
        c.comps.push(p);
        save();
        if (wasEmpty) $('#compList').innerHTML = compListHTML(c);
        else $('#compList .comps-foot').insertAdjacentHTML('beforebegin', compHTML(p));
        updateCourse(c);
        const el = main.querySelector(`[data-comp="${p.id}"]`);
        if (animOn()) G.from(el, { opacity: 0, y: 12, duration: 0.35, ease: 'power2.out', clearProps: 'opacity,transform' });
        el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        const nameIn = el.querySelector('.in-name');
        nameIn.focus({ preventScroll: true }); nameIn.select();
        break;
      }
      case 'add-item': {
        const it = { id: uid(), label: `Bài ${pc.items.length + 1}`, score: null };
        pc.items.push(it);
        save();
        b.insertAdjacentHTML('beforebegin', itemHTML(it));
        const el = b.previousElementSibling;
        if (animOn()) G.from(el, { opacity: 0, scale: 0.94, duration: 0.3, ease: 'back.out(1.7)', clearProps: 'opacity,transform' });
        el.querySelector('.in-score').focus();
        updateCourse(c);
        break;
      }
      case 'del-item': {
        const itemEl = b.closest('[data-item]');
        const it = pc.items.find((x) => x.id === itemEl.dataset.item);
        const snap = snapshot();
        pc.items = pc.items.filter((x) => x !== it);
        save();
        const finish = () => { itemEl.remove(); updateCourse(c); };
        if (animOn()) G.to(itemEl, { opacity: 0, scale: 0.92, duration: 0.18, ease: 'power2.in', onComplete: finish }); else finish();
        toast(`Đã xóa “${it.label || 'bài'}”`, snap);
        break;
      }
      case 'del-comp': {
        const snap = snapshot();
        c.comps = c.comps.filter((x) => x !== pc);
        save();
        const finish = () => {
          if (!c.comps.length) $('#compList').innerHTML = compListHTML(c); else compEl.remove();
          updateCourse(c);
        };
        if (animOn()) G.to(compEl, { opacity: 0, x: -12, duration: 0.2, ease: 'power2.in', onComplete: finish }); else finish();
        toast(`Đã xóa đầu điểm “${pc.name || 'không tên'}”`, snap);
        break;
      }
      case 'set-assume': {
        c.assume = Number(b.dataset.v);
        save();
        updateCourse(c);
        break;
      }
      default:
    }
  });

  function addCourse() {
    const c = mkCourse('Môn mới', '', 3, []);
    state.courses.push(c);
    save();
    openEditFor = c.id;
    location.hash = `#/c/${c.id}`;
    closeNav();
  }
  $('#addCourse').addEventListener('click', addCourse);

  $('#resetData').addEventListener('click', () => {
    const snap = snapshot();
    state = sampleState();
    save();
    closeNav();
    if (location.hash !== '#/overview') location.hash = '#/overview'; else route();
    toast('Đã nạp lại dữ liệu mẫu', snap);
  });

  /* ---------- Phone nav ---------- */
  const menuBtn = $('#menuBtn');
  function closeNav() {
    document.body.classList.remove('nav-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Mở menu');
  }
  menuBtn.addEventListener('click', () => {
    const open = !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    if (open && animOn()) G.fromTo('#sidebar', { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'opacity,transform' });
  });
  $('#sidebar').addEventListener('click', (e) => { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

  /* ---------- Boot ---------- */
  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { const c = current(); if (c) { const { m, p } = result(c); placeLadder(m, p, false); } }, 80);
  });
  window.addEventListener('hashchange', () => { main.focus({ preventScroll: true }); window.scrollTo(0, 0); route(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { const c = current(); if (c) { const { m, p } = result(c); placeLadder(m, p, false); } });
  route();
})();
