/* eslint-disable no-unused-vars */
import * as geolib from 'geolib'
import * as geoutils from 'geolocation-utils'
import { Instrument, VectorInstrument } from './instrument'
import { LeewayTable } from './leeway'

export function calc (app, primitives, derivatives, leewayTable: LeewayTable) {
  // Get primitives
  Object.values(primitives).forEach((inst:Instrument<any>) => {
    if (inst instanceof VectorInstrument) {
      inst.val = {
        mod: app.getSelfPath(inst.path[0]),
        ang: app.getSelfPath(inst.path[1])
      }
    } else {
      inst.val = app.getSelfPath(inst.path[0])
    }
  })

  // Calculate derivatives
  const currentTime:string = new Date(Date.now()).toISOString()

  let sog = null
  let cog = null
  let dst = null
  let brg = null
  let xte = null
  let legbrg = null
  let vmgwpt = null

  if (primitives.vectorOverGround.val) {
    sog = primitives.vectorOverGround.val.mod
    cog = primitives.vectorOverGround.val.ang
  }

  if (primitives.position.val && primitives.nextWptPos.val) {
    dst = geolib.getDistance(primitives.position.val, primitives.nextWptPos.val)
    brg = geolib.getGreatCircleBearing(primitives.position.val, primitives.nextWptPos.val) * Math.PI / 180
    if (primitives.prevWptPos.val) {
      legbrg = geolib.getGreatCircleBearing(primitives.prevWptPos.val, primitives.nextWptPos.val) * Math.PI / 180
      xte = Math.asin(Math.sin(dst / 6371000) * Math.sin(brg - legbrg)) * 6371000
    }
    if (sog && cog) { vmgwpt = sog * Math.cos(cog - brg) }
  }

  derivatives.distanceToWpt.val = { value: dst, timestamp: currentTime }
  derivatives.bearingToWpt.val = { value: brg, timestamp: currentTime }
  derivatives.crossTrackError.val = { value: xte, timestamp: currentTime }
  derivatives.vmgToWpt.val = { value: vmgwpt, timestamp: currentTime }

  let spd = null
  let hdg = null
  let aws = null
  let awa = null
  let twa = null
  let tws = null
  let vmg = null
  let twd = null
  let lwy = null

  if (primitives.vectorOverWater.val) {
    spd = primitives.vectorOverWater.val.mod
    hdg = primitives.vectorOverWater.val.ang
  }
  if (primitives.appWind.val) {
    aws = primitives.appWind.val.mod
    awa = primitives.appWind.val.ang
  }

  if (awa && aws && spd) {
    const x = aws * Math.cos(awa) - spd
    const y = aws * Math.sin(awa)
    tws = Math.sqrt(x * x + y * y)
    twa = Math.atan2(y, x)
    vmg = spd * Math.cos(twa)
    if (hdg) {
      twd = twa + hdg
    }
    lwy = leewayTable.get(awa, aws, spd)
  }

  derivatives.trueWind.val = {
    mod: { value: tws, timestamp: currentTime },
    ang: { value: twa, timestamp: currentTime }
  }
  derivatives.vmg.val = { value: vmg, timestamp: currentTime }
  derivatives.twd.val = { value: twd, timestamp: currentTime }
  derivatives.leeway.val = { value: lwy, timestamp: currentTime }

  // app.debug(derivatives.trueWind.val)
  // app.debug(derivatives.vmg.val)
  // app.debug(currentTime);
};
