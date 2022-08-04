var geolib = require('geolib');
var geoutils = require('geolocation-utils');
var _a = require('./instrument'), ScalarInstrument = _a.ScalarInstrument, VectorInstrument = _a.VectorInstrument;
module.exports.calc = function (app, primitives, derivatives) {
    // Get primitives
    Object.values(primitives).forEach(function (inst) {
        if (inst instanceof ScalarInstrument)
            inst.val = app.getSelfPath(inst.path);
        if (inst instanceof VectorInstrument) {
            var newObj = {
                mod: app.getSelfPath(inst.mpath),
                ang: app.getSelfPath(inst.apath)
            };
            inst.val = newObj;
        }
    });
};
