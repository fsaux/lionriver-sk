import * as geolib from "geolib";
import * as geoutils from "geolocation-utils";
import { Instrument, VectorInstrument } from "./instrument";

export function calc(app, primitives, derivatives){

    // Get primitives
    Object.values(primitives).forEach( (inst:Instrument<any>) => {
        if(inst instanceof VectorInstrument){
            inst.val = {
                mod: app.getSelfPath(inst.path[0]),
                ang: app.getSelfPath(inst.path[1])
            };
        }
        else{
            inst.val=app.getSelfPath(inst.path[0]);
        }
    });

    // Calculate derivatives
    const currentTime:string = new Date(Date.now()).toISOString();

    var dst= null;
    var brg= null;
    var xte= null;
    var legbrg= null;
    var vmgwpt= null;
    var sog= primitives.vectorOverGround.val.mod;
    var cog= primitives.vectorOverGround.val.ang;

    if(primitives.position.val && primitives.nextWptPos.val){
        dst = geolib.getDistance(primitives.position.val, primitives.nextWptPos.val);
        brg = geolib.getGreatCircleBearing(primitives.position.val, primitives.nextWptPos.val) * Math.PI / 180;
        if(primitives.prevWptPos.val){
            legbrg = geolib.getGreatCircleBearing(primitives.prevWptPos.val, primitives.nextWptPos.val) * Math.PI / 180;
            xte= Math.asin(Math.sin(dst/ 6371000)* Math.sin(brg - legbrg)) * 6371000;
        }
        if(sog && cog)
            vmgwpt= sog * Math.cos(cog - brg);
    }
 
    derivatives.distanceToWpt.val={value: dst, timestamp: currentTime};
    derivatives.bearingToWpt.val={value: brg, timestamp: currentTime};
    derivatives.crossTrackError.val={value: xte, timestamp: currentTime};
    derivatives.vmgtoWpt.val={value: vmgwpt, timestamp: currentTime};

    app.debug(derivatives.vmgtoWpt.val);

    //app.debug(distance);
    //app.debug(currentTime);


};
