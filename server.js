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

const randomId = (bytes = 8) => crypto.randomBytes(bytes).toString('hex');
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
  if (room.log.length > 80) room.log.splice(0, room.log.length - 80);
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
      id: p.id, name: p.name, connected: Boolean(p.socketId), role: room.phase === 'ended' ? p.role : null,
      solveUsed: Boolean(p.solveUsed), evidence: p.role === 'Forensic Scientist' ? [] : p.evidence,
      means: p.role === 'Forensic Scientist' ? [] : p.means
    })),
    private: privateState(room, player), scene: room.scene, winner: room.winner,
    endingReason: room.endingReason, log: room.log, solvedBy: room.solvedBy || null
  };
}
function emitRoom(room) {
  for (const player of room.players) if (player.socketId) io.to(player.socketId).emit('state', publicState(room, player));
}
function assignCards(room) {
  const evidenceDeck = shuffle(EVIDENCE);
  const meansDeck = shuffle(MEANS);
  const count = room.settings.cardsPerType;
  let eIndex = 0, mIndex = 0;
  for (const player of room.players) {
    if (player.role === 'Forensic Scientist') { player.evidence = []; player.means = []; continue; }
    player.evidence = evidenceDeck.slice(eIndex, eIndex + count).map((text, i) => ({ id: `e_${player.id}_${i}`, text }));
    player.means = meansDeck.slice(mIndex, mIndex + count).map((text, i) => ({ id: `m_${player.id}_${i}`, text }));
    eIndex += count; mIndex += count;
  }
}
function startGame(room) {
  if (room.players.length < 4) throw new Error('At least 4 players are required.');
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
  Object.assign(room, { phase: 'crime', round: 0, scene: [], solution: null, winner: null, endingReason: null, solvedBy: null, usedSceneTitles: [] });
  addLog(room, 'Roles have been dealt. The Murderer is secretly choosing the crime.');
}
function resetForRematch(room) {
  Object.assign(room, { phase: 'lobby', round: 0, scene: [], solution: null, winner: null, endingReason: null, solvedBy: null, forensicId: null, murdererId: null, accompliceId: null, witnessId: null, usedSceneTitles: [] });
  for (const p of room.players) Object.assign(p, { role: null, solveUsed: false, evidence: [], means: [] });
  addLog(room, 'Rematch lobby opened.');
}
function allInvestigatorsSpent(room) {
  return room.players.filter(p => p.role !== 'Forensic Scientist').every(p => p.solveUsed);
}

io.on('connection', socket => {
  socket.on('createRoom', (payload, callback = () => {}) => {
    try {
      const name = safeName(payload?.name), code = makeRoomCode(), token = randomId(16);
      const player = { id: randomId(), token, socketId: socket.id, name, role: null, solveUsed: false, evidence: [], means: [] };
      const room = { code, hostId: player.id, players: [player], phase: 'lobby', round: 0, scene: [], solution: null, winner: null, endingReason: null, solvedBy: null, forensicId: null, murdererId: null, accompliceId: null, witnessId: null, usedSceneTitles: [], settings: { cardsPerType: 4 }, log: [] };
      rooms.set(code, room); socket.join(code); addLog(room, `${name} created the room.`);
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
      const player = { id: randomId(), token, socketId: socket.id, name, role: null, solveUsed: false, evidence: [], means: [] };
      room.players.push(player); socket.join(code); addLog(room, `${name} joined the room.`);
      callback({ ok: true, code, token, playerId: player.id }); emitRoom(room);
    } catch (err) { callback({ ok: false, error: err.message }); }
  });

  socket.on('resumeRoom', (payload, callback = () => {}) => {
    try {
      const code = String(payload?.code || '').trim().toUpperCase(), room = rooms.get(code);
      if (!room) throw new Error('Room no longer exists.');
      const player = room.players.find(p => p.token === payload?.token);
      if (!player) throw new Error('Could not restore this player.');
      player.socketId = socket.id; socket.join(code); callback({ ok: true, code, playerId: player.id }); emitRoom(room);
    } catch (err) { callback({ ok: false, error: err.message }); }
  });

  socket.on('leaveRoom', payload => {
    try {
      const { room, player } = getRoomPlayer(socket, payload?.code);
      if (room.phase !== 'lobby') throw new Error('You cannot leave after the game has started.');
      room.players = room.players.filter(p => p.id !== player.id); socket.leave(room.code);
      if (!room.players.length) return rooms.delete(room.code);
      if (room.hostId === player.id) room.hostId = room.players[0].id;
      addLog(room, `${player.name} left the room.`); emitRoom(room);
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
      room.scene = buildInitialScene(); room.usedSceneTitles = room.scene.map(t => t.title); room.phase = 'forensic';
      addLog(room, 'The crime is locked in. The Forensic Scientist is placing scene markers.'); emitRoom(room);
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
        room.phase = 'discussion'; addLog(room, `Investigation Round ${room.round} begins. Discuss the clues and inspect every player's cards.`);
      }
      emitRoom(room);
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
        room.usedSceneTitles.push(replacement.title); room.phase = 'forensic';
        addLog(room, `Round ${room.round}: one scene clue has been replaced. The Forensic Scientist must place the new marker.`);
      } else {
        room.phase = 'final'; addLog(room, 'Final discussion. Any player with an unused Solve Crime badge may still accuse.');
      }
      emitRoom(room);
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
      player.solveUsed = true;
      const correct = Boolean(room.solution && target.id === room.solution.ownerId && evidence.id === room.solution.evidenceId && means.id === room.solution.meansId);
      if (correct) {
        room.solvedBy = player.id;
        if (room.witnessId) { room.phase = 'reversal'; addLog(room, `${player.name} solved the crime! The Murderer now gets one chance to identify the Witness.`); }
        else { room.phase = 'ended'; room.winner = 'Investigators'; room.endingReason = `${player.name} identified the correct suspect, Evidence, and Means.`; addLog(room, 'Investigators win the case.'); }
      } else {
        addLog(room, `${player.name} used a Solve Crime badge — incorrect accusation.`);
        if (allInvestigatorsSpent(room)) { room.phase = 'ended'; room.winner = 'Murderer Team'; room.endingReason = 'Every investigator spent their Solve Crime badge without finding the exact solution.'; addLog(room, 'All Solve Crime badges are spent. The Murderer Team wins.'); }
      }
      emitRoom(room);
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
      addLog(room, `${player.name}: ${text}`, 'chat'); emitRoom(room);
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
      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) continue;
      player.socketId = null; addLog(room, `${player.name} disconnected. They can rejoin by reopening the same browser.`); emitRoom(room); break;
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
server.listen(PORT, '0.0.0.0', () => console.log(`Casefile Online listening on ${PORT}`));
