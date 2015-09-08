var BadgeModule = angular.module('sg.module.badges', []);

// Badge module controllers
BadgeModule.controller('BadgeController', ['$scope', '$timeout', '$http', function($scope, $timeout, $http) {

  /*$timeout(function(){
    $scope.badges = $scope.misc.gaming.badges;
  }, 100);*/

  $scope.buy_badge = function(badge) {
    $http.post(layer_path + "badges/buy/" + badge.id)
      .success(function(data) {
        console.log(data);
        badge.owned = true;
      })
      .error(function(data) {
      });
  }

}]);