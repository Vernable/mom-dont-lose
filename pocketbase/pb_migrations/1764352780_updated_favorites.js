/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2151843437")

  // update collection data
  unmarshal({
    "deleteRule": "user.id = @request.auth.id",
    "listRule": "user = @request.auth.id",
    "updateRule": null
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2151843437")

  // update collection data
  unmarshal({
    "deleteRule": "user = @request.auth.id",
    "listRule": null,
    "updateRule": "user = @request.auth.id"
  }, collection)

  return app.save(collection)
})
