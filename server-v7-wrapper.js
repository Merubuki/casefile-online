const fs = require('fs');
const path = require('path');
const Module = require('module');

const target = path.join(__dirname, 'server-live.js');
let source = fs.readFileSync(target, 'utf8');

const replacement = String.raw`
function smartHash(s=''){let h=0;for(const c of String(s))h=((h<<5)-h+c.charCodeAt(0))|0;return Math.abs(h);}
function smartStable(options,seed){return options[smartHash(seed)%options.length];}
function smartLocations(e='',m=''){const r=[];const s=String(e).toLowerCase(),x=String(m).toLowerCase();if(/hotel|keycard/.test(s))r.push('Hotel');if(/coffee|receipt/.test(s))r.push('Restaurant');if(/medicine|bandage/.test(s))r.push('Hospital');if(/work permit|id badge|name tag/.test(s))r.push('Construction Site');if(/movie|concert|theater/.test(s))r.push('Bar');if(/notebook|newspaper/.test(s))r.push('Bookstore');if(/vehicle|car crash/.test(x))r.push('Construction Site');return [...new Set(r)];}
function smartAffinity(title,option,e='',m=''){
  const mt=typeOfMeans(m),et=typeOfEvidence(e),es=String(e).toLowerCase(),ms=String(m).toLowerCase();let s=0;
  if(title==='Cause of Death'){const ex=({poison:'Poisoning',suffocation:'Suffocation',sharp:'Blood Loss',burn:'Severe Injury',accident:'Accident',blunt:'Severe Injury'})[mt];s+=option===ex?4.5:-.7;if(mt==='poison'&&option==='Illness')s+=1.1;if(mt==='accident'&&option==='Severe Injury')s+=.8;}
  else if(title==='Location of Crime'){const p=smartLocations(e,m);if(p.includes(option))s+=3.7;else if(!p.length&&option===smartStable(['Restaurant','Hotel','Hospital','Construction Site','Bookstore','Bar'],e+'|'+m+'|loc'))s+=.45;else if(p.length)s-=.25;}
  else if(title==='Trace at Scene'){if(mt==='sharp'&&option==='Liquid')s+=3.4;else if(mt==='suffocation'&&option==='Fiber')s+=3.3;else if(mt==='poison'&&['Powder','Liquid','Residue'].includes(option))s+=2.6;else if(mt==='burn'&&option==='Residue')s+=3.1;else if(mt==='accident'&&option==='Print')s+=1.4;else if(mt==='poison'&&option==='None')s+=.8;}
  else if(title==='Suspicious Item'){if(option===et)s+=3.8;if(et==='Document'&&option==='Device'&&/flash drive|sim card/.test(es))s+=1.1;}
  else if(title==='General Impression'){if(mt==='poison'&&['Planned','Professional'].includes(option))s+=2.8;else if(mt==='sharp'&&['Personal','Messy'].includes(option))s+=2.4;else if(mt==='accident'&&option==='Sudden')s+=2.8;else if(mt==='blunt'&&['Sudden','Messy'].includes(option))s+=1.9;else if(option==='Desperate')s+=.6;}
  else if(title==='Scene Condition'){if(mt==='burn'&&option==='Burned')s+=3.4;else if(mt==='accident'&&option==='Disturbed')s+=2.8;else if(mt==='poison'&&option==='Clean')s+=2.3;else if(mt==='suffocation'&&option==='Dark')s+=1.1;if(option==='Crowded'&&/ticket|pass/.test(es))s+=1.1;}
  else if(title==='Corpse Condition'){if(mt==='burn'&&option==='Twisted')s+=2.9;else if(mt==='poison'&&['Intact','Warm'].includes(option))s+=1.9;else if(mt==='sharp'&&option==='Incomplete')s+=1.5;else if(mt==='blunt'&&option==='Stiff')s+=1.1;}
  else if(title==='Body Position'){if(mt==='suffocation'&&['Face Up','Face Down','Hidden'].includes(option))s+=2.1;else if(mt==='accident'&&['Face Down','Hidden'].includes(option))s+=1.7;else if(mt==='blunt'&&option==='Seated')s+=.9;}
  else if(title==='Motive'){if(/lottery|credit card|business card|wallet|coin/.test(es)&&option==='Money')s+=2.8;if(/diary|ripped note|photo|pendant|flower|necklace/.test(es)&&['Jealousy','Revenge','Secret'].includes(option))s+=1.8;if(option==='Unknown')s+=.2;}
  else if(title==='Victim Clothing'){if(/work permit|id badge|name tag/.test(es)&&option==='Uniform')s+=2.8;if(/scarf|backpack|sunglasses/.test(es)&&option==='Casual')s+=2.2;if(/bandage/.test(es)&&option==='Damaged')s+=2;}
  else if(title==='Sound Nearby'){if(mt==='accident'&&option==='Crash')s+=3.2;if((mt==='burn'||/electric|live wire/.test(ms))&&option==='Alarm')s+=2.5;if(['sharp','blunt'].includes(mt)&&option==='Argument')s+=1.4;if(mt==='poison'&&option==='Silence')s+=1.8;if(mt==='suffocation'&&option==='Footsteps')s+=1.1;}
  else if(title==='Crime Timing'){if(/newspaper|movie stub|concert ticket|train ticket|metro ticket/.test(es)&&['Several Hours','Yesterday'].includes(option))s+=1.5;if(/coffee cup|ashes/.test(es)&&option==='Within Hour')s+=1.6;if(/alarm clock|broken watch/.test(es)&&option==='Minutes Ago')s+=1.1;}
  else if(title==='Time of Day'){if(/alarm clock/.test(es)&&option==='Morning')s+=2;if(/movie stub|concert ticket|theater ticket/.test(es)&&['Evening','Midnight'].includes(option))s+=1.8;if(/coffee/.test(es)&&['Morning','Noon'].includes(option))s+=1.3;}
  else if(title==='Weather'){if(/scarf/.test(es)&&option==='Windy')s+=1.3;if(/flower petal/.test(es)&&option==='Clear')s+=1.1;if(/electric/.test(ms)&&option==='Storm')s+=.9;}
  return s;
}
function smartPairs(room){const a=[];for(const p of room.players){if(p.role==='Forensic Scientist')continue;for(const e of p.evidence||[])for(const m of p.means||[])a.push({ownerId:p.id,evidenceId:e.id,meansId:m.id,evidenceText:e.text,meansText:m.text});}return a;}
function forensicChoice(room,t){
  const sol=room.solution||{},others=smartPairs(room).filter(p=>!(p.ownerId===sol.ownerId&&p.evidenceId===sol.evidenceId&&p.meansId===sol.meansId));let best=t.options[0],bestScore=-Infinity;
  for(const option of t.options){const truth=smartAffinity(t.title,option,sol.evidenceText,sol.meansText),vals=others.map(p=>smartAffinity(t.title,option,p.evidenceText,p.meansText)),max=vals.length?Math.max(...vals):0,avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,disc=truth-max,sc=truth*5+disc*2.5+(truth-avg)*.8;if(sc>bestScore){bestScore=sc;best=option;}}
  return best;
}
function score(room,e,m){let s=0;for(const t of room.scene||[]){if(!t.marker)continue;s+=smartAffinity(t.title,t.marker,e,m)*(t.fixed?2.15:1.25);}return s+Math.random()*.35;}
function best(room,b){`;

const pattern = /function forensicChoice\(room,t\)\{[\s\S]*?\nfunction best\(room,b\)\{/;
if (!pattern.test(source)) {
  throw new Error('Casefile v7 smart forensic patch could not find the expected server block.');
}
source = source.replace(pattern, replacement);

const patched = new Module(target, module);
patched.filename = target;
patched.paths = Module._nodeModulePaths(__dirname);
patched._compile(source, target);
