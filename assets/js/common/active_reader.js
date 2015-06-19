var activeReader = angular.module('activeReader', []);

activeReader.factory('Bridge', function($rootScope) {
	var bridge = {};
	bridge.changePost = function(post) {
		// If reader view module is active then it'll catch the request
		$rootScope.$broadcast('resolvePost', post);
	};
	return bridge;
});