/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3384545563")

  // update collection data
  unmarshal({
    "createRule": " @request.auth.id != null",
    "listRule": " @request.auth.id != null",
    "updateRule": " @request.auth.id != null",
    "viewRule": " @request.auth.id != null"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3384545563")

  // update collection data
  unmarshal({
    "createRule": "id !=\"\"",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "id !=\"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
