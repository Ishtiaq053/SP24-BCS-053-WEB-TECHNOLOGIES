require('dotenv').config();
const mongoose = require('mongoose');
const Worker   = require('../models/Worker');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const workers = await Worker.find({});
  const discounts = [10, 15, 20, 25, 30];
  let count = 0;
  for (let i = 0; i < workers.length; i++) {
    if (i % 2 === 0) {
      await Worker.findByIdAndUpdate(workers[i]._id, {
        isOnSale: true,
        discountPercent: discounts[count % discounts.length]
      });
      count++;
    }
  }
  console.log(`✅ Marked ${count} workers as on-sale.`);
  await mongoose.disconnect();
}
run().catch(console.error);
