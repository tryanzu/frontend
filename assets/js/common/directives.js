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
            $timeout(function() {
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
                if ($(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight) {
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
                if (element[0] && element[0].href && element[0].href === $location.absUrl()) {
                    //console.log("Recarga!");
                    scope.trigger();
                }
            });
        }
    };
}]);

directives.directive('markedsg', function() {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            markedsg: '='
        },
        link: function(scope, element, attrs) {
            set(scope.markedsg || element.text() || '');

            if (attrs.markedsg) {
                scope.$watch('markedsg', set);
            }

            function unindent(text) {
                if (!text) return text;

                var lines = text
                    .replace(/\t/g, '  ')
                    .split(/\r?\n/);

                var i, l, min = null,
                    line, len = lines.length;
                for (i = 0; i < len; i++) {
                    line = lines[i];
                    l = line.match(/^(\s*)/)[0].length;
                    if (l === line.length) {
                        continue;
                    }
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
                links.find('a.user-mention').each(function(index) {
                    $(this).attr("href", "/u/" + $(this).data('username') + "/" + $(this).data('id'));
                    if ($(this).data('comment') != undefined) {
                        $(this).before('<i class="fa fa-reply comment-response"></i>')
                    }
                });
                text = links.html();
                element.html(marked(text, scope.opts || null));
            }

        }
    };
});

directives.directive('populometro', function() {
    return {
        restrict: 'EACM',
        template: function(elem, attrs) {
            return '<div style="display:block;width:100px;height:80px;margin: 0 auto"><svg style="position:absolute" width="100" height="100"><g><polygon points="50 20 54 50 46 50" fill="#E6E9EE" transform="rotate({{ (knob*2.4) - 120 }} 50 50)"></polygon><circle class="ring" cx="50" cy="50" r="10" fill="#E6E9EE"></circle><circle class="ring" cx="51" cy="51" r="8" fill="#d0d7dd"></circle><circle class="ring" cx="50" cy="50" r="7" fill="#F1F1F1"></circle></g></svg><div style="display: none; position:absolute;top:50%;width:100px;text-align:center;font-weight:bold;font-size: 1.1em;">{{ knob | number : 0 }}</div><input value="{{ knob }}"></div>';
        },
        replace: true,
        scope: true,
        link: function(scope, elem, attrs) {
            scope.opts = {
                'width': 100,
                'height': 80,
                'bgColor': '#E6E9EE',
                'fgColor': '#386db8',
                'readOnly': true,
                'displayInput': false,
                'max': 100,
                'angleArc': 240,
                'angleOffset': -120,
                'thickness': '.25'
            };
            var renderKnob = function() {
                scope.knob = scope.$eval(attrs.knobData);
                $elem = $(elem).find('input');
                $elem.val(scope.knob);
                $elem.change();
                $elem.knob(scope.opts);
            };
            scope.$watch(attrs.knobData, function() {
                renderKnob();
            });
        },
    }
});

/**
 * ng-flags module
 * Turns country ISO code to flag thumbnail.
 *
 * Author: asafdav - https://github.com/asafdav
 */
directives.directive('flag', function() {
    return {
        restrict: 'E',
        replace: true,
        template: '<span class="f{{ size }}"><span class="flag {{ country }}"></span></span>',
        scope: {
            country: '@',
            size: '@'
        },
        link: function(scope, elm, attrs) {
            // Default flag size
            scope.size = 16;

            scope.$watch('country', function(value) {
                scope.country = angular.lowercase(value);
            });

            scope.$watch('size', function(value) {
                scope.size = value;
            });
        }
    };
});