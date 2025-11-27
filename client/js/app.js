// Test de connexion API
async function testAPI() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('✅ API connectée:', data);
    } catch (error) {
        console.error('❌ Erreur de connexion API:', error);
    }
}

// Mettre à jour la fonction initApp
function initApp() {
    console.log('🚀 Initialisation de LocMaroc...');

    // Tester la connexion API
    testAPI();

    // Gestion de la recherche
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // Chargement des données
    loadInitialData();
}

// Charger les données depuis l'API
async function loadInitialData() {
    try {
        // Charger les catégories
        const categoriesResponse = await fetch('/api/categories');
        const categories = await categoriesResponse.json();
        displayCategories(categories);

        // Charger les objets
        const itemsResponse = await fetch('/api/items');
        const items = await itemsResponse.json();
        displayPopularItems(items);

    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

function displayCategories(categories) {
    const container = document.querySelector('.categories-grid');
    if (!container) return;

    container.innerHTML = categories.map(cat => `
        <div class="category-card">
            <div class="category-icon">${cat.icon}</div>
            <h3>${cat.name}</h3>
            <p>${cat.count} objets</p>
        </div>
    `).join('');
}

function displayPopularItems(items) {
    console.log('Objets chargés:', items);
    // Implémentez l'affichage des objets ici
}