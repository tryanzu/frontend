// @codekit-prepend "publish_controller"
// @codekit-prepend "edit_controller"

var PublisherModule = angular.module('publisherModule', ['ngResource']);
// Publisher module controllers
PublisherModule.controller('PublishController', PublishController);
PublisherModule.controller('EditPostController', EditPostController);