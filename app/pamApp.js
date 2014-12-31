var pamApp = angular.module('pamApp', ['ngRoute', 'ngSanitize', 'hc.marked']);

pamApp.config(function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'components/search.html',
        controller: 'SearchCtrl'
    }).
    when('/new', {
        templateUrl: 'components/new.html',
        controller: 'NewCtrl'
    }).
    when('/notes/:id', {
        templateUrl: 'components/note.html',
        controller: 'NoteCtrl'
    }).
    when('/notes/:id/edit', {
        templateUrl: 'components/edit.html',
        controller: 'EditCtrl'
    }).
    otherwise({
        redirectTo: '/'
    });
});

pamApp.config(function(markedProvider) {
    markedProvider.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      tables: true,
      breaks: true,
      pedantic: false,
      sanitize: true,
      smartLists: false,
      smartypants: true,
      highlight: function(code, lang) {
        if (lang && code) {
            return hljs.highlight(lang, code).value;
        }
      }
    });
});

pamApp.directive('pamSubjectListRadio', function() {
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'shared/subject/subjectlist-radio.html'
  };
})

pamApp.directive('pamSubjectListCheck', function() {
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'shared/subject/subjectlist-check.html'
  };
})

pamApp.directive('pamImageList', function() {
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'shared/image/imagelist.html'
  };
})

pamApp.directive('pamTextbox', ['$routeParams', '$http', function($routeParams, $http) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      element.on('paste', function(e) {
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        var textbox = element[0];
        if (items && items[0].type == "text/plain") {
            e.preventDefault();
            document.execCommand("insertHTML", false, e.clipboardData.getData('text'));
        } else if (items) {
            var blob = items[0].getAsFile();
            var reader = new FileReader();
            reader.onload = function(event){
                var imgurl = event.target.result;
                $http.post('/notes/' + $routeParams.id, {
                    "imgType": imgurl.match(/data:(.*?);/)[1],
                    "imgContent": imgurl.match(/base64,(.*)/)[1]
                }).success( function(data){
                    // Replace image tag with handlebars ID of the POST image
                    data = data.replace(/"/g, '')
                    var result = "[![" + data + "](/notes/" + $routeParams.id + "/" + data + ")](" + $routeParams.id + "/" + data + ")"
                    document.execCommand("insertHTML", false, result)
                    getIMG();
                }).error(handleError)
            };
            reader.readAsDataURL(blob);
        } else if (e.clipboardData.getData('text')) {
            // paste text clipboard data and strip style editing
            e.preventDefault();
            document.execCommand("insertHTML", false, e.clipboardData.getData('text'));
        } else {
            // else wait on window for paste event and POST contents
            window.setTimeout(imgPost, 0, true);
        }
      });

      element.on('keydown', function(e) {
        // remove <div> insertion in Chrmoe
        if (!!window.chrome && e.keyCode === 13 ) {
          e.preventDefault();
          document.execCommand("insertHTML", false, '<br><br>');
        }
        return false;
      })

      function imgPost() {
        var html = element[0].innerHTML;
        // extract image type and base64 content and post to DB
        $http.post('/notes/' + $routeParams.id, {
            "imgType": html.match(/data:(.*?);/)[1],
            "imgContent": html.match(/base64,(.*?)"/)[1]
        }).success( function(data){
            // Replace image tag with handlebars ID of the POST image
            data = data.replace(/"/g, '')
            element[0].innerHTML = html.replace(/<img src=.*?>/, "[![" + data + "](/notes/" + $routeParams.id + "/" + data + ")](" + $routeParams.id + "/" + data + ")");
            getIMG();
        })
      }

      function getIMG() {
          $http.get('/notes/' + $routeParams.id + '/img').
          success(function(data) {
              scope.imgList = data;
          })
      }

    }
  }
}])