var PaymentModule = angular.module('sg.module.payments', []);

// Payments module controllers
PaymentModule.controller('PaypalMassdropController', ['$scope', '$timeout', '$http', '$route', '$location', '$routeParams', function($scope, $timeout, $http, $route, $location, $routeParams) {
  $scope.action = '';

  if($routeParams.paymentId != null && $routeParams.PayerID != null) {
    $scope.action = 'paying';

    $http.post(layer_path + 'payments/execute', {
      paymentID: $routeParams.paymentId,
      payerID: $routeParams.PayerID
    }).then(function success(response) {
      $scope.action = 'payed';
      $location.path('/donacion');
      $location.search('paymentId', null);
      $location.search('PayerID', null);
      $location.search('token', null);
    }, function(error) {
      $scope.action = 'pay_error';
      // Code for error on pay
      /*$location.path('/donacion');
      $location.search('paymentId', null);
      $location.search('PayerID', null);
      $location.search('token', null);*/
    });
  } else {
    $scope.action = 'pay';
  }
}]);