// @codekit-prepend "common/directives"
// @codekit-prepend "common/filters"
// @codekit-prepend "common/active_reader"
// @codekit-prepend "common/services"
// @codekit-prepend "vendor/angular-marked"
// @codekit-prepend "vendor/wizzy"
// @codekit-prepend "vendor/infinite-scroll"
// @codekit-prepend "vendor/ui-bootstrap-tpls-0.13.0.min"
// @codekit-prepend "vendor/angular-facebook"
// @codekit-prepend "vendor/ng-file-upload-all.min.js"
// @codekit-prepend "vendor/elastic.js"
// @codekit-prepend "vendor/mentio.min.js"
// @codekit-prepend "vendor/angular-ui-switch.min.js"
// @codekit-prepend "vendor/angular-acl.min.js"
// @codekit-prepend "vendor/angular-timeago.js"
// @codekit-prepend "modules/feed/init"
// @codekit-prepend "modules/categories/init"
// @codekit-prepend "modules/reader/init"
// @codekit-prepend "modules/publisher/init"
// @codekit-prepend "modules/part/init"
// @codekit-prepend "modules/user/init"
// @codekit-prepend "modules/rank/init"
// @codekit-prepend "modules/medal/init"
// @codekit-prepend "modules/chat/chat"

var boardApplication = angular.module('board', [
  'ngRoute',
	'directivesModule',
	'filtersModule',
  'sg.services',
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
  'rankModule',
  'sg.module.medal',
  'chatModule',
  'angular-jwt',
  'firebase',
  'ngFileUpload',
  'monospaced.elastic',
  'mentio',
  'uiSwitch',
  'mm.acl',
  'yaru22.angular-timeago'
]);

var version = '141';

boardApplication.config(['$httpProvider', 'jwtInterceptorProvider', '$routeProvider', '$locationProvider', 'FacebookProvider', 'markedProvider', 'AclServiceProvider',
  function($httpProvider, jwtInterceptorProvider, $routeProvider, $locationProvider, FacebookProvider, markedProvider, AclServiceProvider) {

  $routeProvider.when('/', {
    templateUrl: '/js/partials/main.html?v=' + version,
    controller: 'CategoryListController'
  });
  $routeProvider.when('/ranks', {
    templateUrl: '/js/partials/ranks.html?v=' + version,
    controller: 'RanksController'
  });
  $routeProvider.when('/medallas', {
    templateUrl: '/js/partials/medals.html?v=' + version,
    controller: 'MedalController'
  });
  $routeProvider.when('/c/:slug', {
    templateUrl: '/js/partials/main.html?v=' + version,
    controller: 'CategoryListController'
  });
  $routeProvider.when('/p/:slug/:id/edit', {
    templateUrl: '/js/partials/edit.html?v=' + version,
    controller: 'EditPostController'
  });
  $routeProvider.when('/p/:slug/:id/:comment_position?', {
    templateUrl: '/js/partials/main.html?v=' + version,
    controller: 'CategoryListController'
  });
  $routeProvider.when('/u/:username/:id', {
    templateUrl: '/js/partials/profile.html?v=' + version,
    controller: 'UserController'
  });
  $routeProvider.when('/chat', {
    templateUrl: '/js/partials/chat.html?v=' + version,
    controller: 'ChatController'
  });
  $routeProvider.when('/post/create/:cat_slug?', {
    templateUrl: '/js/partials/publish.html?v=' + version,
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

  // Marked
  markedProvider.setRenderer({
    link: function(href, title, text) {
      return "<a href='" + href + "' title='" + title + "' target='_blank'>" + text + "</a>";
    }
  });

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

  // ACL Configuration
  AclServiceProvider.config({storage: false});
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
        //$rootScope.$broadcast('status_change');
      });
  	};

  	$scope.cancel = function() {
  		$modalInstance.dismiss('cancel');
  	};

    $scope.loginFb = function() {
      $scope.fb_loading = true;
      var response;
      if($rootScope.fb_response.status === 'connected') {
        response = $rootScope.fb_response;
        $scope.fb_try(response);
      } else {
        Facebook.login(function(response) {
          $scope.fb_try(response);
        }, {scope: 'public_profile,email'});
      }
    };

    $scope.fb_try = function(response) {
      $http.get("https://graph.facebook.com/me?access_token="+response.authResponse.accessToken).
        success(function(data, status, headers, config) {
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
              //$rootScope.$broadcast('status_change');
            });
        }).
        error(function(data, status, headers, config) {
          $scope.form.error = {message: 'Error conectando con FB'};
          return;
        });
    }
  }
]);

