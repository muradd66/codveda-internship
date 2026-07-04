// ==========================================
// 1. STATE MANAGEMENT & CONFIG
// ==========================================
const API_KEY = "14f70647643cfc65b7633986a74d806e";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";

const AppState = {
    currentPage: 1,
    currentGenreId: null,
    currentQuery: "",
    currentMode: "films",
    currentUser: JSON.parse(localStorage.getItem("movia_user")) || null,
    usersDB: JSON.parse(localStorage.getItem("movia_usersDB")) || {}
};

// DOM Elements
const elements = {
    searchBtn: document.querySelector(".search-button"),
    searchInput: document.querySelector(".search-input"),
    grid: document.getElementById("main-grid"),
    selectGenre: document.querySelector(".select-genre"),
    optionsList: document.querySelector(".options-list"),
    genreValue: document.querySelector(".genreValue"),
    prevBtn: document.querySelector(".prevBtn"),
    nextBtn: document.querySelector(".nextBtn"),
    pageNumber: document.querySelector(".pageNumber"),
    paginationContainer: document.querySelector(".pagination-container"),
    homePage: document.getElementById("home-page"),
    detailPage: document.getElementById("detail-page"),
    sectionTitle: document.getElementById("section-title"),
    searchBarContainer: document.getElementById("search-bar-container"),
    authTrigger: document.getElementById("auth-trigger"),
    authModal: document.getElementById("auth-modal"),
    closeModal: document.querySelector(".close-modal"),
    authForm: document.getElementById("auth-form"),
    navLinks: document.querySelectorAll(".links a")
};

// ==========================================
// 2. AUTHENTICATION MODULE
// ==========================================
let isLoginMode = true;

function updateAuthUI() {
    elements.authTrigger.replaceChildren(); // Modern clearing

    if (AppState.currentUser) {
        const userProfile = document.createElement("div");
        userProfile.classList.add("user-profile");
        
        const greeting = document.createElement("span");
        greeting.textContent = `👋 Hi, ${AppState.currentUser.username}`;
        
        const logoutBtn = document.createElement("button");
        logoutBtn.classList.add("logout-btn");
        logoutBtn.textContent = "Log Out";
        logoutBtn.addEventListener("click", () => {
            AppState.currentUser = null;
            localStorage.removeItem("movia_user");
            updateAuthUI();
            if(AppState.currentMode === "favorites") loadRoute("films");
        });

        userProfile.append(greeting, logoutBtn);
        elements.authTrigger.append(userProfile);
    } else {
        const loginSpan = document.createElement("span");
        loginSpan.classList.add("person-add");
        loginSpan.textContent = "Log In ";
        
        const loginIcon = document.createElement("i");
        loginIcon.className = "bi bi-person-add";
        
        loginSpan.append(loginIcon);
        loginSpan.addEventListener("click", () => {
            elements.authModal.classList.remove("hidden");
        });
        
        elements.authTrigger.append(loginSpan);
    }
}

document.getElementById("switch-auth-mode").addEventListener("click", (e) => {
    isLoginMode = !isLoginMode;
    document.getElementById("modal-title").textContent = isLoginMode ? "Welcome to Movia" : "Create Account";
    document.getElementById("auth-submit").textContent = isLoginMode ? "Log In" : "Sign Up";
    e.target.textContent = isLoginMode ? "Sign Up" : "Log In";
    e.target.parentElement.childNodes[0].nodeValue = isLoginMode ? "Don't have an account? " : "Already have an account? ";
});

elements.closeModal.addEventListener("click", () => elements.authModal.classList.add("hidden"));

elements.authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();

    if (isLoginMode) {
        if (AppState.usersDB[user] && AppState.usersDB[user].password === pass) {
            AppState.currentUser = { username: user, favorites: AppState.usersDB[user].favorites };
            localStorage.setItem("movia_user", JSON.stringify(AppState.currentUser));
            elements.authModal.classList.add("hidden");
            updateAuthUI();
        } else {
            alert("Səhv istifadəçi adı və ya şifrə!");
        }
    } else {
        if (AppState.usersDB[user]) {
            alert("Bu istifadəçi artıq mövcuddur!");
        } else {
            AppState.usersDB[user] = { password: pass, favorites: [] };
            localStorage.setItem("movia_usersDB", JSON.stringify(AppState.usersDB));
            alert("Qeydiyyat uğurlu oldu! İndi giriş edə bilərsiniz.");
            document.getElementById("switch-auth-mode").click();
        }
    }
});

