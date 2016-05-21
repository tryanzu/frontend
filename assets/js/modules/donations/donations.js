var DonationsModule = angular.module("sg.module.donations", []);

DonationsModule.controller('DonationsController', ['$scope', '$timeout', '$http', '$route', '$location', '$routeParams', function($scope, $timeout, $http, $route, $location, $routeParams) {
  $scope.form = {
    pay_period: "once",
    quantity: 0,
    custom_amount: 1000,
    loading: false
  };

  $scope.action = '';

  $scope.donate = function() {
    $scope.form.loading = true;
    var amount = 0;
    if($scope.form.quantity == 'custom') {
      amount = $scope.form.custom_amount;
    } else {
      amount = $scope.form.quantity;
    }
    $http.post(layer_path + 'payments', {
      "type": "donation",
      "amount": amount,
      "description": "Donación para mantener SpartanGeek.com"
    }).then(function success(response) {
      //console.log(response);
      window.location.href = response.data.response.approval_url;
    }, function (error) {
      console.log(error);
    });
  }

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
      $location.path('/donacion');
      $location.search('paymentId', null);
      $location.search('PayerID', null);
      $location.search('token', null);
    });
  } else {
    $scope.action = 'pay';
  }

  $http.get(layer_path + 'payments/donators').then(function success(response){
    console.log(response.data);
    $scope.donations = response.data;
  }, function(error){
    console.log(error);
  });


}]);