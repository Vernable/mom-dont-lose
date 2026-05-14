/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4163081445")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "number1237995133",
    "max": null,
    "min": null,
    "name": "likes",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "number770948625",
    "max": null,
    "min": null,
    "name": "dislikes",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4163081445")

  // remove field
  collection.fields.removeById("number1237995133")

  // remove field
  collection.fields.removeById("number770948625")

  return app.save(collection)
})
