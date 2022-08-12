/* eslint-disable no-array-constructor */

class LeewayPoint {
  AWA: number
  Clift: number
  Cdrag: number
  Aref: number

  constructor (coef) {
    this.AWA = coef[0]
    this.Clift = coef[1]
    this.Cdrag = coef[2]
    this.Aref = coef[3]
  }
}

export const myLwyTab = [[0, 0, 0, 55],
  [10, 0.6, 0.01, 55],
  [15, 1.1, 0.02, 55],
  [20, 1.24, 0.03, 55],
  [25, 1.3, 0.03, 55],
  [30, 1.3, 0.04, 55],
  [40, 1.2, 0.07, 55],
  [50, 1.1, 0.1, 83],
  [60, 1, 0.15, 83],
  [70, 0.9, 0.22, 83],
  [80, 0.8, 0.33, 83],
  [90, 0.6, 0.46, 83],
  [100, 0.5, 0.57, 93],
  [110, 0.42, 0.68, 93],
  [120, 0.36, 0.8, 93],
  [130, 0.3, 0.88, 93],
  [140, 0.26, 0.93, 93],
  [150, 0.2, 0.96, 93],
  [160, 0.15, 0.95, 93],
  [170, 0.07, 0.93, 93],
  [180, 0, 0.9, 93]]

const K1 :number = 0.00017 // Empiric from data analysis
const MaxLeeway :number = 6 // Keep it below this max value

export class LeewayTable {
  private leewayPoints: Array<LeewayPoint>

  constructor (lwTable) {
    this.leewayPoints = []
    for (let i: number = 0; i < 180; i++) {
      this.leewayPoints.push(this.getInterpolated(i, lwTable))
    }
  }

  get (awa:number, aws:number, bspd:number) {
    let lwy = 0

    let idx = Math.round(awa * 180 / Math.PI)
    if (idx === 180) { idx = 0 }

    const cd = this.leewayPoints[idx].Cdrag
    const cl = this.leewayPoints[idx].Clift
    const aref = this.leewayPoints[idx].Aref

    const hf = aws * aws * (cd * Math.sin(awa) + cl * Math.cos(awa)) * aref

    if (bspd !== 0) { lwy = Math.asin(K1 * hf / bspd / bspd) } else { lwy = 0 }

    if (lwy > MaxLeeway) { lwy = MaxLeeway }

    return lwy
  }

  getInterpolated (awa, lwp): LeewayPoint {
    const i:number = lwp.findIndex(x => x[0] > awa)

    if (i) {
      const lp1 = new LeewayPoint(lwp[i])
      const lp0 = new LeewayPoint(lwp[i - 1])

      const dx = (awa - lp0.AWA) / (lp1.AWA - lp0.AWA)
      if (dx !== 0) {
        const dcd = lp1.Cdrag - lp0.Cdrag
        const dcl = lp1.Clift - lp0.Clift
        const daref = lp1.Aref - lp0.Aref

        const cd = lp0.Cdrag + dx * dcd
        const cl = lp0.Clift + dx * dcl
        const aref = lp0.Aref + dx * daref

        return { AWA: awa, Clift: cl, Cdrag: cd, Aref: aref }
      } else { return { AWA: lp0.AWA, Clift: lp0.Clift, Cdrag: lp0.Cdrag, Aref: lp0.Aref } }
    }
  }
}
