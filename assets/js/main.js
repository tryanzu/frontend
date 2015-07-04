// @codekit-prepend "common/directives"
// @codekit-prepend "common/filters"
// @codekit-prepend "common/active_reader"
// @codekit-prepend "vendor/angular-marked"
// @codekit-prepend "vendor/wizzy"
// @codekit-prepend "vendor/infinite-scroll"
// @codekit-prepend "vendor/ui-bootstrap-tpls-0.13.0.min"
// @codekit-prepend "vendor/angular-facebook"
// @codekit-prepend "vendor/color-thief.min"
// @codekit-prepend "modules/feed/init"
// @codekit-prepend "modules/categories/init"
// @codekit-prepend "modules/reader/init"
// @codekit-prepend "modules/publisher/init"
// @codekit-prepend "modules/part/init"
// @codekit-prepend "modules/user/init"

var boardApplication = angular.module('board', [
	'directivesModule',
	'filtersModule',
	'activeReader',
  'hc.marked',
  'idiotWizzy',
  'infinite-scroll',
  'ui.bootstrap',
  'facebook',
	'feedModule',
  'categoryModule',
  'readerModule',
	'publisherModule',
  'partModule',
  'userModule',
  'angular-jwt',
  'firebase',
  'ngRoute'
]);

boardApplication.config(['$httpProvider', 'jwtInterceptorProvider', '$routeProvider', '$locationProvider', 'FacebookProvider',
  function($httpProvider, jwtInterceptorProvider, $routeProvider, $locationProvider, FacebookProvider) {

  $routeProvider.when('/', {
    templateUrl: '/js/partials/main.html',
    controller: 'CategoryListController'
  });
  $routeProvider.when('/c/:slug', {
    templateUrl: '/js/partials/main.html',
    controller: 'CategoryListController'
  });
  $routeProvider.when('/p/:slug/:id/:comment_position?', {
    templateUrl: '/js/partials/main.html',
    controller: 'CategoryListController'
  });
  $routeProvider.when('/u/:username/:id', {
    templateUrl: '/js/partials/profile.html',
    controller: 'UserController'
  });
  $routeProvider.when('/post/create/:cat_slug?', {
    templateUrl: '/js/partials/publish.html',
    controller: 'PublishController',
    onEnter: function() {
      if(!$scope.user.isLogged) {
        window.location = '/';
      }
    }
  });
  $routeProvider.otherwise({ redirectTo: '/' });

  // use the HTML5 History API
  $locationProvider.html5Mode(true);

  // Please note we're annotating the function so that the $injector works when the file is minified
  jwtInterceptorProvider.tokenGetter = ['config', 'jwtHelper', function(config, jwtHelper) {
    // Skip authentication for any requests ending in .html
    if (config.url.substr(config.url.length - 5) == '.html') {
      return null;
    }

    if(localStorage.signed_in == 'false')
      return null;

    var idToken = localStorage.getItem('id_token');
    if(idToken === null) {
      return null;
    }

    if (jwtHelper.isTokenExpired(idToken)) {
      localStorage.signed_in = false
    } else {
      return idToken;
    }
  }];
  $httpProvider.interceptors.push('jwtInterceptor');

  FacebookProvider.init(fb_api_key);
}]);

boardApplication.controller('SignInController', ['$scope', '$rootScope', '$http', '$modalInstance', 'Facebook',
  function($scope, $rootScope, $http, $modalInstance, Facebook) {
  	$scope.form = {
  		email: '',
  		password: '',
  		error: false
  	};

    $scope.fb_loading = false;

  	$scope.signIn = function() {
  		if ($scope.form.email === '' || $scope.form.password === '') {
  			$scope.form.error = {message: 'Ambos campos son necesarios'};
  			return;
  		}

  		// Post credentials to the auth rest point
  		$http.get(layer_path + 'auth/get-token', {params: {email: $scope.form.email, password: $scope.form.password}, skipAuthorization: true})
      .error(function(data, status, headers, config) {
        $scope.form.error = {message:'Usuario o contraseña incorrecta.'};
      })
      .success(function(data) {

        mixpanel.track("Regular login");

        localStorage.setItem('id_token', data.token);
        localStorage.setItem('firebase_token', data.firebase);
        localStorage.setItem('signed_in', true);
        //console.log(data.token, data.firebase);
        $modalInstance.dismiss('logged');
        $rootScope.$broadcast('login');
        $rootScope.$broadcast('status_change');
      });
  	};

  	$scope.cancel = function() {
  		$modalInstance.dismiss('cancel');
  	};

    $scope.loginFb = function() {
      $scope.fb_loading = true;
      var response;
      Facebook.getLoginStatus(function(response) {
        if(response.status === 'connected') {
          //$scope.loggedIn = true;
          response = response;
        } else {
          Facebook.login(function(response) {
            // Do something with response.
            //console.log(response);
            response = response;
          });
        }
        //console.log(response.authResponse.accessToken);
        $http.get("https://graph.facebook.com/me?access_token="+response.authResponse.accessToken).
          success(function(data, status, headers, config) {
            //console.log(data);
            var info = data;
            $http.post(layer_path + 'user/get-token/facebook', data).
              error(function(data, status, headers, config) {
                $scope.form.error = {message:'No se pudo iniciar sesión.'};
              })
              .success(function(data) {

                mixpanel.track("Facebook login");

                localStorage.setItem('id_token', data.token);
                localStorage.setItem('firebase_token', data.firebase);
                localStorage.setItem('signed_in', true);
                //console.log(data.token, data.firebase);
                $modalInstance.dismiss('logged');
                $rootScope.$broadcast('login');
                $rootScope.$broadcast('status_change');
              });
          }).
          error(function(data, status, headers, config) {
            $scope.form.error = {message: 'Error conectando con FB'};
            return;
          });
      });
    };
  }
]);

