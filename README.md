pam
===
This is a very simple web application for creating, storing, and retreiving simple notes.

##Features##
Pam now features:
* Markdown text conversion
* Syntax highlighting
* Image pasting and retrieval (Chrome && FF)
* Note subject categorization

##Install##
I'll package this up later. For now:
```
$ git clone https://github.com/mattburch/pam
$ cd pam/src && go build -o ../bin/pam
$ cd ../shared
$ bower install
$ cd ..
$ export PAM_MONGO_URL=mongodb://localhost:27017/pam
$ bin/pam
```

##Security##
It has none. It would be trival to build in authentication and authorization, but these are things I don't need at the moment. Best to run it locally.

##Creds##
Pam was originally developed by [Tom Steel](https://github.com/tomsteele)