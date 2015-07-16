var ChatController = function($scope) {
  $scope.channels = [
    {name: '#channel1', description: '', color: ''},
    {name: '#channel2', description: '', color: ''},
    {name: '#channel3', description: '', color: ''}
  ]
};

var chatModule = angular.module('chatModule', []);

chatModule.controller('ChatController', ChatController);