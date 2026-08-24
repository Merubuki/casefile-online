(() => {
  'use strict';
  const C = window.CF5 = window.CF5 || {};
  C.socket = io();
  C.app = document.getElementById('app');
  C.toast = document.getElementById('toast');
  C.overlay = document.getElementById('overlay-root');
  C.SESSION = 'casefile-live-session-v5';
  C.ROLE_SEEN = 'casefile-role-seen-v5';
  C.SECRET_SEEN = 'casefile-secret-seen-v5';
  C.state = null;
  C.crime = { evidenceId:null, meansId:null };
  C.accusation = { targetId:null, evidenceId:null, meansId:null };
  C.lastPhase = null;
  C.timerHandle = null;
  C.audioOn = localStorage.getItem('casefile-audio') !== 'off';

  C.esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  C.me = () => C.state?.players.find(p => p.id === C.state.meId);
  C.pname = id => C.state?.players.find(p => p.id === id)?.name || 'Unknown';
  C.save = s => localStorage.setItem(C.SESSION, JSON.stringify(s));
  C.clear = () => localStorage.removeItem(C.SESSION);
  C.load = () => { try { return JSON.parse(localStorage.getItem(C.SESSION) || 'null'); } catch { return null; } };

  C.beep = (kind='click') => {
    if(!C.audioOn) return;
    try{
      const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
      const x=C.beep.ctx||(C.beep.ctx=new A()),o=x.createOscillator(),g=x.createGain();
      const q={click:[430,.03,.035],deal:[235,.05,.045],marker:[650,.07,.06],danger:[145,.14,.08],win:[760,.23,.09],phase:[370,.1,.055],secret:[255,.18,.075]}[kind]||[430,.04,.04];
      o.type=kind==='danger'?'sawtooth':'sine';o.frequency.value=q[0];g.gain.setValueAtTime(q[2],x.currentTime);g.gain.exponentialRampToValueAtTime(.001,x.currentTime+q[1]);o.connect(g);g.connect(x.destination);o.start();o.stop(x.currentTime+q[1]);
    }catch{}
  };
  C.showToast = (msg,type='') => { C.toast.textContent=msg;C.toast.className=`toast ${type}`;C.toast.hidden=false;clearTimeout(C.showToast.t);C.showToast.t=setTimeout(()=>C.toast.hidden=true,3400); };
  C.toggleAudio = () => { C.audioOn=!C.audioOn;localStorage.setItem('casefile-audio',C.audioOn?'on':'off');C.render();C.beep('click'); };

  C.phaseLabel = p => ({lobby:'Waiting Room',crime:'Secret Crime',forensic:'Forensic Clues',discussion:`Investigation Round ${C.state?.round||1}`,final:'Final Discussion',reversal:'Witness Reversal',ended:'Case Closed'})[p]||p;
  C.phaseHelp = () => {
    const s=C.state;if(!s)return'';
    if(s.phase==='crime')return'The Murderer secretly chooses one Evidence card and one Means card.';
    if(s.phase==='forensic')return s.private.role==='Forensic Scientist'?'The exact Secret Crime is shown in your private dossier. Use it to place forensic markers.':'Study the clue board as the Forensic Scientist places markers.';
    if(s.phase==='discussion')return'Discuss the clues and public cards. Use your single Solve Crime badge carefully.';
    if(s.phase==='final')return'No more rounds. Every eligible player must accuse or pass.';
    if(s.phase==='reversal')return'The crime was solved. The Murderer gets one final Witness guess.';
    if(s.phase==='ended')return s.endingReason||'The case is over.';
    return'Invite friends or add bots, then start the case.';
  };

  C.cardSymbol = t => t==='means'?'✦':t==='clue'?'⌖':t==='suspect'?'◉':'◆';
  C.cardHtml = (text,type,o={}) => {
    const cls=['case-card',`${type}-case-card`,o.small?'small-card':'',o.large?'large-card':'',o.selected?'selected':'',o.interactive?'interactive':'',o.extraClass||''].filter(Boolean).join(' ');
    const tag=o.tag||(type==='means'?'MEANS':type==='clue'?'CLUE':type==='suspect'?'SUSPECT':'EVIDENCE');
    const el=o.interactive?'button':'div';
    const id=o.dataId?` data-id="${C.esc(o.dataId)}"`:'';
    return `<${el} class="${cls}"${id}><span class="card-corner top"><b>${C.cardSymbol(type)}</b><small>${C.esc(tag)}</small></span><span class="card-watermark">${C.cardSymbol(type)}</span><span class="card-center"><i>${C.esc(tag)}</i><strong>${C.esc(text)}</strong></span><span class="card-corner bottom"><b>${C.cardSymbol(type)}</b><small>CASEFILE</small></span></${el}>`;
  };

  C.timerText = () => {
    if(!C.state?.phaseEndsAt)return'';
    const n=Math.max(0,Math.ceil((C.state.phaseEndsAt-Date.now())/1000));return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  };
  C.stopTimer = () => { if(C.timerHandle){clearInterval(C.timerHandle);C.timerHandle=null;} };
  C.startTimer = () => { C.stopTimer();if(!C.state?.phaseEndsAt)return;C.timerHandle=setInterval(()=>{const e=document.getElementById('phaseTimer');if(!e)return;e.textContent=C.timerText();if(C.state.phaseEndsAt-Date.now()<11000)e.parentElement?.classList.add('urgent');},500); };
})();
