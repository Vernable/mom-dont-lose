/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3384545563")

  // update collection data
  unmarshal({
    "listRule": "id !=\"\"",
    "viewRule": "id !=\"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3384545563")

  // update collection data
  unmarshal({
    "listRule": "@request.method = \"GET\"",
    "viewRule": "@request.method = \"GET\""
  }, collection)

  return app.save(collection)
})
