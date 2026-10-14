// Smooth wheel scrolling with native anchors and reduced-motion support.
if (typeof Lenis === "function") {
 const lenis = new Lenis({anchors:true,smoothWheel:true,respectReducedMotion:true});
 if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
  lenis.on("scroll",ScrollTrigger.update);
  gsap.ticker.add(time=>lenis.raf(time*1000));
  gsap.ticker.lagSmoothing(0);
 } else {
  const raf=time=>{lenis.raf(time);requestAnimationFrame(raf)};
  requestAnimationFrame(raf);
 }
}

let bikes = [];

const grid = document.querySelector("#bike-grid");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const search = document.querySelector("#catalog-search");
const filters = [...document.querySelectorAll(".filter")];
const showMore = document.querySelector("#show-more");
let activeFilter = "todas";
let panelCatalogConnected = false;
let catalogUnavailable = false;
let catalogRequestPending = false;

const money = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:2});
const normalize = value => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const catalogStatus = document.querySelector("#catalog-sync-status");
const catalogPhotoColors=["branca","preta","vermelha","azul","azul-marinho","branca","vermelha","preta","vermelha","preta","branca","amarela","laranja","branca","verde","grafite","preta","vermelha","prata","azul","creme","verde-escura","vermelha","preta"];
const priceTypeLabels={diaria:"por diária",semanal:"por semana",mensalidade:"por mês"};
const categoryLabels={urbana:"urbana",estrada:"estrada",aventura:"aventura",classica:"clássica",trabalho:"trabalho"};
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const inferCategory=moto=>{
 const value=normalize(`${moto.marca} ${moto.modelo}`);
 if(/cargo|delivery|trabalho|entrega/.test(value))return "trabalho";
 if(/trail|adventure|enduro|rally|big trail/.test(value))return "aventura";
 if(/scooter|city|biz|neo|pcx|nmax/.test(value))return "urbana";
 if(/classic|classica|cafe|custom|bobber/.test(value))return "classica";
 if(/touring|estrada|rodoviaria/.test(value))return "estrada";
 return "urbana";
};
async function syncCatalogWithPanel(){
 if(!catalogStatus)return;
 const endpoint=document.querySelector('meta[name="motos-api"]')?.content.trim();
 if(!endpoint||catalogRequestPending)return;
 catalogRequestPending=true;
 try{
  const response=await fetch(endpoint,{headers:{Accept:"application/json"},cache:"no-store"});
  if(!response.ok)throw new Error("catalog unavailable");
  const payload=await response.json();
  if(!Array.isArray(payload.motos))throw new Error("invalid catalog payload");
  const panelBikes=payload.motos.map((moto,index)=>{
   const key=String(moto.id||index);
   const image=[...key].reduce((sum,char)=>sum+char.charCodeAt(0),0)%catalogPhotoColors.length;
   const brand=String(moto.marca||"").trim();
   const model=String(moto.modelo||"").trim();
   const status=["disponivel","alugada","manutencao","indisponivel"].includes(moto.status)?moto.status:"indisponivel";
   return {id:key,name:`${brand} ${model}`.trim(),brand,model,category:inferCategory(moto),year:moto.ano,color:String(moto.cor||""),price:Number(moto.valor_locacao),priceType:moto.tipo_valor,status,photoUrl:typeof moto.foto_url==="string"?moto.foto_url:"",image,photoColor:catalogPhotoColors[image],fromPanel:true};
  }).filter(moto=>moto.name&&Number.isFinite(moto.price));
  bikes=panelBikes;
  panelCatalogConnected=true;
  catalogUnavailable=false;
  emptyState.querySelector("strong").textContent="Nenhuma moto encontrada.";
  emptyState.querySelector("span").textContent="Tente outro nome ou limpe o filtro.";
  document.querySelector("#clear-filters").textContent="Mostrar todas";
  catalogStatus.textContent=bikes.length?`Catálogo sincronizado com o painel · ${bikes.length} moto(s) publicada(s).`:"Nenhuma moto publicada no catálogo no momento.";
  renderCatalog();
 }catch{
  catalogUnavailable=!panelCatalogConnected;
  catalogStatus.textContent=panelCatalogConnected?"Não foi possível atualizar o catálogo · mostrando os últimos dados carregados.":"Catálogo temporariamente indisponível.";
  if(!panelCatalogConnected){
   emptyState.querySelector("strong").textContent="Não foi possível carregar as motos.";
   emptyState.querySelector("span").textContent="Tente novamente em instantes.";
   document.querySelector("#clear-filters").textContent="Tentar novamente";
   renderCatalog();
  }
 }finally{
  catalogRequestPending=false;
 }
}

