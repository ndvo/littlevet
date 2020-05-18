import Stamp from './node_modules/@dvo/stamp/src/stamp.js'
import Server from './server.js'
import Entity from './entity.js'
import Tests from './test.js'

setUp()
const appEl = document.querySelector('#aplicacao')

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
    Stamp('#tpl-cliente-lista')
      .target('#aplicacao')
      .clearAll()
      .stamp()
    Entity.forEachInCollection('cliente',
      function (client) {
        const c = client.value
        Entity.referenceToNesting(c, function complete (evt) {
          Stamp('#tpl-cliente-cartao', { override: true })
            .change(el => {
              Entity.applyElement(c, el)
            })
            .stamp()
        })
      }
    ).then(loadingEnd)
  }

  window.AppActions.formClient = function (id) {
    stampFormClient()
    if (id) {
      Server.getById('cliente', id,
        (ev) => {
          const client = ev.target.result
          console.debug(client)
          for (let p = 0; p < client['paciente'].length; p++) {
            Stamp('#tpl-paciente-form', { override: true })
              .change(function (element) {
                uniquefy(element, p)
              })
              .stamp()
          }
          Entity.applyElement(
            client,
            document.querySelector('#aplicacao .cliente form'))
        },
        console.debug
      )
    }
  }

  window.AppActions.formPatient = function () {
    Stamp('#tpl-paciente-form')
      .change(function (element) {
        console.debug(element)
        incrementCount(this)
        uniquefy(element, this.count)
      })
      .stamp()
  }

  window.AppActions.formAtendimento = function(pacienteKey) {
    loading()
    Stamp('#tpl-atendimento', {override: true})
      .clearAll()
      .change(function (element) {
        var keyInput = element.querySelector('[name=anamnese-paciente]')
        keyInput.value = pacienteKey
      })
      .stamp(loadingEnd)
  }

  window.AppActions.stamp = function (id) {
    Stamp(id, { override: true })
      .clearAll()
      .stamp()
  }

  window.AppActions.saveClient = function (e) {
    try {
      loading()
      const data = new FormData(e.target)
      const entity = Entity.toEntity(data, 'cliente')
      Entity.storeAll(Entity.referencify(entity))
        .then(() => {
          stampMessage('Cliente salvo com sucesso', 'sucesso')
          loadingEnd()
        })
        .catch(() => {
          stampMessage('Ocorreu um erro ao salvar', 'erro')
          loadingEnd()
        })
    } catch (e) {
      console.error(e)
      loadingEnd()
    }
    return false
  }

  window.AppActions.saveAtendimento = function (e) {
    try {
      loading()
      storeEntityFromForm(
        e,
        'anamnese',
        'Atendimento salvo com sucesso',
        'Ocorreu um erro ao salvar'
      )
    } catch (e) {
      console.error(e)
      loadingEnd()
    }
    return false
  }

  window.AppActions.pacienteFull = function (key) {
    loading()
    var transaction = Server.db
      .transaction(['paciente', 'anamnese'])
    transaction
      .objectStore('paciente')
      .get(key)
      .onsuccess = function (evt) {
        const entity = evt.target.result
        Entity.referenceToNesting(entity, function () {
          Stamp('#prontuario')
            .target('#aplicacao')
            .clearAll()
            .change(e => Entity.applyElement(entity, e))
            .stamp( loadingEnd())
        })
      }
    transaction
      .objectStore('anamnese')
      .index('paciente')
      .getAll(key)
      .onsuccess = function (evt) {
        const entities = evt.target.result
        for (var entity of entities) {
          Entity.referenceToNesting(entity, function () {
            Stamp('#paciente #tpl-historico')
              .change(e => Entity.applyElement(entity, e))
              .stamp(loadingEnd)
          })
        }
      }

  }

  window.quick.semAlteracao = function (e) {
    e.parentElement.querySelector('input[type=text]').value = 'Sem alteração'
  }

  window.quick.bye = function (e) {
    e.parentElement.removeChild(e)
  }

  loadingEnd()
}


function loading (){
  console.debug('loading')
  appEl.classList.add('loading')
}

function loadingEnd () {
  appEl.classList.remove('loading')
}

function incrementCount (o) {
  if (typeof o.count == 'number') o.count += 1
  else o.count = 0
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
  Stamp('#tpl-cliente-form')
    .target('#aplicacao')
    .clearAll()
    .change(function (element) {
      incrementCount(this)
      formId = 'cliente-form-' + this.count
      element.setAttribute('id', formId)
    })
    .stamp()
  // Stamp a new pacientes formset for the new cliente
  Stamp('#tpl-pacientes')
    .target('#' + formId + ' form')
    .change(function (element) {
      element.setAttribute('id', element.getAttribute('id') + this.count)
    })
    .clear()
    .stamp()
}

/**
 * Includes retrieved templates in the head
 */
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

/**
 * return a function that adds a temporary message to the site
 */
function stampMessage (message, className) {
  console.debug('mensagem', message, className);
  Stamp('#tpl-mensagem')
    .change(el => {
      el.classList.add(className)
      el.textContent = message
      setTimeout(() => el.parentElement.removeChild(el), 5000)
    })
    .stamp()
}

/** Stores an entity from a form */
function storeEntityFromForm (event, collection, successMessage, errorMessage) {
  var e = event
  try {
    loading()
    const data = new FormData(e.target)
    const entity = Entity.toEntity(data, collection)
    console.debug(collection, data)
    Entity.storeAll(Entity.referencify(entity))
      .then(() => {
        stampMessage(successMessage, 'sucesso')
        loadingEnd()
      })
      .catch(() => {
        stampMessage(errorMessage, 'erro')
        loadingEnd()
      })
  } catch (e) {
    console.error(e)
    loadingEnd()
  }
  return false
}

