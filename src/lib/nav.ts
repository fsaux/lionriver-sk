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

    var distance= null;
    var bearing= null;

    if(primitives.position.val && primitives.nextWptPos.val){
        distance = geolib.getDistance(primitives.position.val, primitives.nextWptPos.val);
        bearing = geolib.getGreatCircleBearing(primitives.position.val, primitives.nextWptPos.val) * Math.PI / 180;
    }
 
    derivatives.distanceToWpt.val={value: distance, timestamp: currentTime};
    derivatives.bearingToWpt.val={value: bearing, timestamp: currentTime};

    app.debug(derivatives.distanceToWpt);
    app.debug(derivatives.bearingToWpt);
    //app.debug(distance);
    //app.debug(currentTime);




        

};
