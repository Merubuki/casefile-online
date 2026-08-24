(() => {
  'use strict';
  const C=window.CF5,E=C.esc;

  C.homeTemplate = (prefill='') => {
    const name=localStorage.getItem('casefile-name')||'';
    return `<section class="hero home-hero"><div class="brand-row"><div><div class="eyebrow">TABLETOP EDITION • PRIVATE ROOMS • BOTS</div><div class="brand">CASEFILE ONLINE</div></div><span class="status-pill"><span class="dot"></span> live server</span></div><h1>Gather around the evidence table.</h1><p class="muted hero-copy">A browser-based social deduction board game with private roles, physical-style cards, a forensic clue board, and human-like bots.</p></section>
    <div class="home-grid"><section class="panel parchment"><div class="stamp">OPEN A CASE</div><h2>Play now</h2><div class="grid grid-2"><label class="field"><span>DETECTIVE NAME</span><input id="name" maxlength="24" placeholder="Your name" value="${E(name)}"></label><label class="field"><span>INVITE CODE</span><input id="code" maxlength="6" class="code-input" placeholder="ABC123" value="${E(prefill)}"></label></div><div class="mode-grid"><button id="create" class="mode-card"><span class="mode-icon">♣</span><strong>Create Private Room</strong><small>Invite real friends with a room code</small></button><button id="bots" class="mode-card bot-mode"><span class="mode-icon">♟</span><strong>Play With 5 Bots</strong><small>Start instantly with human-like bot players</small></button><button id="join" class="mode-card join-mode"><span class="mode-icon">↪</span><strong>Join Room</strong><small>Enter the invite code above</small></button></div><div class="notice gold">No installation. Friends open the same link, enter the room code, and join your table.</div></section>
    <section class="panel felt"><div class="stamp">TABLETOP EXPERIENCE</div><h2>Designed like a board-game night</h2><div class="showcase-cards">${C.cardHtml('Hotel Keycard','evidence',{small:true})}${C.cardHtml('Kitchen Knife','means',{small:true})}${C.cardHtml('Blood Loss','clue',{small:true})}</div><div class="rules"><div>Animated role dossier</div><div>Decorated Evidence and Means cards</div><div>Forensic clue cards and marker tokens</div><div>Final Discussion lock after Round 3</div></div></section></div>`;
  };

  C.home = (prefill='') => {
    C.state=null;C.stopTimer();C.app.innerHTML=C.homeTemplate(prefill);
    const name=document.getElementById('name'),code=document.getElementById('code');
    const make=botCount=>{const n=name.value.trim();if(!n)return C.showToast('Enter your name first.','error');localStorage.setItem('casefile-name',n);C.socket.emit('createRoom',{name:n,botCount},r=>{if(!r?.ok)return C.showToast(r?.error||'Could not create room.','error');C.save({code:r.code,token:r.token});history.replaceState(null,'',`/?room=${r.code}`);});};
    document.getElementById('create').onclick=()=>make(0);document.getElementById('bots').onclick=()=>make(5);
    document.getElementById('join').onclick=()=>{const n=name.value.trim(),c=code.value.trim().toUpperCase();if(!n)return C.showToast('Enter your name first.','error');if(c.length!==6)return C.showToast('Enter the six-character room code.','error');localStorage.setItem('casefile-name',n);C.socket.emit('joinRoom',{name:n,code:c},r=>{if(!r?.ok)return C.showToast(r?.error||'Could not join.','error');C.save({code:r.code,token:r.token});history.replaceState(null,'',`/?room=${r.code}`);});};
    code.oninput=()=>code.value=code.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  };

  C.topbar = () => `<section class="table-topbar"><div class="room-plaque"><span>ROOM</span><strong>${E(C.state.code)}</strong><button id="copy" class="icon-btn" title="Copy invite">⧉</button></div><div class="phase-plaque"><span>${E(C.phaseLabel(C.state.phase))}</span><small>${E(C.phaseHelp())}</small></div><div class="top-actions">${C.state.phaseEndsAt?`<div class="timer-chip"><span class="timer-dot"></span><strong id="phaseTimer">${C.timerText()}</strong></div>`:''}<button id="sound" class="icon-btn" title="Sound">${C.audioOn?'🔊':'🔇'}</button></div></section>`;

  C.seats = () => `<section class="seat-rail">${C.state.players.map(p=>`<div class="seat ${p.id===C.state.meId?'me':''} ${p.finalDone?'done':''}"><div class="avatar">${E(p.name.slice(0,1).toUpperCase())}</div><div class="seat-copy"><strong>${E(p.name)}${p.isBot?' <span class="bot-pill">BOT</span>':''}</strong><small>${p.isBot?E(p.botStyle):p.id===C.state.hostId?'host':'player'}</small></div><div class="seat-state">${p.solveUsed?'<span class="badge spent">✕</span>':'<span class="badge ready">✓</span>'}${C.state.phase==='final'&&p.finalDone?`<span class="final-tag">${E(p.finalAction||'done')}</span>`:''}</div>${C.state.phase==='lobby'&&C.state.meId===C.state.hostId&&p.isBot?`<button class="remove-bot" data-id="${p.id}">×</button>`:''}</div>`).join('')}</section>`;

  C.roleCard = () => {
    const r=C.state.private.role||'Waiting';let text='Study the clue board, compare every card, and protect your accusation badge.';
    if(r==='Murderer')text='You committed the crime. Lock one Evidence + one Means, then blend into the table talk.';
    if(r==='Forensic Scientist')text='You know the exact Secret Crime. Guide the group only through forensic clue markers.';
    if(r==='Accomplice')text=`Protect the Murderer: ${E(C.pname(C.state.private.murdererId))}. Redirect suspicion without exposing the team.`;
    if(r==='Witness')text=`The evil team may include ${E((C.state.private.suspectIds||[]).map(C.pname).join(' / '))}. Help carefully and stay hidden.`;
    return `<section class="dossier"><div class="dossier-tab">PRIVATE ROLE</div><h2>${E(r)}</h2><p>${text}</p><button id="revealRole" class="btn secondary slim">Reveal Role Dossier</button></section>`;
  };

  C.secretCrimePanel = () => {
    const s=C.state;if(!s||['crime','lobby','ended'].includes(s.phase))return'';const sol=s.private?.solution,knows=['Murderer','Forensic Scientist'].includes(s.private.role);
    if(knows&&sol)return `<section class="secret-crime-panel"><div class="secret-heading"><div><span>TOP SECRET • PRIVATE INFORMATION</span><h2>Locked Secret Crime</h2></div><div class="secret-seal">CONFIDENTIAL</div></div><p>${s.private.role==='Forensic Scientist'?`The Murderer is <strong>${E(C.pname(sol.ownerId))}</strong>. Use this exact pair to guide your forensic markers.`:'This is the crime you locked. Keep it hidden while you bluff at the table.'}</p><div class="secret-pair">${C.cardHtml(sol.evidenceText,'evidence',{large:true,tag:'KEY EVIDENCE'})}<div class="pair-link">+</div>${C.cardHtml(sol.meansText,'means',{large:true,tag:'MEANS OF MURDER'})}</div></section>`;
    if(!knows)return `<section class="hidden-crime-panel"><div class="hidden-lock">✦</div><div><span>SECRET CRIME LOCKED</span><strong>Hidden from your role</strong><p>Investigators, Witness, and Accomplice must use the forensic clues and public cards. The exact pair is intentionally hidden.</p></div></section>`;
    return'';
  };
})();