boardApplication.controller('SignUpController', ['$scope', '$rootScope', '$http', '$modalInstance', 'Facebook',
  function($scope, $rootScope, $http, $modalInstance, Facebook) {
  	$scope.form = {
  		email: '',
  		password: '',
  		username: '',
      username_error: false,
  		error: false
  	};
    $scope.fb_loading = false;

    $scope.check_username = function() {
      if( /^[a-zA-Z][a-zA-Z0-9\-]{1,30}[a-zA-Z0-9]$/.test($scope.form.username) ) {
        $scope.form.username_error = false;
      } else {
        $scope.form.username_error = true;
      }
    };

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
        //$rootScope.$broadcast('status_change');
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
      if($rootScope.fb_response.status === 'connected') {
        response = $rootScope.fb_response;
        $scope.fb_try(response);
      } else {
        Facebook.login(function(response) {
          $scope.fb_try(response);
        }, {scope: 'public_profile,email'});
      }
    };

    $scope.fb_try = function(response) {
      $http.get("https://graph.facebook.com/me?access_token="+response.authResponse.accessToken).
        success(function(data, status, headers, config) {
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
              //$rootScope.$broadcast('status_change');
            });
        }).
        error(function(data, status, headers, config) {
          $scope.form.error = {message: 'Error conectando con FB'};
          return;
        });
    }
}]);

