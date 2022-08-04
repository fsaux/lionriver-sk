"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calc = void 0;
var instrument_1 = require("./instrument");
function calc(app, primitives, derivatives) {
    // Get primitives
    Object.values(primitives).forEach(function (inst) {
        if (inst instanceof instrument_1.ScalarInstrument)
            inst.val = app.getSelfPath(inst.path);
        if (inst instanceof instrument_1.VectorInstrument) {
            var newObj = {
                mod: app.getSelfPath(inst.mpath),
                ang: app.getSelfPath(inst.apath)
            };
            inst.val = newObj;
        }
    });
}
exports.calc = calc;
;
