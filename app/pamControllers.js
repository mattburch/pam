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

    $scope.imgPaste = function(e) {
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        var textbox = document.getElementById("textbox");
        if (items && items[0].type == "text/plain") {
            return
        } else if (items) {
            var blob = items[0].getAsFile();
            var reader = new FileReader();
            reader.onload = function(event){
                var imgurl = event.target.result;
                $http.post('/notes/' + $routeParams.id, {
                    "imgType": imgurl.match(/data:(.*?);/)[1],
                    "imgContent": imgurl.match(/base64,(.*)/)[1]
                }).
                success( function(data){
                    // Replace image tag with handlebars ID of the POST image
                    data = data.replace(/"/g, '')
                    var result = document.createTextNode("[![" + data + "](/notes/" + $routeParams.id + "/" + data + ")](" + $routeParams.id + "/" + data + ")")
                    textbox.appendChild(result);
                    getIMG();
                }).error(handleError)
            };
            reader.readAsDataURL(blob);
        } else if (e.clipboardData.getData('text')) {
            // if clipboard data text return
            return
        } else {
            // else wait on window for paste event and POST contents
            window.setTimeout(imgPost, 1, true);
        }
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

    function imgPost() {
        var html = document.getElementById("textbox").innerHTML;
        // extract image type and base64 content and post to DB
        $http.post('/notes/' + $routeParams.id, {
            "imgType": html.match(/data:(.*?);/)[1],
            "imgContent": html.match(/base64,(.*?)"/)[1]
        }).
        success( function(data){
            // Replace image tag with handlebars ID of the POST image
            data = data.replace(/"/g, '')
            document.getElementById("textbox").innerHTML = html.replace(/<img src=.*?>/g, "[![" + data + "](/notes/" + $routeParams.id + "/" + data + ")](" + $routeParams.id + "/" + data + ")");
            getIMG();
        }).error(handleError)
    }

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
    $scope.add = function() {
        var subject = $scope.subject;
        var title = $scope.title;
        var content = " ";
        if (typeof subject !== 'string' || title.length < 1) {
            return setAlert("You're going to have to set a subject!");
        }
        if (typeof title !== 'string' || title.length < 1) {
            return setAlert("You're going to have to set a title!");
        }
        $http.post('/notes', {
            "action": "addNote",
            "subject": subject,
            "title": $scope.title,
            "content": content
        }).
        success(function(data) {
            data = data.replace(/"/g, '')
            $location.path('/notes/' + data);
        }).
        error(function() {
            setAlert("Welp, something wen't wrong!");
        });
    };

    function setAlert(message) {
        $scope.alert = message;
    }
});

pamApp.controller('NoteCtrl', function($scope, $http, $routeParams, $location, marked) {
    getResult()
    $scope.edit = function() {
        $location.path('/notes/' + $routeParams.id + '/edit');
    };

    $scope.delete = function() {
        $http.delete('/notes/' + $routeParams.id).
        success(function() {
            $location.path('/');
        }).
        error(function() {
            $scope.alert = "Welp, something wen't wrong!";
        });
    };

    function getResult() {
        $http.get('/notes/' + $routeParams.id).
        success(function(data) {
            data.content = marked(htmlDecode(data.content));
            $scope.results = data
        }).
        error(function() {
            $scope.alert = "Welp, something wen't wrong!";
        });
    }
});

pamApp.controller('SearchCtrl', function($scope, $http, $location, marked) {
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
            data.results.forEach( function(r) {
                r.content = imgEncode(marked(htmlDecode(r.content)));
            });
            $scope.results = data.results;
            shown += 10;
            $scope.moreResults = data.count > shown;
            subjects = [];
        }).
        error(function() {
            $scope.alert = "Server error I guess :/";
            subjects = [];
        });
    };
    $scope.delete = function(id) {
        $http.delete('/notes/' + id).
        success(function() {
            $location.path('/somewhere');
        }).
        error(function() {
            $scope.alert = "Welp, something wen't wrong!";
        });
    };
    $scope.more = function() {
        var term = encodeURIComponent($scope.searchTerm);
        $http.get('/search?q=' + term + '&s=' + shown).
        success(function(data) {
            Array.prototype.push.apply($scope.results, data.results);
            shown += 10;
            $scope.moreResults = data.count > shown;
        }).
        error(function() {
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