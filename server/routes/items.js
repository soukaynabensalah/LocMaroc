import express from 'express';
import { Item } from '../models/Item.js';
import { User } from '../models/User.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

// GET - Récupérer tous les objets (avec filtres)
router.get('/', async (req, res) => {
    try {
        const {
            category,
            city,
            maxPrice,
            search,
            page = 1,
            limit = 12,
            sort = 'newest'
        } = req.query;

        console.log('🔍 Paramètres de recherche:', req.query);

        let filter = { status: 'active' };

        // Filtre par catégorie
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Filtre par ville
        if (city) {
            filter['location.city'] = new RegExp(city, 'i');
        }

        // Filtre par prix
        if (maxPrice && maxPrice !== 'all') {
            filter.pricePerDay = { $lte: parseFloat(maxPrice) };
        }

        // Recherche textuelle
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        // Gestion du tri
        let sortOptions = { createdAt: -1 };
        if (sort === 'price-low') sortOptions = { pricePerDay: 1 };
        if (sort === 'price-high') sortOptions = { pricePerDay: -1 };
        if (sort === 'popular') sortOptions = { views: -1 };

        console.log('🔍 Filtres appliqués:', filter);
        console.log('🔍 Options de tri:', sortOptions);

        const items = await Item.find(filter)
            .populate('owner', 'firstName lastName trustScore')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Item.countDocuments(filter);

        console.log(`✅ ${items.length} objets trouvés sur ${total}`);

        res.json({
            items,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('❌ Erreur récupération items:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des objets',
            error: error.message
        });
    }
});

// GET - Récupérer un objet spécifique
router.get('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id)
            .populate('owner', 'firstName lastName trustScore phone email createdAt');

        if (!item) {
            return res.status(404).json({ message: 'Objet non trouvé' });
        }

        // Incrémenter le compteur de vues
        item.views += 1;
        await item.save();

        res.json(item);
    } catch (error) {
        console.error('Erreur récupération item:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'objet' });
    }
});

// POST - Créer un nouvel objet (protégé)
router.post('/', authMiddleware, async (req, res) => {
    try {
        console.log('📦 Tentative de création d\'objet:', req.body);

        const itemData = {
            ...req.body,
            owner: req.user._id
        };

        console.log('📦 Données de l\'objet:', itemData);

        const item = new Item(itemData);
        await item.save();

        console.log('✅ Objet créé avec succès:', item._id);

        res.status(201).json({
            message: 'Objet créé avec succès',
            item: {
                _id: item._id,
                title: item.title,
                description: item.description,
                category: item.category,
                pricePerDay: item.pricePerDay,
                deposit: item.deposit,
                location: item.location,
                condition: item.condition,
                status: item.status,
                owner: {
                    _id: req.user._id,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName
                },
                images: item.images,
                features: item.features,
                specifications: item.specifications,
                views: item.views,
                rentalCount: item.rentalCount,
                createdAt: item.createdAt
            }
        });
    } catch (error) {
        console.error('❌ Erreur création item:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: 'Données invalides',
                errors
            });
        }

        res.status(500).json({
            message: 'Erreur lors de la création de l\'objet',
            error: error.message
        });
    }
});

// GET - Récupérer les objets d'un utilisateur (protégé)
router.get('/user/my-items', authMiddleware, async (req, res) => {
    try {
        console.log('🔍 Récupération des objets pour l\'utilisateur:', req.user._id);

        const items = await Item.find({ owner: req.user._id })
            .sort({ createdAt: -1 });

        console.log(`✅ ${items.length} objets trouvés pour l'utilisateur ${req.user._id}`);

        // Formater la réponse pour inclure les infos de base de l'owner
        const itemsWithOwner = items.map(item => ({
            ...item.toObject(),
            owner: {
                _id: req.user._id,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                trustScore: req.user.trustScore
            }
        }));

        res.json(itemsWithOwner);
    } catch (error) {
        console.error('❌ Erreur récupération items utilisateur:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération de vos objets',
            error: error.message
        });
    }
});

// PUT - Mettre à jour un objet (protégé)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Objet non trouvé' });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (item.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Non autorisé à modifier cet objet' });
        }

        const updates = { ...req.body, updatedAt: Date.now() };
        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.json({
            message: 'Objet mis à jour avec succès',
            item: {
                ...updatedItem.toObject(),
                owner: {
                    _id: req.user._id,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName
                }
            }
        });
    } catch (error) {
        console.error('Erreur mise à jour item:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: 'Données invalides',
                errors
            });
        }

        res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'objet' });
    }
});

// DELETE - Supprimer un objet (protégé)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Objet non trouvé' });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (item.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Non autorisé à supprimer cet objet' });
        }

        await Item.findByIdAndDelete(req.params.id);

        res.json({ message: 'Objet supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression item:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'objet' });
    }
});

export { router as itemRoutes };