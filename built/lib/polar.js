"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Polar = exports.PolarLine = exports.PolarPoint = void 0;
var fs = require("fs");
var PolarPoint = /** @class */ (function () {
    function PolarPoint() {
    }
    return PolarPoint;
}());
exports.PolarPoint = PolarPoint;
var PolarLine = /** @class */ (function () {
    function PolarLine(s) {
        var str = s.split(',');
        this.tws = parseFloat(str[0]);
        this.points = [];
        var runVmg = 0;
        var beatVmg = 0;
        var i = 1;
        while (i < str.length) {
            var p = new PolarPoint();
            p.twa = parseFloat(str[i]);
            p.spd = parseFloat(str[i + 1]);
            this.points.push(p);
            var vmg = p.spd * Math.cos(p.twa * Math.PI / 180);
            if (vmg > beatVmg) {
                beatVmg = vmg;
                this.beatTwa = p.twa;
                this.beatSpd = p.spd;
            }
            if (vmg < runVmg) {
                runVmg = vmg;
                this.runTwa = p.twa;
                this.runSpd = p.spd;
            }
            i += 2;
        }
        var tempPoints = [];
        for (var a = 0; a <= 180; a += 2) {
            var tempPoint = new PolarPoint();
            tempPoint.twa = a;
            tempPoint.spd = this.getTargetInterpolated(a);
            tempPoints.push(tempPoint);
        }
        this.points = tempPoints;
    }
    PolarLine.prototype.getTarget = function (twa) {
        var idx = Math.round(twa / 2);
        if (idx > 90)
            return null;
        return this.points[idx].spd;
    };
    PolarLine.prototype.getTargetInterpolated = function (twa) {
        var p1 = new PolarPoint();
        var p2 = new PolarPoint();
        var i = this.points.findIndex(function (p) { return p.twa >= twa; });
        var speed = null;
        if (i == 0)
            return this.points[0].spd;
        if (i !== -1) {
            p2 = this.points[i];
            p1 = this.points[i - 1];
            speed = p1.spd + (twa - p1.twa) * (p2.spd - p1.spd) / (p2.twa - p1.twa);
        }
        return speed;
    };
    return PolarLine;
}());
exports.PolarLine = PolarLine;
var Polar = /** @class */ (function () {
    function Polar(name, fn, app) {
        var _this = this;
        this.name = name;
        this.lines = [];
        this.app = app;
        var contents = fs.readFileSync(fn, 'utf-8');
        var arr = contents.split(/\r?\n/);
        arr.forEach(function (x) {
            var pl = new PolarLine(x);
            if (pl.tws) {
                _this.lines.push(pl);
            }
        });
    }
    Polar.prototype.getTarget = function (twa, tws) {
        twa = (twa + 360) % 360;
        if (twa > 180)
            twa = 360 - twa;
        var i = 0;
        var maxIndex = this.lines.length - 1;
        while (this.lines[i].tws < tws && i < maxIndex) {
            i++;
        }
        if (i == 0)
            return 0;
        this.app.debug(i);
        this.app.debug(maxIndex);
        if (tws > this.lines[i].tws)
            return this.lines[maxIndex].getTarget(twa);
        var bs1 = this.lines[i - 1].getTarget(twa);
        var bs2 = this.lines[i].getTarget(twa);
        var tws1 = this.lines[i - 1].tws;
        var tws2 = this.lines[i].tws;
        this.app.debug(bs1);
        this.app.debug(bs2);
        this.app.debug(tws1);
        this.app.debug(tws2);
        return bs1 + (bs2 - bs1) * (tws - tws1) / (tws2 - tws1);
    };
    return Polar;
}());
exports.Polar = Polar;
