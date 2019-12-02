'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var shopApi = require('./api/shop');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/shop/shop-api', shopApi);

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + server.address().port);
});