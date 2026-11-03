// Pantallas de votación. Cada "round" se guarda por separado para que el resumen
// pueda mostrar la sumatoria round por round.
const screens = [
  {name:'Easy Mode + Hard Mode', desc:'6 casillas por MC en cada modo + Skills · Flow · Puesta en escena.', rounds:[
    {id:'easy', name:'Easy Mode', count:6}, {id:'hard', name:'Hard Mode', count:6}
  ]},
  {name:'Temática 1 + Temática 2', desc:'4 casillas por MC en cada temática + Skills · Flow · Puesta en escena.', rounds:[
    {id:'tematica_1', name:'Temática 1', count:4}, {id:'tematica_2', name:'Temática 2', count:4}
  ]},
  {name:'Random Mode', desc:'8 casillas por MC + Skills · Flow · Puesta en escena.', rounds:[
    {id:'random', name:'Random Mode', count:8}
  ]},
  {name:'Minutos', desc:'Minuto de ida y minuto de vuelta. Cada respuesta marcada suma automáticamente +0,5.', type:'minutes'},
  {name:'Deluxe', desc:'3 casillas iniciales, separación y 8 casillas más + Skills · Flow · Puesta en escena.', rounds:[
    {id:'deluxe', name:'Deluxe', count:11, split:3}
  ]}
];

const replica = new URLSearchParams(location.search).get('replica') === '1';
if (replica) {
  screens.splice(0, screens.length, {
    name:'Réplica', desc:'8 casillas por MC + Skills · Flow · Puesta en escena.',
    rounds:[{id:'replica', name:'Réplica', count:8}]
  });
}

let index = 0;

function token(){
  return document.cookie.split('; ').find(x=>x.startsWith('csrftoken='))?.split('=')[1] || '';
}
function numberInput(className, attrs=''){
  return `<input class="${className}" type="text" inputmode="decimal" autocomplete="off" ${attrs}>`;
}
function totalBox(mcId, roundId){
  return `<div class="round-total" data-total-for="${mcId}-${roundId}"><span>Total</span><strong>0</strong></div>`;
}

function standardBoard(round, mc){
  const cells = Array.from({length:round.count}, (_,i)=>
    numberInput('vote', `data-mc="${mc.id}" data-round="${round.id}" data-cell="${i}"`)
  ).join('');

  return `<div class="mc-board">
    <div class="mc-title"><span>${round.name}</span><b>${mc.name}</b></div>
    <div class="cells ${round.split ? 'deluxe' : ''}">${cells}</div>
    <div class="extras">
      <label>Skills ${numberInput('extra',`data-mc="${mc.id}" data-round="${round.id}" data-extra="skills"`)}</label>
      <label>Flow ${numberInput('extra',`data-mc="${mc.id}" data-round="${round.id}" data-extra="flow"`)}</label>
      <label>Puesta en escena ${numberInput('extra',`data-mc="${mc.id}" data-round="${round.id}" data-extra="puesta"`)}</label>
      <label class="hide-score"><input type="checkbox" data-hide-total="${mc.id}-${round.id}"> Ocultar total</label>
      ${totalBox(mc.id,round.id)}
    </div>
  </div>`;
}

function minutesScreen(){
  // Ida: MC1 hace su minuto y MC2 marca las respuestas.
  // Vuelta: MC2 hace su minuto y MC1 marca las respuestas.
  return `<div class="board-set minutes-set">
    ${minuteRound('minuto_ida','MINUTO DE IDA',BATTLE.a,BATTLE.b)}
    ${minuteRound('minuto_vuelta','MINUTO DE VUELTA',BATTLE.b,BATTLE.a)}
  </div>`;
}
function minuteRound(id,title,attacker,responder){
  function mcPanel(mc, role){
    const cells = Array.from({length:6},(_,i)=>
      numberInput('vote',`data-mc="${mc.id}" data-round="${id}" data-cell="${i}"`)
    ).join('');
    const answers = role === 'responder' ? `<p class="response-help">Marcá una casilla por cada respuesta válida. Cada ✓ suma <b>+0,5</b>.</p>
      <div class="answer-grid">${Array.from({length:6},(_,i)=>`<label class="answer-box"><input type="checkbox" data-answer-mc="${mc.id}" data-round="${id}" data-answer="${i}"> ✓</label>`).join('')}</div>` : '';
    return `<div class="mc-board ${role === 'attacker' ? 'active-minute' : 'response-minute'}">
      <div class="mc-title"><span>${role === 'attacker' ? 'Hace el minuto' : 'Responde'}</span><b>${mc.name}</b></div>
      <div class="cells">${cells}</div>${answers}
      <div class="extras">
        <label>Skills ${numberInput('extra',`data-mc="${mc.id}" data-round="${id}" data-extra="skills"`)}</label>
        <label>Flow ${numberInput('extra',`data-mc="${mc.id}" data-round="${id}" data-extra="flow"`)}</label>
        <label>Puesta en escena ${numberInput('extra',`data-mc="${mc.id}" data-round="${id}" data-extra="puesta"`)}</label>
        <label class="hide-score"><input type="checkbox" data-hide-total="${mc.id}-${id}"> Ocultar total</label>
        ${totalBox(mc.id,id)}
      </div>
    </div>`;
  }
  return `<section class="round minute-round"><h2>${title}</h2><div class="duel">${mcPanel(attacker,'attacker')}${mcPanel(responder,'responder')}</div></section>`;
}

