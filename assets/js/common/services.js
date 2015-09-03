'use strict';

var services = angular.module('sg.services', []);

services.factory('AdvancedAcl', ['$rootScope', function($rootScope) {
  return {
    can_edit_post: function(user_id, author_id) {
      var can = false;

      // If own post
      can = can || ($rootScope.can('edit-own-posts') && user_id === author_id);

      // Or supreme power
      can = can || $rootScope.can('edit-board-posts');

      return can;
    },
    can_delete_post: function(user_id, author_id) {
      var can = false;

      // If own post
      can = can || ($rootScope.can('delete-own-posts') && user_id === author_id);

      // Or supreme power
      can = can || $rootScope.can('delete-board-posts');

      return can;
    },
    can: function(action, object, user_id, author_id) {
      var can = false;
      // If own object
      can = can || ($rootScope.can(action + '-own-' + object) && user_id === author_id);

      // Or supreme power
      can = can || $rootScope.can(action + '-board-' + object);

      return can;
    }
  };
}]);

services.service('modalService', ['$modal', function ($modal) {
  var modalDefaults = {
    backdrop: true,
    keyboard: true,
    modalFade: true,
    windowClass: 'modal-confirm',
    size: 'sm',
    templateUrl: '/js/partials/modal.html'
  };

  var modalOptions = {
    closeButtonText: 'Cerrar',
    actionButtonText: 'Aceptar',
    headerText: '¿Estás seguro?',
    bodyText: '¿Quieres realizar esta acción?'
  };

  this.showModal = function (customModalDefaults, customModalOptions) {
    if (!customModalDefaults) customModalDefaults = {};
    customModalDefaults.backdrop = 'static';
    return this.show(customModalDefaults, customModalOptions);
  };

  this.show = function (customModalDefaults, customModalOptions) {
    //Create temp objects to work with since we're in a singleton service
    var tempModalDefaults = {};
    var tempModalOptions = {};

    //Map angular-ui modal custom defaults to modal defaults defined in service
    angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);

    //Map modal.html $scope custom properties to defaults defined in service
    angular.extend(tempModalOptions, modalOptions, customModalOptions);

    if (!tempModalDefaults.controller) {
      tempModalDefaults.controller = function ($scope, $modalInstance) {
        $scope.modalOptions = tempModalOptions;
        $scope.modalOptions.ok = function (result) {
          $modalInstance.close(result);
        };
        $scope.modalOptions.close = function (result) {
          $modalInstance.dismiss('cancel');
        };
      }
    }

    return $modal.open(tempModalDefaults).result;
  };
}]);