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

ComponentsModule.factory('cart', ['$localstorage', '$http', 'AclService', function($localstorage, $http, AclService) {

  //var cart_keys = {}
  var cart = {};

  cart.items = $localstorage.getObject('cart');
  cart.isopen = false;

  cart.addItem = function(item, in_store) {
    var id = item.id;
    if(in_store) {
      id = item.product_id;
    }
    //console.log(item);
    if(AclService.can('debug')) console.log("Adding item...");
    $http.post(layer_path + 'store/cart', {
      "id": id,
      //"vendor": "spartangeek"
    }, {
      withCredentials: true
    }).then(function success(response) {
      if(AclService.can('debug')) console.log(response);
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
          type: item.type,
          product_id: item.product_id
        };
        cart.items.push(new_item);
        cart.persist();
      }
      //console.log(cart);
    }, function(error) {
      if(AclService.can('debug')) console.log(error);
    })
  };

  cart.removeItem = function(item) {
    $http.delete(layer_path + 'store/cart/' + item.id, {
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
    if(item.category == 'case') {
      return 320;
    } else {
      for(var i = 0; i < cart.items.length; i++) {
        if(cart.items[i].category != 'case') {
          return 60;
        }
      }
      return 139;
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
        if(cart.items[i].category == 'case') {
          case_count += cart.items[i].quantity;
        } else {
          non_case_count += cart.items[i].quantity;
        }
      }
      if(non_case_count > 0) {
        return 139 + (non_case_count - 1) * 60 + 320 * case_count;
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

ComponentsModule.controller('ComponentsController', ['$scope', '$timeout', '$http', '$route', '$location', '$routeParams', function($scope, $timeout, $http, $route, $location, $routeParams) {

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
  if($routeParams.type) {
    $scope.current_facet = $routeParams.type;
  }

  var searchObject = $location.search();
  if(searchObject.search) {
    $scope.query = searchObject.search;
  }

  $scope.change_facet = function(new_facet) {
    //console.log(new_facet);
    $scope.current_facet = new_facet;
    $scope.currentPage = 1;
    $scope.changePage();

    // Change path
    var new_path = '/componentes/';
    if($scope.onlyStore) {
      new_path += 'tienda/'
    }
    new_path += new_facet;
    $location.path(new_path);
    dataLayer.push({
      'event': 'VirtualPageview',
      'virtualPageURL': new_path,
    });
    //console.log('Track', new_path);
  }

  $scope.getPayload = function() {
    var payload = {
      offset: ($scope.currentPage-1)*$scope.itemsPerPage,
      limit: $scope.itemsPerPage
    };
    // Add query to payload
    if($scope.query != '') {
      payload.q = $scope.query;
    }
    // Add the type if applies
    if($scope.onlyStore) {
      payload.type = 'component';
    }
    // Add the facet filter
    if($scope.current_facet != '') {
      payload.category = $scope.current_facet;
    }
    return payload;
  };

  $scope.getPromise = function() {
    if($scope.onlyStore) {
      return $http.get(layer_path + 'search/products', {
        params: $scope.getPayload()
      });
    } else {
      return $http.get(layer_path + 'search/components', {
        params: $scope.getPayload()
      });
    }
  }

  $scope.reset = function() {
    if($scope.can('debug')) console.log("Reset running...");
    $scope.getPromise()
    .then(function(response) {
      //console.log(response);
      $scope.results = response.data.results;
      $scope.totalItems = response.data.total;
      $scope.facets = response.data.facets;
    }, function(error) {console.log(error);});
  }

  $scope.changePage = function() {
    $scope.getPromise()
    .then(function(response) {
      //console.log(response);
      $scope.results = response.data.results;
      $scope.totalItems = response.data.total;
      $scope.facets = response.data.facets;
    }, function(error) {console.log(error);});
  };

  $scope.$watch("onlyStore", function(newVal, oldVal) {
    if($scope.onlyStore) {
      $scope.location.path('/componentes/tienda/' + $scope.current_facet);
    } else {
      $scope.location.path('/componentes/' + $scope.current_facet);
    }
    dataLayer.push({
      'event': 'VirtualPageview',
      'virtualPageURL': $location.path()
    });
    $scope.changePage();
  });

  $scope.do = function(event) {
    if(event.keyCode == 27) {
      $scope.query = '';
    }
    $location.search('search', $scope.query);
    if($scope.query != '')
    {
      if($scope.loading) $timeout.cancel($scope.loading);

      $scope.fetching = true;
      $scope.loading = $timeout(function() {
        $scope.getPromise()
        .then(function searchSuccess(response) {
          //console.log(response);
          $scope.results = response.data.results;
          $scope.totalItems = response.data.total;
          $scope.facets = response.data.facets;
        }, function (error) {
          console.log(error);
        });
        $scope.fetching = false;
      }, 500); // delay in ms
    }
    else
    {
      $scope.reset();
    }
  };

  $http.get(layer_path + "store/product/evga-gtx-950-acx").then(function success(response) {
    $scope.evga_price = response.data.massdrop.price;
  }, function(error){
    console.log(error);
  });

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

ComponentsModule.controller('ComponentController', ['$scope', '$routeParams', '$http', 'cart', '$timeout', function($scope, $routeParams, $http, cart, $timeout) {

  $scope.component = {};

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

  // We use this to post to board when question is asked
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
      is_question: true,
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
  $scope.popularLabel = function() {
    if($scope.populometro == 0 && $scope.component.stats['component-buy'].total == 0)
      return "Sé el primero en opinar";
    else if($scope.populometro < 40)
      return "No es atractivo";
    else if($scope.populometro < 70)
      return "Poco atractivo";
    else if($scope.populometro < 90)
      return "Atractivo";
    else
      return "Muy atractivo";
  }
  var getCurrentRating = function(){
    if($scope.component.stats['component-buy'].total) {
      var t = $scope.component.stats['component-buy'].maybe * 1 + $scope.component.stats['component-buy'].yes * 2 + $scope.component.stats['component-buy'].wow * 3;
      var tt = $scope.component.stats['component-buy'].total * 2.5;
      if(t > tt) return 100;
      return t*100/tt;
    } else {
      return 0;
    }
  }
  $scope.setWouldBuy = function(value) {
    if(!$scope.user.isLogged) {
      $scope.signIn();
    } else {
      //console.log($scope.component.stats['component-buy']);
      switch($scope.component.votes['component-buy']) {
        case 'no':
            $scope.component.stats['component-buy'].no -= 1;
            break;
        case 'maybe':
            $scope.component.stats['component-buy'].maybe -= 1;
            break;
        case 'yes':
            $scope.component.stats['component-buy'].yes -= 1;
            break;
        case 'wow':
            $scope.component.stats['component-buy'].wow -= 1;
            break;
        default:
          $scope.component.stats['component-buy'].total++;
            break;
      }
      $scope.component.votes['component-buy'] = value;
      $http.post(layer_path + 'user/own/component-buy/' + $scope.component._id, {
        "status": $scope.component.votes['component-buy']
      }).then(function success(response){
        console.log(response.data);
      });
      switch(value) {
        case 'no':
            $scope.component.stats['component-buy'].no += 1;
            break;
        case 'maybe':
            $scope.component.stats['component-buy'].maybe += 1;
            break;
        case 'yes':
            $scope.component.stats['component-buy'].yes += 1;
            break;
        case 'wow':
            $scope.component.stats['component-buy'].wow += 1;
            break;
        default:
            break;
      }
      $scope.populometro = getCurrentRating();
      //console.log($scope.component.stats['component-buy']);
    }
  }

  /* Owning methods */
  $scope.setOwning = function() {
    if(!$scope.user.isLogged) {
      $scope.signIn();
    } else {
      $http.post(layer_path + 'user/own/component/' + $scope.component._id, {
        "status": $scope.component.votes.component
      }).then(function success(response){
        if($scope.component.votes['component-buy'] == null){
          $scope.setWouldBuy('yes');
        }
      }, function(error) {
        $scope.component.votes.component = null;
        console.log("Error", error);
      });
    }
  }

  // Initialize component viewing
  $http.get(layer_path + "component/" + $routeParams.slug).then(function success(response){
    if($scope.can('debug')) console.log(response.data);
    $scope.component = response.data;

    if($scope.component.store && $scope.component.store.vendors.spartangeek.price_before) {
      $scope.component.store.vendors.spartangeek.price_save = 100 - ($scope.component.store.vendors.spartangeek.price * 100 / $scope.component.store.vendors.spartangeek.price_before);
    }

    $scope.populometro = getCurrentRating();
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
      if($scope.can('debug')) console.log(response);
      /*for(var i = 0; i < response.data.length; i++) {
        response.data[i]._id = response.data[i].id;
      }*/
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

ComponentsModule.controller('MassdropController', ['$scope', '$http', '$timeout', '$uibModal', function($scope, $http, $timeout, $uibModal) {

  $scope.interested = function() {
    $http.put(layer_path + 'store/product/' + $scope.product_id + '/massdrop').then(function success(response){
      //console.log(response.data);
      $scope.massdrop.interested = response.data.interested;
      if(response.data.interested) {
        $scope.massdrop.count_interested++;
      } else {
        $scope.massdrop.count_interested--;
      }
    }, function(error){
      console.log(error);
    });
  }

  $scope.interestedDialog = function() {
    var modalInstance = $uibModal.open({
      templateUrl: '/js/partials/massdrop-interested.html',
      controller: 'InterestedController',
      size: 'sm',
      resolve: {
        product_id: function () {
          return $scope.product_id;
        },
        massdrop: function () {
          return $scope.massdrop;
        }
      }
    });

    modalInstance.result.then(function(massdrop) {
      $scope.massdrop = massdrop;
    }, function() {
      //$log.info('Modal dismissed at: ' + new Date());
    });
  };

  // Initialize component viewing
  $http.get(layer_path + "store/product/evga-gtx-950-acx").then(function success(response){
    //console.log(response.data);
    $scope.product_id = response.data.id;
    var massdrop = response.data.massdrop;
    var max = timespan = 0;
    for(var i in massdrop.checkpoints) {
      if(massdrop.checkpoints[i].ends > max) {
        max = massdrop.checkpoints[i].ends;
      }
      if(!massdrop.checkpoints[i].done && timespan == 0) {
        timespan = massdrop.checkpoints[i].timespan;
      }
    }
    massdrop.timespan = timespan;
    for(var i in massdrop.checkpoints) {
      massdrop.checkpoints[i].from_right = (max - massdrop.checkpoints[i].starts) / max * 100;
    }

    massdrop.reservations_width = massdrop.count_reservations / max * 100;
    if(massdrop.reservations_width > 100) {
      massdrop.reservations_width = 100;
    }
    massdrop.interested_width = massdrop.count_interested / max * 100;
    if(100 - massdrop.reservations_width < massdrop.interested_width) {
      massdrop.interested_width = 100 - massdrop.reservations_width;
    }
    massdrop.interested = (massdrop.current == "interested") || (massdrop.current == "reservation");
    $scope.massdrop = massdrop;
    //console.log($scope.massdrop);
    $scope.product = response.data.attributes;

    var a = Date.now();
    var b = new Date(massdrop.deadline);
    var difference = Math.round( Math.round((b - a) / 1000) / 60);

    $scope.counter = {
      hours: Math.floor(difference / 60),
      minutes: difference % 60
    };

    if ($scope.counter.hours < 1 && $scope.counter.minutes < 1) {
      massdrop.active = false;
    }

    $scope.countdown = function() {
      stopped = $timeout(function() {
        console.log($scope.counter);
        if($scope.counter.minutes == 0) {
          if($scope.counter.hours > 0){
            $scope.counter.hours--;
            $scope.counter.minutes = 59;
          }
        } else {
          $scope.counter.minutes--;
        }
        $scope.countdown();
      }, 60*1000);
    };
    $scope.countdown();

    $('.btn-twitter').click(function(event) {
      var width  = 575,
          height = 280,
          left   = ($(window).width()  - width)  / 2,
          top    = ($(window).height() - height) / 2,
          url    = this.href,
          opts   = 'status=1' +
                   ',width='  + width  +
                   ',height=' + height +
                   ',top='    + top    +
                   ',left='   + left;
      window.open(url, 'twitter', opts);
      return false;
    });

    $scope.share_fb = function(url) {
      window.open('https://www.facebook.com/sharer/sharer.php?u='+url,'facebook-share-dialog',"width=626,height=436")
    }

  }, function(error){});
}]);

ComponentsModule.controller('MassdropPayController', ['$scope', '$http', function($scope, $http) {
  // Flags
  $scope.f = {
    verify_cart: false,
    error_messages: {
      totals: false
    },
    trying_to_pay: false,
    understand: false,
    quantity: 1
  };

  $scope.payer = {
    name: '',
    surname: ''
  };

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

  $scope.currentStep = 'pay';
  $scope.price_per_unit = 2500;

  $scope.getPaymentFee = function() {
    if($scope.pay_method.value == 'withdrawal') {
      return 0;
    } else {
      if($scope.pay_method.value == 'credit_card') {
        return Math.ceil( ($scope.f.quantity * $scope.price_per_unit) * 0.042 + 4 );
      } else {
        return Math.ceil( ($scope.f.quantity * $scope.price_per_unit) * 0.04 + 4 );
      }
    }
  }

  $scope.doPay = function() {
    document.getElementById("stripe-form").submit();
  }

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

    $http.post(layer_path + 'store/checkout/massdrop', {
      "gateway": gateways[$scope.pay_method.value],
      "meta": meta,
      "quantity": parseInt($scope.f.quantity),
      "product_id": $scope.product_id
      //"ship_to": $scope.selected_address.id,
      //"total": cart.getTotal() + cart.getShippingFee() + $scope.getPaymentFee()
    }, {
      withCredentials: true
    }).then(function success(response) {
      //cart.empty();
      $scope.currentStep = "completed";
    }, function(error){
      console.log(error);
      if(error.data.key == "bad-total") {
        $scope.f.error_messages.totals = true;
        $scope.currentStep = "pay";
        //$scope.validateCart();
      } else {
        $scope.current_charge_error = error.data.key;
      }
      $scope.f.trying_to_pay = false;
    });
  }

  $http.get(layer_path + "store/product/evga-gtx-950-acx").then(function success(response){
    //console.log(response.data);
    $scope.product_id = response.data.id;
  }, function(error){
    console.log(error);
  })
}]);

ComponentsModule.controller('InterestedController', ['$scope', '$http', '$uibModalInstance', 'product_id', 'massdrop',
  function($scope, $http, $uibModalInstance, product_id, massdrop) {
    $scope.form = {
      reference: ''
    };

    $scope.product_id = product_id;
    $scope.massdrop = massdrop;

    $scope.interested = function() {
      $http.put(layer_path + 'store/product/' + $scope.product_id + '/massdrop', {
        'reference': $scope.form.reference
      }).then(function success(response){
        //console.log(response.data);
        $scope.massdrop.interested = response.data.interested;
        if(response.data.interested) {
          $scope.massdrop.count_interested++;
        } else {
          $scope.massdrop.count_interested--;
        }
        $uibModalInstance.close($scope.massdrop);
      }, function(error){
        console.log(error);
      });
    }

}]);