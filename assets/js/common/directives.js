var directives = angular.module('directivesModule', []);

directives.directive('sgEnter', function() {
  return {
    link: function(scope, element, attrs) {
      var mh_window = $('.message-history');
      element.bind("keydown keypress", function(event) {
        if(event.which === 13) {
          scope.$apply(function(){
            scope.$eval(attrs.sgEnter, {'event': event});
          });
          mh_window.scrollTop(mh_window[0].scrollHeight);
          event.preventDefault();
        }
      });
    }
  };
});

directives.directive('adjustHeight', function($window, $document, $timeout) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			scope.calculate = function() {
        var top = $(element).offset().top;
        var height = $(window).height();
        var neededHeight = height - top;
        //console.log(top, height, neededHeight, element);

        $(element).css('height', neededHeight);
      };
      $timeout(function(){
        scope.calculate();
      }, 100);

      $window.addEventListener('resize', function() {
        scope.calculate();
      });

      // Listen for possible container size changes
      scope.$on('changedContainers', function() {
        scope.calculate();
      });
		}
	};
});

directives.directive('adjustHeightFeed', function($window, $document) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      scope.calculate = function() {
        var height = $($window).height();
        var top = $(element).offset().top;
        top = 106;
        var tagsHeight = jQuery('.segments').outerHeight();
        var neededHeight = height - top - tagsHeight;
        //console.log(top, height, tagsHeight, neededHeight, element);

        $(element).css('min-height', neededHeight);
        $(element).css('height', neededHeight);
      };
      //scope.calculate();

      $window.addEventListener('resize', function() {
        scope.calculate();
      });

      // Listen for possible container size changes
      scope.$on('changedContainers', function() {
        scope.calculate();
      });
    }
  };
});

directives.directive('scrollMe', function() {
  return {
    restrict: 'A',
    scope: {
      trigger: '&scrollMe'
    },
    link: function(scope, element, attrs) {
      element.on('scroll', function() {
        if($(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight) {
          scope.$apply(function() {
            // Trigger scroll
            scope.trigger();
          });
        }
      });
    }
  }
});

directives.directive('myRefresh', ['$location', function($location) {
  return {
    restrict: 'A',
    scope: {
      trigger: '&myRefresh'
    },
    link: function(scope, element, attrs) {
      element.bind('click', function() {
        if(element[0] && element[0].href && element[0].href === $location.absUrl()){
          console.log("Recarga!");
          scope.trigger();
        }
      });
    }
  }
}]);