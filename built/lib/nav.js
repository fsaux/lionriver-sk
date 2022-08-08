"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calc = void 0;
/* eslint-disable no-unused-vars */
var geolib = require("geolib");
var instrument_1 = require("./instrument");
function calc(app, primitives, derivatives, leewayTable) {
    // Get primitives
    Object.values(primitives).forEach(function (inst) {
        if (inst instanceof instrument_1.VectorInstrument) {
            inst.val = {
                mod: app.getSelfPath(inst.path[0]),
                ang: app.getSelfPath(inst.path[1])
            };
        }
        else {
            inst.val = app.getSelfPath(inst.path[0]);
        }
    });
    // Calculate derivatives
    var currentTime = new Date(Date.now()).toISOString();
    var sog = null;
    var cog = null;
    var dst = null;
    var brg = null;
    var xte = null;
    var legbrg = null;
    var vmgwpt = null;
    if (primitives.vectorOverGround.val) {
        sog = primitives.vectorOverGround.val.mod;
        cog = primitives.vectorOverGround.val.ang;
    }
    if (primitives.position.val && primitives.nextWptPos.val) {
        dst = geolib.getDistance(primitives.position.val, primitives.nextWptPos.val);
        brg = geolib.getGreatCircleBearing(primitives.position.val, primitives.nextWptPos.val) * Math.PI / 180;
        if (primitives.prevWptPos.val) {
            legbrg = geolib.getGreatCircleBearing(primitives.prevWptPos.val, primitives.nextWptPos.val) * Math.PI / 180;
            xte = Math.asin(Math.sin(dst / 6371000) * Math.sin(brg - legbrg)) * 6371000;
        }
        if (sog && cog) {
            vmgwpt = sog * Math.cos(cog - brg);
        }
    }
    derivatives.distanceToWpt.val = { value: dst, timestamp: currentTime };
    derivatives.bearingToWpt.val = { value: brg, timestamp: currentTime };
    derivatives.crossTrackError.val = { value: xte, timestamp: currentTime };
    derivatives.vmgToWpt.val = { value: vmgwpt, timestamp: currentTime };
    var spd = null;
    var hdg = null;
    var aws = null;
    var awa = null;
    var twa = null;
    var tws = null;
    var vmg = null;
    var twd = null;
    var lwy = null;
    if (primitives.vectorOverWater.val) {
        spd = primitives.vectorOverWater.val.mod;
        hdg = primitives.vectorOverWater.val.ang;
    }
    if (primitives.appWind.val) {
        aws = primitives.appWind.val.mod;
        awa = primitives.appWind.val.ang;
    }
    if (awa && aws && spd) {
        var x = aws * Math.cos(awa) - spd;
        var y = aws * Math.sin(awa);
        tws = Math.sqrt(x * x + y * y);
        twa = Math.atan2(y, x);
        vmg = spd * Math.cos(twa);
        if (hdg) {
            twd = twa + hdg;
        }
        lwy = leewayTable.get(awa, aws, spd);
        app.debug(awa * 180 / Math.PI, aws / 1852 * 3600, spd / 1852 * 3600, lwy);
    }
    derivatives.trueWind.val = {
        mod: { value: tws, timestamp: currentTime },
        ang: { value: twa, timestamp: currentTime }
    };
    derivatives.vmg.val = { value: vmg, timestamp: currentTime };
    derivatives.twd.val = { value: twd, timestamp: currentTime };
    // app.debug(derivatives.trueWind.val)
    // app.debug(derivatives.vmg.val)
    // app.debug(currentTime);
}
exports.calc = calc;
;
