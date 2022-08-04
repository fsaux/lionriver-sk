const { LinearInstrument, AngularInstrument, VectorInstrument, PositionInstrument } = require('./lib/instrument')
const nav = require('./lib/nav')

module.exports = function (app) {

  var plugin = {};
  var unsubscribes =[];
  var timer;

  const primitives = { 
    position: new PositionInstrument('navigation.position',1),
    nextWptPos: new PositionInstrument('navigation.courseGreatCircle.nextPoint.position',1),
    prevWptPos: new PositionInstrument('navigation.courseGreatCircle.previousPoint.position',1),
    appWind: new VectorInstrument(
      'environment.wind.speedApparent',
      'environment.wind.angleApparent',3),
    vectorOverGround: new VectorInstrument(
      'navigation.speedOverGround',
      'navigation.courseOverGroundTrue',3),
    vectorOverWater: new VectorInstrument(
      'navigation.speedThroughWater',
      'navigation.headingTrue',3),
    dpt: new LinearInstrument('environment.depth.belowSurface',1),
    temp: new LinearInstrument('environment.water.temperature',1)
  };

  const derivatives = { 
    bearingToWpt: new LinearInstrument('navigation.courseGreatCircle.nextPoint.bearingTrue',1),
    distanceToWpt: new LinearInstrument('navigation.courseGreatCircle.nextPoint.distance',1),
    trackBearing: new LinearInstrument('navigation.courseGreatCircle.bearingTrackTrue',1),
    crossTrackError: new LinearInstrument('navigation.courseGreatCircle.crossTrackError',1),
    trueWind: new VectorInstrument(
      'environment.wind.speedTrue',
      'environment.wind.angleTrueWater',3)
    }

  plugin.id = 'lionriver-sk';
  plugin.name = 'Lionriver navigator plugin';
  plugin.description = 'Lionriver navigator on SK Server';

  plugin.start = function (options, restartPlugin) {
    // Here we put our plugin logic
    app.debug('Plugin started');

    Object.values(primitives).forEach( (inst) => {inst.timeout = options.dataTimeout});
    Object.values(derivatives).forEach( (inst) => {inst.timeout = options.dataTimeout});

    function doNavCalcs()
    {
      nav.calc(app, primitives, derivatives);
      //app.debug(primitives);
    }

    setInterval(doNavCalcs, 1000);
  };

  plugin.stop = function () {
    if ( timer ) {
      clearInterval(timer);
      timer =  null;
    }
    app.debug('Plugin stopped');
  };

  plugin.schema = {
    type: "object",
    description: "Description",
    properties: {
      dataTimeout: {
        title: "Invalidate output if no input received after (seconds)",
        type: "number",
        default: "10",
      },
    }
  }

  return plugin;
};