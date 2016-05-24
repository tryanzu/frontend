var EventModule = angular.module('sg.module.events', ['ngFileUpload']);

// Badge module controllers
EventModule.controller('EventController', ['$scope', '$timeout', '$http', 'Upload', function($scope, $timeout, $http, Upload) {

  $scope.events = [];
  $scope.load = {
    first: true,
    second: true,
    completed: false,
    first_time: false
  };
  $scope.current_event = {
    name: ''
  };

  $scope.personal = {
    mail: '',
    whastapp: ''
  };

  $scope.form = {
    ife: '',
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: ''
  };

  $scope.adding_file = false;

  var firebaseRef = new Firebase(firebase_url);
  // Instantiate a new connection to Firebase.
  $scope._firebase = firebaseRef;
  $scope._eventsRef = $scope._firebase.child('events');

  $scope._eventsRef.once('value', function(ss) {
    if($scope.can('debug')) console.log(ss.val());
    //var obj = ss.val();
    $scope.events = ss.val();//Object.keys(obj).map(function(k) { return obj[k] });
    //console.log($scope.events);
    $scope.load.first = false;
  });

  $scope.selectEvent = function(key, event) {
    //console.log(key);
    $scope.current_event = event;
    $scope._firebase.child('applications').child($scope.user.info.id).on('value', function(ss){
      if(ss.val()) {
        $scope.load.completed = true;
      } else {
        $scope.load.completed = false;
      }
      //$scope.loading_inner = false;
      $timeout(function(){
        $scope.load.second = false;
      }, 100);
      //console.log("Evento", ss.val(), $scope.load.second);
    });
  };

  $scope.uploadPicture = function(files) {
    if(files.length == 1) {
      var file = files[0];
      $scope.adding_file = true;
      Upload.upload({
        url: layer_path + "post/image",
        file: file
      }).then(function success(response) {
        $timeout(function () {
          $scope.form.ife = response.data.url;
        });
        $scope.adding_file = false;
      }, function (error) {
        $scope.adding_file = false;
      });
    }
  };

  $scope.sendApplication = function() {
    $http.put(layer_path + 'user/my', {
      'phone': $scope.personal.whastapp,
      'email': $scope.personal.mail
    }).then(function success(response) {
      console.log($scope.form);
      $scope.load.first_time = true;
      $scope.form.name = $scope.user.info.username;
      $scope._firebase.child('applications').child($scope.user.info.id).set($scope.form);
    }, function(error){

    });
  };

}]);