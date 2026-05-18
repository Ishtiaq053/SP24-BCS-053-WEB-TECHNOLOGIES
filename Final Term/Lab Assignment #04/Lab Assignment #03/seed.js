require('dotenv').config();
const mongoose = require('mongoose');
const Worker   = require('./models/Worker');

// ── 25 seed workers ──────────────────────────────────────────────────────────
const workers = [
    // Plumbing
    { name: 'Ahmed Raza',       category: 'Plumbing',    price: 800,  rating: 4.8, stock: 1, experience: 8,  location: 'Lahore',     description: 'Expert in pipe fitting, leak repairs, and bathroom installations.', jobsDone: 134, verified: true  },
    { name: 'Tariq Mehmood',    category: 'Plumbing',    price: 600,  rating: 4.2, stock: 0, experience: 4,  location: 'Karachi',    description: 'Residential and commercial plumbing, available 24/7.',               jobsDone: 78,  verified: false },
    { name: 'Sajid Ali',        category: 'Plumbing',    price: 700,  rating: 4.5, stock: 1, experience: 6,  location: 'Islamabad',  description: 'Specialises in water heater repair and bathroom renovation.',         jobsDone: 102, verified: true  },

    // Electrical
    { name: 'Bilal Hussain',    category: 'Electrical',  price: 900,  rating: 4.9, stock: 1, experience: 10, location: 'Lahore',     description: 'Licensed electrician — wiring, panel upgrades, solar installation.',  jobsDone: 210, verified: true  },
    { name: 'Zain ul Abideen', category: 'Electrical',  price: 750,  rating: 4.3, stock: 1, experience: 5,  location: 'Multan',     description: 'Home wiring, inverter installation, and generator repair.',            jobsDone: 89,  verified: true  },
    { name: 'Faisal Iqbal',     category: 'Electrical',  price: 650,  rating: 3.9, stock: 0, experience: 3,  location: 'Rawalpindi', description: 'Affordable electrical services for small homes and apartments.',       jobsDone: 45,  verified: false },

    // Carpentry
    { name: 'Usman Ghani',      category: 'Carpentry',   price: 1100, rating: 4.7, stock: 1, experience: 12, location: 'Lahore',     description: 'Custom furniture, wooden flooring, and kitchen cabinet expert.',       jobsDone: 167, verified: true  },
    { name: 'Hassan Nawaz',     category: 'Carpentry',   price: 850,  rating: 4.4, stock: 1, experience: 7,  location: 'Peshawar',   description: 'Door frames, windows, and bespoke wooden furniture.',                 jobsDone: 95,  verified: false },
    { name: 'Kamran Ashraf',    category: 'Carpentry',   price: 950,  rating: 4.1, stock: 0, experience: 9,  location: 'Karachi',    description: 'Skilled in antique restoration and modern interior woodwork.',         jobsDone: 130, verified: true  },

    // Painting
    { name: 'Nadeem Baig',      category: 'Painting',    price: 700,  rating: 4.6, stock: 1, experience: 11, location: 'Lahore',     description: 'Interior and exterior painting, texture work, and waterproofing.',   jobsDone: 188, verified: true  },
    { name: 'Asim Malik',       category: 'Painting',    price: 550,  rating: 3.8, stock: 1, experience: 3,  location: 'Gujranwala', description: 'Budget-friendly painting service for apartments and small homes.',    jobsDone: 42,  verified: false },
    { name: 'Waqas Ahmed',      category: 'Painting',    price: 800,  rating: 4.5, stock: 0, experience: 8,  location: 'Islamabad',  description: 'Premium wall paint, 3D texture, and epoxy floor coating.',            jobsDone: 115, verified: true  },

    // Cleaning
    { name: 'Muhammad Imran',   category: 'Cleaning',    price: 500,  rating: 4.3, stock: 1, experience: 5,  location: 'Lahore',     description: 'Deep cleaning, sofa steam, and carpet shampooing.',                  jobsDone: 220, verified: true  },
    { name: 'Shahid Pervez',    category: 'Cleaning',    price: 450,  rating: 4.0, stock: 1, experience: 4,  location: 'Karachi',    description: 'Office cleaning, move-in/out cleaning and sanitisation.',             jobsDone: 98,  verified: false },
    { name: 'Rana Adeel',       category: 'Cleaning',    price: 600,  rating: 4.7, stock: 0, experience: 6,  location: 'Rawalpindi', description: 'Specialised kitchen degreasing and bathroom deep clean.',              jobsDone: 143, verified: true  },

    // Driving
    { name: 'Junaid Akhtar',    category: 'Driving',     price: 400,  rating: 4.5, stock: 1, experience: 7,  location: 'Lahore',     description: 'Professional driver — family trips, airport transfers, outstation.',  jobsDone: 305, verified: true  },
    { name: 'Rizwan Haider',    category: 'Driving',     price: 350,  rating: 4.2, stock: 1, experience: 5,  location: 'Islamabad',  description: 'Reliable daily commute driver with clean record.',                    jobsDone: 198, verified: false },
    { name: 'Sohail Butt',      category: 'Driving',     price: 500,  rating: 4.8, stock: 0, experience: 10, location: 'Karachi',    description: 'VIP and corporate driving service, fully insured.',                   jobsDone: 412, verified: true  },

    // Gardening
    { name: 'Arshad Ullah',     category: 'Gardening',   price: 550,  rating: 4.4, stock: 1, experience: 9,  location: 'Lahore',     description: 'Lawn care, hedge trimming, plant nursery, and landscaping.',         jobsDone: 87,  verified: true  },
    { name: 'Daniyal Yousaf',   category: 'Gardening',   price: 480,  rating: 4.0, stock: 1, experience: 4,  location: 'Multan',     description: 'Seasonal planting, irrigation setup, and garden maintenance.',        jobsDone: 56,  verified: false },
    { name: 'Fahad Zubair',     category: 'Gardening',   price: 620,  rating: 4.6, stock: 0, experience: 7,  location: 'Islamabad',  description: 'Rooftop garden design, vertical green walls, and terrace plants.',    jobsDone: 73,  verified: true  },

    // AC & Repair
    { name: 'Hamza Qureshi',    category: 'AC & Repair', price: 950,  rating: 4.9, stock: 1, experience: 11, location: 'Lahore',     description: 'AC installation, gas charging, coil cleaning, and PCB repair.',      jobsDone: 245, verified: true  },
    { name: 'Talha Siddiqui',   category: 'AC & Repair', price: 800,  rating: 4.5, stock: 1, experience: 8,  location: 'Karachi',    description: 'Split AC and inverter AC specialist, warranty on all work.',          jobsDone: 178, verified: true  },
    { name: 'Omar Farooq',      category: 'AC & Repair', price: 700,  rating: 4.2, stock: 0, experience: 6,  location: 'Faisalabad', description: 'Refrigerator, washing machine, and AC repair at your doorstep.',      jobsDone: 122, verified: false },
    { name: 'Saad Rehman',      category: 'AC & Repair', price: 1050, rating: 4.7, stock: 1, experience: 13, location: 'Rawalpindi', description: 'Industrial HVAC systems, duct cleaning, and commercial AC repair.',   jobsDone: 199, verified: true  }
];

// ── Connect and seed ─────────────────────────────────────────────────────────
(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅  Connected to MongoDB');

        // Clear existing workers
        await Worker.deleteMany({});
        console.log('🗑️   Cleared existing workers');

        // Insert all workers
        const inserted = await Worker.insertMany(workers);
        console.log(`🌱  Seeded ${inserted.length} workers successfully`);

        mongoose.connection.close();
        console.log('🔒  Connection closed. Done!');
    } catch (err) {
        console.error('❌  Seed error:', err.message);
        process.exit(1);
    }
})();