function toggleFavorite(media) {
    if (!AppState.currentUser) {
        alert("Favoritlərə əlavə etmək üçün hesabınıza daxil olun!");
        elements.authModal.classList.remove("hidden");
        return;
    }

    const userDB = AppState.usersDB[AppState.currentUser.username];
    const existsIndex = userDB.favorites.findIndex(fav => fav.id === media.id);

    if (existsIndex > -1) {
        userDB.favorites.splice(existsIndex, 1);
    } else {
        userDB.favorites.push(media);
    }

    AppState.currentUser.favorites = userDB.favorites;
    localStorage.setItem("movia_usersDB", JSON.stringify(AppState.usersDB));
    localStorage.setItem("movia_user", JSON.stringify(AppState.currentUser));

    if(AppState.currentMode === "favorites") loadFavorites();
}

// ==========================================
// 3. CORE API FUNCTIONS
// ==========================================
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error("API Xətası");
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Tam proqrammatik, modern DOM manipulyasiyası (innerHTML olmadan)
function renderMediaCards(mediaList) {
    elements.grid.replaceChildren(); 

    if (!mediaList || mediaList.length === 0) {
        const noResTitle = document.createElement("h2");
        noResTitle.classList.add("no-results-title");
        noResTitle.textContent = "No results found!";
        elements.grid.append(noResTitle);
        return;
    }

    const fragment = document.createDocumentFragment();

    mediaList.forEach(item => {
        const title = item.original_title || item.name; 
        const isFav = AppState.currentUser?.favorites.some(fav => fav.id === item.id);

        const card = document.createElement("div");
        card.classList.add("card");

        const img = document.createElement("img");
        img.classList.add("film-img");
        img.src = item.poster_path ? IMG_URL + item.poster_path : './images_and_logos/play.png';
        img.alt = title;

        const titleEl = document.createElement("h2");
        titleEl.classList.add("filmname");
        titleEl.textContent = title;

        const infoDiv = document.createElement("div");
        infoDiv.classList.add("film_info");
        
        const starImg = document.createElement("img");
        starImg.src = "images_and_logos/star.png";
        starImg.classList.add("star");
        starImg.alt = "star";

        const ratingEl = document.createElement("p");
        ratingEl.classList.add("rating");
        ratingEl.textContent = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        
        infoDiv.append(starImg, ratingEl);

        const btnContainer = document.createElement("div");
        btnContainer.classList.add("btnContainer");

        const moreBtn = document.createElement("button");
        moreBtn.classList.add("moreBtn");
        moreBtn.textContent = "More";
        moreBtn.addEventListener("click", () => loadDetails(item.id, item.name ? 'tv' : 'movie'));

        const favIcon = document.createElement("i");
        favIcon.className = `bi ${isFav ? 'bi-heart-fill' : 'bi-heart'} fav-icon`;
        favIcon.style.cursor = "pointer";
        favIcon.style.color = "#ef4444";
        favIcon.style.fontSize = "18px";
        favIcon.addEventListener("click", function() {
            toggleFavorite(item);
            this.classList.toggle("bi-heart");
            this.classList.toggle("bi-heart-fill");
        });

        btnContainer.append(moreBtn, favIcon);
        card.append(img, titleEl, infoDiv, btnContainer);
        fragment.append(card); 
    });

    elements.grid.append(fragment);
}

