import Stamp from './node_modules/@dvo/stamp/src/stamp.js'
import Server from './server.js'
import Entity from './entity.js'
import Tests from './test.js'

setUp()

function setUp () {
  Server.setUpDatabase()
    .then(
      // prepareTemplates,
      (ev) => {
        console.log('Database prepared', ev)
        start()
      }
    )
}

function start () {
  const dev = false

  if (dev) {
    console.debug('Test start')
    for (const f of Tests) {
      console.debug('Testing ', f.prototype.constructor.name, ':')
      f()
    }
  }

  let previousForm

  window.AppActions || (window.AppActions = {})
  window.quick || (window.quick = {})

  window.AppActions.listClient = function () {
    Stamp('#list-client')
      .target('#application')
      .clearAll()
      .stamp()
    Entity.forEachInCollection('client',
      function (client) {
        const c = client.value
        Entity.referenceToNesting(c, function complete(evt) {
          Stamp('#card-client', { override: true })
            .change(el => {
              Entity.applyElement(c, el)
            })
            .stamp()
        })
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

  window.nome = function () {
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
      const entity = Entity.toEntity(data, 'client')
      Entity.storeAll(Entity.referencify(entity))
    } catch (e) {
      console.error(e.message)
    }
    return false
  }

  window.quick.semAlteracao = function(e) {
    e.parentElement.querySelector('input[type=text]').value='Sem alteração';
  }

}

function incrementCount (o) {
  if (o.count) o.count += 1
  else o.count = 1
}

function uniquefy (element, count) {
  for (const el of element.querySelectorAll('[name],[id],[for]')) {
    for (const attr of ['name', 'id', 'for']) {
      let value = el.getAttribute(attr)
      if (value) {
        if (value.match(/--/)) value = value.replace('--', '-' + count + '-')
        else if (value.match(/-$/)) value = value + count
        el.setAttribute(attr, value)
      }
    }
  }
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
