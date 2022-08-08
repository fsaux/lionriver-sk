"use strict";
/* eslint-disable no-array-constructor */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeewayTable = exports.myLwyTab = void 0;
var LeewayPoint = /** @class */ (function () {
    function LeewayPoint(coef) {
        this.AWA = coef[0];
        this.Clift = coef[1];
        this.Cdrag = coef[2];
        this.Aref = coef[3];
    }
    return LeewayPoint;
}());
exports.myLwyTab = [[0, 0, 0, 55],
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
    [180, 0, 0.9, 93]];
var K = 0.00017; // Empiric from data analysis
var MaxLeeway = 6; // Keep it below this max value
var LeewayTable = /** @class */ (function () {
    function LeewayTable(lwTable, app) {
        this.leewayPoints = [];
        for (var i = 0; i < 180; i++) {
            this.leewayPoints.push(this.getInterpolated(i, lwTable));
        }
    }
    LeewayTable.prototype.get = function (awa, aws, bspd) {
        var lwy = 0;
        var idx = Math.round(awa * 180 / Math.PI);
        if (idx === 180) {
            idx = 0;
        }
        var cd = this.leewayPoints[idx].Cdrag;
        var cl = this.leewayPoints[idx].Clift;
        var aref = this.leewayPoints[idx].Aref;
        var hf = aws * aws * (cd * Math.sin(awa) + cl * Math.cos(awa)) * aref;
        if (bspd !== 0) {
            lwy = Math.asin(K * hf / bspd / bspd) * 180 / Math.PI;
        }
        else {
            lwy = 0;
        }
        if (lwy > MaxLeeway) {
            lwy = MaxLeeway;
        }
        return lwy;
    };
    LeewayTable.prototype.getInterpolated = function (awa, lwp) {
        var i = lwp.findIndex(function (x) { return x[0] > awa; });
        if (i) {
            var lp1 = new LeewayPoint(lwp[i]);
            var lp0 = new LeewayPoint(lwp[i - 1]);
            var dx = (awa - lp0.AWA) / (lp1.AWA - lp0.AWA);
            if (dx !== 0) {
                var dcd = lp1.Cdrag - lp0.Cdrag;
                var dcl = lp1.Clift - lp0.Clift;
                var daref = lp1.Aref - lp0.Aref;
                var cd = lp0.Cdrag + dx * dcd;
                var cl = lp0.Clift + dx * dcl;
                var aref = lp0.Aref + dx * daref;
                return { AWA: awa, Clift: cl, Cdrag: cd, Aref: aref };
            }
            else {
                return { AWA: lp0.AWA, Clift: lp0.Clift, Cdrag: lp0.Cdrag, Aref: lp0.Aref };
            }
        }
    };
    return LeewayTable;
}());
exports.LeewayTable = LeewayTable;
