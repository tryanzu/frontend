var ChatController = ['$scope', '$firebase', function($scope, $firebaseObject) {
  $scope.channels = [
    {name: "#General", description: 'Acá se puede hablar de todo', color: '#A8D379'},
    {name: '#Juegos-de-pc', description: '', color: false},
    {name: '#Domigo-de-weba', description: '', color: false},
    {name: '#Bar-spartano', description: '', color: false}
  ]

  $scope.channel = {
    selected: null
  };

  // Initialization
  var ref = new Firebase(firebase_url + 'chat');
  //$scope.messages = $firebaseObject(ref);

  $scope.addMessage = function(e) {
    if (e.keyCode != 13) return;
    $scope.messages.$add({from: $scope.name, body: $scope.msg});
    $scope.msg = "";
  }

  $scope.channel.selected = $scope.channels[0];
}];

var chatModule = angular.module('chatModule', ["firebase"]);

chatModule.controller('ChatController', ChatController);