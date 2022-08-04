const geolib = require('geolib')
const geoutils = require('geolocation-utils');
const { ScalarInstrument, VectorInstrument } = require('./instrument');

module.exports.calc = function (app, primitives, derivatives){

    // Get primitives
    Object.values(primitives).forEach( (inst) => {
        if(inst instanceof ScalarInstrument)
            inst.val=app.getSelfPath(inst.path);
        if(inst instanceof VectorInstrument){
            const newObj={
                mod: app.getSelfPath(inst.mpath),
                ang: app.getSelfPath(inst.apath)
            };
            inst.val = newObj;
        }

    });
};
