import Stamp from './node_modules/@dvo/stamp/src/stamp.js'
import Server from './server.js'
import Entity from './entity.js'
import Tests from './test.js'

const dev = true

if (dev) {
  console.debug(Tests)
  for (const f of Tests) {
    console.log('testing')
    f()
  }
}

let previousForm;

window.AppActions || (window.AppActions = {})

window.AppActions.listClient = function () {
  Stamp('#list-client')
    .target('#application')
    .clearAll()
    .stamp()
  Entity.forEachInCollection('client',
    function (client) {
      Stamp('#card-client', { override: true })
        .change(el => {
          el.querySelector('.nome').innerText = client['cliente-nome']
          el.querySelector('.telefone').innerText = client['cliente-telefone']
        })
        .stamp()
    }
  )
}

window.AppActions.formClient = function (id) {
  let formId
  Stamp('#form-client')
    .target('#application')
    .clearAll()
    .change(function (element) {
      incrementCount(this)
      formId = 'form-client' + this.count
      element.setAttribute('id', formId)
    })
    .stamp()
  Stamp('#form-pacientes')
    .target('#' + formId + ' form')
    .change(function (element) {
      element.setAttribute('id', element.getAttribute('id') + this.count)
    })
    .clear()
    .stamp()
  Stamp('#form-paciente', { override: true })
    .change(function (element) {
      incrementCount(this)
      uniquefy(element, this.count)
    })
    .stamp()
}

window.AppActions.formPatient = function () {
  Stamp('#form-paciente')
    .change(function (element) {
      incrementCount(this)
      uniquefy(element, this.count)
    })
    .stamp()
}

function incrementCount (o) {
  if (o.count) o.count += 1
  else o.count = 1
}

function uniquefy (element, count) {
  for (const el of element.querySelectorAll('[name],[id],[for]')) {
    for (const attr of ['name', 'id', 'for']) {
      const value = el.getAttribute(attr)
      if (value) el.setAttribute(attr, value + count)
    }
  }
}

window.nome = function() {
  return 'bode'
}

window.AppActions.stamp = function (id) {
  Stamp(id, { override: true })
    .clear()
    .stamp()
}

window.AppActions.saveClient = function (e) {
  try {
    const data = new FormData(e.target)
    const client = {}
    for (const entry of data.entries()) {
      client[entry[0]] = entry[1]
    }
    console.debug(data)
    const entity = Entity.toEntity(data)
    console.debug(entity)
    entity.collection = 'client'
    Entity.save(entity)
    // Server.db.setLocal('clients', client)
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
      console.log
    )
}

function prepareTemplates () {
  const templates = [
    'clients/full-form'
  ]
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
