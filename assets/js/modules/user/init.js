var UserModule = angular.module('userModule',[]);

// Service of the user module
UserModule.factory('User', ['$resource', function($resource) {
  return $resource(layer_path + 'users/:user_id', {user_id: '@user_id'});
}]);

// User Profile controller
UserModule.controller('UserController', ['$scope', 'User', '$routeParams', 'Feed', 'Upload', '$http',
  function($scope, User, $routeParams, Feed, Upload, $http) {

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
    $scope.resolving_posts = true;

    Feed.get({limit: 10, offset: 0, user_id: $scope.profile.id}, function(data) {
      //console.log(data);
      for(p in data.feed) {
        for(c in $scope.categories) {
          if (data.feed[p].categories[0] == $scope.categories[c].slug) {
            data.feed[p].category = {name: $scope.categories[c].name, color: $scope.categories[c].color, slug: $scope.categories[c].slug}
            break;
          }
        }
      }

      $scope.posts = data.feed;
      $scope.resolving_posts = false;
      $scope.offset = 10;
    });
  };

  $scope.loadUserComments = function() {
    $http.get(layer_path + "users/" + $routeParams.id +"/comments")
      .success(function(data) {
        //console.log(data);
        $scope.comments = data;
      })
      .error(function(data) {
      });
  }

  User.get({user_id: $routeParams.id}, function(data) {
    $scope.profile = data;
    $scope.startFeed();
    $scope.new_data.username = $scope.profile.username;

    // We calculate remaining swords for next level and ratio
    var rules = $scope.misc.gaming.rules;
    var remaining = rules[data.gaming.level].swords_end - $scope.profile.gaming.swords;
    $scope.profile.gaming.remaining = remaining;
    var ratio = 100 - 100*(remaining/(rules[data.gaming.level].swords_end - rules[data.gaming.level].swords_start));
    $scope.profile.gaming.ratio = ratio;
    //console.log(rules[data.gaming.level].swords_start, rules[data.gaming.level].swords_end, ratio);
    $scope.loadUserComments();
  }, function(response) {
    window.location = '/';
  });

}]);