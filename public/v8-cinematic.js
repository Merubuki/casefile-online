(() => {
  'use strict';
  const C = window.CF5;
  if (!C) return;
  const E = C.esc;

  C.v8Portrait = (p, i = 0) => {
    const palettes = [['#d6a27a','#32231f','#733e2c','#244539'],['#8f5f45','#1c1918','#4d2f24','#2f4860'],['#e0b38e','#1b1b20','#5d3526','#34423a'],['#c88d6a','#4a2e24','#704834','#3c3148'],['#a36d50','#211e1b','#5b3b2b','#2b4a43'],['#e5bb98','#5c4538','#8b6347','#314759']];
    const [skin,hair,coat,bg] = palettes[i % palettes.length];
    const longHair = i % 3 !== 1;
    const hairPath = longHair ? '<path d="M23 45c0-24 10-37 29-37s31 13 31 38v38H20z"/>' : '<path d="M25 43c0-22 10-34 28-34 20 0 30 13 30 34v14H23z"/>';
    return `<svg class="v8-portrait-svg" viewBox="0 0 104 126" aria-hidden="true"><defs><linearGradient id="pbg${i}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#101312"/></linearGradient></defs><rect width="104" height="126" rx="14" fill="url(#pbg${i})"/><g fill="${hair}" opacity=".98">${hairPath}</g><ellipse cx="52" cy="50" rx="22" ry="27" fill="${skin}"/><path d="M29 50c2-25 12-36 26-36 12 0 22 7 27 24-12-9-22-12-34-10-8 1-14 6-19 22z" fill="${hair}"/><path d="M42 49h7M58 49h7" stroke="#30241f" stroke-width="2.4" stroke-linecap="round"/><path d="M49 62c3 2 6 2 9 0" stroke="#8b5548" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M17 126c3-29 16-43 35-43s34 14 37 43z" fill="${coat}"/><path d="M39 89l13 17 13-17" fill="#e8dbc5" opacity=".86"/><circle cx="84" cy="16" r="5" fill="#46d47b"/><circle cx="84" cy="16" r="9" fill="none" stroke="#46d47b" opacity=".22"/></svg>`;
  };

  C.v8Seat = (p, i = 0) => {
    const cards = p.evidence?.length || p.means?.length;
    const status = p.solveUsed ? 'badge spent' : 'badge ready';
    return `<article class="v8-player-zone ${p.id===C.state.meId?'is-me':''} ${p.finalDone?'is-done':''}"><div class="v8-id-card"><div class="v8-portrait">${C.v8Portrait(p,i)}</div><div class="v8-id-copy"><strong>${E(p.name)}</strong><small>${p.isBot?`${E(p.botStyle)} bot`:p.id===C.state.hostId?'host':'player'}</small><span>★ ${p.solveUsed?'0':'1'}</span></div></div>${cards ? `<div class="v8-hand-block"><div class="v8-hand-label">EVIDENCE</div><div class="v8-card-fan">${(p.evidence||[]).map((x,n)=>`<div class="v8-card-wrap" style="--n:${n}">${C.cardHtml(x.text,'evidence',{small:true})}</div>`).join('')}</div><div class="v8-hand-label means-label">MEANS</div><div class="v8-card-fan">${(p.means||[]).map((x,n)=>`<div class="v8-card-wrap" style="--n:${n}">${C.cardHtml(x.text,'means',{small:true})}</div>`).join('')}</div></div>` : `<div class="v8-seat-status">${E(status)}</div>`}${C.state.phase==='lobby'&&C.state.meId===C.state.hostId&&p.isBot?`<button class="remove-bot v8-remove" data-id="${p.id}">×</button>`:''}</article>`;
  };

  C.v8ClueBoard = () => {
    if (!C.state.scene?.length) return '';
    const active = C.state.phase==='forensic' && C.state.private.role==='Forensic Scientist';
    return `<section class="v8-forensic-board"><div class="v8-board-heading"><span>FORENSIC SCENE</span><strong>${C.state.round?`Round ${C.state.round} of 3`:'Initial Clues'}</strong><em>${active?'Place one marker on each open board':'Read the brass markers carefully'}</em></div><div class="v8-clue-row">${C.state.scene.map((t,i)=>`<article class="v8-clue-board ${t.fixed?'fixed':''}" style="--i:${i}"><header><strong>${E(t.title)}</strong>${t.fixed?'<small>FIXED</small>':''}</header><div class="v8-clue-list">${t.options.map(o=>{const chosen=t.marker===o;if(active&&!t.marker) return `<button class="v8-clue-option marker-btn" data-slot="${t.slot}" data-value="${E(o)}"><span>${E(o)}</span></button>`;return `<div class="v8-clue-option ${chosen?'chosen':''}"><span>${E(o)}</span>${chosen?'<i class="v8-brass-marker"></i>':''}</div>`;}).join('')}</div></article>`).join('')}</div></section>`;
  };

  C.v8Secret = (sol,r) => {
    if(['lobby','crime'].includes(C.state.phase)) return '';
    const knows=['Murderer','Forensic Scientist'].includes(r);
    if(knows&&sol) return `<section class="v8-secret-card"><div class="v8-secret-title">SECRET CRIME</div><small>${r==='Forensic Scientist'?`MURDERER • ${E(C.pname(sol.ownerId))}`:'LOCKED BY YOU'}</small><div class="v8-secret-pair">${C.cardHtml(sol.evidenceText,'evidence',{large:true,tag:'KEY EVIDENCE'})}${C.cardHtml(sol.meansText,'means',{large:true,tag:'MEANS'})}</div></section>`;
    if(!knows) return `<section class="v8-secret-card hidden"><div class="v8-secret-title">SECRET CRIME</div><div class="v8-seal">✦</div><strong>CLASSIFIED</strong><p>The exact pair is hidden from your role.</p></section>`;
    return '';
  };

  C.v8Dossier = () => {
    const r=C.state.private.role||'Waiting'; const sol=C.state.private.solution; let hint='Study the clue boards and public cards. You have one exact accusation.';
    if(r==='Murderer') hint='You locked the crime. Blend in and misdirect the table.';
    if(r==='Forensic Scientist') hint='You know the exact crime. Communicate only through the clue boards.';
    if(r==='Accomplice') hint=`Protect ${E(C.pname(C.state.private.murdererId))} without exposing the team.`;
    if(r==='Witness') hint='You know the evil side, but stay subtle so the Murderer cannot identify you later.';
    return `<section class="v8-dossier-card"><div class="v8-paper-title">YOUR DOSSIER</div><small>PRIVATE ROLE</small><h2>${E(r)}</h2><p>${hint}</p><div class="v8-confidential">CONFIDENTIAL</div><button id="revealRole" class="v8-paper-btn">View Role</button></section>${C.v8Secret(sol,r)}`;
  };

  C.v8Chat = () => {
    const locked=C.state.private.role==='Forensic Scientist'&&!['lobby','ended'].includes(C.state.phase); const items=(C.state.log||[]).slice(-18);
    return `<section class="v8-discussion"><div class="v8-chat-tabs"><strong>DISCUSSION</strong><span>NOTES</span></div><div class="v8-chat-log" id="log">${items.map(x=>`<div class="v8-chat-line ${x.type==='chat'?'chat':''}"><div class="v8-chat-dot">${x.type==='chat'?'●':'◆'}</div><p>${E(x.text)}</p></div>`).join('')}</div>${locked?'<div class="v8-chat-lock">Forensic Scientist uses clue markers only.</div>':'<div class="v8-chat-input"><input id="chatText" maxlength="280" placeholder="Type a message…"><button id="send" aria-label="Send">➤</button></div>'}</section>`;
  };

  C.v8AccuseDock = () => {
    const p=C.me(); if(!p||C.state.private.role==='Forensic Scientist'||!['forensic','discussion','final'].includes(C.state.phase)) return C.actionAdvance(); const final=C.state.phase==='final';
    return `<section class="v8-accuse-dock"><div><span>${final?'FINAL DECISION':'MAKE YOUR ACCUSATION'}</span><small>${final?'No more investigation rounds':'Lock in one suspect + Evidence + Means'}</small></div><div class="v8-accuse-actions">${!p.solveUsed?'<button id="openAccuse" class="v8-gold-btn">🔒 OPEN ACCUSATION</button>':'<strong class="v8-spent">Badge spent</strong>'}${final&&!p.finalDone?'<button id="pass" class="v8-dark-btn">Pass Final Decision</button>':''}${C.actionAdvance()}</div></section>`;
  };

  C.v8LobbyCenter = () => `<section class="v8-lobby-center"><div class="v8-lobby-title">WAITING ROOM</div>${C.lobby()}</section>`;
  C.v8MainCenter = () => { if(C.state.phase==='lobby') return C.v8LobbyCenter(); if(C.state.phase==='crime') return `<div class="v8-phase-center">${C.crimePanel()}</div>`; if(C.state.phase==='reversal') return `<div class="v8-phase-center">${C.reversal()}</div>`; if(C.state.phase==='ended') return `<div class="v8-phase-center">${C.result()}</div>`; return C.v8ClueBoard(); };
  C.v8Topbar = () => `<header class="v8-topbar"><div class="v8-room-code"><span>ROOM CODE</span><strong>${E(C.state.code)}</strong><button id="copy" title="Copy invite">⧉</button></div><div class="v8-phase"><span>${E(C.phaseLabel(C.state.phase))}</span>${C.state.phaseEndsAt?`<strong id="phaseTimer">${C.timerText()}</strong>`:''}</div><div class="v8-top-icons"><button id="sound">${C.audioOn?'◉':'○'}</button></div></header>`;

  C.render = () => {
    if(!C.state) return;
    const players=C.state.players||[]; const cut=Math.ceil(players.length/2); const top=players.slice(0,cut), bottom=players.slice(cut);
    C.app.innerHTML=`<div class="v8-app"><div class="v8-desk-props"><i class="v8-book-prop"></i><i class="v8-glass-prop"></i><i class="v8-paper-prop"></i></div>${C.v8Topbar()}<main class="v8-grid"><aside class="v8-left">${C.v8Dossier()}</aside><section class="v8-table"><div class="v8-player-row top-row">${top.map((p,i)=>C.v8Seat(p,i)).join('')}</div><div class="v8-center-content">${C.v8MainCenter()}</div>${bottom.length?`<div class="v8-player-row bottom-row">${bottom.map((p,i)=>C.v8Seat(p,i+cut)).join('')}</div>`:''}${C.v8AccuseDock()}</section><aside class="v8-right">${C.v8Chat()}</aside></main><div class="v8-bottom-props"><i class="v8-coffee"></i><i class="v8-watch"></i><i class="v8-casefile"></i></div></div>`;
    C.bind(); C.startTimer(); if(C.lastPhase&&C.lastPhase!==C.state.phase) C.beep(C.state.phase==='ended'?'win':'phase'); C.lastPhase=C.state.phase; setTimeout(C.roleOverlay,180); setTimeout(C.maybeSecretOverlay,460);
  };
})();
