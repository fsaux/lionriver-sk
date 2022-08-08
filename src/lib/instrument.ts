
export abstract class Instrument<T> {
  path: string[] // SignalK path
  window: number // Averaging moving window size
  timeout: number // Data invalidation timeout
  protected avgVal: T // Average value over window time
  protected valList: T[] // List of last values over window time
  protected lastUpdate: number // Time of last valid update received

  constructor (path: string, window: number) {
    this.path = [path]
    this.window = window
    this.avgVal = null
    this.valList = []
    this.timeout = 60 * 1000 // Set default timeout to 1 minute
  }

  get val ():any {
    return this.avgVal
  }

  set val (newval: any) {
    if (newval) {
      if (newval.value) {
        this.lastUpdate = Date.parse(newval.timestamp)
        this.valList.push(newval.value)
      }
    }

    if (this.valList.length > this.window) { this.valList.shift() }

    const deltaT = Date.now() - this.lastUpdate

    if (deltaT < this.timeout * 1000) { this.avgVal = this.calcAvg() } else { this.avgVal = null }
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
      if (newval.mod.value && newval.ang.value) {
        const lu1 = Date.parse(newval.mod.timestamp)
        const lu2 = Date.parse(newval.ang.timestamp)
        this.lastUpdate = lu1 < lu2 ? lu1 : lu2

        this.valList.push({ mod: newval.mod.value, ang: newval.ang.value })
      }
    }

    if (this.valList.length > this.window) { this.valList.shift() }

    const deltaT = Date.now() - this.lastUpdate

    if (deltaT < this.timeout * 1000) { this.avgVal = this.calcAvg() } else { this.avgVal = null }
  }

  calcAvg () {
    const x = this.valList.reduce((a, b) => a + b.mod * Math.cos(b.ang), 0)
    const y = this.valList.reduce((a, b) => a + b.mod * Math.sin(b.ang), 0)
    return { mod: Math.sqrt(x * x + y * y) / this.valList.length, ang: Math.atan2(y, x) }
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
