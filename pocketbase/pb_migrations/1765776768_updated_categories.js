/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3292755704")

  // remove field
  collection.fields.removeById("text1704208859")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3292755704")

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1704208859",
    "max": 4500,
    "min": 1,
    "name": "icon",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
