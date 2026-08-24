(() => {
  'use strict';
  const C = window.CF5;
  if (!C) return;
  const E = C.esc;

  C.clueBoard = () => {
    if (!C.state?.scene?.length) return '';
    const active = C.state.phase === 'forensic' && C.state.private.role === 'Forensic Scientist';

    return `<section class="board reference-board">
      <div class="board-title reference-board-title">
        <div>
          <span>FORENSIC CLUE BOARD</span>
          <strong>${C.state.round ? `Round ${C.state.round}` : 'Initial Clues'}</strong>
        </div>
        <em>${active ? 'Place one marker on every empty clue board' : 'Follow the markers placed on the boards'}</em>
      </div>
      <div class="reference-clue-strip">
        ${C.state.scene.map((t, i) => `
          <article class="reference-clue-tile ${t.fixed ? 'fixed' : ''}" style="--i:${i}">
            <header>
              <span>${E(t.title)}</span>
              ${t.fixed ? '<small>FIXED</small>' : ''}
            </header>
            <div class="reference-clue-options">
              ${t.options.map(o => {
                const chosen = t.marker === o;
                if (!t.marker && active) {
                  return `<button class="reference-clue-option marker-btn" data-slot="${t.slot}" data-value="${E(o)}"><span>${E(o)}</span></button>`;
                }
                return `<div class="reference-clue-option ${chosen ? 'chosen' : ''}"><span>${E(o)}</span>${chosen ? '<i class="reference-bullet-marker" aria-hidden="true"></i>' : ''}</div>`;
              }).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    </section>`;
  };
})();
