var ComponentsModule = angular.module("sg.module.components", ["algoliasearch", "ui.bootstrap"]);

ComponentsModule.factory('$localstorage', ['$window', function($window) {
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
}]);

ComponentsModule.factory('cart', ['$localstorage', '$http', function($localstorage, $http) {

  //var cart_keys = {}
  var cart = {};

  cart.items = $localstorage.getObject('cart');
  cart.isopen = false;

  cart.addItem = function(item) {
    //console.log(item);
    $http.post(layer_path + 'store/cart', {
      "id": item._id,
      "vendor": "spartangeek"
    }, {
      withCredentials: true
    }).then(function success(response) {
      //console.log(response);
      cart.isopen = true;
      var added = false;
      for(var i = 0; i < cart.items.length; i++) {
        if(item._id == cart.items[i]._id) {
          added = true;
          cart.items[i].quantity++;
          cart.persist();
          break;
        }
      }
      if(!added) {
        var new_item = {
          _id: item._id,
          name: item.name,
          full_name: item.full_name,
          slug: item.slug,
          price: item.store.vendors.spartangeek.price,
          quantity: 1,
          image: item.image,
          type: item.type
        }
        cart.items.push(new_item);
        cart.persist();
      }
      //console.log(cart);
    }, function(error) {
      console.log(error);
    })
  };

  cart.removeItem = function(item) {
    $http.delete(layer_path + 'store/cart/' + item._id, {
      withCredentials: true
    }).then(function success(response) {
      for(var i = 0; i < cart.items.length; i++) {
        if(item._id == cart.items[i]._id) {
          if(cart.items[i].quantity > 1) {
            cart.items[i].quantity--;
          } else {
            cart.items.splice(i, 1);
          }
          cart.persist();
          break;
        }
      }
    }, function(error) {
      console.log(error);
    });
  };

  cart.empty = function() {
    cart.items = [];
    cart.persist();
  }

  cart.getIndividualShippingFee = function(item) {
    if(item.type == 'case') {
      return 320;
    } else {
      for(var i = 0; i < cart.items.length; i++) {
        if(cart.items[i].type != 'case') {
          return 60;
        }
      }
      return 120;
    }
  }

  cart.replaceItems = function(new_items) {
    cart.items = new_items;
    cart.persist();
  }

  cart.getShippingFee = function() {
    if(cart.items.length > 0) {
      var non_case_count = 0;
      var case_count = 0;
      for(var i = 0; i < cart.items.length; i++) {
        if(cart.items[i].type == 'case') {
          case_count += cart.items[i].quantity;
        } else {
          non_case_count += cart.items[i].quantity;
        }
      }
      if(non_case_count > 0) {
        return 120 + (non_case_count - 1) * 60 + 320 * case_count;
      } else {
        return 320 * case_count;
      }
    } else {
      return 0;
    }
  }

  cart.getCount = function() {
    if(cart.items.length > 0) {
      var total = 0;
      for(var i = 0; i < cart.items.length; i++) {
        total += cart.items[i].quantity;
      }
      return total;
    } else {
      return 0;
    }
  }

  cart.getTotal = function() {
    if(cart.items.length > 0) {
      var total = 0;
      for(var i = 0; i < cart.items.length; i++) {
        total += cart.items[i].quantity * cart.items[i].price;
      }
      return total;
    } else {
      return 0;
    }
  }

  cart.persist = function() {
    // Use local storage to persist data
    $localstorage.setObject('cart', cart.items);
  };

  return cart;
}]);

ComponentsModule.factory("ComponentsService", function(algolia) {

  var client = algolia.Client('5AO6WVBTY2', '46253cb75bbb7b4e031d41cda14c2426');
  var index = client.initIndex('prod_store');

  return {
    algoliaClient: client,
    index: index
  };
});

