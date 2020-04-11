import Server from './server.js'
import Entity from './entity.js'

const Tests = [

  function testServerFixName () {
    console.assert(Entity.isNumeric('0'))
    console.assert(Entity.isNumeric('1'))
    console.assert(Entity.fixName('client-name') === 'client-0-name-0',
      'Should include a number in the end of each part')
    console.assert(Entity.fixName('client-0-name-0') === 'client-0-name-0',
      'Should not change a complete name')
    console.assert(Entity.fixName('patient-name-0', 'client') === 'client-0-patient-0-name-0',
      'Should prepend a collection, if given')
    console.assert(Entity.fixName('client-patient-name-0', 'other') === 'client-0-patient-0-name-0',
      'Should not prepend a collection if there is already one')
  },

  function testNameToAttributes () {
    const n1 = Entity.nameToAttributes(Entity.fixName('client-name'))
    const n2 = Entity.nameToAttributes(Entity.fixName('client-name-0'))
    const n3 = Entity.nameToAttributes(Entity.fixName('patient-name-0', 'client'))
    const n4 = Entity.fixName('client-patient-name-0', 'other')
    console.assert(!n1.parent && n1.entity === 'client' && parseInt(n1.fieldPosition, 10) === 0,
      'Should fix name and convert to Attributes ')
    console.assert(!n2.parent, 'Should not find parent if there is none')
    console.assert(n3.parent === 'client', 'Should find parent')
  },

  function testFieldListToEntity () {
    const fieldList = [
      { parent: 'client', entity: 'patient', field: 'name', value: 'rex' },
      { entity: 'client', field: 'name', value: 'John' },
      { entity: 'client', field: 'email', value: 'john@john' },
      { parent: 'patient', entity: 'appointment', field: 'date', value: 'today' }
    ]
    const entity = Entity.toEntity(fieldList)
    console.assert(
      entity.name === 'John' &&
      entity.patient[0].name === 'rex' &&
      entity.email === 'john@john' &&
      entity.patient[0].appointment[0].date === 'today',
      entity
    )
  },

  function testKeyfyRecursive () {
    Server.setUpDatabase()
      .then(() => {
        const obj = {
          patient: [
            { name: 'rex', appointment: [{ date: 'today' }] },
            { name: 'doc', appointment: [{ date: 'yesterday' }] },
            { name: 'clara', appointment: [{ date: 'tomorrow' }] }
          ],
          appointment: {date: 'yesterday'},
          name: 'John',
          email: 'john@john',
          entity: 'client'
        }
        Entity.keyfyRecursive(obj)
        console.assert(obj.key, obj )
        console.assert(obj.patient[0].key)
        console.assert(obj.patient[1].key)
        console.assert(obj.patient[2].key)
        console.assert(obj.appointment.key)
      })
  },


  function testReferencify () {
    Server.setUpDatabase()
      .then(() => {
        const obj = {
          patient: [
            { name: 'rex', appointment: [{ date: 'today' }] },
            { name: 'doc', appointment: [{ date: 'yesterday' }] },
            { name: 'clara', appointment: [{ date: 'tomorrow', patient: {name: 'Nelson'} }] }
          ],
          appointment: {date: 'yesterday'},
          name: 'John',
          email: 'john@john',
          entity: 'client'
        }
        console.debug((Entity.referencify(Entity.keyfyRecursive(obj))))
      })
  }

]

export default Tests
