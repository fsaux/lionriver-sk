"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-unused-vars */
var nav_1 = require("./lib/nav");
var _a = require('./lib/instrument'), LinearInstrument = _a.LinearInstrument, AngularInstrument = _a.AngularInstrument, VectorInstrument = _a.VectorInstrument, PositionInstrument = _a.PositionInstrument;
var _b = require('./lib/leeway'), Leeway = _b.Leeway, myLwyTab = _b.myLwyTab;
var _c = require('./lib/polar'), Polar = _c.Polar, PolarPoint = _c.PolarPoint;
var path = require('path');
var getAreaOfPolygon = require('geolib').getAreaOfPolygon;
module.exports = function (app) {
    var plugin = {
        id: 'lionriver-sk',
        name: 'Lionriver navigator',
        description: 'Lionriver navigator on SK Server',
        schema: function () { return (CONFIG_SCHEMA); },
        uiSchema: function () { return (CONFIG_UISCHEMA); },
        start: function (options, restart) { doStartup(options, restart); },
        stop: function () { doShutdown(); }
    };
    var unsubscribes = [];
    var timer;
    var primitives = {
        position: new PositionInstrument('navigation.position', 1),
        nextWptPos: new PositionInstrument('navigation.courseGreatCircle.nextPoint.position', 1),
        prevWptPos: new PositionInstrument('navigation.courseGreatCircle.previousPoint.position', 1),
        appWind: new VectorInstrument('environment.wind.speedApparent', 'environment.wind.angleApparent', 3),
        vectorOverGround: new VectorInstrument('navigation.speedOverGround', 'navigation.courseOverGroundTrue', 3),
        vectorOverWater: new VectorInstrument('navigation.speedThroughWater', 'navigation.headingTrue', 3),
        dpt: new LinearInstrument('environment.depth.belowSurface', 1),
        temp: new LinearInstrument('environment.water.temperature', 1)
    };
    var derivatives = {
        bearingToWpt: new LinearInstrument('navigation.courseGreatCircle.nextPoint.bearingTrue', 1),
        distanceToWpt: new LinearInstrument('navigation.courseGreatCircle.nextPoint.distance', 1),
        crossTrackError: new LinearInstrument('navigation.courseGreatCircle.crossTrackError', 1),
        vmgToWpt: new LinearInstrument('navigation.courseGreatCircle.nextPoint.velocityMadeGood', 5),
        trueWind: new VectorInstrument('environment.wind.speedTrue', 'environment.wind.angleTrueWater', 3),
        vmg: new LinearInstrument('performance.velocityMadeGood', 5),
        twd: new LinearInstrument('environment.wind.directionTrue', 5),
        leeway: new AngularInstrument('navigation.leewayAngle', 5),
        drift: new VectorInstrument('environment.current.drift', 'environment.current.setTrue', 15),
        polarTgt: new VectorInstrument('performance.targetSpeed', 'performance.targetAngle', 5),
        perf: new LinearInstrument('performance.polarSpeedRatio', 5),
        laylineDst: new LinearInstrument('navigation.racing.layline.distance', 5),
        laylineTime: new LinearInstrument('navigation.racing.layline.time', 5),
        laylineBearing: new LinearInstrument('navigation.racing.layline.bearingTrue', 5),
        opLaylineDst: new LinearInstrument('navigation.racing.oppositeLayline.distance', 5),
        opLaylineTime: new LinearInstrument('navigation.racing.oppositeLayline.time', 5),
        opLaylineBearing: new LinearInstrument('navigation.racing.oppositelayline.bearingTrue', 5)
    };
    var leewayTable;
    var polarTable;
    var navState = { sMode: nav_1.sailingMode.none };
    plugin.id = 'lionriver-sk';
    plugin.name = 'Lionriver navigator';
    plugin.description = 'Lionriver navigator on SK Server';
    var doStartup = function (options, restart) {
        // Here we put our plugin logic
        app.debug('Plugin started');
        leewayTable = new Leeway(myLwyTab);
        polarTable = new Polar('Default', path.join(app.config.configPath, options.polarFile));
        Object.values(primitives).forEach(function (inst) { inst.timeout = options.dataTimeout; });
        Object.values(derivatives).forEach(function (inst) { inst.timeout = options.dataTimeout; });
        function doNavCalcs() {
            var updObj = (0, nav_1.navCalc)(app, primitives, derivatives, leewayTable, polarTable, navState);
            app.handleMessage(plugin.id, updObj);
        }
        setInterval(doNavCalcs, 1000);
    };
    var doShutdown = function () {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        app.debug('Plugin stopped');
    };
    var CONFIG_SCHEMA = {
        properties: {
            dataTimeout: {
                title: 'Invalidate output if no input received after (seconds)',
                type: 'number',
                default: 10
            },
            polarFile: {
                title: 'Polar file',
                type: 'string',
                default: ''
            }
        }
    };
    var CONFIG_UISCHEMA = {};
    return plugin;
};
