(() => {
  'use strict';
  const C=window.CF5,E=C.esc;

  C.lobby = () => {
    const host=C.state.meId===C.state.hostId,c=C.state.players.length;
    return `<section class="panel lobby-panel"><div class="stamp">WAITING ROOM</div><div class="lobby-grid"><div><h2>${c} player${c===1?'':'s'} at the table</h2><p class="muted">4–12 total seats. Bots can fill empty seats instantly.</p><div class="settings"><label><span>CARDS</span><select id="cards" ${host?'':'disabled'}>${[3,4,5].map(n=>`<option value="${n}" ${C.state.settings.cardsPerType===n?'selected':''}>${n} Evidence + ${n} Means</option>`).join('')}</select></label><label><span>ROUND TIMER</span><select id="roundTimer" ${host?'':'disabled'}>${[[0,'Off'],[60,'60 sec'],[90,'90 sec'],[120,'120 sec']].map(([n,t])=>`<option value="${n}" ${C.state.settings.discussionTimerSec===n?'selected':''}>${t}</option>`).join('')}</select></label></div>${host?'<div class="bot-controls"><button id="addBot" class="btn secondary">+ Add Bot</button><button id="fillBots" class="btn bot-btn">Fill to 6</button></div>':''}</div><div class="lobby-side"><div class="room-code-card"><span>INVITE CODE</span><strong>${E(C.state.code)}</strong><button id="copy2" class="btn secondary">Copy Invite</button></div><div class="notice ${c>=4?'good':'gold'}">${c>=4?'Enough seats are filled. Start whenever everyone is ready.':`Need ${4-c} more seat${4-c===1?'':'s'} before starting.`}</div></div></div>${host?`<button id="start" class="btn full start-btn" ${c<4?'disabled':''}>Deal Secret Roles & Start</button>`:'<p class="muted waiting-host">Waiting for the host to start.</p>'}</section>`;
  };

  C.crimePanel = () => {
    if(C.state.phase!=='crime')return'';
    if(C.state.private.role!=='Murderer')return `<section class="panel wait-panel"><div class="stamp">SECRET SETUP</div><h2>The Murderer is choosing the Secret Crime.</h2><p class="muted">When it is locked, only the Murderer and Forensic Scientist will see the exact pair.</p></section>`;
    const p=C.me();
    return `<section class="panel crime-panel"><div class="stamp danger-stamp">MURDERER ONLY</div><h2>Choose the Secret Crime</h2><p class="muted">Select one Evidence card and one Means card. Your selected cards stay visible to you after locking.</p><div class="dual"><div><h3>Key Evidence</h3><div class="premium-pick-grid">${p.evidence.map(x=>C.cardHtml(x.text,'evidence',{interactive:true,selected:C.crime.evidenceId===x.id,dataId:x.id,extraClass:'crime-e'})).join('')}</div></div><div><h3>Means of Murder</h3><div class="premium-pick-grid">${p.means.map(x=>C.cardHtml(x.text,'means',{interactive:true,selected:C.crime.meansId===x.id,dataId:x.id,extraClass:'crime-m'})).join('')}</div></div></div><button id="lockCrime" class="btn danger full" ${C.crime.evidenceId&&C.crime.meansId?'':'disabled'}>Lock In Secret Crime</button></section>`;
  };

  C.clueBoard = () => {
    if(!C.state.scene?.length)return'';const active=C.state.phase==='forensic'&&C.state.private.role==='Forensic Scientist';
    return `<section class="board"><div class="board-title"><div><span>FORENSIC CLUE BOARD</span><strong>${C.state.round?`Round ${C.state.round}`:'Initial Clues'}</strong></div>${active?'<em>Choose one clue card in each empty tile</em>':'<em>Read every marker</em>'}</div><div class="clue-grid">${C.state.scene.map((t,i)=>`<article class="clue-tile ${t.fixed?'fixed':''}" style="--i:${i}"><header>${E(t.title)}${t.fixed?'<small>FIXED</small>':''}</header>${t.marker?`<div class="token"><span>MARKER</span><strong>${E(t.marker)}</strong></div>`:active?`<div class="clue-option-grid">${t.options.map(o=>`<button class="clue-option-card marker-btn" data-slot="${t.slot}" data-value="${E(o)}"><span class="clue-symbol">⌖</span><small>CLUE</small><strong>${E(o)}</strong></button>`).join('')}</div>`:'<div class="marker-empty">waiting for marker…</div>'}</article>`).join('')}</div></section>`;
  };

  C.tableCards = () => {
    if(C.state.phase==='crime'||!C.state.players.some(p=>p.evidence.length))return'';
    return `<section class="suspect-area"><div class="area-title"><span>PUBLIC SUSPECT TABLEAUS</span><small>Study the physical-style cards. The real pair is somewhere on the Murderer’s tableau.</small></div><div class="suspect-grid">${C.state.players.filter(p=>p.evidence.length).map((p,idx)=>`<article class="suspect-table ${C.accusation.targetId===p.id?'selected':''}" style="--seat:${idx}"><header><div><strong>${E(p.name)}</strong>${p.isBot?`<small>${E(p.botStyle)} bot</small>`:''}</div>${p.solveUsed?'<span class="table-badge spent">badge spent</span>':'<span class="table-badge">badge ready</span>'}</header><div class="card-columns"><div><h4>EVIDENCE</h4><div class="public-card-grid">${p.evidence.map(x=>C.cardHtml(x.text,'evidence',{small:true})).join('')}</div></div><div><h4>MEANS</h4><div class="public-card-grid">${p.means.map(x=>C.cardHtml(x.text,'means',{small:true})).join('')}</div></div></div></article>`).join('')}</div></section>`;
  };

  C.accusationPanel = () => {
    const p=C.me();if(!p||C.state.private.role==='Forensic Scientist'||!['forensic','discussion','final'].includes(C.state.phase))return'';const final=C.state.phase==='final';
    return `<section class="action-dock ${final?'final-dock':''}"><div class="action-copy"><span>${final?'FINAL DECISION':'SOLVE CRIME'}</span><strong>${final?'Accuse or pass — no more rounds':'You only get one exact accusation'}</strong></div>${p.solveUsed?'<div class="notice">Your Solve Crime badge is already spent.</div>':'<button id="openAccuse" class="btn danger">Open Accusation Cards</button>'}${final&&!p.finalDone?'<button id="pass" class="btn secondary">Pass Final Decision</button>':final&&p.finalDone?`<span class="locked-choice">Locked: ${E(p.finalAction||'done')}</span>`:''}</section>`;
  };

  C.actionAdvance = () => {
    const ok=C.state.phase==='discussion'&&(C.state.meId===C.state.hostId||C.state.private.role==='Forensic Scientist');if(!ok)return'';
    return `<section class="round-control"><div><span>TABLE CONTROL</span><strong>${C.state.round<3?`Finish Round ${C.state.round}`:'Round 3 complete'}</strong></div><button id="advance" class="btn">${C.state.round<3?`Advance to Round ${C.state.round+1}`:'Open Final Discussion'}</button></section>`;
  };
})();
