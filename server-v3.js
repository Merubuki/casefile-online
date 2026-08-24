const express = require('express');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;
const rooms = new Map();

const EVIDENCE = [
  'receipt','access card','alarm clock','antique coin','ashes','backpack','bandage','battery','button','boarding pass','business card','camera','candle','car key','chewing gum','coffee cup','concert ticket','credit card','diary','glove','envelope','eyeglasses','feather','flash drive','flower petal','footprint','fountain pen','glass fragment','hair strand','handkerchief','hotel keycard','id badge','keychain','lighter','lottery ticket','map','matchbook','medicine bottle','metro ticket','movie stub','name tag','newspaper clipping','notebook','parking ticket','passport photo','pendant','phone charger','playing card','postcard','power bank','printed email','rubber band','safety pin','scarf','shopping list','sim card','sunglasses','train ticket','usb cable','wallet photo','watch strap','work permit','keyring','necklace','broken watch','theater ticket','ripped note','plastic card','coin purse','pen cap','paper clip','souvenir','photo strip'
];

const MEANS = [
  'baseball bat','blunt stone','boiling liquid','broken bottle','cable strangulation','carbon monoxide','chemical burn','choking','crowbar','drowning','electric shock','falling object','fire','heavy statue','hunting knife','ice pick','injection','kitchen knife','metal pipe','poisoned drink','poisoned food','razor blade','rope','scissors','screwdriver','sharp glass','overdose','smoke inhalation','steel bar','suffocation','toxic gas','vehicle impact','wrench','acid','brick','car crash','hammer','live wire','nail gun','plastic wrap','pushed downstairs','rock','sedative','shovel','smothering','heavy book','metal cable','cleaning chemical','fall from height','crushing impact','heated object','wooden club','wire','gas leak','medication mix','sharp tool','industrial machine'
];

const FIXED_TILES = [
  { title: 'Cause of Death', options: ['Suffocation','Severe Injury','Blood Loss','Illness','Poisoning','Accident'] },
  { title: 'Location of Crime', options: ['Restaurant','Hotel','Hospital','Construction Site','Bookstore','Bar'] }
];

const SCENE_POOL = [
  { title: 'Corpse Condition', options: ['Warm','Stiff','Decayed','Incomplete','Intact','Twisted'] },
  { title: 'Time of Day', options: ['Dawn','Morning','Noon','Afternoon','Evening','Midnight'] },
  { title: 'Trace at Scene', options: ['Powder','Liquid','Fiber','Print','Residue','None'] },
  { title: 'Motive', options: ['Money','Jealousy','Revenge','Fear','Secret','Unknown'] },
  { title: 'Weather', options: ['Clear','Cloudy','Rain','Storm','Windy','Humid'] },
  { title: 'Victim Clothing', options: ['Formal','Casual','Uniform','Nightwear','Sportswear','Damaged'] },
  { title: 'Sound Nearby', options: ['Argument','Crash','Music','Alarm','Footsteps','Silence'] },
  { title: 'General Impression', options: ['Planned','Sudden','Personal','Messy','Professional','Desperate'] },
  { title: 'Body Position', options: ['Face Up','Face Down','Seated','Curled','Hanging','Hidden'] },
  { title: 'Suspicious Item', options: ['Food','Drink','Medicine','Tool','Device','Document'] },
  { title: 'Crime Timing', options: ['Minutes Ago','Within Hour','Several Hours','Yesterday','Days Ago','Unclear'] },
  { title: 'Scene Condition', options: ['Clean','Disturbed','Burned','Wet','Dark','Crowded'] }
];

const BOT_PROFILES = [
  { name: 'Mira', style: 'analytical' }, { name: 'Theo', style: 'cautious' },
  { name: 'Luna', style: 'social' }, { name: 'Jax', style: 'bold' },
  { name: 'Nico', style: 'analytical' }, { name: 'Sage', style: 'cautious' },
  { name: 'Iris', style: 'social' }, { name: 'Rin', style: 'bold' },
  { name: 'Kai', style: 'chaotic' }, { name: 'Zoe', style: 'analytical' },
  { name: 'Ash', style: 'cautious' }
];