function renderCatalog(){
 const query = normalize(search.value.trim());
 const visible = bikes.filter(bike => {
 const categoryMatch = activeFilter === "todas" || bike.category === activeFilter;
 const queryMatch = !query || normalize(`${bike.name} ${bike.model} ${bike.brand||""}`).includes(query);
 return categoryMatch && queryMatch;
 });
 const displayed = visible;
 resultCount.textContent = visible.length;
 emptyState.hidden = visible.length !== 0;
 grid.hidden = visible.length === 0;
 showMore.hidden = true;
 grid.innerHTML = displayed.map((bike,index)=>{
 const name=escapeHtml(bike.name);
 const category=categoryLabels[bike.category]||"urbana";
 const photoColor=bike.photoColor||bike.color||"neutra";
 const specs=bike.fromPanel
  ? `<span>Ano<b>${escapeHtml(bike.year||"—")}</b></span><span>Cor<b>${escapeHtml(bike.color||"Não informada")}</b></span><span>Plano<b>${escapeHtml(priceTypeLabels[bike.priceType]||"Consulte")}</b></span>`
  : "";
 const priceCaption=priceTypeLabels[bike.priceType]||"valor cadastrado";
 const statusLabel={disponivel:"Disponível",alugada:"Indisponível",manutencao:"Em manutenção",indisponivel:"Indisponível"}[bike.status]||"Indisponível";
 const available=bike.status==="disponivel";
 const imageMarkup=bike.photoUrl?`<img src="${escapeHtml(bike.photoUrl)}" alt="" loading="lazy" decoding="async">`:`<span class="image-note">Imagem de categoria</span>`;
 return `
 <article class="bike-card" data-image="${bike.image}">
 <div class="bike-image" role="img" aria-label="${bike.photoUrl?`Foto da moto ${name}`:`Imagem ilustrativa de moto ${escapeHtml(photoColor)}; não corresponde necessariamente ao modelo ${name}`}" style="background-position:${(bike.image%4)*100*102.5/310}% ${Math.floor(bike.image/4)*100*103/518}%">
 <span class="bike-index">${String(bikes.indexOf(bike)+1).padStart(2,"0")}</span>
 <span class="bike-type">${category}</span>
 <span class="bike-availability status-${bike.status}">${statusLabel}</span>
 ${imageMarkup}
 </div>
 <div class="bike-info">
 <div class="bike-title-row">
 <h3>${name}</h3>
 <div class="bike-price">${money.format(bike.price)}<small>${priceCaption}</small></div>
 </div>
 <div class="bike-specs">
 ${specs}
 </div>
 <button class="bike-action${available?"":" is-unavailable"}" type="button" data-bike-id="${escapeHtml(bike.id)}" ${available?"":"disabled aria-disabled=\"true\""}>
 ${available?'Consultar esta moto <span aria-hidden="true">↗</span>':statusLabel}
 </button>
 </div>
 </article>`;
 }).join("");
}

filters.forEach(button => button.addEventListener("click",()=>{
 activeFilter = button.dataset.filter;
 filters.forEach(item=>{
 const selected = item === button;
 item.classList.toggle("active",selected);
 item.setAttribute("aria-pressed",String(selected));
 });
 renderCatalog();
}));
search.addEventListener("input",renderCatalog);
document.querySelector("#clear-filters").addEventListener("click",()=>{
 if(catalogUnavailable){void syncCatalogWithPanel();return;}
 activeFilter="todas";search.value="";
 filters.forEach((item,index)=>{item.classList.toggle("active",index===0);item.setAttribute("aria-pressed",String(index===0));});
 renderCatalog();search.focus();
});
grid.addEventListener("click",event=>{
 const trigger=event.target.closest(".bike-action");
 if(!trigger||trigger.disabled)return;
 const bike=bikes.find(item=>item.id===trigger.dataset.bikeId);
 if(!bike||bike.status!=="disponivel")return;
 const waLink=document.querySelector(".whatsapp-header")?.href||document.querySelector(".whatsapp-float")?.href;
 const phone=waLink?new URL(waLink,window.location.href).pathname.replace(/\D/g,""):"";
 if(!phone)return;
 const plan=priceTypeLabels[bike.priceType]||"valor cadastrado";
 const message=[
  `Olá! Tenho interesse em alugar a ${bike.name} da Loca7 Motos.`,
  "",
  `Moto: ${bike.name}`,
  `Ano: ${bike.year||"Não informado"}`,
  `Cor: ${bike.color||"Não informada"}`,
  `Valor: ${money.format(bike.price)} ${plan}`,
  "Disponibilidade exibida no site; gostaria de confirmar as condições."
 ].join("\n");
 window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
});

