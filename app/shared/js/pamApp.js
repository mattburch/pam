var pamApp = angular.module('pamApp', ['ngSanitize', 'ngRoute', 'hc.marked', 'bootstrapLightbox']);

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
    when('/images', {
        templateUrl: 'components/images.html',
        controller: 'IMGCtrl'
    }).
    otherwise({
        redirectTo: '/'
    });
});

pamApp.config( function(markedProvider) {
    markedProvider.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      tables: true,
      breaks: true,
      pedantic: false,
      sanitize: true,
      smartLists: true,
      smartypants: true,
      highlight: function(code, lang) {
        if (lang && code) {
            return hljs.highlight(lang, code).value;
        }
      }
    });
    markedProvider.setRenderer({
      link: function(href, title, text) {
        if (text.includes("<img") && text.includes("/notes/")) {
          img = href.split("/");
          return text.slice(0, 5) + "ng-click=\"openLightboxModal('" + img[img.length - 1]  + "')\" " + text.slice(5)
        } else {
          return "<a href='" + href + "'" + (title ? " title='" + title + "'" : '') + ">" + text + "</a>";
        }
      }
    })

});

pamApp.config( function(LightboxProvider) {
  LightboxProvider.templateUrl = 'shared/image/template.html';
  LightboxProvider.fullScreenMode = true;
});

pamApp.directive('pamSubjectListRadio', function() {
  return {
    restrict: 'E',
    controller: 'pamSubList',
    controllerAs: 'pamSub',
    templateUrl: 'shared/subject/subjectlist-radio.html',
  };
});

pamApp.directive('pamSubjectListCheck', function() {
  return {
    restrict: 'E',
    controller: 'pamSubList',
    controllerAs: 'pamSub',
    templateUrl: 'shared/subject/subjectlist-check.html'
  };
});

pamApp.directive('pamImageList', function() {
  return {
    restrict: 'E',
    transclude: true,
    scope: true,
    templateUrl: 'shared/image/imagelist.html',
  };
});

pamApp.directive('pamNoteList', function() {
  return {
    restrict: 'E',
    transclude: true,
    templateUrl: 'shared/note/notelist.html'
  };
});

pamApp.directive('pamData', function($compile, marked) {
  return {
    restrict: "E",
    controller: "pamIMG",
    controllerAs: "pdata",
    scope: {
      note: "="
    },
    link: function(scope, element, attrs) {
      scope.$watch('note', function(value) {
        if(value) {
          if (value == " ") {
            return
          }
          template = marked(htmlReplace(value));
          link = $compile(template)
          content = link(scope)
          element.append(content)
        };
      });

      function htmlReplace(str) {
        return String(str)
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, '\'')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/<br><div>|<br>/g, "\n")
            .replace(/<br\/>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/<div><\/div>|<div>/g, "\n")
            .replace(/<\/div>/g, '');
      };
    }
  };
});

pamApp.directive('pamTextbox', ['$routeParams', '$http', function($routeParams, $http) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      element.on('paste', function(e) {
        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
        var textbox = element[0];
        if (items && items[0].type == "text/plain") {
            e.preventDefault();
            document.execCommand("insertHTML", false, stripNewLine(e.clipboardData.getData('text')));
        } else if (items) {
            var blob = items[0].getAsFile();
            var reader = new FileReader();
            reader.onload = function(event) {
                var imgurl = event.target.result;
                $http.post('/notes/' + $routeParams.id, {
                    "imgType": imgurl.match(/data:(.*?);/)[1],
                    "imgContent": imgurl.match(/base64,(.*)/)[1]
                }).then ( function successCallback(obj) {
                    // Replace image tag with handlebars ID of the POST image
                    // document.execCommand("insertHTML", false, getIMGlink(obj));
                    element[0].innerHTML = element[0].innerHTML.replace(/<img .*?alt="">/, getIMGlink(obj));
                    getIMGid();
                  }, function errorCallback() {handleError});
                };
            reader.readAsDataURL(blob);
        } else if (e.clipboardData.getData('text')) {
            // paste text clipboard data and strip style editing
            e.preventDefault();
            document.execCommand("insertHTML", false, stripNewLine(e.clipboardData.getData('text')));
        } else {
            // else wait on window for paste event and POST contents
            window.setTimeout(imgPost, 0, true);
        };
      });

      // Post Image Content
      function imgPost() {
        var html = element[0].innerHTML;
        // extract image type and base64 content and post to DB
        $http.post('/notes/' + $routeParams.id, {
            "imgType": html.match(/data:(.*?);/)[1],
            "imgContent": html.match(/base64,(.*?)"/)[1]
        }).then ( function successCallbak(obj) {
            // Replace image tag with handlebars ID of the POST image
            element[0].innerHTML = element[0].innerHTML.replace(/<img .*?alt="">/, getIMGlink(obj));
            getIMGid();
        });
      };

      // Pulls IMG ID value
      function getIMGid() {
          $http.get('/notes/' + $routeParams.id + '/img').
          then (function successCallback(obj) {
              scope.imgList = obj.data;
          });
      };

      // Format IMG link
      function getIMGlink(obj) {
        data = obj.data.replace(/"/g, '');
        return "[![" + data + "](/notes/" + $routeParams.id + "/" + data + ")](/notes/" + $routeParams.id + "/" + data + ")";
      }

      // Replace \n with <br> in textbox
      function stripNewLine(str) {
          str = str.replace(/\n/g, '<br>');
          return str;
      };
    }
  };
}]);
