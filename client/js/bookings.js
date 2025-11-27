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
        document.getElementById('cancelAction').addEventListener('click', () => this.hideConfirmationModal());
        document.getElementById('confirmAction').addEventListener('click', () => this.executeAction());
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
            const response = await fetch('/api/bookings/my-bookings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const bookings = await response.json();
                this.displayBookings(bookings);
                this.updateStats(bookings);
            } else {
                throw new Error('Erreur lors du chargement des réservations');
            }
        } catch (error) {
            console.error('❌ Erreur chargement réservations:', error);
            this.showNotification('Erreur: ' + error.message, 'error');
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

        if (filteredBookings.length === 0) {
            bookingsList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        bookingsList.style.display = 'block';
        emptyState.style.display = 'none';

        bookingsList.innerHTML = filteredBookings.map(booking => `
            <div class="booking-card ${booking.status}">
                <div class="booking-header">
                    <div class="booking-info">
                        <h3>${booking.item.title}</h3>
                        <div class="booking-meta">
                            <span class="booking-status ${booking.status}">
                                ${this.getStatusLabel(booking.status)}
                            </span>
                            <span class="booking-date">
                                ${new Date(booking.dates.startDate).toLocaleDateString('fr-FR')} 
                                - ${new Date(booking.dates.endDate).toLocaleDateString('fr-FR')}
                            </span>
                        </div>
                    </div>
                    <div class="booking-price">
                        ${booking.pricing.totalAmount} MAD
                    </div>
                </div>

                <div class="booking-details">
                    <div class="booking-party">
                        <div class="party-member">
                            <strong>${this.isUserOwner(booking) ? 'Locataire' : 'Propriétaire'}:</strong>
                            <span>${this.isUserOwner(booking) ?
                `${booking.renter.firstName} ${booking.renter.lastName}` :
                `${booking.owner.firstName} ${booking.owner.lastName}`
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
        `).join('');
    }

    renderBookingActions(booking) {
        const isOwner = this.isUserOwner(booking);

        switch (booking.status) {
            case 'pending':
                if (isOwner) {
                    return `
                        <button class="btn-success btn-sm" onclick="bookingsManager.showConfirmationModal('accept', '${booking._id}')">
                            ✅ Accepter
                        </button>
                        <button class="btn-danger btn-sm" onclick="bookingsManager.showConfirmationModal('reject', '${booking._id}')">
                            ❌ Refuser
                        </button>
                    `;
                } else {
                    return `
                        <button class="btn-danger btn-sm" onclick="bookingsManager.showConfirmationModal('cancel', '${booking._id}')">
                            🚫 Annuler
                        </button>
                    `;
                }

            case 'confirmed':
                return `
                    <button class="btn-primary btn-sm" onclick="bookingsManager.viewBookingDetails('${booking._id}')">
                        📋 Détails
                    </button>
                    ${!isOwner ? `
                        <button class="btn-danger btn-sm" onclick="bookingsManager.showConfirmationModal('cancel', '${booking._id}')">
                            🚫 Annuler
                        </button>
                    ` : ''}
                `;

            case 'active':
                return `
                    <button class="btn-primary btn-sm" onclick="bookingsManager.viewBookingDetails('${booking._id}')">
                        📋 Suivi
                    </button>
                `;

            case 'completed':
                return `
                    <button class="btn-primary btn-sm" onclick="bookingsManager.viewBookingDetails('${booking._id}')">
                        📋 Voir
                    </button>
                    ${!booking.review ? `
                        <button class="btn-secondary btn-sm" onclick="bookingsManager.leaveReview('${booking._id}')">
                            ⭐ Noter
                        </button>
                    ` : ''}
                `;

            default:
                return `
                    <button class="btn-primary btn-sm" onclick="bookingsManager.viewBookingDetails('${booking._id}')">
                        📋 Détails
                    </button>
                `;
        }
    }

    isUserOwner(booking) {
        const user = JSON.parse(localStorage.getItem('user'));
        return booking.owner._id === user.id;
    }

    getStatusLabel(status) {
        const labels = {
            'pending': 'En attente',
            'confirmed': 'Confirmée',
            'active': 'En cours',
            'completed': 'Terminée',
            'cancelled': 'Annulée',
            'rejected': 'Refusée'
        };
        return labels[status] || status;
    }

    changeFilter(status) {
        this.currentFilter = status;

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
            .reduce((sum, b) => sum + b.pricing.totalPrice, 0);

        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('confirmedCount').textContent = confirmedCount;
        document.getElementById('activeCount').textContent = activeCount;
        document.getElementById('earningsCount').textContent = `${earnings} MAD`;
    }

    showConfirmationModal(action, bookingId) {
        this.currentAction = action;
        this.currentBookingId = bookingId;

        const modal = document.getElementById('confirmationModal');
        const title = document.getElementById('confirmationTitle');
        const message = document.getElementById('confirmationMessage');

        const actions = {
            'accept': {
                title: 'Accepter la réservation',
                message: 'Êtes-vous sûr de vouloir accepter cette réservation ?'
            },
            'reject': {
                title: 'Refuser la réservation',
                message: 'Êtes-vous sûr de vouloir refuser cette réservation ?'
            },
            'cancel': {
                title: 'Annuler la réservation',
                message: 'Êtes-vous sûr de vouloir annuler cette réservation ?'
            }
        };

        title.textContent = actions[action]?.title || 'Confirmer l\'action';
        message.textContent = actions[action]?.message || 'Êtes-vous sûr de vouloir effectuer cette action ?';

        modal.style.display = 'block';
    }

    hideConfirmationModal() {
        const modal = document.getElementById('confirmationModal');
        modal.style.display = 'none';
        this.currentAction = null;
        this.currentBookingId = null;
    }

    async executeAction() {
        if (!this.currentAction || !this.currentBookingId) return;

        try {
            const token = localStorage.getItem('token');
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
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: this.currentAction === 'reject' ? JSON.stringify({
                    reason: 'Raison non spécifiée'
                }) : undefined
            });

            if (response.ok) {
                this.showNotification('Action effectuée avec succès', 'success');
                this.hideConfirmationModal();
                this.loadBookings(); // Recharger la liste
            } else {
                const error = await response.json();
                throw new Error(error.message);
            }
        } catch (error) {
            console.error('❌ Erreur action réservation:', error);
            this.showNotification('Erreur: ' + error.message, 'error');
            this.hideConfirmationModal();
        }
    }

    viewBookingDetails(bookingId) {
        // TODO: Implémenter la page de détails d'une réservation
        this.showNotification('Page de détails bientôt disponible!', 'info');
    }

    contactParty(bookingId) {
        // TODO: Implémenter le système de messagerie
        this.showNotification('Messagerie bientôt disponible!', 'info');
    }

    leaveReview(bookingId) {
        // TODO: Implémenter le système de notation
        this.showNotification('Système de notation bientôt disponible!', 'info');
    }

    updateNavigation() {
        const authManager = window.authManager;
        if (authManager) {
            authManager.updateNavigation();
        }
    }

    showNotification(message, type = 'info') {
        if (window.authManager && window.authManager.showNotification) {
            window.authManager.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialisation
const bookingsManager = new BookingsManager();