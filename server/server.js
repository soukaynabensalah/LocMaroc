import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuration des paths ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du client
app.use(express.static(path.join(__dirname, '../client')));

// Connexion MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/locmaroc';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connecté à MongoDB'))
    .catch(err => {
        console.error('❌ Erreur de connexion MongoDB:', err);
        process.exit(1);
    });

// Import des modèles
import { User } from './models/User.js';
import { Item } from './models/Item.js';
import { Booking } from './models/Booking.js';

// Import des routes
import { authRoutes, authMiddleware } from './routes/auth.js';
import { itemRoutes } from './routes/items.js';
import { bookingRoutes } from './routes/bookings.js';

// Utiliser les routes API
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/bookings', bookingRoutes);

// ==================== ROUTES DE BASE POUR LES PAGES HTML ====================

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Page de connexion
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/login.html'));
});

// Page d'inscription
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/register.html'));
});

// Page tableau de bord
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dashboard.html'));
});

// Pages avec et sans extension .html
app.get('/add-item', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/add-item.html'));
});

app.get('/add-item.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/add-item.html'));
});

app.get('/my-items', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/my-items.html'));
});

app.get('/my-items.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/my-items.html'));
});

app.get('/edit-item', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/edit-item.html'));
});

app.get('/edit-item.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/edit-item.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/profile.html'));
});

app.get('/profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/profile.html'));
});

app.get('/bookings', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/bookings.html'));
});

app.get('/bookings.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/bookings.html'));
});

// ==================== ROUTES API ====================

// Route de santé de l'API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur LocMaroc en ligne',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Récupérer les catégories disponibles
app.get('/api/categories', async (req, res) => {
    try {
        const categories = [
            {
                id: 'outils',
                name: 'Outils',
                icon: '🔧',
                count: await Item.countDocuments({ category: 'outils', status: 'active' }),
                description: 'Outils de bricolage, jardinage, construction'
            },
            {
                id: 'high-tech',
                name: 'High-Tech',
                icon: '📷',
                count: await Item.countDocuments({ category: 'high-tech', status: 'active' }),
                description: 'Électronique, informatique, photo, vidéo'
            },
            {
                id: 'loisirs',
                name: 'Loisirs',
                icon: '🎉',
                count: await Item.countDocuments({ category: 'loisirs', status: 'active' }),
                description: 'Jeux, instruments, équipements de loisirs'
            },
            {
                id: 'maison',
                name: 'Maison',
                icon: '🏠',
                count: await Item.countDocuments({ category: 'maison', status: 'active' }),
                description: 'Électroménager, décoration, mobilier'
            },
            {
                id: 'sport',
                name: 'Sport',
                icon: '⚽',
                count: await Item.countDocuments({ category: 'sport', status: 'active' }),
                description: 'Équipements sportifs, fitness, outdoor'
            },
            {
                id: 'vehicules',
                name: 'Véhicules',
                icon: '🚗',
                count: await Item.countDocuments({ category: 'vehicules', status: 'active' }),
                description: 'Véhicules, accessoires auto/moto'
            },
            {
                id: 'autres',
                name: 'Autres',
                icon: '📦',
                count: await Item.countDocuments({ category: 'autres', status: 'active' }),
                description: 'Autres catégories diverses'
            }
        ];
        res.json(categories);
    } catch (error) {
        console.error('Erreur récupération catégories:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
    }
});

// Récupérer les statistiques globales
app.get('/api/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalItems = await Item.countDocuments({ status: 'active' });
        const totalRentals = await Booking.countDocuments({ status: 'completed' });

        const popularCategories = await Item.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const recentBookings = await Booking.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        res.json({
            totalUsers,
            totalItems,
            totalRentals,
            recentBookings,
            popularCategories
        });
    } catch (error) {
        console.error('Erreur récupération stats:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
    }
});

// Récupérer les objets populaires (pour la page d'accueil)
app.get('/api/items/popular', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;

        const popularItems = await Item.find({ status: 'active' })
            .populate('owner', 'firstName lastName trustScore')
            .sort({ views: -1, rentalCount: -1 })
            .limit(limit);

        res.json(popularItems);
    } catch (error) {
        console.error('Erreur récupération items populaires:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des objets populaires' });
    }
});

