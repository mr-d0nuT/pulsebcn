const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(require('path').join(__dirname,'..','Code.gs'),'utf8');
const box={console,Date,Math,JSON,String,Number,parseInt,parseFloat,
  Utilities:{formatDate:(d,tz,f)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`},
  Session:{getScriptTimeZone:()=>'Europe/Madrid'},
  PropertiesService:{getUserProperties:()=>({_d:{},getProperty(k){return this._d[k]||null;},setProperty(k,v){this._d[k]=v;}})},
  CacheService:null,CalendarApp:null,HtmlService:null,ScriptApp:null,UrlFetchApp:null,Logger:{log:()=>{}}};
vm.createContext(box); vm.runInContext(src, box);

let fails=0;
const ok=(c,n,e)=>{console.log((c?'  ✓ ':'  ✗ ')+n+(c?'':'  → '+JSON.stringify(e)));if(!c)fails++;};
const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

console.log('\n== pascua() — diumenge de Pasqua ==');
// Dates de referència del calendari gregorià
Object.entries({2024:'2024-03-31',2025:'2025-04-20',2026:'2026-04-05',2027:'2027-03-28',
                2028:'2028-04-16',2029:'2029-04-01',2030:'2030-04-21',2031:'2031-04-13'})
  .forEach(([y,exp])=>ok(fmt(box.pascua(+y))===exp,`Pasqua ${y} = ${exp}`,fmt(box.pascua(+y))));

console.log('\n== festius mòbils coincideixen amb la llista escrita a mà ==');
const mob=(y)=>box.festivosFijos(y).filter(f=>['Divendres Sant','Dilluns de Pasqua','Dilluns Pasqua Granada'].includes(f.titulo))
                                   .map(f=>`${f.titulo}:${f.mes}/${f.dia}`).sort();
ok(JSON.stringify(mob(2026))===JSON.stringify(['Dilluns Pasqua Granada:4/25','Dilluns de Pasqua:3/6','Divendres Sant:3/3']),
   '2026 igual que la taula original', mob(2026));
ok(JSON.stringify(mob(2025))===JSON.stringify(['Dilluns Pasqua Granada:5/9','Dilluns de Pasqua:3/21','Divendres Sant:3/18']),
   '2025 igual que la taula original', mob(2025));
ok(box.festivosFijos(2029).length===16, '2029 ja té festius (abans en tenia 0)', box.festivosFijos(2029).length);

console.log('\n== detectarTipo() ==');
[['Trabajo (Matí)','MATI'],['Trabajo (Completo)','COMPLETO'],['Trabajo (Especial)','ESPECIAL'],
 ['VE','VE'],['AP/CH','APCH'],['FO/DES','FODES'],['FO - Festiu Oficial','FO'],['FS - Festiu Setmanal','FS'],
 ['LLIC','LLIC'],['BAIXA','BAIXA'],['FC','FC'],['Vacances','FC'],['VA','VA'],['EBEP','EBEP'],
 ['Dentista','OTRO'],['VERBENA','OTRO']]
  .forEach(([t,e])=>ok(box.detectarTipo(t)===e,`detectarTipo(${JSON.stringify(t)}) === ${e}`,box.detectarTipo(t)));

console.log('\n== grupoDe() ==');
ok(box.grupoDe('MATI')==='TORN' && box.grupoDe('LLIC')==='OVERLAY' && box.grupoDe('VE')==='NOHORES','grups correctes');

console.log(fails?`\n${fails} PROVES FALLIDES\n`:'\nTOTES LES PROVES PASSEN\n');
process.exit(fails?1:0);
