var Emitter = require('./emitter.js');

function CardboardViewer(params) {
  // A machine readable ID.
  this.id = params.id;
  // A human readable label.
  this.label = params.label;

  // Field of view in degrees (per side).
  this.fov = params.fov;

  // Distance between lens centers in meters.
  this.interLensDistance = params.interLensDistance;
  // Distance between viewer baseline and lens center in meters.
  this.baselineLensDistance = params.baselineLensDistance;
  // Screen-to-lens distance in meters.
  this.screenLensDistance = params.screenLensDistance;

  // Distortion coefficients.
  this.distortionCoefficients = params.distortionCoefficients;
  // Inverse distortion coefficients.
  // TODO: Calculate these from distortionCoefficients in the future.
  this.inverseCoefficients = params.inverseCoefficients;
}


var VIEWER_KEY = 'WEBVR_CARDBOARD_VIEWER';

function CardboardViewers() {
  this.viewers = {
    CardboardV1: {
      id: 'CardboardV1',
      label: 'Cardboard I/O 2014',
      fov: 40,
      interLensDistance: 0.060,
      baselineLensDistance: 0.035,
      screenLensDistance: 0.042,
      distortionCoefficients: [0.441, 0.156],
      inverseCoefficients: [-0.4410035, 0.42756155, -0.4804439, 0.5460139,
        -0.58821183, 0.5733938, -0.48303202, 0.33299083, -0.17573841,
        0.0651772, -0.01488963, 0.001559834]
    },
    CardboardV2: {
      id: 'CardboardV2',
      label: 'Cardboard I/O 2015',
      fov: 60,
      interLensDistance: 0.064,
      baselineLensDistance: 0.035,
      screenLensDistance: 0.039,
      distortionCoefficients: [0.34, 0.55],
      inverseCoefficients: [-0.33836704, -0.18162185, 0.862655, -1.2462051,
        1.0560602, -0.58208317, 0.21609078, -0.05444823, 0.009177956,
        -9.904169E-4, 6.183535E-5, -1.6981803E-6]
    }
  };

  this.currentKey = this.getCurrentKey_();
}

CardboardViewers.prototype = new Emitter();

CardboardViewer.prototype.getCurrentViewer = function() {
  return this.get(this.currentKey);
};

CardboardViewer.prototype.select = function(key) {
  if (!this.has(key)) {
    throw new Error('Failed to select ' + key + ' viewer.');
  }
  this.currentKey = key;
  this.emit('select', this.get(key));
};

CardboardViewers.prototype.add = function(viewers) {
  viewers.forEach(function(viewer) {
    if (!this.has(viewer.id)) {
      viewer = new CardboardViewer(definition);
      this.viewers[viewer.id] = viewer;
      this.emit('add', viewer);
    } else {
      throw new Error('Viewer ' + viewer.id + ' already exists.');
    }
  }.bind(this));
};

CardboardViewers.prototype.remove = function(key) {
  if (this.has(key)) {
    var viewer = this.viewers[key];
    delete this.viewers[key];
    this.emit('remove', viewer);
  }
};

CardboardViewers.prototype.get = function(key) {
  if (!this.has(key)) {
    throw new Error('Viewer ' + key + ' not available.');
  }
  return this.viewers[key];
};

CardboardViewers.prototype.has = function(key) {
  return key in this.viewers;
};

CardboardViewers.prototype.each = function(callback, scope) {
  for (var key in this.viewers) {
    callback.call(scope, this.get(key));
  }
};

CardboardViewers.prototype.getCurrentKey_ = function() {
  // Try to load the selected key from local storage. If none exists, use the
  // default key.
  try {
    return localStorage.getItem(VIEWER_KEY) || WebVRConfig.CARDBOARD_DEFAULT_VIEWER;
  } catch (error) {
    console.error('Failed to load viewer profile: %s', error);
  }
};

module.exports = CardboardViewers;