const randomId = (bytes = 8) => crypto.randomBytes(bytes).toString('hex');
const delay = (min, max) => Math.floor(min + Math.random() * (max - min));
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  while (rooms.has(code));
  return code;
}
function safeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 24) || 'Player';
}
function addLog(room, text, type = 'system') {
  room.log.push({ id: randomId(4), text, type, at: Date.now() });
  if (room.log.length > 100) room.log.splice(0, room.log.length - 100);
}
function newSceneTile(tile, slot, fixed = false) {
  return { slot, fixed, title: tile.title, options: [...tile.options], marker: null };
}
function buildInitialScene() {
  const randomScenes = shuffle(SCENE_POOL).slice(0, 4);
  return [newSceneTile(FIXED_TILES[0], 0, true), newSceneTile(FIXED_TILES[1], 1, true), ...randomScenes.map((tile, i) => newSceneTile(tile, i + 2))];
}
function getRoomPlayer(socket, code) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) throw new Error('Room not found.');
  const player = room.players.find(p => p.socketId === socket.id);
  if (!player) throw new Error('You are not connected to this room.');
  return { room, player };
}
function privateState(room, player) {
  const result = { role: player.role || null };
  if ((player.role === 'Murderer' || player.role === 'Forensic Scientist') && room.solution) result.solution = room.solution;
  if (player.role === 'Accomplice') result.murdererId = room.murdererId;
  if (player.role === 'Witness') result.suspectIds = [room.murdererId, room.accompliceId].filter(Boolean);
  if (room.phase === 'ended' && room.solution) result.solution = room.solution;
  return result;
}
function publicState(room, player) {
  return {
    code: room.code, phase: room.phase, round: room.round, hostId: room.hostId, meId: player.id,
    settings: room.settings,
    players: room.players.map(p => ({
      id: p.id, name: p.name, connected: p.isBot || Boolean(p.socketId), isBot: Boolean(p.isBot), botStyle: p.isBot ? p.botStyle : null,
      role: room.phase === 'ended' ? p.role : null, solveUsed: Boolean(p.solveUsed),
      evidence: p.role === 'Forensic Scientist' ? [] : p.evidence, means: p.role === 'Forensic Scientist' ? [] : p.means
    })),
    private: privateState(room, player), scene: room.scene, winner: room.winner,
    endingReason: room.endingReason, log: room.log, solvedBy: room.solvedBy || null
  };
}
function emitRoom(room) {
  for (const player of room.players) if (!player.isBot && player.socketId) io.to(player.socketId).emit('state', publicState(room, player));
}
function makeBot(room) {
  const used = new Set(room.players.map(p => p.name.toLowerCase()));
  const profile = BOT_PROFILES.find(p => !used.has(p.name.toLowerCase())) || { name: `Bot ${room.players.filter(p => p.isBot).length + 1}`, style: shuffle(['analytical','cautious','social','bold','chaotic'])[0] };
  return { id: randomId(), token: null, socketId: null, name: profile.name, isBot: true, botStyle: profile.style, role: null, solveUsed: false, evidence: [], means: [] };
}
function addBots(room, count) {
  const roomLeft = Math.max(0, 12 - room.players.length);
  const howMany = Math.min(roomLeft, Math.max(0, Number(count) || 0));
  for (let i = 0; i < howMany; i++) room.players.push(makeBot(room));
  return howMany;
}
function assignCards(room) {
  const evidenceDeck = shuffle(EVIDENCE), meansDeck = shuffle(MEANS), count = room.settings.cardsPerType;
  let eIndex = 0, mIndex = 0;
  for (const player of room.players) {
    if (player.role === 'Forensic Scientist') { player.evidence = []; player.means = []; continue; }
    player.evidence = evidenceDeck.slice(eIndex, eIndex + count).map((text, i) => ({ id: `e_${player.id}_${i}`, text }));
    player.means = meansDeck.slice(mIndex, mIndex + count).map((text, i) => ({ id: `m_${player.id}_${i}`, text }));
    eIndex += count; mIndex += count;
  }
}
function startGame(room) {
  if (room.players.length < 4) throw new Error('At least 4 players or bots are required.');
  const ids = shuffle(room.players.map(p => p.id));
  room.forensicId = ids[0]; room.murdererId = ids[1];
  room.accompliceId = room.players.length >= 6 ? ids[2] : null;
  room.witnessId = room.players.length >= 6 ? ids[3] : null;
  for (const player of room.players) {
    if (player.id === room.forensicId) player.role = 'Forensic Scientist';
    else if (player.id === room.murdererId) player.role = 'Murderer';
    else if (player.id === room.accompliceId) player.role = 'Accomplice';
    else if (player.id === room.witnessId) player.role = 'Witness';
    else player.role = 'Investigator';
    player.solveUsed = false;
  }
  assignCards(room);
  Object.assign(room, { phase: 'crime', round: 0, scene: [], solution: null, winner: null, endingReason: null, solvedBy: null, usedSceneTitles: [], botPhaseKey: null });
  addLog(room, 'Roles have been dealt. The Murderer is secretly choosing the crime.');
  scheduleBots(room);
}
function resetForRematch(room) {
  Object.assign(room, { phase: 'lobby', round: 0, scene: [], solution: null, winner: null, endingReason: null, solvedBy: null, forensicId: null, murdererId: null, accompliceId: null, witnessId: null, usedSceneTitles: [], botPhaseKey: null });
  for (const p of room.players) Object.assign(p, { role: null, solveUsed: false, evidence: [], means: [] });
  addLog(room, 'Rematch lobby opened.');
}
function allInvestigatorsSpent(room) {
  return room.players.filter(p => p.role !== 'Forensic Scientist').every(p => p.solveUsed);
}

