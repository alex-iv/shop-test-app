<template>
  <div>
    <div class="container">
      <nav class="navbar navbar-light bg-light">
        <a class="navbar-brand" href="#">Shop</a>
      </nav>
      <h4>Корзина</h4>
      <div class="row">
        <div class="col col-lg-12">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Название</th>
                <th>Валюта</th>
                <th>Цена</th>
                <th>Удалить/Добавить</th>
                <th>Количество</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in goods" :key="item.id">
                <td>{{ item.name }}</td>
                <td>
                  <select v-model="item.currency" v-on:change="onCurrencyChange(item)">
                    <option value="USD">USD</option>
                    <option value="RUR">RUR</option>
                    <option value="EUR">EUR</option>
                  </select>
                </td>
                <td>{{ item.price == null ? item.base.price : item.price }}</td>
                <td>
                  <button type="button" class="btn btn-light" v-on:click="onDeleteItem(item)">-</button>
                  <button type="button" class="btn btn-light" v-on:click="onAppendItem(item)">+</button>
                </td>
                <td>{{ item.quantity }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td>Общее количество товаров:</td>
                <td id="totalStars">{{ totalCount }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="col offset-lg-10 col-lg-2">
          <button
            id="calculate"
            type="button"
            class="btn btn-block btn-primary"
            v-on:click="onCalculateCart"
          >Посчитать</button>
        </div>
      </div>
    </div>
    <!-- Flexbox container for aligning the toasts -->
    <div
      id="el"
      aria-live="polite"
      aria-atomic="true"
      class="d-flex justify-content-center align-items-center"
      style="min-height: 200px;"
    >
      <!-- Then put toasts within -->
      <div
        class="toast"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style="position: absolute; top: 10px; right: auto; min-width: 300px;"
      >
        <div class="toast-header">
          <strong class="mr-auto">Общая стоимость товаров в корзине в разных валютах</strong>
          <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="toast-body" v-html="userCartCostsByCurrenciesMessage"></div>
      </div>
    </div>
  </div>
</template>

<script>
import _ from "lodash";
import $ from "jquery";
import axios from "axios";
import config from "../config/index";

export default {
  name: "App",
  data: function() {
    return {
      dailyExchangeRatesTable: null,
      userCartCostsByCurrenciesMessage: "",
      goods: [
        {
          id: "1",
          name: "Ноутбук",
          price: null,
          currency: "USD",
          quantity: 0,
          base: {
            currency: "USD",
            price: 1000
          }
        },
        {
          id: "2",
          name: "Телевизор",
          price: null,
          currency: "RUR",
          quantity: 0,
          base: {
            currency: "RUR",
            price: 64000
          }
        },
        {
          id: "3",
          name: "Игровая приставка",
          price: null,
          currency: "EUR",
          quantity: 0,
          base: {
            currency: "EUR",
            price: 350
          }
        }
      ],
      totalCount: 0
    };
  },
  created: function() {
    for (let item of this.goods) {
      this.totalCount += item.quantity;
    }
  },
  mounted: function() {
    $(".toast").toast({ autohide: false });
  },
  methods: {
    recalculatePrice: function(product) {
      if (product.base.currency == product.currency) {
        product.price = product.base.price;
      } else {
        let exchangeRate = _.get(
          this.dailyExchangeRatesTable,
          [product.base.currency, product.currency],
          null
        );

        if (exchangeRate != null) {
          product.price = product.base.price * exchangeRate;
          product.price = Math.round(product.price * 100) / 100;
        }
      }
    },
    onDeleteItem: function(item) {
      if (item.quantity > 0) {
        item.quantity--;
        this.totalCount--;
      }
    },
    onAppendItem: function(item) {
      item.quantity++;
      this.totalCount++;
    },
    onCurrencyChange: function(product) {
      var self = this;

      if (self.dailyExchangeRatesTable == null) {
        axios
          .get(config.serverUrl + "/shop/shop-api/exchange-rates")
          .then(function(response) {
            self.dailyExchangeRatesTable = response.data;
            self.recalculatePrice(product);
          })
          .catch(function(err) {
            console.log(err);
          });
      } else {
        self.recalculatePrice(product);
      }
    },
    onCalculateCart: function() {
      var self = this;
      let data = _.chain(this.goods)
        .filter(item => item.quantity != 0)
        .value();
      axios
        .post(config.serverUrl + "/shop/shop-api/calc-user-cart", data)
        .then(function(res) {
          self.userCartCostsByCurrenciesMessage =
            "Всего товаров: " +
            res.data["totalCount"] +
            "<br />" +
            "USD: " +
            res.data["USD"] +
            "<br />" +
            "RUR: " +
            res.data["RUR"] +
            "<br />" +
            "EUR: " +
            res.data["EUR"] +
            "<br />";
          $(".toast").toast("show");
        })
        .catch(function(err) {
          console.log(err);
        });
    }
  }
};
</script>

<style>
.navbar {
  margin-bottom: 20px;
}
</style>
