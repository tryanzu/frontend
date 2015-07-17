var ChatController = ['$scope', '$firebase', function($scope, $firebaseObject) {
  $scope.channels = [
    {name: "#General", description: 'Acá se puede hablar de todo', color: '#A8D379'},
    {name: '#Juegos-de-pc', description: '', color: 'rgb(111, 92, 128)'},
    {name: '#Domigo-de-weba', description: '', color: 'rgb(0, 188, 212)'},
    {name: '#Bar-spartano', description: '', color: 'rgb(239, 94, 166)'}
  ]

  $scope.channel = {
    selected: null
  };

  $scope.message = '';

  var date = new Date();
  $scope.messages = [
    {author: {username: 'AcidKid', image: null}, content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Rem molestias incidunt officia animi ducimus nostrum a cum, sunt, minima fugit repellendus assumenda expedita. Eaque autem vero delectus, optio, consequuntur suscipit.', created_at: date.getHours() + ":" + date.getMinutes()}
  ];

  // Initialization
  var ref = new Firebase(firebase_url + 'chat');
  //$scope.messages = $firebaseObject(ref);

  $scope.usernames = ['AcidKid', 'AcidKid', 'fernandez14']
  $scope.uindex = 0;

  $scope.addMessage = function() {
    if($scope.message !== '') {
      var date = new Date();
      var new_message = {author: {username: $scope.usernames[$scope.uindex], image: null}, content: $scope.message, created_at: date.getHours() + ":" + date.getMinutes()}
      $scope.messages.push(new_message);
      $scope.message = '';
      $scope.uindex = ($scope.uindex + 1) % 3;
    }
  }

  $scope.channel.selected = $scope.channels[0];
}];

var chatModule = angular.module('chatModule', ["firebase"]);

chatModule.controller('ChatController', ChatController);