spartan_store.factory('$localstorage', ['$window', function($window) {
    return {
        set: function(key, value) {

            $window.localStorage[key] = value;
        },
        get: function(key, defaultValue) {

            return $window.localStorage[key] || defaultValue;
        },
        setObject: function(key, value) {

            $window.localStorage[key] = JSON.stringify(value);
        },
        getObject: function(key) {

            return JSON.parse($window.localStorage[key] || '[]');
        }
    }
}])

spartan_store.factory('cart', function($localstorage) {

  var cart_keys = {}
  var cart = {};

  cart.items = $localstorage.getObject('cart');
  cart.items_keys = $localstorage.getObject('cart_keys');

  cart.addItem = function(item) {
    cart.items.push(item);
    cart.persist();
  };

  cart.remove = function(key) {
    cart.items.splice(key, 1);
    cart.persist();
  };

  cart.persist = function() {

    // Use local storage to persist data
    $localstorage.setObject('cart', cart.items);
  };

  return cart;
});