(() => {
  'use strict';
  const C = window.CF5;
  if (!C) return;

  function meta(text, type) {
    const s=String(text||'').toLowerCase(), has=(...x)=>x.some(k=>s.includes(k));
    if(type==='means'){
      if(has('injection')) return ['injection','chemical method'];
      if(has('knife','razor','scissors','ice pick','sharp','screwdriver','nail gun','glass')) return ['blade','edged weapon'];
      if(has('bat','hammer','pipe','stone','crowbar','statue','wrench','brick','shovel','club','steel bar','heavy book','crushing')) return ['blunt','impact weapon'];
      if(has('poison','overdose','sedative','medication','chemical','acid','cleaning')) return ['poison','chemical method'];
      if(has('strang','rope','wire','cable','suffocation','smother','plastic wrap','choking')) return ['rope','constriction'];
      if(has('fire','boiling','heated')) return ['fire','heat damage'];
      if(has('electric','live wire')) return ['electric','electrical force'];
      if(has('vehicle','car crash')) return ['crash','vehicle impact'];
      if(has('fall','pushed downstairs','falling object')) return ['fall','fall trauma'];
      if(has('gas','carbon monoxide','smoke')) return ['gas','airborne hazard'];
      if(has('drowning')) return ['water','water hazard'];
      if(has('industrial machine')) return ['machine','mechanical force'];
      return ['tool','physical method'];
    }
    if(has('envelope')) return ['envelope','sealed message'];
    if(has('playing card')) return ['playing','game item'];
    if(has('business card')) return ['business','identity lead'];
    if(has('receipt','email','newspaper','notebook','diary','shopping list','paper clip','ripped note')) return ['document','paper trail'];
    if(has('ticket','pass','stub')) return ['ticket','travel proof'];
    if(has('card','keycard','access','id badge','work permit','name tag')) return ['card','access item'];
    if(has('coffee cup')) return ['cup','drink container'];
    if(has('medicine bottle')) return ['medicine','medical item'];
    if(has('bottle')) return ['bottle','glass container'];
    if(has('camera')) return ['camera','captured image'];
    if(has('passport photo','photo strip','wallet photo')) return ['photo','captured image'];
    if(has('phone','usb','flash drive','power bank','charger','sim card')) return ['device','digital object'];
    if(has('battery')) return ['battery','power source'];
    if(has('backpack')) return ['bag','carried item'];
    if(has('wallet')) return ['wallet','personal item'];
    if(has('key','keyring','keychain')) return ['key','entry object'];
    if(has('sunglasses','eyeglasses')) return ['glasses','personal wear'];
    if(has('glove')) return ['glove','personal wear'];
    if(has('bandage')) return ['bandage','medical wear'];
    if(has('scarf','handkerchief')) return ['cloth','personal wear'];
    if(has('pendant','necklace')) return ['jewelry','personal keepsake'];
    if(has('coin purse')) return ['purse','personal keepsake'];
    if(has('flower petal')) return ['flower','scene trace'];
    if(has('feather')) return ['feather','scene trace'];
    if(has('hair','footprint','glass fragment','ashes')) return ['trace','scene trace'];
    if(has('map','postcard')) return ['map','location hint'];
    if(has('watch','clock')) return ['watch','time clue'];
    if(has('lighter')) return ['lighter','ignition item'];
    if(has('candle')) return ['candle','ignition item'];
    if(has('matchbook')) return ['fireitem','ignition item'];
    return ['evidence','case evidence'];
  }

  const wrap=b=>`<svg viewBox="0 0 120 90" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${b}</g></svg>`;
  const ART={
    evidence:wrap('<rect x="28" y="18" width="64" height="52" rx="8"/><path d="M40 34h40M40 46h28M40 58h22"/>'),
    document:wrap('<path d="M36 18h38l14 14v40H36z"/><path d="M74 18v14h14"/><path d="M46 44h32M46 54h26M46 64h18"/>'),
    envelope:wrap('<path d="M22 28h76v36H22z"/><path d="M22 30l38 26 38-26"/><path d="M22 64l24-20M98 64L74 44"/>'),
    ticket:wrap('<path d="M24 28h72v12c-6 0-10 4-10 10s4 10 10 10v12H24V60c6 0 10-4 10-10s-4-10-10-10z"/><path d="M54 28v44"/>'),
    card:wrap('<rect x="22" y="24" width="76" height="42" rx="8"/><circle cx="40" cy="45" r="8"/><path d="M56 38h24M56 48h18M56 58h24"/>'),
    playing:wrap('<rect x="34" y="18" width="52" height="56" rx="8"/><path d="M46 30l8 12-8 12-8-12zM74 54l-8-12 8-12 8 12z"/>'),
    business:wrap('<rect x="20" y="26" width="80" height="38" rx="8"/><path d="M34 38h22M34 50h30M72 38h14M72 50h10"/>'),
    cup:wrap('<path d="M32 34h40v24a14 14 0 0 1-14 14H46a14 14 0 0 1-14-14z"/><path d="M72 38h10a10 10 0 1 1 0 20H72"/><path d="M42 22v8M54 18v12M66 22v8"/>'),
    bottle:wrap('<path d="M52 16h16v12l8 12v24a10 10 0 0 1-10 10H54a10 10 0 0 1-10-10V40l8-12z"/><path d="M52 28h16"/>'),
    medicine:wrap('<rect x="36" y="18" width="48" height="54" rx="10"/><path d="M52 32h16M60 24v16M48 52h24"/>'),
    camera:wrap('<rect x="22" y="30" width="76" height="34" rx="8"/><circle cx="60" cy="47" r="12"/><path d="M40 30l8-10h24l8 10"/>'),
    photo:wrap('<rect x="26" y="18" width="68" height="54" rx="6"/><circle cx="48" cy="38" r="8"/><path d="M34 60l14-12 12 10 10-8 16 10"/>'),
    device:wrap('<rect x="42" y="10" width="36" height="70" rx="8"/><path d="M54 20h12M58 68h4"/><path d="M30 54l16-8M78 46l12-10"/>'),
    battery:wrap('<rect x="30" y="28" width="56" height="34" rx="6"/><path d="M86 38h8v14h-8"/><path d="M46 45h10M50 41v8M66 45h10"/>'),
    bag:wrap('<path d="M34 32h52v38H34z"/><path d="M46 32v-6a14 14 0 0 1 28 0v6"/><path d="M34 46h52"/>'),
    wallet:wrap('<rect x="24" y="28" width="72" height="38" rx="8"/><path d="M64 40h32v14H64z"/><circle cx="76" cy="47" r="2"/>'),
    key:wrap('<circle cx="42" cy="44" r="12"/><path d="M54 44h30l6 6-6 6h-6v6h-8v-6h-8"/>'),
    glasses:wrap('<circle cx="42" cy="46" r="12"/><circle cx="78" cy="46" r="12"/><path d="M54 46h12M24 44h6M90 44h6"/>'),
    glove:wrap('<path d="M44 72V34a6 6 0 1 1 12 0v18-24a6 6 0 1 1 12 0v24-18a6 6 0 1 1 12 0v20a18 18 0 0 1-18 18H56A12 12 0 0 1 44 72z"/>'),
    bandage:wrap('<rect x="24" y="36" width="72" height="18" rx="9"/><path d="M44 36l12 18M52 36l12 18M60 36l12 18"/>'),
    cloth:wrap('<path d="M26 24c14 0 18-8 34-8s20 8 34 8c-6 8-14 12-20 14l-4 34H50l-4-34c-6-2-14-6-20-14z"/>'),
    jewelry:wrap('<path d="M60 18l22 18-22 34-22-34z"/><circle cx="60" cy="34" r="6"/>'),
    purse:wrap('<path d="M34 34h52v30a14 14 0 0 1-14 14H48a14 14 0 0 1-14-14z"/><path d="M48 34a12 12 0 0 1 24 0"/>'),
    flower:wrap('<circle cx="60" cy="34" r="8"/><circle cx="46" cy="34" r="8"/><circle cx="74" cy="34" r="8"/><circle cx="53" cy="23" r="8"/><circle cx="67" cy="23" r="8"/><path d="M60 42v26M60 60l-10 10M60 56l10 8"/>'),
    feather:wrap('<path d="M84 18c-20 2-42 22-42 42 0 10 8 16 16 16 20 0 40-22 42-42 1-10-6-17-16-16z"/><path d="M44 58c10-2 24-12 36-28M54 62l-12 12"/>'),
    trace:wrap('<path d="M44 58c0-8 8-12 8-22a8 8 0 1 1 16 0c0 10 8 14 8 22a16 16 0 0 1-32 0z"/><circle cx="40" cy="32" r="5"/><circle cx="52" cy="24" r="5"/><circle cx="68" cy="24" r="5"/><circle cx="80" cy="32" r="5"/>'),
    map:wrap('<path d="M22 26l22-8 32 8 22-8v46l-22 8-32-8-22 8z"/><path d="M44 18v46M76 26v46"/>'),
    watch:wrap('<rect x="48" y="10" width="24" height="18" rx="6"/><rect x="48" y="62" width="24" height="18" rx="6"/><circle cx="60" cy="45" r="18"/><path d="M60 45l8-6M60 45v10"/>'),
    lighter:wrap('<rect x="42" y="24" width="36" height="46" rx="6"/><path d="M42 36h36"/><path d="M60 16c6 8 8 12 6 18-6 0-12-4-12-10 0-4 2-6 6-8z"/>'),
    candle:wrap('<path d="M52 26h16v40H52z"/><path d="M60 16c6 8 8 12 6 18-6 0-12-4-12-10 0-4 2-6 6-8z"/><path d="M48 66h24"/>'),
    fireitem:wrap('<path d="M42 24h24v14H42z"/><path d="M50 24v-8h8v8"/><path d="M60 42c10 8 8 24-6 28 2-8-2-10-4-14-4 4-6 8-4 14-14-4-16-20-6-28 4-4 8-8 10-14 4 6 6 10 10 14z"/>'),
    injection:wrap('<path d="M26 62l18-18 8 8-18 18H26z"/><path d="M50 38l12-12 20 20-12 12"/><path d="M82 22l8-8"/>'),
    blade:wrap('<path d="M24 66l28-28 16 16-28 28H24z"/><path d="M56 34l18-18 10 10-18 18"/>'),
    blunt:wrap('<path d="M34 68l24-24M58 44l26-26M72 18l16 16M28 72l10-10"/>'),
    poison:wrap('<path d="M46 18h28v12l10 14v20a10 10 0 0 1-10 10H46a10 10 0 0 1-10-10V44l10-14z"/><path d="M50 52h20M60 42v20"/>'),
    rope:wrap('<circle cx="60" cy="42" r="18"/><path d="M60 60v12c0 4 4 8 8 8"/><path d="M72 32c0-8-24-8-24 0s24 8 24 0z"/>'),
    fire:wrap('<path d="M60 18c8 10 10 16 8 24 8 4 12 12 12 20 0 12-10 20-20 20S40 74 40 62c0-8 4-14 10-18-2-8 0-16 10-26z"/>'),
    electric:wrap('<path d="M66 12L42 48h16l-4 30 24-36H62z"/>'),
    crash:wrap('<circle cx="36" cy="60" r="10"/><circle cx="84" cy="60" r="10"/><path d="M24 56l14-22h28l12 12h12v10"/>'),
    fall:wrap('<path d="M30 68h52M36 60l16-16 10 10 18-18"/><circle cx="58" cy="20" r="8"/><path d="M58 28v12l12 10"/>'),
    gas:wrap('<path d="M34 58c-10 0-16-6-16-14 0-8 6-14 14-14 2-10 10-16 20-16 12 0 22 10 22 22 10 0 18 8 18 18 0 10-8 18-18 18H34z"/>'),
    water:wrap('<path d="M60 16c12 16 22 26 22 38a22 22 0 0 1-44 0c0-12 10-22 22-38z"/>'),
    machine:wrap('<rect x="24" y="24" width="72" height="42" rx="6"/><circle cx="42" cy="58" r="10"/><circle cx="78" cy="58" r="10"/><path d="M42 58h36M60 24v18"/>'),
    tool:wrap('<path d="M34 64l18-18M48 30l10-10 22 22-10 10M42 56l-12 12"/>')
  };

  C.cardHtml=(text,type,o={})=>{
    const [key,sub]=meta(text,type), tag=o.tag||(type==='means'?'MEANS':type==='clue'?'CLUE':'EVIDENCE'), el=o.interactive?'button':'div';
    const cls=['case-card','v7-card',`${type}-case-card`,o.small?'small-card':'',o.large?'large-card':'',o.selected?'selected':'',o.interactive?'interactive':'',o.extraClass||''].filter(Boolean).join(' ');
    const id=o.dataId?` data-id="${C.esc(o.dataId)}"`:'';
    return `<${el} class="${cls}"${id}><span class="v7-corner v7-tl">${tag[0]}</span><span class="v7-corner v7-tr">◆</span><div class="v7-card-head"><span>${C.esc(tag)}</span><small>${C.esc(sub)}</small></div><div class="v7-art art-${key}">${ART[key]||ART.evidence}</div><div class="v7-title">${C.esc(text)}</div><div class="v7-foot"><span>CASEFILE</span><span>${type==='means'?'METHOD':'OBJECT'}</span></div><div class="v7-watermark">${C.esc(tag)}</div></${el}>`;
  };
})();
