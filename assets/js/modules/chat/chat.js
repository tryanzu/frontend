var ChatController = ['$scope', '$firebaseArray', '$firebaseObject', '$timeout', function($scope, $firebaseArray, $firebaseObject, $timeout) {
  $scope.channels = [
    {name: "#General", description: 'Acá se puede hablar de todo', color: '#A8D379'},
    {name: '#Juegos-de-pc', description: '', color: 'rgb(111, 92, 128)'},
    {name: '#Domigo-de-weba', description: '', color: 'rgb(0, 188, 212)'},
    {name: '#Bar-spartano', description: '', color: 'rgb(239, 94, 166)'}
  ]
  $scope.channel = {
    selected: null
  };
  $scope.messages = [];
  $scope.message = '';
  $scope.show_details = true;

  $scope.members = [];

  $scope.changeChannel = function(channel) {
    $scope.channel.selected = channel;
    var messagesRef = new Firebase(firebase_url + 'messages/' + channel.$id);
    $scope.messages = $firebaseArray(messagesRef);

    $scope.messages.$loaded().then(function(x) {
      $timeout(function(){
        var mh_window = $('.message-history');
        mh_window.scrollTop(mh_window[0].scrollHeight);
      }, 100);

      x.$watch(function(event) {
        if(event.event === "child_added") {
          $timeout(function(){
            var mh_window = $('.message-history');
            mh_window.scrollTop(mh_window[0].scrollHeight);
          }, 100);
        }
      });
    });

    var membersRef = new Firebase(firebase_url + 'members/' + channel.$id);
    $scope.members = $firebaseArray(membersRef);

    if($scope.user.isLogged) {
      var amOnline = new Firebase(firebase_url + '.info/connected');
      var statusRef = new Firebase(firebase_url + 'members/' + channel.$id + '/' + $scope.user.info.id);

      amOnline.on('value', function(snapshot) {
        if(snapshot.val()) {
          statusRef.onDisconnect().set({username: $scope.user.info.username, image: $scope.user.info.image, status: "offline"});
          statusRef.set({username: $scope.user.info.username, image: $scope.user.info.image, status: "online"});
        }
      });
    }
  };

  $scope.addMessage = function() {
    if($scope.message !== '') {
      date = new Date();
      var new_message = {author: {username: $scope.user.info.username, image: $scope.user.info.image}, content: $scope.message, created_at: date.getTime()}
      //console.log(new_message);
      $scope.messages.$add(new_message);
      $scope.message = '';
    }
  }

  $scope.toggle_details = function() {
    $scope.show_details = !$scope.show_details;
  }

  // Initialization
  var date = new Date();
  var ref = new Firebase(firebase_url + 'chat');
  var channelsRef = new Firebase(firebase_url + 'channels');

  $scope.channels = $firebaseArray(channelsRef);
  $scope.channels.$loaded().then(function() {
    $scope.changeChannel($scope.channels[0]);
  });

}];

var chatModule = angular.module('chatModule', ["firebase"]);

chatModule.controller('ChatController', ChatController);