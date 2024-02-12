"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionInstrument = exports.VectorInstrument = exports.AttitudeInstrument = exports.AngularInstrument = exports.LinearInstrument = exports.Instrument = void 0;
var Instrument = /** @class */ (function () {
    function Instrument(path, window) {
        this.path = [path];
        this.window = window;
        this.avgVal = null;
        this.valList = [];
        this.timeout = 60 * 1000; // Set default timeout to 1 minute
        this.expired = true;
    }
    Object.defineProperty(Instrument.prototype, "val", {
        get: function () {
            return this.avgVal;
        },
        set: function (newval) {
            if (newval) {
                if (newval.value !== null) {
                    this.lastUpdate = Date.parse(newval.timestamp);
                    if (this.expired) {
                        this.valList = [];
                        this.expired = false;
                    }
                    this.valList.push(newval.value);
                    if (this.valList.length > this.window) {
                        this.valList.shift();
                    }
                    this.avgVal = this.calcAvg();
                }
                else {
                    var deltaT = Date.now() - this.lastUpdate;
                    if (deltaT > this.timeout * 1000) {
                        if (this.avgVal == null) {
                            this.expired = true;
                        }
                        else {
                            this.avgVal = null;
                        }
                    }
                }
            }
        },
        enumerable: false,
        configurable: true
    });
    return Instrument;
}());
exports.Instrument = Instrument;
var LinearInstrument = /** @class */ (function (_super) {
    __extends(LinearInstrument, _super);
    function LinearInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LinearInstrument.prototype.calcAvg = function () {
        return this.valList.reduce(function (a, b) { return a + b; }, 0) / this.valList.length;
    };
    return LinearInstrument;
}(Instrument));
exports.LinearInstrument = LinearInstrument;
var AngularInstrument = /** @class */ (function (_super) {
    __extends(AngularInstrument, _super);
    function AngularInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AngularInstrument.prototype.calcAvg = function () {
        var x = this.valList.reduce(function (a, b) { return a + Math.cos(b); }, 0);
        var y = this.valList.reduce(function (a, b) { return a + Math.sin(b); }, 0);
        return Math.atan2(y, x);
    };
    return AngularInstrument;
}(Instrument));
exports.AngularInstrument = AngularInstrument;
var AttitudeInstrument = /** @class */ (function (_super) {
    __extends(AttitudeInstrument, _super);
    function AttitudeInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AttitudeInstrument.prototype.calcAvg = function () {
        var x_yaw = this.valList.reduce(function (a, b) { return a + Math.cos(b.yaw); }, 0);
        var y_yaw = this.valList.reduce(function (a, b) { return a + Math.sin(b.yaw); }, 0);
        var x_pitch = this.valList.reduce(function (a, b) { return a + Math.cos(b.pitch); }, 0);
        var y_pitch = this.valList.reduce(function (a, b) { return a + Math.sin(b.pitch); }, 0);
        var x_roll = this.valList.reduce(function (a, b) { return a + Math.cos(b.roll); }, 0);
        var y_roll = this.valList.reduce(function (a, b) { return a + Math.sin(b.roll); }, 0);
        return {
            yaw: Math.atan2(y_yaw, x_yaw),
            pitch: Math.atan2(y_pitch, x_pitch),
            roll: Math.atan2(y_roll, x_roll)
        };
    };
    return AttitudeInstrument;
}(Instrument));
exports.AttitudeInstrument = AttitudeInstrument;
var VectorInstrument = /** @class */ (function (_super) {
    __extends(VectorInstrument, _super);
    function VectorInstrument(mpath, apath, window) {
        var _this = _super.call(this, mpath, window) || this;
        _this.path.push(apath);
        return _this;
    }
    Object.defineProperty(VectorInstrument.prototype, "val", {
        get: function () {
            return this.avgVal;
        },
        set: function (newval) {
            if (newval.mod && newval.ang) {
                if (newval.mod.value !== null && newval.ang.value !== null) {
                    var lu1 = Date.parse(newval.mod.timestamp);
                    var lu2 = Date.parse(newval.ang.timestamp);
                    this.lastUpdate = lu1 < lu2 ? lu1 : lu2;
                    if (this.expired) {
                        this.valList = [];
                        this.expired = false;
                    }
                    this.valList.push({ mod: newval.mod.value, ang: newval.ang.value });
                    if (this.valList.length > this.window) {
                        this.valList.shift();
                    }
                    this.avgVal = this.calcAvg();
                }
                else {
                    var deltaT = Date.now() - this.lastUpdate;
                    if (deltaT > this.timeout * 1000) {
                        if (this.avgVal.mod == null && this.avgVal.ang == null) {
                            this.expired = true;
                        }
                        else {
                            this.avgVal = { mod: null, ang: null };
                        }
                    }
                }
            }
        },
        enumerable: false,
        configurable: true
    });
    VectorInstrument.prototype.calcAvg = function () {
        var x = this.valList.reduce(function (a, b) { return a + b.mod * Math.cos(b.ang); }, 0);
        var y = this.valList.reduce(function (a, b) { return a + b.mod * Math.sin(b.ang); }, 0);
        var m = Math.sqrt(x * x + y * y) / this.valList.length;
        if (x == 0 && y == 0) {
            x = this.valList.reduce(function (a, b) { return a + Math.cos(b.ang); }, 0);
            y = this.valList.reduce(function (a, b) { return a + Math.sin(b.ang); }, 0);
            m = 0;
        }
        var a = Math.atan2(y, x);
        return { mod: m, ang: a };
    };
    return VectorInstrument;
}(Instrument));
exports.VectorInstrument = VectorInstrument;
var PositionInstrument = /** @class */ (function (_super) {
    __extends(PositionInstrument, _super);
    function PositionInstrument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PositionInstrument.prototype.calcAvg = function () {
        return this.valList[this.valList.length - 1];
    };
    return PositionInstrument;
}(Instrument));
exports.PositionInstrument = PositionInstrument;
