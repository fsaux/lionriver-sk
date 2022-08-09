/* eslint-disable no-unused-vars */
const { LinearInstrument, AngularInstrument, VectorInstrument, PositionInstrument } = require('./lib/instrument')
const nav = require('./lib/nav')
const leeway = require('./lib/leeway')

module.exports = function (app) {
  const plugin = {}
  const unsubscribes = []
  let timer

  const primitives = {
    position: new PositionInstrument('navigation.position', 1),
    nextWptPos: new PositionInstrument('navigation.courseGreatCircle.nextPoint.position', 1),
    prevWptPos: new PositionInstrument('navigation.courseGreatCircle.previousPoint.position', 1),
    appWind: new VectorInstrument(
      'environment.wind.speedApparent',
      'environment.wind.angleApparent', 3),
    vectorOverGround: new VectorInstrument(
      'navigation.speedOverGround',
      'navigation.courseOverGroundTrue', 3),
    vectorOverWater: new VectorInstrument(
      'navigation.speedThroughWater',
      'navigation.headingTrue', 3),
    dpt: new LinearInstrument('environment.depth.belowSurface', 1),
    temp: new LinearInstrument('environment.water.temperature', 1)
  }

  const derivatives = {
    bearingToWpt: new LinearInstrument('navigation.courseGreatCircle.nextPoint.bearingTrue', 1),
    distanceToWpt: new LinearInstrument('navigation.courseGreatCircle.nextPoint.distance', 1),
    crossTrackError: new LinearInstrument('navigation.courseGreatCircle.crossTrackError', 1),
    vmgToWpt: new LinearInstrument('navigation.courseGreatCircle.nextPoint.velocityMadeGood', 3),
    trueWind: new VectorInstrument(
      'environment.wind.speedTrue',
      'environment.wind.angleTrueWater', 3),
    vmg: new LinearInstrument('performance.velocityMadeGood', 3),
    twd: new LinearInstrument('environment.wind.directionTrue', 3),
    leeway: new AngularInstrument('performance.leewayAngle', 3),
    drift: new VectorInstrument(
      'environment.current.drift',
      'environment.current.setTrue', 15)
  }

  plugin.id = 'lionriver-sk'
  plugin.name = 'Lionriver navigator plugin'
  plugin.description = 'Lionriver navigator on SK Server'

  plugin.start = function (options, restartPlugin) {
    // Here we put our plugin logic
    app.debug('Plugin started')

    Object.values(primitives).forEach((inst) => { inst.timeout = options.dataTimeout })
    Object.values(derivatives).forEach((inst) => { inst.timeout = options.dataTimeout })

    const leewayTable = new leeway.LeewayTable(leeway.myLwyTab, app)

    function doNavCalcs () {
      const updObj = nav.calc(app, primitives, derivatives, leewayTable)
      app.handleMessage(plugin.id, updObj)

      // app.debug(primitives);
    }

    setInterval(doNavCalcs, 1000)
  }

  plugin.stop = function () {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    app.debug('Plugin stopped')
  }

  plugin.schema = {
    type: 'object',
    description: 'Description',
    properties: {
      dataTimeout: {
        title: 'Invalidate output if no input received after (seconds)',
        type: 'number',
        default: '10'
      }
    }
  }

  return plugin
}
