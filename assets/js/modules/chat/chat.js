var ChatController = ['$scope', '$firebaseArray', '$firebaseObject', '$timeout',
  function($scope, $firebaseArray, $firebaseObject, $timeout) {

    var firebaseRef = new Firebase(firebase_url);

    // Instantiate a new connection to Firebase.
    $scope._firebase = firebaseRef;

    // A unique id generated for each session.
    $scope._sessionId = null;

    // A mapping of event IDs to an array of callbacks.
    $scope._events = {};

    // A mapping of room IDs to a boolean indicating presence.
    $scope._rooms = {};

    // A mapping of operations to re-queue on disconnect.
    $scope._presenceBits = {};

    // Commonly-used Firebase references.
    $scope._userRef        = null;
    $scope._messageRef     = $scope._firebase.child('messages');
    $scope._channelRef     = $scope._firebase.child('channels');
    //$scope._privateRoomRef = $scope._firebase.child('room-private-metadata');
    //$scope._moderatorsRef  = $scope._firebase.child('moderators');
    $scope._suspensionsRef = $scope._firebase.child('suspensions');
    //$scope._usersOnlineRef = $scope._firebase.child('user-names-online');

    // Setup and establish default options.
    $scope._options = {};

    // The number of historical messages to load per room.
    $scope._options.numMaxMessages = $scope._options.numMaxMessages || 50;

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

    $scope.scrolledUp = false;

    $scope.members = [];
    $scope.searchText = {
      content: ''
    };

    $scope.goToBottom = function() {
      var mh_window = $('.message-history');
      mh_window.scrollTop(mh_window[0].scrollHeight);
      $scope.old_messages = [];
      $scope.scrolledUp = false;
    }

    $scope.changeChannel = function(channel) {
      $scope.channel.selected = channel;
      //var messagesRef = new Firebase(firebase_url + 'messages/' + channel.$id).orderByChild('created_at').limitToLast(75);
      $scope.messages = $firebaseArray( $scope._messageRef.child(channel.$id).orderByChild('created_at').limitToLast(75) );

      $scope.messages.$loaded().then(function(x) {
        $timeout(function(){
          var mh_window = $('.message-history');
          mh_window.scrollTop(mh_window[0].scrollHeight);
        }, 100);

        x.$watch(function(event) {
          if(event.event === "child_added") {
            if(!$scope.scrolledUp) {
              var mh_window = $('.message-history');
              $timeout(function() {
                mh_window.scrollTop(mh_window[0].scrollHeight);
              }, 50);
            }
          }
        });
      });

      $scope._messageRef.on('child_removed', function(dataSnapshot) {
        if($scope.scrolledUp) {
          $scope.old_messages = $scope.old_messages.concat( dataSnapshot.val() );
        } else {
          $scope.old_messages = [];
        }
      });

      var membersRef = new Firebase(firebase_url + 'members/' + channel.$id);
      $scope.members = $firebaseArray(membersRef);

      if($scope.user.isLogged) {
        var amOnline = new Firebase(firebase_url + '.info/connected');
        var statusRef = new Firebase(firebase_url + 'members/' + channel.$id + '/' + $scope.user.info.id);

        amOnline.on('value', function(snapshot) {
          if(snapshot.val()) {
            var image = $scope.user.info.image || "";
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

    $scope.suspendUser = function(userId, timeLengthSeconds) {
      //var suspendedUntil = new Date().getTime() + 1000*timeLengthSeconds;

      $scope._suspensionsRef.child(userId).set(true, function(error) {
        if (error) {
          console.log("error in user ban")
        } else {
          console.log("user was banned")
        }
      });
    };

    $scope.channels = $firebaseArray($scope._channelRef);
    $scope.channels.$loaded().then(function() {
      $scope.changeChannel($scope.channels[0]);
    });

    // Scrolling responses
    $scope.scroll_help = {
      lastScrollTop: 0,
      from_top: 0,
      max_height: 0,
      last_height: 0
    }

    $('.message-history').scroll( function() {
      $scope.scroll_help.from_top = $(this).scrollTop();
      $scope.scroll_help.max_height = $(this)[0].scrollHeight - $(this).height();
      if($scope.scroll_help.from_top > $scope.scroll_help.max_height) {
        $scope.scroll_help.from_top = $scope.scroll_help.max_height;
      }
      //console.log($scope.scroll_help.from_top, $scope.scroll_help.lastScrollTop, $scope.scroll_help.max_height);
      if ($scope.scroll_help.from_top >= $scope.scroll_help.lastScrollTop) {
        // downscroll code
        if($scope.scroll_help.from_top == $scope.scroll_help.max_height) {
          $scope.scrolledUp = false;
          $scope.old_messages = [];
          //console.log("Estoy hasta abajo");
        }
      } else {
        if($scope.scroll_help.last_height <= $scope.scroll_help.max_height) {
          // upscroll code
          $scope.scrolledUp = true;
          //console.log("cambie a subido");
        }
      }
      $scope.scroll_help.lastScrollTop = $scope.scroll_help.from_top;
      $scope.scroll_help.last_height = $scope.scroll_help.max_height;
    });
  }
];

var chatModule = angular.module('chatModule', ["firebase"]);

chatModule.controller('ChatController', ChatController);

chatModule.directive('sgEnter', function() {
  return {
    link: function(scope, element, attrs) {
      //console.log(scope.message.send_on_enter);
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
    scope: {
      code: '='
    },
    replace: true,
    template: '<div style="height:400px;"><iframe style="overflow:hidden;height:100%;width:100%" width="100%" height="100%" src="{{url}}" frameborder="0" allowfullscreen></iframe></div>',
    link: function (scope) {
      scope.$watch('code', function (newVal) {
        if (newVal) {
          scope.url = $sce.trustAsResourceUrl("https://www.youtube.com/embed/" + newVal);
        }
      });
    }
  };
});

chatModule.directive('showImages', function() {
  var urlPattern = /(http|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
  var regex = new RegExp("(https?:\/\/.*\\.(?:png|jpg|jpeg|gif)((\\?|\\&)[a-zA-Z0-9]+\\=[a-zA-Z0-9]+)*)", "gi");
  var to_replace = "<div class=\"img-preview\"><a href=\"$1\" target=\"_blank\"><img src=\"$1\"></a></div>";

  return {
    restrict: 'A',
    scope: {
      'content' : '@'
    },
    replace: true,
    link: function (scope, element, attrs, controller) {
      var text = scope.content;
      var images = text.replace(regex, to_replace);
      var new_text = text.replace(urlPattern, '<a target="_blank" href="$&">$&</a>');
      element.html(images);
    }
  };
});