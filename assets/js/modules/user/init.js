var UserModule = angular.module('userModule',[]);

// Service of the user module
UserModule.factory('UserService', ['$http', '$firebaseObject', function($http, $firebaseObject) {
  var isLogged = false;
  var info = null;
  var notifications = {count:0, list:null};

  var rf = {
    isLogged: function() {
      return isLogged;
    },
    info: function() {
      return info;
    },
    doLogin: function() {
      $http.get(layer_path + 'user/my')
        .error(function(data, status, headers, config) {
          info = {username: 'Unknown'};
        })
        .success(function(data) {
          isLogged = true;
          info = data;

          var ref = new Firebase("https://spartangeek.firebaseio.com/users/" + info.id + "/notifications");
          ref.authWithCustomToken(localStorage.firebase_token, function(error, authData) {
            if (error) {
              console.log("Login Failed!", error);
            } else {
              //console.log("Login Succeeded!", authData);
              // download the data into a local object
              notifications = $firebaseObject(ref);
              //var nots = $firebaseObject(ref)
              //$rootScope.notifications = $firebaseObject(ref);
              // synchronize the object with a three-way data binding
              //nots.$bindTo($rootScope, "notifications");
              notifications.$loaded( function() {
                $rootScope.notifications.count = 13;
              });
            }
          });
        });
    },
    getNotifications: function() {
      return notifications;
    }
  };
  return rf;
}]);