// This inquiry deliberately stays client-side: it only prepares a WhatsApp message.
const rentalForm=document.querySelector("#rental-interest-form");
if(rentalForm){
 const cnhRadios=[...rentalForm.querySelectorAll('input[name="cnh"]')];
 const categoryField=document.querySelector("#cnh-category-field");
 const categorySelect=document.querySelector("#cnh-category");
 const formStatus=document.querySelector("#rental-form-status");
 const updateCategoryField=()=>{
  const hasLicense=rentalForm.querySelector('input[name="cnh"]:checked')?.value==="Sim";
  categoryField.hidden=!hasLicense;
  categorySelect.disabled=!hasLicense;
  categorySelect.required=hasLicense;
  if(!hasLicense)categorySelect.value="";
 };
 cnhRadios.forEach(radio=>radio.addEventListener("change",updateCategoryField));
 rentalForm.addEventListener("submit",event=>{
  event.preventDefault();
  formStatus.textContent="";
  if(!rentalForm.reportValidity())return;
  const data=new FormData(rentalForm);
  const requiredTextFields=["nome","whatsapp","cidade"];
  const blankField=requiredTextFields.map(name=>rentalForm.elements.namedItem(name)).find(field=>!String(field.value||"").trim());
  if(blankField){blankField.setCustomValidity("Preencha este campo para continuar.");blankField.reportValidity();blankField.setCustomValidity("");return;}
  const phoneInput=rentalForm.elements.namedItem("whatsapp");
  if(String(phoneInput.value).replace(/\D/g,"").length<10){phoneInput.setCustomValidity("Informe um WhatsApp com DDD.");phoneInput.reportValidity();phoneInput.setCustomValidity("");return;}
  const whatsappLink=document.querySelector(".whatsapp-header")?.href||document.querySelector(".whatsapp-float")?.href;
  const phone=whatsappLink?new URL(whatsappLink,window.location.href).pathname.replace(/\D/g,""):"";
  if(!phone){formStatus.textContent="O WhatsApp da locadora ainda não está configurado.";return;}
  const hasCnh=data.get("cnh")==="Sim";
  const message=[
   "Olá! Tenho interesse em alugar uma moto.",
   "",
   `Nome: ${String(data.get("nome")||"").trim()}`,
   `WhatsApp: ${String(data.get("whatsapp")||"").trim()}`,
   `Cidade: ${String(data.get("cidade")||"").trim()}`,
   `CNH: ${hasCnh?"Sim":"Não"}`,
   `Categoria: ${hasCnh?String(data.get("categoria")||""):"Não possui"}`,
   `Plano: ${String(data.get("plano")||"")}`,
   `Moto de interesse: ${String(data.get("moto")||"").trim()||"Não informada"}`,
   `Observação: ${String(data.get("observacao")||"").trim()||"Não informada"}`
  ].join("\n");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
  formStatus.textContent="Mensagem preparada. Continue a conversa na aba do WhatsApp.";
 });
}

const menuButton=document.querySelector(".menu-toggle");
const nav=document.querySelector(".main-nav");
menuButton.addEventListener("click",()=>{
 const open=menuButton.getAttribute("aria-expanded")==="true";
 menuButton.setAttribute("aria-expanded",String(!open));
 nav.classList.toggle("open",!open);
});
nav.addEventListener("click",event=>{
 if(event.target.matches("a")){nav.classList.remove("open");menuButton.setAttribute("aria-expanded","false");}
});

