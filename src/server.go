package main

import (
	"log"
	"os"

	"github.com/docopt/docopt.go"
	"github.com/go-martini/martini"
	"github.com/martini-contrib/binding"
	"github.com/martini-contrib/render"
	"labix.org/v2/mgo"
	"labix.org/v2/mgo/bson"
)

// Note contains a title and content.
type note struct {
	ID      bson.ObjectId `json:"id" bson:"_id"`
	Subject string        `json:"subject" bson:"subject" binding:"required"`
	Title   string        `json:"title" bson:"title" binding:"required"`
	Content string        `json:"content" bson:"content"`
}

type image struct {
	ID      bson.ObjectId `json:"id" bson:"_id"`
	NoteID  bson.ObjectId `json:"note_id" bson:"note_id"`
	Type    string        `json:"Type" bson:"type" binding:"required"`
	Content string        `json:"Content" bson:"content" binding:"required"`
}

type imagelist struct {
	ID bson.ObjectId `json:"id" bson:"_id"`
}

type subject struct {
	Subject string `json:"subject" bson:"subject"`
}

type query struct {
	Query   string   `json:"query" bson:"query"`
	Subject []string `json:"subject" bson:"subject"`
	Show    int      `json:"show" bson:"show"`
}

// Return object for title query
type titlelist struct {
	ID    bson.ObjectId `json:"id" bson:"_id"`
	Title string        `json:"title" bson:"title"`
}

// App returns the ClassicMartini application.
func App() *martini.ClassicMartini {
	m := martini.Classic()
	m.Use(DB())
	m.Use(render.Renderer())
	m.Use(martini.Static("app"))

	m.Post("/search", binding.Bind(query{}), func(q query, r render.Render, log *log.Logger, db *mgo.Database) {
		if q.Query == "" {
			r.JSON(400, map[string]interface{}{"error": "query required"})
			return
		}
		n := []note{}
		if len(q.Subject) > 0 {

			search := bson.M{
				"$and": []bson.M{
					bson.M{"subject": bson.M{"$in": q.Subject}},
					bson.M{"$or": []bson.M{
						bson.M{"title": bson.M{"$regex": q.Query, "$options": "i"}},
						bson.M{"content": bson.M{"$regex": q.Query, "$options": "i"}},
					}},
				},
			}
			err := db.C("notes").Find(search).All(&n)
			if err != nil {
				r.JSON(500, nil)
			}
		} else {
			search := []bson.M{
				bson.M{"title": bson.M{"$regex": q.Query, "$options": "i"}},
				bson.M{"content": bson.M{"$regex": q.Query, "$options": "i"}},
			}
			err := db.C("notes").Find(bson.M{"$or": search}).All(&n)
			if err != nil {
				r.JSON(500, nil)
			}
		}

		total := len(n)
		beg := 0
		end := 10
		if q.Show > 0 {
			end += 10
		}
		if end > total {
			end = total
		}
		r.JSON(200, map[string]interface{}{"count": total, "skip": beg, "results": n[beg:end]})
	})

	m.Group("/notes", func(r martini.Router) {
		r.Post("", binding.Bind(note{}), addNote)
		r.Post("/subject", binding.Bind(subject{}), getNotesBySubject)
		r.Post("/(.*)", noteNotFound)
		r.Get("/subject/:sub", getNotesByTitlelist)
		r.Get("/sublist", getSubList)
		r.Get("/:id", getNote)
		r.Get("(.*)", noteNotFound)
		r.Put("/:id", binding.Bind(note{}), updateNote)
		r.Put("(.*)", noteNotFound)
		r.Delete("/:id", deleteNote)
		r.Delete("(.*)", noteNotFound)
	})

	m.Group("/img", func(r martini.Router) {
		r.Post("/:id", binding.Bind(image{}), addIMG)
		r.Post("/(.*)", noteNotFound)
		r.Get("/:id/list", getIMGList)
		r.Get("/:id/content", getIMGContent)
		r.Get("/:id", getIMG)
		r.Get("(.*)", noteNotFound)
		r.Delete("/:id", deleteIMG)
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
	arguments, err := docopt.Parse(usage, nil, true, "pam 2.2.1", false)
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
