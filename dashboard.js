const K='dfv-v5';
const seed={items:[],recipes:[],productions:[],orders:[],purchases:[],sales:[],invoices:[],cash:[],employees:[],appointments:[],payouts:[]};
let db=JSON.parse(localStorage.getItem(K)||'null')||seed;
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const uid=()=>Date.now()+Math.random().toString(16).slice(2);
const save=()=>{localStorage.setItem(K,JSON.stringify(db));render()};
const today=()=>new Date().toLocaleDateString('de-DE');
const employeeOptions=()=>db.employees.map(e=>'<option value="'+e.id+'">'+esc(e.name)+'</option>').join('');
function empty(n,t){return '<tr><td colspan="'+n+'" class="muted">'+t+'</td></tr>'}
function employeeName(id){return db.employees.find(e=>e.id===id)?.name||'–'}
function itemName(id){return db.items.find(i=>i.id===id)?.name||'–'}
function products(){return db.items.filter(i=>i.kind==='product')}

function render(){
  const cash=db.cash.reduce((a,x)=>a+(x.type==='Einnahme'?1:-1)*(+x.amount||0),0);
  $('#statStock').textContent=db.items.reduce((a,x)=>a+(+x.stock||0),0);
  $('#statProduction').textContent=db.productions.length;
  $('#statOrders').textContent=db.orders.filter(x=>x.status!=='Erledigt').length;
  $('#statInvoices').textContent=db.invoices.filter(x=>x.status!=='Bezahlt').length;
  $('#statCash').textContent=money(cash);
  $('#statEmployees').textContent=db.employees.length;
  $('#cashTotal').textContent=money(cash);

  $('#itemsBody').innerHTML=db.items.map(x=>'<tr><td><b>'+esc(x.name)+'</b>'+(x.kind==='product'?' <span class="tag">PRODUKT</span>':'')+'</td><td>'+esc(x.category||'–')+'</td><td>'+x.stock+' Stück</td><td>'+money(x.purchasePrice||0)+'</td><td><button class="btn" onclick="openStock('+JSON.stringify(x.id)+')">Buchen</button></td></tr>').join('')||empty(5,'Noch keine Ressourcen oder Produkte angelegt.');

  $('#ordersBody').innerHTML=db.orders.map(o=>'<tr><td>'+esc(o.number)+'</td><td>'+esc(o.customer)+'</td><td>'+esc(o.items.map(i=>itemName(i.itemId)+' × '+i.qty).join(', '))+'</td><td>'+money(o.total)+'</td><td><span class="tag '+(o.status==='Erledigt'?'ok':'warn')+'">'+esc(o.status)+'</span></td><td>'+(o.status==='Erledigt'?'':'<button class="btn btn-gold" onclick="completeOrder(\''+o.id+'\')">Erledigt</button>')+'</td></tr>').join('')||empty(6,'Keine Bestellungen.');

  $('#purchasesBody').innerHTML=db.purchases.slice().reverse().map(p=>'<tr><td>'+esc(p.date)+'</td><td>'+esc(itemName(p.itemId))+'</td><td>'+p.qty+' Stück</td><td>'+money(p.unitPrice)+'</td><td>'+money(p.total)+'</td><td>'+esc(employeeName(p.employeeId))+'</td></tr>').join('')||empty(6,'Noch keine Einkäufe.');

  $('#salesBody').innerHTML=db.sales.slice().reverse().map(s=>'<tr><td>'+esc(s.date)+'</td><td>'+esc(itemName(s.itemId))+'</td><td>'+s.qty+' Stück</td><td>'+money(s.unitPrice)+'</td><td>'+money(s.total)+'</td><td>'+esc(employeeName(s.employeeId))+'</td></tr>').join('')||empty(6,'Noch keine Verkäufe.');

  $('#invoicesBody').innerHTML=db.invoices.map(x=>'<tr><td>'+esc(x.number)+'</td><td>'+esc(x.customer)+'</td><td>'+esc(x.source||'–')+'</td><td>'+money(x.amount)+'</td><td><span class="tag '+(x.status==='Bezahlt'?'ok':'danger')+'">'+esc(x.status)+'</span></td></tr>').join('')||empty(5,'Keine Rechnungen.');

  $('#cashBody').innerHTML=db.cash.slice().reverse().map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.description)+'</td><td>'+esc(x.type)+'</td><td>'+money(x.amount)+'</td></tr>').join('')||empty(4,'Keine Kassenbewegungen.');

  $('#employees').innerHTML=db.employees.map(x=>'<article class="employee"><div class="employee-role">'+esc((x.roles||[x.role]).filter(Boolean).join(' · '))+'</div><h3>'+esc(x.name)+'</h3><p class="muted">'+esc(x.phone||'')+'<br>'+esc(x.mail||'')+'</p><p><b>Offene Provision:</b> '+money(x.openCommission||0)+'</p><button class="btn" onclick="payoutCommission(\''+x.id+'\')">Ausgezahlt</button></article>').join('')||'<p class="muted">Keine Mitarbeiter.</p>';

  $('#commissionList').innerHTML=db.employees.map(x=>'<article class="employee"><div class="employee-role">PROVISION 50 %</div><h3>'+esc(x.name)+'</h3><p class="muted">Offen: <b>'+money(x.openCommission||0)+'</b></p><button class="btn btn-gold" onclick="payoutCommission(\''+x.id+'\')">Ausgezahlt</button></article>').join('')||'<p class="muted">Keine Mitarbeiter.</p>';

  $('#appointments').innerHTML=db.appointments.map(x=>'<article class="appointment"><div class="date">'+esc(x.date)+' · '+esc(x.time)+'</div><h3>'+esc(x.title)+'</h3><p class="muted">'+esc(x.person||'')+'<br>'+esc(x.note||'')+'</p></article>').join('')||'<p class="muted">Keine Termine.</p>';

  $('#recipes').innerHTML=db.recipes.map(r=>'<article class="recipe"><div class="employee-role">REZEPT</div><h3>'+esc(r.name)+'</h3><p class="muted"><b>Ressourcen:</b><br>'+r.ingredients.map(i=>esc(itemName(i.itemId))+' × '+i.qty+' Stück').join('<br>')+'</p><p class="muted"><b>Produkt:</b> '+esc(itemName(r.outputItemId))+' × '+r.outputQty+'</p></article>').join('')||'<p class="muted">Noch keine Rezepte.</p>';

  renderProduction();
}

