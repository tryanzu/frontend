// @codekit-prepend publish_controller.js
// @codekit-prepend edit_controller.js

var PublisherModule = angular.module('publisherModule', ['ngResource']);
// Publisher module controllers
PublisherModule.controller('PublishController', PublishController);
PublisherModule.controller('EditPostController', EditPostController);