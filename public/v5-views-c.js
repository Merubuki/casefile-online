(() => {
  'use strict';
  const C=window.CF5,E=C.esc;

  C.reversal = () => {
    if(C.state.phase!=='reversal')return'';
    if(C.state.private.role!=='Murderer')return `<section class="panel wait-panel"><div class="stamp danger-stamp">WITNESS REVERSAL</div><h2>The Murderer has one last guess.</h2><p class="muted">Do not reveal roles until the guess is locked.</p></section>`;
    const choices=C.state.players.filter(p=>p.id!==C.state.meId&&p.role!=='Forensic Scientist');
    return `<section class="panel crime-panel"><div class="stamp danger-stamp">LAST CHANCE</div><h2>Identify the Witness</h2><div class="witness-card-grid">${choices.map(p=>`<button class="witness-card witness" data-id="${p.id}"><span class="suspect-avatar">${E(p.name.slice(0,1).toUpperCase())}</span><small>WITNESS?</small><strong>${E(p.name)}</strong><em>Lock this player</em></button>`).join('')}</div></section>`;
  };

  C.result = () => {
    if(C.state.phase!=='ended')return'';const sol=C.state.private.solution;
    return `<section class="result"><div class="stamp">CASE CLOSED</div><h1>${E(C.state.winner)} win</h1><p>${E(C.state.endingReason||'')}</p>${sol?`<div class="solution"><div>${C.cardHtml(sol.evidenceText,'evidence',{large:true,tag:'KEY EVIDENCE'})}</div><b>+</b><div>${C.cardHtml(sol.meansText,'means',{large:true,tag:'MEANS'})}</div></div><p>The Murderer was <strong>${E(C.pname(sol.ownerId))}</strong>.</p>`:''}<div class="role-reveal-grid">${C.state.players.map(p=>`<div class="role-reveal"><span>${E(p.role||'')}</span><strong>${E(p.name)}</strong></div>`).join('')}</div>${C.state.meId===C.state.hostId?'<button id="rematch" class="btn full">Return to Lobby for Rematch</button>':'<p class="muted">Waiting for the host to open a rematch.</p>'}</section>`;
  };

  C.chat = () => {
    const locked=C.state.private.role==='Forensic Scientist'&&!['lobby','ended'].includes(C.state.phase);
    return `<section class="chat-panel"><header><div><span>TABLE TALK</span><strong>Case log</strong></div>${locked?'<em>Forensic chat locked</em>':''}</header><div id="log" class="log">${C.state.log.map(x=>`<div class="log-line ${x.type==='chat'?'chat':''}">${E(x.text)}</div>`).join('')}</div>${locked?'<div class="notice gold">Use only the clue board to communicate.</div>':'<div class="chat-input"><input id="chatText" maxlength="280" placeholder="Talk to the table…"><button id="send" class="btn secondary">Send</button></div>'}</section>`;
  };
})();
