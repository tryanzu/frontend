var TopModule = angular.module('sg.module.top', []);


// Rank module controllers
TopModule.controller('TopController', ['$scope', function($scope) {
  $scope.example = {
    username: 'AcidKid',
    image: 'http://s3-us-west-1.amazonaws.com/spartan-board/users/55dce3c893e89a20eb000001-120x120.jpg',
    id: '54e238652397381217000001',
    position: 2
  }
}]);