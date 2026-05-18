const express    = require('express');
const router     = express.Router();
const ejsLayouts = require('express-ejs-layouts');
const Worker     = require('../models/Worker');

// Apply express-ejs-layouts ONLY for this router
router.use(ejsLayouts);
router.use((req, res, next) => {
  res.locals.layout = 'layouts/main';
  next();
});

router.get('/', async (req, res) => {
  try {
    const workers = await Worker.find({ isOnSale: true })
      .sort({ discountPercent: -1, rating: -1 });

    const workersWithDiscount = workers.map(w => {
      const obj = w.toObject();
      obj.discountedPrice = Math.round(w.price * (1 - w.discountPercent / 100));
      return obj;
    });

    res.render('onsale', {
      title: 'On-Discount Workers',
      workers: workersWithDiscount,
      totalWorkers: workersWithDiscount.length
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load on-sale workers.');
    res.redirect('/workers');
  }
});

module.exports = router;
