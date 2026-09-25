const K='dfv-v3';
const seed={orders:[],appointments:[],invoices:[],items:[],cash:[],employees:[],recipes:[],productions:[]};
let db=JSON.parse(localStorage.getItem(K)||'null')||seed;
const $=s=>document.querySelector(s);
const euro=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const uid=()=>Date.now()+Math.random().toString(16).slice(2);
const save=()=>{localStorage.setItem(K,JSON.stringify(db));render();};
function del(t,id){db[t]=db[t].filter(x=>x.id!==id);save();}
function empty(n,t){return '<tr><td colspan="'+n+'" class="muted">'+t+'</td></tr>';}

function normalizeRecipe(r){
  if(Array.isArray(r.ingredients)) return r;
  const ingredients=String(r.ingredients||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean).map(line=>{
    const m=line.match(/^(.+?)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*$/);
    if(!m) return null;
    const item=db.items.find(i=>i.name.toLowerCase()===m[1].trim().toLowerCase());
    return item?{itemId:item.id,qty:Number(m[2].replace(',','.'))}:null;
  }).filter(Boolean);
  const out=db.items.find(i=>i.name.toLowerCase()===String(r.output||'').trim().toLowerCase());
  return {...r,ingredients,outputItemId:out?.id||'',outputQty:1};
}

function render(){
  $('#statOrders').textContent=db.orders.filter(x=>x.status!=='Erledigt').length;
  $('#statAppointments').textContent=db.appointments.length;
  $('#statInvoices').textContent=db.invoices.filter(x=>x.status!=='Bezahlt').length;
  $('#statStock').textContent=db.items.reduce((a,x)=>a+(+x.stock||0),0);

  $('#ordersBody').innerHTML=db.orders.map(x=>'<tr><td>'+esc(x.customer)+'</td><td>'+esc(x.order)+'</td><td>'+esc(x.date)+'</td><td>'+euro(x.amount)+'</td><td><span class="tag '+(x.status==='Erledigt'?'ok':'warn')+'">'+esc(x.status)+'</span></td><td><button onclick="del(\'orders\',\''+x.id+'\')">Löschen</button></td></tr>').join('')||empty(6,'Keine Aufträge.');
  $('#invoicesBody').innerHTML=db.invoices.map(x=>'<tr><td>'+esc(x.number)+'</td><td>'+esc(x.customer)+'</td><td>'+esc(x.due)+'</td><td>'+euro(x.amount)+'</td><td><span class="tag '+(x.status==='Bezahlt'?'ok':'danger')+'">'+esc(x.status)+'</span></td><td><button onclick="del(\'invoices\',\''+x.id+'\')">Löschen</button></td></tr>').join('')||empty(6,'Keine Rechnungen.');
  $('#itemsBody').innerHTML=db.items.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.category)+'</td><td>'+esc(x.stock)+'</td><td>'+'Stück'+'</td><td>'+euro(x.price)+'</td><td><button onclick="del(\'items\',\''+x.id+'\')">Löschen</button></td></tr>').join('')||empty(6,'Noch keine Items.');

  const cash=db.cash.reduce((a,x)=>a+(x.type==='Einnahme'?1:-1)*(+x.amount||0),0);
  $('#cashTotal').textContent=euro(cash);
  $('#cashBody').innerHTML=db.cash.map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.description)+'</td><td>'+esc(x.type)+'</td><td>'+euro(x.amount)+'</td><td><button onclick="del(\'cash\',\''+x.id+'\')">Löschen</button></td></tr>').join('')||empty(5,'Keine Buchungen.');

  $('#appointments').innerHTML=db.appointments.map(x=>'<article class="appointment"><div class="date">'+esc(x.date)+' · '+esc(x.time)+'</div><h3>'+esc(x.title)+'</h3><p class="muted">'+esc(x.person)+'<br>'+esc(x.note)+'</p><button class="btn" onclick="del(\'appointments\',\''+x.id+'\')">Löschen</button></article>').join('')||'<p class="muted">Keine Termine.</p>';
  $('#employees').innerHTML=db.employees.map(x=>'<article class="employee"><div class="employee-role">'+esc(x.role)+'</div><h3>'+esc(x.name)+'</h3><p class="muted">'+esc(x.phone)+'<br>'+esc(x.mail)+'</p><button class="btn" onclick="del(\'employees\',\''+x.id+'\')">Löschen</button></article>').join('')||'<p class="muted">Keine Mitarbeiter.</p>';

  $('#recipes').innerHTML=db.recipes.map(raw=>{
    const x=normalizeRecipe(raw);
    const ing=x.ingredients.map(i=>{const item=db.items.find(a=>a.id===i.itemId);return item?esc(item.name)+' × '+i.qty+' '+'Stück':'Unbekannter Artikel';}).join('<br>');
    const out=db.items.find(i=>i.id===x.outputItemId);
    return '<article class="recipe"><div class="employee-role">REZEPT</div><h3>'+esc(x.name)+'</h3><p class="muted"><b>Zutaten:</b><br>'+ (ing||'Keine Zutaten')+'</p><p class="muted"><b>Ergebnis:</b> '+esc(out?.name||x.output||'–')+' × '+(x.outputQty||1)+'</p><button class="btn" onclick="del(\'recipes\',\''+x.id+'\')">Löschen</button></article>';
  }).join('')||'<p class="muted">Keine Rezepte.</p>';

  $('#commissionEmployee').innerHTML=db.employees.map(x=>'<option>'+esc(x.name)+'</option>').join('')||'<option>Kein Mitarbeiter</option>';
  renderProduction();
}

