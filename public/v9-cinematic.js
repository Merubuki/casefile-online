(() => {
  'use strict';
  const C=window.CF5;
  if(!C)return;
  const E=C.esc;

  const SKIN=['#d7a57f','#8e6048','#e2b18b','#c58b69','#a36d50','#e7bc98','#b77c5b','#d19a73'];
  const HAIR=['#231713','#191817','#3b2419','#4e3023','#201a17','#5d4434','#2b211d','#3a291f'];
  const COAT=['#463329','#2a3840','#4c382e','#3d3145','#2f433c','#604a39','#273a45','#44362c'];
  const BG=['#324438','#24313a','#403327','#303644','#263e36','#514231','#293a3c','#3b2e2a'];

  C.v9Portrait=(p,i=0)=>{
    const skin=SKIN[i%SKIN.length],hair=HAIR[i%HAIR.length],coat=COAT[i%COAT.length],bg=BG[i%BG.length];
    const female=i%3!==1;
    const side=female?'<path d="M24 49c-1-27 10-42 31-42 23 0 34 16 33 45l-5 36-12-22-40 20z"/>':'<path d="M27 43c0-22 11-34 29-34 20 0 30 13 30 34v16l-9-7H33z"/>';
    return `<svg class="v9-portrait-svg" viewBox="0 0 120 148" aria-hidden="true"><defs><radialGradient id="bg${i}" cx="30%" cy="20%"><stop stop-color="${bg}"/><stop offset="1" stop-color="#0c0d0d"/></radialGradient><linearGradient id="face${i}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3c7a3"/><stop offset=".38" stop-color="${skin}"/><stop offset="1" stop-color="#9a624d"/></linearGradient><linearGradient id="coat${i}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${coat}"/><stop offset="1" stop-color="#161514"/></linearGradient></defs><rect width="120" height="148" rx="8" fill="url(#bg${i})"/><ellipse cx="93" cy="24" rx="42" ry="30" fill="#d9ad61" opacity=".08"/><g fill="${hair}">${side}</g><ellipse cx="58" cy="59" rx="25" ry="31" fill="url(#face${i})"/><path d="M34 54c3-27 13-39 28-39 13 0 25 8 29 27-13-10-26-14-40-10-8 2-13 8-17 22z" fill="${hair}"/><path d="M44 56h9M65 56h9" stroke="#2b211e" stroke-width="2.4" stroke-linecap="round"/><circle cx="49" cy="57" r="1.7" fill="#0d0d0d"/><circle cx="70" cy="57" r="1.7" fill="#0d0d0d"/><path d="M58 60l-2 10 5 1" fill="none" stroke="#9a6754" stroke-width="1.5"/><path d="M50 78c5 3 10 3 15 0" stroke="#7d443c" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M10 148c4-35 20-54 48-54s48 19 52 54z" fill="url(#coat${i})"/><path d="M42 100l16 21 17-21" fill="#e7d6ba" opacity=".75"/><path d="M58 121l-6 27h14z" fill="#5b2c27"/><rect x="6" y="6" width="108" height="136" rx="6" fill="none" stroke="#e0bc73" opacity=".16"/><circle cx="103" cy="16" r="5" fill="${p.connected===false?'#8b3a34':'#6fbf73'}"/><circle cx="103" cy="16" r="9" fill="none" stroke="${p.connected===false?'#8b3a34':'#6fbf73'}" opacity=".18"/></svg>`;
  };

  C.v9Dossier=()=>{
    const r=C.state.private.role||'Waiting', sol=C.state.private.solution;
    let hint='Compare the clue boards and every public card. Your accusation must match exactly.';
    if(r==='Murderer')hint='You locked the crime. Stay composed, redirect suspicion, and protect the secret pair.';
    if(r==='Forensic Scientist')hint='You know the exact crime. Guide the table only through forensic markers.';
    if(r==='Accomplice')hint=`Protect ${E(C.pname(C.state.private.murdererId))} without making your partnership obvious.`;
    if(r==='Witness')hint='You know the evil side. Help carefully so the Murderer cannot identify you later.';
    const me=C.me(), idx=Math.max(0,C.state.players.findIndex(p=>p.id===C.state.meId));
    const secret=(()=>{if(['lobby','crime'].includes(C.state.phase))return'';const knows=['Murderer','Forensic Scientist'].includes(r);if(knows&&sol)return `<section class="v9-secret"><div class="v9-secret-head"><span>SECRET CRIME</span><b>${r==='Forensic Scientist'?`MURDERER • ${E(C.pname(sol.ownerId))}`:'LOCKED BY YOU'}</b></div><div class="v9-secret-pair">${C.cardHtml(sol.evidenceText,'evidence',{large:true,tag:'KEY EVIDENCE'})}<i>+</i>${C.cardHtml(sol.meansText,'means',{large:true,tag:'MEANS'})}</div></section>`;return `<section class="v9-secret classified"><span>SECRET CRIME</span><div class="v9-wax">✦</div><strong>CLASSIFIED</strong><small>Hidden from your role</small></section>`;})();
    return `<div class="v9-dossier-stack"><section class="v9-dossier"><div class="v9-paperclip"></div><div class="v9-dossier-title">YOUR DOSSIER</div><div class="v9-photo">${C.v9Portrait(me||{connected:true},idx)}</div><small>PRIVATE ROLE</small><h2>${E(r)}</h2><p>${hint}</p><div class="v9-stamp">CONFIDENTIAL</div><button id="revealRole" class="v9-paper-button">OPEN ROLE FILE</button></section>${secret}</div>`;
  };

  C.v9Seat=(p,i=0)=>{
    const has=(p.evidence?.length||p.means?.length);
    return `<article class="v9-seat ${p.id===C.state.meId?'me':''} ${p.finalDone?'done':''}"><div class="v9-player-file"><div class="v9-player-photo">${C.v9Portrait(p,i)}</div><div class="v9-player-copy"><strong>${E(p.name)}</strong><small>${p.isBot?`${E(p.botStyle)} bot`:p.id===C.state.hostId?'host':'player'}</small><span>${p.solveUsed?'BADGE SPENT':'★ BADGE READY'}</span></div></div>${has?`<div class="v9-player-hand"><div><em>EVIDENCE</em><div class="v9-card-strip">${p.evidence.map((x,n)=>`<div style="--n:${n}">${C.cardHtml(x.text,'evidence',{small:true})}</div>`).join('')}</div></div><div><em>MEANS</em><div class="v9-card-strip">${p.means.map((x,n)=>`<div style="--n:${n}">${C.cardHtml(x.text,'means',{small:true})}</div>`).join('')}</div></div></div>`:''}${C.state.phase==='lobby'&&C.state.meId===C.state.hostId&&p.isBot?`<button class="remove-bot v9-remove" data-id="${p.id}">×</button>`:''}</article>`;
  };

  C.v9Clues=()=>{
    if(!C.state.scene?.length)return'';
    const active=C.state.phase==='forensic'&&C.state.private.role==='Forensic Scientist';
    return `<section class="v9-forensic"><div class="v9-section-head"><span>FORENSIC CLUE BOARDS</span><strong>${C.state.round?`ROUND ${C.state.round} OF 3`:'INITIAL SCENE'}</strong><small>${active?'Place one brass marker on every open board':'Read the markers and compare the suspect cards'}</small></div><div class="v9-clue-row">${C.state.scene.map((t,i)=>`<article class="v9-clue ${t.fixed?'fixed':''}" style="--i:${i}"><header>${E(t.title)}${t.fixed?'<small>FIXED</small>':''}</header><div>${t.options.map(o=>{const chosen=t.marker===o;if(active&&!t.marker)return `<button class="v9-clue-option marker-btn" data-slot="${t.slot}" data-value="${E(o)}">${E(o)}</button>`;return `<div class="v9-clue-option ${chosen?'chosen':''}">${E(o)}${chosen?'<i class="v9-bullet"></i>':''}</div>`;}).join('')}</div></article>`).join('')}</div></section>`;
  };

  C.v9Chat=()=>{
    const locked=C.state.private.role==='Forensic Scientist'&&!['lobby','ended'].includes(C.state.phase),items=(C.state.log||[]).slice(-16);
    return `<section class="v9-chat"><header><div><span>${C.state.phase==='final'?'FINAL DISCUSSION':'DISCUSSION'}</span><strong>${C.state.round?`ROUND ${C.state.round} OF 3`:'CASE LOG'}</strong></div><b>NOTES</b></header><div class="v9-chat-log" id="log">${items.map((x,i)=>`<article class="v9-message ${x.type==='chat'?'chat':'system'}"><div class="v9-message-avatar">${x.type==='chat'?'●':'◆'}</div><p>${E(x.text)}</p></article>`).join('')}</div>${locked?'<div class="v9-chat-lock">Forensic Scientist communicates through clue markers only.</div>':'<div class="v9-chat-input"><input id="chatText" maxlength="280" placeholder="Type a message…"><button id="send">➤</button></div>'}</section>`;
  };

  C.v9Top=()=>`<header class="v9-top"><div class="v9-brand"><strong>CASEFILE</strong><span>ONLINE • VERSION 9</span></div><div class="v9-room"><small>ROOM CODE</small><strong>${E(C.state.code)}</strong><button id="copy">⧉</button></div><div class="v9-phase"><span>${E(C.phaseLabel(C.state.phase))}</span>${C.state.phaseEndsAt?`<strong id="phaseTimer">${C.timerText()}</strong>`:''}<button id="sound">${C.audioOn?'◉':'○'}</button></div></header>`;

  C.v9Action=()=>{
    const p=C.me();
    if(!p||C.state.private.role==='Forensic Scientist'||!['forensic','discussion','final'].includes(C.state.phase))return C.actionAdvance();
    const final=C.state.phase==='final';
    return `<section class="v9-accuse"><div><span>${final?'FINAL DECISION':'MAKE YOUR ACCUSATION'}</span><small>${final?'No more rounds — accuse or pass':'Lock one suspect + Evidence + Means'}</small></div><div class="v9-slots"><b>SUSPECT</b><b>EVIDENCE</b><b>MEANS</b></div><div class="v9-accuse-buttons">${!p.solveUsed?'<button id="openAccuse" class="v9-lock">🔒 LOCK ACCUSATION</button>':'<strong class="v9-spent">BADGE SPENT</strong>'}${final&&!p.finalDone?'<button id="pass" class="v9-pass">PASS</button>':''}${C.actionAdvance()}</div></section>`;
  };

  C.v9Center=()=>{if(C.state.phase==='lobby')return `<div class="v9-phase-card">${C.lobby()}</div>`;if(C.state.phase==='crime')return `<div class="v9-phase-card">${C.crimePanel()}</div>`;if(C.state.phase==='reversal')return `<div class="v9-phase-card">${C.reversal()}</div>`;if(C.state.phase==='ended')return `<div class="v9-phase-card">${C.result()}</div>`;return C.v9Clues();};

  C.render=()=>{
    if(!C.state)return;
    const players=C.state.players||[],cut=Math.ceil(players.length/2),top=players.slice(0,cut),bottom=players.slice(cut);
    C.app.innerHTML=`<div class="v9-world"><div class="v9-lamp"></div><div class="v9-books"></div><div class="v9-coffee"></div><div class="v9-watch"></div><div class="v9-casebook"></div>${C.v9Top()}<main class="v9-layout"><aside class="v9-left">${C.v9Dossier()}</aside><section class="v9-table"><div class="v9-seat-row top">${top.map((p,i)=>C.v9Seat(p,i)).join('')}</div><div class="v9-center">${C.v9Center()}</div>${bottom.length?`<div class="v9-seat-row bottom">${bottom.map((p,i)=>C.v9Seat(p,i+cut)).join('')}</div>`:''}${C.v9Action()}</section><aside class="v9-right">${C.v9Chat()}</aside></main></div>`;
    C.bind();C.startTimer();if(C.lastPhase&&C.lastPhase!==C.state.phase)C.beep(C.state.phase==='ended'?'win':'phase');C.lastPhase=C.state.phase;setTimeout(C.roleOverlay,180);setTimeout(C.maybeSecretOverlay,460);
  };
})();