// ==========================================
// 4. ROUTING & SECTION LOGIC
// ==========================================
async function loadRoute(mode, page = 1) {
    AppState.currentMode = mode;
    AppState.currentPage = page;
    elements.pageNumber.textContent = `Page: ${page}`;
    elements.prevBtn.disabled = page === 1;

    elements.homePage.classList.remove("hidden");
    elements.detailPage.classList.add("hidden");
    elements.paginationContainer.style.display = "flex";

    let data;

    switch (mode) {
        case "films":
            elements.sectionTitle.textContent = "Discover Movies";
            elements.searchBarContainer.style.display = "flex";
            if (AppState.currentQuery) {
                data = await fetchData(`/search/movie?api_key=${API_KEY}&query=${AppState.currentQuery}&page=${page}`);
            } else if (AppState.currentGenreId) {
                data = await fetchData(`/discover/movie?api_key=${API_KEY}&with_genres=${AppState.currentGenreId}&page=${page}`);
            } else {
                data = await fetchData(`/movie/popular?api_key=${API_KEY}&page=${page}`);
            }
            if(data) renderMediaCards(data.results);
            break;
        case "series":
            elements.sectionTitle.textContent = "Popular TV Series";
            elements.searchBarContainer.style.display = "none";
            data = await fetchData(`/discover/tv?api_key=${API_KEY}&page=${page}`);
            if(data) renderMediaCards(data.results);
            break;
        case "trending":
            elements.sectionTitle.textContent = "Trending This Week";
            elements.searchBarContainer.style.display = "none";
            data = await fetchData(`/trending/all/week?api_key=${API_KEY}&page=${page}`);
            if(data) renderMediaCards(data.results);
            break;
        case "favorites":
            elements.sectionTitle.textContent = "Your Favorites";
            elements.searchBarContainer.style.display = "none";
            elements.paginationContainer.style.display = "none";
            loadFavorites();
            break;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadFavorites() {
    if (!AppState.currentUser) {
        elements.grid.replaceChildren();
        const noResTitle = document.createElement("h2");
        noResTitle.classList.add("no-results-title");
        noResTitle.textContent = "Log in to view your favorites!";
        elements.grid.append(noResTitle);
        return;
    }
    renderMediaCards(AppState.currentUser.favorites);
}

elements.navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        elements.navLinks.forEach(l => l.classList.remove("active"));
        e.target.classList.add("active");
        
        const page = e.target.getAttribute("data-page");
        AppState.currentQuery = ""; 
        AppState.currentGenreId = null;
        elements.searchInput.value = "";
        elements.genreValue.textContent = "Find your mood...";
        
        loadRoute(page, 1);
    });
});

// ==========================================
// 5. SEARCH & GENRES
// ==========================================
elements.searchBtn.addEventListener("click", () => {
    if (elements.searchInput.value.trim() !== "") {
        AppState.currentQuery = elements.searchInput.value.trim();
        AppState.currentGenreId = null;
        loadRoute("films", 1);
    }
});

elements.selectGenre.addEventListener("click", () => elements.optionsList.classList.toggle("show"));

async function loadGenres() {
    const data = await fetchData(`/genre/movie/list?api_key=${API_KEY}`);
    if (data) {
        elements.optionsList.replaceChildren();
        data.genres.forEach(genre => {
            let div = document.createElement("div");
            div.textContent = genre.name;
            div.addEventListener("click", () => {
                elements.searchInput.value = "";
                AppState.currentQuery = "";
                AppState.currentGenreId = genre.id;
                elements.genreValue.textContent = genre.name;
                elements.optionsList.classList.remove("show");
                loadRoute("films", 1);
            });
            elements.optionsList.append(div);
        });
    }
}

// ==========================================
// 6. PAGINATION & DETAILS (Tamamilə xətasız və modern)
// ==========================================
elements.prevBtn.addEventListener("click", () => {
    if (AppState.currentPage > 1) loadRoute(AppState.currentMode, AppState.currentPage - 1);
});

elements.nextBtn.addEventListener("click", () => {
    loadRoute(AppState.currentMode, AppState.currentPage + 1);
});

