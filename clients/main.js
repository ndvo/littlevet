import Server from '../server.js'

class Client {
  collection = 'clients'

  constructor (data) {
    let entries;
    if (data instanceof FormData) {
      entries = data.entries()
    } else {
      entries = Object.entries(data)
    }
    for (const entry of data.entries()) {
      this[entry[0]] = entry[1]
    }
    if (this.id == "")
      delete this.id
  }

  save() {
    const transaction = Server.db.transaction(
      [this.collection],
      'readwrite'
    )
    transaction.oncomplete = function (event) {
      console.debug('Transaction complete', event)
    }
    transaction.onerror = function (event) {
      console.debug('Transaction error', event)
    }
    const objStore = transaction.objectStore(this.collection)
    const req = objStore.add(this, this.key)
    req.onsuccess = event => console.log('sucesso', event)
    req.onerror = event => console.error('Error in add ', event)
  }

}

export default Client
