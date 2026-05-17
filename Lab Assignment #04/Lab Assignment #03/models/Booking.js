const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        worker: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'Worker',
            required: [true, 'Worker reference is required']
        },
        customer: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Customer reference is required']
        },
        // Denormalized fields for stable display even if worker/user changes
        workerName:     { type: String, required: true, trim: true },
        workerCategory: { type: String, required: true },
        workerPrice:    { type: Number, required: true },   // price per hour at time of booking
        customerName:   { type: String, required: true, trim: true },
        customerEmail:  { type: String, required: true },

        bookingDate: {
            type:     Date,
            required: [true, 'Booking date is required']
        },
        hours: {
            type:     Number,
            required: [true, 'Number of hours is required'],
            min:      [1,  'Minimum 1 hour'],
            max:      [24, 'Maximum 24 hours']
        },
        totalAmount: {
            type:     Number,
            required: [true, 'Total amount is required'],
            min:      [0,    'Total cannot be negative']
        },
        notes: {
            type:    String,
            trim:    true,
            default: ''
        },
        status: {
            type:    String,
            enum:    ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
