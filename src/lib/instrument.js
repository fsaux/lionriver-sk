
class ScalarInstrument {
    path;           //SignalK path
    window;         //Averaging moving window size
    avgVal;         //Average value over window time
    valList;        //List of last values over window time
    lastUpdate;     //Time of last valid update received

    constructor(path, window){
        this.path = path;
        this.window = window;
        this.avgVal = null;
        this.valList = [];
    }

    get val() {
        return this.avgVal;
    }

    set val(newval){
        if(newval){
            this.lastUpdate = Date.parse(newval.timestamp);
            this.valList.push(newval.value);
        }

        if(this.valList.length > this.window)
            this.valList.shift();

        const deltaT=Date.now()-this.lastUpdate;

        if(deltaT > 0 && deltaT < this.window*1000)
            this.avgVal=this.calcAvg();
        else
            this.avgVal=null;
    }

    calcAvg() {
        return this.valList.reduce((a, b) => a + b, 0) / this.valList.length;
    }
}


class VectorInstrument {
    mpath;        // Vector modulus path
    apath;        // Vecotr angle path
    window;         //Averaging moving window size
    avgVal;         //Average value over window time
                    // {mod: , ang:} objects
    valList;        //List of last values over window time
    lastUpdate;     //Time of last valid update received

    constructor( mpath, apath, window){
        this.mpath = mpath;
        this.apath = apath;
        this.window = window;
        this.avgVal = null;
        this.valList = [];
    }

    get val() {
        return this.avgVal;
    }

    set val(newval){
        if(newval.mod && newval.ang){
            const lu1 = Date.parse(newval.mod.timestamp);
            const lu2 = Date.parse(newval.ang.timestamp);
            this.lastUpdate = lu1 < lu2 ?lu1 :lu2;

            this.valList.push({mod: newval.mod.value, ang: newval.ang.value});
        }

        if(this.valList.length > this.window)
            this.valList.shift();

        const deltaT=Date.now()-this.lastUpdate;

        if(deltaT > 0 && deltaT < this.window*1000)
            this.avgVal=this.calcAvg();
        else
            this.avgVal=null;
    }

    calcAvg() {
        const x = this.valList.reduce((a, b) =>  a + b.mod*Math.cos(b.ang) , 0);
        const y = this.valList.reduce((a, b) =>  a + b.mod*Math.sin(b.ang) , 0);
        return {mod: Math.sqrt(x*x+y*y) / this.valList.length , ang: Math.atan2(y,x)};
    }
}

module.exports = { ScalarInstrument , VectorInstrument }