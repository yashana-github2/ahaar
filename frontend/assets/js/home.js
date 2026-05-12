console.log("Home JS Loaded Successfully ✅");

document.addEventListener("DOMContentLoaded", () => {

const userGreeting = document.getElementById("userGreeting");
const storedName = localStorage.getItem("aahaarUserName");

if (storedName && userGreeting) {
    userGreeting.textContent = `Hello, ${storedName}!`;
}

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const vegToggle = document.getElementById("vegToggle");

const restaurantList = document.getElementById("restaurantList");
const categoryCards = document.querySelectorAll(".category-card");

let activeCategory = null;

const restaurants = [
    {name:"Pasta Heaven", cuisine:"Italian", rating:"4.2", img:"assets/imgs/restaurants/pasta.jpg", isVeg:true},
    {name:"Burger Hub", cuisine:"Fast Food, Burgers", rating:"4.3", img:"assets/imgs/restaurants/burger.jpg", badge:"Fast Delivery", isVeg:false},
    {name:"Sushi World", cuisine:"Japanese", rating:"4.6", img:"assets/imgs/restaurants/sushi.jpg", isVeg:false},
    {name:"Taco Town", cuisine:"Mexican", rating:"4.1", img:"assets/imgs/restaurants/taco.jpg", isVeg:false},
    {name:"Amma Kadai", cuisine:"South Indian", rating:"4.4", img:"assets/imgs/restaurants/idli.jpg", isVeg:true},
    {name:"Veggie Delight", cuisine:"Vegetarian", rating:"4.0", img:"assets/imgs/restaurants/salad.jpg", isVeg:true},
    {name:"Steak House", cuisine:"American", rating:"4.7", img:"assets/imgs/restaurants/Steak.jpg", isVeg:false},
    {name:"Noodle Nook", cuisine:"Chinese", rating:"4.2", img:"assets/imgs/restaurants/noodles.jpg", isVeg:false},
    {name:"Pizza Planet", cuisine:"Pizza, Italian", rating:"4.5", img:"assets/imgs/restaurants/pizza.jpg", isVeg:false},
    {name:"Biryani Bowl", cuisine:"Biryani, Mughlai", rating:"4.6", img:"assets/imgs/restaurants/biryani.jpg", isVeg:false},
    {name:"Seafood Shack", cuisine:"Seafood", rating:"4.3", img:"assets/imgs/restaurants/crab.jpg", isVeg:false},
    {name:"Cafe Mocha", cuisine:"Cafe", rating:"4.1", img:"assets/imgs/restaurants/cafe.jpg", isVeg:true},
    {name:"Dessert Dreams", cuisine:"Desserts", rating:"4.8", img:"assets/imgs/restaurants/brownie.jpg", isVeg:true},
];

function renderRestaurants(list) {

    restaurantList.innerHTML = "";

    list.forEach(r => {

        const card = document.createElement("div");
        card.classList.add("restaurant-card");

        card.addEventListener("click", () => {
            window.location.href = `menu.html?restaurant=${encodeURIComponent(r.name)}`;
        });

        card.innerHTML = `
            ${r.badge ? `<div class="badge">${r.badge}</div>` : ""}
            ${r.isVeg ? `<div class="badge" style="background:#2ecc71;top:14px;right:14px;left:auto;">Pure Veg</div>` : ""}
            <img src="${r.img}" alt="${r.name}">
            <div class="restaurant-info">
                <h3>${r.name}</h3>
                <p>${r.cuisine}</p>
                <span class="rating">${r.rating} ⭐</span>
            </div>
        `;

        restaurantList.appendChild(card);
    });

}

function applyFilters() {

    const query = searchInput.value.toLowerCase().trim();
    const vegOnly = vegToggle.checked;

    const filtered = restaurants.filter(r => {

        const matchSearch =
            r.name.toLowerCase().includes(query) ||
            r.cuisine.toLowerCase().includes(query);

        const matchCategory =
            !activeCategory ||
            r.cuisine.toLowerCase().includes(activeCategory);

        const matchVeg =
            !vegOnly || r.isVeg;

        return matchSearch && matchCategory && matchVeg;

    });

    renderRestaurants(filtered);

}

renderRestaurants(restaurants);

searchBtn.addEventListener("click", applyFilters);

searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") applyFilters();
});

searchInput.addEventListener("input", applyFilters);

vegToggle.addEventListener("change", applyFilters);

categoryCards.forEach(card => {

    card.addEventListener("click", () => {

        activeCategory = card
            .querySelector("span")
            .textContent
            .toLowerCase();

        applyFilters();

    });

});


});
