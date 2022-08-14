import * as fs from 'fs'

export class PolarPoint {
  twa: number
  spd: number
}

export class PolarLine {
  tws:number
  beatTwa:number
  beatSpd:number
  runTwa:number
  runSpd:number
  points: PolarPoint[]

  constructor (s:string) {
    const str:string[] = s.split(',')
    this.tws = parseFloat(str[0])
    this.points = []

    let runVmg :number = 0; let beatVmg:number = 0
    let i = 1

    while (i < str.length) {
      const p = new PolarPoint()
      p.twa = parseFloat(str[i])
      p.spd = parseFloat(str[i + 1])
      this.points.push(p)

      const vmg = p.spd * Math.cos(p.twa * Math.PI / 180)
      if (vmg > beatVmg) {
        beatVmg = vmg
        this.beatTwa = p.twa
        this.beatSpd = p.spd
      }

      if (vmg < runVmg) {
        runVmg = vmg
        this.runTwa = p.twa
        this.runSpd = p.spd
      }
      i += 2
    }

    const tempPoints: PolarPoint[] = []

    for (let a = 0; a <= 180; a += 2) {
      const tempPoint = new PolarPoint()
      tempPoint.twa = a
      tempPoint.spd = this.getTargetInterpolated(a)
      tempPoints.push(tempPoint)
    }

    this.points = tempPoints
  }

  getTarget (twa): number {
    const idx = Math.round(twa / 2)
    if (idx > 90) return null
    return this.points[idx].spd
  }

  getTargetInterpolated (twa:number) : number {
    let p1 = new PolarPoint()
    let p2 = new PolarPoint()

    const i = this.points.findIndex(p => p.twa >= twa)

    let speed = null

    if (i == 0) return this.points[0].spd

    if (i !== -1) {
      p2 = this.points[i]
      p1 = this.points[i - 1]
      speed = p1.spd + (twa - p1.twa) * (p2.spd - p1.spd) / (p2.twa - p1.twa)
    }
    return speed
  }
}

export class Polar {
  name:string
  lines:PolarLine[]

  constructor (name: string, fn: string) {
    this.name = name
    this.lines = []

    try {
      const contents = fs.readFileSync(fn, 'utf-8')
      const arr: string[] = contents.split(/\r?\n/)
      arr.forEach(x => {
        const pl = new PolarLine(x)
        if (pl.tws) { this.lines.push(pl) }
      })
    } catch { this.lines = null }
  }

  getTarget (twa:number, tws:number):number {
    twa = (twa + 360) % 360
    if (twa > 180) twa = 360 - twa

    let i = 0

    const maxIndex = this.lines.length - 1

    while (this.lines[i].tws < tws && i < maxIndex) {
      i++
    }

    if (i == 0) return 0

    if (tws > this.lines[i].tws) return this.lines[maxIndex].getTarget(twa)

    const bs1 = this.lines[i - 1].getTarget(twa)
    const bs2 = this.lines[i].getTarget(twa)
    const tws1 = this.lines[i - 1].tws
    const tws2 = this.lines[i].tws

    return bs1 + (bs2 - bs1) * (tws - tws1) / (tws2 - tws1)
  }

  getBeatTarget (tws:number):PolarPoint {
    let i = 0

    const bp = new PolarPoint()

    const maxIndex = this.lines.length - 1

    while (this.lines[i].tws < tws && i < maxIndex) {
      i++
    }

    if (i == 0) {
      bp.spd = 0
      bp.twa = 0
      return bp
    }

    if (tws > this.lines[i].tws) {
      bp.spd = this.lines[maxIndex].beatSpd
      bp.twa = this.lines[maxIndex].beatTwa
      return bp
    }

    const bs1 = this.lines[i - 1].beatSpd
    const bs2 = this.lines[i].beatSpd
    const tws1 = this.lines[i - 1].tws
    const tws2 = this.lines[i].tws
    const twa1 = this.lines[i - 1].beatTwa
    const twa2 = this.lines[i].beatTwa

    bp.spd = bs1 + (bs2 - bs1) * (tws - tws1) / (tws2 - tws1)
    bp.twa = twa1 + (twa2 - twa1) * (tws - tws1) / (tws2 - tws1)

    return bp
  }

  getRunTarget (tws:number):PolarPoint {
    let i = 0

    const bp = new PolarPoint()

    const maxIndex = this.lines.length - 1

    while (this.lines[i].tws < tws && i < maxIndex) {
      i++
    }

    if (i == 0) {
      bp.spd = 0
      bp.twa = 0
      return bp
    }

    if (tws > this.lines[i].tws) {
      bp.spd = this.lines[maxIndex].runSpd
      bp.twa = this.lines[maxIndex].runTwa
      return bp
    }

    const bs1 = this.lines[i - 1].runSpd
    const bs2 = this.lines[i].runSpd
    const tws1 = this.lines[i - 1].tws
    const tws2 = this.lines[i].tws
    const twa1 = this.lines[i - 1].runTwa
    const twa2 = this.lines[i].runTwa

    bp.spd = bs1 + (bs2 - bs1) * (tws - tws1) / (tws2 - tws1)
    bp.twa = twa1 + (twa2 - twa1) * (tws - tws1) / (tws2 - tws1)

    return bp
  }
}
