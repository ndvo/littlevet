import Server from './server.js'

/**
 * An entity is an object with an entity attribute that specifies the database
 * table it is stored in.
 *
 * - toEntityy: creates an entity object given some data.
 * - applyElement: sets textContent of child elements to attribute values if
 *   they have data-entity-field attribute
 * - referencify: converts an entity object to a list of entity objects
 *   replacing nested objects with their keys and adding them to the list. It
 *   'flattens' an object.
 * - nestify: for all attributes of an object, if they are keys, replace them
 *   with the actual entity refered to.
 * - keyfy: creates key for all entities without keys in an object.
 *
 *   Entity object
 *   Name pattern
 *   Field object
 */

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

  dataToEntries (data) {
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
    return entries
  },

  /**
   * Converts data into a standardized entity
   *
   * Data may be a FormData, a IDBCursorWithValue or an Object.
   */
  toEntity (data, entity = null) {
    const fields = {}
    // Convert possible data inputs to entries
    const entries = this.dataToEntries(data)
    // Every entity should have an entity field
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
    if (!fields.entity) console.error(fields, 'entity does not have an entity field and no entity was informed')
    return this.keyfyRecursive(fields)
  },

  /**
   * Fills an element with values from entity
   *
   * If entity is a scalar, textContent of element with [data-entity-field] is
   * set to entity.
   *
   * Ignores the first item of the data-entity-field if it is equal to the
   * entity attribute of the entity.
   *
   * If entity is an array, the first template child of element is appended for
   * each element of the array, recursivelly applying the entity
   *
   * If entity is an object, data-entity-field receives the values from object,
   * nestedly and recursively
   *
   */
  applyElement (entity, element) {
    const pending = {}
    if (entity) {
      if (Array.isArray(entity)) {
        const tpl = element.querySelector('template').content
        for (const i of entity) {
          const clone = tpl.cloneNode(true)
          this.applyElement(i, clone)
          element.append(clone)
        }
      } else if (typeof entity === 'object') {
        const deFields = element.querySelectorAll('[data-entity-field]')
        for (const el of deFields) {
          let willLoad = false
          let fieldRaw = el.getAttribute('data-entity-field')
          if (!fieldRaw) fieldRaw = el.getAttribute('name')
          const field = fieldRaw.split('-')

          // ignores first element if it is equal to the entity name
          if (field[0] == entity.entity) {
            field.shift()
          }

          let transaction
          let value = entity
          for (let f = 0; f < field.length; f++) {
            if (typeof value == 'string' && value.match(/^\d+:0.\d+$/)) {
              if (Array.isArray(pending[value])) {
                pending[value].push(() => this.applyElement(entity, el.parentElement))
                willLoad = true
              } else {
                pending[value] = [() => this.applyElement(entity, el.parentElement)]
                const collection = field[field.length-3]
                if (collection) {
                  transaction = Server.db.transaction(collection)
                  Server.db.transaction(collection)
                    .objectStore(collection)
                    .get(value)
                    .onsuccess = r => {
                      // Get a reference to the parent of the target field
                      // given the structure: child-position-field, we need to
                      // go back to child to set the retrieved element from the
                      // database.
                      // So we start from the original entity and walk up until
                      // 3 items less than f
                      let valueValue = entity
                      for (let ff = 0; ff <= f - 3; ff++) {
                        valueValue = valueValue[field[ff]]
                      }
                      valueValue[field[f-2]][field[f-1]] = r.target.result
                      for (const func of pending[value]) {
                        func.call()
                      }
                      pending[value] = []
                    }
                  willLoad = true
                }
              }
            } else {
              if (value) {
                value = value[field[f]]
              }
            }
          }
          if (!willLoad) this.applyElement(value, el)
        }
        const elAttrs = element.querySelectorAll('[data-entity-attributes]')
        for (const el of elAttrs) {
          const attrs = el.getAttribute('data-entity-attributes').split(',')
          for (const att of attrs) {
            const keyValue = att.split(':')
            if (!el.getAttribute(keyValue[0])) {
              el.setAttribute(keyValue[0], entity[keyValue[1]])
            }
          }
        }
      } else {
        let el
        if (element.constructor == DocumentFragment) {
          el = element.querySelector('[data-entity-field]')
        } else {
          el = element
        }
        this.setElementRelevantValue(el, entity)
      }
    }
  },

  /** Sets the main content of an element
   *
   * Some elements, like inputs, do not have contentText.
   * This function will set the 'relevant' value of the element, that is:
   * value for checkbox, radio and select
   * textContent for the others
   */
  setElementRelevantValue (el, value) {
    switch (el.tagName) {
      case 'INPUT':
        if (el.type == 'checkbox') {
          if (value == 'on') el.checked = true
          break
        } else if (el.type == 'radio') {
          console.debug(el, value)
          if (el.value == value) el.checked = true
          break
        } else {
          // fall through
        }
      case 'SELECT':
        el.value = value
        break
      default:
        el.textContent = value
    }
  },

  aggregateFields (fields) {
  },

  /**
   * Checks if a value is numeric
   * TODO: this function does not belong here
   */
  isNumeric (n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
  },

  /**
   * Converts the name of an input into a standardized form
   *
   * Standard form:
   * [parent-position-]entity-position-field-position
   *
   * If parent is given and is not already set, it is included.
   */
  fixName (name, parent = null) {
    const splited = name.split('-')
    let c = 0
    while (c++ < splited.length) {
      if (c % 2 && !this.isNumeric(splited[c])) {
        splited.splice(c, 0, 0)
      }
    }
    if (
      splited.length < 5 &&
      parent
    ) {
      splited.unshift(0)
      splited.unshift(parent)
    }
    return splited.join('-')
  },

  /**
   * Checks if a name adheres to the pattern
   *
   * Standard form:
   * [parent-position-]entity-position-field-position
   */
  validName (name) {
    const splited = name.split('-')
    if (splited.length % 2) { return false }
    for (let i = 0; i++; i < splited.length) {
      if (i % 2 && !this.isNumeric(splited[i])) { return false }
    }
    return true
  },

  /**
   * Converts a field object into a name pattern
   */
  attributesToName (a) {
    if (!a.position) { a.position = '' }
    return `${a.entity}-${a.field}-${a.position}`
  },

  /**
   * Converts a name pattern to a field object
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

  /**
   * Executes actionEach on every entity in a collectino
   */
  forEachInCollection (collection, actionEach) {
    return new Promise((resolve, reject) => {
      const transaction = Server.db.transaction(collection)
      const store = transaction.objectStore(collection)
      const openCursor = store.openCursor()
      openCursor.onsuccess = function (event) {
        const cursor = event.target.result
        if (cursor) {
          actionEach(cursor)
          cursor.continue()
        } else {
          resolve()
        }
      }
      openCursor.onerror = reject
    })
  },

  /**
   * Generates keys recursively for all entities in an entity
   *
   * Changes in place and returns the entity for convenience
   */
  keyfyRecursive (entity) {
    this.keyGen(entity)
    for (const entry of Object.entries(entity)) {
      if (!entry[1] || typeof entry[1] != 'object') continue
      if (Server.db.objectStoreNames.contains(entry[0])) {
        if (Array.isArray(entry[1])) {
          for (const e of entry[1]) {
            if (!e) continue
            if (!e.entity) e.entity = entry[0]
            this.keyGen(e)
            e[entity.entity] = entity.key
            this.keyfyRecursive(e)
          }
        } else {
          if (!entry[1].entity) { entry[1].entity = entry[0] }
          this.keyGen(entity[entry[0]])
          entity[entry[0]][entity.entity] = entity.key
          this.keyfyRecursive(entity[entry[0]])
        }
      }
    }
    return entity
  },

  /**
   * Un-nest entities, leaving references where there was nested
   */
  referencify (entity, entities = null) {
    if (!entities) entities = [entity]
    else entities.push(entity)
    const entityNames = Server.db.objectStoreNames
    for (const entry of Object.entries(entity)) {
      if (entityNames.contains(entry[0])) {
        if (Array.isArray(entry[1])) {
          const idArray = []
          entity[entry[0]] = idArray
          for (const item of entry[1]) {
            if (!item) continue
            idArray.push(item.key)
            if (!item.entity) item.entity = entry[0]
            this.referencify(item, entities)
          }
        } else if (typeof entry[1] == 'object'){
          entity[entry[0]] = entry[1].key
          if (!entry[1].entity) entry[1].entity = entry[0]
          this.referencify(entry[1], entities)
        }
      }
    }
    return entities
  },

  /**
   * Loads one level of nested entities from db
   */
  referenceToNesting (entity, complete, error = console.error) {
    const stores = Server.db.objectStoreNames
    const keys = Object.keys(entity)
    const transaction = Server.db.transaction(keys.filter(e => stores.contains(e)))
    for (const entry of Object.entries(entity)) {
      if (stores.contains(entry[0])) {
        const collection = entry[0]
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
      }
    }
    transaction.oncomplete = complete
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
