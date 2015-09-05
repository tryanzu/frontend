var MedalModule = angular.module('sg.module.medal', []);

// Medals factory
MedalModule.factory('Medal', ['$resource', function( $resource ){
  return $resource('/medals.json', {}, {});
}]);

// Rank module controllers
MedalModule.controller('MedalController', ['$scope', 'Medal', function($scope, Medal) {

  $scope.medals = [];

  $scope.labels = {
    'Especial': 'especial',
    'Ropa': 'ropa',
    'Arma': 'arma',
    'Armadura': 'armadura',
    'Poder': 'poder',
    'Contribución': 'contribucion'
  }

  Medal.query().$promise.then( function( data ) {
    $scope.medals = data;
  });

}]);