const express = require('express');
const path = require('path');
const app = express();
require('dotenv').config();  // add this as the very first line of server.js

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/places', require('./api/places'));

app.listen(3000, () => {
  console.log('AasPaas running at http://localhost:3000');
});