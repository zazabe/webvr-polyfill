var HMDVRDevice = require('./HMDVRDevice');

var DEFAULT_FOV = 96;
var DEFAULT_INTERPUPILLARY_DISTANCE = 0.06;
var DEFAULT_DISTORTION_FACTORS = {
  k1: 0.411,
  k2: 0.156
};


var CardboardHMDVRDevice = function(){
  HMDVRDevice.call(this, '1', '1', 'polyfill.cardboard', DEFAULT_FOV, DEFAULT_INTERPUPILLARY_DISTANCE, DEFAULT_DISTORTION_FACTORS);
};

CardboardHMDVRDevice.prototype = Object.create(HMDVRDevice.prototype);
CardboardHMDVRDevice.prototype.constructor = CardboardHMDVRDevice;

module.exports = CardboardHMDVRDevice;