ComponentsModule.controller('ComponentsController', ['$scope', '$timeout', 'ComponentsService', '$route', function($scope, $timeout, ComponentsService, $route) {

  $scope.onlyStore = false;
  if($scope.location.path().indexOf('tienda') > -1) {
    $scope.onlyStore = true;
  }

  $scope.results = [];
  $scope.query = '';
  $scope.loading = false;
  $scope.fetching = true;

  $scope.totalItems = 10;
  $scope.currentPage = 1;
  $scope.itemsPerPage = 36;

  $scope.facets = {};

  $scope.type_labels = {
    'cpu': 'Procesadores',
    'motherboard': 'Tarjetas Madre',
    'case': 'Gabinetes',
    'video-card': 'Tarjetas de Video',
    'storage': 'Almacenamiento',
    'memory': 'Memorias RAM',
    'cpu-cooler': 'Enfriamiento para CPU',
    'monitor': 'Monitores',
    'power-supply': 'Fuentes de Poder'
  }

  $scope.current_facet = '';

  $scope.change_facet = function(new_facet) {
    $scope.current_facet = new_facet;
    $scope.currentPage = 1;
    $scope.changePage();
  }

  $scope.getFacetFilters = function() {
    if($scope.onlyStore) {
      return [
        'type:' + $scope.current_facet,
        'activated: true'
      ];
    } else {
      return [ 'type:' + $scope.current_facet ];
    }
  }

  $scope.reset = function() {
    ComponentsService.index.search('', {
      page: 0,
      hitsPerPage:
      $scope.itemsPerPage,
      facets: '*',
      facetFilters: $scope.getFacetFilters()
    })
    .then(function(response) {
      //console.log(response);
      $scope.results = response;
      $scope.totalItems = response.nbHits;
      $scope.facets = response.facets;
    });
  }
  $scope.reset();

  $scope.changePage = function() {
    ComponentsService.index.search($scope.query, {
      page: $scope.currentPage - 1,
      hitsPerPage: $scope.itemsPerPage,
      facets: '*',
      facetFilters: $scope.getFacetFilters()
    })
    .then(function(response) {
      $scope.results = response;
      $scope.totalItems = response.nbHits;
      $scope.facets = response.facets;
    });
  };

  $scope.$watch("onlyStore", function(newVal, oldVal) {
    if($scope.onlyStore) {
      $scope.location.path('/componentes/tienda');
    } else {
      $scope.location.path('/componentes');
    }
    $scope.changePage();
  });

  $scope.do = function(event) {
    if(event.keyCode == 27) {
      $scope.query = '';
    }

    if($scope.query != '')
    {
      if($scope.loading) $timeout.cancel($scope.loading);

      $scope.fetching = true;
      $scope.loading = $timeout(function() {
        ComponentsService.index.search($scope.query, {
          page: 0,
          hitsPerPage: $scope.itemsPerPage,
          facets: '*',
          facetFilters: $scope.getFacetFilters()
        })
        .then(function searchSuccess(response) {
            //console.log(response);
            $scope.results = response;
            $scope.totalItems = response.nbHits;
            $scope.facets = response.facets;

          }, function searchFailure(err) {
            console.log(err);
          });
        $scope.fetching = false;
      }, 500); // delay in ms
    }
    else
    {
      $scope.reset();
    }
  };

  // Hack, so we don't have to reload the controller if the route uses the same controller
  var lastRoute = $route.current;
  $scope.$on('$locationChangeSuccess', function(event) {
    if(lastRoute.$$route.controller === $route.current.$$route.controller) {
      // Will not load only if my view use the same controller
      // We recover new params
      new_params = $route.current.params;
      $route.current = lastRoute;
      $route.current.params = new_params;
      if($scope.location.path().indexOf('tienda') > -1) {
        $scope.onlyStore = true;
      } else {
        $scope.onlyStore = false;
      }
    }
  });
}]);

