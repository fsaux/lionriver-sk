/* eslint-disable no-unused-vars */
import * as geolib from 'geolib'
import * as geoutils from 'geolocation-utils'
import { Instrument, VectorInstrument } from './instrument'
import { Leeway } from './leeway'
import { Polar, PolarPoint } from './polar'

export enum sailingMode{
  beating,
  reaching,
  running
}

export function navCalc (app, primitives, derivatives, leewayTable: Leeway,
  polarTable: Polar, sMode: sailingMode): Object {
  //
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

  let windSensorHeight = app.getSelfPath('design.airHeight')
  if (!windSensorHeight) { windSensorHeight = 10 } // Default to 10m for ORC VPP

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
      xte = -Math.asin(Math.sin(dst / 6371000) * Math.sin(brg - legbrg)) * 6371000
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
    lwy = leewayTable.get(awa, aws, spd)

    if (awa > Math.PI) { lwy = -lwy }
    const x = aws * Math.cos(awa) - spd
    const y = aws * Math.sin(awa)
    tws = Math.sqrt(x * x + y * y)
    twa = Math.atan2(y, x)

    // Set estimated saling mode in case route and/or polar data is not available
    if (Math.abs(twa) < 55 * Math.PI / 180) { sMode = sailingMode.beating } else
    if (Math.abs(twa) > 130 * Math.PI / 180) { sMode = sailingMode.running } else { sMode = sailingMode.reaching }

    vmg = spd * Math.cos(twa)
    if (hdg) {
      twd = twa + hdg
    }
  }

  derivatives.trueWind.val = {
    mod: { value: tws, timestamp: currentTime },
    ang: { value: twa, timestamp: currentTime }
  }
  derivatives.vmg.val = { value: vmg, timestamp: currentTime }
  derivatives.twd.val = { value: twd, timestamp: currentTime }
  derivatives.leeway.val = { value: lwy, timestamp: currentTime }

  let drift = null
  let set = null

  if (cog && sog && hdg && spd) {
    let dx = sog * Math.cos(cog) - spd * Math.cos(hdg)
    let dy = sog * Math.sin(cog) - spd * Math.sin(hdg)

    if (lwy) {
      const lm = spd * Math.tan(lwy)
      const la = hdg - Math.PI
      const lx = lm * Math.cos(la)
      const ly = lm * Math.sin(la)
      dx -= lx
      dy -= ly
    }

    drift = Math.sqrt(dx * dx + dy * dy)
    set = Math.atan2(dy, dx)
  }

  derivatives.drift.val = {
    mod: { value: drift, timestamp: currentTime },
    ang: { value: set, timestamp: currentTime }
  }

  let tgtspd = null
  let tgttwa = null
  let perf = null

  if (twa && spd && brg && lwy && polarTable.lines) {
    let angle = Math.abs((twd - brg) * 180 / Math.PI + 360) % 360
    if (angle > 180) angle = 360 - angle

    const pb:PolarPoint = polarTable.getBeatTarget(tws)
    const pr:PolarPoint = polarTable.getRunTarget(tws)

    if (angle <= (pb.twa + 10)) {
      // Targets are relative to boat instruments (corrected for leeway)
      tgtspd = pr.spd * Math.cos(lwy)
      tgttwa = pr.twa + lwy
      const z = (pr.spd * Math.cos(pr.twa * Math.PI / 180))
      if (z != 0) { perf = vmg / z }
      sMode = sailingMode.beating
    }

    if (angle < (pr.twa - 10) && angle > (pb.twa + 10)) {
      // Targets are relative to boat instruments (corrected for leeway)
      const tspd = polarTable.getTarget(twa + lwy, tws)
      tgtspd = tspd * Math.cos(lwy)
      tgttwa = twa
      if (tspd != 0) { perf = spd / Math.cos(lwy) / tspd }
      sMode = sailingMode.reaching
    }

    if (angle >= (pr.twa - 10)) {
      // Targets are relative to boat instruments (corrected for leeway)
      tgtspd = pr.spd * Math.cos(lwy)
      tgttwa = pr.twa + lwy
      const z = (pr.spd * Math.cos(pr.twa * Math.PI / 180))
      if (z != 0) { perf = vmg / z }
      sMode = sailingMode.running
    }
  }

  derivatives.polarTgt.val = {
    mod: { value: tgtspd, timestamp: currentTime },
    ang: { value: tgttwa, timestamp: currentTime }
  }
  derivatives.perf.val = { value: perf, timestamp: currentTime }

  // prepare update obj
  const values = []

  Object.values(derivatives).forEach((inst:Instrument<any>) => {
    if (inst.val) {
      if (inst instanceof VectorInstrument) {
        values.push({ path: inst.path[0], value: inst.val.mod })
        values.push({ path: inst.path[1], value: inst.val.ang })
      } else {
        values.push({ path: inst.path[0], value: inst.val })
      }
    }
  })

  return { updates: [{ values }] }
};
