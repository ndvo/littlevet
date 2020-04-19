import Stamp from './node_modules/@dvo/stamp/src/stamp.js'
import Server from './server.js'
import Entity from './entity.js'
import Tests from './test.js'

setUp()
const appEl = document.querySelector('#application')

loading()

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
    loading()
    Stamp('#list-client')
      .target('#application')
      .clearAll()
      .stamp()
    Entity.forEachInCollection('client',
      function (client) {
        const c = client.value
        Entity.referenceToNesting(c, function complete (evt) {
          Stamp('#card-client', { override: true })
            .change(el => {
              Entity.applyElement(c, el)
            })
            .stamp()
        })
      }
    ).then(lodingEnd)
  }

  window.AppActions.formClient = function (id) {
    stampFormClient()
    if (id) {
      Server.getById('client', id,
        (ev) => {
          console.debug(ev.target.result)
          Entity.applyElement(
            ev.target.result,
            document.querySelector('#application .client form'))
        },
        console.debug
      )
    }
  }

  window.AppActions.formPatient = function () {
    Stamp('#form-paciente')
      .change(function (element) {
        incrementCount(this)
        uniquefy(element, this.count)
      })
      .stamp()
  }

  window.AppActions.stamp = function (id) {
    Stamp(id, { override: true })
      .clear()
      .stamp()
  }

  window.AppActions.saveClient = function (e) {
    try {
      loading()
      const data = new FormData(e.target)
      const entity = Entity.toEntity(data, 'client')
      Entity.storeAll(Entity.referencify(entity))
    } catch (e) {
      console.error(e)
      lodingEnd()
    }
    return false
  }

  window.AppActions.pacienteFull = function (key) {
    loding()
    Server.db
      .transaction('patient')
      .objectStore('patient')
      .get(key)
      .onsuccess = function (evt) {
        const entity = evt.target.result
        Entity.referenceToNesting(entity, function() {
          console.debug(entity)
          Stamp('#prontuario')
            .target('#application')
            .clearAll()
            .change(e => Entity.applyElement(entity, e))
            .stamp()
          lodingEnd()
        })
      }
  }

  window.quick.semAlteracao = function (e) {
    console.debug(e)
    e.parentElement.querySelector('input[type=text]').value = 'Sem alteração'
  }

  lodingEnd()
}

function loading(){
  console.debug('loading')
  appEl.classList.add('loading')
}

function lodingEnd() {
  appEl.classList.remove('loading')
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

function stampFormClient () {
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
    Stamp('#form-patients')
      .target('#' + formId + ' form')
      .change(function (element) {
        element.setAttribute('id', element.getAttribute('id') + this.count)
      })
      .clear()
      .stamp()
    Stamp('#form-patient', { override: true })
      .change(function (element) {
        incrementCount(this)
        uniquefy(element, this.count)
      })
      .stamp()
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
