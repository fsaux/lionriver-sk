import * as geolib from "geolib";
import * as geoutils from "geolocation-utils";
import { ScalarInstrument, VectorInstrument } from "./instrument";

export function calc(app, primitives, derivatives){

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
