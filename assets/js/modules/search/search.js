'use strict';

angular.module('searchBar', [
  'ngSanitize',
  'algoliasearch'
])
.directive('searchBar', function() {
  return {
    templateUrl: '/js/partials/search.html'
  };
})
.controller('SearchController', ['$scope', '$timeout', '$http', 'algolia', function ($scope, $timeout, $http, algolia) {
  $scope.open = false;
  $scope.hits = {
    'posts': [],
    'components': []
  };
  $scope.query = '';
  $scope.loading = false;
  $scope.fetching = true;

  $scope.statistics = {
    'posts': {
      total: 0,
      time: 0
    },
    'components': {
      total: 0,
      time: 0
    }
  }

  var client = algolia.Client('5AO6WVBTY2', '46253cb75bbb7b4e031d41cda14c2426');
  //var index = client.initIndex('prod_spartan');

  $scope.toggle = function() {
    $scope.open = !$scope.open;
    jQuery("#search-layout input").trigger( "focus" );
  }

  $scope.$on('open_search', function(event, data) {
    $scope.toggle();
  });

  $scope.do = function(event) {

    var previous = $scope.query
    if(event.keyCode == 27){
      //console.log('el query fue' + previous)
      if(previous === '')
        $scope.open = false;
      else
        $scope.query = '';
    }

    if($scope.query != '')
    {
      if($scope.loading) $timeout.cancel($scope.loading);

      $scope.fetching = true;
      $scope.loading = $timeout(function() {
        var queries = [{
          indexName: 'prod_store',
          query: $scope.query,
          params: {hitsPerPage: 12}
        }, {
          indexName: 'prod_spartan',
          query: $scope.query,
          params: {hitsPerPage: 10}
        }];
        client.search(queries)
          .then(function searchSuccess(content) {
            //console.log(content);
            $scope.hits.components = content.results[0].hits;
            $scope.statistics.components.total = content.results[0].nbHits;
            $scope.statistics.components.time = content.results[0].processingTimeMS;
            $scope.hits.posts = content.results[1].hits;
            $scope.statistics.posts.total = content.results[1].nbHits;
            $scope.statistics.posts.time = content.results[1].processingTimeMS;
          }, function searchFailure(err) {
            console.log(err);
          });
        $scope.fetching = false;
      }, 200); // delay in ms
    }
    else
    {
      $scope.hits.posts = [];
    }
  };

}]);
