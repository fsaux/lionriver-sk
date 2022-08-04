var ScalarInstrument = /** @class */ (function () {
    function ScalarInstrument(path, window) {
        this.path = path;
        this.window = window;
        this.avgVal = null;
        this.valList = [];
    }
    Object.defineProperty(ScalarInstrument.prototype, "val", {
        get: function () {
            return this.avgVal;
        },
        set: function (newval) {
            if (newval) {
                this.lastUpdate = Date.parse(newval.timestamp);
                this.valList.push(newval.value);
            }
            if (this.valList.length > this.window)
                this.valList.shift();
            var deltaT = Date.now() - this.lastUpdate;
            if (deltaT > 0 && deltaT < this.window * 1000)
                this.avgVal = this.calcAvg();
            else
                this.avgVal = null;
        },
        enumerable: false,
        configurable: true
    });
    ScalarInstrument.prototype.calcAvg = function () {
        return this.valList.reduce(function (a, b) { return a + b; }, 0) / this.valList.length;
    };
    return ScalarInstrument;
}());
var VectorInstrument = /** @class */ (function () {
    function VectorInstrument(mpath, apath, window) {
        this.mpath = mpath;
        this.apath = apath;
        this.window = window;
        this.avgVal = null;
        this.valList = [];
    }
    Object.defineProperty(VectorInstrument.prototype, "val", {
        get: function () {
            return this.avgVal;
        },
        set: function (newval) {
            if (newval.mod && newval.ang) {
                var lu1 = Date.parse(newval.mod.timestamp);
                var lu2 = Date.parse(newval.ang.timestamp);
                this.lastUpdate = lu1 < lu2 ? lu1 : lu2;
                this.valList.push({ mod: newval.mod.value, ang: newval.ang.value });
            }
            if (this.valList.length > this.window)
                this.valList.shift();
            var deltaT = Date.now() - this.lastUpdate;
            if (deltaT > 0 && deltaT < this.window * 1000)
                this.avgVal = this.calcAvg();
            else
                this.avgVal = null;
        },
        enumerable: false,
        configurable: true
    });
    VectorInstrument.prototype.calcAvg = function () {
        var x = this.valList.reduce(function (a, b) { return a + b.mod * Math.cos(b.ang); }, 0);
        var y = this.valList.reduce(function (a, b) { return a + b.mod * Math.sin(b.ang); }, 0);
        return { mod: Math.sqrt(x * x + y * y) / this.valList.length, ang: Math.atan2(y, x) };
    };
    return VectorInstrument;
}());
module.exports = { ScalarInstrument: ScalarInstrument, VectorInstrument: VectorInstrument };
