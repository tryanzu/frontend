// ** store directives module:
// Custom AngularJS directives based on Wijmo for the AngularStore application
//
// ** requires Wijmo
// <link href="http://cdn.wijmo.com/themes/aristo/jquery-wijmo.css"
//       type="text/css" rel="stylesheet" />
// <link href="http://cdn.wijmo.com/jquery.wijmo-pro.all.3.20131.2.min.css"
//       type="text/css" rel="stylesheet" />
// <script src="http://cdn.wijmo.com/jquery.wijmo-open.all.3.20131.2.min.js"
//       type="text/javascript"></script>
// <script src="http://cdn.wijmo.com/jquery.wijmo-pro.all.3.20131.2.js"
//       type="text/javascript"></script>
//
angular.module("store", []);

// store utilities
angular.module("store").factory("storeUtil", function () {
    return {

        // watch for changes in scope variables, call update function when all have been initialized
        watchScope: function (scope, props, fn, updateOnTimer, updateOnResize) {
            var cnt = props.length;
            for (var i = 0; i < props.length; i++) {
                scope.$watch(props[i], function () {
                    cnt--;
                    if (cnt <= 0) {
                        if (updateOnTimer) {
                            if (scope.updateTimeout) clearTimeout(scope.updateTimeout);
                            scope.updateTimeout = setTimeout(fn, 10);
                        } else {
                            fn();
                        }
                    }
                })
            }
            if (updateOnResize) {
                $(window).resize(function () {
                    if (scope.resizeTimeout) clearTimeout(scope.resizeTimeout);
                    scope.resizeTimeout = setTimeout(fn, 100);
                })
            }
        },

        // set an undefined scope variable to a default value
        setDefVal: function (scope, prop, defaultValue) {
            if (!scope[prop] && scope[prop] != defaultValue) {
                scope[prop] = defaultValue;
            }
        },

        // set an undefined scope variable to a default value
        apply: function (scope, prop, value) {
            if (scope[prop] != value) {
                scope[prop] = value;
                if (!scope.$$phase) scope.$apply(prop);
            }
        }
    }
});

// ** store-nutrient-gauge directive
// displays a linear gauge for showing nutrient values in a scale from zero to four.
angular.module("store").directive("storeNutrientGauge", function ($rootScope, storeUtil) {
    return {
        restrict: "E",
        template: "<div></div>",
        replace: true,
        scope: {
            value: "@",     // Nutrient value (between 0 and 4).
            width: "@",     // Widget width in pixels.
            height: "@"     // Widget height in pixels.
        },
        link: function (scope, element, attrs) {

            // listen to changes in attributes and update the control
            var arr = ["value", "width", "height"];
            storeUtil.watchScope(scope, arr, updateControl);

            // update the control
            function updateControl() {

                // set default values
                storeUtil.setDefVal("width", 300);
                storeUtil.setDefVal("height", 16);

                // build options
                var options = {
                    value: scope.value * 1,
                    width: scope.width * 1, height: scope.height * 1,
                    min: 0, max: 4,
                    labels: { visible: false },
                    tickMajor: { visible: false },
                    tickMinor: { visible: false },
                    ranges: [
                        { startValue: 0, endValue: 1.3, startWidth: 1, endWidth: 1, startDistance: 1, endDistance: 1,
                            style: { fill: "red", stroke: "none", opacity: 0.1 }
                        },
                        { startValue: 1.3, endValue: 2.6, startWidth: 1, endWidth: 1, startDistance: 1, endDistance: 1,
                            style: { fill: "yellow", stroke: "none", opacity: 0.1 }
                        },
                        { startValue: 2.6, endValue: 4, startWidth: 1, endWidth: 1, startDistance: 1, endDistance: 1,
                            style: { fill: "green", stroke: "none", opacity: 0.1 }
                        }
                    ]
                };

                // build widget
                element.wijlineargauge(options);
            }
        }
    }
});

// ** store-product-quantity directive
// displays a numeric editor for entring product quantities (between one and 1000 items)
// demonstrates two-way binding (see value option)
angular.module("store").directive("storeProductQuantity", function ($rootScope, storeUtil) {
    return {
        restrict: "E",
        template: "<input></input>",
        replace: true,
        scope: {
            value: "=",     // Item quantity (between 0 and 1000).
            width: "@",     // Widget width in pixels.
            height: "@",    // Widget height in pixels.
            min: "@",       // Minimum value (default is one)
            max: "@"        // Maximum value (default is 1000)
        },
        link: function (scope, element, attrs) {

            // listen to changes in attributes and update the control
            var arr = ["value", "width", "height", "min", "max"];
            storeUtil.watchScope(scope, arr, updateControl);

            // update the control
            function updateControl() {

                // set default values
                storeUtil.setDefVal("width", 80);
                storeUtil.setDefVal("height", 16);
                storeUtil.setDefVal("min", 1);
                storeUtil.setDefVal("max", 1000);

                // build options
                var options = {
                    value: scope.value,
                    width: scope.width * 1,
                    height: scope.height * 1,
                    minValue: scope.min * 1,
                    maxValue: scope.max * 1,
                    showSpinner: true,
                    showGroup: true,
                    decimalPlaces: 0,

                    // update apply changes to scope variable (two-way binding)
                    valueChanged: function (e, args) {
                        storeUtil.apply(scope, "value", args.value);
                    }
                };

                // build widget
                element.width(scope.width * 1);
                element.height(scope.height * 1);
                element.wijinputnumber(options);
            }
        }
    }
});