ComponentsModule.controller('ComponentController', ['$scope', '$routeParams', '$http', 'cart', function($scope, $routeParams, $http, cart){

  //window.localStorage.removeItem('cart');
  //console.log(window.localStorage.getItem('cart'));

  $scope.component = {};
  //$scope.cart = cart;

  $scope.type_labels = {
    'cpu': 'Procesador',
    'motherboard': 'Tarjeta Madre',
    'case': 'Gabinete',
    'video-card': 'Tarjeta de Video',
    'storage': 'Almacenamiento',
    'memory': 'Memoria RAM',
    'cpu-cooler': 'Enfriamiento para CPU',
    'monitor': 'Monitor',
    'power-supply': 'Fuente de Poder'
  };

  $scope.categories_map = {
    'cpu': '55d3e4f868a631006400000b',
    'motherboard': '55d3e56e68a631006000000b',
    'case': '55dc13e03f6ba10067000000',
    'video-card': '55d3e55768a631006400000c',
    'storage': '55dc13ab3f6ba1005d000003',
    'memory': '55d3e58168a631005c000017',
    'cpu-cooler': '55dc13ca3f6ba1005d000004',
    'monitor': '55dc13f93f6ba1005d000005',
    'power-supply': '55dca5893f6ba10067000013'
  };

  $scope.questions = [];

  $scope.question = {
    content: '',
    publishing: false,
    content_error: false,
    show_editor: false
  }

  $scope.post = {
    title: '',
    content: '',
    category: ''
  };

  $scope.add_question = function() {
    $scope.question.publishing = true;

    // Check that the user wrote a question
    $scope.question.content_error = false;
    if($scope.question.content == "") {
      $scope.question.content_error = true;
      $scope.question.publishing = false;
      return;
    }

    // if the user wrote his/her question... just publish it
    $scope.post.title = "Duda sobre " + ($scope.component.full_name || $scope.component.name);
    $scope.post.content = $scope.question.content;
    $scope.post.category = $scope.categories_map[$scope.component.type];

    var post = {
      content: $scope.post.content,
      name: $scope.post.title,
      category: $scope.post.category,
      kind: 'category-post',
      isquestion: true,
      pinned: false
    };

    $http.post(layer_path + 'post', post).then(function(response) {
      //console.log(response);
      $scope.new_post = response.data.post;
      // relate post to component
      //POST  /v1/posts/:id/relate/:related_id
      $http.post(layer_path + 'posts/' + response.data.post.id + '/relate/' + $scope.component._id).then(function success() {
        var new_question = {
          slug: $scope.new_post.slug,
          content: $scope.post.content,
          id: $scope.new_post.id
        };
        $scope.questions.push(new_question);

        $scope.question.publishing = false;
        $scope.question.content = '';
        $scope.question.show_editor = false;
      }, function(error){

      });
    }, function(err) {
      console.log(err);
    });
  }

  $http.get(layer_path + "component/" + $routeParams.slug).then(function success(response){
    //console.log(response.data);
    $scope.component = response.data;
    $http.get(layer_path + "component/" + $scope.component._id + "/posts").then(function success(response){
      //console.log(response.data);
      if(response.data) {
        $scope.questions = response.data;
      }
    }, function(error){});

  }, function error(response){
    if(response.status == 404) {
      window.location.href = "/";
    }
  });
}]);

ComponentsModule.controller('PcBuilderController', ['$scope', function($scope) {

}]);