// Recherche avancée d'objets
app.get('/api/items/search/advanced', async (req, res) => {
    try {
        const {
            query,
            category,
            city,
            minPrice,
            maxPrice,
            condition,
            page = 1,
            limit = 12,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let filter = { status: 'active' };

        // Filtre par recherche textuelle
        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { 'specifications.brand': { $regex: query, $options: 'i' } },
                { 'specifications.model': { $regex: query, $options: 'i' } }
            ];
        }

        // Filtre par catégorie
        if (category && category !== 'tous') {
            filter.category = category;
        }

        // Filtre par ville
        if (city) {
            filter['location.city'] = new RegExp(city, 'i');
        }

        // Filtre par prix
        if (minPrice || maxPrice) {
            filter.pricePerDay = {};
            if (minPrice) filter.pricePerDay.$gte = parseFloat(minPrice);
            if (maxPrice) filter.pricePerDay.$lte = parseFloat(maxPrice);
        }

        // Filtre par condition
        if (condition) {
            filter.condition = condition;
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const items = await Item.find(filter)
            .populate('owner', 'firstName lastName trustScore createdAt')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Item.countDocuments(filter);

        // Suggestions de recherche
        const suggestions = await Item.distinct('location.city', {
            'location.city': { $exists: true, $ne: '' }
        }).limit(5);

        res.json({
            items,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            },
            suggestions,
            filters: {
                query,
                category,
                city,
                minPrice: minPrice ? parseFloat(minPrice) : null,
                maxPrice: maxPrice ? parseFloat(maxPrice) : null,
                condition
            }
        });
    } catch (error) {
        console.error('Erreur recherche avancée:', error);
        res.status(500).json({ message: 'Erreur lors de la recherche' });
    }
});

// Récupérer les objets d'un utilisateur spécifique (public)
app.get('/api/users/:userId/items', async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 12 } = req.query;
        const skip = (page - 1) * limit;

        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const items = await Item.find({
            owner: userId,
            status: 'active'
        })
            .populate('owner', 'firstName lastName trustScore createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Item.countDocuments({ owner: userId, status: 'active' });

        res.json({
            items,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                trustScore: user.trustScore,
                joinDate: user.createdAt
            },
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Erreur récupération items utilisateur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des objets' });
    }
});

// Mettre à jour le profil utilisateur
app.put('/api/users/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, phone, address } = req.body;
        const userId = req.user._id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                firstName,
                lastName,
                phone,
                address,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            message: 'Profil mis à jour avec succès',
            user: updatedUser
        });
    } catch (error) {
        console.error('Erreur mise à jour profil:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: 'Données invalides',
                errors
            });
        }

        res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
    }
});

// Changer le mot de passe
app.put('/api/users/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier le mot de passe actuel
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
        }

        // Mettre à jour le mot de passe
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Mot de passe modifié avec succès' });
    } catch (error) {
        console.error('Erreur changement mot de passe:', error);
        res.status(500).json({ message: 'Erreur lors du changement de mot de passe' });
    }
});

// Upload d'image (simulé - à intégrer avec Cloudinary plus tard)
app.post('/api/upload/image', authMiddleware, async (req, res) => {
    try {
        // Pour l'instant, on simule l'upload
        // En production, intégrer avec Cloudinary, AWS S3, etc.
        const { imageData } = req.body; // Base64 image data

        // Simulation d'URL d'image
        const imageUrl = `https://via.placeholder.com/600x400/3b82f6/ffffff?text=Image+${Date.now()}`;
        const publicId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        res.json({
            url: imageUrl,
            publicId: publicId,
            message: 'Image uploadée avec succès'
        });
    } catch (error) {
        console.error('Erreur upload image:', error);
        res.status(500).json({ message: 'Erreur lors de l\'upload de l\'image' });
    }
});

// Gestion des favoris
app.get('/api/users/favorites', authMiddleware, async (req, res) => {
    try {
        // Pour l'instant, retourner une liste vide
        // À implémenter avec un modèle Favorites
        res.json({ items: [] });
    } catch (error) {
        console.error('Erreur récupération favoris:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des favoris' });
    }
});

