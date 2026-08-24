(() => {
  'use strict';
  const C=window.CF5,E=C.esc;

  C.roleOverlay = () => {
    if(!C.state||['lobby','ended'].includes(C.state.phase))return;
    const key=`${C.state.gameId}:${C.state.meId}`,seen=JSON.parse(localStorage.getItem(C.ROLE_SEEN)||'{}');
    if(seen[key])return;seen[key]=true;localStorage.setItem(C.ROLE_SEEN,JSON.stringify(seen));C.showRole();
  };

  C.showRole = () => {
    if(!C.state)return;const r=C.state.private.role||'Unknown';let x='';
    if(r==='Murderer')x='Choose one Evidence and one Means from your own cards. After locking, your Secret Crime remains visible in your private dossier.';
    if(r==='Forensic Scientist')x='After the Murderer locks the crime, the exact Evidence + Means pair will appear in your private dossier. Use it to guide your clue markers.';
    if(r==='Accomplice')x=`Protect ${E(C.pname(C.state.private.murdererId))}. The exact crime pair remains hidden from you.`;
    if(r==='Witness')x='You know the evil team, but not the exact crime pair. Help without revealing yourself.';
    if(r==='Investigator')x='The exact crime pair is hidden. Read the clues, debate, and spend your badge carefully.';
    C.overlay.innerHTML=`<div class="overlay role-overlay open"><div class="envelope"><div class="seal">CASEFILE</div><div class="role-paper"><span>YOUR SECRET ROLE</span><h2>${E(r)}</h2><p>${x}</p><button id="closeRole" class="btn">Take Your Seat</button></div></div></div>`;
    C.beep('phase');document.getElementById('closeRole').onclick=()=>{C.overlay.innerHTML='';C.beep('deal');};
  };

  C.maybeSecretOverlay = () => {
    if(!C.state||!C.state.private?.solution||!['Murderer','Forensic Scientist'].includes(C.state.private.role)||['crime','ended'].includes(C.state.phase))return;
    if(C.overlay.innerHTML.trim()){setTimeout(C.maybeSecretOverlay,650);return;}
    const s=C.state.private.solution,key=`${C.state.gameId}:${C.state.meId}:${s.evidenceId}:${s.meansId}`,seen=JSON.parse(localStorage.getItem(C.SECRET_SEEN)||'{}');
    if(seen[key])return;seen[key]=true;localStorage.setItem(C.SECRET_SEEN,JSON.stringify(seen));
    C.overlay.innerHTML=`<div class="overlay secret-overlay open"><div class="secret-modal"><div class="secret-ribbon">SECRET CRIME LOCKED</div><h2>${C.state.private.role==='Forensic Scientist'?'Memorize the Murderer’s exact pair':'Your chosen crime is locked'}</h2><p>${C.state.private.role==='Forensic Scientist'?`Murderer: <strong>${E(C.pname(s.ownerId))}</strong>. These are the two cards you must guide investigators toward.`:'Keep this pair secret while you participate in the discussion.'}</p><div class="secret-overlay-pair">${C.cardHtml(s.evidenceText,'evidence',{large:true,tag:'KEY EVIDENCE'})}<div class="pair-link">+</div>${C.cardHtml(s.meansText,'means',{large:true,tag:'MEANS OF MURDER'})}</div><button id="closeSecret" class="btn danger full">I Know the Secret Crime</button></div></div>`;
    C.beep('secret');document.getElementById('closeSecret').onclick=()=>{C.overlay.innerHTML='';C.beep('deal');};
  };

  C.accusationOverlay = () => {
    const targets=C.state.players.filter(p=>p.evidence.length),target=targets.find(p=>p.id===C.accusation.targetId);
    C.overlay.innerHTML=`<div class="overlay accuse-overlay open"><div class="modal premium-modal"><header><div><span>ACCUSATION BOARD</span><h2>Build Your Exact Accusation</h2></div><button id="closeModal" class="icon-btn">×</button></header><p class="muted">First pick a suspect card. Then choose one Evidence card and one Means card from that same suspect.</p><div class="suspect-choice-grid">${targets.map(p=>`<button class="suspect-choice-card suspect-choice ${C.accusation.targetId===p.id?'active':''}" data-id="${p.id}"><span class="suspect-avatar">${E(p.name.slice(0,1).toUpperCase())}</span><small>SUSPECT</small><strong>${E(p.name)}</strong><em>${p.solveUsed?'badge spent':'badge ready'}</em></button>`).join('')}</div>${target?`<div class="dual accusation-card-picks"><div><h3>Evidence from ${E(target.name)}</h3><div class="premium-pick-grid">${target.evidence.map(x=>C.cardHtml(x.text,'evidence',{interactive:true,selected:C.accusation.evidenceId===x.id,dataId:x.id,extraClass:'acc-e'})).join('')}</div></div><div><h3>Means from ${E(target.name)}</h3><div class="premium-pick-grid">${target.means.map(x=>C.cardHtml(x.text,'means',{interactive:true,selected:C.accusation.meansId===x.id,dataId:x.id,extraClass:'acc-m'})).join('')}</div></div></div><button id="confirmAccuse" class="btn danger full" ${C.accusation.evidenceId&&C.accusation.meansId?'':'disabled'}>Lock Exact Accusation</button>`:'<div class="notice gold">Choose a suspect card first.</div>'}</div></div>`;
    document.getElementById('closeModal').onclick=()=>C.overlay.innerHTML='';
    document.querySelectorAll('.suspect-choice').forEach(b=>b.onclick=()=>{C.accusation={targetId:b.dataset.id,evidenceId:null,meansId:null};C.accusationOverlay();C.beep('click');});
    document.querySelectorAll('.acc-e').forEach(b=>b.onclick=()=>{C.accusation.evidenceId=b.dataset.id;C.accusationOverlay();C.beep('click');});
    document.querySelectorAll('.acc-m').forEach(b=>b.onclick=()=>{C.accusation.meansId=b.dataset.id;C.accusationOverlay();C.beep('click');});
    document.getElementById('confirmAccuse')?.addEventListener('click',()=>{if(!confirm('Spend your only Solve Crime badge on this exact combination?'))return;C.socket.emit('accuse',{code:C.state.code,...C.accusation});C.overlay.innerHTML='';C.beep('danger');});
  };
})();
