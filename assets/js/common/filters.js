var filters = angular.module('filtersModule', []);

filters.filter('date_at', function() {
	return function(input) {
		var date = new Date(input);
    var months = new Array("enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre");

    return date.getDate() + ' de ' + months[date.getMonth()] + ' de ' + date.getFullYear();
	};
});

filters.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);
    for (var i=0; i<total; i++)
      input.push(i);
    return input;
  };
});

filters.filter('percentage', function ($window) {
  return function (input, decimals, suffix) {
    decimals = angular.isNumber(decimals)? decimals: 0;
    suffix = suffix || '%';
    if ($window.isNaN(input)) {
        return '';
    }
    return Math.round(input * Math.pow(10, decimals + 2))/Math.pow(10, decimals) + suffix
  };
});