ComponentsModule.controller('CheckoutController', ['$scope', 'cart', '$http', '$timeout', function($scope, cart, $http, $timeout) {
  $scope.currentStep = "cart";

  // Flags
  $scope.f = {
    verify_cart: false,
    error_messages: {
      totals: false
    },
    trying_to_pay: false
  };

  $scope.payer = {
    name: '',
    surname: ''
  };

  $scope.shipping_form = {
    alias: '',
    name: '',
    phone_number: '',
    address: '',
    zip_code: '',
    state: "Distrito Federal",
    city: '',
    neighborhood: '',
    extra: {
      between_street_1: '',
      between_street_2: '',
      reference: ''
    }
  };

  $scope.current_addresses = {
    count: 0,
    addresses: []
  };

  $scope.selected_address = null;

  $scope.status = ''

  $scope.addresses_loaded = false;

  $scope.pay_method = {
    value: 'withdrawal'
  }

  $scope.current_token_error = '';
  $scope.token_errors = {
    "invalid_expiry_month": "El mes de expiración de tu tarjeta es inválido",
    "invalid_expiry_year": "El año de expiración de tu tarjeta es inválido",
    "invalid_cvc": "El código de seguridad (CVC) de tu tarjeta es inválido",
    "incorrect_number": "El número de tarjeta es inválido"
  };
  $scope.current_charge_error = '';
  $scope.charge_errors = {
    "gateway-incorrect-num": "El número de tarjeta es incorrecto",
    "gateway-invalid-num": "El número de tarjeta es inválido",
    "gateway-invalid-exp-m": "El mes de expiración de tu tarjeta es inválido",
    "gateway-invalid-exp-y": "El año de expiración de tu tarjeta es inválido",
    "gateway-invalid-cvc": "El código de seguridad (CVC) de tu tarjeta es inválido",
    "gateway-expired-card": "La tarjeta que estás usando está expirada.",
    "gateway-incorrect-cvc": "El código de seguridad (CVC) es incorrecto",
    "gateway-incorrect-zip": "No se pudo realizar el cobro a tu tarjeta",
    "gateway-card-declined": "La tarjeta fue declinada por el banco",
    "gateway-stripe-missing": "No se puedo realizar el cobro a tu tarjeta",
    "gateway-processing-err": "Error al procesar tu tarjeta"
  }

  $scope.validateCart = function() {
    $scope.f.verify_cart = true;
    $http.get(layer_path + 'store/cart', {
      withCredentials: true
    }).then(function success(response){
      //console.log(response);
      for(var i = 0; i < response.data.length; i++) {
        response.data[i]._id = response.data[i].id;
      }
      cart.replaceItems(response.data);
      //console.log(cart);
      $scope.f.verify_cart = false;
    }, function(error){
      console.log(error);
    });
  };
  $scope.validateCart();

  // After getting Stripe token, we make our API call
  // to try to make the charge
  $scope.createToken = function(status, response) {
    $scope.current_token_error = '';
    $scope.current_charge_error = '';
    if(status == 402) {
      console.log(status, response);
      $scope.current_token_error = response.error.code;
    } else {
      //console.log(response.id);
      $scope.makeOrder(response.id);
    }
  };

  // General purpose order processor
  $scope.makeOrder = function(token) {
    token = (typeof token === 'undefined') ? false : token;

    var meta = {};
    if(token) {
      meta = { token: token }
    }

    var gateways = {
      'withdrawal': 'offline',
      'credit_card': 'stripe'
    }

    $scope.f.error_messages.totals = false;
    $scope.f.trying_to_pay = true;

    $http.post(layer_path + 'store/checkout', {
      "gateway": gateways[$scope.pay_method.value],
      "meta": meta,
      "ship_to": $scope.selected_address.id,
      "total": cart.getTotal() + cart.getShippingFee() + $scope.getPaymentFee()
    }, {
      withCredentials: true
    }).then(function success(response) {
      cart.empty();
      $scope.currentStep = "completed";
    }, function(error){
      console.log(error);
      if(error.data.key == "bad-total") {
        $scope.f.error_messages.totals = true;
        $scope.currentStep = "cart";
        $scope.validateCart();
      } else {
        $scope.current_charge_error = error.data.key;
      }
      $scope.f.trying_to_pay = false;
    });
  }

  $scope.getPaymentFee = function() {
    if($scope.pay_method.value == 'withdrawal') {
      return 0;
    } else {
      if($scope.pay_method.value == 'credit_card') {
        return Math.ceil( (cart.getTotal() + cart.getShippingFee()) * 0.042 + 4 );
      } else {
        return Math.ceil( (cart.getTotal() + cart.getShippingFee()) * 0.04 + 4 );
      }
    }
  }

  $scope.createAddress = function() {
    $scope.status = ''

    if($scope.shipping_form.name == '' || $scope.shipping_form.phone_number == '' || $scope.shipping_form.address == '' || $scope.shipping_form.zip_code == ''
    || $scope.shipping_form.state == '' || $scope.shipping_form.city == '' || $scope.shipping_form.neighborhood == '' || $scope.shipping_form.alias == '') {
      $scope.status = 'incomplete';
      return;
    }

    var extra = ''
    if($scope.shipping_form.extra.between_street_1 != '' && $scope.shipping_form.extra.between_street_2 != '') {
      extra += 'Entre calle ' + $scope.shipping_form.extra.between_street_1 + ' y calle ' + $scope.shipping_form.extra.between_street_2 + '. ';
    }
    extra += $scope.shipping_form.extra.reference;

    var new_address = {
      name: $scope.shipping_form.alias,
      state: $scope.shipping_form.state,
      city: $scope.shipping_form.city,
      postal_code: $scope.shipping_form.zip_code,
      line1: $scope.shipping_form.address,
      line2: '',
      extra: extra,
      phone: $scope.shipping_form.phone_number,
      neighborhood: $scope.shipping_form.neighborhood,
      recipient: $scope.shipping_form.name
    };

    $http.post(layer_path + 'store/customer/address', new_address).then(function success(response){
      console.log(response);

      $scope.selected_address = $scope.shipping_form;
      $scope.selected_address.id = response.data.address_id;

      $scope.shipping_form = {
        alias: '',
        name: '',
        phone_number: '',
        address: '',
        zip_code: '',
        state: "Distrito Federal",
        city: '',
        neighborhood: '',
        extra: {
          between_street_1: '',
          between_street_2: '',
          reference: ''
        }
      };

      $scope.current_addresses.addresses.push($scope.selected_address);
      $scope.current_addresses.count++;

      $scope.status = 'paying';
      $scope.currentStep = "payment";


    }, function(error) {
      console.log(error);
    });
  };

  $scope.deleteAddress = function(address) {
    var index = $scope.current_addresses.addresses.indexOf(address);

    if(index > -1) {
      $http.delete(layer_path + 'store/customer/address/' + address.id).then(function success(response){
        $scope.current_addresses.addresses.splice(index, 1);
        $scope.current_addresses.count--;
      }, function(error) {
        console.log(error);
      });
    }
  }

  $scope.goToCart = function() {
    $scope.currentStep = "cart";
  }

  $scope.goToShipping = function() {
    if(!$scope.addresses_loaded) {
      $http.get(layer_path + 'store/customer').then(function success(response){
        //console.log(response);
        var addresses = response.data.addresses;
        $scope.current_addresses.addresses = [];

        if(addresses) {
          $scope.current_addresses.count = addresses.length;

          for(var i = 0; i < addresses.length; i++) {
            var a = {
              alias: addresses[i].alias,
              name: addresses[i].recipient,
              id: addresses[i].id,
              phone_number: addresses[i].phone,
              address: addresses[i].address.line1,
              zip_code: addresses[i].address.postal_code,
              state: addresses[i].address.state,
              city: addresses[i].address.city,
              neighborhood: addresses[i].address.line3,
              extra: {
                between_street_1: '',
                between_street_2: '',
                reference: addresses[i].address.extra
              }
            };
            $scope.current_addresses.addresses.push(a);
          }
        }
      }, function(error){
        console.log(error);
      });
      $scope.addresses_loaded = true;
    }
    $scope.currentStep = "address";
  }

  $scope.goToPay = function(address) {
    $scope.selected_address = address;
    $scope.currentStep = "payment";
  }
}]);