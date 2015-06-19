// @codekit-prepend "part_service"

var PartModule = angular.module('partModule', ['ngResource']);

// Service of the feed module
PartModule.factory('Part', PartService);