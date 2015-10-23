var ChatController = ['$scope', '$firebaseArray', '$firebaseObject', '$timeout',
  function($scope, $firebaseArray, $firebaseObject, $timeout) {
  $scope.channels = [];
  $scope.channel = {
    selected: null
  };
  $scope.messages = [];
  $scope.old_messages = [];
  $scope.message = {
    content: '',
    send_on_enter: true,
    previous: '-'
  };
  $scope.show_details = true;
  $scope.move_to_bottom = true;

  $scope.members = [];

  $scope.goToBottom = function() {
    var mh_window = $('.message-history');
    mh_window.scrollTop(mh_window[0].scrollHeight);
    $scope.old_messages = [];
    $scope.move_to_bottom = true;
  }

  $scope.changeChannel = function(channel) {
    $scope.channel.selected = channel;
    var messagesRef = new Firebase(firebase_url + 'messages/' + channel.$id).orderByChild('created_at').limitToLast(75);
    $scope.messages = $firebaseArray(messagesRef);

    $scope.messages.$loaded().then(function(x) {
      $timeout(function(){
        var mh_window = $('.message-history');
        mh_window.scrollTop(mh_window[0].scrollHeight);
      }, 100);

      x.$watch(function(event) {
        if(event.event === "child_added") {
          var mh_window = $('.message-history');
          $scope.move_to_bottom = mh_window.scrollTop() > (mh_window[0].scrollHeight - mh_window.height() - 1);
          $timeout(function() {
            if($scope.move_to_bottom) {
              mh_window.scrollTop(mh_window[0].scrollHeight);
            }
          }, 50);
        }
      });
    });

    messagesRef.on('child_removed', function(dataSnapshot) {
      // code to handle new value.
      var mh_window = $('.message-history');
      var at_bottom = mh_window.scrollTop() > (mh_window[0].scrollHeight - mh_window.height() - 1);
      if(!at_bottom) {
        $scope.old_messages = $scope.old_messages.concat( dataSnapshot.val() );
        //console.log("not at bottom");
      } else {
        $scope.old_messages = [];
        //console.log("at bottom");
      }
      //console.log(dataSnapshot.val());
    });

    var membersRef = new Firebase(firebase_url + 'members/' + channel.$id);
    $scope.members = $firebaseArray(membersRef);

    if($scope.user.isLogged) {
      var amOnline = new Firebase(firebase_url + '.info/connected');
      var statusRef = new Firebase(firebase_url + 'members/' + channel.$id + '/' + $scope.user.info.id);

      amOnline.on('value', function(snapshot) {
        if(snapshot.val()) {
          var image = $scope.user.info.image || "";
          //statusRef.onDisconnect().set({username: $scope.user.info.username, image: image, status: "offline"});
          statusRef.onDisconnect().remove();
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
      console.log(scope.message.send_on_enter);
      element.bind("keydown keypress", function(event) {
        if(event.which === 13 && scope.message.send_on_enter) {
          scope.$apply(function(){
            scope.$eval(attrs.sgEnter, {'event': event});
          });
          event.preventDefault();
        }
      });
    }
  };
});

chatModule.directive('youtube', function($sce) {
  return {
    restrict: 'EA',
    scope: { code:'=' },
    replace: true,
    template: '<div style="height:400px;"><iframe style="overflow:hidden;height:100%;width:100%" width="100%" height="100%" src="{{url}}" frameborder="0" allowfullscreen></iframe></div>',
    link: function (scope) {
        scope.$watch('code', function (newVal) {
           if (newVal) {
               scope.url = $sce.trustAsResourceUrl("http://www.youtube.com/embed/" + newVal);
           }
        });
    }
  };
});