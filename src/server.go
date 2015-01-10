package main

import (
	"github.com/docopt/docopt.go"
	"github.com/go-martini/martini"
	"github.com/martini-contrib/binding"
	"github.com/martini-contrib/render"
	"labix.org/v2/mgo"
	"labix.org/v2/mgo/bson"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

// Note contains a title and content.
type Note struct {
	ID      bson.ObjectId `json:"id" bson:"_id"`
	Subject string        `json:"subject" bson:"subject" binding:"required"`
	Title   string        `json:"title" bson:"title" binding:"required"`
	Content string        `json:"content" bson:"content" binding:"required"`
	Image   []Image       `json:"img" bson:"img"`
}

type Image struct {
	ID      bson.ObjectId `json:"imgid" bson:"img_id"`
	Type    string        `json:"imgType" bson:"img_type binding:"required"`
	Content string        `json:"imgContent" bson:"img_content" binding:"required"`
}

func (n *Note) getImage(id string) string {
	for _, img := range n.Image {
		if bson.ObjectIdHex(id) == img.ID {
			return img.Content
		}
	}
	return ""
}

func (n *Note) getIMGlist() []string {
	list := []string{}
	for _, img := range n.Image {
		list = append(list, img.ID.Hex())
	}
	return list
}

// App returns the ClassicMartini application.
func App() *martini.ClassicMartini {
	m := martini.Classic()
	m.Use(DB())
	m.Use(render.Renderer())
	m.Use(martini.Static("app"))

	m.Get("/search", func(req *http.Request, r render.Render, log *log.Logger, db *mgo.Database) {
		qs := req.URL.Query()
		q, s, sub := qs.Get("q"), qs.Get("s"), qs.Get("sub")
		if q == "" {
			r.JSON(400, map[string]interface{}{"error": "query required"})
			return
		}
		n := []Note{}
		if sub != "" {
			sublist := []string{}
			for _, s := range strings.Split(sub, ",") {
				sublist = append(sublist, s)
			}

			search := bson.M{
				"$and": []bson.M{
					bson.M{"subject": bson.M{"$in": sublist}},
					bson.M{"$or": []bson.M{
						bson.M{"title": bson.M{"$regex": q, "$options": "i"}},
						bson.M{"content": bson.M{"$regex": q, "$options": "i"}},
					}},
				},
			}
			err := db.C("notes").Find(search).All(&n)
			if err != nil {
				r.JSON(500, nil)
			}
		} else {
			search := []bson.M{
				bson.M{"title": bson.M{"$regex": q, "$options": "i"}},
				bson.M{"content": bson.M{"$regex": q, "$options": "i"}},
			}
			err := db.C("notes").Find(bson.M{"$or": search}).All(&n)
			if err != nil {
				r.JSON(500, nil)
			}
		}

		total := len(n)
		beg := 0
		end := 10
		var err error
		if s != "" {
			beg, err = strconv.Atoi(s)
			if err != nil {
				r.JSON(400, map[string]interface{}{"error": "s must be an int"})
				return
			}
			end += 10
		}
		if end > total {
			end = total
		}
		r.JSON(200, map[string]interface{}{"count": total, "skip": beg, "results": n[beg:end]})
	})

	m.Group("/notes", func(r martini.Router) {
		r.Post("", binding.Bind(Note{}), addNote)
		r.Post("/:id", binding.Bind(Image{}), postIMG)
		r.Post("/(.*)", noteNotFound)
		r.Get("/sublist", getSubList)
		r.Get("/subject", getNotesBySubject)
		r.Get("/:id/img", getIMGList)
		r.Get("/:id/:imgid", getIMG)
		r.Get("/:id", getNote)
		r.Get("(.*)", noteNotFound)
		r.Put("/:id", binding.Bind(Note{}), updateNote)
		r.Put("(.*)", noteNotFound)
		r.Delete("/:id", deleteNote)
		r.Delete("/:id/:imgid", deleteIMG)
		r.Delete("(.*)", noteNotFound)
	})

	m.NotFound(func(r render.Render) {
		r.Redirect("/", 302)
	})

	return m
}

// DB clones a mongodb session and maps it to the current context.
func DB() martini.Handler {
	session, err := mgo.Dial(os.Getenv("PAM_MONGO_URL"))
	if err != nil {
		log.Fatal(err)
	}

	return func(c martini.Context) {
		s := session.Clone()
		c.Map(s.DB("pam"))
		defer s.Close()
		c.Next()
	}
}

func main() {
	arguments, err := docopt.Parse(usage, nil, true, "pam 2.0.4", false)
	if err != nil {
		log.Fatal("Error parsing usage. Error: ", err.Error())
	}

	err = os.Setenv("HOST", arguments["--bind_ip"].(string))
	if err != nil {
		log.Fatal(err.Error())
	}
	err = os.Setenv("PORT", arguments["--bind_port"].(string))
	if err != nil {
		log.Fatal(err.Error())
	}

	App().Run()
}
