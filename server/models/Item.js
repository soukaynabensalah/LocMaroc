import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre est obligatoire'],
        trim: true,
        maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
    },
    description: {
        type: String,
        required: [true, 'La description est obligatoire'],
        maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
    },
    category: {
        type: String,
        required: [true, 'La catégorie est obligatoire'],
        enum: {
            values: ['outils', 'high-tech', 'loisirs', 'maison', 'sport', 'vehicules', 'autres'],
            message: 'Catégorie invalide'
        }
    },
    pricePerDay: {
        type: Number,
        required: [true, 'Le prix par jour est obligatoire'],
        min: [0, 'Le prix ne peut pas être négatif']
    },
    deposit: {
        type: Number,
        required: [true, 'La caution est obligatoire'],
        min: [0, 'La caution ne peut pas être négative']
    },
    images: [{
        url: String,
        publicId: String
    }],
    location: {
        address: {
            type: String,
            required: [true, 'L\'adresse est obligatoire']
        },
        city: {
            type: String,
            required: [true, 'La ville est obligatoire']
        },
        postalCode: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    availability: {
        startDate: Date,
        endDate: Date,
        isAvailable: {
            type: Boolean,
            default: true
        }
    },
    features: [String],
    condition: {
        type: String,
        enum: {
            values: ['neuf', 'tres-bon-etat', 'bon-etat', 'etat-correct'],
            message: 'État invalide'
        },
        default: 'bon-etat'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'rented'],
        default: 'active'
    },
    specifications: {
        brand: String,
        model: String,
        dimensions: String,
        weight: Number,
        material: String
    },
    rentalCount: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware pour mettre à jour updatedAt
itemSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index pour les recherches
itemSchema.index({ title: 'text', description: 'text' });
itemSchema.index({ category: 1, status: 1 });
itemSchema.index({ owner: 1 });

export const Item = mongoose.model('Item', itemSchema);