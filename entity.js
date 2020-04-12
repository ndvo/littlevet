import Server from './server.js'

const Entity = {

  /**
   * Creates local keys to allow locally stored items to be referenced before
   * remote persistance.
   *
   * It also allows objects to be referenced.
   * It sets the key of the entity received and returns the key.
   */
  keyGen (entity) {
    let key
    if (!entity || !entity.key) {
      key = new Date().getTime() + ':' + Math.random()
      entity.key = key
    } else {
      key = entity.key
    }
    return key
  },

  toEntity (data, entity = null) {
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
    if (entity) fields.entity = entity
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
    if (fields.id === '') delete fields.id
    return this.keyfyRecursive(fields)
  },

  applyElement (entity, element) {
    if (entity) {
      if (Array.isArray(entity)) {
        const tpl = element.querySelector('template').content
        for (const i of entity) {
          const clone = tpl.cloneNode(true)
          this.applyElement(i, clone)
          element.append(clone)
        }
      } else if (typeof entity === 'object') {
        for (const el of element.querySelectorAll('[data-entity-field]')) {
          const field = el.getAttribute('data-entity-field').split('-')
          let value = entity
          for (const f of field) {
            value = value[f]
          }
          this.applyElement(value, el)
        }
        const elAttrs = element.querySelectorAll('[data-entity-attributes]')
        for (const el of elAttrs) {
          const attrs = el.getAttribute('data-entity-attributes').split(',')
          for (const att of attrs) {
            const keyValue = att.split(':')
            console.debug(keyValue, entity)
            if (!el.getAttribute(keyValue[0])) {
              el.setAttribute(keyValue[0], entity[keyValue[1]])
            }
          }
        }
      } else {
        let el
        if (entity && element.hasAttribute('data-entity-field')) {
          el = element
        } else {
          el = element.querySelector('[data-entity-field]')
        }
        el.textContent = entity
      }
    }
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

  validName (name) {
    const splited = name.split('-')
    if (splited.length % 2) { return false }
    for (const i = 0; i++; i < splited.length) {
      if (i % 2 && !this.isNumeric(splited[i])) { return false }
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

  /**
   * Generates keys recursively for all entities in an entity
   *
   * Changes in place and returns the entity for convenience
   */
  keyfyRecursive (entity) {
    this.keyGen(entity)
    for (const entry of Object.entries(entity)) {
      if (!entry[1]) continue
      if (Server.db.objectStoreNames.contains(entry[0])) {
        if (Array.isArray(entry[1])) {
          for (const e of entry[1]) {
            if (!e) continue
            if (!e.entity) e.entity = entry[0]
            this.keyGen(e)
            e['related-' + entity.entity] = entity.key
            this.keyfyRecursive(e)
          }
        } else {
          if (!entry[1].entity) { entry[1].entity = entry[0] }
          this.keyGen(entity[entry[0]])
          entity[entry[0]]['related-' + entity.entity] = entity.key
          this.keyfyRecursive(entity[entry[0]])
        }
      }
    }
    return entity
  },

  /**
   * Un-nest entities, leaving references where there was nested
   *
   */
  referencify (entity, entities = null) {
    if (!entities) entities = [entity]
    else entities.push(entity)
    for (const entry of Object.entries(entity)) {
      if (Server.db.objectStoreNames.contains(entry[0])) {
        if (Array.isArray(entry[1])) {
          const idArray = []
          entity[entry[0]] = idArray
          for (const item of entry[1]) {
            if (!item) continue
            idArray.push(item.key)
            this.referencify(item, entities)
          }
        } else {
          entity[entry[0]] = entry[1].key
          this.referencify(entry[1], entities)
        }
      }
    }
    return entities
  },

  referenceToNesting (entity, complete, error = console.error) {
    for (const entry of Object.entries(entity)) {
      if (Server.db.objectStoreNames.contains(entry[0])) {
        const collection = entry[0]
        const transaction = Server.db.transaction(collection)
        const store = transaction.objectStore(collection)
        if (Array.isArray(entry[1])) {
          for (let i = 0; i < entry[1].length; i++) {
            store.get(entry[1][i])
              .onsuccess = r => { entity[entry[0]][i] = r.target.result }
          }
        } else if (typeof entry[1] === 'string') {
          store.get(entry[1])
            .onsuccess = r => { entity[entry[0]] = r.target.result }
        }
        transaction.oncomplete = complete
      }
    }
  },

  /**
   * Store a list of entities
   *
   * [entity, entity, entity ...]
   */
  storeAll (entities, resolve, reject) {
    return new Promise((resolve, reject) => {
      const transaction = Server.db.transaction(
        Array.from(Server.db.objectStoreNames), 'readwrite'
      )
      for (const entity of entities) {
        if (!entity.entity || !Server.db.objectStoreNames.contains(entity.entity)) {
          console.error('Not an entity:', entity)
          transaction.abort()
        }
        const store = transaction.objectStore(entity.entity)
        const req = store.put(entity)
        req.onsuccess = console.log
        req.onerror = console.error
      }
      transaction.oncomplete = resolve
      transaction.onerror = reject
      transaction.commit()
    })
  },

  store (entity, success = () => {}, error = () => {}) {
    const req = Server.db.transaction(
      [entity.entity],
      'readwrite')
      .objectStore(entity.entity)
      .add(entity)
    req.onsuccess = success
    req.onerror = error
  }

}

export default Entity
