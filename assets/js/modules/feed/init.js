// @codekit-prepend feed_service.js

var FeedModule = angular.module('feedModule', ['ngResource']);

// Service of the feed module
FeedModule.factory('Feed', FeedService);