class BookingsManager {
    constructor() {
        this.currentFilter = 'all';
        this.currentAction = null;
        this.currentBookingId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBookings();
        this.updateNavigation();
    }

    setupEventListeners() {
        // Filtres
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                this.changeFilter(e.target.dataset.status);
            });
        });

        // Modal de confirmation
        const cancelActionBtn = document.getElementById('cancelAction');
        const confirmActionBtn = document.getElementById('confirmAction');
        const modalOverlay = document.querySelector('#confirmationModal .modal-overlay');

        if (cancelActionBtn) {
            cancelActionBtn.addEventListener('click', () => this.hideConfirmationModal());
        }

        if (confirmActionBtn) {
            confirmActionBtn.addEventListener('click', () => this.executeAction());
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.hideConfirmationModal());
        }

        // Fermeture avec Echap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideConfirmationModal();
            }
        });
    }

    async loadBookings() {
        const loadingState = document.getElementById('loadingBookings');
        const emptyState = document.getElementById('emptyBookings');
        const bookingsList = document.getElementById('bookingsList');

        if (loadingState) loadingState.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (bookingsList) bookingsList.style.display = 'none';

        try {
            const token = localStorage.getItem('token');
            console.log('🔑 Token pour réservations:', token ? 'Présent' : 'Manquant');

            if (!token) {
                throw new Error('Utilisateur non connecté');
            }

            const response = await fetch('/api/bookings/my-bookings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('📡 Réponse réservations:', response.status);

            if (response.ok) {
                const bookings = await response.json();
                console.log(`✅ ${bookings.length} réservations chargées`);
                this.displayBookings(bookings);
                this.updateStats(bookings);
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Erreur lors du chargement des réservations');
            }
        } catch (error) {
            console.error('❌ Erreur chargement réservations:', error);
            this.showNotification('Erreur: ' + error.message, 'error');

            // Afficher l'état vide en cas d'erreur
            if (emptyState) emptyState.style.display = 'block';
            if (bookingsList) bookingsList.style.display = 'none';
        } finally {
            if (loadingState) loadingState.style.display = 'none';
        }
    }

    displayBookings(bookings) {
        const bookingsList = document.getElementById('bookingsList');
        const emptyState = document.getElementById('emptyBookings');

        if (!bookingsList || !emptyState) return;

        // Filtrer les réservations
        const filteredBookings = this.currentFilter === 'all'
            ? bookings
            : bookings.filter(booking => booking.status === this.currentFilter);

        console.log(`📊 Affichage de ${filteredBookings.length} réservations (filtre: ${this.currentFilter})`);

        if (filteredBookings.length === 0) {
            bookingsList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        bookingsList.style.display = 'block';
        emptyState.style.display = 'none';

        bookingsList.innerHTML = filteredBookings.map(booking => {
            const isOwner = this.isUserOwner(booking);
            console.log(`📋 Réservation ${booking._id} - Statut: ${booking.status} - Est propriétaire: ${isOwner}`);

            return `
            <div class="booking-card ${booking.status}">
                <div class="booking-header">
                    <div class="booking-info">
                        <h3>${booking.item?.title || 'Objet non trouvé'}</h3>
                        <div class="booking-meta">
                            <span class="booking-status ${booking.status}">
                                ${this.getStatusLabel(booking.status)}
                            </span>
                            <span class="booking-date">
                                ${new Date(booking.dates.startDate).toLocaleDateString('fr-FR')} 
                                - ${new Date(booking.dates.endDate).toLocaleDateString('fr-FR')}
                                (${booking.dates.totalDays} jour${booking.dates.totalDays > 1 ? 's' : ''})
                            </span>
                        </div>
                    </div>
                    <div class="booking-price">
                        ${booking.pricing?.totalAmount || 0} MAD
                    </div>
                </div>

                <div class="booking-details">
                    <div class="booking-party">
                        <div class="party-member">
                            <strong>${isOwner ? 'Locataire' : 'Propriétaire'}:</strong>
                            <span>${isOwner ?
                    `${booking.renter?.firstName || 'Inconnu'} ${booking.renter?.lastName || ''}` :
                    `${booking.owner?.firstName || 'Inconnu'} ${booking.owner?.lastName || ''}`
                }</span>
                        </div>
                        <div class="party-contact">
                            <button class="btn-secondary btn-sm" onclick="bookingsManager.contactParty('${booking._id}')">
                                📞 Contacter
                            </button>
                        </div>
                    </div>

                    <div class="booking-actions">
                        ${this.renderBookingActions(booking)}
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Réattacher les event listeners après le rendu
        this.attachActionListeners();
    }

    renderBookingActions(booking) {
        const isOwner = this.isUserOwner(booking);

        console.log(`🎯 Rendu actions pour réservation ${booking._id} - Statut: ${booking.status} - Propriétaire: ${isOwner}`);

        switch (booking.status) {
            case 'pending':
                if (isOwner) {
                    return `
                        <button class="btn-success btn-sm accept-btn" data-booking-id="${booking._id}">
                            ✅ Accepter
                        </button>
                        <button class="btn-danger btn-sm reject-btn" data-booking-id="${booking._id}">
                            ❌ Refuser
                        </button>
                    `;
                } else {
                    return `
                        <button class="btn-danger btn-sm cancel-btn" data-booking-id="${booking._id}">
                            🚫 Annuler
                        </button>
                    `;
                }

            case 'confirmed':
                return `
                    <button class="btn-primary btn-sm details-btn" data-booking-id="${booking._id}">
                        📋 Détails
                    </button>
                    ${!isOwner ? `
                        <button class="btn-danger btn-sm cancel-btn" data-booking-id="${booking._id}">
                            🚫 Annuler
                        </button>
                    ` : ''}
                `;

            case 'active':
                return `
                    <button class="btn-primary btn-sm details-btn" data-booking-id="${booking._id}">
                        📋 Suivi
                    </button>
                `;

            case 'completed':
                return `
                    <button class="btn-primary btn-sm details-btn" data-booking-id="${booking._id}">
                        📋 Voir
                    </button>
                    ${!booking.review ? `
                        <button class="btn-secondary btn-sm review-btn" data-booking-id="${booking._id}">
                            ⭐ Noter
                        </button>
                    ` : ''}
                `;

            default:
                return `
                    <button class="btn-primary btn-sm details-btn" data-booking-id="${booking._id}">
                        📋 Détails
                    </button>
                `;
        }
    }

    attachActionListeners() {
        // Accepter
        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.target.dataset.bookingId;
                this.showConfirmationModal('accept', bookingId);
            });
        });

        // Refuser
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.target.dataset.bookingId;
                this.showConfirmationModal('reject', bookingId);
            });
        });

        // Annuler
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.target.dataset.bookingId;
                this.showConfirmationModal('cancel', bookingId);
            });
        });

        // Détails
        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.target.dataset.bookingId;
                this.viewBookingDetails(bookingId);
            });
        });

        // Noter
        document.querySelectorAll('.review-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.target.dataset.bookingId;
                this.leaveReview(bookingId);
            });
        });
    }

    isUserOwner(booking) {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.id) return false;

            return booking.owner && booking.owner._id === user.id;
        } catch (error) {
            console.error('Erreur vérification propriétaire:', error);
            return false;
        }
    }

    getStatusLabel(status) {
        const labels = {
            'pending': '⏳ En attente',
            'confirmed': '✅ Confirmée',
            'active': '🚗 En cours',
            'completed': '🏁 Terminée',
            'cancelled': '❌ Annulée',
            'rejected': '🚫 Refusée'
        };
        return labels[status] || status;
    }

    changeFilter(status) {
        this.currentFilter = status;

        console.log(`🔍 Changement de filtre: ${status}`);

        // Mettre à jour les filtres actifs
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.status === status);
        });

        this.loadBookings();
    }

    updateStats(bookings) {
        const pendingCount = bookings.filter(b => b.status === 'pending').length;
        const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
        const activeCount = bookings.filter(b => b.status === 'active').length;

        // Calculer les revenus (pour le propriétaire)
        const earnings = bookings
            .filter(b => this.isUserOwner(b) && ['completed', 'active'].includes(b.status))
            .reduce((sum, b) => sum + (b.pricing?.totalPrice || 0), 0);

        const pendingCountEl = document.getElementById('pendingCount');
        const confirmedCountEl = document.getElementById('confirmedCount');
        const activeCountEl = document.getElementById('activeCount');
        const earningsCountEl = document.getElementById('earningsCount');

        if (pendingCountEl) pendingCountEl.textContent = pendingCount;
        if (confirmedCountEl) confirmedCountEl.textContent = confirmedCount;
        if (activeCountEl) activeCountEl.textContent = activeCount;
        if (earningsCountEl) earningsCountEl.textContent = `${earnings} MAD`;

        console.log(`📈 Stats mises à jour: ${pendingCount} en attente, ${confirmedCount} confirmées, ${activeCount} en cours, ${earnings} MAD de revenus`);
    }

    showConfirmationModal(action, bookingId) {
        this.currentAction = action;
        this.currentBookingId = bookingId;

        const modal = document.getElementById('confirmationModal');
        const title = document.getElementById('confirmationTitle');
        const message = document.getElementById('confirmationMessage');

        console.log(`🎯 Affichage modal pour action: ${action} sur réservation: ${bookingId}`);

        const actions = {
            'accept': {
                title: 'Accepter la réservation',
                message: 'Êtes-vous sûr de vouloir accepter cette réservation ? Le locataire sera notifié.'
            },
            'reject': {
                title: 'Refuser la réservation',
                message: 'Êtes-vous sûr de vouloir refuser cette réservation ? Cette action est définitive.'
            },
            'cancel': {
                title: 'Annuler la réservation',
                message: 'Êtes-vous sûr de vouloir annuler cette réservation ?'
            }
        };

        title.textContent = actions[action]?.title || 'Confirmer l\'action';
        message.textContent = actions[action]?.message || 'Êtes-vous sûr de vouloir effectuer cette action ?';

        modal.style.display = 'flex';
    }

    hideConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        modal.style.display = 'none';
        this.currentAction = null;
        this.currentBookingId = null;
        console.log('🚪 Modal de confirmation fermé');
    }

    async executeAction() {
        if (!this.currentAction || !this.currentBookingId) {
            console.error('❌ Action ou ID de réservation manquant');
            return;
        }

        console.log(`⚡ Exécution de l'action: ${this.currentAction} sur réservation: ${this.currentBookingId}`);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Utilisateur non connecté');
            }

            let url = `/api/bookings/${this.currentBookingId}`;
            let method = 'PUT';

            switch (this.currentAction) {
                case 'accept':
                    url += '/accept';
                    break;
                case 'reject':
                    url += '/reject';
                    break;
                case 'cancel':
                    url += '/cancel';
                    break;
                default:
                    throw new Error('Action non reconnue');
            }

            console.log(`📤 Requête: ${method} ${url}`);

            const requestBody = this.currentAction === 'reject' ?
                JSON.stringify({ reason: 'Raison non spécifiée' }) :
                undefined;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: requestBody
            });

            console.log('📡 Réponse reçue:', response.status);

            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message || 'Action effectuée avec succès', 'success');
                this.hideConfirmationModal();
                this.loadBookings(); // Recharger la liste
            } else {
                const error = await response.json();
                throw new Error(error.message || `Erreur ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Erreur action réservation:', error);
            this.showNotification('Erreur: ' + error.message, 'error');
            this.hideConfirmationModal();
        }
    }

    viewBookingDetails(bookingId) {
        console.log('📋 Affichage détails réservation:', bookingId);
        this.showNotification('Page de détails de réservation bientôt disponible!', 'info');
    }

    contactParty(bookingId) {
        console.log('📞 Contact réservation:', bookingId);
        this.showNotification('Système de messagerie bientôt disponible!', 'info');
    }

    leaveReview(bookingId) {
        console.log('⭐ Notation réservation:', bookingId);
        this.showNotification('Système de notation bientôt disponible!', 'info');
    }

    updateNavigation() {
        const authManager = window.authManager;
        if (authManager) {
            authManager.updateNavigation();
        }
    }

    showNotification(message, type = 'info') {
        console.log(`💬 Notification [${type}]:`, message);

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
                font-weight: 500;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => notification.remove(), 5000);
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function () {
    const authManager = new AuthManager();

    if (!authManager.isLoggedIn()) {
        window.location.href = '/login';
        return;
    }

    window.bookingsManager = new BookingsManager();
});