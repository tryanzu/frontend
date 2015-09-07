var BadgeModule = angular.module('sg.module.badges', []);

// Badge module controllers
BadgeModule.controller('BadgeController', ['$scope', '$timeout', function($scope, $timeout) {

  $timeout(function(){
    $scope.badges = $scope.misc.gaming.badges;
  }, 1000);

}]);