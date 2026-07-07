
const ShopState = {
    products: [],
    categories: [],
    cart: JSON.parse(localStorage.getItem("aura_cart")) || [],
    favorites: JSON.parse(localStorage.getItem("aura_favs")) || [],
    
    // Filtering Rules
    currentCategory: "all",
    currentView: "all", // 'all' or 'favorites'
    searchQuery: "",
    sortType: "default" // 'price-asc', 'price-desc', 'name-asc'
};


const DOM = {
    grid: document.getElementById("product-grid"),
    cartContainer: document.getElementById("cart-items"),
    cartCount: document.querySelector(".cart-count"),
    totalPrice: document.getElementById("total-price"),
    drawer: document.getElementById("cart-drawer"),
    overlay: document.getElementById("drawer-overlay"),
    
    cartTrigger: document.getElementById("cart-trigger"),
    cartClose: document.getElementById("cart-close"), 
    
    searchInput: document.getElementById("search-input"),
    toastContainer: document.getElementById("toast-container"),
    tabAll: document.getElementById("tab-all"),
    tabFavs: document.getElementById("tab-favs"),
    favCounter: document.getElementById("fav-counter"),
    categoryList: document.getElementById("category-list"),
    sortSelect: document.getElementById("sort-select")
};

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}


async function fetchMassiveCatalog() {
    try {
        const [fakeStoreRes, dummyJsonRes] = await Promise.all([
            fetch('https://fakestoreapi.com/products'),
            fetch('https://dummyjson.com/products?limit=30')
        ]);

        if (!fakeStoreRes.ok || !dummyJsonRes.ok) throw new Error("API Fetch Failed");

        const fakeStoreData = await fakeStoreRes.json();
        const dummyJsonData = await dummyJsonRes.json();

        const mappedFakeStore = fakeStoreData.map(item => ({
            id: `fs-${item.id}`,
            title: item.title,
            price: item.price,
            image: item.image,
            category: item.category.toLowerCase()
        }));

        const mappedDummyJson = dummyJsonData.products.map(item => ({
            id: `dj-${item.id}`,
            title: item.title,
            price: item.price,
            image: item.thumbnail,
            category: item.category.toLowerCase()
        }));

        ShopState.products = [...mappedFakeStore, ...mappedDummyJson];
        
        ShopState.categories = ["all", ...new Set(ShopState.products.map(p => p.category))];
        
        renderCategories();
        renderStore();
    } catch (error) {
        console.error("Initialization Error:", error);
        showEmptyState("Failed to load products. Please check your connection.");
    }
}

function renderCategories() {
    DOM.categoryList.replaceChildren();
    const fragment = document.createDocumentFragment();

    ShopState.categories.forEach(category => {
        const btn = document.createElement("button");
        btn.classList.add("category-btn");
        if (ShopState.currentCategory === category) btn.classList.add("active");
        
        btn.textContent = category === "all" ? "All Categories" : category;
        
        btn.addEventListener("click", () => {
            document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            ShopState.currentCategory = category;
            renderStore();
        });

        fragment.append(btn);
    });

    DOM.categoryList.append(fragment);
}


function createProductCard(product) {
    const card = document.createElement("div");
    card.classList.add("product-card");

    const favBtn = document.createElement("button");
    favBtn.classList.add("fav-card-btn");
    favBtn.setAttribute("aria-label", "Toggle Favorite");
    
    const heartSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    heartSvg.setAttribute("viewBox", "0 0 24 24");
    heartSvg.setAttribute("fill", "currentColor");
    heartSvg.style.width = "18px";
    heartSvg.style.height = "18px";
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z");
    heartSvg.append(path);
    favBtn.append(heartSvg);

    if (ShopState.favorites.includes(product.id)) {
        favBtn.classList.add("favorited");
    }

    favBtn.addEventListener("click", () => toggleFavorite(product.id));

    const img = document.createElement("img");
    img.classList.add("product-img");
    img.src = product.image;
    img.alt = product.title;
    img.loading = "lazy";

    const category = document.createElement("p");
    category.classList.add("product-category");
    category.textContent = product.category;

    const title = document.createElement("h3");
    title.classList.add("product-title");
    title.textContent = product.title;

    const price = document.createElement("p");
    price.classList.add("product-price");
    price.textContent = `$${product.price.toFixed(2)}`;

    const addBtn = document.createElement("button");
    addBtn.classList.add("add-to-cart-btn");
    addBtn.textContent = "Add to Bag";
    addBtn.addEventListener("click", () => addToCart(product));

    card.append(favBtn, img, category, title, price, addBtn);
    return card;
}


function renderStore() {
    DOM.grid.replaceChildren();

    let processed = ShopState.currentView === "favorites" 
        ? ShopState.products.filter(p => ShopState.favorites.includes(p.id))
        : ShopState.products;

    if (ShopState.currentCategory !== "all") {
        processed = processed.filter(p => p.category === ShopState.currentCategory);
    }

    if (ShopState.searchQuery.trim() !== "") {
        const query = ShopState.searchQuery.toLowerCase();
        processed = processed.filter(p => 
            p.title.toLowerCase().includes(query) || 
            p.category.toLowerCase().includes(query)
        );
    }

    if (ShopState.sortType === "price-asc") {
        processed.sort((a, b) => a.price - b.price);
    } else if (ShopState.sortType === "price-desc") {
        processed.sort((a, b) => b.price - a.price);
    } else if (ShopState.sortType === "name-asc") {
        processed.sort((a, b) => a.title.localeCompare(b.title));
    }

    if (processed.length === 0) {
        showEmptyState("No products match your current filters.");
        updateCounters();
        return;
    }

    const fragment = document.createDocumentFragment();
    processed.forEach(product => fragment.append(createProductCard(product)));
    
    DOM.grid.append(fragment);
    updateCounters();
}


