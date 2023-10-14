const express = require('express');
const router = express.Router();
const {searchByDate, getLastDate,getByDate, getAllTasas} = require('../handlers/tasasHandler');

router.get('/search', searchByDate);
router.get('/last', getLastDate)
router.get('/:date', getByDate)
router.get('/', getAllTasas)

module.exports = router;