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

ComponentsModule.factory('cart', ['$localstorage', function($localstorage) {

  //var cart_keys = {}
  var cart = {};

  cart.items = $localstorage.getObject('cart');
  //cart.items_keys = $localstorage.getObject('cart_keys');

  cart.addItem = function(item) {
    console.log(item);
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
        price: item.store.prices.spartangeek,
        quantity: 1,
        image: item.image
      }
      cart.items.push(new_item);
      cart.persist();
    }
    console.log(cart);
  };

  cart.removeItem = function(key) {
    cart.items.splice(key, 1);
    cart.persist();
  };

  cart.removeByKey = function(key) {
    cart.items.splice(key, 1);
    cart.persist();
  };

  cart.persist = function() {
    // Use local storage to persist data
    $localstorage.setObject('cart', cart.items);
  };

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

ComponentsModule.controller('ComponentsController', ['$scope', '$timeout', 'ComponentsService', function($scope, $timeout, ComponentsService) {

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
    $scope.changePage();
  }

  $scope.reset = function() {
    ComponentsService.index.search('', {
      page: 0,
      hitsPerPage:
      $scope.itemsPerPage,
      facets: '*',
      facetFilters: [
        'type:' + $scope.current_facet,
      ]
    })
    .then(function(response) {
      console.log(response);
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
      facetFilters: [
        'type:' + $scope.current_facet,
      ]
    })
    .then(function(response) {
      $scope.results = response;
      $scope.totalItems = response.nbHits;
      $scope.facets = response.facets;
    });
  };

  $scope.do = function(event) {
    if(event.keyCode == 27) {
      $scope.query = '';
    }

    if($scope.query != '')
    {
      if($scope.loading) $timeout.cancel($scope.loading);

      $scope.fetching = true;
      $scope.loading = $timeout(function() {
        ComponentsService.index.search($scope.query, {page: 0, hitsPerPage: $scope.itemsPerPage, facets: '*'})
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