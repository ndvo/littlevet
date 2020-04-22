
const Server = {}

const LocalStorageTemplate = 'templates'

Server.templates = {}

Server.templates.get = function get (tpl) {
  return new Promise((resolve, reject) => {
    const request = Server.db
      .transaction(LocalStorageTemplate)
      .objectStore(LocalStorageTemplate) // read only
      .get(tpl)
    request.onsuccess = (event) => {
      if (event.target.result) {
        resolve(event.target.result.template)
      } else {
        window.fetch('/' + tpl + '.html')
          .then(
            response => {
              response.text().then(
                (retrievedTpl) => {
                  setLocal(
                    LocalStorageTemplate,
                    { id: tpl, template: retrievedTpl }
                  )
                  resolve(retrievedTpl)
                }
              )
            },
            reject(new Error('No such template'))
          )
      }
    }
    request.onerror = console.error
  })
}

Server.getById = function (collection, id, success, error = console.error) {
  const request = Server.db
    .transaction(collection)
    .objectStore(collection)
    .get(id)
  request.onsuccess = success
  request.onerror = error
}

function setLocal (collection, objectToStore) {
  const transaction = Server.db.transaction([collection], 'readwrite')
  transaction.oncomplete = function (event) {
    console.debug('Transaction complete', event)
  }
  transaction.onerror = function (event) {
    console.debug('Transaction error', event)
  }
  const objStore = transaction.objectStore(collection)
  const req = objStore.add(objectToStore, objectToStore.key)
  req.onsuccess = event => console.log('sucesso', event)
  req.onerror = event => console.error('Error in add ', event)
}

Server.setUpDatabase = function () {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('littlevet', 1)
    // Create Database
    request.onupgradeneeded = function (event) {
      const db = event.target.result
      let objStore = db.createObjectStore('cliente', { keyPath: 'key' })
      objStore.createIndex('nome', 'nome', { unique: false })

      objStore = db.createObjectStore('paciente', { keyPath: 'key' })
      objStore.createIndex('nome', 'nome', { unique: false })
      objStore.createIndex('especie', 'especie', { unique: false })

      objStore = db.createObjectStore('consulta', { keyPath: 'key' })
      objStore.createIndex('data', 'data', { unique: false })

      objStore = db.createObjectStore('anamnese', { keyPath: 'key' })
      objStore.createIndex('data', 'data', { unique: false })
      objStore.createIndex('paciente', 'paciente', { unique: false })

      objStore = db.createObjectStore('exame', { keyPath: 'key' })
      objStore.createIndex('data', 'data', { unique: false })
      objStore.createIndex('paciente', 'paciente', { unique: false })

      db.createObjectStore('templates', { keyPath: 'key' })
    }
    // Returns error
    request.onerror = reject
    // Register db on Server
    request.onsuccess = function (event) {
      Server.db = event.target.result
      resolve(Server.db)
    }
  })
}

export default Server
