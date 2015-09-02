var filters = angular.module('filtersModule', []);

filters.filter('date_at', function() {
	return function(input) {
		var date = new Date(input);
    var months = new Array("enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre");

    return date.getDate() + ' de ' + months[date.getMonth()] + ' de ' + date.getFullYear();
	};
});