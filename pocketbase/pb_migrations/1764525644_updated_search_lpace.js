/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2825864838")

  // update collection data
  unmarshal({
    "name": "search_place"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2825864838")

  // update collection data
  unmarshal({
    "name": "search_lpace"
  }, collection)

  return app.save(collection)
})
