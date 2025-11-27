import express from 'express';
import { Booking } from '../models/Booking.js';
import { Item } from '../models/Item.js';
import { User } from '../models/User.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

// Créer une demande de réservation
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { itemId, startDate, endDate, message } = req.body;

        console.log('📦 Nouvelle demande de réservation:', { itemId, startDate, endDate });

        // Vérifier que l'item existe
        const item = await Item.findById(itemId).populate('owner');
        if (!item) {
            return res.status(404).json({ message: 'Objet non trouvé' });
        }

        // Empêcher de louer son propre objet
        if (item.owner._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Vous ne pouvez pas louer votre propre objet' });
        }

        // Vérifier que l'objet est disponible
        if (item.status !== 'active') {
            return res.status(400).json({ message: 'Cet objet n\'est pas disponible à la location' });
        }

        // Vérifier la disponibilité pour les dates
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

        if (conflictingBooking) {
            return res.status(400).json({ message: 'L\'objet n\'est pas disponible pour ces dates' });
        }

        // Calculer le nombre de jours
        const start = new Date(startDate);
        const end = new Date(endDate);
        const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (totalDays < 1) {
            return res.status(400).json({ message: 'La durée de location doit être d\'au moins 1 jour' });
        }

        // Créer la réservation
        const booking = new Booking({
            item: itemId,
            renter: req.user._id,
            owner: item.owner._id,
            dates: {
                startDate: start,
                endDate: end,
                totalDays: totalDays
            },
            pricing: {
                pricePerDay: item.pricePerDay,
                deposit: item.deposit,
                totalPrice: item.pricePerDay * totalDays,
                serviceFee: (item.pricePerDay * totalDays) * 0.10,
                totalAmount: (item.pricePerDay * totalDays) * 1.10
            },
            messages: message ? [{
                sender: req.user._id,
                message: message
            }] : []
        });

        await booking.save();

        // Populer les données pour la réponse
        await booking.populate([
            { path: 'item', select: 'title images pricePerDay deposit location' },
            { path: 'renter', select: 'firstName lastName' },
            { path: 'owner', select: 'firstName lastName' }
        ]);

        console.log('✅ Réservation créée:', booking._id);

        res.status(201).json({
            message: 'Demande de réservation envoyée avec succès',
            booking
        });

    } catch (error) {
        console.error('❌ Erreur création réservation:', error);
        res.status(500).json({
            message: 'Erreur lors de la création de la réservation',
            error: error.message
        });
    }
});

// Accepter une réservation
router.put('/:id/accept', authMiddleware, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('item renter owner');

        if (!booking) {
            return res.status(404).json({ message: 'Réservation non trouvée' });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (booking.owner._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Cette réservation ne peut pas être acceptée' });
        }

        booking.status = 'confirmed';
        await booking.save();

        console.log('✅ Réservation acceptée:', booking._id);

        res.json({
            message: 'Réservation acceptée avec succès',
            booking
        });

    } catch (error) {
        console.error('❌ Erreur acceptation réservation:', error);
        res.status(500).json({ message: 'Erreur lors de l\'acceptation de la réservation' });
    }
});

// Refuser une réservation
router.put('/:id/reject', authMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Réservation non trouvée' });
        }

        if (booking.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Cette réservation ne peut pas être refusée' });
        }

        booking.status = 'rejected';
        if (reason) booking.cancellationReason = reason;
        await booking.save();

        console.log('❌ Réservation refusée:', booking._id);

        res.json({
            message: 'Réservation refusée',
            booking
        });

    } catch (error) {
        console.error('❌ Erreur refus réservation:', error);
        res.status(500).json({ message: 'Erreur lors du refus de la réservation' });
    }
});

// Annuler une réservation
router.put('/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Réservation non trouvée' });
        }

        // Vérifier que l'utilisateur est le locataire ou le propriétaire
        const isRenter = booking.renter.toString() === req.user._id.toString();
        const isOwner = booking.owner.toString() === req.user._id.toString();

        if (!isRenter && !isOwner) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        if (!['pending', 'confirmed'].includes(booking.status)) {
            return res.status(400).json({ message: 'Cette réservation ne peut pas être annulée' });
        }

        booking.status = 'cancelled';
        if (reason) booking.cancellationReason = reason;
        await booking.save();

        console.log('🚫 Réservation annulée:', booking._id);

        res.json({
            message: 'Réservation annulée',
            booking
        });

    } catch (error) {
        console.error('❌ Erreur annulation réservation:', error);
        res.status(500).json({ message: 'Erreur lors de l\'annulation de la réservation' });
    }
});

// Récupérer les réservations d'un utilisateur
router.get('/my-bookings', authMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.find({
            $or: [
                { renter: req.user._id },
                { owner: req.user._id }
            ]
        })
            .populate('item', 'title images pricePerDay location')
            .populate('renter', 'firstName lastName')
            .populate('owner', 'firstName lastName')
            .sort({ createdAt: -1 });

        console.log(`📊 ${bookings.length} réservations trouvées pour l'utilisateur ${req.user._id}`);

        res.json(bookings);

    } catch (error) {
        console.error('❌ Erreur récupération réservations:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des réservations' });
    }
});

// Récupérer une réservation spécifique
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('item', 'title images pricePerDay deposit location')
            .populate('renter', 'firstName lastName email phone')
            .populate('owner', 'firstName lastName email phone');

        if (!booking) {
            return res.status(404).json({ message: 'Réservation non trouvée' });
        }

        // Vérifier que l'utilisateur a accès à cette réservation
        const isRenter = booking.renter._id.toString() === req.user._id.toString();
        const isOwner = booking.owner._id.toString() === req.user._id.toString();

        if (!isRenter && !isOwner) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        res.json(booking);

    } catch (error) {
        console.error('❌ Erreur récupération réservation:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de la réservation' });
    }
});

export { router as bookingRoutes };