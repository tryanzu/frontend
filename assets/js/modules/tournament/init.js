var TournamentModule = angular.module('sg.module.tournament', []);


// Rank module controllers
TournamentModule.controller('TournamentController', ['$scope', '$http', function($scope, $http) {

  $scope.section = 'groups';

  $scope.groups = [
    {'name': 'A', 'members': ['RealWhistle8', 'Leon', 'Dxmnttx', 'Meneses']},
    {'name': 'B', 'members': ['shanks-bosco','hjean17', 'jose-santillan-batani', 'eurovancrazy']},
    {'name': 'C', 'members': ['WarHell', 'KeinterCabezas', 'Antonio-v', 'Drak']},
    {'name': 'D', 'members': ['Nobody', 'FBNKB', 'Cesar-tiza', 'Miguemex64']},
    {'name': 'E', 'members': ['TogeXD', 'Furybomber-Mancilla', 'Sadak-gr', 'Diego-armando-jordan-gonzalez']},
    {'name': 'F', 'members': ['AcidRod', 'GTBrother', 'Jimp', 'Jharet-rulz']},
    {'name': 'G', 'members': ['IdealistaMx', 'Sheik000', 'MauSV', 'DiegoWinchester']},
    {'name': 'H', 'members': ['BolilloSpartano', 'Calvi', 'Sheko', 'Dannielnino']},
  ];

  // Calculate matches
  for(var i in $scope.groups) {
    $scope.groups[i].matches = [];
    var members1 = members2 = $scope.groups[i].members
    for(var j in members1) {
      for(var k in members2) {
        if(members1[j] != members2[k]) {
          var match = {
            player1: members1[j],
            player2: members2[k],
            player1_score: null,
            player2_score: null
          }
          //console.log(match);
          $scope.groups[i].matches.push(match);
        }
      }
    }
    console.log($scope.groups[i].matches);
  }

}]);