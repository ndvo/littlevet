import Server from './server.js'

const Entity = {

  toEntity (data) {
    let entries
    if (data instanceof FormData) {
      entries = []
      for (const e of data.entries()) {
        const attr = this.nameToAttributes(this.fixName(e[0]))
        attr.value = e[1]
        entries.push(attr)
      }
    } else if (data instanceof IDBCursorWithValue) {
      entries = Object.entries(data.value)
    } else if (Array.isArray(data)) {
      entries = data
    } else {
      entries = Object.entries(data)
    }
    const fields = {}
    console.debug(entries)
    for (const e of entries) {
      let ctx = fields
      if (!e.parent) {
        // Set field
        ctx[e.field] = e.value
      } else {
        // Set context
        if (entries.find(ee => ee.entity === e.parent && ee.parent)) {
          if (!e.parentPosition) e.parentPosition = 0
          if (!ctx[e.parent]) ctx[e.parent] = []
          if (!ctx[e.parent][e.parentPosition]) ctx[e.parent][e.parentPosition] = {}
          ctx = ctx[e.parent][e.parentPosition]
        }
        // Set field
        if (!ctx[e.entity]) ctx[e.entity] = []
        if (!e.entityPosition) e.entityPosition = 0
        if (!ctx[e.entity][e.entityPosition]) ctx[e.entity][e.entityPosition] = {}
        ctx[e.entity][e.entityPosition][e.field] = e.value
      }
    }
    console.debug(fields)
    if (fields.id === '') delete fields.id
    return fields
  },

  aggregateFields (fields) {
  },

  isNumeric (n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
  },

  /**
   * Converts the name of an input into a standardized form
   *
   * Standard form:
   * parent-position-entity-position-field-position
   */
  fixName (name, collection = null) {
    const splited = name.split('-')
    let c = 0
    while (c++ < splited.length) {
      if (c % 2 && !this.isNumeric(splited[c])) {
        splited.splice(c, 0, 0)
      }
    }
    if (
      splited.length < 5 &&
      collection
    ) {
      splited.unshift(0)
      splited.unshift(collection)
    }
    return splited.join('-')
  },

  validName(name) {
    const splited = name.split('-')
    if (splited.length % 2)
      return false
    for (const i = 0; i++; i < splited.length) {
      if (i % 2 && !this.isNumeric(splited[i]))
        return false
    }
    return true
  },

  attributesToName (a) {
    if (!a.position) { a.position = '' }
    return `${a.entity}-${a.field}-${a.position}`
  },

  /**
   * Converts a name to a field object
   *
   */
  nameToAttributes (name) {
    const splited = name.split('-')
    return {
      parent: splited[splited.length - 6],
      parentPosition: splited[splited.length - 5],
      entity: splited[splited.length - 4],
      entityPosition: splited[splited.length - 3],
      field: splited[splited.length - 2],
      fieldPosition: splited[splited.length - 1],
      value: null
    }
  },

  forEachInCollection (collection, action) {
    Server.db.transaction(collection)
      .objectStore(collection)
      .openCursor()
      .onsuccess = function (event) {
        const cursor = event.target.result
        if (cursor) {
          action(cursor)
          cursor.continue()
        } else {
          console.log('complete')
        }
      }
  },

  save (entity, success = () => {}, error = () => {}) {
    console.debug(entity)
    const req = Server.db.transaction(
      [entity.collection],
      'readwrite')
      .objectStore(entity.collection)
      .add(entity)
    req.onsuccess = success
    req.onerror = (e) => {
      error(e)
      console.debug(e)
    }
  }

}

export default Entity