function formShell(title,body,k){
  const handler=k==='purchase'?'submitPurchase(event)':k==='sale'?'submitSale(event)':k==='order'?'submitOrder(event)':k==='stock'?'submitStock(event)':`submitForm(event,'${k}')`;
  $('#formContent').innerHTML='<p class="eyebrow">VERWALTUNG</p><h2>'+title+'</h2><form onsubmit="'+handler+'"><div class="form-grid">'+body+'</div><div class="form-actions"><button type="button" class="btn" onclick="closeForm()">Abbrechen</button><button class="btn btn-gold">Speichern</button></div></form>';
  $('#modal').classList.add('show');
}
function field(name,label,type='text',extra=''){return '<label>'+label+'<input name="'+name+'" type="'+type+'" '+extra+' required></label>'}
function selectField(name,label,options,required=true){return '<label>'+label+'<select name="'+name+'" '+(required?'required':'')+'>'+options+'</select></label>'}
function openForm(k){
 if(k==='recipe'){openRecipeForm();return}
 if(k==='purchase'){openPurchaseForm();return}
 if(k==='sale'){openSaleForm();return}
 if(k==='order'){openOrderForm();return}
 const forms={
  item:()=>field('name','Name')+field('category','Kategorie')+field('purchasePrice','Einkaufspreis ($)','number','step="0.01" min="0"')+field('stock','Anfangsbestand (Stück)','number','step="1" min="0"')+'<label>Beschreibung<textarea name="description"></textarea></label>',
  invoice:()=>field('customer','Kunde')+field('due','Fällig am','date')+field('amount','Betrag ($)','number','step="0.01" min="0"')+field('source','Quelle')+selectField('status','Status','<option>Offen</option><option>Bezahlt</option><option>Überfällig</option>'),
  cash:()=>field('date','Datum','date')+field('description','Beschreibung')+selectField('type','Typ','<option>Einnahme</option><option>Ausgabe</option>')+field('amount','Betrag ($)','number','step="0.01" min="0"'),
  employee:()=>field('name','Name')+field('role','Rang / Rolle')+field('phone','Telefon','text','required')+field('mail','E-Mail','email','required'),
  appointment:()=>field('title','Titel')+field('person','Person / Kunde')+field('date','Datum','date')+field('time','Uhrzeit','time')+'<label class="full">Notiz<textarea name="note"></textarea></label>'
 };
 formShell(k==='item'?'Ressource anlegen':k==='invoice'?'Rechnung anlegen':k==='cash'?'Kassenbuchung':k==='employee'?'Mitarbeiter anlegen':'Termin anlegen',forms[k](),k);
}
function openPurchaseForm(){
 if(!db.items.filter(i=>i.kind!=='product').length){alert('Bitte zuerst eine Ressource im Lager anlegen.');return}
 const opts=db.items.filter(i=>i.kind!=='product').map(i=>'<option value="'+i.id+'">'+esc(i.name)+' · '+money(i.purchasePrice)+'</option>').join('');
 formShell('Einkauf buchen',selectField('itemId','Ressource',opts)+field('qty','Stückzahl','number','min="1" step="1"')+selectField('employeeId','Mitarbeiter',employeeOptions()),'purchase');
}
function openSaleForm(){
 if(!products().length){alert('Bitte zuerst ein Rezept mit einem Produkt anlegen.');return}
 const opts=products().map(i=>'<option value="'+i.id+'">'+esc(i.name)+' · '+money(i.salePrice)+'</option>').join('');
 formShell('Verkauf buchen',selectField('itemId','Produkt',opts)+field('qty','Stückzahl','number','min="1" step="1"')+selectField('employeeId','Mitarbeiter',employeeOptions()),'sale');
}
function openOrderForm(){
 if(!products().length){alert('Bitte zuerst ein Rezept mit einem Produkt anlegen.');return}
 const opts=products().map(i=>'<option value="'+i.id+'">'+esc(i.name)+' · '+money(i.salePrice)+'</option>').join('');
 formShell('Bestellung vorbereiten',field('customer','Kunde')+selectField('itemId','Produkt',opts)+field('qty','Stückzahl','number','min="1" step="1"')+selectField('employeeId','Mitarbeiter',employeeOptions())+field('note','Notiz'), 'order');
}
function openRecipeForm(){
 const resources=db.items.filter(i=>i.kind!=='product');
 if(!resources.length){alert('Bitte zuerst deine Ressourcen im Lager anlegen.');return}
 const opts=resources.map(i=>'<option value="'+i.id+'">'+esc(i.name)+'</option>').join('');
 $('#formContent').innerHTML='<p class="eyebrow">PRODUKTIONSREZEPT</p><h2>Rezept anlegen</h2><form onsubmit="submitRecipe(event)"><div class="form-grid">'+field('name','Rezeptname')+field('outputName','Produktname')+field('salePrice','Verkaufspreis ($)','number','step="0.01" min="0"')+field('outputQty','Ausgabemenge (Stück)','number','min="1" step="1" value="1"')+'<label class="full">Herstellungshinweis<textarea name="note"></textarea></label></div><div class="ingredient-head"><b>Benötigte Ressourcen</b><button type="button" class="btn" onclick="addIngredientRow()">+ Ressource</button></div><div id="ingredientRows"><div class="recipe-row"><select class="recipe-item">'+opts+'</select><input class="recipe-qty" type="number" min="1" step="1" value="1"><button type="button" class="btn" onclick="this.parentElement.remove()">×</button></div></div><div class="form-actions"><button type="button" class="btn" onclick="closeForm()">Abbrechen</button><button class="btn btn-gold">Rezept speichern</button></div></form>';
 $('#modal').classList.add('show');
}
function addIngredientRow(){
 const opts=db.items.filter(i=>i.kind!=='product').map(i=>'<option value="'+i.id+'">'+esc(i.name)+'</option>').join('');
 const row=document.createElement('div');row.className='recipe-row';row.innerHTML='<select class="recipe-item">'+opts+'</select><input class="recipe-qty" type="number" min="1" step="1" value="1"><button type="button" class="btn" onclick="this.parentElement.remove()">×</button>';$('#ingredientRows').appendChild(row);
}
function submitRecipe(e){
 e.preventDefault();const fd=new FormData(e.target);const ingredients=[...document.querySelectorAll('.recipe-row')].map(r=>({itemId:r.querySelector('.recipe-item').value,qty:Math.max(1,Math.floor(Number(r.querySelector('.recipe-qty').value)||1))})).filter(x=>x.itemId);
 if(!ingredients.length){alert('Mindestens eine Ressource ist erforderlich.');return}
 const product={id:uid(),name:fd.get('outputName'),kind:'product',category:'Produkt',stock:0,purchasePrice:0,salePrice:Number(fd.get('salePrice'))||0,recipeId:null};
 const recipe={id:uid(),name:fd.get('name'),ingredients,outputItemId:product.id,outputQty:Math.max(1,Math.floor(Number(fd.get('outputQty'))||1)),note:fd.get('note')||''};
 product.recipeId=recipe.id;db.items.push(product);db.recipes.push(recipe);save();closeForm();
}
function submitForm(e,k){
 e.preventDefault();const fd=new FormData(e.target);
 if(k==='item'){db.items.push({id:uid(),name:fd.get('name'),kind:'resource',category:fd.get('category'),stock:Math.max(0,Math.floor(Number(fd.get('stock'))||0)),purchasePrice:Number(fd.get('purchasePrice'))||0,description:fd.get('description')||''})}
 if(k==='employee'){db.employees.push({id:uid(),name:fd.get('name'),roles:[fd.get('role')],phone:fd.get('phone'),mail:fd.get('mail'),openCommission:0})}
 if(k==='appointment'){db.appointments.push({id:uid(),title:fd.get('title'),person:fd.get('person'),date:fd.get('date'),time:fd.get('time'),note:fd.get('note')})}
 if(k==='invoice'){db.invoices.push({id:uid(),number:'RE-'+new Date().getFullYear()+'-'+String(db.invoices.length+1).padStart(4,'0'),customer:fd.get('customer'),due:fd.get('due'),amount:Number(fd.get('amount'))||0,source:fd.get('source'),status:fd.get('status')})}
 if(k==='cash'){db.cash.push({id:uid(),date:fd.get('date'),description:fd.get('description'),type:fd.get('type'),amount:Number(fd.get('amount'))||0})}
 save();closeForm();
}
function openStock(id){
 const item=db.items.find(i=>i.id===id);if(!item)return;
 formShell('Lagerbuchung: '+esc(item.name),field('qty','Menge (Stück)','number','min="1" step="1"')+selectField('type','Buchung','<option>Eingang</option><option>Ausgang</option>')+selectField('employeeId','Mitarbeiter',employeeOptions())+field('reason','Grund'),'stock');
 window.stockItemId=id;
}
function submitStock(e){
 e.preventDefault();const fd=new FormData(e.target),item=db.items.find(i=>i.id===window.stockItemId),qty=Math.max(1,Math.floor(Number(fd.get('qty'))||0)),delta=fd.get('type')==='Eingang'?qty:-qty;
 if(!item||item.stock+delta<0){alert('Nicht genügend Lagerbestand.');return}
 item.stock+=delta;save();closeForm();
}
function completeOrder(id){
 const o=db.orders.find(x=>x.id===id);if(!o||o.status==='Erledigt')return;
 const missing=o.items.find(i=>{const item=db.items.find(x=>x.id===i.itemId);return !item||item.stock<i.qty});
 if(missing){alert('Bestellung kann nicht erledigt werden: Lagerbestand reicht nicht.');return}
 o.items.forEach(i=>db.items.find(x=>x.id===i.itemId).stock-=i.qty);o.status='Erledigt';
 db.cash.push({id:uid(),date:today(),description:'Bestellung '+o.number,type:'Einnahme',amount:o.total});
 addCommission(o.employeeId,o.total,'Bestellung',o.number);save();
}
function submitOrder(e){
 e.preventDefault();const fd=new FormData(e.target),item=db.items.find(i=>i.id===fd.get('itemId')),qty=Math.max(1,Math.floor(Number(fd.get('qty'))||1)),total=(item?.salePrice||0)*qty;
 db.orders.push({id:uid(),number:'BEST-'+String(db.orders.length+1).padStart(4,'0'),customer:fd.get('customer'),items:[{itemId:item.id,qty}],total,status:'Vorbereitet',employeeId:fd.get('employeeId'),note:fd.get('note')||''});save();closeForm();
}
function submitPurchase(e){
 e.preventDefault();const fd=new FormData(e.target),item=db.items.find(i=>i.id===fd.get('itemId')),qty=Math.max(1,Math.floor(Number(fd.get('qty'))||1)),total=(item?.purchasePrice||0)*qty;
 if(!item)return;if(item.kind==='product')return;item.stock+=qty;db.purchases.push({id:uid(),date:today(),itemId:item.id,qty,unitPrice:item.purchasePrice,total,employeeId:fd.get('employeeId')});db.cash.push({id:uid(),date:today(),description:'Einkauf '+item.name,type:'Ausgabe',amount:total});save();closeForm();
}
function submitSale(e){
 e.preventDefault();const fd=new FormData(e.target),item=db.items.find(i=>i.id===fd.get('itemId')),qty=Math.max(1,Math.floor(Number(fd.get('qty'))||1)),total=(item?.salePrice||0)*qty;
 if(!item||item.stock<qty){alert('Nicht genügend Produktbestand.');return}
 item.stock-=qty;db.sales.push({id:uid(),date:today(),itemId:item.id,qty,unitPrice:item.salePrice,total,employeeId:fd.get('employeeId')});db.cash.push({id:uid(),date:today(),description:'Verkauf '+item.name,type:'Einnahme',amount:total});addCommission(fd.get('employeeId'),total,'Verkauf',item.name);save();closeForm();
}
function addCommission(employeeId,base,activity,reference){
 const e=db.employees.find(x=>x.id===employeeId);if(!e)return;const amount=Number(base||0)*.5;e.openCommission=Number(e.openCommission||0)+amount;
 if(!e.commissionEvents)e.commissionEvents=[];e.commissionEvents.push({id:uid(),date:today(),activity,reference,base,rate:.5,amount});
}
function payoutCommission(id){
 const e=db.employees.find(x=>x.id===id);if(!e||!(e.openCommission>0)){alert('Keine offene Provision vorhanden.');return}
 db.payouts.push({id:uid(),date:today(),employeeId:id,amount:e.openCommission});e.openCommission=0;save();
}
function getProductionData(recipeId,qty){
 const r=db.recipes.find(x=>x.id===recipeId);if(!r)return null;const amount=Math.max(1,Math.floor(Number(qty)||1));const req=r.ingredients.map(i=>{const item=db.items.find(x=>x.id===i.itemId);const need=i.qty*amount;return{item,per:i.qty,need,ok:item&&item.stock>=need}});const out=db.items.find(x=>x.id===r.outputItemId);return{r,amount,requirements:req,out,outputAmount:r.outputQty*amount};
}
function renderProduction(){
 const s=$('#productionRecipe'),cur=s.value;s.innerHTML=db.recipes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join('')||'<option value="">Kein Rezept</option>';if(db.recipes.some(r=>r.id===cur))s.value=cur;
 const d=getProductionData(s.value,$('#productionQty').value);if(!d){$('#productionPreview').innerHTML=empty(5,'Noch kein Rezept.');$('#productionOutput').textContent='–'}else{$('#productionOutput').textContent=d.outputAmount+' × '+itemName(d.out?.id);$('#productionPreview').innerHTML=d.requirements.map(x=>'<tr><td>'+esc(x.item?.name||'–')+'</td><td>'+x.per+' Stück</td><td>'+x.need+' Stück</td><td>'+x.item?.stock+' Stück</td><td><span class="tag '+(x.ok?'ok':'danger')+'">'+(x.ok?'Verfügbar':'Zu wenig')+'</span></td></tr>').join('')}
 $('#productionHistory').innerHTML=db.productions.slice().reverse().slice(0,30).map(p=>'<tr><td>'+esc(p.date)+'</td><td>'+esc(p.recipeName)+'</td><td>'+p.quantity+'</td><td>'+esc(p.outputName)+' × '+p.outputQuantity+'</td><td>'+esc(employeeName(p.employeeId))+'</td></tr>').join('')||empty(5,'Noch keine Produktionen.');
}
function bookProduction(){
 const d=getProductionData($('#productionRecipe').value,$('#productionQty').value);if(!d)return;
 if(!d.out){alert('Das Produkt des Rezepts fehlt.');return}const missing=d.requirements.find(x=>!x.ok);if(missing){alert('Produktion nicht gebucht: Lagerbestand reicht für '+missing.item?.name+' nicht.');return}
 d.requirements.forEach(x=>x.item.stock-=x.need);d.out.stock+=d.outputAmount;
 const emp=$('#productionEmployee')?.value||'';db.productions.push({id:uid(),date:new Date().toLocaleString('de-DE'),recipeName:d.r.name,quantity:d.amount,outputName:d.out.name,outputQuantity:d.outputAmount,employeeId:emp});
 const base=d.outputAmount*(d.out.salePrice||0);if(emp)addCommission(emp,base,'Produktion',d.out.name);save();closeForm();
}
function openProduction(){
 if(!db.recipes.length){alert('Bitte zuerst ein Rezept anlegen.');return}
 const opts=db.recipes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join('');
 $('#formContent').innerHTML='<p class="eyebrow">PRODUKTION</p><h2>Produktion buchen</h2><div class="form-grid">'+selectField('modalRecipe','Rezept',opts)+field('modalQty','Stückzahl','number','min="1" step="1" value="1"')+selectField('employeeId','Mitarbeiter',employeeOptions())+'</div><div id="modalProductionPreview" class="production-modal-preview"></div><div class="form-actions"><button class="btn" onclick="closeForm()">Abbrechen</button><button class="btn btn-gold" onclick="bookProductionModal()">Produktion buchen</button></div>';$('#modal').classList.add('show');$('#modalRecipe').onchange=renderModalProduction;$('#modalQty').oninput=renderModalProduction;renderModalProduction();
}
function renderModalProduction(){const d=getProductionData($('#modalRecipe')?.value,$('#modalQty')?.value);if(!d)return;$('#modalProductionPreview').innerHTML='<div class="production-summary"><b>Benötigte Ressourcen</b>'+d.requirements.map(x=>'<div class="requirement '+(x.ok?'available':'missing')+'"><span>'+esc(x.item?.name||'–')+'</span><span>'+x.need+' / Lager '+(x.item?.stock||0)+' Stück</span></div>').join('')+'<div class="output-line">Ausgabe: <b>'+esc(d.out?.name||'–')+' × '+d.outputAmount+'</b></div></div>'}
function bookProductionModal(){const d=getProductionData($('#modalRecipe')?.value,$('#modalQty')?.value);if(!d)return;if(!d.requirements.every(x=>x.ok)){alert('Nicht genügend Ressourcen.');return}if(!d.out){alert('Produkt fehlt.');return}d.requirements.forEach(x=>x.item.stock-=x.need);d.out.stock+=d.outputAmount;const emp=$('#employeeId')?.value||'';db.productions.push({id:uid(),date:new Date().toLocaleString('de-DE'),recipeName:d.r.name,quantity:d.amount,outputName:d.out.name,outputQuantity:d.outputAmount,employeeId:emp});const base=d.outputAmount*(d.out.salePrice||0);if(emp)addCommission(emp,base,'Produktion',d.out.name);save();closeForm()}
function closeForm(){$('#modal').classList.remove('show')}
window.submitPurchase=submitPurchase;window.submitSale=submitSale;window.submitOrder=submitOrder;window.submitStock=submitStock;window.bookProduction=bookProduction;
$('#productionRecipe')?.addEventListener('change',renderProduction);$('#productionQty')?.addEventListener('input',renderProduction);
const viewIds=['dashboard','lager','bestellungen','einkauf','verkauf','produktion','rechnungen','kasse','mitarbeiter','termine','provision','rezepte'];
function routeView(){
  const raw=(location.hash||'#dashboard').slice(1);
  const view=viewIds.includes(raw)?raw:'dashboard';
  document.body.classList.remove(...viewIds.map(x=>'view-'+x));
  document.body.classList.add('view-'+view);
  window.scrollTo({top:0,behavior:'instant'});
}
window.addEventListener('hashchange',routeView);
routeView();

const menuToggle=$('#menuToggle'),drawer=$('#drawer'),backdrop=$('#drawerBackdrop');
function closeMenu(){drawer.classList.remove('open');backdrop.classList.remove('show');menuToggle.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true')}
menuToggle.onclick=()=>{const open=drawer.classList.toggle('open');backdrop.classList.toggle('show',open);menuToggle.setAttribute('aria-expanded',String(open));drawer.setAttribute('aria-hidden',String(!open))};
$('#drawerClose').onclick=closeMenu;backdrop.onclick=closeMenu;document.querySelectorAll('.drawer-nav a').forEach(a=>a.onclick=closeMenu);
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
render();