// Route pour les villes populaires
app.get('/api/cities/popular', async (req, res) => {
    try {
        const popularCities = await Item.aggregate([
            {
                $match: {
                    'location.city': { $exists: true, $ne: '' },
                    status: 'active'
                }
            },
            {
                $group: {
                    _id: '$location.city',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.json(popularCities.map(city => ({
            name: city._id,
            count: city.count
        })));
    } catch (error) {
        console.error('Erreur récupération villes populaires:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des villes' });
    }
});

// Statistiques utilisateur
app.get('/api/users/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        const userItemsCount = await Item.countDocuments({ owner: userId });
        const activeItemsCount = await Item.countDocuments({ owner: userId, status: 'active' });

        const userBookingsAsOwner = await Booking.countDocuments({ owner: userId });
        const userBookingsAsRenter = await Booking.countDocuments({ renter: userId });

        const totalEarnings = await Booking.aggregate([
            { $match: { owner: userId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$pricing.totalPrice' } } }
        ]);

        const pendingRequests = await Booking.countDocuments({
            owner: userId,
            status: 'pending'
        });

        res.json({
            items: {
                total: userItemsCount,
                active: activeItemsCount
            },
            bookings: {
                asOwner: userBookingsAsOwner,
                asRenter: userBookingsAsRenter,
                total: userBookingsAsOwner + userBookingsAsRenter
            },
            earnings: totalEarnings[0]?.total || 0,
            pendingRequests
        });

    } catch (error) {
        console.error('Erreur récupération stats utilisateur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
    }
});

// Vérifier la disponibilité d'un objet
app.get('/api/items/:id/availability', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const itemId = req.params.id;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Les dates de début et de fin sont requises' });
        }

        const conflictingBooking = await Booking.findOne({
            item: itemId,
            status: { $in: ['pending', 'confirmed', 'active'] },
            $or: [
                {
                    'dates.startDate': { $lte: new Date(endDate) },
                    'dates.endDate': { $gte: new Date(startDate) }
                }
            ]
        });

        res.json({
            available: !conflictingBooking,
            conflictingBooking: conflictingBooking ? {
                startDate: conflictingBooking.dates.startDate,
                endDate: conflictingBooking.dates.endDate
            } : null
        });

    } catch (error) {
        console.error('Erreur vérification disponibilité:', error);
        res.status(500).json({ message: 'Erreur lors de la vérification de la disponibilité' });
    }
});

// ==================== MIDDLEWARE DE GESTION D'ERREURS ====================

// Middleware pour les routes non trouvées (API)
app.use('/api/*', (req, res) => {
    res.status(404).json({
        message: 'Route API non trouvée',
        path: req.originalUrl,
        method: req.method
    });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
    console.error('🚨 Erreur serveur:', err);

    // Erreur de validation Mongoose
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).json({
            message: 'Données invalides',
            errors
        });
    }

    // Erreur de duplication (unique constraint)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            message: `${field} existe déjà`,
            field
        });
    }

    // Erreur JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            message: 'Token invalide'
        });
    }

    // Erreur JWT expiré
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            message: 'Token expiré'
        });
    }

    // Erreur CastError (ObjectId invalide)
    if (err.name === 'CastError') {
        return res.status(400).json({
            message: 'ID invalide'
        });
    }

    // Erreur générique
    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur interne',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Pour toutes les autres routes, servir index.html (pour le routing côté client)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ==================== DÉMARRAGE DU SERVEUR ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
🚀 Serveur LocMaroc démarré avec succès!
📍 URL: http://localhost:${PORT}
📊 Health check: http://localhost:${PORT}/api/health
🗄️  Base de données: ${mongoose.connection.readyState === 1 ? '✅ Connectée' : '❌ Déconnectée'}
🌍 Environnement: ${process.env.NODE_ENV || 'development'}

📋 Points d'accès disponibles:
   👤 Inscription: http://localhost:${PORT}/register
   🔐 Connexion: http://localhost:${PORT}/login
   🏠 Tableau de bord: http://localhost:${PORT}/dashboard
   📦 Ajouter un objet: http://localhost:${PORT}/add-item
   🗂️  Mes objets: http://localhost:${PORT}/my-items
   📅 Mes réservations: http://localhost:${PORT}/bookings
   👤 Mon profil: http://localhost:${PORT}/profile

🔗 Routes API principales:
   POST /api/auth/register - Inscription
   POST /api/auth/login - Connexion
   GET  /api/auth/profile - Profil utilisateur
   
   GET  /api/items - Liste des objets
   POST /api/items - Créer un objet
   PUT  /api/items/:id - Modifier un objet
   DELETE /api/items/:id - Supprimer un objet
   GET  /api/items/user/my-items - Objets de l'utilisateur
   
   POST /api/bookings - Créer une réservation
   GET  /api/bookings/my-bookings - Réservations de l'utilisateur
   PUT  /api/bookings/:id/accept - Accepter une réservation
   PUT  /api/bookings/:id/reject - Refuser une réservation
   PUT  /api/bookings/:id/cancel - Annuler une réservation
    `);
});

// Gestion gracieuse de l'arrêt
process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt du serveur en cours...');
    await mongoose.connection.close();
    console.log('✅ Base de données déconnectée');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Arrêt du serveur demandé...');
    await mongoose.connection.close();
    console.log('✅ Base de données déconnectée');
    process.exit(0);
});

export default app;