boardApplication.controller('SignUpController', ['$scope', '$rootScope', '$http', '$modalInstance', 'Facebook',
  function($scope, $rootScope, $http, $modalInstance, Facebook) {
  	$scope.form = {
  		email: '',
  		password: '',
  		username: '',
  		error: false
  	};
    $scope.fb_loading = false;

  	$scope.signUp = function() {

  		if ($scope.form.email === '' || $scope.form.password === '' || $scope.form.username === '') {
  			$scope.form.error = {message:'Todos los campos son necesarios.'};
  			return;
  		}

  		// Post credentials to the UserRegisterAction endpoint
  		$http.post(layer_path + 'user', {email: $scope.form.email, password: $scope.form.password, username: $scope.form.username}, {skipAuthorization: true})
      .error(function(data, status, headers, config) {
        console.log(data.message);
        $scope.form.error = {message:'El usuario o correo elegido ya existe.'};
      })
      .success(function(data) {

        mixpanel.track("Sign up");

        localStorage.setItem('id_token', data.token);
        localStorage.setItem('firebase_token', data.firebase);
        localStorage.setItem('signed_in', true);
        $modalInstance.dismiss('signed');
        $rootScope.$broadcast('login');
        $rootScope.$broadcast('status_change');
  		});
  	};

  	$scope.ok = function (){
  		$modalInstance.close($scope.selected.item);
  	};

  	$scope.cancel = function () {
  		$modalInstance.dismiss('cancel');
  	};

    $scope.loginFb = function() {
      $scope.fb_loading = true;
      var response;
      Facebook.getLoginStatus(function(response) {
        if(response.status === 'connected') {
          //$scope.loggedIn = true;
          response = response;
        } else {
          Facebook.login(function(response) {
            // Do something with response.
            //console.log(response);
            response = response;
          });
        }
        //console.log(response.authResponse.accessToken);
        $http.get("https://graph.facebook.com/me?access_token="+response.authResponse.accessToken).
          success(function(data, status, headers, config) {
            //console.log(data);
            var info = data;
            $http.post(layer_path + 'user/get-token/facebook', data).
              error(function(data, status, headers, config) {
                $scope.form.error = {message:'No se pudo iniciar sesión.'};
              })
              .success(function(data) {

                mixpanel.track("Facebook login");

                localStorage.setItem('id_token', data.token);
                localStorage.setItem('firebase_token', data.firebase);
                localStorage.setItem('signed_in', true);
                //console.log(data.token, data.firebase);
                $modalInstance.dismiss('logged');
                $rootScope.$broadcast('login');
                $rootScope.$broadcast('status_change');
              });
          }).
          error(function(data, status, headers, config) {
            $scope.form.error = {message: 'Error conectando con FB'};
            return;
          });
      });
    };
}]);

boardApplication.controller('UserController', ['$scope', 'User', '$routeParams', function($scope, User, $routeParams) {
  $scope.user = null;

  User.get({user_id: $routeParams.id}, function(data){
    $scope.user = data;
  }, function(response) {
    //window.location = '/';
  });

}]);

