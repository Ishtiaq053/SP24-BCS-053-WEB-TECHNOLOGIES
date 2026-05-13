const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Worker name is required'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Hourly rate is required'],
        min: 0
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Driving', 'Gardening', 'AC & Repair']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    stock: {
        type: Number,
        default: 1   // 1 = available, 0 = busy
    },
    experience: {
        type: Number,
        default: 0   // years of experience
    },
    location: {
        type: String,
        default: 'Lahore'
    },
    description: {
        type: String,
        default: ''
    },
    jobsDone: {
        type: Number,
        default: 0
    },
    verified: {
        type: Boolean,
        default: false
    },
    image: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Worker', workerSchema);
