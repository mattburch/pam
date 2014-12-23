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
      highlight: function(lang, code) {
        if (lang && code) {
            return hljs.highlight(lang, code).value;
        }
      }
    });
});