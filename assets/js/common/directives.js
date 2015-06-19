var directives = angular.module('directivesModule', []);

directives.directive('adjustHeight', function($window, $document) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			scope.calculate = function(startup) {
        startup = startup || true;

        var top = $(element).offset().top;
        var height = $(window).height();

        var neededHeight = height - top;

        $(element).css('height', neededHeight);

        if (!('onlyFit' in attrs) && startup)
        {
        	//$(element).perfectScrollbar({suppressScrollX: true});
        }
      };
      scope.calculate();

      $window.addEventListener('resize', function() {
        scope.calculate();
      });

      // Listen for possible container size changes
      scope.$on('changedContainers', function() {
        scope.calculate(false);
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