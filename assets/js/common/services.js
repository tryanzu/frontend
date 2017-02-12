'use strict';

var services = angular.module('sg.services', []);

services.factory('AdvancedAcl', ['$rootScope', function($rootScope) {
  return {
    can: function(action, object, user_info, author_id, category_id) {
      var can = false;

      // If own object
      can = can || ( $rootScope.can(action + '-own-' + object) && user_info.id === author_id );

      // Or some category moderator
      var category_owner = false;
      if(user_info != null) {
        if('categories' in user_info.roles[0]) {
          category_owner = (user_info.roles[0].categories).indexOf(category_id) > -1;
        }
      }
      can = can || ( $rootScope.can(action + '-category-' + object) && category_owner);

      // Or supreme power
      can = can || $rootScope.can(action + '-board-' + object);

      return can;
    }
  };
}]);

services.service('modalService', ['$uibModal', function ($modal) {
  var modalDefaults = {
    backdrop: true,
    keyboard: true,
    modalFade: true,
    windowClass: 'modal-confirm',
    size: 'sm',
    templateUrl: '/app/partials/modal.html'
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
      tempModalDefaults.controller = function ($scope, $uibModalInstance) {
        $scope.modalOptions = tempModalOptions;
        $scope.modalOptions.ok = function (result) {
          $uibModalInstance.close(result);
        };
        $scope.modalOptions.close = function (result) {
          $uibModalInstance.dismiss('cancel');
        };
      }
    }

    return $modal.open(tempModalDefaults).result;
  };
}]);

services.factory('socket', function (socketFactory) {
  return socketFactory({
    //prefix: 'foo~',
    ioSocket: io.connect(socketio_url)
  });
})