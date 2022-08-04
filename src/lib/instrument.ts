
export class ScalarInstrument {
    path: string;           //SignalK path
    window: number;         //Averaging moving window size
    private avgVal: number;         //Average value over window time
    private valList: number[];      //List of last values over window time
    private lastUpdate: number;     //Time of last valid update received

    constructor(path: string, window: number){
        this.path = path;
        this.window = window;
        this.avgVal = null;
        this.valList = [];
    }

    get val()  {
        return this.avgVal;
    }

    set val(newval: any){
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

    private calcAvg():number  {
        return this.valList.reduce((a, b) => a + b, 0) / this.valList.length;
    }
}

interface Vector{
    mod: number;
    ang: number;
}

export class VectorInstrument {
    mpath: string;          // Vector modulus path
    apath: string;          // Vecotr angle path
    private window: number;         //Averaging moving window size
    private avgVal: Vector;         //Average value over window time
    private valList: Vector[];      //List of last values over window time
    private lastUpdate: number;     //Time of last valid update received

    constructor( mpath: string, apath: string, window: number){
        this.mpath = mpath;
        this.apath = apath;
        this.window = window;
        this.avgVal = null;
        this.valList = [];
    }

    get val():Vector {
        return this.avgVal;
    }

    set val(newval: any){
        if(newval.mod && newval.ang){
            const lu1 = Date.parse(newval.mod.timestamp);
            const lu2 = Date.parse(newval.ang.timestamp);
            this.lastUpdate = lu1 < lu2 ?lu1 :lu2;

            this.valList.push({mod: newval.mod.value,ang: newval.ang.value});
        }

        if(this.valList.length > this.window)
            this.valList.shift();

        const deltaT=Date.now()-this.lastUpdate;

        if(deltaT > 0 && deltaT < this.window*1000)
            this.avgVal=this.calcAvg();
        else
            this.avgVal=null;
    }

    private calcAvg(): Vector {
        const x = this.valList.reduce((a, b) =>  a + b.mod*Math.cos(b.ang) , 0);
        const y = this.valList.reduce((a, b) =>  a + b.mod*Math.sin(b.ang) , 0);
        return {mod: Math.sqrt(x*x+y*y) / this.valList.length ,ang: Math.atan2(y,x)};
    }
}