function showEmptyState(message) {
    const p = document.createElement("p");
    p.classList.add("empty-state");
    p.textContent = message;
    DOM.grid.append(p);
}

function updateCounters() {
    DOM.favCounter.textContent = ShopState.favorites.length.toString();
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.textContent = message;
    DOM.toastContainer.append(toast);
    
    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400); 
    }, 2500);
}


function toggleFavorite(productId) {
    const index = ShopState.favorites.indexOf(productId);
    if (index === -1) {
        ShopState.favorites.push(productId);
        showToast("Added to Favorites ❤️");
    } else {
        ShopState.favorites.splice(index, 1);
    }
    
    localStorage.setItem("aura_favs", JSON.stringify(ShopState.favorites));
    renderStore(); 
}

function addToCart(product) {
    const existing = ShopState.cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        ShopState.cart.push({ id: product.id, title: product.title, price: product.price, quantity: 1 });
    }
    syncCart();
    showToast("Item added to your bag 🛍️");
}

function updateCartQuantity(productId, newQty) {
    const idx = ShopState.cart.findIndex(item => item.id === productId);
    if (idx === -1) return;

    if (newQty <= 0) ShopState.cart.splice(idx, 1);
    else ShopState.cart[idx].quantity = newQty;
    
    syncCart();
}

function syncCart() {
    localStorage.setItem("aura_cart", JSON.stringify(ShopState.cart));
    renderCart();
}


function createCartItemRow(item) {
    const row = document.createElement("div");
    row.classList.add("cart-item-row");

    const infoDiv = document.createElement("div");
    infoDiv.classList.add("cart-item-info");

    const title = document.createElement("p");
    title.classList.add("cart-item-title");
    title.textContent = item.title;

    const price = document.createElement("span");
    price.classList.add("cart-item-price");
    price.textContent = `$${(item.price * item.quantity).toFixed(2)}`;

    infoDiv.append(title, price);

    const controlsDiv = document.createElement("div");
    controlsDiv.classList.add("cart-item-controls");

    const decBtn = document.createElement("button");
    decBtn.textContent = "−";
    decBtn.addEventListener("click", () => updateCartQuantity(item.id, item.quantity - 1));

    const qtySpan = document.createElement("span");
    qtySpan.textContent = item.quantity;

    const incBtn = document.createElement("button");
    incBtn.textContent = "+";
    incBtn.addEventListener("click", () => updateCartQuantity(item.id, item.quantity + 1));

    controlsDiv.append(decBtn, qtySpan, incBtn);
    row.append(infoDiv, controlsDiv);

    return row;
}

function renderCart() {
    DOM.cartContainer.replaceChildren();

    if (ShopState.cart.length === 0) {
        const p = document.createElement("p");
        p.classList.add("empty-state");
        p.textContent = "Your shopping bag is empty.";
        DOM.cartContainer.append(p);
        DOM.cartCount.textContent = "0";
        DOM.totalPrice.textContent = "$0.00";
        return;
    }

    const fragment = document.createDocumentFragment();
    let totalItems = 0;
    
    const totalAmount = ShopState.cart.reduce((sum, item) => {
        totalItems += item.quantity;
        return sum + (item.price * item.quantity);
    }, 0);

    ShopState.cart.forEach(item => fragment.append(createCartItemRow(item)));

    DOM.cartContainer.append(fragment);
    DOM.cartCount.textContent = totalItems.toString();
    DOM.totalPrice.textContent = `$${totalAmount.toFixed(2)}`;
}

function toggleCartDrawer() {
    const isActive = DOM.drawer.classList.contains("active");
    if (isActive) {
        DOM.drawer.classList.remove("active");
        DOM.overlay.classList.remove("active");
        DOM.drawer.setAttribute("aria-hidden", "true");
    } else {
        DOM.drawer.classList.add("active");
        DOM.overlay.classList.add("active");
        DOM.drawer.setAttribute("aria-hidden", "false");
    }
}


const debouncedSearch = debounce((val) => {
    ShopState.searchQuery = val;
    renderStore();
}, 300);


document.addEventListener("DOMContentLoaded", () => {
    fetchMassiveCatalog();
    renderCart();

    DOM.cartTrigger.addEventListener("click", toggleCartDrawer);
    DOM.cartClose.addEventListener("click", toggleCartDrawer); 
    DOM.overlay.addEventListener("click", toggleCartDrawer);

    DOM.searchInput.addEventListener("input", (e) => {
        debouncedSearch(e.target.value);
    });

    DOM.sortSelect.addEventListener("change", (e) => {
        ShopState.sortType = e.target.value;
        renderStore();
    });

    DOM.tabAll.addEventListener("click", () => {
        if (ShopState.currentView === "all") return;
        DOM.tabFavs.classList.remove("active");
        DOM.tabAll.classList.add("active");
        ShopState.currentView = "all";
        renderStore();
    });

    DOM.tabFavs.addEventListener("click", () => {
        if (ShopState.currentView === "favorites") return;
        DOM.tabAll.classList.remove("active");
        DOM.tabFavs.classList.add("active");
        ShopState.currentView = "favorites";
        renderStore();
    });
});