// Hero day/night scene transition
const heroScene = document.querySelector(".hero");
const heroModeButtons = [...document.querySelectorAll("[data-hero-mode]")];
if (heroScene && heroModeButtons.length) {
 const nightImage = heroScene.querySelector(".hero-night-image");
 const dayImage = heroScene.querySelector(".hero-day-image");
 const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
 const crossfadeDuration = .7;
 let nightTimeline = null;
 let modeTween = null;

 if (typeof gsap !== "undefined") {
  heroScene.classList.add("has-gsap");
  nightTimeline = gsap.timeline({paused:true,defaults:{ease:"power1.inOut"}})
   .to(nightImage,{opacity:1,duration:crossfadeDuration},0)
   .to(dayImage,{opacity:0,duration:crossfadeDuration},0);
 }

 const setHeroMode = mode => {
  const isNight = mode === "night";
  heroScene.dataset.time = mode;
  heroScene.classList.toggle("is-night",isNight);
  heroModeButtons.forEach(button=>{
   const selected = button.dataset.heroMode === mode;
   button.classList.toggle("is-active",selected);
   button.setAttribute("aria-pressed",String(selected));
  });

  if (!nightTimeline) return;
  modeTween?.kill();
  const targetProgress = isNight ? 1 : 0;
  if (reducedMotion.matches) {
   nightTimeline.progress(targetProgress).pause();
  } else {
   const remaining = Math.abs(targetProgress - nightTimeline.progress());
   if (remaining > 0) {
    modeTween = gsap.to(nightTimeline,{progress:targetProgress,duration:crossfadeDuration * remaining,ease:"power1.inOut",overwrite:true});
   }
  }
 };

 heroModeButtons.forEach(button=>button.addEventListener("click",()=>setHeroMode(button.dataset.heroMode)));
}

renderCatalog();
void syncCatalogWithPanel();
window.setInterval(()=>{if(document.visibilityState==="visible")void syncCatalogWithPanel();},30000);
window.addEventListener("focus",()=>void syncCatalogWithPanel());
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void syncCatalogWithPanel();});
window.setInterval(()=>{if(document.visibilityState==="visible")void syncCatalogWithPanel();},30000);
window.addEventListener("focus",()=>void syncCatalogWithPanel());
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void syncCatalogWithPanel();});

