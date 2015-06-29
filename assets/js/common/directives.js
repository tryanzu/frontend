var directives = angular.module('directivesModule', []);

directives.directive('adjustHeight', function($window, $document) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			scope.calculate = function() {
        var top = $(element).offset().top;
        var height = $(window).height();
        var neededHeight = height - top;
        console.log(top,height,neededHeight, element);

        $(element).css('height', neededHeight);
      };
      scope.calculate();

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
        var top = $(element).offset().top;
        var height = $(window).height();
        var tagsHeight = $('.segments').outerHeight();
        var neededHeight = height - top - tagsHeight;
        console.log(top,height, tagsHeight, neededHeight, element);

        $(element).css('height', neededHeight);
      };
      scope.calculate();

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