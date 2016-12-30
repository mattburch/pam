package main

import (
	"encoding/base64"
	"log"
	"net/http"
	"sort"

	"github.com/go-martini/martini"
	"github.com/martini-contrib/render"
	"labix.org/v2/mgo"
	"labix.org/v2/mgo/bson"
)

// Constant for Not Found item
const nfound = "not found"

func addIMG(i image, p martini.Params, r render.Render, db *mgo.Database) {
	// n := &note{}
	id := p["id"]
	i.ID = bson.NewObjectId()

	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	i.NoteID = bson.ObjectIdHex(id)

	err := db.C("images").Insert(i)
	if err != nil {
		r.JSON(500, nil)
		return
	}
	r.JSON(200, i.ID)
}

func getIMG(p martini.Params, r render.Render, log *log.Logger, db *mgo.Database) {
	id := p["id"]

	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	img := &image{}
	err := db.C("images").Find(
		bson.M{"_id": bson.ObjectIdHex(id)},
	).One(&img)
	if err != nil {
		switch err.Error() {
		case nfound:
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, nil)
			return
		}
	}

	data, err := base64.StdEncoding.DecodeString(img.Content)
	if err != nil {
		r.JSON(404, nil)
	}
	r.Data(200, data)
}

func getIMGList(p martini.Params, r render.Render, db *mgo.Database) {
	id := p["id"]
	var list []imagelist

	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	err := db.C("images").Find(
		bson.M{"note_id": bson.ObjectIdHex(id)},
	).All(&list)
	if err != nil {
		switch err.Error() {
		case nfound:
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, err)
			return
		}
	}

	r.JSON(200, list)
}

func addNote(n note, r render.Render, db *mgo.Database) {
	n.ID = bson.NewObjectId()
	err := db.C("notes").Insert(n)
	if err != nil {
		r.JSON(500, nil)
		return
	}
	r.JSON(200, n.ID)
}

func updateNote(n note, p martini.Params, req *http.Request, log *log.Logger, r render.Render, db *mgo.Database) {
	id := p["id"]

	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	err := db.C("notes").Update(bson.M{
		"_id": bson.ObjectIdHex(id)}, bson.M{
		"$set": bson.M{
			"subject": n.Subject,
			"title":   n.Title,
			"content": n.Content,
		},
	})
	if err != nil {
		switch err.Error() {
		case nfound:
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, nil)
			return
		}
	}
	n.ID = bson.ObjectIdHex(p["id"])
	r.JSON(200, n)
}

func getNotesBySubject(s subject, r render.Render, db *mgo.Database, log *log.Logger) {
	var list []subject

	if s.Subject == "" {
		r.JSON(400, map[string]interface{}{"error": "query required"})
		return
	}

	err := db.C("notes").Find(
		bson.M{"subject": s.Subject}).All(&list)
	if err != nil {
		switch err.Error() {
		case nfound:
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, nil)
			return
		}
	}

	r.JSON(200, list)
}

func getNotesByTitlelist(p martini.Params, r render.Render, db *mgo.Database) {
	var list []titlelist
	sub := p["sub"]

	if sub == "" {
		r.JSON(400, map[string]interface{}{"error": "Null Title"})
		return
	}

	err := db.C("notes").Find(
		bson.M{"subject": sub}).All(&list)
	if err != nil {
		switch err.Error() {
		case nfound:
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, nil)
			return
		}
	}

	r.JSON(200, list)
}

func getNote(p martini.Params, r render.Render, db *mgo.Database) {
	id := p["id"]
	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	n := &note{}
	err := db.C("notes").Find(
		bson.M{"_id": bson.ObjectIdHex(id)},
	).One(&n)
	if err != nil {
		switch err.Error() {
		case "not found":
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, nil)
			return
		}
	}
	r.JSON(200, n)
}

func getSubList(r render.Render, db *mgo.Database) {
	var data []string
	err := db.C("notes").Find(bson.M{
		"subject": bson.M{
			"$regex":   ".*",
			"$options": "i",
		},
	}).Distinct("subject", &data)
	if err != nil {
		switch err.Error() {
		case nfound:
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, nil)
			return
		}
	}
	sort.Strings(data)
	r.JSON(200, data)
}

func deleteNote(p martini.Params, r render.Render, db *mgo.Database) {
	id := p["id"]
	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	err := db.C("notes").Remove(
		bson.M{"_id": bson.ObjectIdHex(id)},
	)
	if err != nil {
		switch err.Error() {
		case "not found":
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, nil)
			return
		}
	}
	r.JSON(200, nil)
}

func deleteIMG(p martini.Params, r render.Render, db *mgo.Database) {
	id := p["id"]
	// imgid := p["imgid"]

	if !bson.IsObjectIdHex(id) && !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}

	err := db.C("images").Remove(
		bson.M{"_id": bson.ObjectIdHex(id)},
	)
	if err != nil {
		switch err.Error() {
		case nfound:
			r.JSON(404, nil)
			return
		default:
			r.JSON(500, nil)
			return
		}
	}

	r.JSON(200, nil)

}

func noteNotFound(r render.Render) {
	r.JSON(404, nil)
}
