var UserModule = angular.module('userModule',[]);

// Service of the user module
UserModule.factory('User', ['$resource', function($resource) {
  return $resource(layer_path + 'users/:user_id', {user_id: '@user_id'});
}]);

// User Profile controller
UserModule.controller('UserController', ['$scope', 'User', '$routeParams', 'Feed', 'Upload', '$http', '$timeout', '$firebaseObject',
  function($scope, User, $routeParams, Feed, Upload, $http, $timeout, $firebaseObject) {

  $scope.profile = null;
  $scope.resolving_posts = false;
  $scope.update = {
    updating: false,
    editing_desc: false,
    editing_username: false
  };
  $scope.current_page = 'info';
  $scope.new_data = {
    username: null,
    username_saving: false,
    username_error: false,
    username_error_message: 'El nombre de usuario sólo puede llevar letras, números y guiones. Debe empezar con letra y terminar con número o letra y tener entre 3 y 32 caracteres.'
  }
  $scope.posts = {
    data: [],
    resolving: true,
    offset: 0,
    more_to_load: true,
    first_load: false
  }
  $scope.status = null;

  $scope.password_update = {
    'password': '',
    'password_repeat': '',
    'in_progress': false,
    'show_message': false,
    'which_message': null
  };

  $scope.updatePassword = function() {
    $scope.password_update.in_progress = true;
    $scope.password_update.show_message = false;
    if($scope.password_update.password.length < 8 || $scope.password_update.password.length > 20) {
      $scope.password_update.show_message = true;
      $scope.password_update.which_message = 'length';
      $scope.password_update.in_progress = false;
      return;
    }
    if($scope.password_update.password != $scope.password_update.password_repeat) {
      $scope.password_update.show_message = true;
      $scope.password_update.which_message = 'not_equal';
      $scope.password_update.in_progress = false;
      return;
    }
    $http.put(layer_path + "user/my", {password: $scope.password_update.password}).then(function success(response){
      console.log(response);
      $scope.password_update.show_message = true;
      $scope.password_update.which_message = 'success';
      $scope.password_update.in_progress = false;
      $scope.password_update.password = '';
      $scope.password_update.password_repeat = '';
    }, function(error){
      $scope.password_update.show_message = true;
      $scope.password_update.which_message = 'error';
      $scope.password_update.in_progress = false;
    });
  };

  $scope.editUsername = function() {
    $scope.update.editing_username = true;
  };
  $scope.saveUsername = function() {
    if($scope.user.info.name_changes < 1) {
      $scope.new_data.username_saving = true;
      $http.put(layer_path + "user/my", {username: $scope.new_data.username}).
      success(function(data) {
        $scope.profile.username = $scope.new_data.username;
        $scope.user.info.username = $scope.new_data.username;
        $scope.user.info.name_changes = 1;

        $scope.update.editing_username = false;
      }).
      error(function(data) {
        $scope.update.editing_username = false;
        $scope.new_data.username_saving = false;
      });
    }
  };
  $scope.check_username = function() {
    if( /^[a-zA-Z][a-zA-Z0-9\-]{1,30}[a-zA-Z0-9]$/.test($scope.new_data.username) ) {
      $scope.new_data.username_error = false;
    } else {
      $scope.new_data.username_error = true;
    }
  };

  $scope.editDescription = function() {
    $scope.update.editing_desc = true;
    $scope.profile.description_old = $scope.profile.description;
    $timeout(function(){
      $('#description').focus();
    }, 100);
  }
  $scope.makeDescriptionUpdate = function() {
    $http.put(layer_path + "user/my", {
      description: $scope.profile.description
    }).then(function success(response) {
      $scope.update.editing_desc = false;
    }, function(error) {
      $scope.profile.description = $scope.profile.description_old;
      $scope.update.editing_desc = false;
    });
  }
  $scope.cancelDescriptionUpdate = function() {
    //console.log("Canceling edit...", $scope.profile.description, $scope.profile.description_old);
    $scope.profile.description = $scope.profile.description_old;
    $scope.update.editing_desc = false;
  }

  $scope.upload = function(files) {
    if(files.length == 1) {
      var file = files[0];
      $scope.update.updating = true;
      Upload.upload({
        url: layer_path + "user/my/avatar",
        file: file
      }).success(function (data) {
        $scope.user.info.image = data.url;
        $scope.profile.image = data.url;
        $scope.update.updating = false;
      }).error(function(data) {
        $scope.update.updating = false;
      });
    }
  };
  $scope.use_fb_pic = function() {
    $scope.user.info.image = 'https://graph.facebook.com/'+$scope.user.info.facebook.id+'/picture?width=128';
    $scope.profile.image = 'https://graph.facebook.com/'+$scope.user.info.facebook.id+'/picture?width=128';
  }
  $scope.remove_pic = function() {
    $scope.user.info.image = null;
    $scope.profile.image = null;
  }

  $scope.startFeed = function() {
    $scope.posts.resolving = true;

    Feed.get({ limit: 10, offset: $scope.posts.offset, user_id: $scope.profile.id }, function(data) {
      //console.log(data);
      $scope.posts.data = data.feed;
      $scope.posts.resolving = false;
      $scope.posts.offset = $scope.posts.offset + data.feed.length;
      $scope.posts.first_load = true;
    });
  };
  $scope.loadMorePosts = function() {
    $scope.posts.resolving = true;

    Feed.get({ limit: 10, offset: $scope.posts.offset, user_id: $scope.profile.id }, function(data) {
      //console.log(data);
      if(data.feed.length > 0) {
        $scope.posts.data = $scope.posts.data.concat(data.feed);
        $scope.posts.offset = $scope.posts.offset + data.feed.length;
      } else {
        $scope.posts.more_to_load = false;
      }
      $scope.posts.resolving = false;
    });
  }
  $scope.loadUserComments = function() {
    $http.get(layer_path + "users/" + $routeParams.id +"/comments")
      .then(function(response) {
        for(var i in response.data.activity) {
          var to_edit = $('<div>' + response.data.activity[i].content + '</div>');
          to_edit.find('a.user-mention').each(function(index) {
            var text = $(this).html();
            $(this).replaceWith(text);
          });
          response.data.activity[i].content = to_edit.html();
        }

        $scope.comments = response.data;
      }, function(response) {});
  }

  User.get({user_id: $routeParams.id}, function success(data) {
    if($scope.can('debug')) console.log(data);
    $scope.profile = data;
    $scope.startFeed();
    $scope.new_data.username = $scope.profile.username;

    var fbRef = new Firebase(firebase_url);
    var userRef = fbRef.child("users").child(data.id);
    var presenceRef = userRef.child("presence");
    presenceRef.on('value', function(ss) {
      $scope.$apply(function() {
        if(ss.val() !== null) {
          $scope.status = true;
        } else {
          $scope.status = false;
        }
      });
    });

    //$scope.profile.status = $firebaseObject(presenceRef);

    $scope.promises.gaming.then(function() {
      $timeout(function() {
        for(var i in data.gaming.badges) {
          for(var j in $scope.misc.gaming.badges) {
            if(data.gaming.badges[i].id === $scope.misc.gaming.badges[j].id) {
              data.gaming.badges[i].name = $scope.misc.gaming.badges[j].name;
              data.gaming.badges[i].type = $scope.misc.gaming.badges[j].type;
              data.gaming.badges[i].slug = $scope.misc.gaming.badges[j].slug;
              break;
            }
          }
        }

        // We calculate remaining swords for next level and ratio
        var rules = $scope.misc.gaming.rules;
        var remaining = rules[data.gaming.level].swords_end - $scope.profile.gaming.swords;
        $scope.profile.gaming.remaining = Math.max(1, remaining);
        //$scope.profile.gaming.swords = Math.max(0, $scope.profile.gaming.swords);
        var ratio = 100 - 100 * (remaining / (rules[data.gaming.level].swords_end - rules[data.gaming.level].swords_start));
        $scope.profile.gaming.ratio = ratio;
      }, 100);
    });

    //console.log(rules[data.gaming.level].swords_start, rules[data.gaming.level].swords_end, ratio);
    $scope.loadUserComments();
  }, function(error) {
    window.location = '/';
  });
}]);

UserModule.directive('sgEditDesc', function() {
  return {
    restrict: 'EA',
    scope: false,
    link: function(scope, element, attrs) {
      element.bind("keydown keypress", function(event) {
        if(event.which === 13) {
          scope.$apply(function(){
            scope.$eval(attrs.sgEditDesc, {'event': event});
          });
          event.preventDefault();
        } else if(event.which === 27) {
          // Cancel edit
          scope.$apply(function(){
            scope.$eval(attrs.sgCancel, {'event': event});
          });
          event.preventDefault();
        }
      });
    }
  };
});

UserModule.controller('UserValidationController', ['$scope', '$http', '$routeParams',
  function($scope, $http, $routeParams) {

    $scope.validation_in_progress = true;
    $scope.validated = false;

    $http.get(layer_path + "user/confirm/" + $routeParams.code).
      then(function() {
        $scope.validation_in_progress = false;
        $scope.validated = true;
        if($scope.user.isLogged) {
          $scope.user.info.validated = true;
        }
      }, function() {
        $scope.validation_in_progress = false;
        //Redirect to home if error
        window.location = '/';
      });
  }
])