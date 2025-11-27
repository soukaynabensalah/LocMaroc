import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true
    },
    renter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dates: {
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        totalDays: {
            type: Number,
            required: true
        }
    },
    pricing: {
        pricePerDay: Number,
        totalPrice: Number,
        deposit: Number,
        serviceFee: Number,
        totalAmount: Number
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'],
        default: 'pending'
    },
    payment: {
        paymentIntentId: String,
        status: {
            type: String,
            enum: ['pending', 'succeeded', 'failed', 'refunded'],
            default: 'pending'
        },
        amount: Number,
        currency: {
            type: String,
            default: 'MAD'
        }
    },
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    review: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        createdAt: Date
    },
    cancellationReason: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware pour calculer le nombre de jours et le prix total
bookingSchema.pre('save', function (next) {
    if (this.dates.startDate && this.dates.endDate) {
        const diffTime = Math.abs(this.dates.endDate - this.dates.startDate);
        this.dates.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (this.pricing.pricePerDay) {
            this.pricing.totalPrice = this.pricing.pricePerDay * this.dates.totalDays;
            this.pricing.serviceFee = this.pricing.totalPrice * 0.10; // 10% de frais de service
            this.pricing.totalAmount = this.pricing.totalPrice + this.pricing.serviceFee;
        }
    }
    this.updatedAt = Date.now();
    next();
});

export const Booking = mongoose.model('Booking', bookingSchema);