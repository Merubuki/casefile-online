(() => {
  'use strict';
  const socket = io();
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  let state = null;
  let selectedCrime = { evidenceId: null, meansId: null };
  let selectedAccusation = { targetId: null, evidenceId: null, meansId: null };
  let toastTimer = null;
  const SESSION_KEY = 'casefile-online-session-v2';

  const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  function showToast(message, type = '') {
    toastEl.textContent = message;
    toastEl.className = `toast ${type}`.trim();
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3600);
  }
  const saveSession = session => localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
  const clearSession = () => localStorage.removeItem(SESSION_KEY);
  function phaseLabel(phase) {
    return ({ lobby: 'Lobby', crime: 'Secret Crime Setup', forensic: 'Forensic Clues', discussion: 'Investigation Discussion', final: 'Final Discussion', reversal: 'Witness Reversal', ended: 'Case Closed' })[phase] || phase;
  }

  function homeTemplate(prefillCode = '') {
    const rememberedName = localStorage.getItem('casefile-name') || '';
    return `
      <section class="hero">
        <div class="brand-row">
          <div><div class="eyebrow">PRIVATE MULTIPLAYER • 4–12 PLAYERS</div><div class="brand">CASEFILE ONLINE</div></div>
          <span class="status-pill"><span class="dot"></span> Server connected</span>
        </div>
        <h1>One crime.<br>Everyone is a suspect.</h1>
        <p class="muted">Create a private room, share the six-character invite code, and play a browser-based social deduction mystery with your friends.</p>
      </section>
      <div class="home-grid">
        <section class="panel">
          <h2>Start or join a case</h2>
          <div class="grid grid-2">
            <div class="field"><label for="playerName">YOUR NAME</label><input id="playerName" maxlength="24" autocomplete="nickname" placeholder="Detective name" value="${escapeHtml(rememberedName)}"></div>
            <div class="field"><label for="roomCode">INVITE CODE</label><input id="roomCode" class="code-input" maxlength="6" autocomplete="off" placeholder="ABC123" value="${escapeHtml(prefillCode)}"></div>
          </div>
          <div class="row" style="margin-top:12px"><button id="createBtn" class="btn">Create Private Room</button><button id="joinBtn" class="btn secondary">Join Room</button></div>
          <div class="notice gold" style="margin-top:14px">Your friends only need this same website and the room code. No account and no installation.</div>
        </section>
        <section class="panel">
          <div class="eyebrow">HOW IT PLAYS</div><h2>Tabletop-style flow</h2>
          <div class="rules-list">
            <div class="rule">The server secretly deals Forensic Scientist, Murderer, Investigators, and—at 6+ players—Accomplice and Witness.</div>
            <div class="rule">The Murderer secretly chooses one of their Evidence cards and one Means of Murder card.</div>
            <div class="rule">The Forensic Scientist gives clues only by placing scene markers and stays silent during the investigation.</div>
            <div class="rule">Everyone discusses the visible cards. Each non-forensic player gets only one exact Solve Crime attempt.</div>
            <div class="rule">If the crime is solved with a Witness in play, the Murderer gets one final chance to identify that Witness and steal the win.</div>
          </div>
        </section>
      </div>`;
  }

  function renderHome(prefillCode = '') {
    state = null;
    app.innerHTML = homeTemplate(prefillCode);
    const nameInput = document.getElementById('playerName');
    const codeInput = document.getElementById('roomCode');
    document.getElementById('createBtn').addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) return showToast('Enter your name first.', 'error');
      localStorage.setItem('casefile-name', name);
      socket.emit('createRoom', { name }, result => {
        if (!result?.ok) return showToast(result?.error || 'Could not create room.', 'error');
        saveSession({ code: result.code, token: result.token });
        history.replaceState(null, '', `/?room=${encodeURIComponent(result.code)}`);
      });
    });
    document.getElementById('joinBtn').addEventListener('click', () => {
      const name = nameInput.value.trim(), code = codeInput.value.trim().toUpperCase();
      if (!name) return showToast('Enter your name first.', 'error');
      if (code.length !== 6) return showToast('Enter the six-character invite code.', 'error');
      localStorage.setItem('casefile-name', name);
      socket.emit('joinRoom', { name, code }, result => {
        if (!result?.ok) return showToast(result?.error || 'Could not join room.', 'error');
        saveSession({ code: result.code, token: result.token });
        history.replaceState(null, '', `/?room=${encodeURIComponent(result.code)}`);
      });
    });
    codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });
  }

  const me = () => state?.players.find(p => p.id === state.meId) || null;
  const playerName = id => state?.players.find(p => p.id === id)?.name || 'Unknown';
  function copyInvite() {
    const url = new URL(location.href); url.searchParams.set('room', state.code);
    const text = `Join my Casefile game: ${url.toString()}\nRoom code: ${state.code}`;
    navigator.clipboard?.writeText(text).then(() => showToast('Invite link and room code copied.', 'good')).catch(() => showToast(`Room code: ${state.code}`));
  }
  function playersHeader() {
    return `<div class="players-strip">${state.players.map(p => `<span class="player-chip ${p.solveUsed ? 'used' : ''}"><span class="dot ${p.connected ? '' : 'off'}"></span>${escapeHtml(p.name)}${p.id === state.hostId ? '<span class="host">★ host</span>' : ''}${p.solveUsed ? '<span>✕ badge</span>' : ''}</span>`).join('')}</div>`;
  }
  function gameHeader() {
    const role = state.private?.role || 'Waiting';
    return `<section class="panel game-head"><div><div class="eyebrow">ROOM CODE</div><div class="room-code">${escapeHtml(state.code)}</div></div><div><div class="eyebrow">STATUS</div><div class="role-name">${escapeHtml(phaseLabel(state.phase))}${state.round ? ` • Round ${state.round}` : ''}</div></div><div class="role-box"><div class="eyebrow">YOUR SECRET ROLE</div><div class="role-name">${escapeHtml(role)}</div></div></section>`;
  }
  function lobbyPanel() {
    const host = state.meId === state.hostId, count = state.players.length;
    return `<section class="panel"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">WAITING ROOM</div><h2>${count} player${count === 1 ? '' : 's'} joined</h2></div><div class="row"><button id="copyInviteBtn" class="btn secondary">Copy Invite</button><button id="leaveBtn" class="btn ghost">Leave</button></div></div>${playersHeader()}<div class="divider"></div><div class="grid grid-2"><div><h3>Game setup</h3><p class="muted small">4–12 players. At 6+ players, Accomplice and Witness are added automatically.</p><div class="field" style="max-width:260px"><label for="cardsPerType">CARDS PER TYPE</label><select id="cardsPerType" ${host ? '' : 'disabled'}>${[3,4,5].map(n => `<option value="${n}" ${state.settings.cardsPerType === n ? 'selected' : ''}>${n} Evidence + ${n} Means</option>`).join('')}</select></div></div><div class="notice ${count >= 4 ? 'good' : 'gold'}">${count >= 4 ? 'Enough players are here. The host can start whenever everyone is ready.' : `You need ${4 - count} more player${4 - count === 1 ? '' : 's'} before the case can begin.`}</div></div>${host ? `<button id="startGameBtn" class="btn full" style="margin-top:14px" ${count < 4 ? 'disabled' : ''}>Deal Secret Roles & Start</button>` : '<p class="muted" style="margin-top:14px">Waiting for the host to start the game.</p>'}</section>`;
  }
  function roleInfoPanel() {
    const role = state.private.role, solution = state.private.solution;
    let body = '';
    if (role === 'Murderer') {
      body = '<p>You committed the crime. Pick the exact Evidence and Means secretly, then blend into the discussion.</p>';
      if (solution) body += `<div class="notice danger">Your locked solution: <strong>${escapeHtml(solution.evidenceText)}</strong> + <strong>${escapeHtml(solution.meansText)}</strong></div>`;
    } else if (role === 'Forensic Scientist') {
      body = '<p>You know the real solution. You may not chat during the investigation. Guide the table only by placing scene markers.</p>';
      if (solution) body += `<div class="notice gold">Real solution: <strong>${escapeHtml(solution.evidenceText)}</strong> + <strong>${escapeHtml(solution.meansText)}</strong> from <strong>${escapeHtml(playerName(solution.ownerId))}</strong>.</div>`;
    } else if (role === 'Accomplice') {
      body = `<p>You win with the Murderer. You know who the Murderer is, but not which two cards were chosen.</p><div class="notice danger">Murderer: <strong>${escapeHtml(playerName(state.private.murdererId))}</strong></div>`;
    } else if (role === 'Witness') {
      const suspects = (state.private.suspectIds || []).map(playerName);
      body = `<p>You know which players belong to the Murderer team, but not which one is the actual Murderer. Help carefully—if the crime is solved, the Murderer can steal the win by identifying you.</p><div class="notice gold">Possible Murderer team: <strong>${suspects.map(escapeHtml).join(' / ')}</strong></div>`;
    } else body = '<p>Study every visible card, discuss the forensic clues, and protect your single Solve Crime badge until you have an exact suspect + Evidence + Means combination.</p>';
    return `<section class="panel"><div class="eyebrow">ROLE BRIEFING</div><h2>${escapeHtml(role)}</h2>${body}</section>`;
  }
  function crimeSetupPanel() {
    if (state.private.role !== 'Murderer') return '<section class="panel"><div class="eyebrow">SECRET SETUP</div><h2>The Murderer is choosing the crime.</h2><p class="muted">Your cards are already face-up to the table. Wait for the secret selection to be locked in.</p></section>';
    const mine = me();
    return `<section class="panel"><div class="eyebrow">MURDERER ONLY</div><h2>Choose the secret solution</h2><p class="muted">Select exactly one Key Evidence and one Means of Murder from your own cards.</p><div class="grid grid-2"><div><h3>Key Evidence</h3><div class="card-list">${mine.evidence.map(c => `<button class="choice-card crime-e ${selectedCrime.evidenceId === c.id ? 'selected' : ''}" data-id="${c.id}"><small>Evidence</small>${escapeHtml(c.text)}</button>`).join('')}</div></div><div><h3>Means of Murder</h3><div class="card-list">${mine.means.map(c => `<button class="choice-card crime-m ${selectedCrime.meansId === c.id ? 'selected' : ''}" data-id="${c.id}"><small>Means</small>${escapeHtml(c.text)}</button>`).join('')}</div></div></div><button id="lockCrimeBtn" class="btn full" style="margin-top:14px" ${selectedCrime.evidenceId && selectedCrime.meansId ? '' : 'disabled'}>Lock In Secret Crime</button></section>`;
  }
  function scenePanel() {
    if (!state.scene?.length) return '';
    const active = state.phase === 'forensic' && state.private.role === 'Forensic Scientist';
    return `<section class="panel"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">FORENSIC SCENE</div><h2>${state.round ? `Investigation Round ${state.round}` : 'Initial Clues'}</h2></div><span class="status-pill">${active ? 'Place the remaining marker' : 'Read the markers carefully'}</span></div><div class="scene-grid">${state.scene.map(tile => `<article class="scene-card ${tile.fixed ? 'fixed' : ''}"><div class="scene-title"><strong>${escapeHtml(tile.title)}</strong>${tile.fixed ? '<span class="tag">fixed</span>' : ''}</div>${tile.marker ? `<div class="marker">${escapeHtml(tile.marker)}</div>` : active ? `<div class="marker-options">${tile.options.map(opt => `<button class="btn secondary marker-btn" data-slot="${tile.slot}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}</div>` : '<div class="marker waiting">Waiting for the Forensic Scientist…</div>'}</article>`).join('')}</div></section>`;
  }
  function playerBoards() {
    const suspects = state.players.filter(p => p.evidence.length || p.means.length);
    if (!suspects.length) return '';
    return `<section class="panel"><div class="eyebrow">VISIBLE PLAYER CARDS</div><h2>Everyone is a suspect</h2><p class="muted">These cards are public information. The Murderer's exact solution is one Evidence + one Means from the Murderer's own board.</p><div class="player-board">${suspects.map(p => `<article class="player-card"><div class="player-card-head"><h3>${escapeHtml(p.name)}</h3>${p.solveUsed ? '<span class="tag">badge used</span>' : ''}</div><div class="grid grid-2"><div><div class="eyebrow">EVIDENCE</div><div class="mini-cards">${p.evidence.map(c => `<div class="mini-card">${escapeHtml(c.text)}</div>`).join('')}</div></div><div><div class="eyebrow">MEANS</div><div class="mini-cards">${p.means.map(c => `<div class="mini-card">${escapeHtml(c.text)}</div>`).join('')}</div></div></div></article>`).join('')}</div></section>`;
  }
  function accusationPanel() {
    const mine = me(), canAccuse = ['forensic','discussion','final'].includes(state.phase) && state.private.role !== 'Forensic Scientist' && !mine.solveUsed;
    if (!['forensic','discussion','final'].includes(state.phase) || state.private.role === 'Forensic Scientist') return '';
    if (!canAccuse) return '<section class="panel"><div class="notice">Your Solve Crime badge has already been used. You can keep discussing, but you cannot accuse again.</div></section>';
    const suspects = state.players.filter(p => p.evidence.length), selectedTarget = suspects.find(p => p.id === selectedAccusation.targetId);
    return `<section class="panel"><div class="eyebrow">ONE ATTEMPT FOR THE ENTIRE GAME</div><h2>Solve Crime</h2><p class="muted">Choose a suspect, then one Evidence and one Means from that same suspect. A wrong answer permanently spends your badge.</p><div class="row">${suspects.map(p => `<button class="btn ${selectedAccusation.targetId === p.id ? '' : 'secondary'} suspect-btn" data-id="${p.id}">${escapeHtml(p.name)}</button>`).join('')}</div>${selectedTarget ? `<div class="grid grid-2" style="margin-top:14px"><div><h3>Evidence from ${escapeHtml(selectedTarget.name)}</h3><div class="card-list">${selectedTarget.evidence.map(c => `<button class="choice-card accuse-e ${selectedAccusation.evidenceId === c.id ? 'selected' : ''}" data-id="${c.id}">${escapeHtml(c.text)}</button>`).join('')}</div></div><div><h3>Means from ${escapeHtml(selectedTarget.name)}</h3><div class="card-list">${selectedTarget.means.map(c => `<button class="choice-card accuse-m ${selectedAccusation.meansId === c.id ? 'selected' : ''}" data-id="${c.id}">${escapeHtml(c.text)}</button>`).join('')}</div></div></div><button id="accuseBtn" class="btn danger full" style="margin-top:14px" ${selectedAccusation.evidenceId && selectedAccusation.meansId ? '' : 'disabled'}>Use Solve Crime Badge</button>` : '<div class="notice gold" style="margin-top:14px">Choose a suspect first.</div>'}</section>`;
  }
  function advancePanel() {
    const allowed = state.phase === 'discussion' && (state.meId === state.hostId || state.private.role === 'Forensic Scientist');
    if (!allowed) return '';
    const label = state.round < 3 ? `Advance to Investigation Round ${state.round + 1}` : 'Open Final Discussion';
    return `<section class="panel"><div class="notice gold">Only advance when the table has had enough time to discuss this round.</div><button id="advanceBtn" class="btn full" style="margin-top:12px">${label}</button></section>`;
  }
  function reversalPanel() {
    if (state.phase !== 'reversal') return '';
    if (state.private.role !== 'Murderer') return '<section class="panel"><div class="eyebrow">FINAL REVERSAL</div><h2>The crime was solved.</h2><p class="muted">The Murderer now gets one guess at the Witness. Do not reveal roles yet.</p></section>';
    const candidates = state.players.filter(p => p.id !== state.meId);
    return `<section class="panel"><div class="eyebrow">MURDERER'S LAST CHANCE</div><h2>Identify the Witness</h2><p class="muted">Pick one player. If you identify the Witness exactly, the Murderer Team steals the win.</p><div class="row">${candidates.map(p => `<button class="btn secondary witness-btn" data-id="${p.id}">${escapeHtml(p.name)}</button>`).join('')}</div></section>`;
  }
  function resultPanel() {
    if (state.phase !== 'ended') return '';
    const solution = state.private.solution, owner = solution ? playerName(solution.ownerId) : 'Unknown';
    return `<section class="result-card"><div class="eyebrow">CASE CLOSED</div><div class="winner">${escapeHtml(state.winner)} win</div><p class="muted">${escapeHtml(state.endingReason || '')}</p>${solution ? `<div class="solution"><div class="solution-box"><span class="eyebrow">KEY EVIDENCE</span><strong>${escapeHtml(solution.evidenceText)}</strong></div><div>+</div><div class="solution-box"><span class="eyebrow">MEANS</span><strong>${escapeHtml(solution.meansText)}</strong></div></div><p>The Murderer was <strong>${escapeHtml(owner)}</strong>.</p>` : ''}<div class="divider"></div><div class="player-board">${state.players.map(p => `<div class="player-card"><div class="eyebrow">${escapeHtml(p.role || '')}</div><h3>${escapeHtml(p.name)}</h3></div>`).join('')}</div>${state.meId === state.hostId ? '<button id="rematchBtn" class="btn full" style="margin-top:16px">Return to Lobby for Rematch</button>' : '<p class="muted" style="margin-top:16px">Waiting for the host to open a rematch lobby.</p>'}</section>`;
  }
  function chatPanel() {
    const forensicLocked = state.private.role === 'Forensic Scientist' && !['lobby','ended'].includes(state.phase);
    return `<section class="panel"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">CASE LOG</div><h2>Discussion</h2></div>${forensicLocked ? '<span class="tag">Forensic Scientist chat locked</span>' : ''}</div><div id="caseLog" class="log">${state.log.map(item => `<div class="log-line ${item.type === 'chat' ? 'chat' : ''}">${escapeHtml(item.text)}</div>`).join('')}</div>${forensicLocked ? '<div class="notice gold" style="margin-top:8px">Use only the scene markers to communicate during the investigation.</div>' : '<div class="chat-row"><input id="chatInput" maxlength="280" placeholder="Type a message to the room…"><button id="chatSendBtn" class="btn secondary">Send</button></div>'}</section>`;
  }

  function renderGame() {
    if (!state) return;
    let html = gameHeader();
    if (state.phase === 'lobby') html += lobbyPanel();
    else if (state.phase === 'ended') html += resultPanel();
    else {
      html += roleInfoPanel();
      if (state.phase === 'crime') html += crimeSetupPanel();
      html += scenePanel();
      if (state.phase !== 'crime') html += playerBoards();
      html += accusationPanel();
      html += advancePanel();
      html += reversalPanel();
    }
    html += chatPanel();
    app.innerHTML = html;
    bindGameEvents();
    const log = document.getElementById('caseLog'); if (log) log.scrollTop = log.scrollHeight;
  }

  function bindGameEvents() {
    document.getElementById('copyInviteBtn')?.addEventListener('click', copyInvite);
    document.getElementById('leaveBtn')?.addEventListener('click', () => { socket.emit('leaveRoom', { code: state.code }); clearSession(); history.replaceState(null, '', '/'); renderHome(); });
    document.getElementById('cardsPerType')?.addEventListener('change', e => socket.emit('updateSettings', { code: state.code, cardsPerType: Number(e.target.value) }));
    document.getElementById('startGameBtn')?.addEventListener('click', () => socket.emit('startGame', { code: state.code }));
    document.querySelectorAll('.crime-e').forEach(btn => btn.addEventListener('click', () => { selectedCrime.evidenceId = btn.dataset.id; renderGame(); }));
    document.querySelectorAll('.crime-m').forEach(btn => btn.addEventListener('click', () => { selectedCrime.meansId = btn.dataset.id; renderGame(); }));
    document.getElementById('lockCrimeBtn')?.addEventListener('click', () => socket.emit('chooseCrime', { code: state.code, ...selectedCrime }));
    document.querySelectorAll('.marker-btn').forEach(btn => btn.addEventListener('click', () => socket.emit('placeMarker', { code: state.code, slot: Number(btn.dataset.slot), value: btn.dataset.value })));
    document.querySelectorAll('.suspect-btn').forEach(btn => btn.addEventListener('click', () => { selectedAccusation = { targetId: btn.dataset.id, evidenceId: null, meansId: null }; renderGame(); }));
    document.querySelectorAll('.accuse-e').forEach(btn => btn.addEventListener('click', () => { selectedAccusation.evidenceId = btn.dataset.id; renderGame(); }));
    document.querySelectorAll('.accuse-m').forEach(btn => btn.addEventListener('click', () => { selectedAccusation.meansId = btn.dataset.id; renderGame(); }));
    document.getElementById('accuseBtn')?.addEventListener('click', () => { if (confirm('Use your only Solve Crime badge on this exact combination?')) socket.emit('accuse', { code: state.code, ...selectedAccusation }); });
    document.getElementById('advanceBtn')?.addEventListener('click', () => socket.emit('advanceRound', { code: state.code }));
    document.querySelectorAll('.witness-btn').forEach(btn => btn.addEventListener('click', () => { if (confirm(`Final answer: ${btn.textContent.trim()} is the Witness?`)) socket.emit('guessWitness', { code: state.code, targetId: btn.dataset.id }); }));
    document.getElementById('rematchBtn')?.addEventListener('click', () => { selectedCrime = { evidenceId: null, meansId: null }; selectedAccusation = { targetId: null, evidenceId: null, meansId: null }; socket.emit('rematch', { code: state.code }); });
    const sendChat = () => { const input = document.getElementById('chatInput'), text = input?.value.trim(); if (!text) return; socket.emit('chatMessage', { code: state.code, text }); input.value = ''; };
    document.getElementById('chatSendBtn')?.addEventListener('click', sendChat);
    document.getElementById('chatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
  }

  socket.on('connect', () => {
    const session = loadSession(), roomFromUrl = new URL(location.href).searchParams.get('room')?.toUpperCase() || '';
    if (session?.code && session?.token) socket.emit('resumeRoom', session, result => { if (!result?.ok) { clearSession(); renderHome(roomFromUrl || session.code); } });
    else renderHome(roomFromUrl);
  });
  socket.on('state', nextState => {
    state = nextState;
    if (!selectedAccusation.targetId || !state.players.some(p => p.id === selectedAccusation.targetId)) selectedAccusation = { targetId: null, evidenceId: null, meansId: null };
    renderGame();
  });
  socket.on('toast', payload => showToast(payload?.message || 'Something went wrong.', payload?.type || 'error'));
  socket.on('connect_error', () => { app.innerHTML = '<section class="loading-card"><div class="eyebrow">CONNECTION ERROR</div><h1>Could not reach the game server.</h1><p class="muted">Please refresh the page. If the free server was sleeping, it may need a short moment to wake up.</p><button class="btn" onclick="location.reload()">Reload</button></section>'; });
})();
