import Stamp from './node_modules/@dvo/stamp/src/stamp.js'
import Server from './server.js'
import Entity from './entity.js'
import Tests from './test.js'

setUp()
const appEl = document.querySelector('#aplicacao')

loading()

function setUp () {
  loadCredentials()
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
        Stamp('#tpl-cliente-cartao', { override: true })
          .change(el => {
            Entity.applyElement(c, el)
          })
          .stamp()
        Entity.referenceToNesting(c, function complete (evt) {
          Stamp('#tpl-cliente-cartao', { override: true })
            .change(el => {
              Entity.applyElement(c, el)
            })
            .stamp()
        })
      }
    )
      .then(loadingEnd)
      .catch((e) => {
        stampMessage('Ocorreu um erro ao carregar', 'erro')
        loadingEnd()
        throw e
      })
  }

  window.AppActions.formClient = function (id) {
    stampFormClient()
    if (id) {
      Server.getById('cliente', id,
        (ev) => {
          const client = ev.target.result
          console.debug(client)
          for (let p = 0; p < client.paciente?.length; p++) {
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

  window.AppActions.formAtendimento = function (
    pacienteKey, atendimentoKey
  ) {
    loading()
    Stamp('#tpl-atendimento', { override: true })
      .clearAll()
      .change(function (element) {
        var keyInput = element.querySelector('[name=anamnese-paciente]')
        if (pacienteKey) keyInput.value = pacienteKey
        console.debug(atendimentoKey)
        if (atendimentoKey) {
          Server.getById('anamnese', atendimentoKey,
            (ev) => {
              const atendimento = ev.target.result
              console.debug(atendimento)

              Entity.applyElement(
                atendimento,
                element
              )
            },
            console.debug
          )
        }
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
            .stamp(loadingEnd())
        })
      }
    transaction
      .objectStore('anamnese')
      .index('paciente')
      .getAll(key)
      .onsuccess = function (evt) {
        const entities = evt.target.result
        console.debug(entities)
        for (var entity of entities) {
          const etty = entity
          Entity.referenceToNesting(etty, function () {
            Stamp('#paciente #tpl-historico')
              .change(e => {
                e.setAttribute('data-entity-key', etty.key)
                console.debug(etty)
                Entity.applyElement(etty, e)
              })
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

  window.AppActions.listAgenda = function () {
    Stamp('#tpl_agenda', { override: true })
      .clearAll()
      .stamp(mostrarCompromissos)
  }

  loadingEnd()
}

function loading () {
  console.debug('loading')
  appEl.classList.add('loading')
}

function loadingEnd () {
  appEl.classList.remove('loading')
}

function incrementCount (o) {
  if (typeof o.count === 'number') o.count += 1
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
  console.debug('mensagem', message, className)
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

/*** Google Calendar ***/

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad () {
  // gapi.load('client:auth2', initClient);
}

function mostrarCompromissos () {
  gapi.load('client:auth2', initClient)
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient () {
  var CLIENT_ID = credentials.web.client_id
  var API_KEY = credentials.calendar_api_key

  // Array of API discovery doc URLs for APIs used by the quickstart
  var DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']

  // Authorization scopes required by the API; multiple scopes can be
  // included, separated by spaces.
  var SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus)
    // Handle the initial sign-in state.
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
      gapi.auth2.getAuthInstance().signIn()
    } else {
      listUpcomingEvents()
    }
  }, function (error) {
    appendPre(JSON.stringify(error, null, 2))
  })
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus (isSignedIn) {
  if (isSignedIn) {
    listUpcomingEvents()
  } else {
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick (event) {
  gapi.auth2.getAuthInstance().signIn()
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick (event) {
  gapi.auth2.getAuthInstance().signOut()
}

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre (message) {
  console.log(message)
}

/**
 * Print the summary and start datetime/date of the next ten events in
 * the authorized user's calendar. If no events are found an
 * appropriate message is printed.
 */
function listUpcomingEvents () {
  gapi.client.calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    showDeleted: false,
    singleEvents: true,
    maxResults: 10,
    orderBy: 'startTime'
  }).then(function (response) {
    var events = response.result.items
    Stamp('#tpl_evento', { override: true })
    if (events.length > 0) {
      for (var i = 0; i < events.length; i++) {
        var event = events[i]
        var when = event.start.dateTime
        if (!when) {
          when = event.start.date
        }
        Stamp('#tpl_evento')
          .change(el => {
            el.querySelector('.hora').textContent = when
            el.querySelector('.compromisso .titulo').textContent = event.summary
            el.querySelector('.compromisso .descricao').textContent = event.description
          })
          .stamp()
      }
    } else {
      Stamp('#tpl_evento')
        .change(el => {
          el.querySelector('.titulo').textCotent = 'Não há qualquer evento cadastrado'
        })
        .stamp()
    }
  })
}

var credentials
function loadCredentials () {
  fetch('/credentials.json')
    .then(r => {
      r.json().then(j => console.debug(j))
    })
}
