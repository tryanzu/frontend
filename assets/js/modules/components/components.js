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
  }

  $http.get(layer_path + "component/" + $routeParams.slug).then(function(response){
    console.log(response.data);
    $scope.component = response.data;
  }, function(){});
}]);

ComponentsModule.controller('PcBuilderController', ['$scope', function($scope) {

}]);