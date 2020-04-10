
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

function getById (collection, id) {
  const request = Server.db
    .transaction(collection)
    .objectStore(collection)
    .get(id)
  request.onsuccess = (event) => {
    console.debug(event.target.result)
  }
  request.onerror = (event) => {
    console.error(event)
  }
}

function setLocal (collection, objectToStore) {
  console.debug("let's store")
  const transaction = Server.db.transaction([collection], 'readwrite')
  console.debug(transaction)
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
      let objStore = db.createObjectStore('client',
        { keyPath: 'id', autoIncrement: true })
      objStore.createIndex('name', 'name', { unique: false })

      objStore = db.createObjectStore('patient',
        { keyPath: 'id', autoIncrement: true })
      objStore.createIndex('name', 'name', { unique: false })
      objStore.createIndex('species', 'species', { unique: false })

      objStore = db.createObjectStore('appointment',
        { keyPath: 'id', autoIncrement: true })
      objStore.createIndex('date', 'date', { unique: false })

      objStore = db.createObjectStore('anamnesis',
        { keyPath: 'id', autoIncrement: true })
      objStore.createIndex('date', 'date', { unique: false })
      objStore.createIndex('patient', 'patient', { unique: false })

      objStore = db.createObjectStore('exam',
        { keyPath: 'id', autoIncrement: true })
      objStore.createIndex('date', 'date', { unique: false })
      objStore.createIndex('patient', 'patient', { unique: false })

      db.createObjectStore('templates', { keyPath: 'id' })
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
