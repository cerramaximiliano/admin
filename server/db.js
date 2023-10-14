const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

    mongoose.connect(process.env.URLDB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    const db = mongoose.connection;

    let collections = {};
    db.on('error', (error) => {
            console.log(`Database error: ${error}`);
        });
    db.once('open', async () => {
            console.log(`Database online`);
            collections.Users = db.db.collection('usuarios');
            collections.Tasas = db.db.collection('tasas');
            return collections;
    });
    collections.Users = db.collection('usuarios');
    collections.Tasas = db.collection('tasas');

module.exports = {db, collections};




