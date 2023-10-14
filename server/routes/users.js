const express = require('express');
const router = express.Router();
const {login, findByEmail, getAllUsers} = require('../handlers/usersHandler');

router.post('/login', login);
router.get('/:email', findByEmail);
router.get('/', getAllUsers);


module.exports = router;