/**
 * Advanced State Management
 * Holds data globally to prevent unnecessary re-fetching
 */
const ShopState = {
    products: [],
    cart: JSON.parse(localStorage.getItem("aura_cart")) || [],
    favorites: JSON.parse(localStorage.getItem("aura_favs")) || [],
    currentView: "all", // "all" or "favorites"
    searchQuery: ""
};

/**
 * Cached DOM Elements for Performance
 */
const DOM = {
    grid: document.getElementById("product-grid"),
    cartContainer: document.getElementById("cart-items"),
    cartCount: document.querySelector(".cart-count"),
    totalPrice: document.getElementById("total-price"),
    drawer: document.getElementById("cart-drawer"),
    overlay: document.getElementById("drawer-overlay"),
    searchInput: document.getElementById("search-input"),
    toastContainer: document.getElementById("toast-container"),
    tabAll: document.getElementById("tab-all"),
    tabFavs: document.getElementById("tab-favs"),
    favCounter: document.getElementById("fav-counter")
};

/**
 * Debounce Utility for Search Input
 * Prevents calling the filter function on every single keystroke.
 */
function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * API Fetching & Normalization (Senior Logic)
 * Combines data from FakeStoreAPI and DummyJSON to create a massive catalog.
 */
async function fetchMassiveCatalog() {
    try {
        const [fakeStoreRes, dummyJsonRes] = await Promise.all([
            fetch('https://fakestoreapi.com/products'),
            fetch('https://dummyjson.com/products?limit=30')
        ]);

        if (!fakeStoreRes.ok || !dummyJsonRes.ok) throw new Error("API Fetch Failed");

        const fakeStoreData = await fakeStoreRes.json();
        const dummyJsonData = await dummyJsonRes.json();

        // 1. Map FakeStore Data
        const mappedFakeStore = fakeStoreData.map(item => ({
            id: `fs-${item.id}`,
            title: item.title,
            price: item.price,
            image: item.image,
            category: item.category
        }));

        // 2. Map DummyJSON Data to match structure
        const mappedDummyJson = dummyJsonData.products.map(item => ({
            id: `dj-${item.id}`,
            title: item.title,
            price: item.price,
            image: item.thumbnail,
            category: item.category
        }));

        // Merge both arrays
        ShopState.products = [...mappedFakeStore, ...mappedDummyJson];

        renderStore();
    } catch (error) {
        console.error("Initialization Error:", error);
        showEmptyState("Failed to load products. Please try again later.");
    }
}

/**
 * Toast Notification System
 */
function showToast(message) {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.textContent = message;

    DOM.toastContainer.append(toast);

    // Trigger reflow for CSS animation
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400); // Wait for transition to finish
    }, 2500);
}

/**
 * Creates a single Product Card (Strictly DOM API - No innerHTML)
 */
function createProductCard(product) {
    const card = document.createElement("div");
    card.classList.add("product-card");

    // --- Favorite Button ---
    const favBtn = document.createElement("button");
    favBtn.classList.add("fav-card-btn");
    favBtn.setAttribute("aria-label", "Toggle Favorite");

    const heartSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    heartSvg.setAttribute("viewBox", "0 0 24 24");
    heartSvg.setAttribute("fill", "currentColor");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z");

    heartSvg.append(path);
    favBtn.append(heartSvg);

    if (ShopState.favorites.includes(product.id)) {
        favBtn.classList.add("favorited");
    }

    favBtn.addEventListener("click", () => toggleFavorite(product.id));

    // --- Image ---
    const img = document.createElement("img");
    img.classList.add("product-img");
    img.src = product.image;
    img.alt = product.title;
    img.loading = "lazy";

    // --- Category & Title ---
    const category = document.createElement("p");
    category.classList.add("product-category");
    category.textContent = product.category;

    const title = document.createElement("h3");
    title.classList.add("product-title");
    title.textContent = product.title;

    // --- Price ---
    const price = document.createElement("p");
    price.classList.add("product-price");
    price.textContent = `$${product.price.toFixed(2)}`;

    // --- Add to Cart Button ---
    const addBtn = document.createElement("button");
    addBtn.classList.add("add-to-cart-btn");
    addBtn.textContent = "Add to Bag";
    addBtn.addEventListener("click", () => addToCart(product));

    // Using modern 'append' per your architecture requirements
    card.append(favBtn, img, category, title, price, addBtn);
    return card;
}

/**
 * Main Render Function for the Store Grid
 */
function renderStore() {
    DOM.grid.replaceChildren();

    // 1. Filter by View Tab (All vs Favorites)
    let filtered = ShopState.currentView === "favorites"
        ? ShopState.products.filter(p => ShopState.favorites.includes(p.id))
        : ShopState.products;

    // 2. Filter by Search Query
    if (ShopState.searchQuery.trim() !== "") {
        const query = ShopState.searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
    }

    // 3. Handle Empty States
    if (filtered.length === 0) {
        let msg = "No products found matching your criteria.";
        if (ShopState.currentView === "favorites" && ShopState.searchQuery === "") {
            msg = "Your favorites list is currently empty.";
        }
        showEmptyState(msg);
        updateCounters();
        return;
    }

    // 4. Render using DocumentFragment for performance
    const fragment = document.createDocumentFragment();
    filtered.forEach(product => {
        fragment.append(createProductCard(product));
    });

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

/**
 * Favorite Logic
 */
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

/**
 * Cart Rendering & UI
 */
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
    decBtn.textContent = "-";
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

    ShopState.cart.forEach(item => {
        fragment.append(createCartItemRow(item));
    });

    DOM.cartContainer.append(fragment);
    DOM.cartCount.textContent = totalItems.toString();
    DOM.totalPrice.textContent = `$${totalAmount.toFixed(2)}`;
}

/**
 * Cart Business Logic
 */
function addToCart(product) {
    const existing = ShopState.cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        ShopState.cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            quantity: 1
        });
    }
    syncCart();
    showToast("Item added to your bag 🛍️");
}

function updateCartQuantity(productId, newQty) {
    const idx = ShopState.cart.findIndex(item => item.id === productId);
    if (idx === -1) return;

    if (newQty <= 0) {
        ShopState.cart.splice(idx, 1);
    } else {
        ShopState.cart[idx].quantity = newQty;
    }
    syncCart();
}

function syncCart() {
    localStorage.setItem("aura_cart", JSON.stringify(ShopState.cart));
    renderCart();
}

/**
 * Drawer Toggles
 */
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

/**
 * Search Logic Event Handler
 */
const handleSearch = debounce((e) => {
    ShopState.searchQuery = e.target.value;
    renderStore();
}, 400); // 400ms delay for smooth typing performance

/**
 * Initialize Application & Event Listeners
 */
document.addEventListener("DOMContentLoaded", () => {
    fetchMassiveCatalog();
    renderCart();

    // Drawer Listeners
    document.getElementById("cart-trigger").addEventListener("click", toggleCartDrawer);
    DOM.cartClose.addEventListener("click", toggleCartDrawer);
    DOM.overlay.addEventListener("click", toggleCartDrawer);

    // Search Listener
    DOM.searchInput.addEventListener("input", handleSearch);

    // Tab Filtering Listeners
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