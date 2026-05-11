'use strict';

// ── Storage ──────────────────────────────────────────────────────────────────
const DB_KEY = 'quizhar_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || { decks: [] }; }
  catch { return { decks: [] }; }
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
    </div>
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
    </div>
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

// ── Init ──────────────────────────────────────────────────────────────────────
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
