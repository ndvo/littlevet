import Stamp from './node_modules/@dvo/stamp/src/stamp.js'
import Server from './server.js'
import Client from './clients/main.js'

let previousForm;

window.AppActions || (window.AppActions = {})

window.AppActions.formClient = function (id) {
  let formId
  Stamp('#form-client')
    .target('#application')
    .clearAll()
    .change(function (element) {
      if (this.count) this.count += 1
      else this.count = 1
      formId = 'form-client' + this.count
      element.setAttribute('id', formId)
    })
    .stamp()
  Stamp('#form-patients')
    .target('#' + formId + ' form')
    .clear()
    .stamp()
}

window.AppActions.stamp = function (id) {
  Stamp(id, { override: true }).stamp()
}

window.AppActions.saveClient = function (e) {
  try {
    const data = new FormData(e.target)
    const client = {}
    for (const entry of data.entries()) {
      client[entry[0]] = entry[1]
    }
    new Client(data).save()
    //Server.db.setLocal('clients', client)
  } catch (e) {
    console.error(e.message)
  }
  return false
}

setUp()

function setUp () {
  Server.setUpDatabase()
    .then(
      //prepareTemplates,
      console.error
    )
}

function prepareTemplates () {
  const templates = [
    'clients/full-form'
  ]
  console.debug(Server)
  for (const t of templates) {
    Server.templates.get(t)
      .then(
        (t) => {
          document.getElementsByTagName('head')[0]
            .insertAdjacentHTML('beforeend', t)
        }
      )
  }
}
