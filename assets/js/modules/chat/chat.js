var ChatController = ['$scope', '$firebaseArray', '$firebaseObject', '$timeout', function($scope, $firebaseArray, $firebaseObject, $timeout) {
  $scope.channels = [];
  $scope.channel = {
    selected: null
  };
  $scope.messages = [];
  $scope.message = {
    content: '',
    send_on_enter: true,
    previous: '-'
  };
  $scope.show_details = true;

  $scope.members = [];
  $scope.online_members = 0;

  $scope.countOnline = function() {
    var temp = 0;
    //console.log("Contando...");
    for(m in $scope.members) {
      //console.log($scope.members[m].status);
      if($scope.members[m].status == 'online') {
        temp++;
      }
    }
    $scope.online_members = temp;
  };

  $scope.changeChannel = function(channel) {
    $scope.channel.selected = channel;
    var messagesRef = new Firebase(firebase_url + 'messages/' + channel.$id).limitToLast(100);
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

    $scope.members.$loaded().then(function(x) {
      $scope.countOnline();
      x.$watch(function(event) {
        $scope.countOnline();
      });
    });

    if($scope.user.isLogged) {
      //console.log($scope.user.info);
      var amOnline = new Firebase(firebase_url + '.info/connected');
      var statusRef = new Firebase(firebase_url + 'members/' + channel.$id + '/' + $scope.user.info.id);

      amOnline.on('value', function(snapshot) {
        if(snapshot.val()) {
          var image = $scope.user.info.image || "";
          statusRef.onDisconnect().set({username: $scope.user.info.username, image: image, status: "offline"});
          statusRef.set({
            id: $scope.user.info.id,
            username: $scope.user.info.username,
            image: image,
            status: "online"
          });
        }
      });
    }
  };

  $scope.addMessage = function() {
    if($scope.message.content === $scope.message.previous || ($scope.message.previous.indexOf($scope.message.content) > -1) || ($scope.message.content.indexOf($scope.message.previous) > -1)) {
      $scope.message.content = '';
    } else {
      $scope.message.previous = $scope.message.content;
    }
    if($scope.message.content !== '') {
      var image = $scope.user.info.image || "";
      var new_message = {
        author: {
          id: $scope.user.info.id,
          username: $scope.user.info.username,
          image: image
        },
        content: $scope.message.content,
        created_at: Firebase.ServerValue.TIMESTAMP
      };
      //console.log(new_message);
      $scope.messages.$add(new_message).then(function(ref) {
        $scope.message.content = '';
      });
    }
  }

  $scope.toggle_details = function() {
    $scope.show_details = !$scope.show_details;
  }

  // Initialization
  var ref = new Firebase(firebase_url + 'chat');
  var channelsRef = new Firebase(firebase_url + 'channels');

  $scope.channels = $firebaseArray(channelsRef);
  $scope.channels.$loaded().then(function() {
    $scope.changeChannel($scope.channels[0]);
  });

}];

var chatModule = angular.module('chatModule', ["firebase"]);
chatModule.controller('ChatController', ChatController);

chatModule.directive('sgEnter', function() {
  return {
    link: function(scope, element, attrs) {
      var mh_window = $('.message-history');
      console.log(scope.message.send_on_enter);
      element.bind("keydown keypress", function(event) {
        if(event.which === 13 && scope.message.send_on_enter) {
          scope.$apply(function(){
            scope.$eval(attrs.sgEnter, {'event': event});
          });
          mh_window.scrollTop(mh_window[0].scrollHeight);
          event.preventDefault();
        }
      });
    }
  };
});