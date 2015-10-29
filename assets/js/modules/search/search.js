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
  $scope.hits = [];
  $scope.query = '';
  $scope.loading = false;
  $scope.fetching = true;

  $scope.statistics = {
    total: 0,
    time: 0
  }

  var client = algolia.Client('5AO6WVBTY2', '46253cb75bbb7b4e031d41cda14c2426');
  var index = client.initIndex('prod_spartan');

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
        index.search($scope.query)
          .then(function searchSuccess(content) {
            console.log(content);
            $scope.hits = content.hits;
            $scope.statistics.total = content.nbHits;
            $scope.statistics.time = content.processingTimeMS;
          }, function searchFailure(err) {
            console.log(err);
          });
        $scope.fetching = false;
      }, 200); // delay in ms
    }
    else
    {
      $scope.hits = [];
    }
  };

}]);
