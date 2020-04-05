import Server from '../server.js'

class Client {

  constructor (data) {
    let entries
    console.debug(data)
    if (data instanceof FormData) {
      entries = data.entries()
    } else if (data instanceof IDBCursorWithValue) {
      entries = Object.entries(data.value)
    } else {
      entries = Object.entries(data)
    }
    console.debug(data.value, entries)
    for (const entry of entries) {
      this[entry[0]] = entry[1]
    }
    if (this.id == '') delete this.id
  }

  static get collection () {
    return 'clients'
  }

  static forEach(action) {
    Server.db.transaction(this.collection)
      .objectStore(this.collection)
      .openCursor()
      .onsuccess = function (event) {
        const cursor = event.target.result
        if (cursor) {
          action(new Client(cursor))
          cursor.continue()
        } else {
          console.log('complete');
        }
      }
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
