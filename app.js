'use strict';

// ── Storage ──────────────────────────────────────────────────────────────────
const DB_KEY = 'quizhar_v1';

const EXAMPLE_DECK = {
  id: 'example-marvel-rivals',
  name: 'Marvel Rivals',
  cards: [
    { front: 'What are the three roles in Marvel Rivals?', back: 'Vanguard (tank) · Duelist (DPS) · Strategist (support)' },
    { front: 'Who developed Marvel Rivals?', back: 'NetEase Games' },
    { front: 'How many players are on each team?', back: '6 players (6v6)' },
    { front: 'What triggers a Team-Up ability?', back: 'Having specific hero combinations active on the same team' },
    { front: 'Which role does Rocket Raccoon fill?', back: 'Strategist' },
    { front: 'What is the name of Doctor Strange\'s portal ability?', back: 'Pentagram of Farallah' },
    { front: 'Which hero uses Symbiote bonds to pull enemies?', back: 'Venom' },
    { front: 'What are the two primary game modes?', back: 'Convoy (escort) and Domination (point capture)' },
    { front: 'Which villain\'s time-warping powers set up the game\'s storyline?', back: 'Doctor Doom' },
    { front: 'Which Vanguard hero absorbs damage to power up a shield?', back: 'Magneto' },
  ]
};

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(DB_KEY)) || { decks: [] };
    if (!data.decks.find(d => d.id === EXAMPLE_DECK.id)) data.decks.unshift(EXAMPLE_DECK);
    return data;
  }
  catch { return { decks: [EXAMPLE_DECK] }; }
}
function save(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ── State ─────────────────────────────────────────────────────────────────────
let db = load();
let view = 'home';         // 'home' | 'deck' | 'study' | 'results'
let activeDeck = null;
let studyState = null;     // { cards, index, flipped, got, missed }

// ── Router ────────────────────────────────────────────────────────────────────
function navigate(v, deckId) {
  view = v;
  if (deckId) activeDeck = db.decks.find(d => d.id === deckId) || null;
  render();
}

// ── Render ────────────────────────────────────────────────────────────────────
const root = document.getElementById('app');

function render() {
  const header = renderHeader();
  let body;
  if (view === 'home')    body = renderHome();
  if (view === 'deck')    body = renderDeck();
  if (view === 'study')   body = renderStudy();
  if (view === 'results') body = renderResults();
  root.innerHTML = header + `<main>${body}</main>`;
  bindEvents();
}

function renderHeader() {
  const back = view !== 'home'
    ? `<button class="btn btn-ghost btn-sm" id="btn-back">← Back</button>`
    : '';
  const title = view === 'home' ? 'Quizhar'
    : view === 'deck' ? `Quizhar <span>${esc(activeDeck?.name || '')}</span>`
    : view === 'study' ? `Quizhar <span>Study</span>`
    : `Quizhar <span>Results</span>`;
  return `<header><h1>${title}</h1>${back}</header>`;
}

// Home — deck grid
function renderHome() {
  const decks = db.decks;
  const grid = decks.length === 0
    ? `<div class="empty-state">
        <div class="icon">🗂️</div>
        <p>No decks yet. Create your first one!</p>
        <button class="btn btn-primary" id="btn-new-deck">+ New Deck</button>
       </div>`
    : `<div class="deck-grid">
        ${decks.map(d => `
          <div class="deck-card" data-id="${d.id}" role="button" tabindex="0">
            <div class="deck-actions">
              <button class="btn-icon" data-action="rename" data-id="${d.id}" title="Rename">✏️</button>
              <button class="btn-icon" data-action="delete-deck" data-id="${d.id}" title="Delete">🗑️</button>
            </div>
            <h3>${esc(d.name)}</h3>
            <div class="meta">${d.cards.length} card${d.cards.length !== 1 ? 's' : ''}</div>
          </div>`).join('')}
       </div>`;

  return `
    <div class="section-header">
      <h2>My Decks</h2>
      <button class="btn btn-primary" id="btn-new-deck">+ New Deck</button>
      <button class="btn btn-ghost" id="btn-import-csv">↑ Import CSV</button>
    </div>
    <input type="file" id="csv-input" accept=".csv,text/csv" style="display:none" />
    ${grid}`;
}

// Deck view — card list
function renderDeck() {
  const d = activeDeck;
  const list = d.cards.length === 0
    ? `<div class="empty-state"><div class="icon">📝</div><p>No cards yet.</p></div>`
    : `<div class="card-list">
        ${d.cards.map((c, i) => `
          <div class="fc-item">
            <div class="fc-body">
              <div class="fc-side"><div class="fc-label">Front</div>${esc(c.front)}</div>
              <div class="fc-side"><div class="fc-label">Back</div>${esc(c.back)}</div>
            </div>
            <div class="fc-actions">
              <button class="btn-icon" data-action="edit-card" data-idx="${i}" title="Edit">✏️</button>
              <button class="btn-icon" data-action="delete-card" data-idx="${i}" title="Delete">🗑️</button>
            </div>
          </div>`).join('')}
       </div>`;

  const studyBtn = d.cards.length > 0
    ? `<button class="btn btn-success" id="btn-study">▶ Study</button>` : '';

  return `
    <div class="section-header">
      <h2>${esc(d.name)}</h2>
      ${studyBtn}
      <button class="btn btn-primary" id="btn-add-card">+ Add Card</button>
      <button class="btn btn-ghost" id="btn-import-csv-deck">↑ Import CSV</button>
      <button class="btn btn-ghost" id="btn-paste-cards">⎘ Paste</button>
    </div>
    <input type="file" id="csv-input-deck" accept=".csv,text/csv" style="display:none" />
    ${list}`;
}

// Study view
function renderStudy() {
  const s = studyState;
  const total = s.cards.length;
  const pct = Math.round((s.index / total) * 100);
  const card = s.cards[s.index];

  return `
    <div class="study-wrap">
      <div style="width:100%;max-width:480px">
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <div class="progress-text" style="display:flex;justify-content:space-between;margin-top:.4rem">
          <span>Card ${s.index + 1} of ${total}</span>
          <span>
            <span class="score-badge got">✓ ${s.got}</span>
            <span class="score-badge missed">✗ ${s.missed}</span>
          </span>
        </div>
      </div>

      <div class="flip-scene" id="flip-scene" role="button" aria-label="Flip card" tabindex="0">
        <div class="flip-card${s.flipped ? ' flipped' : ''}" id="flip-card">
          <div class="flip-face front">
            <span class="face-label">Front</span>
            <span class="face-text">${esc(card.front)}</span>
          </div>
          <div class="flip-face back">
            <span class="face-label">Back</span>
            <span class="face-text">${esc(card.back)}</span>
          </div>
        </div>
      </div>

      ${s.flipped
        ? `<div class="study-actions">
            <button class="btn btn-danger" id="btn-missed">✗ Missed</button>
            <button class="btn btn-success" id="btn-got">✓ Got it</button>
           </div>`
        : `<p class="flip-hint">Tap card to reveal answer</p>`}

      <button class="btn btn-ghost btn-sm" id="btn-end-study">End Session</button>
    </div>`;
}

// Results view
function renderResults() {
  const s = studyState;
  const total = s.got + s.missed;
  const pct = total === 0 ? 0 : Math.round((s.got / total) * 100);
  return `
    <div class="card results-card">
      <div class="big-score">${pct}%</div>
      <div class="score-label">
        ${s.got} correct · ${s.missed} missed · ${total} cards reviewed
      </div>
      <div class="results-actions">
        <button class="btn btn-primary" id="btn-restart">↺ Study Again</button>
        <button class="btn btn-ghost" id="btn-study-missed" ${s.missed === 0 ? 'disabled' : ''}>Study Missed</button>
        <button class="btn btn-ghost" id="btn-back-deck">← Back to Deck</button>
      </div>
    </div>`;
}

// ── Event Binding ─────────────────────────────────────────────────────────────
function bindEvents() {
  on('btn-back', 'click', () => {
    if (view === 'study' || view === 'results') navigate('deck');
    else navigate('home');
  });

  // Home
  on('btn-new-deck', 'click', () => showDeckModal());
  on('btn-import-csv', 'click', () => document.getElementById('csv-input')?.click());
  on('csv-input', 'change', e => handleCsvImport(e.target.files[0], null));
  qsa('[data-action="rename"]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); showDeckModal(b.dataset.id); }));
  qsa('[data-action="delete-deck"]').forEach(b =>
    b.addEventListener('click', e => { e.stopPropagation(); deleteDeck(b.dataset.id); }));
  qsa('.deck-card').forEach(card => {
    card.addEventListener('click', () => navigate('deck', card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') navigate('deck', card.dataset.id); });
  });

  // Deck
  on('btn-add-card', 'click', () => showCardModal());
  on('btn-study', 'click', startStudy);
  on('btn-import-csv-deck', 'click', () => document.getElementById('csv-input-deck')?.click());
  on('csv-input-deck', 'change', e => handleCsvImport(e.target.files[0], activeDeck));
  on('btn-paste-cards', 'click', () => showPasteModal());
  qsa('[data-action="edit-card"]').forEach(b =>
    b.addEventListener('click', () => showCardModal(parseInt(b.dataset.idx))));
  qsa('[data-action="delete-card"]').forEach(b =>
    b.addEventListener('click', () => deleteCard(parseInt(b.dataset.idx))));

  // Study
  on('flip-scene', 'click', flipCard);
  on('flip-scene', 'keydown', e => { if (e.key === ' ' || e.key === 'Enter') flipCard(); });
  on('btn-got', 'click', () => advance(true));
  on('btn-missed', 'click', () => advance(false));
  on('btn-end-study', 'click', () => { view = 'results'; render(); });

  // Results
  on('btn-restart', 'click', startStudy);
  on('btn-study-missed', 'click', studyMissed);
  on('btn-back-deck', 'click', () => navigate('deck'));
}

function on(id, ev, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(ev, fn);
}
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Deck CRUD ─────────────────────────────────────────────────────────────────
function showDeckModal(id) {
  const deck = id ? db.decks.find(d => d.id === id) : null;
  showModal(
    deck ? 'Rename Deck' : 'New Deck',
    `<div class="field"><label>Deck name</label>
     <input id="m-name" type="text" value="${esc(deck?.name || '')}" placeholder="e.g. Spanish Vocab" maxlength="80" /></div>`,
    () => {
      const name = document.getElementById('m-name')?.value.trim();
      if (!name) return toast('Enter a deck name');
      if (deck) { deck.name = name; if (activeDeck?.id === deck.id) activeDeck = deck; }
      else db.decks.push({ id: uid(), name, cards: [] });
      save(db);
      closeModal();
      render();
    }
  );
  setTimeout(() => document.getElementById('m-name')?.focus(), 50);
}

function deleteDeck(id) {
  if (!confirm('Delete this deck and all its cards?')) return;
  db.decks = db.decks.filter(d => d.id !== id);
  save(db);
  render();
  toast('Deck deleted');
}

// ── Card CRUD ─────────────────────────────────────────────────────────────────
function showCardModal(idx) {
  const editing = idx !== undefined;
  const card = editing ? activeDeck.cards[idx] : null;
  showModal(
    editing ? 'Edit Card' : 'Add Card',
    `<div class="field"><label>Front</label>
     <textarea id="m-front" placeholder="Question or term">${esc(card?.front || '')}</textarea></div>
     <div class="field"><label>Back</label>
     <textarea id="m-back" placeholder="Answer or definition">${esc(card?.back || '')}</textarea></div>`,
    () => {
      const front = document.getElementById('m-front')?.value.trim();
      const back  = document.getElementById('m-back')?.value.trim();
      if (!front || !back) return toast('Both sides required');
      if (editing) { activeDeck.cards[idx] = { front, back }; }
      else activeDeck.cards.push({ front, back });
      save(db);
      closeModal();
      render();
    }
  );
  setTimeout(() => document.getElementById('m-front')?.focus(), 50);
}

function deleteCard(idx) {
  if (!confirm('Delete this card?')) return;
  activeDeck.cards.splice(idx, 1);
  save(db);
  render();
}

// ── Study logic ───────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startStudy() {
  studyState = { cards: shuffle(activeDeck.cards), index: 0, flipped: false, got: 0, missed: 0, missedCards: [] };
  view = 'study';
  render();
}

function studyMissed() {
  studyState = { cards: shuffle(studyState.missedCards), index: 0, flipped: false, got: 0, missed: 0, missedCards: [] };
  view = 'study';
  render();
}

function flipCard() {
  studyState.flipped = !studyState.flipped;
  const fc = document.getElementById('flip-card');
  if (fc) fc.classList.toggle('flipped', studyState.flipped);
  const actions = document.querySelector('.study-actions');
  const hint = document.querySelector('.flip-hint');
  if (studyState.flipped) {
    if (hint) hint.style.display = 'none';
    if (!actions) {
      const wrap = document.querySelector('.study-wrap');
      const endBtn = document.getElementById('btn-end-study');
      const div = document.createElement('div');
      div.className = 'study-actions';
      div.innerHTML = `<button class="btn btn-danger" id="btn-missed">✗ Missed</button>
                       <button class="btn btn-success" id="btn-got">✓ Got it</button>`;
      wrap.insertBefore(div, endBtn);
      document.getElementById('btn-got').addEventListener('click', () => advance(true));
      document.getElementById('btn-missed').addEventListener('click', () => advance(false));
    }
  }
}

function advance(correct) {
  const s = studyState;
  if (correct) s.got++; else { s.missed++; s.missedCards.push(s.cards[s.index]); }
  s.index++;
  s.flipped = false;
  if (s.index >= s.cards.length) { view = 'results'; render(); return; }
  render();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(title, body, onConfirm) {
  closeModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(title)}</h3>
      ${body}
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm">Save</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', onConfirm);
  backdrop.querySelector('.modal').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') onConfirm();
    if (e.key === 'Escape') closeModal();
  });
}
function closeModal() {
  document.getElementById('modal-backdrop')?.remove();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Paste Import ──────────────────────────────────────────────────────────────
function showPasteModal() {
  showModal(
    'Paste Cards',
    `<p style="font-size:.8rem;color:var(--text-muted);margin-bottom:.75rem">
       One card per line: <code>question - answer</code> or <code>- question - answer</code>
     </p>
     <div class="field">
       <textarea id="m-paste" placeholder="- What is H2O? - Water&#10;- Capital of France - Paris" style="min-height:160px"></textarea>
     </div>`,
    () => {
      const text = document.getElementById('m-paste')?.value || '';
      const cards = parsePasteText(text);
      if (cards.length === 0) { toast('No valid lines found'); return; }
      activeDeck.cards.push(...cards);
      save(db);
      closeModal();
      render();
      toast(`Added ${cards.length} card${cards.length !== 1 ? 's' : ''}`);
    }
  );
  setTimeout(() => document.getElementById('m-paste')?.focus(), 50);
}

function parsePasteText(text) {
  const cards = [];
  const lines = text.split(/\r\n|\r|\n/);
  for (const raw of lines) {
    // Strip leading bullet markers (-, *, •) then split on first " - "
    const line = raw.trim().replace(/^[-*•]\s+/, '');
    if (!line) continue;
    const idx = line.indexOf(' - ');
    if (idx === -1) continue;
    const front = line.slice(0, idx).trim();
    const back  = line.slice(idx + 3).trim();
    if (front && back) cards.push({ front, back });
  }
  return cards;
}

// ── CSV Import ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = splitCSVRow(line);
    if (cols.length >= 2) rows.push(cols);
  }
  return rows;
}

