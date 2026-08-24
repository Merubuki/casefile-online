(() => {
  'use strict';
  const C=window.CF5;

  C.copyInvite = () => {
    const u=new URL(location.href);u.searchParams.set('room',C.state.code);
    navigator.clipboard?.writeText(`Join my Casefile game: ${u}\nRoom code: ${C.state.code}`).then(()=>C.showToast('Invite copied.','good')).catch(()=>C.showToast(`Room code: ${C.state.code}`));
  };

  C.render = () => {
    if(!C.state)return;
    C.app.innerHTML=`<div class="game-shell">${C.topbar()}${C.seats()}<main class="table-layout"><aside>${C.roleCard()}${C.secretCrimePanel()}${C.actionAdvance()}</aside><section class="center-table">${C.state.phase==='lobby'?C.lobby():''}${C.crimePanel()}${C.clueBoard()}${C.tableCards()}${C.reversal()}${C.result()}</section><aside>${C.accusationPanel()}${C.chat()}</aside></main></div>`;
    C.bind();C.startTimer();
    if(C.lastPhase&&C.lastPhase!==C.state.phase)C.beep(C.state.phase==='ended'?'win':'phase');
    C.lastPhase=C.state.phase;setTimeout(C.roleOverlay,180);setTimeout(C.maybeSecretOverlay,460);
  };

  C.bind = () => {
    document.getElementById('copy')?.addEventListener('click',C.copyInvite);document.getElementById('copy2')?.addEventListener('click',C.copyInvite);document.getElementById('sound')?.addEventListener('click',C.toggleAudio);document.getElementById('revealRole')?.addEventListener('click',C.showRole);
    document.getElementById('start')?.addEventListener('click',()=>C.socket.emit('startGame',{code:C.state.code}));document.getElementById('addBot')?.addEventListener('click',()=>C.socket.emit('addBot',{code:C.state.code}));document.getElementById('fillBots')?.addEventListener('click',()=>C.socket.emit('fillBots',{code:C.state.code,target:6}));
    document.querySelectorAll('.remove-bot').forEach(b=>b.onclick=()=>C.socket.emit('removeBot',{code:C.state.code,botId:b.dataset.id}));
    document.getElementById('cards')?.addEventListener('change',e=>C.socket.emit('updateSettings',{code:C.state.code,cardsPerType:Number(e.target.value)}));document.getElementById('roundTimer')?.addEventListener('change',e=>C.socket.emit('updateSettings',{code:C.state.code,discussionTimerSec:Number(e.target.value)}));
    document.querySelectorAll('.crime-e').forEach(b=>b.onclick=()=>{C.crime.evidenceId=b.dataset.id;C.beep('click');C.render();});document.querySelectorAll('.crime-m').forEach(b=>b.onclick=()=>{C.crime.meansId=b.dataset.id;C.beep('click');C.render();});
    document.getElementById('lockCrime')?.addEventListener('click',()=>{C.socket.emit('chooseCrime',{code:C.state.code,...C.crime});C.beep('danger');});
    document.querySelectorAll('.marker-btn').forEach(b=>b.onclick=()=>{C.socket.emit('placeMarker',{code:C.state.code,slot:Number(b.dataset.slot),value:b.dataset.value});C.beep('marker');});
    document.getElementById('advance')?.addEventListener('click',()=>C.socket.emit('advanceRound',{code:C.state.code}));document.getElementById('openAccuse')?.addEventListener('click',C.accusationOverlay);document.getElementById('pass')?.addEventListener('click',()=>{if(confirm('Pass your Final Discussion decision?'))C.socket.emit('passFinal',{code:C.state.code});});
    document.querySelectorAll('.witness').forEach(b=>b.onclick=()=>{if(confirm(`Final answer: ${b.textContent.trim()} is the Witness?`))C.socket.emit('guessWitness',{code:C.state.code,targetId:b.dataset.id});});
    document.getElementById('rematch')?.addEventListener('click',()=>{C.crime={evidenceId:null,meansId:null};C.accusation={targetId:null,evidenceId:null,meansId:null};C.socket.emit('rematch',{code:C.state.code});});
    const send=()=>{const i=document.getElementById('chatText'),t=i?.value.trim();if(!t)return;C.socket.emit('chatMessage',{code:C.state.code,text:t});i.value='';C.beep('click');};document.getElementById('send')?.addEventListener('click',send);document.getElementById('chatText')?.addEventListener('keydown',e=>{if(e.key==='Enter')send();});
  };

  C.socket.on('connect',()=>{const s=C.load(),q=new URL(location.href).searchParams.get('room')?.toUpperCase()||'';if(s?.code&&s?.token)C.socket.emit('resumeRoom',s,r=>{if(!r?.ok){C.clear();C.home(q||s.code);}});else C.home(q);});
  C.socket.on('state',s=>{C.state=s;if(C.accusation.targetId&&!s.players.some(p=>p.id===C.accusation.targetId))C.accusation={targetId:null,evidenceId:null,meansId:null};C.render();});
  C.socket.on('toast',x=>C.showToast(x?.message||'Something went wrong.',x?.type||'error'));
  C.socket.on('connect_error',()=>{C.stopTimer();C.app.innerHTML='<section class="loading-card"><div class="eyebrow">CONNECTION ERROR</div><h1>Could not reach the table.</h1><p class="muted">The free server may be waking up. Wait a moment and reload.</p><button class="btn" onclick="location.reload()">Reload</button></section>';});
})();