// One-time, directional GSAP choreography for the marketing page.
window.addEventListener("load", () => {
 if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
 gsap.registerPlugin(ScrollTrigger);
 const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
 if (reduceMotion.matches) return;
 const isCompact = window.matchMedia("(max-width: 640px)").matches;
 const sideTravel = isCompact ? 42 : 88;

 // A single low-distance intro keeps the hero calm and avoids per-button motion.
 const heroIntroTargets=gsap.utils.toArray(".hero-text, .hero-mode-toggle, .hero-cards");
 if(heroIntroTargets.length){
  gsap.fromTo(heroIntroTargets,{autoAlpha:0,y:7},{autoAlpha:1,y:0,duration:.42,stagger:.045,ease:"power2.out",clearProps:"transform,opacity,visibility"});
 }

 const reveal = (targets, trigger, fromVars={}, toVars={}, scrollVars={}) => {
  const elements = gsap.utils.toArray(targets);
  if (!elements.length) return;
  gsap.fromTo(elements,
   {autoAlpha:0,...fromVars},
   {autoAlpha:1,x:0,y:0,scale:1,duration:.76,stagger:.1,ease:"power3.out",clearProps:"transform,opacity,visibility",...toVars,scrollTrigger:{trigger,start:"top 84%",once:true,...scrollVars}}
  );
 };

 // Section markers and the fourth menu destination (Sobre nós).
 gsap.utils.toArray(".section-marker").forEach(marker=>reveal(marker,marker,{x:-sideTravel*.48,y:12},{duration:.62},{start:"top 92%"}));
 const storyTitle = document.querySelector("#story-title");
 if (storyTitle) {
  const text = storyTitle.textContent.trim();
  storyTitle.innerHTML = "";
  const mask = document.createElement("span");
  mask.className = "story-title-mask";
  const line = document.createElement("span");
  line.className = "story-title-line";
  line.textContent = text;
  mask.appendChild(line);
  storyTitle.appendChild(mask);
  gsap.from(line,{yPercent:108,duration:.9,ease:"power3.out",scrollTrigger:{trigger:"#historia",start:"top 78%",once:true}});
 }
 const storyIntro = gsap.timeline({scrollTrigger:{trigger:".story-grid",start:"top 78%",once:true},defaults:{duration:.82,ease:"power3.out"}});
 storyIntro.from(".story-title-wrap",{x:-sideTravel,autoAlpha:0},0)
  .from(".story-copy",{x:sideTravel,autoAlpha:0},"<.08");
 reveal(".story-card",".story-cards",{x:index=>index===0?-sideTravel:index===2?sideTravel:0,y:index=>index===1?58:24,scale:.96},{stagger:.14,duration:.82},{start:"top 82%"});
 reveal(".manifesto-strip",".manifesto-strip",{x:-sideTravel*.6,y:16},{duration:.64},{start:"top 90%"});

 // Catalog headline and tools approach from opposite sides; cards arrive in small batches.
 const catalogHead = document.querySelector(".catalog-head");
 if (catalogHead) {
  const headTimeline = gsap.timeline({scrollTrigger:{trigger:catalogHead,start:"top 82%",once:true},defaults:{duration:.8,ease:"power3.out"}});
  headTimeline.from(catalogHead.children[0],{x:-sideTravel,autoAlpha:0},0)
   .from(catalogHead.children[1],{x:sideTravel,autoAlpha:0},"<.08");
 }
 reveal(".catalog-tools",".catalog-tools",{y:36},{duration:.62},{start:"top 88%"});
 const bikeCards = gsap.utils.toArray(".bike-card");
 if (bikeCards.length) {
  ScrollTrigger.batch(bikeCards,{start:"top 91%",interval:.12,batchMax:6,once:true,onEnter:batch=>gsap.fromTo(batch,
   {autoAlpha:0,y:58,scale:.975},
   {autoAlpha:1,y:0,scale:1,duration:.68,stagger:.075,ease:"power3.out",clearProps:"transform,opacity,visibility"}
  )});
 }

 // Services and steps travel in alternating directions, settling toward the center.
 const servicesHead = document.querySelector(".services-head");
 if (servicesHead) reveal(servicesHead,servicesHead,{y:54},{duration:.84},{start:"top 82%"});
 const serviceRows = gsap.utils.toArray(".service-list article");
 reveal(serviceRows,".service-list",{x:index=>index%2?sideTravel:-sideTravel,y:22},{stagger:.12,duration:.78},{start:"top 82%"});
 const roadbookTitle = document.querySelector(".roadbook-title");
 if (roadbookTitle) reveal(roadbookTitle,".roadbook-layout",{x:-sideTravel,y:18},{duration:.82},{start:"top 80%"});
 const roadbookSteps = gsap.utils.toArray(".steps li");
 reveal(roadbookSteps,".steps",{x:index=>index%2?sideTravel:-sideTravel,y:30},{stagger:.13,duration:.74},{start:"top 82%"});
 reveal(".demo-note",".demo-note",{y:22},{duration:.55},{start:"top 92%"});

 // One expressive CTA moment, then a grounded contact reveal.
 const finalCta = document.querySelector(".final-cta");
 if (finalCta) {
  const ctaContent = finalCta.querySelector("div:last-child");
  const ctaRings = finalCta.querySelector(".cta-rings");
  gsap.from(ctaContent,{y:90,autoAlpha:0,scale:.96,duration:1,ease:"expo.out",scrollTrigger:{trigger:finalCta,start:"top 76%",once:true}});
  if (ctaRings) gsap.from(ctaRings,{x:sideTravel,scale:.88,rotation:-18,autoAlpha:0,duration:1.25,ease:"power3.out",scrollTrigger:{trigger:finalCta,start:"top 80%",once:true}});
 }
 const contactHeading = document.querySelector(".contact-heading");
 if (contactHeading) reveal(contactHeading,contactHeading,{y:44},{},{start:"top 85%"});
 const contactItems = gsap.utils.toArray(".contact-grid > a, .contact-grid > div");
 reveal(contactItems,".contact-grid",{x:index=>index%2?sideTravel:-sideTravel,y:24},{stagger:.1,duration:.72},{start:"top 86%"});
 const footerItems = gsap.utils.toArray("footer > *");
 reveal(footerItems,"footer",{y:24},{stagger:.08,duration:.58},{start:"top 95%"});
});
