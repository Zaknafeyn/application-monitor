/* global angular, Firebase, console*/
(function(){
  'use strict';
  var app = angular.module('monitorApp', ['firebase']);
  app.controller('mainCtrl', function($scope, $firebase, $firebaseSimpleLogin, $window){
    var kottansRef = new Firebase('https://sudodoki.firebaseio.com/kottans/'),
      auth = $firebaseSimpleLogin(kottansRef);

    $scope.auth = auth;
    $scope.auth.$getCurrentUser().then(function(user){
      if (user) {
        loadKottans();
      }
    });

    $scope.login = function(){
      auth.$login('github').then(function(){
        loadKottans();
      });
    };
    $scope.logout = auth.$logout;

    function loadKottans(){
      $scope.kottans = $firebase(kottansRef);
    }
    function byIndex(index) {
      var keySearched = $scope.kottans.$getIndex()[index],
       kottanSearched = null;
      for (var key in $scope.kottans) {
        if (key === keySearched) {
          kottanSearched = $scope.kottans[key];
          break;
        }
      }
      if (kottanSearched) {kottanSearched.key = keySearched;}
      return kottanSearched;
    }
    $scope.updateEntry = function (index, newDetails) {
      var kottanBeingUpdated = byIndex(index);
      var key = kottanBeingUpdated.key;
      console.log(newDetails)
      kottansRef.child(key).set(newDetails);
      $scope.kottans.$save(key)
    }
    $scope.deleteByIndex = function (index) {
      var kottanBeingDeleted = byIndex(index);
      if ($window.confirm('Are you sure you want to delete '+ kottanBeingDeleted.name + ' user?')) {
        $scope.kottans.$remove(kottanBeingDeleted.key);
      }
    };

  });

})();