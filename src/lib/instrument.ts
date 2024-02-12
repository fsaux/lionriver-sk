
export abstract class Instrument<T> {
  path: string[] // SignalK path
  window: number // Averaging moving window size
  timeout: number // Data invalidation timeout
  expired: boolean // timeout reached
  protected avgVal: T // Average value over window time
  protected valList: T[] // List of last values over window time
  protected lastUpdate: number // Time of last valid update received

  constructor (path: string, window: number) {
    this.path = [path]
    this.window = window
    this.avgVal = null
    this.valList = []
    this.timeout = 60 * 1000 // Set default timeout to 1 minute
    this.expired = true
  }

  get val ():any {
    return this.avgVal
  }

  set val (newval: any) {
    if (newval) {
      if (newval.value !== null) {
        this.lastUpdate = Date.parse(newval.timestamp)
        if (this.expired) {
          this.valList = []
          this.expired = false
        }
        this.valList.push(newval.value)
        if (this.valList.length > this.window) { this.valList.shift() }
        this.avgVal = this.calcAvg()
      } else {
        const deltaT = Date.now() - this.lastUpdate
        if (deltaT > this.timeout * 1000) {
          if (this.avgVal == null) { this.expired = true } else { this.avgVal = null }
        }
      }
    }
  }

    abstract calcAvg():T;
}

export class LinearInstrument extends Instrument<number> {
  calcAvg () {
    return this.valList.reduce((a, b) => a + b, 0) / this.valList.length
  }
}

export class AngularInstrument extends Instrument<number> {
  calcAvg () {
    const x = this.valList.reduce((a, b) => a + Math.cos(b), 0)
    const y = this.valList.reduce((a, b) => a + Math.sin(b), 0)
    return Math.atan2(y, x)
  }
}

interface Attitude{
  yaw: number;
  pitch: number;
  roll: number;
}

export class  AttitudeInstrument extends Instrument<Attitude> {
  calcAvg () {
    const x_yaw = this.valList.reduce((a, b) => a + Math.cos(b.yaw), 0)
    const y_yaw = this.valList.reduce((a, b) => a + Math.sin(b.yaw), 0)
    const x_pitch = this.valList.reduce((a, b) => a + Math.cos(b.pitch), 0)
    const y_pitch = this.valList.reduce((a, b) => a + Math.sin(b.pitch), 0)
    const x_roll = this.valList.reduce((a, b) => a + Math.cos(b.roll), 0)
    const y_roll = this.valList.reduce((a, b) => a + Math.sin(b.roll), 0)

    return {
      yaw: Math.atan2(y_yaw, x_yaw),
      pitch: Math.atan2(y_pitch, x_pitch),
      roll: Math.atan2(y_roll, x_roll)
    }

  }
}

interface Vector{
    mod: number;
    ang: number;
}

export class VectorInstrument extends Instrument<Vector> {
  constructor (mpath: string, apath: string, window: number) {
    super(mpath, window)
    this.path.push(apath)
  }

  get val ():any {
    return this.avgVal
  }

  set val (newval: any) {
    if (newval.mod && newval.ang) {
      if (newval.mod.value !== null && newval.ang.value !== null) {
        const lu1 = Date.parse(newval.mod.timestamp)
        const lu2 = Date.parse(newval.ang.timestamp)
        this.lastUpdate = lu1 < lu2 ? lu1 : lu2
        if (this.expired) {
          this.valList = []
          this.expired = false
        }
        this.valList.push({ mod: newval.mod.value, ang: newval.ang.value })
        if (this.valList.length > this.window) { this.valList.shift() }
        this.avgVal = this.calcAvg()
      } else {
        const deltaT = Date.now() - this.lastUpdate
        if (deltaT > this.timeout * 1000) {
          if (this.avgVal.mod == null && this.avgVal.ang == null) { this.expired = true } else {
            this.avgVal = { mod: null, ang: null }
          }
        }
      }
    }
  }

  calcAvg () {
    let x = this.valList.reduce((a, b) => a + b.mod * Math.cos(b.ang), 0)
    let y = this.valList.reduce((a, b) => a + b.mod * Math.sin(b.ang), 0)
    let m = Math.sqrt(x * x + y * y) / this.valList.length

    if (x == 0 && y == 0)
    {
      x = this.valList.reduce((a, b) => a + Math.cos(b.ang), 0)
      y = this.valList.reduce((a, b) => a + Math.sin(b.ang), 0)
      m = 0
    }

    const a =  Math.atan2(y, x)

    return { mod: m, ang: a }
  }
}

interface Position{
    longitude: number;
    latitude: number;
}

export class PositionInstrument extends Instrument<Position> {
  calcAvg () {
    return this.valList[this.valList.length - 1]
  }
}
