/* eslint-disable no-unused-vars */
import { navCalc, sailingMode, NavState } from './lib/nav'
const { LinearInstrument, AngularInstrument, VectorInstrument, PositionInstrument } = require('./lib/instrument')
const { Leeway, myLwyTab } = require('./lib/leeway')
const { Polar, PolarPoint } = require('./lib/polar')
const path = require('path')
const { getAreaOfPolygon } = require('geolib')

interface ServerPlugin {
  name: string
  description?: string
  id: string,
  version?: string
  start: (config: object, restart: (newConfiguration: object) => void) => any
  stop: () => void
  schema: () => object | object
  uiSchema?: () => object | object
  registerWithRouter?: (router: any) => void
  signalKApiRoutes?: (router: any) => any
  enabledByDefault?: boolean
  statusMessage?: () => string
}

module.exports = function (app) {
  let plugin: ServerPlugin = {
    id: 'lionriver-sk',
    name: 'Lionriver navigator',
    description: 'Lionriver navigator on SK Server',
    schema: () => (CONFIG_SCHEMA),
    uiSchema: () => (CONFIG_UISCHEMA),
    start: (options:any, restart:any) => { doStartup(options, restart) },
    stop: () => { doShutdown() }
  }

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
    leeway: new AngularInstrument('navigation.leewayAngle', 3),
    drift: new VectorInstrument(
      'environment.current.drift',
      'environment.current.setTrue', 15),
    polarTgt: new VectorInstrument(
      'performance.targetSpeed',
      'performance.targetAngle', 5),
    perf: new LinearInstrument('performance.polarSpeedRatio', 5),
    laylineDst: new LinearInstrument('navigation.racing.layline.distance', 5),
    laylineTime: new LinearInstrument('navigation.racing.layline.time', 5),
    laylineBearing: new LinearInstrument('navigation.racing.layline.bearingTrue', 5),
    opLaylineDst: new LinearInstrument('navigation.racing.oppositeLayline.distance', 5),
    opLaylineTime: new LinearInstrument('navigation.racing.oppositeLayline.time', 5),
    opLaylineBearing: new LinearInstrument('navigation.racing.oppositelayline.bearingTrue', 5)
  }

  let leewayTable
  let polarTable
  let navState: NavState = { sMode: sailingMode.none }

  plugin.id = 'lionriver-sk'
  plugin.name = 'Lionriver navigator'
  plugin.description = 'Lionriver navigator on SK Server'

  const doStartup = (options:any, restart: any) => {
    // Here we put our plugin logic
    app.debug('Plugin started')

    leewayTable = new Leeway(myLwyTab)
    polarTable = new Polar('Default', path.join(app.config.configPath, options.polarFile))

    Object.values(primitives).forEach((inst) => { inst.timeout = options.dataTimeout })
    Object.values(derivatives).forEach((inst) => { inst.timeout = options.dataTimeout })

    function doNavCalcs () {
      const updObj = navCalc(app, primitives, derivatives, leewayTable, polarTable, navState)

      app.handleMessage(plugin.id, updObj)
    }

    setInterval(doNavCalcs, 1000)
  }

  const doShutdown = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    app.debug('Plugin stopped')
  }

  const CONFIG_SCHEMA = {
    properties: {
      dataTimeout: {
        title: 'Invalidate output if no input received after (seconds)',
        type: 'number',
        default: 10
      },
      polarFile: {
        title: 'Polar file',
        type: 'string',
        default: ''
      }
    }
  }

  const CONFIG_UISCHEMA = {}

  return plugin
}
