"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.navCalc = exports.sailingMode = void 0;
var geolib = require("geolib");
var instrument_1 = require("./instrument");
var sailingMode;
(function (sailingMode) {
    sailingMode[sailingMode["none"] = 0] = "none";
    sailingMode[sailingMode["beating"] = 1] = "beating";
    sailingMode[sailingMode["reaching"] = 2] = "reaching";
    sailingMode[sailingMode["running"] = 3] = "running";
})(sailingMode = exports.sailingMode || (exports.sailingMode = {}));
function navCalc(app, primitives, derivatives, leewayTable, polarTable, navState, options) {
    //
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
    var windSensorHeight = app.getSelfPath('design.airHeight').value;
    if (!windSensorHeight) {
        windSensorHeight = 10;
    } // Default to 10m for ORC VPP
    var mvar = app.getSelfPath('navigation.magneticVariation').value;
    if (!mvar) {
        mvar = options.mVariation * Math.PI / 180;
    }
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
            xte = Math.abs(Math.asin(Math.sin(dst / 6371000) * Math.sin(brg - legbrg)) * 6371000);
            var sgn = (brg - legbrg) * 360 / Math.PI;
            sgn = (sgn + 360) % 360;
            if (sgn > 180)
                xte = -xte;
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
    var hdt = null;
    var aws = null;
    var awa = null;
    var twa = null;
    var tws = null;
    var vmg = null;
    var twd = null;
    var lwy = null;
    if (primitives.vectorOverWater.val) {
        spd = primitives.vectorOverWater.val.mod;
        hdt = primitives.vectorOverWater.val.ang + mvar;
    }
    app.debug(primitives.vectorOverWater);
    if (primitives.appWind.val) {
        aws = primitives.appWind.val.mod;
        awa = primitives.appWind.val.ang;
    }
    if (awa && aws && spd) {
        if (primitives.heel) {
            var speedKnts = spd * 3600 / 1852;
            if (speedKnts != 0)
                lwy = options.lwyKfactor * primitives.attitude.val.heel / (speedKnts * speedKnts);
            else
                lwy = 0;
        }
        else
            lwy = leewayTable.get(awa, aws, spd);
        if (awa > Math.PI) {
            lwy = -lwy;
        }
        var x = aws * Math.cos(awa) - spd;
        var y = aws * Math.sin(awa);
        tws = Math.sqrt(x * x + y * y);
        twa = Math.atan2(y, x);
        if (twa > Math.PI)
            twa = twa - 2 * Math.PI;
        // Set estimated saling mode in case route and/or polar data is not available
        if (Math.abs(twa) < 55 * Math.PI / 180) {
            navState.sMode = sailingMode.beating;
        }
        else if (Math.abs(twa) > 130 * Math.PI / 180) {
            navState.sMode = sailingMode.running;
        }
        else {
            navState.sMode = sailingMode.reaching;
        }
        vmg = spd * Math.cos(twa);
        if (hdt) {
            twd = twa + hdt;
        }
    }
    derivatives.trueWind.val = {
        mod: { value: tws, timestamp: currentTime },
        ang: { value: twa, timestamp: currentTime }
    };
    derivatives.vmg.val = { value: vmg, timestamp: currentTime };
    derivatives.twd.val = { value: twd, timestamp: currentTime };
    derivatives.hdt.val = { value: hdt, timestamp: currentTime };
    derivatives.leeway.val = { value: lwy, timestamp: currentTime };
    var drift = null;
    var set = null;
    if (cog && sog && hdt && spd) {
        var dx = sog * Math.cos(cog) - spd * Math.cos(hdt);
        var dy = sog * Math.sin(cog) - spd * Math.sin(hdt);
        if (lwy) {
            var lm = spd * Math.tan(lwy);
            var la = hdt - Math.PI;
            var lx = lm * Math.cos(la);
            var ly = lm * Math.sin(la);
            dx -= lx;
            dy -= ly;
        }
        drift = Math.sqrt(dx * dx + dy * dy);
        set = Math.atan2(dy, dx);
    }
    derivatives.drift.val = {
        mod: { value: drift, timestamp: currentTime },
        ang: { value: set, timestamp: currentTime }
    };
    var tgtspd = null;
    var tgttwa = null;
    var perf = null;
    var lylDst = null;
    var lylTime = null;
    var lylBrg = null;
    var oLylDst = null;
    var oLylTime = null;
    var oLylBrg = null;
    var dist_s = null;
    var dist_p = null;
    if (twa && spd && brg && lwy && polarTable.lines) {
        var angle = Math.abs((twd - brg) * 180 / Math.PI + 360) % 360;
        if (angle > 180)
            angle = 360 - angle;
        var pb = polarTable.getBeatTarget(tws * 3600 / 1852);
        var pr = polarTable.getRunTarget(tws * 3600 / 1852);
        if (angle <= (pb.twa + 10)) {
            // Targets are relative to boat instruments (corrected for leeway)
            tgtspd = pb.spd * 1852 / 3600 * Math.cos(lwy);
            tgttwa = pb.twa * Math.PI / 180 - lwy;
            var z = (pb.spd * 1852 / 3600 * Math.cos(pb.twa * Math.PI / 180));
            if (z != 0) {
                perf = vmg / z;
            }
            navState.sMode = sailingMode.beating;
        }
        if (angle < (pr.twa - 5) && angle > (pb.twa + 10)) {
            // Targets are relative to boat instruments (corrected for leeway)
            var tspd = polarTable.getTarget(angle, tws * 3600 / 1852) * 1852 / 3600;
            tgtspd = tspd * Math.cos(lwy);
            tgttwa = angle * Math.PI / 180 - lwy;
            if (tspd != 0) {
                perf = spd * Math.cos(hdt - brg) / tspd;
            }
            navState.sMode = sailingMode.reaching;
        }
        if (angle >= (pr.twa - 5)) {
            // Targets are relative to boat instruments (corrected for leeway)
            tgtspd = pr.spd * 1852 / 3600 * Math.cos(lwy);
            tgttwa = pr.twa * Math.PI / 180 - lwy;
            var z = (pr.spd * Math.cos(pr.twa * Math.PI / 180));
            if (z != 0) {
                perf = vmg / z;
            }
            navState.sMode = sailingMode.running;
        }
        var ttwa = null;
        if (angle <= (pb.twa + 50))
            ttwa = pb.twa * Math.PI / 180;
        if (angle >= (pr.twa - 60))
            ttwa = pr.twa * Math.PI / 180;
        if (ttwa) {
            var relset = set - twd;
            var dxs = tgtspd * Math.cos(ttwa) + drift * Math.cos(relset);
            var dys = tgtspd * Math.sin(ttwa) + drift * Math.sin(relset);
            var tgtcogp = Math.atan2(dys, dxs) + twd;
            var tgtsogp = Math.sqrt(dxs * dxs + dys * dys);
            var dxp = tgtspd * Math.cos(-ttwa) + drift * Math.cos(relset);
            var dyp = tgtspd * Math.sin(-ttwa) + drift * Math.sin(relset);
            var tgtcogs = Math.atan2(dyp, dxp) + twd;
            var tgtsogs = Math.sqrt(dxp * dxp + dyp * dyp);
            var alpha = (tgtcogp - brg + 2 * Math.PI);
            var beta = (brg - tgtcogs + 2 * Math.PI);
            if (alpha == 0) {
                dist_p = dst;
                dist_s = 0;
            }
            else {
                if (beta == 0) {
                    dist_s = dst;
                    dist_p = 0;
                }
                else {
                    dist_p = dst * Math.sin(beta) / (Math.sin(alpha) * Math.cos(beta) + Math.cos(alpha) * Math.sin(beta));
                    dist_s = dst * Math.sin(alpha) / (Math.sin(alpha) * Math.cos(beta) + Math.cos(alpha) * Math.sin(beta));
                }
            }
            var time_p = dist_p / tgtsogp;
            var time_s = dist_s / tgtsogs;
            if (twa > 0) {
                lylDst = dist_s;
                lylTime = time_s;
                lylBrg = tgtcogs;
                oLylDst = dist_p;
                oLylTime = time_p;
                oLylBrg = tgtcogp;
            }
            else {
                lylDst = dist_p;
                lylTime = time_p;
                lylBrg = tgtcogp;
                oLylDst = dist_s;
                oLylTime = time_s;
                oLylBrg = tgtcogs;
            }
        }
    }
    derivatives.polarTgt.val = {
        mod: { value: tgtspd, timestamp: currentTime },
        ang: { value: tgttwa, timestamp: currentTime }
    };
    derivatives.perf.val = { value: perf, timestamp: currentTime };
    derivatives.laylineDst.val = { value: lylDst, timestamp: currentTime };
    derivatives.laylineTime.val = { value: lylTime, timestamp: currentTime };
    derivatives.laylineBearing.val = { value: lylBrg, timestamp: currentTime };
    derivatives.opLaylineDst.val = { value: oLylDst, timestamp: currentTime };
    derivatives.opLaylineTime.val = { value: oLylTime, timestamp: currentTime };
    derivatives.opLaylineBearing.val = { value: oLylBrg, timestamp: currentTime };
    // prepare update obj
    var values = [];
    Object.values(derivatives).forEach(function (inst) {
        if (!inst.expired) {
            if (inst instanceof instrument_1.VectorInstrument) {
                values.push({ path: inst.path[0], value: inst.val.mod });
                values.push({ path: inst.path[1], value: inst.val.ang });
            }
            else {
                values.push({ path: inst.path[0], value: inst.val });
            }
        }
    });
    return { updates: [{ values: values }] };
}
exports.navCalc = navCalc;
;
