/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1959287055")

  // remove field
  collection.fields.removeById("json540980950")

  // remove field
  collection.fields.removeById("json1938837207")

  // remove field
  collection.fields.removeById("json3169615425")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1959287055")

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "json540980950",
    "maxSize": 0,
    "name": "prefernces",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "json1938837207",
    "maxSize": 0,
    "name": "recommendations",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "json3169615425",
    "maxSize": 0,
    "name": "conversation_history",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
