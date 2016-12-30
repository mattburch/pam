pamApp.controller('pamSubList', function($scope, $http) {
  $scope.button = {radio: $scope.subject}; // Subject Radio object definition
  getSubList();

  // Standard subject query
  function getSubList() {
     $http.get('/notes/sublist').
     then ( function successCallback(obj) {
         $scope.subList = obj.data;
     }, function errorCallback() {handelError});
  };

  // Update scope when subject selected
  $scope.checkSubject = function(sub) {
      return sub == $scope.subject;
  };

  $scope.$watch('button.radio', function(newVal, oldVal, scope) {
    $scope.subject = newVal;
  });

  // Search control functions
  $scope.selectedSubjects = function(sub) {
    $scope.check[sub] = !$scope.check[sub];
  };

});

pamApp.controller('pamIMG', function($scope, $http, $routeParams, Lightbox) {
  var imgView = [];
  // $scope.imgList = []
  getIMGList();

  function getIMGList() {
    if ($routeParams.id != null) {
      $http.get('/img/' + $routeParams.id + '/list').
      then ( function successCallback(obj) {
        $scope.imgList = obj.data;
        buildView();
      }, function errorCallback() {handelError});
    };
   };

   $scope.deleteIMG = function(img) {
     var re = new RegExp("\\[!\\[" + img.id + "\\]\\(/img/" + img.id + "\\)\\]\\(/img/" + img.id + "\\)", "g");
     var html = document.getElementById("textbox").innerHTML;
     html = html.replace(re, '');
     $http.delete('/img/' +  img.id, {}).
     then ( function successCallback() {
         document.getElementById("textbox").innerHTML = html.replace(re, '');
         getIMGList();
     }, function errorCallback() {handelError});
   };

   // Call Modal Lightbox
   $scope.openLightboxModal = function (index) {
     // Check if contains image ID
     if (typeof index === "string") {
      for (i = 0; i < imgView.length; i++){
        url = imgView[i].url.split("/");
        if (url[url.length - 1] === index) {
          Lightbox.openModal(imgView, i);
          return
        };
      };
     } else {
       Lightbox.openModal(imgView, index);
     };
   };

   function buildView() {
     imgView = [];
     $scope.imgList.forEach( function(img) {
       imgView.push({
         "url": "/img/" + img
       });
     });
   };

});

pamApp.controller('EditCtrl', function($scope, $http, $routeParams, $location) {
    $scope.id = $routeParams.id;
    // $scope.imgList = [];
    getResult();

    $scope.save = function() {
        var subject = $scope.subject;
        var title = $scope.title;
        var content = document.getElementById("textbox").innerHTML;
        if (typeof subject !== 'string' || title.length < 1) {
            return setAlert("You're going to have to set a subject!");
        }
        if (typeof title !== 'string' || title.length < 1) {
            return setAlert("You're going to have to set a title!");
        }
        $http.put('/notes/' + $routeParams.id, {
            "subject": subject,
            "title": title,
            "content": content
        }).then ( function successCallback(obj) {
            $location.path('/notes/' + $routeParams.id);
          }, function errorCallback() {handelError});
    };

    $scope.updateNote = function() {
        $http.put('/notes/' + $routeParams.id, {
            "subject": subject,
            "title": title,
            "content": content
        }).then ( function errorCallback() {handelError});
    };

    function getResult() {
        $http.get('/notes/' + $routeParams.id).
        then ( function successCallback(obj) {
            $scope.subject = obj.data.subject;
            $scope.title = obj.data.title;
            document.getElementById("textbox").innerHTML = obj.data.content;
        }, function errorCallback() {handleError});
    };

    function handleError() {
        $scope.alert = "Welp, something wen't wrong!";
    }

    function setAlert(message) {
        $scope.alert = message;
    }
});

