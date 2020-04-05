import Stamp from './node_modules/@dvo/stamp/src/stamp.js'
import Server from './server.js'

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

window.AppActions.formContato = function () {
  Stamp('#fieldset-contato')
    .stamp()
}

window.AppActions.formPatient = function () {
  Stamp('#form-patient', { override: true })
    .stamp()
}

window.AppActions.stamp = function(id) {
  Stamp(id, { override: true }).stamp()
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
