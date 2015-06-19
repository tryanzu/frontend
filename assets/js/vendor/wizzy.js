var iw = angular.module('idiotWizzy', []);

iw.directive('idiotWizzy', function ($window, $document) {
  return {
    restrict: 'E',
    scope: {
      model: '=',
      trigger: '=action'
    },
    template: 
      '<div class="idiot-wizzy">' +
        '<div class="content" contenteditable ng-model="model"></div>' +
        '<div class="actions">' +
          '<nav>' +
            '<button ng-click="apply(\'bold\')" class="bold"><i class="fa fa-bold"></i></button>' + 
            '<a ng-click="actionover(\'bold\')"><i class="fa fa-italic"></i></a>' + 
            '<a ng-click="actionover(\'bold\')"><i class="fa fa-list"></i></a>' + 
            '<a ng-click="actionover(\'bold\')"><i class="fa fa-link"></i></a>' + 
            '<a ng-click="actionover(\'bold\')"><i class="fa fa-camera-retro"></i></a>' + 
            '<a ng-click="publish()" ng-class="{waiting: waiting==true}" class="button">Publicar</a>' +
          '</nav>' +
        '</div>' +
      '</div>'
    ,
    link: function(scope, element, attrs) {

      var getSelection = function() {

        return window.getSelection();
      };

      scope.waiting = false; 

      scope.publish = function() {

        if (scope.waiting == false) {

            scope.waiting = true;

            var http = scope.trigger();

            http.then(function(data) {

              // Allow to comment once again
              scope.waiting = false;
              scope.model = '';

            }, function(error) {


            });
        }
      };

      scope.apply = function(name) {

        // Get current text selection
        var selection = getSelection();
        var parentElement = selection.anchorNode.parentElement;

        if (parentElement == element[0].querySelector('.content')) {

          var range = selection.getRangeAt(0);
          var starts_at = range.startOffset;
          var ends_at   = range.endOffset;
          var content   = scope.model;

          console.log('starts: ' + starts_at + ' - ends_at: ' + ends_at);
          console.log(content.substr(starts_at, ends_at));

          markdown = content.substr(0, starts_at) + '*' + content.substr(starts_at, ends_at-starts_at) + '*' + content.substr(ends_at);

          scope.model = markdown;
        }
      };
    }
  };
});

iw.directive("contenteditable", function() {
  return {
    restrict: "A",
    require: "ngModel",
    link: function(scope, element, attrs, ngModel) {

      function read() {
        ngModel.$setViewValue(element.html());
      }

      ngModel.$render = function() {
        element.html(ngModel.$viewValue || "");
      };

      element.bind("blur keyup change", function() {
        scope.$apply(read);
      });
    }
  };
});