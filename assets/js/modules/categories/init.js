// @codekit-prepend category_service.js
// @codekit-prepend category_list_controller.js

var CategoryModule = angular.module('categoryModule', ['ngResource']);

// Service of the categories module
CategoryModule.factory('Category', CategoryService);

// Category module controllers
CategoryModule.controller('CategoryListController', CategoryListController);