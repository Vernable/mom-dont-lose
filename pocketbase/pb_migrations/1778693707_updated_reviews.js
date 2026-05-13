/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4163081445")

  // update collection data
  unmarshal({
    "createRule": "id != \"\"",
    "deleteRule": "",
    "listRule": "id != \"\"",
    "updateRule": "",
    "viewRule": "id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4163081445")

  // update collection data
  unmarshal({
    "createRule": "  @request.auth.id != \"\"",
    "deleteRule": " @request.auth.id = user.id",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": " @request.auth.id = user.id",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
