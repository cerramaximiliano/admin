const express = require('express');
const router = express.Router();

const usersRoutes = require('./users');
const tasasRoutes = require('./tasas');
const scrapingRoutes = require('./scraping');

router.use('/users', usersRoutes);
router.use('/tasas', tasasRoutes);
router.use('/scraping', scrapingRoutes);

module.exports = router;