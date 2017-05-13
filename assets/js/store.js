// @codekit-prepend "vendor/jquery.knob.min"
// @codekit-prepend "vendor/ui-bootstrap-tpls-0.14.3.min"

var storeApp = angular.module('store', [
  'ngRoute',
  'ui.bootstrap'
]);

var version = '001';

storeApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {

  $routeProvider.when('/', {
    templateUrl: '/js/partials/store/main.html?v=' + version,
    //controller: 'CategoryListController'
  });
  $routeProvider.when('/computadoras/:category?', {
    templateUrl: '/js/partials/store/list.html?v=' + version,
  });
  $routeProvider.when('/computadoras/:category/:slug?', {
    templateUrl: '/js/partials/store/show.html?v=' + version,
  });
  $routeProvider.otherwise({ redirectTo: '/' });

  // use the HTML5 History API
  $locationProvider.html5Mode(true);
}]);

storeApp.controller('MainController', [
  '$scope',
  '$http',
  '$uibModal',
  '$timeout',
  '$location',
  function($scope, $http, $uibModal, $timeout, $location) {
  }
]);

// Directiva para mostrar el comparascore
storeApp.directive('comparascore', function() {
  return {
    restrict: 'EA',
    replace: false,
    template: '<div class="text-center"><input class="cs_new" value="{% ::value %}"/></div>',
    scope: true,
    link: function(scope, elem, attrs) {
      var getBgColor = function(val) {
        if(val < 60)
        {
          return '#E84059';
        }
        else if(val < 80)
        {
          return '#FFDC50';
        }
        else if(val < 100)
        {
          return '#3FC77B';
        }
        else if(val == 100)
        {
          return '#1CB05D';
        }
        else
        {
          return '#737373';
        }
      }
      var getTextColor = function(val) {
        if(val < 100)
        {
          return '#555';
        }
        else if(val == 100)
        {
          return '#1CB05D';
        }
        else
        {
          return '#AAA';
        }
      }
      scope.opts = {
        'width':48,
        'height':48,
        'bgColor':'#E6E9EE',
        'fgColor': getBgColor(attrs.value),
        'inputColor': getTextColor(attrs.value),
        'readOnly': true,
        'displayInput': true,
        'max': 100,
        'angleArc': 360,
        'angleOffset': 180,
        'thickness': 0.15
      };

      scope.knob = scope.$eval(attrs.value);

      $elem = $(elem).find('input');
      $elem.val(scope.knob);
      $elem.change();
      $elem.knob(scope.opts);
    },
  }
});