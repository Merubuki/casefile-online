(() => {
  'use strict';
  const C = window.CF5;
  if (!C) return;
  const E = C.esc;

  const pcClass = () => {
    const n = Math.max(1, C.state?.players?.length || 1);
    if (n <= 4) return 'pc-4';
    if (n <= 6) return 'pc-6';
    if (n <= 8) return 'pc-8';
    return 'pc-12';
  };

  const palette = [
    ['#efb179','#38231d','#2f5b4a'],['#c78259','#171515','#60402e'],['#e3a879','#2b201c','#344e60'],
    ['#a76e4d','#1a1613','#405940'],['#cf8962','#2d201c','#514364'],['#e5b082','#563626','#355a55'],
    ['#ba7854','#201918','#5a4330'],['#d99d70','#38251d','#3d5060']
  ];

  C.v11Portrait = (p, i = 0) => {
    const [skin,hair,coat] = palette[i % palette.length];
    const bg = ['#12342f','#242d35','#3a2824','#25382f'][i % 4];
    return `<svg class="v11-pixel-portrait" viewBox="0 0 48 56" shape-rendering="crispEdges" aria-hidden="true">
      <rect width="48" height="56" fill="${bg}"/><rect x="4" y="4" width="40" height="48" fill="#08110f" opacity=".22"/>
      <rect x="14" y="8" width="20" height="5" fill="${hair}"/><rect x="10" y="13" width="28" height="8" fill="${hair}"/>
      <rect x="12" y="18" width="24" height="19" fill="${skin}"/><rect x="9" y="20" width="5" height="14" fill="${hair}"/><rect x="34" y="20" width="5" height="14" fill="${hair}"/>
      <rect x="16" y="23" width="4" height="3" fill="#17110f"/><rect x="28" y="23" width="4" height="3" fill="#17110f"/>
      <rect x="23" y="27" width="3" height="5" fill="#9c6248"/><rect x="19" y="34" width="10" height="2" fill="#6f3c34"/>
      <rect x="15" y="38" width="18" height="4" fill="#e2c19c"/><rect x="8" y="42" width="32" height="14" fill="${coat}"/>
      <rect x="21" y="42" width="6" height="14" fill="#1a2522" opacity=".65"/><rect x="2" y="2" width="44" height="52" fill="none" stroke="#b27a32" stroke-width="2"/>
      <rect x="40" y="4" width="4" height="4" fill="${p?.connected === false ? '#a83c32' : '#4abf69'}"/>
    </svg>`;
  };

  const iconKey = (text = '', type = 'evidence') => {
    const s = String(text).toLowerCase();
    const has = (...x) => x.some(k => s.includes(k));
    if (type === 'means') {
      if (has('knife','razor','blade','scissor','ice pick','screwdriver')) return 'knife';
      if (has('rope','wire','cable','strang','suffocation')) return 'rope';
      if (has('poison','overdose','sedative','chemical','acid','medication')) return 'poison';
      if (has('fire','burn','heated','boiling')) return 'fire';
      if (has('hammer','mallet','blunt','bat','crowbar','wrench','brick','pipe','stone','shovel')) return 'hammer';
      if (has('electric','live wire')) return 'electric';
      if (has('drown','water')) return 'water';
      if (has('gas','carbon monoxide','smoke')) return 'gas';
      if (has('glass')) return 'glass';
      return 'weapon';
    }
    if (has('camera','photo')) return 'camera';
    if (has('key','keyring','keychain')) return 'key';
    if (has('glasses','sunglasses','eyeglasses')) return 'glasses';
    if (has('glove')) return 'glove';
    if (has('ticket','pass','stub')) return 'ticket';
    if (has('notebook','diary','book')) return 'book';
    if (has('bottle','medicine')) return 'bottle';
    if (has('newspaper','receipt','note','letter','envelope','email','paper')) return 'paper';
    if (has('watch','clock')) return 'watch';
    if (has('flower','petal')) return 'flower';
    if (has('id','badge','permit','card')) return 'id';
    if (has('phone','usb','device','sim','battery','charger')) return 'device';
    if (has('wallet','purse')) return 'wallet';
    if (has('bag','backpack')) return 'bag';
    return 'clue';
  };

  const pixelIcon = (key) => {
    const s = {
      camera:'<rect x="12" y="22" width="40" height="26"/><rect x="20" y="16" width="18" height="8"/><rect x="24" y="28" width="16" height="16" fill="#15221f"/><rect x="28" y="32" width="8" height="8"/>',
      key:'<rect x="14" y="18" width="16" height="16"/><rect x="20" y="24" width="30" height="6"/><rect x="42" y="30" width="6" height="8"/><rect x="34" y="30" width="6" height="6"/>',
      glasses:'<rect x="8" y="24" width="18" height="14"/><rect x="38" y="24" width="18" height="14"/><rect x="26" y="28" width="12" height="4"/>',
      glove:'<rect x="22" y="18" width="22" height="30"/><rect x="16" y="22" width="8" height="20"/><rect x="26" y="10" width="5" height="14"/><rect x="34" y="8" width="5" height="16"/><rect x="42" y="12" width="5" height="16"/>',
      ticket:'<rect x="8" y="20" width="48" height="28"/><rect x="14" y="26" width="14" height="4" fill="#17201d"/><rect x="14" y="34" width="30" height="4" fill="#17201d"/>',
      book:'<rect x="14" y="12" width="38" height="42"/><rect x="18" y="16" width="5" height="34" fill="#17201d"/><rect x="28" y="22" width="16" height="4" fill="#17201d"/>',
      bottle:'<rect x="24" y="10" width="16" height="10"/><rect x="20" y="20" width="24" height="34"/><rect x="25" y="32" width="14" height="12" fill="#17201d"/>',
      paper:'<rect x="10" y="14" width="44" height="36"/><rect x="16" y="22" width="28" height="4" fill="#17201d"/><rect x="16" y="30" width="34" height="4" fill="#17201d"/>',
      watch:'<rect x="27" y="6" width="10" height="14"/><rect x="27" y="44" width="10" height="14"/><rect x="18" y="18" width="28" height="28"/><rect x="30" y="22" width="4" height="12" fill="#17201d"/>',
      flower:'<rect x="30" y="28" width="4" height="28"/><rect x="18" y="16" width="12" height="12"/><rect x="34" y="16" width="12" height="12"/><rect x="26" y="8" width="12" height="12"/><rect x="26" y="22" width="12" height="12"/>',
      id:'<rect x="8" y="16" width="48" height="34"/><rect x="14" y="22" width="14" height="16" fill="#17201d"/><rect x="34" y="22" width="16" height="4" fill="#17201d"/>',
      device:'<rect x="20" y="6" width="24" height="52"/><rect x="25" y="12" width="14" height="34" fill="#17201d"/>',
      wallet:'<rect x="10" y="20" width="46" height="30"/><rect x="34" y="28" width="22" height="14" fill="#17201d"/>',
      bag:'<rect x="12" y="22" width="40" height="32"/><rect x="20" y="12" width="24" height="14"/><rect x="28" y="22" width="8" height="32" fill="#17201d"/>',
      knife:'<rect x="8" y="42" width="20" height="8"/><rect x="24" y="34" width="10" height="12"/><path d="M30 34h24V16H46z"/>',
      rope:'<rect x="12" y="12" width="40" height="8"/><rect x="8" y="20" width="8" height="28"/><rect x="48" y="20" width="8" height="28"/><rect x="16" y="44" width="32" height="8"/>',
      poison:'<rect x="24" y="8" width="16" height="12"/><rect x="18" y="20" width="28" height="36"/><rect x="24" y="32" width="16" height="12" fill="#17201d"/>',
      fire:'<rect x="28" y="8" width="8" height="12"/><rect x="20" y="18" width="24" height="12"/><rect x="14" y="28" width="36" height="18"/><rect x="10" y="46" width="44" height="8"/>',
      hammer:'<rect x="12" y="14" width="34" height="14"/><rect x="30" y="24" width="8" height="34"/><rect x="46" y="18" width="10" height="8"/>',
      electric:'<path d="M34 6H22L12 34h16l-6 24 30-36H34z"/>',
      water:'<rect x="8" y="42" width="48" height="6"/><rect x="16" y="34" width="12" height="6"/><rect x="34" y="28" width="14" height="6"/><rect x="24" y="16" width="16" height="12"/>',
      gas:'<rect x="14" y="18" width="36" height="32"/><rect x="22" y="8" width="8" height="10"/><rect x="34" y="8" width="8" height="10"/><rect x="20" y="28" width="8" height="8" fill="#17201d"/><rect x="36" y="28" width="8" height="8" fill="#17201d"/>',
      glass:'<path d="M10 12h16l4 18 12-12 12 8-8 10 10 12-22 8-6-14-18 8z"/>',
      weapon:'<rect x="12" y="38" width="28" height="8"/><rect x="34" y="20" width="8" height="24"/><rect x="40" y="14" width="12" height="12"/>',
      clue:'<rect x="14" y="12" width="36" height="40"/><rect x="20" y="20" width="24" height="4" fill="#17201d"/><rect x="20" y="30" width="18" height="4" fill="#17201d"/>'
    };
    return s[key] || s.clue;
  };

  C.v11Card = (text, type = 'evidence', opts = {}) => {
    const key = iconKey(text, type);
    const tag = type === 'means' ? 'MEANS' : 'EVIDENCE';
    return `<div class="v11-card ${type} ${opts.mini ? 'mini' : ''} ${opts.selected ? 'selected' : ''}"${opts.id ? ` data-id="${opts.id}"` : ''}>
      <div class="v11-card-label">${opts.tag ? E(opts.tag) : tag}</div>
      <svg class="v11-item-icon icon-${key}" viewBox="0 0 64 64" shape-rendering="crispEdges" aria-hidden="true"><g fill="currentColor">${pixelIcon(key)}</g></svg>
      <strong>${E(text)}</strong><small>${opts.owner ? `${E(opts.owner)} • ` : ''}${tag}</small>
    </div>`;
  };

  C.v11Top = () => `<header class="v11-top">
    <div class="v11-brand"><strong>CASEFILE</strong><span>ONLINE</span><em>VERSION 11</em></div>
    <div class="v11-room"><small>ROOM CODE</small><strong>${E(C.state.code)}</strong><button id="copy">⧉</button></div>
    <div class="v11-status"><span>${E(C.phaseLabel(C.state.phase))}</span>${C.state.phaseEndsAt ? `<strong id="phaseTimer">${C.timerText()}</strong>` : ''}<button id="sound">${C.audioOn ? '🔊' : '🔇'}</button></div>
  </header>`;

  C.v11Dossier = () => {
    const role = C.state.private.role || 'Waiting';
    const sol = C.state.private.solution;
    const me = C.me() || {connected:true};
    const idx = Math.max(0, C.state.players.findIndex(p => p.id === C.state.meId));
    const desc = role === 'Forensic Scientist' ? 'You know the exact crime. Guide the table through clue markers.' :
      role === 'Murderer' ? 'Protect the secret pair and redirect suspicion.' :
      role === 'Witness' ? 'You know the evil side. Help carefully and stay hidden.' :
      role === 'Accomplice' ? `Protect ${E(C.pname(C.state.private.murdererId))} without exposing the team.` :
      'Read the clue board and every public card before using your solve badge.';
    let secret = '';
    if (!['lobby','crime'].includes(C.state.phase)) {
      if (['Murderer','Forensic Scientist'].includes(role) && sol) {
        secret = `<section class="v11-secret"><h3>SECRET CRIME</h3><div class="v11-secret-pair">${C.v11Card(sol.evidenceText,'evidence',{mini:true,tag:'KEY EVIDENCE'})}${C.v11Card(sol.meansText,'means',{mini:true,tag:'MEANS'})}</div><small>${role === 'Forensic Scientist' ? `MURDERER: ${E(C.pname(sol.ownerId))}` : 'LOCKED BY YOU'}</small></section>`;
      } else secret = `<section class="v11-secret locked"><h3>SECRET CRIME</h3><img src="/assets/v11/card-back.svg" alt="Hidden secret crime"><strong>CLASSIFIED</strong></section>`;
    }
    return `<div class="v11-left-stack"><section class="v11-dossier"><h3>YOUR DOSSIER</h3><div class="v11-role-row"><div class="v11-role-photo">${C.v11Portrait(me,idx)}</div><div><small>PRIVATE ROLE</small><h2>${E(role)}</h2><p>${desc}</p></div></div><div class="v11-confidential">CONFIDENTIAL</div><button id="revealRole">OPEN ROLE FILE</button></section>${secret}</div>`;
  };

  C.v11Clues = () => {
    if (!C.state.scene?.length) return '';
    const active = C.state.phase === 'forensic' && C.state.private.role === 'Forensic Scientist';
    return `<section class="v11-clues"><div class="v11-strip-title evidence">FORENSIC CLUES</div><div class="v11-clue-grid">${C.state.scene.map((t,i)=>`<article class="v11-clue ${t.fixed?'fixed':''}" style="--i:${i}"><header>${E(t.title)}</header><div>${t.options.map(o=>{const chosen=t.marker===o;if(active&&!t.marker)return `<button class="v11-clue-option marker-btn" data-slot="${t.slot}" data-value="${E(o)}">${E(o)}</button>`;return `<div class="v11-clue-option ${chosen?'chosen':''}">${chosen?'<i>◉</i>':''}${E(o)}</div>`;}).join('')}</div></article>`).join('')}</div></section>`;
  };

  const flattened = type => (C.state.players || []).flatMap(p => (p[type] || []).map(card => ({...card,owner:p.name})));
  C.v11GlobalCards = () => {
    const ev = flattened('evidence'), mn = flattened('means');
    const cols = Math.min(15, Math.max(6, Math.ceil(Math.max(ev.length,mn.length)/2)));
    return `<section class="v11-global-cards" style="--cols:${cols}"><div class="v11-strip-title evidence">EVIDENCE</div><div class="v11-global-row evidence">${ev.map(c=>C.v11Card(c.text,'evidence',{mini:true,owner:c.owner})).join('')}</div><div class="v11-strip-title means">MEANS</div><div class="v11-global-row means">${mn.map(c=>C.v11Card(c.text,'means',{mini:true,owner:c.owner})).join('')}</div></section>`;
  };

  C.v11Players = () => `<section class="v11-player-strip ${pcClass()}">${(C.state.players||[]).map((p,i)=>`<article class="v11-player-card ${p.id===C.state.meId?'me':''}"><div class="v11-player-photo">${C.v11Portrait(p,i)}</div><strong>${E(p.name)}</strong><span>${p.solveUsed?'BADGE SPENT':'★ BADGE READY'}</span><div class="v11-player-icons">${p.evidence?.[0]?C.v11Card(p.evidence[0].text,'evidence',{mini:true}):''}${p.means?.[0]?C.v11Card(p.means[0].text,'means',{mini:true}):''}</div></article>`).join('')}</section>`;

  C.v11Chat = () => {
    const locked = C.state.private.role === 'Forensic Scientist' && !['lobby','ended'].includes(C.state.phase);
    const items = (C.state.log || []).slice(-16);
    return `<section class="v11-chat"><header><span>DISCUSSION</span><b>NOTES</b></header><div class="v11-chat-log" id="log">${items.map((x,i)=>`<article class="v11-chat-line ${x.type==='chat'?'chat':'system'}"><div class="v11-chat-avatar">${x.type==='chat'?C.v11Portrait({connected:true},i):'◆'}</div><p>${E(x.text)}</p></article>`).join('')}</div>${locked?'<div class="v11-chat-lock">Forensic Scientist communicates through clue markers only.</div>':'<div class="v11-chat-input"><input id="chatText" maxlength="280" placeholder="Type a message…"><button id="send">➤</button></div>'}<div class="v11-round-box"><strong>${C.state.phase==='final'?'FINAL DISCUSSION':C.state.round?`ROUND ${C.state.round} OF 3`:'CASE LOG'}</strong><small>${C.state.phase==='final'?'NO MORE CLUES':'INVESTIGATION IN PROGRESS'}</small><div class="v11-progress"><i class="on"></i><i class="${C.state.round>=2?'on':''}"></i><i class="${C.state.round>=3?'on':''}"></i></div></div></section>`;
  };

  C.v11Action = () => {
    const p = C.me();
    if (!p || C.state.private.role === 'Forensic Scientist' || !['forensic','discussion','final'].includes(C.state.phase)) return `<section class="v11-action simple">${C.actionAdvance()}</section>`;
    const final = C.state.phase === 'final';
    return `<section class="v11-action"><div class="v11-action-copy"><strong>${final?'FINAL DECISION':'MAKE YOUR ACCUSATION'}</strong><small>${final?'No more rounds — accuse or pass':'Select one from each category'}</small></div><div class="v11-action-slots"><span>SUSPECT</span><span>EVIDENCE</span><span>MEANS</span></div><div class="v11-action-buttons">${!p.solveUsed?'<button id="openAccuse" class="v11-lock">🔒 LOCK ACCUSATION</button>':'<strong>BADGE SPENT</strong>'}${final&&!p.finalDone?'<button id="pass" class="v11-pass">PASS</button>':''}${C.actionAdvance()}</div></section>`;
  };

  C.v11Center = () => {
    if (C.state.phase === 'lobby') return `<div class="v11-phase-card">${C.lobby()}</div>`;
    if (C.state.phase === 'crime') return `<div class="v11-phase-card">${C.crimePanel()}</div>`;
    if (C.state.phase === 'reversal') return `<div class="v11-phase-card">${C.reversal()}</div>`;
    if (C.state.phase === 'ended') return `<div class="v11-phase-card">${C.result()}</div>`;
    return `${C.v11Clues()}${C.v11GlobalCards()}${C.v11Players()}`;
  };

  C.render = () => {
    if (!C.state) return;
    C.app.innerHTML = `<div class="v11-world ${pcClass()}">${C.v11Top()}<main class="v11-layout"><aside class="v11-left">${C.v11Dossier()}</aside><section class="v11-board">${C.v11Center()}${C.v11Action()}</section><aside class="v11-right">${C.v11Chat()}</aside></main><div class="v11-bottom-tools"><button>📖 RULES</button><button>◷ HISTORY</button></div></div>`;
    C.bind();
    C.startTimer();
    if (C.lastPhase && C.lastPhase !== C.state.phase) C.beep(C.state.phase === 'ended' ? 'win' : 'phase');
    C.lastPhase = C.state.phase;
    setTimeout(C.roleOverlay,180);
    setTimeout(C.maybeSecretOverlay,460);
  };
})();