pamApp.controller('NewCtrl', function($scope, $http, $location) {

    $scope.add = function() {
        var subject = $scope.subject;
        var title = $scope.title;
        var content = " ";
        if (typeof subject !== 'string' || subject.length < 1) {
            return setAlert("You're going to have to set a subject!");
        }
        if (typeof title !== 'string' || title.length < 1) {
            return setAlert("You're going to have to set a title!");
        }
        $http.post('/notes', {
            "subject": subject,
            "title": $scope.title,
            "content": content
        }).then(function successCallback(obj) {
            data = obj.data.replace(/"/g, '')
            $location.path('/notes/' + data);
          }, function errorCallback() {
            setAlert("Welp, something wen't wrong!");
          });
    };

    $scope.checkSubject = function(sub) {
        return sub == $scope.subject;
    };

    function setAlert(message) {
        $scope.alert = message;
    };

    function handleError() {
        $scope.alert = "Welp, something wen't wrong!";
    };
});

pamApp.controller('NoteCtrl', function($scope, $http, $routeParams, $location) {
  getResult()

  $scope.edit = function() {
      $location.path('/notes/' + $routeParams.id + '/edit');
  };

  $scope.delete = function() {
      $http.delete('/notes/' + $routeParams.id).
      then ( function successCallback() {
          $location.path('/');
      }, function errorCallback() {
          $scope.alert = "Welp, something wen't wrong!";
      });
  };

  function getResult() {
      $http.get('/notes/' + $routeParams.id).
      then ( function successCallback(obj) {
        $scope.results = obj.data;
      }, function errorCallback() {
        $scope.alert = "Welp, something wen't wrong!";
      });
  }

  $scope.$watch('results', function(newVal, oldVal) {
      if (newVal) {
          $http.get('/notes/subject/' + $scope.results.subject).
          then ( function successCallback(obj) {
            $scope.noteList = obj.data;
          }, function errorCallback() {
            $scope.alert = "Server error I guess :/";
          });
      };
  });
});

pamApp.controller('SearchCtrl', function($scope, $http, $location) {
    var shown = 0;
    $scope.check = {};
    var subjects = [];
    $scope.moreResults = $scope.count > shown;

    $scope.search = function() {
        $scope.results = null;
        var term = encodeURIComponent($scope.searchTerm);
        if (term === 'undefined') {
            return $scope.alert = "Search for something or die for nothing!";
        }
        for (var key in $scope.check) {
            if ($scope.check[key] == true) {
                subjects.push(key);
            }
        }
        $http.post('/search', {
          "query": term,
          "subject": subjects
        }).then ( function successCallback(obj) {
            $scope.alert = null;
            if (obj.data.count === 0) {
                return $scope.alert = "No results found, how about you add one!";
            }
            $scope.count = obj.data.count;
            $scope.results = obj.data.results;
            shown += 10;
            $scope.moreResults = obj.data.count > shown;
            subjects = [];
        }, function errorCallback() {
            $scope.alert = "Server error I guess :/";
            subjects = [];
        });
        shown = 0;
    };

    $scope.delete = function(id) {
        $http.delete('/notes/' + id).
        then ( function successCallback() {
            $scope.results = $scope.results.filter( function(r) {
                return r.id !== id;
            })
            $scope.count --;
        }, function errorCallback() {
            $scope.alert = "Welp, something wen't wrong!";
        });
    };

    $scope.$watch('count', function(newVal, oldVal) {
        if (newVal == 0) {
            $location.path('/#!')
        };
    });

    $scope.more = function() {
        var term = encodeURIComponent($scope.searchTerm);
        $http.post('/search', {
          "query": term,
          "show": shown,
          "subject": subjects
        }).then ( function successCallback(obj) {
            $scope.results = obj.data.results;
            shown += 10;
            $scope.moreResults = obj.data.count > shown;
        }, function errorCallback() {
            $scope.alert = "Server error I guess :/";
        });
    };

    function handleError() {
        $scope.alert = "Welp, something wen't wrong!";
    };
});