function openForm(k){
  if(k==='recipe'){openRecipeForm();return;}
  const forms={
    order:['orders','Auftrag',[['customer','Kunde','text'],['order','Bestellung','text'],['date','Termin','date'],['amount','Betrag ($)','number'],['status','Status','select','Offen|In Bearbeitung|Erledigt']]],
    appointment:['appointments','Termin',[['title','Titel','text'],['person','Person / Kunde','text'],['date','Datum','date'],['time','Uhrzeit','time'],['note','Notiz','textarea']]],
    invoice:['invoices','Rechnung',[['number','Rechnungsnummer','text'],['customer','Kunde','text'],['due','Fällig am','date'],['amount','Betrag ($)','number'],['status','Status','select','Offen|Bezahlt|Überfällig']]],
    item:['items','Item / Lagerartikel',[['name','Name','text'],['category','Kategorie','text'],['stock','Bestand','number'],['unit','Einheit','text'],['price','Verkaufspreis ($)','number'],['description','Beschreibung','textarea']]],
    cash:['cash','Kassenbuchung',[['date','Datum','date'],['description','Beschreibung','text'],['type','Typ','select','Einnahme|Ausgabe'],['amount','Betrag ($)','number']]],
    employee:['employees','Mitarbeiter',[['name','Name','text'],['role','Position','text'],['phone','Telefon','text'],['mail','E-Mail','email']],
    purchase:['cash','Einkauf',[['date','Datum','date'],['description','Beschreibung','text'],['type','Typ','select','Ausgabe'] ],
    sale:['cash','Verkauf',[['date','Datum','date'],['description','Beschreibung','text'],['type','Typ','select','Einnahme']]
  };
  let [type,title,fields]=forms[k];
  let h='<p class="eyebrow">VERWALTUNG</p><h2>'+title+' anlegen</h2><form onsubmit="submitForm(event,\''+k+'\')"><div class="form-grid">';
  fields.forEach(([n,l,t,o])=>{h+='<label class="'+(t==='textarea'?'full':'')+'">'+l+(t==='select'?'<select name="'+n+'">'+o.split('|').map(v=>'<option>'+v+'</option>').join('')+'</select>':t==='textarea'?'<textarea name="'+n+'"></textarea>':'<input name="'+n+'" type="'+t+'" required>')+'</label>';});
  h+='</div><div class="form-actions"><button type="button" class="btn" onclick="closeForm()">Abbrechen</button><button class="btn btn-gold">Speichern</button></div></form>';
  $('#formContent').innerHTML=h;$('#modal').classList.add('show');
}

function openRecipeForm(){
  if(!db.items.length){alert('Bitte zuerst die benötigten Lager-Items anlegen.');return;}
  const itemOptions=db.items.map(i=>'<option value="'+i.id+'">'+esc(i.name)+' ('+esc(i.unit)+')</option>').join('');
  const first='<div class="recipe-row"><select class="recipe-item">'+itemOptions+'</select><input class="recipe-qty" type="number" min="1" step="1" value="1"><button type="button" class="btn" onclick="this.parentElement.remove()">×</button></div>';
  const outOptions='<option value="">Ausgabe-Item wählen</option>'+itemOptions;
  $('#formContent').innerHTML='<p class="eyebrow">PRODUKTIONSREZEPT</p><h2>Rezept anlegen</h2><form onsubmit="submitRecipe(event)"><div class="form-grid"><label>Rezeptname<input name="name" required></label><label>Ausgabe-Item<select name="outputItemId" required>'+outOptions+'</select></label><label>Ausgabemenge<input name="outputQty" type="number" min="1" step="1" value="1" required></label><label class="full">Herstellungshinweis<textarea name="note"></textarea></label></div><div class="ingredient-head"><b>Benötigte Lagerartikel</b><button type="button" class="btn" onclick="addIngredientRow()">+ Artikel</button></div><div id="ingredientRows">'+first+'</div><div class="form-actions"><button type="button" class="btn" onclick="closeForm()">Abbrechen</button><button class="btn btn-gold">Rezept speichern</button></div></form>';
  $('#modal').classList.add('show');
}
function addIngredientRow(){
  const opts=db.items.map(i=>'<option value="'+i.id+'">'+esc(i.name)+' ('+esc(i.unit)+')</option>').join('');
  const row=document.createElement('div');row.className='recipe-row';row.innerHTML='<select class="recipe-item">'+opts+'</select><input class="recipe-qty" type="number" min="1" step="1" value="1"><button type="button" class="btn" onclick="this.parentElement.remove()">×</button>';
  $('#ingredientRows').appendChild(row);
}
function submitRecipe(e){
  e.preventDefault();
  const fd=new FormData(e.target),ingredients=[...document.querySelectorAll('.recipe-row')].map(row=>({itemId:row.querySelector('.recipe-item').value,qty:Math.max(1,Math.floor(Number(row.querySelector('.recipe-qty').value)||1))})).filter(x=>x.itemId&&x.qty>0);
  if(!ingredients.length){alert('Mindestens ein benötigter Artikel muss hinterlegt werden.');return;}
  db.recipes.push({id:uid(),name:fd.get('name'),outputItemId:fd.get('outputItemId'),outputQty:Math.max(1,Math.floor(Number(fd.get('outputQty'))||1)),note:fd.get('note')||'',ingredients});
  save();closeForm();
}

function openProduction(){
  if(!db.recipes.length){alert('Bitte zuerst ein Rezept anlegen.');return;}
  $('#modal').classList.add('show');
  $('#formContent').innerHTML='<p class="eyebrow">PRODUKTION</p><h2>Produktion buchen</h2><div class="form-grid"><label>Rezept<select id="modalProductionRecipe">'+db.recipes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join('')+'</select></label><label>Menge<input id="modalProductionQty" type="number" min="1" step="1" value="1"></label></div><div class="production-modal-preview" id="modalProductionPreview"></div><div class="form-actions"><button type="button" class="btn" onclick="closeForm()">Abbrechen</button><button type="button" class="btn btn-gold" onclick="bookProductionFromModal()">Produktion buchen</button></div>';
  $('#modalProductionRecipe').onchange=renderModalProduction;
  $('#modalProductionQty').oninput=renderModalProduction;
  renderModalProduction();
}
function getProductionData(recipeId,qty){
  const raw=db.recipes.find(r=>r.id===recipeId);if(!raw)return null;
  const r=normalizeRecipe(raw), amount=Math.max(1,Math.floor(Number(qty)||1));
  const requirements=r.ingredients.map(i=>{const item=db.items.find(x=>x.id===i.itemId);const need=i.qty*amount;return {item,per:i.qty,need,ok:item&&Number(item.stock)>=need};});
  const out=db.items.find(i=>i.id===r.outputItemId);
  return {r,amount,requirements,out,outputAmount:(r.outputQty||1)*amount};
}
function renderModalProduction(){
  const data=getProductionData($('#modalProductionRecipe')?.value,$('#modalProductionQty')?.value);if(!data)return;
  $('#modalProductionPreview').innerHTML='<div class="production-summary"><b>Benötigte Artikel</b>'+data.requirements.map(x=>'<div class="requirement '+(x.ok?'available':'missing')+'"><span>'+esc(x.item?.name||'Unbekannter Artikel')+'</span><span>'+x.need+' '+'Stück'+' / Lager: '+(x.item?.stock??0)+'</span></div>').join('')+'<div class="output-line">Ausgabe: <b>'+esc(data.out?.name||'Unbekannt')+' × '+data.outputAmount+'</b></div></div>';
}
function renderProduction(){
  const select=$('#productionRecipe');if(!select)return;
  const current=select.value;
  select.innerHTML=db.recipes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join('')||'<option value="">Kein Rezept</option>';
  if(current&&db.recipes.some(r=>r.id===current))select.value=current;
  const qty=$('#productionQty');if(qty)qty.value=qty.value||1;
  updateProductionPreview();
  $('#productionHistory').innerHTML=db.productions.slice().reverse().slice(0,20).map(p=>'<tr><td>'+esc(p.date)+'</td><td>'+esc(p.recipeName)+'</td><td>'+p.quantity+'</td><td>'+esc(p.outputName)+' × '+p.outputQuantity+'</td></tr>').join('')||empty(4,'Noch keine Produktionen gebucht.');
}
function updateProductionPreview(){
  const recipeId=$('#productionRecipe')?.value,qty=$('#productionQty')?.value,data=getProductionData(recipeId,qty);
  if(!data){$('#productionPreview').innerHTML=empty(5,'Kein Rezept vorhanden.');$('#productionOutput').textContent='–';return;}
  $('#productionOutput').textContent=data.outputAmount+' × '+(data.out?.name||'unbekannt');
  $('#productionPreview').innerHTML=data.requirements.map(x=>'<tr><td>'+esc(x.item?.name||'Unbekannter Artikel')+'</td><td>'+x.per+' '+'Stück'+'</td><td>'+x.need+' '+'Stück'+'</td><td>'+((x.item?.stock??0))+' '+'Stück'+'</td><td><span class="tag '+(x.ok?'ok':'danger')+'">'+(x.ok?'Verfügbar':'Zu wenig Lagerbestand')+'</span></td></tr>').join('')||empty(5,'Rezept enthält keine Zutaten.');
}
function bookProduction(){
  const data=getProductionData($('#productionRecipe')?.value,$('#productionQty')?.value);bookProductionData(data);
}
function bookProductionFromModal(){
  const data=getProductionData($('#modalProductionRecipe')?.value,$('#modalProductionQty')?.value);if(bookProductionData(data))closeForm();
}
function bookProductionData(data){
  if(!data){alert('Kein gültiges Rezept ausgewählt.');return false;}
  const missing=data.requirements.find(x=>!x.item||!x.ok);
  if(missing){alert('Produktion nicht gebucht: Für '+(missing.item?.name||'einen Artikel')+' fehlen '+Math.max(0,missing.need-(missing.item?.stock||0))+' '+(missing.item?.unit||'Einheiten')+'.');return false;}
  data.requirements.forEach(x=>{x.item.stock=Number(x.item.stock)-x.need;});
  if(!data.out){alert('Das Ausgabe-Item des Rezepts existiert nicht mehr im Lager.');return false;}
  data.out.stock=Number(data.out.stock||0)+data.outputAmount;
  db.productions.push({id:uid(),date:new Date().toLocaleString('de-DE'),recipeName:data.r.name,quantity:data.amount,outputName:data.out.name,outputQuantity:data.outputAmount});
  save();
  alert('Produktion wurde gebucht. Die benötigten Artikel wurden aus dem Lager abgezogen und die Produktion dem Ausgabe-Item gutgeschrieben.');
  return true;
}

function closeForm(){$('#modal').classList.remove('show');}
function submitForm(e,k){e.preventDefault();const maps={order:'orders',appointment:'appointments',invoice:'invoices',item:'items',cash:'cash',employee:'employees',purchase:'cash',sale:'cash'};const o={id:uid()};new FormData(e.target).forEach((v,n)=>o[n]=v);db[maps[k]].push(o);save();closeForm();}
function calc(){$('#commissionResult').textContent=euro((+$('#commissionRevenue').value||0)*(+$('#commissionRate').value||0)/100);}
document.addEventListener('input',e=>{if(e.target.id==='commissionRevenue'||e.target.id==='commissionRate')calc();});
$('#productionRecipe')?.addEventListener('change',updateProductionPreview);
$('#productionQty')?.addEventListener('input',updateProductionPreview);
const menuToggle=$('.menu-toggle');
const nav=$('.nav');
menuToggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuToggle.classList.toggle('active',open);menuToggle.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuToggle.classList.remove('active');menuToggle.setAttribute('aria-expanded','false');}));
document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!nav.contains(e.target)&&!menuToggle.contains(e.target)){nav.classList.remove('open');menuToggle.classList.remove('active');menuToggle.setAttribute('aria-expanded','false');}});
render();
