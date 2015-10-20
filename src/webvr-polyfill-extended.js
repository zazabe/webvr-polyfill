/*
 * Cargo Media patch:
 * - force polyfill usage
 * - allow to pass custom VRDevice
 * - override native `VRDevice` if necessary (see getVRDevices() doc for more details)
 */

var WebVRPolyfill = require('./webvr-polyfill.js');

var VRDevice = require('./base.js').VRDevice;
var HMDVRDevice = require('./base.js').HMDVRDevice;
var PositionSensorVRDevice = require('./base.js').PositionSensorVRDevice;

var CardboardHMDVRDevice = require('./cardboard-hmd-vr-device.js');
var GyroPositionSensorVRDevice = require('./gyro-position-sensor-vr-device.js');
var MouseKeyboardPositionSensorVRDevice = require('./mouse-keyboard-position-sensor-vr-device.js');


/**
 * @param {VRDevice[]} defaultDevices
 * @constructor
 * @extends {WebVRPolyfill}
 */
var WebVRPolyfillExtended = function(defaultDevices) {
  this.devices = [];
  this._defaultDevices = defaultDevices;
  this.enablePolyfill();
};

WebVRPolyfillExtended.prototype = {

};


WebVRPolyfillExtended.prototype.constructor = WebVRPolyfillExtended;

WebVRPolyfillExtended.prototype.enablePolyfill = function() {

  this._getVRDevicesPromise = this.isWebVRAvailable() ? navigator.getVRDevices() : Promise.resolve([]);

  // Provide navigator.getVRDevices.
  navigator.getVRDevices = this.getVRDevices.bind(this);

  // Provide the CardboardHMDVRDevice and PositionSensorVRDevice objects.
  window.VRDevice = VRDevice;
  window.HMDVRDevice = HMDVRDevice;

  // Override native PositionSensorVRDevice if needed
  window.PositionSensorVRDevice = window.PositionSensorVRDevice || PositionSensorVRDevice;
};


/**
 * @param {VRDevice[]|VRDevice} devices
 */
WebVRPolyfillExtended.prototype.addDefaultDevices = function(devices) {
  devices = devices.constructor === Array ? devices : [devices];
  this._defaultDevices = this._defaultDevices.concat(devices);
};

/**
 * @returns {VRDevice|undefined}
 */
WebVRPolyfillExtended.prototype.getDefaultVRDeviceByHardwareUnitId = function() {
  var devices = this._defaultDevices;
  for (i = 0; i < devices.length; i++) {
    if (devices[i].hardwareUnitId === hardwareUnitId) {
      return devices[i];
    }
  }
};

/**
 * @returns {Promise}
 */
WebVRPolyfillExtended.prototype.getVRDevices = function() {
  return this._getVRDevicesPromise.then(this._processVRDevices.bind(this));
};

/**
 * mix native/polyfill VRDevices:
 * - use native PositionSensorVRDevice if available
 * - use default polyfill HMDVRDevice if a corresponding native HMDVRDevice is available
 *
 * if there's no native VRDevice, use a simulated PositionSensorVRDevice and a default CardboardHMDVRDevice
 *
 * @returns VRDevice[]
 */
WebVRPolyfillExtended.prototype._processVRDevices = function(nativeDevices) {

  var deviceByType = function(deviceList, InstanceType) {
    for (i = 0; i < deviceList.length; i++) {
      if (deviceList[i] instanceof InstanceType) {
        return deviceList[i];
      }
    }
  };

  var polyfillDevices = [], i, nativeDevice, device;

  for (i = 0; i < nativeDevices.length; i++) {
    nativeDevice = nativeDevices[i];
    device = this.getDefaultVRDeviceByHardwareUnitId(nativeDevice.hardwareUnitId);

    if (nativeDevice instanceof PositionSensorVRDevice) {
      polyfillDevices.push(nativeDevice);
    }
    if (device instanceof HMDVRDevice) {
      polyfillDevices.push(device);
    }
  }

  if(!(deviceByType(polyfillDevices, PositionSensorVRDevice))){
    if (this.isMobile()) {
      polyfillDevices.push(new GyroPositionSensorVRDevice());
    } else {
      polyfillDevices.push(new MouseKeyboardPositionSensorVRDevice());
    }
  }

  if(!(deviceByType(polyfillDevices, HMDVRDevice))){
    polyfillDevices.push(new CardboardHMDVRDevice());
  }

  this.devices = polyfillDevices;
  return this.devices;
};



WebVRPolyfill.prototype.isWebVRAvailable = function() {
  return ('getVRDevices' in navigator) || ('mozGetVRDevices' in navigator);
};


/**
 * Determine if a device is mobile.
 */
WebVRPolyfill.prototype.isMobile = function() {
  return /Android/i.test(navigator.userAgent) ||
    /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

WebVRPolyfill.prototype.isCardboardCompatible = function() {
  // For now, support all iOS and Android devices.
  // Also enable the global CARDBOARD_DEBUG flag.
  return this.isMobile() || window.CARDBOARD_DEBUG;
};

module.exports = WebVRPolyfillExtended;
