/**
 * createAdmin.js
 * Run once to create the admin user in MongoDB Atlas.
 * Usage: node createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');

const ADMIN_EMAIL    = 'admin@workerfinder.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME     = 'WorkerFinder Admin';

async function main() {
    try {
        console.log('🔌  Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅  Connected.\n');

        // Check if admin already exists
        const existing = await User.findOne({ email: ADMIN_EMAIL });
        if (existing) {
            console.log('⚠️  Admin user already exists:');
            console.log('   Email:', existing.email);
            console.log('   Role: ', existing.role);
            await mongoose.disconnect();
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

        // Create admin
        const admin = await User.create({
            name:     ADMIN_NAME,
            email:    ADMIN_EMAIL,
            password: hashedPassword,
            role:     'admin'
        });

        console.log('🎉  Admin user created successfully!');
        console.log('─────────────────────────────────');
        console.log('   Name    :', admin.name);
        console.log('   Email   :', admin.email);
        console.log('   Password:', ADMIN_PASSWORD);
        console.log('   Role    :', admin.role);
        console.log('─────────────────────────────────');
        console.log('\n🚀  You can now log in at http://localhost:3000/login');

    } catch (err) {
        console.error('❌  Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌  Disconnected from MongoDB.');
    }
}

main();
