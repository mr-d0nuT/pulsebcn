const fs=require('fs'), vm=require('vm');
const noop=()=>{};
const elem=()=>({style:{setProperty:noop},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
  dataset:{},setAttribute:noop,appendChild:noop,remove:noop,querySelector:()=>null,querySelectorAll:()=>[],
  cloneNode:()=>elem(),value:'1519',textContent:'',innerHTML:''});
const box={console,Date,Math,JSON,Set,Array,Object,String,Number,parseInt,parseFloat,isNaN,
  setTimeout,setInterval,clearTimeout,performance,requestAnimationFrame:noop,navigator:{},
  localStorage:{_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];},key(i){return Object.keys(this._d)[i];},get length(){return Object.keys(this._d).length;}},
  google:{script:{run:new Proxy({},{get:()=>()=>box.google.script.run})}},
  document:{readyState:'loading',getElementById:elem,querySelector:()=>null,querySelectorAll:()=>[],createElement:elem,
            createDocumentFragment:elem,addEventListener:noop,documentElement:{setAttribute:noop}}};
box.window=box; box.matchMedia=()=>({matches:false,addEventListener:noop}); box.window.matchMedia=box.matchMedia;
const html=fs.readFileSync(require('path').join(__dirname,'..','Index.html'),'utf8');
vm.createContext(box);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/g).pop().replace(/^<script>|<\/script>$/g,''), box);

let fails=0;
const ok=(c,n,e)=>{console.log((c?'  ✓ ':'  ✗ ')+n+(c?'':'  → '+JSON.stringify(e)));if(!c)fails++;};

const ANY=2026; box.anioV=ANY;
// Dissabtes/diumenges de gener de 2026: 3+4, 10+11, 17+18, 24+25, 31+(1 feb)
const T=(m,d,t,n,h)=>({m,d,t,n,h:h||'Tot el dia'});
const TORN=(m,d)=>T(m,d,'MATI','Trabajo (Matí)','08:30 a 15:00');
const fiso=(m,d)=>`2026-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

function setup(evs, festivos){
  box.ANYS[ANY]={anio:ANY,v:'1',eventos:evs,
    torns:evs.filter(e=>e.t==='MATI').map(e=>({f:fiso(e.m,e.d),a:8.5,b:15})),
    festivos:festivos||[],bolsas:{VE:19,APCH:7,VA:2,EBEP:0},cfg:{},fodesEur:150};
  box.derivar(ANY);
  return box.DERIV[ANY];
}

console.log('\n== cap de setmana complet ==');
let d=setup([TORN(0,3),TORN(0,4)]);
ok(d.resumen.caps===1 && d.resumen.capsMonto===150, 'ds 3 + dg 4 treballats → 1 cap, 150€', d.resumen.caps);
ok(d.caps[0].ds==='2026-01-03' && d.caps[0].dg==='2026-01-04', 'dates correctes del parell', d.caps[0]);

console.log('\n== només un dels dos dies ==');
ok(setup([TORN(0,3)]).resumen.caps===0, 'només dissabte → no compta');
ok(setup([TORN(0,4)]).resumen.caps===0, 'només diumenge → no compta');

console.log('\n== qualsevol absència anul·la el cap de setmana ==');
[['BAIXA','BAIXA'],['LLIC','LLIC'],['APCH','AP/CH'],['VE','VE'],['VA','VA'],['EBEP','EBEP'],
 ['FC','FC'],['FS','FS - Festiu Setmanal'],['FO','FO - Festiu Oficial'],['FODES','FO/DES']]
 .forEach(([t,n])=>{
   ok(setup([TORN(0,3),TORN(0,4),T(0,3,t,n)]).resumen.caps===0, `${t} el dissabte → no es cobra`);
   ok(setup([TORN(0,3),TORN(0,4),T(0,4,t,n)]).resumen.caps===0, `${t} el diumenge → no es cobra`);
 });

console.log('\n== festiu oficial automàtic ==');
ok(setup([TORN(0,3),TORN(0,4)],[{mes:0,dia:4,titulo:'Festiu'}]).resumen.caps===0, 'festiu automàtic el diumenge → no es cobra');

console.log('\n== un event personal NO anul·la res ==');
ok(setup([TORN(0,3),TORN(0,4),T(0,3,'OTRO','Sopar amics')]).resumen.caps===1, 'un event personal no afecta la prima');

console.log('\n== diversos caps de setmana ==');
d=setup([TORN(0,3),TORN(0,4), TORN(0,10),TORN(0,11), TORN(0,17),TORN(0,18), TORN(0,24) ]);
ok(d.resumen.caps===3 && d.resumen.capsMonto===450, '3 caps complets → 450€', {c:d.resumen.caps,e:d.resumen.capsMonto});

console.log('\n== cap de setmana a cavall de dos anys ==');
// 2026-12-31 és dijous; el darrer dissabte de 2026 és el 26/12 i el diumenge el 27/12
d=setup([TORN(11,26),TORN(11,27)]);
ok(d.resumen.caps===1, 'darrer cap de setmana complet de 2026 comptat', d.resumen.caps);

console.log(fails?`\n${fails} PROVES FALLIDES\n`:'\nTOTES LES PROVES PASSEN\n');
process.exit(fails?1:0);
