class HomeManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.currentFilters = {
            category: 'all',
            maxPrice: 'all',
            sort: 'newest',
            search: '',
            location: ''
        };
        this.allItems = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCategories();
        this.loadItems();
        this.updateNavigation();
    }

    setupEventListeners() {
        // Recherche
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const locationInput = document.getElementById('locationInput');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        if (locationInput) {
            locationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        // Filtres
        const categoryFilter = document.getElementById('categoryFilter');
        const priceFilter = document.getElementById('priceFilter');
        const sortFilter = document.getElementById('sortFilter');
        const resetFilters = document.getElementById('resetFilters');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }

        if (priceFilter) {
            priceFilter.addEventListener('change', (e) => {
                this.currentFilters.maxPrice = e.target.value;
                this.applyFilters();
            });
        }

        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.currentFilters.sort = e.target.value;
                this.applyFilters();
            });
        }

        if (resetFilters) {
            resetFilters.addEventListener('click', () => this.resetFilters());
        }

        // Pagination
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');
        const showAllItems = document.getElementById('showAllItems');

        if (prevPage) {
            prevPage.addEventListener('click', () => this.changePage(-1));
        }

        if (nextPage) {
            nextPage.addEventListener('click', () => this.changePage(1));
        }

        if (showAllItems) {
            showAllItems.addEventListener('click', () => this.resetFilters());
        }

        // View options
        const viewOptions = document.querySelectorAll('.view-option');
        viewOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                this.changeView(e.target.dataset.view);
            });
        });
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            const categories = await response.json();

            this.displayCategories(categories);
            this.displayCategoryFilters(categories);
        } catch (error) {
            console.error('Erreur chargement catégories:', error);
        }
    }

    displayCategories(categories) {
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;

        categoriesGrid.innerHTML = categories.map(category => `
            <div class="category-card" data-category="${category.id}">
                <div class="category-icon">${category.icon}</div>
                <h3>${category.name}</h3>
                <p>${category.count} objets</p>
                <p class="category-description">${category.description}</p>
            </div>
        `).join('');

        // Ajouter les event listeners pour les cartes de catégorie
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.filterByCategory(category);
            });
        });
    }

    displayCategoryFilters(categories) {
        const filtersGrid = document.getElementById('categoriesFilters');
        if (!filtersGrid) return;

        filtersGrid.innerHTML = categories.map(category => `
            <button class="filter-chip" data-category="${category.id}">
                ${category.icon} ${category.name}
            </button>
        `).join('');

        // Ajouter les event listeners pour les filtres rapides
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const category = chip.dataset.category;
                this.filterByCategory(category);
            });
        });
    }

    filterByCategory(category) {
        this.currentFilters.category = category;

        // Mettre à jour le select
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = category;
        }

        this.applyFilters();

        // Scroll vers la section des objets
        document.querySelector('.featured-items').scrollIntoView({
            behavior: 'smooth'
        });
    }

    async loadItems() {
        const loadingState = document.getElementById('loadingState');
        const itemsContainer = document.getElementById('itemsContainer');
        const emptyState = document.getElementById('emptyState');

        if (loadingState) loadingState.style.display = 'block';
        if (itemsContainer) itemsContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.currentFilters
            });

            // Nettoyer les paramètres vides
            if (this.currentFilters.category === 'all') delete this.currentFilters.category;
            if (this.currentFilters.maxPrice === 'all') delete this.currentFilters.maxPrice;

            const response = await fetch(`/api/items?${params}`);
            const data = await response.json();

            if (response.ok) {
                this.displayItems(data.items);
                this.updatePagination(data.pagination);
                this.allItems = data.items;
            } else {
                throw new Error(data.message || 'Erreur lors du chargement des objets');
            }
        } catch (error) {
            console.error('Erreur chargement items:', error);
            this.showNotification('Erreur lors du chargement des objets', 'error');
        } finally {
            if (loadingState) loadingState.style.display = 'none';
            if (itemsContainer) itemsContainer.style.display = 'block';
        }
    }

    displayItems(items) {
        const itemsGrid = document.getElementById('itemsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!itemsGrid || !emptyState) return;

        if (items.length === 0) {
            itemsGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        itemsGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        itemsGrid.innerHTML = items.map(item => `
            <div class="item-card" data-id="${item._id}">
                <div class="item-image">
                    ${item.images && item.images.length > 0 ?
                `<img src="${item.images[0].url}" alt="${item.title}" loading="lazy">` :
                '<div class="no-image">📷</div>'
            }
                    <div class="item-badge">${this.getConditionLabel(item.condition)}</div>
                </div>
                <div class="item-content">
                    <h3 class="item-title">${item.title}</h3>
                    <p class="item-description">${this.truncateText(item.description, 100)}</p>
                    
                    <div class="item-location">
                        <span class="location-icon">📍</span>
                        ${item.location?.city || 'Non spécifié'}
                    </div>
                    
                    <div class="item-owner">
                        <span class="owner-avatar">
                            ${item.owner?.firstName?.charAt(0) || 'U'}
                        </span>
                        <span class="owner-name">
                            ${item.owner?.firstName || 'Utilisateur'} 
                            ${item.owner?.lastName || ''}
                        </span>
                        <span class="trust-score ${this.getTrustScoreClass(item.owner?.trustScore)}">
                            ${item.owner?.trustScore || 50}%
                        </span>
                    </div>

                    <div class="item-details">
                        <div class="item-price">
                            <span class="price-amount">${item.pricePerDay} MAD</span>
                            <span class="price-period">/jour</span>
                        </div>
                        <div class="item-meta">
                            <span class="views">👁️ ${item.views || 0}</span>
                            <span class="rentals">🔄 ${item.rentalCount || 0}</span>
                        </div>
                    </div>

                    <div class="item-actions">
                        <button class="btn-primary btn-sm" onclick="homeManager.viewItem('${item._id}')">
    Voir détails
</button>
                        <button class="btn-secondary btn-sm" onclick="homeManager.contactOwner('${item._id}')">
                            Contacter
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    getConditionLabel(condition) {
        const labels = {
            'neuf': 'Neuf',
            'tres-bon-etat': 'Très bon état',
            'bon-etat': 'Bon état',
            'etat-correct': 'État correct'
        };
        return labels[condition] || condition;
    }

    getTrustScoreClass(score) {
        if (score >= 80) return 'trust-high';
        if (score >= 60) return 'trust-medium';
        return 'trust-low';
    }

    updatePagination(pagination) {
        const paginationEl = document.getElementById('pagination');
        const pageInfo = document.getElementById('pageInfo');
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');

        if (!paginationEl || !pagination) return;

        if (pagination.pages > 1) {
            paginationEl.style.display = 'flex';
            pageInfo.textContent = `Page ${pagination.current} sur ${pagination.pages}`;

            prevPage.disabled = pagination.current === 1;
            nextPage.disabled = pagination.current === pagination.pages;
        } else {
            paginationEl.style.display = 'none';
        }
    }

    changePage(direction) {
        this.currentPage += direction;
        this.loadItems();

        // Scroll vers le haut de la section
        document.querySelector('.featured-items').scrollIntoView({
            behavior: 'smooth'
        });
    }

    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const locationInput = document.getElementById('locationInput');

        this.currentFilters.search = searchInput?.value.trim() || '';
        this.currentFilters.location = locationInput?.value.trim() || '';
        this.currentPage = 1;

        this.applyFilters();
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadItems();
    }

    resetFilters() {
        this.currentFilters = {
            category: 'all',
            maxPrice: 'all',
            sort: 'newest',
            search: '',
            location: ''
        };

        // Réinitialiser les inputs
        const searchInput = document.getElementById('searchInput');
        const locationInput = document.getElementById('locationInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const priceFilter = document.getElementById('priceFilter');
        const sortFilter = document.getElementById('sortFilter');

        if (searchInput) searchInput.value = '';
        if (locationInput) locationInput.value = '';
        if (categoryFilter) categoryFilter.value = 'all';
        if (priceFilter) priceFilter.value = 'all';
        if (sortFilter) sortFilter.value = 'newest';

        this.currentPage = 1;
        this.loadItems();
    }

    changeView(view) {
        const itemsGrid = document.getElementById('itemsGrid');
        const viewOptions = document.querySelectorAll('.view-option');

        // Mettre à jour les boutons de vue
        viewOptions.forEach(option => {
            option.classList.toggle('active', option.dataset.view === view);
        });

        // Changer la classe de la grille
        if (itemsGrid) {
            itemsGrid.className = view === 'list' ? 'items-list' : 'items-grid';
        }
    }

    viewItem(itemId) {
        // Rediriger vers la page de détails de l'objet
        window.location.href = `/item-details.html?id=${itemId}`;
    }

    contactOwner(itemId) {
        const authManager = window.authManager;
        if (!authManager || !authManager.isLoggedIn()) {
            this.showNotification('Veuillez vous connecter pour contacter le propriétaire', 'info');
            window.location.href = '/login';
            return;
        }

        // TODO: Implémenter le système de messagerie
        this.showNotification('Fonctionnalité de contact bientôt disponible!', 'info');
    }

    updateNavigation() {
        const authNav = document.getElementById('authNav');
        const navMenu = document.querySelector('.nav-menu');

        if (!authNav || !navMenu) return;

        const authManager = window.authManager;
        const user = authManager ? authManager.getCurrentUser() : null;

        if (user) {
            authNav.innerHTML = `
                <a href="/dashboard" class="nav-link">Tableau de bord</a>
                <a href="/my-items" class="nav-link">Mes objets</a>
                <a href="#" class="nav-link" id="logoutBtn">Déconnexion</a>
                <a href="/profile" class="nav-user">
                    <div class="user-avatar">${user.firstName?.charAt(0) || 'U'}</div>
                </a>
            `;

            document.getElementById('logoutBtn').addEventListener('click', (e) => {
                e.preventDefault();
                authManager.logout();
            });
        } else {
            authNav.innerHTML = `
                <a href="/login" class="nav-link">Connexion</a>
                <a href="/register" class="nav-btn">S'inscrire</a>
            `;
        }
    }

    showNotification(message, type = 'info') {
        if (window.authManager && window.authManager.showNotification) {
            window.authManager.showNotification(message, type);
        } else {
            // Fallback basique
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                color: white;
                background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
                z-index: 10000;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => notification.remove(), 3000);
        }
    }
    // Méthodes pour le modal de détails
    viewItem(itemId) {
        console.log('👁️ Affichage des détails pour:', itemId);
        this.showItemDetails(itemId);
    }

    async showItemDetails(itemId) {
        try {
            console.log('🔍 Chargement des détails de l\'objet:', itemId);

            const response = await fetch(`/api/items/${itemId}`);

            if (!response.ok) {
                throw new Error('Objet non trouvé');
            }

            const item = await response.json();
            console.log('✅ Détails de l\'objet chargés:', item);

            this.populateItemModal(item);
            this.showModal();

        } catch (error) {
            console.error('❌ Erreur chargement détails:', error);
            this.showNotification('Erreur lors du chargement des détails', 'error');
        }
    }

    populateItemModal(item) {
        // Images
        const mainImage = document.getElementById('modalMainImage');
        const thumbnailsContainer = document.getElementById('modalImageThumbnails');

        if (item.images && item.images.length > 0) {
            mainImage.src = item.images[0].url;
            mainImage.alt = item.title;

            thumbnailsContainer.innerHTML = item.images.map((image, index) => `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" 
                 onclick="homeManager.changeMainImage('${image.url}', this)">
                <img src="${image.url}" alt="${item.title}">
            </div>
        `).join('');
        } else {
            mainImage.src = '';
            mainImage.alt = 'Aucune image';
            mainImage.style.background = 'var(--background-light)';
            mainImage.style.display = 'flex';
            mainImage.style.alignItems = 'center';
            mainImage.style.justifyContent = 'center';
            mainImage.innerHTML = '📷';

            thumbnailsContainer.innerHTML = '';
        }

        // Informations de base
        document.getElementById('modalItemTitle').textContent = item.title;
        document.getElementById('modalItemCondition').textContent = this.getConditionLabel(item.condition);
        document.getElementById('modalItemLocation').textContent = item.location?.city || 'Non spécifié';
        document.getElementById('modalItemPrice').textContent = item.pricePerDay;
        document.getElementById('modalItemDeposit').textContent = item.deposit;
        document.getElementById('modalItemDescription').textContent = item.description;

        // Caractéristiques
        const featuresList = document.getElementById('modalFeaturesList');
        if (item.features && item.features.length > 0) {
            featuresList.innerHTML = item.features.map(feature => `
            <div class="feature-tag-modal">${feature}</div>
        `).join('');
        } else {
            featuresList.innerHTML = '<p class="no-features">Aucune caractéristique spécifiée</p>';
        }

        // Spécifications
        const specifications = document.getElementById('modalSpecifications');
        const specs = [];

        if (item.specifications?.brand) {
            specs.push({ label: 'Marque', value: item.specifications.brand });
        }
        if (item.specifications?.model) {
            specs.push({ label: 'Modèle', value: item.specifications.model });
        }
        if (item.specifications?.dimensions) {
            specs.push({ label: 'Dimensions', value: item.specifications.dimensions });
        }
        if (item.specifications?.weight) {
            specs.push({ label: 'Poids', value: `${item.specifications.weight} kg` });
        }
        if (item.specifications?.material) {
            specs.push({ label: 'Matériau', value: item.specifications.material });
        }

        if (specs.length > 0) {
            specifications.innerHTML = specs.map(spec => `
            <div class="spec-item">
                <span class="spec-label">${spec.label}</span>
                <span class="spec-value">${spec.value}</span>
            </div>
        `).join('');
        } else {
            specifications.innerHTML = '<p class="no-specs">Aucune spécification</p>';
        }

        // Informations du propriétaire
        if (item.owner) {
            document.getElementById('modalOwnerAvatar').textContent = item.owner.firstName?.charAt(0) || 'U';
            document.getElementById('modalOwnerName').textContent =
                `${item.owner.firstName || ''} ${item.owner.lastName || ''}`.trim() || 'Utilisateur';
            document.getElementById('modalOwnerTrustScore').textContent = `${item.owner.trustScore || 50}%`;

            // Classe pour le score de confiance
            const trustScoreEl = document.getElementById('modalOwnerTrustScore');
            trustScoreEl.className = 'trust-score ' + this.getTrustScoreClass(item.owner.trustScore);

            // Date d'inscription
            if (item.owner.createdAt) {
                const joinDate = new Date(item.owner.createdAt).toLocaleDateString('fr-FR');
                document.getElementById('modalMemberSince').textContent = `Membre depuis ${joinDate}`;
            }
        }

        // Configurer les dates min
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('modalStartDate').min = today;
        document.getElementById('modalEndDate').min = today;

        // Réinitialiser les dates et le résumé
        document.getElementById('modalStartDate').value = '';
        document.getElementById('modalEndDate').value = '';
        document.getElementById('modalBookingSummary').style.display = 'none';
        document.getElementById('modalRequestBookingBtn').disabled = true;

        // Stocker l'ID de l'objet pour la réservation
        this.currentItemId = item._id;
        this.currentItemPrice = item.pricePerDay;

        // Ajouter les event listeners pour les dates
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Changement de dates
        const startDateInput = document.getElementById('modalStartDate');
        const endDateInput = document.getElementById('modalEndDate');

        if (startDateInput) {
            startDateInput.addEventListener('change', () => this.updateBookingSummary());
        }

        if (endDateInput) {
            endDateInput.addEventListener('change', () => this.updateBookingSummary());
        }

        // Bouton de réservation
        const requestBtn = document.getElementById('modalRequestBookingBtn');
        if (requestBtn) {
            requestBtn.addEventListener('click', () => this.requestBooking());
        }

        // Bouton contact
        const contactBtn = document.getElementById('modalContactOwnerBtn');
        if (contactBtn) {
            contactBtn.addEventListener('click', () => this.contactOwner(this.currentItemId));
        }

        // Fermeture du modal
        const modalOverlay = document.getElementById('modalOverlay');
        const modalClose = document.getElementById('modalClose');

        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.hideModal());
        }

        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideModal());
        }

        // Fermeture avec Echap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    changeMainImage(imageUrl, thumbnailElement) {
        const mainImage = document.getElementById('modalMainImage');
        mainImage.src = imageUrl;

        // Mettre à jour les thumbnails actifs
        const thumbnails = document.querySelectorAll('.thumbnail');
        thumbnails.forEach(thumb => thumb.classList.remove('active'));
        thumbnailElement.classList.add('active');
    }

    updateBookingSummary() {
        const startDate = document.getElementById('modalStartDate').value;
        const endDate = document.getElementById('modalEndDate').value;
        const summary = document.getElementById('modalBookingSummary');
        const requestBtn = document.getElementById('modalRequestBookingBtn');

        if (!startDate || !endDate) {
            summary.style.display = 'none';
            requestBtn.disabled = true;
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            summary.style.display = 'none';
            requestBtn.disabled = true;
            this.showNotification('La date de fin doit être après la date de début', 'error');
            return;
        }

        const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const totalPrice = this.currentItemPrice * totalDays;
        const serviceFee = totalPrice * 0.10; // 10% de frais
        const totalAmount = totalPrice + serviceFee;

        document.getElementById('modalTotalPrice').textContent = `${totalPrice} MAD`;
        document.getElementById('modalServiceFee').textContent = `${serviceFee.toFixed(2)} MAD`;
        document.getElementById('modalTotalAmount').textContent = `${totalAmount.toFixed(2)} MAD`;

        summary.style.display = 'block';
        requestBtn.disabled = false;
    }

    async requestBooking() {
        const authManager = window.authManager;
        if (!authManager || !authManager.isLoggedIn()) {
            this.showNotification('Veuillez vous connecter pour réserver', 'info');
            this.hideModal();
            window.location.href = '/login';
            return;
        }

        const startDate = document.getElementById('modalStartDate').value;
        const endDate = document.getElementById('modalEndDate').value;

        if (!startDate || !endDate) {
            this.showNotification('Veuillez sélectionner les dates', 'error');
            return;
        }

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    itemId: this.currentItemId,
                    startDate: startDate,
                    endDate: endDate,
                    message: 'Je souhaite réserver cet objet'
                })
            });

            if (response.ok) {
                this.showNotification('Demande de réservation envoyée !', 'success');
                this.hideModal();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Erreur lors de la réservation');
            }
        } catch (error) {
            console.error('❌ Erreur réservation:', error);
            this.showNotification('Erreur: ' + error.message, 'error');
        }
    }

    showModal() {
        const modal = document.getElementById('itemDetailsModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Empêcher le scroll
        }
    }

    hideModal() {
        const modal = document.getElementById('itemDetailsModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Rétablir le scroll
        }
    }
}

// Initialisation
const homeManager = new HomeManager();
window.homeManager = homeManager;