function textHas(text, words) { const s = String(text || '').toLowerCase(); return words.some(w => s.includes(w)); }
function meansType(text) {
  if (textHas(text, ['poison','toxic','overdose','sedative','medication','carbon monoxide','gas leak'])) return 'poison';
  if (textHas(text, ['strang','choking','suffocation','smother','plastic wrap','drowning','smoke'])) return 'suffocation';
  if (textHas(text, ['knife','razor','scissors','ice pick','sharp','glass','nail gun','screwdriver'])) return 'sharp';
  if (textHas(text, ['fire','boiling','heated','chemical burn','acid','electric','live wire'])) return 'burn';
  if (textHas(text, ['car crash','vehicle','fall','pushed','crushing','falling object'])) return 'accident';
  return 'blunt';
}
function evidenceType(text) {
  if (textHas(text, ['medicine','bandage'])) return 'Medicine';
  if (textHas(text, ['coffee','bottle'])) return 'Drink';
  if (textHas(text, ['phone','camera','usb','flash drive','power bank','charger','sim card','battery'])) return 'Device';
  if (textHas(text, ['receipt','ticket','pass','card','email','note','newspaper','permit','passport','map','diary','notebook','list'])) return 'Document';
  return 'Tool';
}
function stablePick(options, seed) {
  let h = 0; for (const ch of String(seed)) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  return options[Math.abs(h) % options.length];
}
function chooseForensicMarker(room, tile) {
  const sol = room.solution || {}, mType = meansType(sol.meansText), eType = evidenceType(sol.evidenceText), seed = `${sol.evidenceText}|${sol.meansText}|${tile.title}`;
  switch (tile.title) {
    case 'Cause of Death': return ({ poison: 'Poisoning', suffocation: 'Suffocation', sharp: 'Blood Loss', burn: 'Severe Injury', accident: 'Accident', blunt: 'Severe Injury' })[mType] || 'Severe Injury';
    case 'Location of Crime':
      if (textHas(sol.evidenceText, ['hotel'])) return 'Hotel';
      if (textHas(sol.evidenceText, ['coffee','receipt'])) return 'Restaurant';
      if (textHas(sol.evidenceText, ['medicine','bandage'])) return 'Hospital';
      if (textHas(sol.evidenceText, ['work permit','id badge'])) return 'Construction Site';
      if (textHas(sol.evidenceText, ['movie','concert','theater'])) return 'Bar';
      return stablePick(tile.options, seed);
    case 'Trace at Scene':
      if (mType === 'sharp') return 'Liquid';
      if (mType === 'suffocation') return 'Fiber';
      if (mType === 'poison') return stablePick(['Powder','Liquid','Residue'], seed);
      if (mType === 'burn') return 'Residue';
      return stablePick(tile.options, seed);
    case 'Suspicious Item': return tile.options.includes(eType) ? eType : stablePick(tile.options, seed);
    case 'General Impression':
      if (mType === 'poison') return stablePick(['Planned','Professional'], seed);
      if (mType === 'sharp') return stablePick(['Personal','Messy'], seed);
      if (mType === 'accident') return 'Sudden';
      return stablePick(['Sudden','Messy','Desperate'], seed);
    case 'Corpse Condition': return mType === 'burn' ? 'Twisted' : stablePick(tile.options, seed);
    case 'Body Position': return mType === 'suffocation' ? stablePick(['Face Up','Face Down','Hidden'], seed) : stablePick(tile.options, seed);
    case 'Scene Condition': return mType === 'burn' ? 'Burned' : mType === 'accident' ? 'Disturbed' : stablePick(tile.options, seed);
    default: return stablePick(tile.options, seed);
  }
}
function visibleClueScore(room, evidenceText, meansText) {
  let score = 0;
  const markers = Object.fromEntries((room.scene || []).filter(t => t.marker).map(t => [t.title, t.marker]));
  const mt = meansType(meansText), et = evidenceType(evidenceText);
  if (markers['Cause of Death']) {
    const expected = ({ poison: 'Poisoning', suffocation: 'Suffocation', sharp: 'Blood Loss', burn: 'Severe Injury', accident: 'Accident', blunt: 'Severe Injury' })[mt];
    if (expected === markers['Cause of Death']) score += 6; else score -= 1.2;
  }
  if (markers['Suspicious Item'] && markers['Suspicious Item'] === et) score += 3.5;
  if (markers['Trace at Scene']) {
    if (mt === 'sharp' && markers['Trace at Scene'] === 'Liquid') score += 2;
    if (mt === 'suffocation' && markers['Trace at Scene'] === 'Fiber') score += 2;
    if (mt === 'poison' && ['Powder','Liquid','Residue'].includes(markers['Trace at Scene'])) score += 1.5;
  }
  if (markers['General Impression']) {
    if (mt === 'poison' && ['Planned','Professional'].includes(markers['General Impression'])) score += 1.5;
    if (mt === 'sharp' && ['Personal','Messy'].includes(markers['General Impression'])) score += 1.2;
  }
  return score;
}
function bestPairForTarget(room, target) {
  let best = null;
  for (const e of target.evidence) for (const m of target.means) {
    const score = visibleClueScore(room, e.text, m.text) + Math.random() * 1.4;
    if (!best || score > best.score) best = { target, evidence: e, means: m, score };
  }
  return best;
}
function botCandidateRanking(room, bot) {
  const candidates = room.players.filter(p => p.role !== 'Forensic Scientist' && p.id !== bot.id);
  let ranked = candidates.map(target => bestPairForTarget(room, target)).filter(Boolean);
  for (const item of ranked) {
    if (bot.role === 'Witness' && [room.murdererId, room.accompliceId].includes(item.target.id)) item.score += 3.8;
    if (bot.role === 'Murderer' || bot.role === 'Accomplice') {
      if (item.target.id === room.murdererId) item.score -= 8;
      else item.score += Math.random() * 2;
    }
    if (bot.botStyle === 'chaotic') item.score += Math.random() * 4 - 2;
    if (bot.botStyle === 'analytical') item.score += 0.8;
  }
  return ranked.sort((a, b) => b.score - a.score);
}
function botStatement(room, bot) {
  const ranked = botCandidateRanking(room, bot), top = ranked[0];
  if (!top) return 'I need another clue before I can narrow this down.';
  const cause = room.scene.find(t => t.title === 'Cause of Death')?.marker;
  const name = top.target.name, combo = `${top.evidence.text} + ${top.means.text}`;
  const templates = {
    analytical: [`I'm comparing the markers to the cards. ${name}'s ${combo} is one of the cleaner fits${cause ? ` for ${cause}` : ''}.`, `${name} is high on my list right now. The ${top.means.text} lines up better than most of the other Means.`],
    cautious: [`I'm not ready to burn my badge yet, but ${name} is worrying me.`, `Tentatively leaning ${name}. I want one more round before I lock anything.`],
    social: [`What do you all think about ${name}? Their ${top.means.text} stands out to me.`, `Can someone sanity-check ${name}'s cards? ${combo} feels possible.`],
    bold: [`I'm calling ${name} as my main suspect right now.`, `${name} looks the most suspicious to me. ${top.means.text} fits too well.`],
    chaotic: [`Wild thought: ${name}. The ${top.evidence.text} is giving me bad vibes.`, `I keep circling back to ${name}, but I might be overthinking it.`]
  };
  return shuffle(templates[bot.botStyle] || templates.cautious)[0];
}
function humanLikeReply(room, bot, speakerName) {
  const ranked = botCandidateRanking(room, bot), top = ranked[0];
  const base = top ? `${top.target.name} is still my strongest lead.` : 'I still need more information.';
  if (bot.botStyle === 'social') return `Yeah, ${speakerName}, I see your point. ${base}`;
  if (bot.botStyle === 'analytical') return `${speakerName}, that makes sense. I'm still weighting the scene markers more heavily though — ${base}`;
  if (bot.botStyle === 'bold') return `Maybe, but I'm sticking with my read: ${base}`;
  if (bot.botStyle === 'chaotic') return `Could be. I changed my mind twice already, but ${base}`;
  return `I can see that, ${speakerName}. I'm still holding my badge for now. ${base}`;
}
function resolveAccusation(room, player, target, evidence, means) {
  player.solveUsed = true;
  const correct = Boolean(room.solution && target.id === room.solution.ownerId && evidence.id === room.solution.evidenceId && means.id === room.solution.meansId);
  if (correct) {
    room.solvedBy = player.id;
    if (room.witnessId) {
      room.phase = 'reversal';
      addLog(room, `${player.name} solved the crime! The Murderer now gets one chance to identify the Witness.`);
    } else {
      room.phase = 'ended'; room.winner = 'Investigators'; room.endingReason = `${player.name} identified the correct suspect, Evidence, and Means.`;
      addLog(room, 'Investigators win the case.');
    }
  } else {
    addLog(room, `${player.name} used a Solve Crime badge — incorrect accusation.`);
    if (allInvestigatorsSpent(room)) {
      room.phase = 'ended'; room.winner = 'Murderer Team'; room.endingReason = 'Every investigator spent their Solve Crime badge without finding the exact solution.';
      addLog(room, 'All Solve Crime badges are spent. The Murderer Team wins.');
    }
  }
  emitRoom(room); scheduleBots(room);
}
function maybeBotAccuse(room, bot, phaseKey) {
  if (!bot.isBot || bot.role === 'Forensic Scientist' || bot.solveUsed) return;
  if (!['discussion','final'].includes(room.phase) || `${room.phase}:${room.round}` !== phaseKey) return;
  const ranked = botCandidateRanking(room, bot), best = ranked[0];
  if (!best) return;
  let chance = room.phase === 'final' ? 0.72 : room.round === 1 ? 0.08 : room.round === 2 ? 0.22 : 0.42;
  if (bot.botStyle === 'bold') chance += 0.16;
  if (bot.botStyle === 'cautious') chance -= 0.08;
  if (best.score < 5.5) chance *= 0.55;
  if (bot.role === 'Murderer' || bot.role === 'Accomplice') chance *= 0.55;
  if (Math.random() > chance) return;
  addLog(room, `${bot.name}: I'm using my badge on ${best.target.name}: ${best.evidence.text} + ${best.means.text}.`, 'chat');
  resolveAccusation(room, bot, best.target, best.evidence, best.means);
}
function scheduleBotReply(room, human) {
  if (!['discussion','final'].includes(room.phase) || Math.random() > 0.72) return;
  const bots = room.players.filter(p => p.isBot && p.role !== 'Forensic Scientist');
  if (!bots.length) return;
  const bot = shuffle(bots)[0], phaseKey = `${room.phase}:${room.round}`;
  setTimeout(() => {
    if (!rooms.has(room.code) || `${room.phase}:${room.round}` !== phaseKey || !['discussion','final'].includes(room.phase)) return;
    addLog(room, `${bot.name}: ${humanLikeReply(room, bot, human.name)}`, 'chat'); emitRoom(room);
  }, delay(900, 2400));
}
function scheduleBots(room) {
  const key = `${room.phase}:${room.round}`;
  if (room.botPhaseKey === key) return;
  room.botPhaseKey = key;

  if (room.phase === 'crime') {
    const murderer = room.players.find(p => p.id === room.murdererId);
    if (murderer?.isBot) setTimeout(() => {
      if (!rooms.has(room.code) || room.phase !== 'crime' || room.murdererId !== murderer.id) return;
      const evidence = shuffle(murderer.evidence)[0], means = shuffle(murderer.means)[0];
      room.solution = { ownerId: murderer.id, evidenceId: evidence.id, evidenceText: evidence.text, meansId: means.id, meansText: means.text };
      room.scene = buildInitialScene(); room.usedSceneTitles = room.scene.map(t => t.title); room.phase = 'forensic'; room.botPhaseKey = null;
      addLog(room, 'The Murderer has locked in the secret crime. The Forensic Scientist is placing scene markers.'); emitRoom(room); scheduleBots(room);
    }, delay(1400, 3000));
    return;
  }

  if (room.phase === 'forensic') {
    const forensic = room.players.find(p => p.id === room.forensicId);
    if (forensic?.isBot) {
      const openTiles = room.scene.filter(t => !t.marker);
      openTiles.forEach((tile, index) => setTimeout(() => {
        if (!rooms.has(room.code) || room.phase !== 'forensic' || room.forensicId !== forensic.id || tile.marker) return;
        tile.marker = chooseForensicMarker(room, tile);
        addLog(room, `${forensic.name} placed a forensic marker on ${tile.title}.`);
        if (room.scene.every(t => t.marker)) {
          if (room.round === 0) room.round = 1;
          room.phase = 'discussion'; room.botPhaseKey = null;
          addLog(room, `Investigation Round ${room.round} begins. Discuss the clues and inspect every player's cards.`);
        }
        emitRoom(room); if (room.phase === 'discussion') scheduleBots(room);
      }, 900 + index * delay(650, 1050)));
    }
    return;
  }

  if (room.phase === 'discussion' || room.phase === 'final') {
    const bots = shuffle(room.players.filter(p => p.isBot && p.role !== 'Forensic Scientist'));
    bots.forEach((bot, index) => {
      setTimeout(() => {
        if (!rooms.has(room.code) || `${room.phase}:${room.round}` !== key || !['discussion','final'].includes(room.phase)) return;
        addLog(room, `${bot.name}: ${botStatement(room, bot)}`, 'chat'); emitRoom(room);
      }, 1100 + index * delay(850, 1500));
      setTimeout(() => maybeBotAccuse(room, bot, key), 9000 + index * delay(1700, 3100));
    });
    return;
  }

  if (room.phase === 'reversal') {
    const murderer = room.players.find(p => p.id === room.murdererId);
    if (murderer?.isBot) setTimeout(() => {
      if (!rooms.has(room.code) || room.phase !== 'reversal') return;
      const candidates = room.players.filter(p => p.role !== 'Forensic Scientist' && p.id !== murderer.id);
      let target = shuffle(candidates)[0];
      if (room.witnessId && Math.random() < 0.38) target = room.players.find(p => p.id === room.witnessId) || target;
      room.phase = 'ended';
      if (target.id === room.witnessId) {
        room.winner = 'Murderer Team'; room.endingReason = `The Murderer correctly identified ${target.name} as the Witness.`;
        addLog(room, `${murderer.name} identified the Witness and steals the victory.`);
      } else {
        room.winner = 'Investigators'; room.endingReason = `The Murderer guessed ${target.name}, but that player was not the Witness.`;
        addLog(room, 'The Witness stayed hidden. Investigators keep the victory.');
      }
      emitRoom(room);
    }, delay(2200, 4200));
  }
}

