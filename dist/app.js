const bikes = [
  ["Rastro N150","Naked 150","urbana",2025,150,"5 marchas",89],
  ["Vértice 160","Street 160","urbana",2024,160,"5 marchas",96],
  ["Pulso 200","Naked 200","urbana",2025,199,"6 marchas",118],
  ["Linha S250","Street 250","urbana",2024,249,"6 marchas",139],
  ["Órbita 300","Maxi Scooter","urbana",2025,292,"Automática",168],
  ["Rastro City","Scooter 160","urbana",2025,156,"Automática",104],
  ["Veloz GT 310","Sport 310","estrada",2024,312,"6 marchas",179],
  ["Apex 400","Sport 400","estrada",2025,399,"6 marchas",218],
  ["Meridiano 500","Touring 500","estrada",2024,471,"6 marchas",246],
  ["Fúria R600","SuperSport 600","estrada",2023,599,"6 marchas",319],
  ["Rastro GT 650","Gran Touring","estrada",2025,649,"6 marchas",349],
  ["Horizonte 900","Touring 900","estrada",2024,895,"6 marchas",428],
  ["Atlas 250","Trail 250","aventura",2025,249,"6 marchas",179],
  ["Serra 300","Adventure 300","aventura",2024,293,"6 marchas",198],
  ["Cume 400X","Adventure 400","aventura",2025,399,"6 marchas",229],
  ["Atlas 500","Big Trail 500","aventura",2024,471,"6 marchas",269],
  ["Expedição 700","Big Trail 700","aventura",2025,689,"6 marchas",389],
  ["Rota 900X","Big Trail 900","aventura",2024,895,"6 marchas",479],
  ["Brava 350","Classic 350","classica",2025,349,"5 marchas",189],
  ["Continental 400","Roadster 400","classica",2024,398,"6 marchas",218],
  ["Herança 500","Classic 500","classica",2023,499,"5 marchas",248],
  ["Rastro Bob 650","Bobber 650","classica",2025,649,"6 marchas",338],
  ["Café 750","Café Racer 750","classica",2024,745,"6 marchas",398],
  ["Herança 900","Classic 900","classica",2023,899,"6 marchas",459],
  ["Pulso Neo","Scooter 125","urbana",2024,125,"Automática",82],
  ["Vértice Cargo","Street 160","urbana",2025,160,"5 marchas",99],
  ["Apex RS","Sport 500","estrada",2024,498,"6 marchas",278],
  ["Meridiano LX","Touring 700","estrada",2025,689,"6 marchas",378],
  ["Serra Rally","Rally 450","aventura",2025,449,"6 marchas",298],
  ["Brava Chrome","Classic 650","classica",2024,648,"6 marchas",329]
].map(bike=>{
  const category=bike[2];
  const model=bike[1].toLowerCase();
  const image=category==="aventura"?2:category==="classica"?3:category==="estrada"?(model.includes("touring")?5:1):(model.includes("scooter")?4:0);
  return {name:bike[0],model:bike[1],category,year:bike[3],engine:bike[4],gear:bike[5],price:bike[6],image};
});

const grid = document.querySelector("#bike-grid");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const search = document.querySelector("#catalog-search");
const filters = [...document.querySelectorAll(".filter")];
const showMore = document.querySelector("#show-more");
const mobileQuery = window.matchMedia("(max-width: 640px)");
let activeFilter = "todas";
let mobileExpanded = false;

const money = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

function renderCatalog(){
  const query = normalize(search.value.trim());
  const visible = bikes.filter(bike => {
    const categoryMatch = activeFilter === "todas" || bike.category === activeFilter;
    const queryMatch = !query || normalize(`${bike.name} ${bike.model} ${bike.engine}`).includes(query);
    return categoryMatch && queryMatch;
  });
  const progressive = mobileQuery.matches && !mobileExpanded && !query && activeFilter === "todas";
  const displayed = progressive ? visible.slice(0,6) : visible;
  resultCount.textContent = visible.length;
  emptyState.hidden = visible.length !== 0;
  grid.hidden = visible.length === 0;
  showMore.hidden = !progressive || visible.length <= displayed.length;
  showMore.textContent = `Mostrar as ${visible.length-displayed.length} motos restantes`;
  grid.innerHTML = displayed.map((bike,index)=>`
    <article class="bike-card" data-image="${bike.image}">
      <div class="bike-image" role="img" aria-label="Imagem ilustrativa do arquétipo da categoria ${bike.category}; não representa o modelo ${bike.name}">
        <span class="bike-index">${String(bikes.indexOf(bike)+1).padStart(2,"0")}</span>
        <span class="bike-type">${bike.category}</span>
        <span class="image-note">Imagem de categoria</span>
      </div>
      <div class="bike-info">
        <div class="bike-title-row">
          <h3>${bike.name}</h3>
          <div class="bike-price">${money.format(bike.price)}<small>por dia · exemplo</small></div>
        </div>
        <div class="bike-specs">
          <span>Ano<b>${bike.year}</b></span>
          <span>Motor<b>${bike.engine} cc</b></span>
          <span>Câmbio<b>${bike.gear}</b></span>
        </div>
        <button class="bike-action" type="button" data-bike="${bike.name}">
          Consultar esta moto <span aria-hidden="true">↗</span>
        </button>
      </div>
    </article>`).join("");
}

filters.forEach(button => button.addEventListener("click",()=>{
  activeFilter = button.dataset.filter;
  mobileExpanded = false;
  filters.forEach(item=>{
    const selected = item === button;
    item.classList.toggle("active",selected);
    item.setAttribute("aria-pressed",String(selected));
  });
  renderCatalog();
}));
search.addEventListener("input",renderCatalog);
showMore.addEventListener("click",()=>{mobileExpanded=true;renderCatalog();});
mobileQuery.addEventListener("change",()=>{mobileExpanded=false;renderCatalog();});
document.querySelector("#clear-filters").addEventListener("click",()=>{
  activeFilter="todas";search.value="";mobileExpanded=false;
  filters.forEach((item,index)=>{item.classList.toggle("active",index===0);item.setAttribute("aria-pressed",String(index===0));});
  renderCatalog();search.focus();
});
grid.addEventListener("click",event=>{
  const trigger=event.target.closest(".bike-action");
  if(!trigger)return;
  const text=encodeURIComponent(`Olá, quero consultar a ${trigger.dataset.bike} do catálogo demonstrativo da Rastro Motos.`);
  window.open(`https://wa.me/5511999999999?text=${text}`,"_blank","noopener");
});

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

renderCatalog();
