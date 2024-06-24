const express = require('express');
const app = express();

app.use('/throwExampleError', require('./routes/throwExampleError'));

app.use('/allegroAuth', require('./routes/allegroAuth'));
app.use('/fetchOffers', require('./routes/offerManagement'));
app.use('/status', require('./routes/status'));


app.use(require('./middlewares/handleNotFound'));
app.use(require('./middlewares/handleInternalServerError'));

module.exports = app;