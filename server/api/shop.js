'use strict';

var _ = require('lodash');
var express = require('express');
var cors = require('cors');
var axios = require("axios");
var router = express.Router();

var dailyExchangeRatesTable = null;
var exchangeRatesTableRequest = null;

router.all("*", cors());

function roundCostValue(cost) {
    return Math.round(cost * 100) / 100;
}

function exchange(from, to, val) {
    var rate = _.get(
        dailyExchangeRatesTable, [from, to], 0
    );
    return rate * val;
}

function createDailyExchangeRatesTable(response) {
    return {
        USD: {
            RUR: _.get(response, "USD.Value", 0),
            EUR: _.get(response, "USD.Value", 0) / _.get(response, "EUR.Value", 1)
        },
        RUR: {
            USD: 1 / _.get(response, "USD.Value", 1),
            EUR: 1 / _.get(response, "EUR.Value", 1)
        },
        EUR: {
            RUR: _.get(response, "EUR.Value", 0),
            USD: _.get(response, "EUR.Value", 0) / _.get(response, "USD.Value", 1)
        }
    };
}

function calculateProductCosts(goodsInCart) {
    var productCosts = {
        totalCount: 0,
        totalCost: {
            USD: 0,
            RUR: 0,
            EUR: 0
        }
    };

    return _.reduce(goodsInCart, function (productCosts, product) {
        var price = _.get(product, "base.price", 0);
        var quantity = _.get(product, "quantity", 0);
        var productCurrency = _.get(product, "base.currency", "unknown");

        if (_.has(productCosts.totalCost, productCurrency)) {
            productCosts.totalCount += quantity;
            productCosts.totalCost[productCurrency] += price * quantity;
        }
        return productCosts;

    }, productCosts);
}

function getCartCostByCurrencies(goodsInCart) {
    var productCosts = calculateProductCosts(goodsInCart);

    var costInUSD =
        productCosts.totalCost["USD"] + exchange("RUR", "USD", productCosts.totalCost["RUR"]) + exchange("EUR", "USD", productCosts.totalCost["EUR"]);
    var costInRUR =
        productCosts.totalCost["RUR"] + exchange("USD", "RUR", productCosts.totalCost["USD"]) + exchange("EUR", "RUR", productCosts.totalCost["EUR"]);
    var costInEUR =
        productCosts.totalCost["EUR"] + exchange("USD", "EUR", productCosts.totalCost["USD"]) + exchange("RUR", "EUR", productCosts.totalCost["RUR"]);

    return {
        USD: roundCostValue(costInUSD),
        RUR: roundCostValue(costInRUR),
        EUR: roundCostValue(costInEUR),
        totalCount: productCosts.totalCount
    };
}

function loadDailyExchangeRates() {
    if (exchangeRatesTableRequest == null || exchangeRatesTableRequest.isCbrXmlDailyError === true) {
        exchangeRatesTableRequest = axios.get('https://www.cbr-xml-daily.ru/daily_json.js');
    }

    exchangeRatesTableRequest
        .then(function (exchr) {
            if (dailyExchangeRatesTable == null) {
                dailyExchangeRatesTable = createDailyExchangeRatesTable(exchr.data.Valute);
            }
        })
        .catch(function (err) {
            dailyExchangeRatesTable = null;
            exchangeRatesTableRequest.isCbrXmlDailyError = true;
        });

    return exchangeRatesTableRequest;
}

router.get('/exchange-rates', function (req, res) {
    loadDailyExchangeRates()
        .then(function () {
            res.send(dailyExchangeRatesTable);
        })
        .catch(function () {
            res.status(503).send('Service Unavailable (cbr-xml-daily)');
        });
});

router.post('/calc-user-cart', function (req, res) {

    var goodsInCart = req.body;

    if (!_.isArray(goodsInCart)) {
        res.status(400).send('Bad Request');
        return;
    }

    loadDailyExchangeRates()
        .then(function () {
            res.send(getCartCostByCurrencies(goodsInCart));
        })
        .catch(function () {
            res.status(503).send('Service Unavailable (cbr-xml-daily)');
        });
});

module.exports = router;