function splitCSVRow(line) {
  const cols = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cols.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function handleCsvImport(file, targetDeck) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const rows = parseCSV(e.target.result);
    if (rows.length === 0) { toast('No valid rows found in CSV'); return; }

    // Skip header row if first row looks like a header (contains "question" or "answer")
    const firstRow = rows[0].map(c => c.toLowerCase());
    const dataRows = (firstRow.includes('question') || firstRow.includes('answer') || firstRow.includes('front') || firstRow.includes('back'))
      ? rows.slice(1) : rows;

    if (dataRows.length === 0) { toast('No card data found after header'); return; }

    const cards = dataRows
      .filter(r => r[0] && r[1])
      .map(r => ({ front: r[0], back: r[1] }));

    if (cards.length === 0) { toast('No valid question/answer pairs found'); return; }

    if (targetDeck) {
      // Import into existing deck
      targetDeck.cards.push(...cards);
      save(db);
      render();
      toast(`Added ${cards.length} card${cards.length !== 1 ? 's' : ''}`);
    } else {
      // Create new deck named after the file
      const name = file.name.replace(/\.csv$/i, '').replace(/[-_]/g, ' ').trim() || 'Imported Deck';
      db.decks.push({ id: uid(), name, cards });
      save(db);
      render();
      toast(`Created "${name}" with ${cards.length} cards`);
    }
  };
  reader.readAsText(file);
}

// ── Init ──────────────────────────────────────────────────────────────────────
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
