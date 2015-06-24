/* global angular, Firebase, console */
(function(){
  'use strict';
  var app = angular.module('monitorApp', ['firebase']);
  app.controller('mainCtrl', function($scope, $firebase, $firebaseSimpleLogin, $window){
    var kottansRef = new Firebase('https://sudodoki.firebaseio.com/kottans/'),
      auth = $firebaseSimpleLogin(kottansRef);

    $scope.filterExpr = '';
    $scope.filterCourses = [];
    $scope.filterCourseCompose = 'OR';
    $scope.courseFilterFunction = function (kottan) {
      var filterCourses = $scope.filterCourses.filter(angular.identity);
      if (filterCourses.length === 0) { return true }
      var method = ($scope.filterCourseCompose === 'AND') ? 'every' : 'some';
      var input, result;
      input = (angular.isArray(kottan.courses)) ? kottan.courses : [kottan.courses];
      result = input[method](function (course) {
        var result = ($scope.filterCourseCompose === 'AND') ? filterCourses.length === input.length : true;
        return result && filterCourses.indexOf(course) > -1;
      });
      return result;
    }

    $scope.auth = auth;
    $scope.auth.$getCurrentUser().then(function(user){
      if (user) {
        loadKottans();
      }
    });

    $scope.login = function(){
      return auth.$login('google', {
        rememberMe: true,
        scope: 'https://spreadsheets.google.com/feeds https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
      }).then(function(){
        loadKottans();
      });
    };
    $scope.logout = auth.$logout;

    function getCsvData(kottans) {
      var CSV = [
        '"name", "email", "skype", "js", "java", "ruby", "csharp"'
      ];
      function encode_utf8(s) {
        return unescape( encodeURIComponent( s ) );
      }
      kottans.forEach(function(kottan) {
        var res = '';
        var courses = angular.isArray(kottan.courses) ? kottan.courses : [kottan.courses]
        res += '"' + encode_utf8(kottan.name)  + '", ';
        res += '"' + kottan.email + '", ';
        res += '"' + kottan.skype + '", ';
        res += '"' + (courses.indexOf('js') > -1 ? 'TRUE' : 'FALSE') + '", '
        res += '"' + (courses.indexOf('java') > -1 ? 'TRUE' : 'FALSE') + '", '
        res += '"' + (courses.indexOf('ruby') > -1 ? 'TRUE' : 'FALSE') + '", '
        res += '"' + (courses.indexOf('csharp') > -1 ? 'TRUE' : 'FALSE') + '"'
        CSV.push(res)
      })
      CSV = CSV.join('\n');
      // returning base64encoded data
      return btoa(CSV);
    }
    function formAjaxData(csvData) {
      var metadata = {
        title: 'kottans_export.csv',
        mimeType: 'application/vnd.google-apps.spreadsheet',
      }
      // mimeType: "application/vnd.google-apps.spreadsheet"
      var boundary = '-------314159265358979323846';
      var delimiter = "\r\n--" + boundary + "\r\n";
      var close_delim = "\r\n--" + boundary + "--";
      var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/csv' + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        csvData +
        close_delim;
      return [multipartRequestBody, boundary];
    }
    function doPost(ajaxData, boundary) {
      return $.ajax({
        type: "POST",
        headers: {
            Authorization: "Bearer " + $scope.auth.user.accessToken
        },
        url: "https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart",
        data: ajaxData,
        processData: false,
        contentType: 'multipart/mixed;boundary=' + boundary
      }).done(function(response) {
          $scope.lastExportLink = response.alternateLink;
          $scope.$apply();
          console.log("post succeeded");
          if (response == null) {
              console.log("response was null");
          } else {
              console.log(response);
          }
      }).fail(function(error) {
          console.log("post failed");
          console.log(error);
      })
    }

    $scope.exportDataToSpreadsheet = function (kottans) {
      var csvData = getCsvData(kottans);
      var result = formAjaxData(csvData);
      var ajaxData = result[0], boundary = result[1];
      if (!$scope.auth.thirdPartyUserData) {
        return $scope.login().then(function(){
          doPost(ajaxData, boundary)
        })
      }
      return doPost(ajaxData, boundary)
    };

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