boardApplication.controller('MainController', ['$scope', '$rootScope', '$http', '$modal', '$timeout', '$firebaseObject', '$firebaseArray', 'Facebook',
  function($scope, $rootScope, $http, $modal, $timeout, $firebaseObject, $firebaseArray, Facebook) {
    $scope.user = {
      isLogged: false,
      info: null,
      notifications: {count:0, list:null}
    }
    $scope.status = {
      post_selected: false,
      last_action: null,
      section: 'main'
    }
    $scope.user.isLogged = localStorage.getItem('signed_in')==='true'?true:false;

    $scope.logUser = function() {
      $http.get(layer_path + 'user/my')
        .error(function(data, status, headers, config) {
          $scope.signOut();
        })
        .success(function(data) {
          $scope.user.info = data;
          $scope.user.isLogged = true;

          mixpanel.identify(data.id);
          mixpanel.people.set({
              "$first_name": data.username,
              "$last_name": "",
              "$email": data.email
          });

          var url = "https://spartangeek.firebaseio.com/users/" + data.id + "/notifications";

          var ref = new Firebase(url + "/count");
          ref.onAuth(function(authData) {
            if (authData) {
              console.log("Authenticated with uid:", authData.uid);
            } else {
              console.log("Client unauthenticated.");
              //$scope.signOut();
            }
          });
          ref.authWithCustomToken(localStorage.firebase_token, function(error, authData) {
            if (error) {
              console.log("Login to Firebase failed!", error);
            } else {
              // console.log("Login Succeeded!", authData);
              // download the data into a local object
              var count = $firebaseObject(ref)
              // synchronize the object with a three-way data binding
              count.$bindTo($scope, "user.notifications.count");
              count.$loaded(function(){
                //console.log(count);
                var to_show = 15;
                if(count.$value > 15){
                  to_show = count.$value;
                }
                var list_ref = new Firebase(url + "/list");
                $scope.user.notifications.list = $firebaseArray(list_ref.limitToLast(to_show));

                $scope.user.notifications.list.$loaded()
                .then(function(x) {
                  x.$watch(function(event) {
                    //console.log(event);
                    if(event.event === "child_added") {
                      var audio = new Audio('/sounds/notification.mp3');
                      audio.play();
                    }
                  });
                })

                /*$scope.user.notifications.list.$loaded(function(){
                  console.log($scope.user.notifications.list) ;
                });*/
              });
            }
          });
        });
    }

    $scope.signIn = function() {
      var modalInstance = $modal.open({
        templateUrl: '/js/partials/sign-in.html',
        controller: 'SignInController',
        size: 'sm'
      });

      modalInstance.result.then(function() {}, function() {
        //$log.info('Modal dismissed at: ' + new Date());
      });
    };

    $scope.signUp = function() {
      var modalInstance = $modal.open({
        templateUrl: '/js/partials/sign-up.html',
        controller: 'SignUpController',
        size: 'sm'
      });

      modalInstance.result.then(function() {}, function() {
        //$log.info('Modal dismissed at: ' + new Date());
      });
    };

    $scope.signOut = function() {
      localStorage.signed_in = false;
      $scope.user.isLogged = false;
      localStorage.removeItem('id_token');
      localStorage.removeItem('firebase_token');
      window.location = '/';
    };

    $scope.toggle_notifications = function() {
      $scope.user.notifications.count.$value = 0;
      $timeout(function() {
        var arrayLength = $scope.user.notifications.list.length;
        for (var i = 0; i < arrayLength; i++) {
          //console.log($scope.user.notifications.list[i]);
          if(!$scope.user.notifications.list[i].seen) {
            $scope.user.notifications.list[i].seen = true;
            $scope.user.notifications.list.$save(i);
          }
        }
      }, 50);
    };

    $scope.toggle_notification = function(elem) {
      if(!elem.seen) {
        $scope.user.notifications.count.$value = $scope.user.notifications.count.$value - 1;
        elem.seen = true;
        $scope.user.notifications.list.$save(elem);
      }
    };

    $scope.total_notifications = function() {
      return 0 + $scope.user.notifications.count.$value;
    };

    $scope.reloadPost = function() {
      $scope.$broadcast('reloadPost');
    };

    $scope.$on('login', function(e) {
      $scope.logUser();
    });

    if(localStorage.signed_in === 'true') {
      $scope.logUser();
    }
  }
]);

boardApplication.run(['$rootScope', '$http', function($rootScope, $http) {
    // TEST PURPOSES
    if(false) {
      localStorage.removeItem('signed_in');
      localStorage.removeItem('id_token');
      localStorage.removeItem('firebase_token');
    }

    // Initialize the local storage
    if(!localStorage.signed_in)
      localStorage.signed_in = false;

    $rootScope.page = {
      title: "SpartanGeek.com | Comunidad de tecnología, geeks y más"
    };
  }
]);