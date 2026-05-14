/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4163081445")

  // remove field
  collection.fields.removeById("date4169042516")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "autodate3206472939",
    "name": "datecreate",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4163081445")

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "date4169042516",
    "max": "",
    "min": "",
    "name": "createdate",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // remove field
  collection.fields.removeById("autodate3206472939")

  return app.save(collection)
})
