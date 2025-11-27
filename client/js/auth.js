class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        // Gestion du formulaire de connexion
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Gestion du formulaire d'inscription
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            this.setupPasswordStrength();
        }

        // Gestion de la navigation
        this.updateNavigation();
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return;

        passwordInput.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });
    }

    updatePasswordStrength(password) {
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');

        if (!strengthFill || !strengthText) return;

        let strength = 0;
        let text = 'Faible';
        let className = 'weak';

        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;
        if (/[^A-Za-z0-9]/.test(password)) strength += 25;

        if (strength >= 75) {
            text = 'Fort';
            className = 'strong';
        } else if (strength >= 50) {
            text = 'Moyen';
            className = 'medium';
        }

        strengthFill.style.width = `${strength}%`;
        strengthFill.className = `strength-fill ${className}`;
        strengthText.textContent = text;
        strengthText.style.color = this.getStrengthColor(className);
    }

    getStrengthColor(className) {
        const colors = {
            weak: '#ef4444',
            medium: '#f59e0b',
            strong: '#10b981'
        };
        return colors[className] || '#6b7280';
    }

    async handleLogin(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Validation
        if (!this.validateLogin(data)) return;

        try {
            this.setLoadingState('loginBtn', true);

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.handleAuthSuccess(result);
                this.showNotification('Connexion réussie !', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                throw new Error(result.message || 'Erreur de connexion');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Erreur de connexion:', error);
        } finally {
            this.setLoadingState('loginBtn', false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        // Validation
        if (!this.validateRegister(data)) return;

        try {
            this.setLoadingState('registerBtn', true);

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification('Compte créé avec succès !', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                throw new Error(result.message || 'Erreur lors de la création du compte');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            console.error('Erreur d\'inscription:', error);
        } finally {
            this.setLoadingState('registerBtn', false);
        }
    }

    validateLogin(data) {
        let isValid = true;

        // Reset errors
        this.clearErrors();

        if (!data.email) {
            this.showError('emailError', 'L\'email est requis');
            isValid = false;
        } else if (!this.isValidEmail(data.email)) {
            this.showError('emailError', 'Format d\'email invalide');
            isValid = false;
        }

        if (!data.password) {
            this.showError('passwordError', 'Le mot de passe est requis');
            isValid = false;
        }

        return isValid;
    }

    validateRegister(data) {
        let isValid = true;

        // Reset errors
        this.clearErrors();

        // Prénom
        if (!data.firstName) {
            this.showError('firstNameError', 'Le prénom est requis');
            isValid = false;
        }

        // Nom
        if (!data.lastName) {
            this.showError('lastNameError', 'Le nom est requis');
            isValid = false;
        }

        // Email
        if (!data.email) {
            this.showError('emailError', 'L\'email est requis');
            isValid = false;
        } else if (!this.isValidEmail(data.email)) {
            this.showError('emailError', 'Format d\'email invalide');
            isValid = false;
        }

        // Téléphone
        if (!data.phone) {
            this.showError('phoneError', 'Le téléphone est requis');
            isValid = false;
        } else if (!this.isValidPhone(data.phone)) {
            this.showError('phoneError', 'Format de téléphone invalide');
            isValid = false;
        }

        // Mot de passe
        if (!data.password) {
            this.showError('passwordError', 'Le mot de passe est requis');
            isValid = false;
        } else if (data.password.length < 6) {
            this.showError('passwordError', 'Le mot de passe doit contenir au moins 6 caractères');
            isValid = false;
        }

        // Confirmation mot de passe
        if (!data.confirmPassword) {
            this.showError('confirmPasswordError', 'Veuillez confirmer le mot de passe');
            isValid = false;
        } else if (data.password !== data.confirmPassword) {
            this.showError('confirmPasswordError', 'Les mots de passe ne correspondent pas');
            isValid = false;
        }

        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        // Validation basique pour les numéros marocains
        const phoneRegex = /^(?:(?:\+|00)212|0)[5-7]\d{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            const input = document.getElementById(elementId.replace('Error', ''));
            if (input) {
                input.classList.add('error');
            }
        }
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
        });

        const errorInputs = document.querySelectorAll('.error');
        errorInputs.forEach(input => {
            input.classList.remove('error');
        });
    }

    setLoadingState(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (isLoading) {
                button.classList.add('loading');
                button.disabled = true;
            } else {
                button.classList.remove('loading');
                button.disabled = false;
            }
        }
    }

    handleAuthSuccess(authData) {
        // Stocker le token et les infos utilisateur
        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));

        // Mettre à jour la navigation
        this.updateNavigation();
    }

    checkExistingAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
            // Rediriger vers le dashboard si déjà connecté
            if (window.location.pathname.includes('login.html') ||
                window.location.pathname.includes('register.html')) {
                window.location.href = 'dashboard.html';
            }
            this.updateNavigation();
        }
    }

    updateNavigation() {
        const user = this.getCurrentUser();
        const navMenu = document.querySelector('.nav-menu');

        if (!navMenu) return;

        if (user) {
            // Utilisateur connecté
            navMenu.innerHTML = `
                <a href="dashboard.html" class="nav-link">Tableau de bord</a>
                <a href="#" class="nav-link" id="logoutBtn">Déconnexion</a>
                <a href="profile.html" class="nav-user">
                    <img src="assets/avatar-placeholder.png" alt="Avatar" class="user-avatar">
                    <span>${user.firstName}</span>
                </a>
            `;

            document.getElementById('logoutBtn').addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    getCurrentUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    isLoggedIn() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        console.log('🔐 Vérification connexion - Token:', token ? 'Présent' : 'Manquant');
        console.log('🔐 Vérification connexion - User:', user ? 'Présent' : 'Manquant');

        return token !== null && user !== null;
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.showNotification('Déconnexion réussie', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    showNotification(message, type = 'info') {
        // Créer une notification toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Styles de base pour les toasts
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6'
        };

        toast.style.background = colors[type] || colors.info;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Dans la classe AuthManager, ajoutez cette méthode
    updateNavigation() {
        const user = this.getCurrentUser();
        const navMenu = document.querySelector('.nav-menu');

        if (!navMenu) return;

        if (user) {
            // Utilisateur connecté
            const userInitial = user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U';
            navMenu.innerHTML = `
            <a href="/dashboard" class="nav-link">Tableau de bord</a>
            <a href="/my-items.html" class="nav-link">Mes objets</a>
            <a href="#" class="nav-link" id="logoutBtn">Déconnexion</a>
            <a href="/profile.html" class="nav-user">
                <div class="user-avatar">${userInitial}</div>
                <span>${user.firstName}</span>
            </a>
        `;

            document.getElementById('logoutBtn').addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        } else {
            // Utilisateur non connecté
            navMenu.innerHTML = `
            <a href="/" class="nav-link">Accueil</a>
            <a href="/login" class="nav-link">Connexion</a>
            <a href="/register" class="nav-btn">S'inscrire</a>
        `;
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});