io.on('connection', socket => {
  socket.on('createRoom', (payload, callback = () => {}) => {
    try {
      const name = safeName(payload?.name), code = makeRoomCode(), token = randomId(16);
      const player = { id: randomId(), token, socketId: socket.id, name, isBot: false, botStyle: null, role: null, solveUsed: false, evidence: [], means: [] };
      const room = { code, hostId: player.id, players: [player], phase: 'lobby', round: 0, scene: [], solution: null, winner: null, endingReason: null, solvedBy: null, forensicId: null, murdererId: null, accompliceId: null, witnessId: null, usedSceneTitles: [], botPhaseKey: null, settings: { cardsPerType: 4 }, log: [] };
      rooms.set(code, room); socket.join(code); addLog(room, `${name} created the room.`);
      const botCount = Math.min(11, Math.max(0, Number(payload?.botCount) || 0));
      if (botCount) { const added = addBots(room, botCount); addLog(room, `${added} human-like bot${added === 1 ? '' : 's'} joined the case.`); }
      callback({ ok: true, code, token, playerId: player.id }); emitRoom(room);
    } catch (err) { callback({ ok: false, error: err.message }); }
  });

  socket.on('joinRoom', (payload, callback = () => {}) => {
    try {
      const code = String(payload?.code || '').trim().toUpperCase(), room = rooms.get(code);
      if (!room) throw new Error('Room code not found.');
      if (room.phase !== 'lobby') throw new Error('This game has already started.');
      if (room.players.length >= 12) throw new Error('This room is full.');
      const name = safeName(payload?.name);
      if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) throw new Error('That name is already being used in this room.');
      const token = randomId(16);
      const player = { id: randomId(), token, socketId: socket.id, name, isBot: false, botStyle: null, role: null, solveUsed: false, evidence: [], means: [] };
      room.players.push(player); socket.join(code); addLog(room, `${name} joined the room.`);
      callback({ ok: true, code, token, playerId: player.id }); emitRoom(room);
    } catch (err) { callback({ ok: false, error: err.message }); }
  });

  socket.on('resumeRoom', (payload, callback = () => {}) => {
    try {
      const code = String(payload?.code || '').trim().toUpperCase(), room = rooms.get(code);
      if (!room) throw new Error('Room no longer exists.');
      const player = room.players.find(p => !p.isBot && p.token === payload?.token);
      if (!player) throw new Error('Could not restore this player.');
      player.socketId = socket.id; socket.join(code); callback({ ok: true, code, playerId: player.id }); emitRoom(room);
    } catch (err) { callback({ ok: false, error: err.message }); }
  });

  socket.on('leaveRoom', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (room.phase !== 'lobby') throw new Error('You cannot leave after the game has started.');
      room.players = room.players.filter(p => p.id !== player.id); socket.leave(room.code);
      const humans = room.players.filter(p => !p.isBot);
      if (!humans.length) return rooms.delete(room.code);
      if (room.hostId === player.id) room.hostId = humans[0].id;
      addLog(room, `${player.name} left the room.`); emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('addBot', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (player.id !== room.hostId) throw new Error('Only the host can add bots.');
      if (room.phase !== 'lobby') throw new Error('Bots can only be changed in the lobby.');
      if (room.players.length >= 12) throw new Error('This room is full.');
      const bot = makeBot(room); room.players.push(bot); addLog(room, `${bot.name} joined as a bot (${bot.botStyle}).`); emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('fillBots', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (player.id !== room.hostId) throw new Error('Only the host can add bots.');
      if (room.phase !== 'lobby') throw new Error('Bots can only be changed in the lobby.');
      const target = Math.min(12, Math.max(4, Number(payload?.target) || 6));
      const added = addBots(room, Math.max(0, target - room.players.length));
      if (added) addLog(room, `${added} bot${added === 1 ? '' : 's'} joined the room.`); emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('removeBot', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (player.id !== room.hostId) throw new Error('Only the host can remove bots.');
      if (room.phase !== 'lobby') throw new Error('Bots can only be changed in the lobby.');
      const bot = room.players.find(p => p.id === payload?.botId && p.isBot);
      if (!bot) throw new Error('Bot not found.');
      room.players = room.players.filter(p => p.id !== bot.id); addLog(room, `${bot.name} was removed from the room.`); emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('removeAllBots', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (player.id !== room.hostId) throw new Error('Only the host can remove bots.');
      if (room.phase !== 'lobby') throw new Error('Bots can only be changed in the lobby.');
      const count = room.players.filter(p => p.isBot).length; room.players = room.players.filter(p => !p.isBot);
      if (count) addLog(room, `Removed ${count} bot${count === 1 ? '' : 's'} from the room.`); emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('updateSettings', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (player.id !== room.hostId) throw new Error('Only the host can change settings.');
      if (room.phase !== 'lobby') throw new Error('Settings can only be changed in the lobby.');
      const cards = Number(payload?.cardsPerType);
      if (![3, 4, 5].includes(cards)) throw new Error('Invalid card count.');
      room.settings.cardsPerType = cards; addLog(room, `Card count changed to ${cards} Evidence + ${cards} Means per player.`); emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('startGame', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (player.id !== room.hostId) throw new Error('Only the host can start the game.');
      if (room.phase !== 'lobby') throw new Error('The game has already started.');
      startGame(room); emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('chooseCrime', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (room.phase !== 'crime' || player.id !== room.murdererId) throw new Error('Only the Murderer can choose the crime right now.');
      const evidence = player.evidence.find(c => c.id === payload?.evidenceId), means = player.means.find(c => c.id === payload?.meansId);
      if (!evidence || !means) throw new Error('Choose one Evidence card and one Means card.');
      room.solution = { ownerId: player.id, evidenceId: evidence.id, evidenceText: evidence.text, meansId: means.id, meansText: means.text };
      room.scene = buildInitialScene(); room.usedSceneTitles = room.scene.map(t => t.title); room.phase = 'forensic'; room.botPhaseKey = null;
      addLog(room, 'The crime is locked in. The Forensic Scientist is placing scene markers.'); emitRoom(room); scheduleBots(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('placeMarker', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (room.phase !== 'forensic' || player.id !== room.forensicId) throw new Error('Only the Forensic Scientist can place markers.');
      const tile = room.scene.find(t => t.slot === Number(payload?.slot));
      if (!tile || tile.marker || !tile.options.includes(payload?.value)) throw new Error('Invalid marker choice.');
      tile.marker = payload.value;
      if (room.scene.every(t => t.marker)) {
        if (room.round === 0) room.round = 1;
        room.phase = 'discussion'; room.botPhaseKey = null; addLog(room, `Investigation Round ${room.round} begins. Discuss the clues and inspect every player's cards.`);
      }
      emitRoom(room); scheduleBots(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('advanceRound', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (room.phase !== 'discussion') throw new Error('The investigation is not ready to advance.');
      if (player.id !== room.forensicId && player.id !== room.hostId) throw new Error('Only the Forensic Scientist or host can advance the round.');
      if (room.round < 3) {
        room.round += 1;
        const available = SCENE_POOL.filter(t => !room.usedSceneTitles.includes(t.title));
        const replacement = shuffle(available.length ? available : SCENE_POOL)[0];
        const target = shuffle(room.scene.filter(t => !t.fixed))[0];
        room.scene[room.scene.findIndex(t => t.slot === target.slot)] = newSceneTile(replacement, target.slot, false);
        room.usedSceneTitles.push(replacement.title); room.phase = 'forensic'; room.botPhaseKey = null;
        addLog(room, `Round ${room.round}: one scene clue has been replaced. The Forensic Scientist must place the new marker.`);
      } else {
        room.phase = 'final'; room.botPhaseKey = null; addLog(room, 'Final discussion. Any player with an unused Solve Crime badge may still accuse.');
      }
      emitRoom(room); scheduleBots(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('accuse', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (!['forensic','discussion','final'].includes(room.phase)) throw new Error('Accusations are not open right now.');
      if (player.role === 'Forensic Scientist') throw new Error('The Forensic Scientist cannot accuse.');
      if (player.solveUsed) throw new Error('You already used your Solve Crime badge.');
      const target = room.players.find(p => p.id === payload?.targetId);
      if (!target || target.role === 'Forensic Scientist') throw new Error('Choose a valid suspect.');
      const evidence = target.evidence.find(c => c.id === payload?.evidenceId), means = target.means.find(c => c.id === payload?.meansId);
      if (!evidence || !means) throw new Error('Choose one Evidence card and one Means card from the same suspect.');
      resolveAccusation(room, player, target, evidence, means);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('guessWitness', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (room.phase !== 'reversal' || player.id !== room.murdererId) throw new Error('Only the Murderer can make the Witness guess.');
      const target = room.players.find(p => p.id === payload?.targetId);
      if (!target || target.role === 'Forensic Scientist') throw new Error('Choose a player.');
      room.phase = 'ended';
      if (target.id === room.witnessId) { room.winner = 'Murderer Team'; room.endingReason = `The Murderer correctly identified ${target.name} as the Witness.`; addLog(room, 'The Murderer found the Witness and steals the victory.'); }
      else { room.winner = 'Investigators'; room.endingReason = 'The Murderer guessed the wrong Witness.'; addLog(room, 'The Witness stayed hidden. Investigators keep the victory.'); }
      emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('chatMessage', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code), text = String(payload?.text || '').trim().slice(0, 280);
      if (!text) return;
      if (player.role === 'Forensic Scientist' && !['lobby','ended'].includes(room.phase)) throw new Error('The Forensic Scientist must communicate only through scene markers.');
      addLog(room, `${player.name}: ${text}`, 'chat'); emitRoom(room); scheduleBotReply(room, player);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('rematch', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (room.phase !== 'ended') throw new Error('Finish the current game first.');
      if (player.id !== room.hostId) throw new Error('Only the host can start a rematch lobby.');
      resetForRematch(room); emitRoom(room);
    } catch (err) { socket.emit('toast', { type: 'error', message: err.message }); }
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const player = room.players.find(p => !p.isBot && p.socketId === socket.id);
      if (!player) continue;
      player.socketId = null; addLog(room, `${player.name} disconnected. They can rejoin by reopening the same browser.`); emitRoom(room); break;
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size, bots: true }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
server.listen(PORT, '0.0.0.0', () => console.log(`Casefile Online listening on ${PORT}`));