boardApplication.controller('MainController', ['$scope', '$rootScope', '$http', '$modal', '$timeout', '$firebaseObject', '$firebaseArray', 'Facebook', 'AclService',
  function($scope, $rootScope, $http, $modal, $timeout, $firebaseObject, $firebaseArray, Facebook, AclService) {
    $scope.user = {
      isLogged: false,
      info: null,
      notifications: {count:0, list:null},
      gaming: {
        coins: 0,
        shit: 0,
        tribute: 0
      }
    }
    $scope.status = {
      post_selected: false,
      selected_post: null,
      last_action: null,
      viewing: 'all',
      pending: 0,
      newer_post_date: null,
      show_categories: false,
      menuCollapsed: true
    }
    $scope.user.isLogged = localStorage.getItem('signed_in')==='true'?true:false;
    $scope.misc = {
      gaming: null
    };

    $scope.logUser = function() {
      $http.get(layer_path + 'user/my')
        .error(function(data, status, headers, config) {
          $scope.signOut();
        })
        .success(function(data) {
          $scope.user.info = data;
          $scope.user.isLogged = true;

          $timeout(function() {
            $scope.$broadcast('userLogged');
            $scope.$broadcast('changedContainers');
          }, 100);

          // Attach the member roles to the current user
          for(var i in data.roles) {
            //console.log("Adding " + data.roles[i].name + " as role");
            AclService.attachRole(data.roles[i].name);
          }

          mixpanel.identify(data.id);
          mixpanel.people.set({
              "$first_name": data.username,
              "$last_name": "",
              "$email": data.email
          });

          // FIREBASE PREPARATION
          var userUrl = firebase_url + "users/" + data.id;

          var notificationsCountRef = new Firebase(userUrl + "/notifications/count");
          notificationsCountRef.onAuth(function(authData) {
            if (authData) {
              console.log("Authenticated to Firebase");
            } else {
              console.log("Client unauthenticated.");
              //$scope.signOut();
            }
          });
          notificationsCountRef.authWithCustomToken(localStorage.firebase_token, function(error, authData) {
            if (error) {
              console.log("Login to Firebase failed!", error);
            } else {
              var amOnline = new Firebase(firebase_url + '.info/connected');
              //var userRef = new Firebase('https://spartangeek.firebaseio.com/presence/' + data.id);
              var presenceRef = new Firebase(userUrl + '/online');
              var categoryRef = new Firebase(userUrl + '/viewing');
              var pendingRef = new Firebase(userUrl + '/pending');
              amOnline.on('value', function(snapshot) {
                if(snapshot.val()) {
                  //userRef.onDisconnect().remove();
                  presenceRef.onDisconnect().set(0);
                  categoryRef.onDisconnect().remove();
                  presenceRef.set(1);
                  categoryRef.set("all");
                }
              });

              // Gamification attributes
              var gamingRef = new Firebase(userUrl + '/gaming');
              $scope.user.gaming = $firebaseObject(gamingRef);
              $scope.user.gaming.$loaded(function() {
                //console.log($scope.user.gaming);
              });

              // For sync options in newsfeed
              var pending = $firebaseObject(pendingRef);
              pending.$bindTo($scope, "status.pending");
              pending.$loaded(function(){ $scope.status.pending.$value = 0; });

              var viewing = $firebaseObject(categoryRef);
              viewing.$bindTo($scope, "status.viewing");
              //viewing.$loaded(function(){ $scope.status.viewing.$value = 0; });

              // download the data into a local object
              var count = $firebaseObject(notificationsCountRef)
              // synchronize the object with a three-way data binding
              count.$bindTo($scope, "user.notifications.count");
              count.$loaded(function(){
                //console.log(count);
                var to_show = 15;
                if(count.$value > 15){
                  to_show = count.$value;
                }
                var list_ref = new Firebase(userUrl + "/notifications/list");
                $scope.user.notifications.list = $firebaseArray(list_ref.limitToLast(to_show));

                // We wait till notifications list is loaded
                $scope.user.notifications.list.$loaded()
                .then(function(x) {
                  x.$watch(function(event) {
                    // Notification sound
                    if(event.event === "child_added") {
                      var audio = new Audio('/sounds/notification.mp3');
                      audio.play();
                    }
                  });
                });
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

    $scope.toggle_notification = function( elem ) {
      if(!elem.seen) {
        $scope.user.notifications.count.$value = $scope.user.notifications.count.$value - 1;
        if($scope.user.notifications.count.$value < 0) {
          $scope.user.notifications.count.$value = 0;
        }
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

    // If login action sucessfull anywhere, sign in the user
    $scope.$on('login', function(e) {
      $scope.logUser();
    });

    // Check for FB Login Status, this is necessary so later calls doesn't make
    // the pop up to be blocked by the browser
    Facebook.getLoginStatus(function(r){$rootScope.fb_response = r;});

    // If already signed in, sign in the user
    if(localStorage.signed_in === 'true') {
      $scope.logUser();
    }

    // Load platform stats
    $http.get(layer_path + 'stats/board').
      success(function(data, status) {
        $scope.status.stats = data;
      }).
      error(function(data) {
      });
    // Load gamification data
    $http.get(layer_path + 'gamification').
      success(function(data, status) {
        $scope.misc.gaming = data;
      }).
      error(function(data) {});
  }
]);

boardApplication.run(['$rootScope', '$http', 'AclService', 'AdvancedAcl', function($rootScope, $http, AclService, AdvancedAcl) {
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
    title: "SpartanGeek.com | Comunidad de tecnología, geeks y más",
    description: "Creamos el mejor contenido para Geeks, y lo hacemos con pasión e irreverencia de Spartanos."
  };

  // Set the ACL data.
  // The data should have the roles as the property names,
  // with arrays listing their permissions as their value.
  var aclData = {}
  $http.get(layer_path + 'permissions')
    .error(function(data) {}) // How should we proceed if no data?
    .success(function(data) {
      // Proccess de roles and permissions iteratively
      for(var r in data.rules) {
        aclData[r] = data.rules[r].permissions;
        var current = data.rules[r];
        while(current.parents.length > 0) {
          aclData[r] = aclData[r].concat(data.rules[current.parents[0]].permissions);
          current = data.rules[current.parents[0]];
        }
      }
      AclService.setAbilities(aclData);
    });
  $rootScope.can = AclService.can;
  $rootScope.aacl = AdvancedAcl;
}]);