var directives = angular.module('directivesModule', []);

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

directives.directive('adjustHeightChat', function($window, $document, $timeout) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      scope.calculate = function() {
        var top = $(element).offset().top;
        var height = $(window).height();
        var footer = $('div.footer').outerHeight();
        var neededHeight = height - top - footer;
        console.log(top, height, footer, neededHeight);

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

directives.directive('scrollMe', function() {
  return {
    restrict: 'A',
    scope: {
      trigger: '&scrollMe'
    },
    link: function(scope, element, attrs) {
      // If space is bigger, load more items
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
          //console.log("Recarga!");
          scope.trigger();
        }
      });
    }
  };
}]);

directives.directive('markedsg', function () {
  return {
    restrict: 'AE',
    replace: true,
    scope: {
      markedsg: '='
    },
    link: function (scope, element, attrs) {
      set(scope.markedsg || element.text() || '');

      if (attrs.markedsg) {
        scope.$watch('markedsg', set);
      }

      function unindent(text) {
        if (!text) return text;

        var lines = text
          .replace(/\t/g, '  ')
          .split(/\r?\n/);

        var i, l, min = null, line, len = lines.length;
        for (i = 0; i < len; i++) {
          line = lines[i];
          l = line.match(/^(\s*)/)[0].length;
          if (l === line.length) { continue; }
          min = (l < min || min === null) ? l : min;
        }

        if (min !== null && min > 0) {
          for (i = 0; i < len; i++) {
            lines[i] = lines[i].substr(min);
          }
        }
        return lines.join('\n');
      }

      function set(text) {
        text = unindent(text || '');
        // Parse mentions links
        var links = $('<div>' + text + '</div>');
        links.find('a.user-mention').each(function( index ) {
          $(this).attr("href", "/u/"+ $(this).data('username') +"/"+ $(this).data('id'));
          if($(this).data('comment') != undefined) {
            $(this).before('<i class="fa fa-reply comment-response"></i>')
          }
        });
        text = links.html();
        element.html(marked(text, scope.opts || null));
      }

    }
  };
});

