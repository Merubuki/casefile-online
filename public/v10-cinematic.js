(() => {
  'use strict';
  const C = window.CF5;
  if (!C) return;
  const E = C.esc;

  const playerCountClass = () => {
    const n = Math.max(1, C.state?.players?.length || 1);
    if (n <= 4) return 'pc-4';
    if (n <= 6) return 'pc-6';
    if (n <= 8) return 'pc-8';
    return 'pc-12';
  };

  C.v10Top = () => `<header class="v10-top">
    <div class="v10-brand"><strong>CASEFILE</strong><span>ONLINE</span><em>VERSION 10</em></div>
    <div class="v10-room"><small>ROOM CODE</small><strong>${E(C.state.code)}</strong><button id="copy" aria-label="Copy room invite">⧉</button></div>
    <div class="v10-phase"><span>${E(C.phaseLabel(C.state.phase))}</span>${C.state.phaseEndsAt ? `<strong id="phaseTimer">${C.timerText()}</strong>` : ''}<button id="sound" aria-label="Toggle sound">${C.audioOn ? '◉' : '○'}</button></div>
  </header>`;

  C.v10Dossier = () => {
    const role = C.state.private.role || 'Waiting';
    const sol = C.state.private.solution;
    const me = C.me() || { connected: true };
    const idx = Math.max(0, C.state.players.findIndex(p => p.id === C.state.meId));
    let hint = 'Compare every clue marker and public card. Your accusation must match exactly.';
    if (role === 'Murderer') hint = 'You locked the crime. Blend into the discussion and protect the secret pair.';
    if (role === 'Forensic Scientist') hint = 'You know the exact crime. Guide the table only through forensic markers.';
    if (role === 'Accomplice') hint = `Protect ${E(C.pname(C.state.private.murdererId))} without exposing the team.`;
    if (role === 'Witness') hint = 'You know the evil side. Help carefully and remain hidden.';

    let secret = '';
    if (!['lobby', 'crime'].includes(C.state.phase)) {
      const knows = ['Murderer', 'Forensic Scientist'].includes(role);
      if (knows && sol) {
        secret = `<section class="v10-secret">
          <div class="v10-secret-head"><span>SECRET CRIME</span><b>${role === 'Forensic Scientist' ? `MURDERER • ${E(C.pname(sol.ownerId))}` : 'LOCKED BY YOU'}</b></div>
          <div class="v10-secret-cards">${C.cardHtml(sol.evidenceText, 'evidence', { small: true, tag: 'KEY EVIDENCE' })}${C.cardHtml(sol.meansText, 'means', { small: true, tag: 'MEANS' })}</div>
        </section>`;
      } else {
        secret = `<section class="v10-secret classified"><span>SECRET CRIME</span><div class="v10-wax">✦</div><strong>CLASSIFIED</strong><small>Hidden from your role</small></section>`;
      }
    }

    return `<div class="v10-left-stack"><section class="v10-dossier">
      <div class="v10-paperclip"></div><div class="v10-dossier-title">YOUR DOSSIER</div>
      <div class="v10-photo">${C.v9Portrait ? C.v9Portrait(me, idx) : ''}</div>
      <small>PRIVATE ROLE</small><h2>${E(role)}</h2><p>${hint}</p><div class="v10-stamp">CONFIDENTIAL</div>
      <button id="revealRole" class="v10-paper-button">OPEN ROLE FILE</button>
    </section>${secret}</div>`;
  };

  C.v10Clues = () => {
    if (!C.state.scene?.length) return '';
    const active = C.state.phase === 'forensic' && C.state.private.role === 'Forensic Scientist';
    return `<section class="v10-clues"><div class="v10-section-title"><span>FORENSIC CLUE BOARDS</span><strong>${C.state.round ? `ROUND ${C.state.round} OF 3` : 'INITIAL SCENE'}</strong><small>${active ? 'Place one brass marker on every open board' : 'Read every marker carefully'}</small></div>
      <div class="v10-clue-grid">${C.state.scene.map((tile, i) => `<article class="v10-clue ${tile.fixed ? 'fixed' : ''}" style="--i:${i}">
        <header>${E(tile.title)}${tile.fixed ? '<small>FIXED</small>' : ''}</header>
        <div class="v10-clue-options">${tile.options.map(option => {
          const chosen = tile.marker === option;
          if (active && !tile.marker) return `<button class="v10-clue-option marker-btn" data-slot="${tile.slot}" data-value="${E(option)}">${E(option)}</button>`;
          return `<div class="v10-clue-option ${chosen ? 'chosen' : ''}">${E(option)}${chosen ? '<i class="v10-marker"></i>' : ''}</div>`;
        }).join('')}</div>
      </article>`).join('')}</div></section>`;
  };

  C.v10MiniCard = (card, type) => `<div class="v10-mini-card">${C.cardHtml(card.text, type, { small: true })}</div>`;

  C.v10Tableaux = () => {
    const players = (C.state.players || []).filter(p => (p.evidence?.length || p.means?.length));
    if (!players.length) return '';
    return `<section class="v10-tableaux ${playerCountClass()}">
      <div class="v10-section-title compact"><span>ALL PUBLIC CARDS</span><strong>NO SCROLL VIEW</strong><small>Every suspect's Evidence and Means stay visible at once</small></div>
      <div class="v10-suspect-grid">${players.map((p, i) => `<article class="v10-suspect ${p.id === C.state.meId ? 'me' : ''} ${p.finalDone ? 'done' : ''}">
        <div class="v10-suspect-id"><div class="v10-suspect-photo">${C.v9Portrait ? C.v9Portrait(p, i) : ''}</div><div><strong>${E(p.name)}</strong><small>${p.isBot ? `${E(p.botStyle)} bot` : p.id === C.state.hostId ? 'host' : 'player'}</small><b>${p.solveUsed ? 'BADGE SPENT' : '★ BADGE READY'}</b></div></div>
        <div class="v10-card-matrix"><div class="v10-card-row"><em>EVIDENCE</em>${(p.evidence || []).map(x => C.v10MiniCard(x, 'evidence')).join('')}</div><div class="v10-card-row"><em>MEANS</em>${(p.means || []).map(x => C.v10MiniCard(x, 'means')).join('')}</div></div>
        ${C.state.phase === 'lobby' && C.state.meId === C.state.hostId && p.isBot ? `<button class="remove-bot v10-remove" data-id="${p.id}">×</button>` : ''}
      </article>`).join('')}</div>
    </section>`;
  };

  C.v10Chat = () => {
    const locked = C.state.private.role === 'Forensic Scientist' && !['lobby', 'ended'].includes(C.state.phase);
    const items = (C.state.log || []).slice(-14);
    return `<section class="v10-chat"><header><div><span>${C.state.phase === 'final' ? 'FINAL DISCUSSION' : 'DISCUSSION'}</span><strong>${C.state.round ? `ROUND ${C.state.round} OF 3` : 'CASE LOG'}</strong></div><b>NOTES</b></header>
      <div class="v10-chat-log" id="log">${items.map(x => `<article class="v10-message ${x.type === 'chat' ? 'chat' : 'system'}"><i>${x.type === 'chat' ? '●' : '◆'}</i><p>${E(x.text)}</p></article>`).join('')}</div>
      ${locked ? '<div class="v10-chat-lock">Forensic Scientist communicates through clue markers only.</div>' : '<div class="v10-chat-input"><input id="chatText" maxlength="280" placeholder="Type a message…"><button id="send">➤</button></div>'}
    </section>`;
  };

  C.v10Action = () => {
    const p = C.me();
    if (!p || C.state.private.role === 'Forensic Scientist' || !['forensic', 'discussion', 'final'].includes(C.state.phase)) return C.actionAdvance();
    const final = C.state.phase === 'final';
    return `<section class="v10-accuse"><div class="v10-accuse-copy"><span>${final ? 'FINAL DECISION' : 'MAKE YOUR ACCUSATION'}</span><small>${final ? 'No more rounds — accuse or pass' : 'Lock one suspect + Evidence + Means'}</small></div>
      <div class="v10-slots"><b>SUSPECT</b><b>EVIDENCE</b><b>MEANS</b></div>
      <div class="v10-accuse-buttons">${!p.solveUsed ? '<button id="openAccuse" class="v10-lock">🔒 LOCK ACCUSATION</button>' : '<strong class="v10-spent">BADGE SPENT</strong>'}${final && !p.finalDone ? '<button id="pass" class="v10-pass">PASS</button>' : ''}${C.actionAdvance()}</div>
    </section>`;
  };

  C.v10Center = () => {
    if (C.state.phase === 'lobby') return `<div class="v10-phase-card">${C.lobby()}</div>`;
    if (C.state.phase === 'crime') return `<div class="v10-phase-card">${C.crimePanel()}</div>`;
    if (C.state.phase === 'reversal') return `<div class="v10-phase-card">${C.reversal()}</div>`;
    if (C.state.phase === 'ended') return `<div class="v10-phase-card">${C.result()}</div>`;
    return `${C.v10Clues()}${C.v10Tableaux()}`;
  };

  C.render = () => {
    if (!C.state) return;
    C.app.innerHTML = `<div class="v10-world ${playerCountClass()}">
      <div class="v10-lamp"></div><div class="v10-books"></div><div class="v10-coffee"></div><div class="v10-casebook"></div>
      ${C.v10Top()}
      <main class="v10-layout"><aside class="v10-left">${C.v10Dossier()}</aside><section class="v10-table"><div class="v10-center">${C.v10Center()}</div>${C.v10Action()}</section><aside class="v10-right">${C.v10Chat()}</aside></main>
    </div>`;
    C.bind();
    C.startTimer();
    if (C.lastPhase && C.lastPhase !== C.state.phase) C.beep(C.state.phase === 'ended' ? 'win' : 'phase');
    C.lastPhase = C.state.phase;
    setTimeout(C.roleOverlay, 180);
    setTimeout(C.maybeSecretOverlay, 460);
  };
})();
