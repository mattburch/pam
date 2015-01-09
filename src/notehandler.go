package main

import (
	"encoding/base64"
	"github.com/go-martini/martini"
	"github.com/martini-contrib/render"
	"labix.org/v2/mgo"
	"labix.org/v2/mgo/bson"
	"log"
	"net/http"
	"sort"
)

func postIMG(i Image, p martini.Params, r render.Render, db *mgo.Database) {
	n := &Note{}
	id := p["id"]
	i.ID = bson.NewObjectId()

	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}

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

	err = db.C("notes").Update(bson.M{
		"_id": bson.ObjectIdHex(id)}, bson.M{
		"$addToSet": bson.M{
			"img": bson.M{
				"img_id":      i.ID,
				"img_type":    i.Type,
				"img_content": i.Content,
			},
		},
	})
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
	r.JSON(200, i.ID)
}

func getIMG(p martini.Params, r render.Render, log *log.Logger, db *mgo.Database) {
	id := p["id"]
	imgid := p["imgid"]

	if !bson.IsObjectIdHex(id) || !bson.IsObjectIdHex(imgid) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	n := &Note{}
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

	data, err := base64.StdEncoding.DecodeString(n.getImage(imgid))
	if err != nil {
		r.JSON(404, nil)
	}
	r.Data(200, data)
}

func getIMGList(p martini.Params, r render.Render, db *mgo.Database) {
	id := p["id"]

	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	n := &Note{}
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

	r.JSON(200, n.getIMGlist())
}

func addNote(n Note, r render.Render, db *mgo.Database) {
	n.ID = bson.NewObjectId()
	err := db.C("notes").Insert(n)
	if err != nil {
		r.JSON(500, nil)
		return
	}
	r.JSON(200, n.ID)
}

func updateNote(n Note, p martini.Params, req *http.Request, log *log.Logger, r render.Render, db *mgo.Database) {
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
		case "not found":
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

func getNote(p martini.Params, r render.Render, db *mgo.Database) {
	id := p["id"]
	if !bson.IsObjectIdHex(id) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}
	n := &Note{}
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
		case "not found":
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
	imgid := p["imgid"]

	if !bson.IsObjectIdHex(id) && !bson.IsObjectIdHex(imgid) {
		r.JSON(400, map[string]interface{}{"error": "not a valid id"})
		return
	}

	err := db.C("notes").Update(bson.M{
		"_id": bson.ObjectIdHex(id)}, bson.M{
		"$pull": bson.M{
			"img": bson.M{
				"img_id": bson.ObjectIdHex(imgid),
			},
		},
	})
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

func noteNotFound(r render.Render) {
	r.JSON(404, nil)
}
