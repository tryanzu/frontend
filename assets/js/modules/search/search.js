'use strict';

angular.module('searchBar', [
  'ngSanitize',
  'algoliasearch'
])
.directive('searchBar', function() {
  return {
    templateUrl: '/app/partials/search.html'
  };
})
.controller('SearchController', ['$scope', '$timeout', '$http', function ($scope, $timeout, $http) {
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
  };

  $scope.toggle = function() {
    $scope.open = !$scope.open;
    jQuery("#search-layout input").trigger( "focus" );
  }

  $scope.$on('open_search', function(event, data) {
    $scope.toggle();
  });

  $scope.do = function(event) {

    var previous = $scope.query
    if(event.keyCode == 27) {
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
        $http.get(layer_path + 'search/components', {
          params:{
            q: $scope.query,
            offset: 0,
            limit: 12
          }
        }).then(function success(response) {
          console.log("Components", response.data);
          $scope.hits.components = response.data.results;
          $scope.statistics.components.total = response.data.total;
          $scope.statistics.components.time = response.data.elapsed;
        }, function(error) {
          console.log(error);
        });

        $http.get(layer_path + 'search/posts', {
          params:{
            q: $scope.query,
            offset: 0,
            limit: 10
          }
        }).then(function success(response) {
          console.log("Posts", response.data);
          $scope.hits.posts = response.data.results;
          $scope.statistics.posts.total = response.data.total;
          $scope.statistics.posts.time = response.data.elapsed;
        }, function(error) {
          console.log(error);
        });
        /*client.search(queries)
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
          });*/
        $scope.fetching = false;
      }, 250); // delay in ms
    }
    else
    {
      $scope.hits.posts = [];
    }
  };

}]);
