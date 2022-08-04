const { ScalarInstrument, VectorInstrument } = require('./lib/instrument')
const nav = require('./lib/nav')

module.exports = function (app) {

  var plugin = {};
  var unsubscribes =[];
  var timer;

  const primitives = { 
    appWind: new VectorInstrument(
      'environment.wind.speedApparent',
      'environment.wind.angleApparent',3),
    vectorOverGround: new VectorInstrument(
      'navigation.speedOverGround',
      'navigation.courseOverGroundTrue',3),
    vectorOverWater: new VectorInstrument(
      'navigation.speedThroughWater',
      'navigation.headingTrue',3),
    dpt: new ScalarInstrument('environment.depth.belowSurface',1),
    temp: new ScalarInstrument('environment.water.temperature',3)
  };

  const derivatives = { 
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
    // The plugin schema
  };

  return plugin;
};