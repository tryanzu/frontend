// @codekit-prepend "reader_view_controller"
// @codekit-prepend "post_service"

var ReaderModule = angular.module('readerModule', ['ngResource']);

// Service of the feed module
ReaderModule.factory('Post', PostService);

// Reader module controllers
ReaderModule.controller('ReaderViewController', ReaderViewController);