async function loadDetails(id, type = 'movie') {
    elements.homePage.classList.add("hidden");
    elements.detailPage.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    elements.detailPage.replaceChildren();
    
    const loadingTitle = document.createElement("h2");
    loadingTitle.classList.add("section-title");
    loadingTitle.textContent = "Yüklənir...";
    elements.detailPage.append(loadingTitle);

    try {
        const data = await fetchData(`/${type}/${id}?api_key=${API_KEY}&append_to_response=videos,credits`);
        elements.detailPage.replaceChildren(); 
        
        if (!data) {
            const errorMsg = document.createElement("h2");
            errorMsg.style.color = "red";
            errorMsg.style.textAlign = "center";
            errorMsg.textContent = "Xəta baş verdi. Məlumat tapılmadı.";
            elements.detailPage.append(errorMsg);
            return;
        }

        const backBtn = document.createElement("button");
        backBtn.classList.add("back-btn");
        const backIcon = document.createElement("i");
        backIcon.className = "bi bi-arrow-left";
        backBtn.append(backIcon, " Back");
        backBtn.addEventListener("click", () => {
            elements.detailPage.classList.add("hidden");
            elements.homePage.classList.remove("hidden");
        });

        const fullDetailContainer = document.createElement("div");
        fullDetailContainer.classList.add("full-detail-container");

        // Sol hissə (Şəkil və ya Treyler)
        const leftSide = document.createElement("div");
        leftSide.classList.add("detail-left-side");

        const trailer = data.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
        
        if (trailer) {
            const iframe = document.createElement("iframe");
            iframe.classList.add("detail-trailer-video");
            iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1`;
            iframe.allowFullscreen = true;
            leftSide.append(iframe);
        } else {
            const posterImg = document.createElement("img");
            posterImg.classList.add("detail-poster");
            posterImg.src = data.poster_path ? IMG_URL + data.poster_path : './images_and_logos/play.png';
            leftSide.append(posterImg);
        }

        const topCastTitle = document.createElement("h3");
        topCastTitle.textContent = "Top Cast";

        const castContainer = document.createElement("div");
        castContainer.classList.add("cast-container");

        const castList = data.credits?.cast || [];
        if (castList.length > 0) {
            castList.slice(0, 6).forEach(actor => {
                const actorCard = document.createElement("div");
                actorCard.classList.add("actor-card");
                
                const actorImg = document.createElement("img");
                actorImg.src = actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : './images_and_logos/play.png';
                
                const actorName = document.createElement("p");
                actorName.classList.add("actor-name");
                actorName.textContent = actor.name;
                
                actorCard.append(actorImg, actorName);
                castContainer.append(actorCard);
            });
        } else {
            const noCast = document.createElement("p");
            noCast.style.color = "#94a3b8";
            noCast.textContent = "Aktyor məlumatı tapılmadı.";
            castContainer.append(noCast);
        }

        leftSide.append(topCastTitle, castContainer);

        // Sağ hissə (Məlumatlar)
        const detailInfo = document.createElement("div");
        detailInfo.classList.add("detail-info");

        const titleEl = document.createElement("h2");
        titleEl.textContent = data.title || data.name;

        const historyEl = document.createElement("p");
        historyEl.classList.add("filmHistory");
        const release = data.release_date || data.first_air_date || 'N/A';
        const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        historyEl.textContent = `${release} • ⭐ ${rating}`;

        const overviewTitle = document.createElement("h3");
        overviewTitle.textContent = "Overview";

        const overviewEl = document.createElement("p");
        overviewEl.classList.add("detail-overview");
        overviewEl.textContent = data.overview || "Bu film üçün açıqlama mövcud deyil.";

        detailInfo.append(titleEl, historyEl, overviewTitle, overviewEl);
        
        fullDetailContainer.append(leftSide, detailInfo);
        elements.detailPage.append(backBtn, fullDetailContainer);

    } catch (error) {
        console.error("Detalları yükləyərkən xəta:", error);
        elements.detailPage.replaceChildren();

        const backBtn = document.createElement("button");
        backBtn.classList.add("back-btn");
        backBtn.textContent = "Geri Qayıt";
        backBtn.addEventListener("click", () => {
            elements.detailPage.classList.add("hidden");
            elements.homePage.classList.remove("hidden");
        });

        const errorMsg = document.createElement("h2");
        errorMsg.style.color = "#ef4444";
        errorMsg.style.textAlign = "center";
        errorMsg.style.marginTop = "50px";
        errorMsg.textContent = "Gözlənilməz xəta baş verdi. Yenidən yoxlayın.";

        elements.detailPage.append(backBtn, errorMsg);
    }
}

// ==========================================
// 7. INITIALIZATION
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    loadGenres();
    loadRoute("films", 1); 
});