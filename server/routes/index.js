const express = require('express');
const router = express.Router();

const usersRoutes = require('./users');
const tasasRoutes = require('./tasas');

router.use('/users', usersRoutes);
router.use('/tasas', tasasRoutes);

module.exports = router;