var BadgeModule = angular.module('sg.module.badges', []);

// Badge module controllers
BadgeModule.controller('BadgeController', ['$scope', '$timeout', '$http', function($scope, $timeout, $http) {

  /*$timeout(function(){
    $scope.badges = $scope.misc.gaming.badges;
  }, 100);*/

  $scope.buy_badge = function(badge) {
    $http.post(layer_path + "badges/buy/" + badge.id)
      .success(function(data) {
        //console.log(data);
        badge.owned = true;

        for(var i in $scope.misc.gaming.badges) {
          if($scope.misc.gaming.badges[i].required_badge) {
            if($scope.misc.gaming.badges[i].required_badge.id === badge.id) {
              $scope.misc.gaming.badges[i].badge_needed = false;
            }
          }
        }

      })
      .error(function(data) {
        console.log("Can't buy me loOove! ... talk to AcidKid");
      });
  }

}]);