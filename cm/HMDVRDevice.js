var VREyeParameters = require('./VREyeParameters');
var VRDevice = require('./VRDevice');

var HMDVRDevice = function(hardwareUnitId, deviceId, deviceName, fov, interpupillaryDistance, lensDistortionFactors) {
  VRDevice.call(this, hardwareUnitId, deviceId, deviceName);
  this._fov =
    this._eyeTranslationLeft = new VREyeParameters(fov, interpupillaryDistance * -0.5);
  this._eyeTranslationRight = new VREyeParameters(fov, interpupillaryDistance * 0.5);
  this._lensDistortionFactors = lensDistortionFactors;
};

var proto = HMDVRDevice.prototype = Object.create(VRDevice.prototype);

/**
 * @param {left|right} whichEye
 * @returns {{recommendedFieldOfView: VRFieldOfView, eyeTranslation: DOMPoint}}
 */
proto.getEyeParameters = function(whichEye) {
  var eyeTranslation;
  if (whichEye == 'left') {
    eyeTranslation = this._eyeTranslationLeft;
  } else if (whichEye == 'right') {
    eyeTranslation = this._eyeTranslationRight;
  } else {
    throw new Error('Invalid eye provided: ' + whichEye);
  }
  return eyeTranslation;
};

/**
 * @returns {{k1: number, k2: number}}
 */
proto.getLensDistortionFactors = function() {
  return this._lensDistortionFactors;
};

proto.constructor = HMDVRDevice;

module.exports = HMDVRDevice;
