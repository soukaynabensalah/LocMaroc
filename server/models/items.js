class ItemManager {
    constructor() {
        this.features = [];
        this.images = [];
        this.currentDeleteId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Gestion des caractéristiques
        const addFeatureBtn = document.getElementById('addFeatureBtn');
        const featureInput = document.getElementById('featureInput');

        if (addFeatureBtn && featureInput) {
            addFeatureBtn.addEventListener('click', () => this.addFeature());
            featureInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addFeature();
                }
            });
        }

        // Gestion de l'upload d'images
        const imageUpload = document.getElementById('imageUpload');
        const imageInput = document.getElementById('imageInput');

        if (imageUpload && imageInput) {
            imageUpload.addEventListener('click', () => imageInput.click());
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Gestion du formulaire
        const itemForm = document.getElementById('itemForm');
        if (itemForm) {
            itemForm.addEventListener('submit', (e) => this.handleItemSubmit(e));
        }

        // Gestion de la modal de suppression
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) {
            document.getElementById('cancelDelete').addEventListener('click', () => this.hideDeleteModal());
            document.getElementById('confirmDelete').addEventListener('click', () => this.confirmDelete());
        }
    }

    addFeature() {
        const featureInput = document.getElementById('featureInput');
        const feature = featureInput.value.trim();

        if (feature && !this.features.includes(feature)) {
            this.features.push(feature);
            this.updateFeaturesList();
            featureInput.value = '';
        }
    }

    removeFeature(index) {
        this.features.splice(index, 1);
        this.updateFeaturesList();
    }

    updateFeaturesList() {
        const featuresList = document.getElementById('featuresList');
        if (!featuresList) return;

        featuresList.innerHTML = this.features.map((feature, index) => `
            <div class="feature-tag">
                ${feature}
                <button type="button" class="remove-feature" onclick="itemManager.removeFeature(${index})">×</button>
            </div>
        `).join('');
    }

    handleImageUpload(event) {
        const files = event.target.files;
        if (!files.length) return;

        for (let file of files) {
            if (file.type.startsWith('image/')) {
                this.previewImage(file);
            }
        }

        // Reset l'input file
        event.target.value = '';
    }

    previewImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                url: e.target.result,
                file: file,
                id: Date.now() + Math.random()
            };
            this.images.push(imageData);
            this.updateImagePreview();
        };
        reader.readAsDataURL(file);
    }

    removeImage(index) {
        this.images.splice(index, 1);
        this.updateImagePreview();
    }

    updateImagePreview() {
        const imagePreview = document.getElementById('imagePreview');
        if (!imagePreview) return;

        imagePreview.innerHTML = this.images.map((image, index) => `
            <div class="preview-image">
                <img src="${image.url}" alt="Preview">
                <button type="button" class="remove-image" onclick="itemManager.removeImage(${index})">×</button>
            </div>
        `).join('');
    }

    async handleItemSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            condition: formData.get('condition'),
            pricePerDay: parseFloat(formData.get('pricePerDay')),
            deposit: parseFloat(formData.get('deposit')),
            location: {
                address: formData.get('address'),
                city: formData.get('city')
            },
            features: this.features,
            specifications: {
                brand: formData.get('brand'),
                model: formData.get('model')
            }
        };

        // Validation
        if (!this.validateItem(data)) return;

        try {
            this.setLoadingState('submitBtn', true);

            const token = localStorage.getItem('token');
            const response = await fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification('Objet créé avec succès !', 'success');
                setTimeout(() => {
                    window.location.href = '/my-items.html';
                }, 1500);
            } else {
                throw new Error(result.message || 'Erreur lors de la création de l\'objet');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Erreur création item:', error);
        } finally {
            this.setLoadingState('submitBtn', false);
        }
    }

    validateItem(data) {
        let isValid = true;
        this.clearErrors();

        if (!data.title || data.title.length < 5) {
            this.showError('titleError', 'Le titre doit contenir au moins 5 caractères');
            isValid = false;
        }

        if (!data.description || data.description.length < 20) {
            this.showError('descriptionError', 'La description doit contenir au moins 20 caractères');
            isValid = false;
        }

        if (!data.category) {
            this.showError('categoryError', 'La catégorie est requise');
            isValid = false;
        }

        if (!data.condition) {
            this.showError('conditionError', 'L\'état est requis');
            isValid = false;
        }

        if (!data.pricePerDay || data.pricePerDay <= 0) {
            this.showError('pricePerDayError', 'Le prix par jour doit être supérieur à 0');
            isValid = false;
        }

        if (!data.deposit || data.deposit < 0) {
            this.showError('depositError', 'La caution est requise');
            isValid = false;
        }

        if (!data.location.city) {
            this.showError('cityError', 'La ville est requise');
            isValid = false;
        }

        if (!data.location.address) {
            this.showError('addressError', 'L\'adresse est requise');
            isValid = false;
        }

        return isValid;
    }

    async loadUserItems() {
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const itemsList = document.getElementById('itemsList');
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');

        if (!itemsList || !emptyState || !loadingState) return;

        try {
            loadingState.style.display = 'block';
            itemsList.style.display = 'none';
            emptyState.style.display = 'none';

            const token = localStorage.getItem('token');
            const response = await fetch('/api/items/user/my-items', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const items = await response.json();

                // Filtrer les items selon le statut
                let filteredItems = items;
                if (statusFilter !== 'all') {
                    filteredItems = items.filter(item => item.status === statusFilter);
                }

                this.displayUserItems(filteredItems);
                this.updateStats(items);

                if (filteredItems.length === 0) {
                    itemsList.style.display = 'none';
                    emptyState.style.display = 'block';
                } else {
                    itemsList.style.display = 'grid';
                    emptyState.style.display = 'none';
                }
            } else {
                throw new Error('Erreur lors du chargement des objets');
            }
        } catch (error) {
            this.showNotification('Erreur lors du chargement des objets', 'error');
            console.error('Erreur:', error);
        } finally {
            loadingState.style.display = 'none';
        }
    }

    displayUserItems(items) {
        const itemsList = document.getElementById('itemsList');
        if (!itemsList) return;

        itemsList.innerHTML = items.map(item => `
            <div class="item-card">
                <div class="item-image">
                    ${item.images && item.images.length > 0 ?
                `<img src="${item.images[0].url}" alt="${item.title}">` :
                '📷'
            }
                </div>
                <div class="item-content">
                    <h3 class="item-title">${item.title}</h3>
                    <p class="item-description">${item.description}</p>
                    <div class="item-details">
                        <div class="item-price">${item.pricePerDay} MAD/jour</div>
                        <div class="item-condition">${this.getConditionLabel(item.condition)}</div>
                    </div>
                    <div class="item-meta">
                        <small>Vues: ${item.views} | Locations: ${item.rentalCount}</small>
                    </div>
                    <div class="item-actions">
                        <button class="item-action-btn edit" onclick="itemManager.editItem('${item._id}')">
                            ✏️ Modifier
                        </button>
                        <button class="item-action-btn delete" onclick="itemManager.showDeleteModal('${item._id}')">
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStats(items) {
        const activeCount = items.filter(item => item.status === 'active').length;
        const totalViews = items.reduce((sum, item) => sum + item.views, 0);
        const rentalCount = items.reduce((sum, item) => sum + item.rentalCount, 0);

        const activeCountEl = document.getElementById('activeCount');
        const totalViewsEl = document.getElementById('totalViews');
        const rentalCountEl = document.getElementById('rentalCount');

        if (activeCountEl) activeCountEl.textContent = activeCount;
        if (totalViewsEl) totalViewsEl.textContent = totalViews;
        if (rentalCountEl) rentalCountEl.textContent = rentalCount;
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

    editItem(itemId) {
        window.location.href = `/edit-item.html?id=${itemId}`;
    }

    showDeleteModal(itemId) {
        this.currentDeleteId = itemId;
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideDeleteModal() {
        this.currentDeleteId = null;
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async confirmDelete() {
        if (!this.currentDeleteId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/items/${this.currentDeleteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showNotification('Objet supprimé avec succès', 'success');
                this.hideDeleteModal();
                this.loadUserItems(); // Recharger la liste
            } else {
                throw new Error('Erreur lors de la suppression');
            }
        } catch (error) {
            this.showNotification('Erreur lors de la suppression', 'error');
            console.error('Erreur:', error);
        }
    }

    // Méthodes utilitaires
    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
        }
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
        });
    }

    setLoadingState(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (button) {
            const btnText = button.querySelector('.btn-text');
            const btnLoading = button.querySelector('.btn-loading');

            if (isLoading) {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline';
                button.disabled = true;
            } else {
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
                button.disabled = false;
            }
        }
    }

    showNotification(message, type = 'info') {
        // Utiliser la méthode de notification d'AuthManager si disponible
        if (window.authManager) {
            window.authManager.showNotification(message, type);
        } else {
            // Fallback basique
            alert(message);
        }
    }
}

// Initialisation globale
const itemManager = new ItemManager();

// Fonctions globales pour les event listeners HTML
window.itemManager = itemManager;

// Fonction pour charger les items de l'utilisateur (appelée depuis my-items.html)
async function loadUserItems() {
    await itemManager.loadUserItems();
}