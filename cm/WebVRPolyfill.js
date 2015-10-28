var VRDevice = require('./VRDevice');
var HMDVRDevice = require('./HMDVRDevice');
var CardboardHMDVRDevice = require('./CardboardHMDVRDevice');

var PositionSensorVRDevice = require('../src/base').PositionSensorVRDevice;
var OrientationPositionSensorVRDevice = require('../src/orientation-position-sensor-vr-device');
var FusionPositionSensorVRDevice = require('../src/fusion-position-sensor-vr-device');
var MouseKeyboardPositionSensorVRDevice = require('../src/mouse-keyboard-position-sensor-vr-device');


window.WebVRConfig = {
  // Forces availability of VR mode.
  FORCE_ENABLE_VR: false, // Default: false.
  // Complementary filter coefficient. 0 for accelerometer, 1 for gyro.
  K_FILTER: 0.98, // Default: 0.98.
  // How far into the future to predict during fast motion.
  PREDICTION_TIME_S: 0.050, // Default: 0.050s.
};

/**
 * @param {VRDevice} defaultDevice
 * @constructor
 * @extends {WebVRPolyfill}
 */
var WebVRPolyfillExtended = function(defaultDevice) {
  this.devices = [];
  this._defaultDevice = defaultDevice || new CardboardHMDVRDevice();
  this.enablePolyfill();
};

WebVRPolyfillExtended.prototype = {

  enablePolyfill: function() {

    this._getVRDevicesPromise = this.isWebVRAvailable() ? navigator.getVRDevices() : Promise.resolve([]);

    // Provide navigator.getVRDevices.
    navigator.getVRDevices = this.getVRDevices.bind(this);

    // keep a reference of native VRDevice constructor
    this._nativeConstructors = {
      VRDevice: window.VRDevice,
      HMDVRDevice: window.HMDVRDevice
    };

    window.VRDevice = VRDevice;
    window.HMDVRDevice = HMDVRDevice;
  },


  /**
   * @param {VRDevice} device
   */
  setDefaultDevice: function(device) {
    if (!(device instanceof HMDVRDevice)) {
      throw new Error('Default device must be an instance of HMDVRDevice.');
    }
    this._defaultDevice = device;
  },

  /**
   * @returns {Promise}
   */
  getVRDevices: function() {
    return this._getVRDevicesPromise.then(this._processVRDevices.bind(this));
  },

  /**
   * @returns VRDevice[]
   */
  _processVRDevices: function(nativeDevices) {

    var deviceByType = function(deviceList, InstanceType) {
      for (i = 0; i < deviceList.length; i++) {
        if (deviceList[i] instanceof InstanceType) {
          return deviceList[i];
        }
      }
    };

    var deviceHMDVR = this._defaultDevice;

    var deviceSensor = deviceByType(nativeDevices, window.PositionSensorVRDevice);
    if (!deviceSensor) {
      // override the native constructor to allow checks with `instanceof`
      window.PositionSensorVRDevice = PositionSensorVRDevice;
      if (this._hasDeviceMotionSupport() && this._hasDeviceOrientationSupport()) {
        deviceSensor = new FusionPositionSensorVRDevice();
      } else if (this._hasDeviceOrientationSupport()) {
        deviceSensor = new OrientationPositionSensorVRDevice();
      } else {
        deviceSensor = new MouseKeyboardPositionSensorVRDevice();
      }
    }
    this.devices = [deviceHMDVR, deviceSensor];
    return this.devices;
  },

  _hasDeviceOrientationSupport: function() {
    return typeof window.orientation !== 'undefined' && !!window.DeviceOrientationEvent;
  },

  _hasDeviceMotionSupport: function() {
    return !!window.DeviceMotionEvent;
  },

  /**
   * @returns {boolean}
   */
  isWebVRAvailable: function() {
    return ('getVRDevices' in navigator) || ('mozGetVRDevices' in navigator);
  }
};


WebVRPolyfillExtended.prototype.constructor = WebVRPolyfillExtended;


module.exports = WebVRPolyfillExtended;
