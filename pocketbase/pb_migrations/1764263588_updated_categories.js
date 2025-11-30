/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3292755704")

  // update collection data
  unmarshal({
    "deleteRule": null,
    "listRule": "id !=\"\"",
    "updateRule": null,
    "viewRule": "id !=\"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3292755704")

  // update collection data
  unmarshal({
    "deleteRule": "",
    "listRule": null,
    "updateRule": "",
    "viewRule": null
  }, collection)

  return app.save(collection)
})
