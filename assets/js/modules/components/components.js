var ComponentsModule = angular.module("sg.module.components", ["algoliasearch", "ui.bootstrap"]);

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

ComponentsModule.controller('ComponentController', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http){

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
      // relate post to component
      //POST  /v1/posts/:id/relate/:related_id
      //$http.post(layer_path + '')
      $scope.question.publishing = false;
      //console.log(response);
    }, function(err) {
      console.log(err);
    });
  }

  $http.get(layer_path + "component/" + $routeParams.slug).then(function success(response){
    //console.log(response.data);
    $scope.component = response.data;
  }, function error(response){
    if(response.status == 404) {
      window.location.href = "/";
    }
  });
}]);

ComponentsModule.controller('PcBuilderController', ['$scope', function($scope) {

}]);