function render(){
  const screen = screens[index];
  phaseName.textContent = screen.name;
  phaseDesc.textContent = screen.desc;
  counter.textContent = `${index+1} / ${screens.length}`;

  if(screen.type === 'minutes') {
    boardArea.innerHTML = minutesScreen();
  } else {
    boardArea.innerHTML = `<div class="board-set">${screen.rounds.map(round=>
      `<section class="round"><h2>${round.name}</h2><div class="duel">${standardBoard(round,BATTLE.a)}${standardBoard(round,BATTLE.b)}</div></section>`
    ).join('')}</div>`;
  }

  prevBtn.disabled = index === 0;
  nextBtn.textContent = index === screens.length-1 ? 'Ver resultado →' : 'Siguiente →';
  attachLiveTotals();
  focusFirst();
}

function val(el){
  const raw = String(el.value).trim().replace(',','.');
  const x = raw === '' ? 0 : Number(raw);
  return !Number.isFinite(x) ? 0 : Math.max(0, Math.min(4, x));
}
function roundValue(mcId, roundId){
  const votes = [...document.querySelectorAll(`.vote[data-mc="${mcId}"][data-round="${roundId}"]`)].reduce((a,e)=>a+val(e),0);
  const extras = [...document.querySelectorAll(`.extra[data-mc="${mcId}"][data-round="${roundId}"]`)].reduce((a,e)=>a+val(e),0);
  const answers = document.querySelectorAll(`input[data-answer-mc="${mcId}"][data-round="${roundId}"]:checked`).length * 0.5;
  return votes + extras + answers;
}
function updateTotal(mcId,roundId){
  const box=document.querySelector(`[data-total-for="${mcId}-${roundId}"]`);
  if(!box)return;
  const hide=document.querySelector(`[data-hide-total="${mcId}-${roundId}"]`);
  const strong=box.querySelector('strong');
  if(hide?.checked){ strong.textContent='•••'; box.classList.add('hidden-total'); }
  else { strong.textContent=roundValue(mcId,roundId).toFixed(1); box.classList.remove('hidden-total'); }
}
function attachLiveTotals(){
  document.querySelectorAll('.vote,.extra').forEach(el=>{
    el.addEventListener('input',()=>updateTotal(el.dataset.mc,el.dataset.round));
  });
  document.querySelectorAll('[data-answer-mc]').forEach(el=>{
    el.addEventListener('change',()=>updateTotal(el.dataset.answerMc,el.dataset.round));
  });
  document.querySelectorAll('[data-hide-total]').forEach(el=>{
    const [mc,round]=el.dataset.hideTotal.split('-');
    el.addEventListener('change',()=>updateTotal(mc,round));
  });
  document.querySelectorAll('[data-total-for]').forEach(box=>{
    const [mc,round]=box.dataset.totalFor.split('-'); updateTotal(mc,round);
  });
}

async function saveRound(roundId){
  const votos={};
  [BATTLE.a,BATTLE.b].forEach(mc=>{
    const points=[...document.querySelectorAll(`.vote[data-mc="${mc.id}"][data-round="${roundId}"]`)].map(val);
    const ex={skills:0,flow:0,puesta:0};
    document.querySelectorAll(`.extra[data-mc="${mc.id}"][data-round="${roundId}"]`).forEach(e=>ex[e.dataset.extra]=val(e));
    const respuestas=document.querySelectorAll(`input[data-answer-mc="${mc.id}"][data-round="${roundId}"]:checked`).length;
    votos[mc.id]={puntajes:points,...ex,respuestas};
  });
  const response = await fetch(`/batalla/${BATTLE.id}/guardar/`,{
    method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':token()},
    body:JSON.stringify({fase:roundId,votos})
  });
  if(!response.ok) throw new Error(`No se pudo guardar ${roundId} (${response.status})`);
}
async function saveCurrent(){
  const screen=screens[index];
  if(screen.type==='minutes'){
    await saveRound('minuto_ida'); await saveRound('minuto_vuelta');
  } else {
    for(const round of screen.rounds) await saveRound(round.id);
  }
}
function focusFirst(){setTimeout(()=>document.querySelector('.vote')?.focus(),50)}

nextBtn.onclick=async()=>{
  nextBtn.disabled=true;
  try { await saveCurrent(); } catch(error) { alert(error.message || 'Error al guardar los puntajes.'); nextBtn.disabled=false; return; }
  nextBtn.disabled=false;
  if(index<screens.length-1){index++;render();}
  else location.href=`/batalla/${BATTLE.id}/resumen/`;
};
prevBtn.onclick=()=>{if(index>0){index--;render();}};

document.addEventListener('keydown',e=>{
  const active=document.activeElement;
  if(!active?.matches('input.vote,input.extra'))return;
  const inputs=[...document.querySelectorAll('.vote,.extra')];
  const i=inputs.indexOf(active);
  if(['ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();inputs[i+1]?.focus();}
  if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();inputs[i-1]?.focus();}
});
render();
