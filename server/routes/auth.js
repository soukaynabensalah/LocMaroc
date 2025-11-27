import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();

// Inscription
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;

        // Validation des données
        if (!firstName || !lastName || !email || !phone || !password) {
            return res.status(400).json({
                message: 'Tous les champs sont obligatoires'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'Le mot de passe doit contenir au moins 6 caractères'
            });
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: 'Un utilisateur avec cet email existe déjà'
            });
        }

        // Créer un nouvel utilisateur (le mot de passe sera hashé par le middleware)
        const user = new User({
            firstName,
            lastName,
            email,
            phone,
            password
        });

        await user.save();

        // Générer le token JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'votre_secret_jwt_super_securise',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({
            message: 'Erreur lors de la création du compte',
            error: error.message
        });
    }
});

// Connexion
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation des données
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email et mot de passe sont requis'
            });
        }

        // Trouver l'utilisateur
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Vérifier le mot de passe
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                message: 'Email ou mot de passe incorrect'
            });
        }

        // Générer le token JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'votre_secret_jwt_super_securise',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({
            message: 'Erreur lors de la connexion',
            error: error.message
        });
    }
});

// Middleware d'authentification
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Token d\'authentification manquant' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt_super_securise');
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Token invalide' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token invalide' });
    }
};

// Route protégée pour récupérer le profil utilisateur
router.get('/profile', authMiddleware, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            phone: req.user.phone,
            createdAt: req.user.createdAt
        }
    });
});

// Export nommé du router et du middleware
export { router as authRoutes, authMiddleware };