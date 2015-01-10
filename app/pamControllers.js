pamApp.controller('EditCtrl', function($scope, $http, $routeParams, $location) {
    $scope.imgList = [];
    $scope.id = $routeParams.id;
    $scope.button = {radio: ''};
    getResult();
    getSubList();
    getIMG();

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
        if (typeof content !== 'string' || content.length < 1) {
            return setAlert("You're going to have to provide some sort of content!");
        }
        $http.put('/notes/' + $routeParams.id, {
            "subject": subject,
            "title": title,
            "content": content
        }).
        success(function(data) {
            $location.path('/notes/' + $routeParams.id)
        }).error(handleError);
    }

    $scope.updateNote = function() {
        $http.put('/notes/' + $routeParams.id, {
            "subject": subject,
            "title": title,
            "content": content
        }).error(handleError)
    }

    $scope.deleteIMG = function(imgid) {
        var re = new RegExp("\\[!\\[" + imgid + "\\]\\(/notes/" + $routeParams.id + "/" + imgid + "\\)\\]\\(" + $routeParams.id + "/" + imgid + "\\)", "g");
        var html = document.getElementById("textbox").innerHTML;
        html = html.replace(re, '');
        $http.delete('/notes/' + $routeParams.id + "/" + imgid, {}).
        success( function() {
            document.getElementById("textbox").innerHTML = html.replace(re, '');
            getIMG();
        }).error(handleError)
    }

    $scope.checkSubject = function(sub) {
        return sub == $scope.subject;
    }

    $scope.$watch('button.radio', function(newVal, oldVal) {
        $scope.subject = newVal;
    })

    function getIMG() {
        $http.get('/notes/' + $routeParams.id + '/img').
        success(function(data) {
            $scope.imgList = data;
        }).error(handleError);
     }

     function getSubList() {
        $http.get('/notes/sublist').
        success( function(data) {
            $scope.subList = data;
        }).error(handleError);
     }

    function getResult() {
        $http.get('/notes/' + $routeParams.id).
        success(function(data) {
            $scope.subject = data.subject;
            $scope.title = data.title;
            document.getElementById("textbox").innerHTML = data.content;
        }).error(handleError);
    }

    function handleError() {
        $scope.alert = "Welp, something wen't wrong!";
    }

    function setAlert(message) {
        $scope.alert = message;
    }
});

pamApp.controller('NewCtrl', function($scope, $http, $location) {
    $scope.button = {radio: ''};
    getSubList();

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
        }).
        success(function(data) {
            data = data.replace(/"/g, '')
            $location.path('/notes/' + data);
        }).error(function() {
            setAlert("Welp, something wen't wrong!");
        });
    };

    $scope.checkSubject = function(sub) {
        return sub == $scope.subject;
    }

    $scope.$watch('button.radio', function(newVal, oldVal) {
        $scope.subject = newVal;
    })

    function getSubList() {
        $http.get('/notes/sublist').
        success( function(data) {
            $scope.subList = data;
        }).error(handleError);
     }

    function setAlert(message) {
        $scope.alert = message;
    }

    function handleError() {
        $scope.alert = "Welp, something wen't wrong!";
    }
});

pamApp.controller('NoteCtrl', function($scope, $http, $routeParams, $location) {
    getResult()

    $scope.edit = function() {
        $location.path('/notes/' + $routeParams.id + '/edit');
    };

    $scope.delete = function() {
        $http.delete('/notes/' + $routeParams.id).
        success(function() {
            $location.path('/');
        }).error(function() {
            $scope.alert = "Welp, something wen't wrong!";
        });
    };

    function getResult() {
        $http.get('/notes/' + $routeParams.id).
        success(function(data) {
            $scope.results = data
        }).error(function() {
            $scope.alert = "Welp, something wen't wrong!";
        });
    }

    $scope.$watch('results', function(newVal, oldVal) {
        if (newVal) {
            $http.get('/notes/subject?sub=' + newVal.subject).
            success(function(data) {
                $scope.noteList = data;
            }).error(function() {
                $scope.alert = "Server error I guess :/";
            });
        }
    })

});

pamApp.controller('SearchCtrl', function($scope, $http, $location) {
    var shown = 0;
    var subjects = [];
    $scope.moreResults = $scope.count > shown;
    $scope.button = {};
    getSubList();

    $scope.search = function() {
        $scope.results = null;
        var term = encodeURIComponent($scope.searchTerm);
        if (term === 'undefined') {
            return $scope.alert = "Search for something or die for nothing!";
        }
        for (var key in $scope.button) {
            if ($scope.button[key] == true) {
                subjects.push(key);
            }
        }
        $http.get('/search?q=' + term + '&sub=' + subjects).
        success(function(data) {
            $scope.alert = null;
            if (data.count === 0) {
                return $scope.alert = "No results found, how about you add one!";
            }
            $scope.count = data.count;
            $scope.results = data.results;
            shown += 10;
            $scope.moreResults = data.count > shown;
            subjects = [];
        }).error(function() {
            $scope.alert = "Server error I guess :/";
            subjects = [];
        });
    };
    $scope.delete = function(id) {
        $http.delete('/notes/' + id).
        success(function() {
            $scope.results = $scope.results.filter( function(r) {
                return r.id !== id;
            })
            $scope.count --;
        }).error(function() {
            $scope.alert = "Welp, something wen't wrong!";
        });
    };

    $scope.$watch('count', function(newVal, oldVal) {
        if (newVal == 0) {
            $location.path('/#')
        }
    })

    $scope.more = function() {
        var term = encodeURIComponent($scope.searchTerm);
        $http.get('/search?q=' + term + '&s=' + shown).
        success(function(data) {
            Array.prototype.push.apply($scope.results, data.results);
            shown += 10;
            $scope.moreResults = data.count > shown;
        }).error(function() {
            $scope.alert = "Server error I guess :/";
        });
    }

    $scope.selectedSubjects = function(sub) {
        $scope.button[sub] = !$scope.button[sub];
    }

    function getSubList() {
        $http.get('/notes/sublist').
        success( function(data) {
            $scope.subList = data;
        }).error(handleError);
     }

    function handleError() {
        $scope.alert = "Welp, something wen't wrong!";
    }
});