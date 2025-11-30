/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2151843437")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "listRule": null
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2151843437")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "user.id = @request.auth.id",
    "listRule": "user = @request.auth.id"
  }, collection)

  return app.save(collection)
})
