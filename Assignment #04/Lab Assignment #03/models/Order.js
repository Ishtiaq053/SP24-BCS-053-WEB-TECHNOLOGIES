const mongoose = require('mongoose');

// ─── Order Item Sub-Schema ─────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema(
    {
        workerId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'Worker',
            required: [true, 'Worker ID is required']
        },
        workerName: {
            type:     String,
            required: [true, 'Worker name is required'],
            trim:     true
        },
        price: {
            type:     Number,
            required: [true, 'Price is required'],
            min:      [0, 'Price cannot be negative']
        },
        quantity: {
            type:    Number,
            default: 1,
            min:     [1, 'Quantity must be at least 1']
        }
    },
    { _id: false }   // no separate _id for each item
);

// ─── Order Schema ──────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
    {
        user: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'User reference is required']
        },
        items: {
            type:     [orderItemSchema],
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message:   'Order must contain at least one item'
            }
        },
        totalAmount: {
            type:     Number,
            required: [true, 'Total amount is required'],
            min:      [0, 'Total amount cannot be negative']
        },
        status: {
            type:    String,
            enum:    ['pending', 'confirmed', 'completed', 'cancelled'],
            default: 'pending'
        },
        notes: {
            type:    String,
            trim:    true,
            default: ''
        }
    },
    {
        timestamps: true   // adds createdAt + updatedAt automatically
    }
);

module.exports = mongoose.model('Order', orderSchema);
