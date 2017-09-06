var TopModule = angular.module('sg.module.top', []);


// Rank module controllers
TopModule.controller('TopController', ['$scope', '$http', function($scope, $http) {
  $scope.example = {
    username: 'AcidKid',
    image: 'http://s3-us-west-1.amazonaws.com/spartan-board/users/55dce3c893e89a20eb000001-120x120.jpg',
    id: '54e238652397381217000001',
    position: 2
  }
  $scope.order_by = 'swords';
  $scope.options = ['swords', 'badges', 'wealth'];
  $scope.data = [];

  $scope.change_order = function(order) {

    if($scope.options.indexOf(order) < 0) {
      $scope.order_by = 'swords';
    } else {
      $scope.order_by = order;
    }

    $http.get(layer_path + 'stats/ranking', {params: {sort: $scope.order_by}}).
      then(function(response){
        $scope.data = response.data;
        //console.log($scope.data )
      });
  }

  $scope.change_order();

}]);