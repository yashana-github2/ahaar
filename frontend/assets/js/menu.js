const API_BASE = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", function () {

const urlParams = new URLSearchParams(window.location.search);
const restaurantName = urlParams.get("restaurant") || "Restaurant";
document.getElementById("restaurantName").textContent = restaurantName;

let menuItems = [];
let restaurantId = null;
let cartCache = [];

window.goToCart = () => window.location.href="cart.html";

window.toggleMenuDrawer = function(){
const d=document.getElementById("menuDrawer");
d.style.display=d.style.display==="block"?"none":"block";
}

/* -------------------- FETCH MENU -------------------- */

async function fetchMenu(){

try{

const res = await fetch(`${API_BASE}/menu/${encodeURIComponent(restaurantName)}`,{credentials:"include"});
const items = await res.json();

restaurantId = items[0].restaurant_id;

menuItems = items.map(it=>({

id:it.item_id,
name:it.item_name || it.name,
price:parseFloat(it.price)||0,
type:it.is_veg?"veg":"nonveg",
category:it.category || "General",
image:it.image_url

}));

cartCache = await getCart();

generateCategories();
renderMenu();
updateCartCount();

}catch(e){

console.error(e);

}

}

/* -------------------- CART -------------------- */

async function getCart(){

const res = await fetch(`${API_BASE}/cart`,{credentials:"include"});
if(res.status!==200) return [];
return await res.json();

}

async function updateCartCount(){

const total = cartCache.reduce((s,i)=>s+(i.quantity||0),0);
document.getElementById("cartCount").textContent = total;

}

/* -------------------- CATEGORY MENU -------------------- */

function generateCategories(){

const container = document.getElementById("menuCategories");

const cats = [...new Set(menuItems.map(i=>i.category))];

container.innerHTML="";

cats.forEach(c=>{

const btn=document.createElement("button");

btn.textContent=c;

btn.onclick=()=>{

document.getElementById(`cat-${c}`).scrollIntoView({behavior:"smooth"});
toggleMenuDrawer();

};

container.appendChild(btn);

});

}

/* -------------------- RENDER MENU -------------------- */

function renderMenu(){

const container=document.getElementById("menuItems");

container.innerHTML="";

const vegOnly=document.getElementById("vegToggle").checked;

const grouped={};

menuItems.forEach(i=>{

if(vegOnly && i.type!=="veg") return;

if(!grouped[i.category]) grouped[i.category]=[];

grouped[i.category].push(i);

});

Object.keys(grouped).forEach(cat=>{

const section=document.createElement("div");
section.className="menu-category";
section.id=`cat-${cat}`;

section.innerHTML=`<h2>${cat}</h2>`;

grouped[cat].forEach(item=>{

const cartItem=cartCache.find(c=>c.item_id===item.id);

const div=document.createElement("div");
div.className="menu-item";

div.innerHTML=`

<div class="menu-left">

<div class="dot ${item.type}"></div>

<div>
<h3>${item.name}</h3>
<p>₹${item.price}</p>
</div>

</div>

<div class="menu-right">

<img src="${item.image}">

${
cartItem
?`
<div class="qty-box">

<button onclick="decreaseQty(${item.id}, this)">-</button>

<span>${cartItem.quantity}</span>

<button onclick="increaseQty(${item.id}, this)">+</button>

</div>
`
:`<button class="add-btn" onclick="addToCart(${item.id}, this)">Add</button>`
}

</div>

`;

section.appendChild(div);

});

container.appendChild(section);

});

}

/* -------------------- ADD ITEM -------------------- */

window.addToCart = async function(id, btn){

await fetch(`${API_BASE}/cart/add`,{

method:"POST",

headers:{"Content-Type":"application/json"},

credentials:"include",

body:JSON.stringify({
restaurant_id:restaurantId,
item_id:id,
quantity:1
})

});

/* update local cart */

cartCache.push({item_id:id,quantity:1});

updateCartCount();

/* replace button with qty controller */

btn.outerHTML=`

<div class="qty-box">

<button onclick="decreaseQty(${id}, this)">-</button>

<span>1</span>

<button onclick="increaseQty(${id}, this)">+</button>

</div>

`;

}

/* -------------------- INCREASE QTY -------------------- */

window.increaseQty = async function(id, btn){

const span = btn.parentElement.querySelector("span");

let qty=parseInt(span.innerText)+1;

await updateQty(id,qty);

span.innerText=qty;

const item=cartCache.find(c=>c.item_id===id);
if(item) item.quantity=qty;

updateCartCount();

}

/* -------------------- DECREASE QTY -------------------- */

window.decreaseQty = async function(id, btn){

const box = btn.parentElement;
const span = box.querySelector("span");

let qty=parseInt(span.innerText)-1;

if(qty<=0){

await fetch(`${API_BASE}/cart/remove`,{

method:"POST",

headers:{"Content-Type":"application/json"},

credentials:"include",

body:JSON.stringify({item_id:id})

});

cartCache = cartCache.filter(i=>i.item_id!==id);

box.outerHTML=`<button class="add-btn" onclick="addToCart(${id}, this)">Add</button>`;

}else{

await updateQty(id,qty);

span.innerText=qty;

const item=cartCache.find(c=>c.item_id===id);
if(item) item.quantity=qty;

}

updateCartCount();

}

/* -------------------- UPDATE CART -------------------- */

async function updateQty(id,qty){

await fetch(`${API_BASE}/cart/update`,{

method:"POST",

headers:{"Content-Type":"application/json"},

credentials:"include",

body:JSON.stringify({item_id:id,quantity:qty})

});

}

/* -------------------- VEG TOGGLE -------------------- */

document.getElementById("vegToggle").addEventListener("change",renderMenu);

/* -------------------- START -------------------- */

fetchMenu();

});