(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./HMDVRDevice":3}],2:[function(require,module,exports){
var DOMPoint = function(x, y, z, w){
  this.x = x;
  this.y = y;
  this.z = z;
  this.w = w;
};

DOMPoint.prototype.constructor = DOMPoint;

module.exports = DOMPoint;

},{}],3:[function(require,module,exports){
var VREyeParameters = require('./VREyeParameters');
var VRDevice = require('./VRDevice');

var HMDVRDevice = function(hardwareUnitId, deviceId, deviceName, fov, interpupillaryDistance, lensDistortionFactors){
  VRDevice.call(this, hardwareUnitId, deviceId, deviceName);
  this._fov =
  this._eyeTranslationLeft = new VREyeParameters(fov, interpupillaryDistance * -0.5);
  this._eyeTranslationRight = new VREyeParameters(fov, interpupillaryDistance * 0.5);
  this._lensDistortionFactors = lensDistortionFactors;
};

var proto = HMDVRDevice.prototype = Object.create(VRDevice.prototype);

/**
 * @param {left|right} whichEye
 * @returns {{recommendedFieldOfView: *, eyeTranslation: *}}
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
proto.getLensDistortionFactors = function(){
  return this._lensDistortionFactors;
};

proto.constructor = HMDVRDevice;

module.exports = HMDVRDevice;

},{"./VRDevice":4,"./VREyeParameters":5}],4:[function(require,module,exports){
var VRDevice = function(hardwareUnitId, deviceId, deviceName){
  this.hardwareUnitId = hardwareUnitId;
  this.deviceId = deviceId;
  this.deviceName = deviceName;
};

VRDevice.prototype = {};
VRDevice.prototype.constructor = VRDevice;

module.exports = VRDevice;

},{}],5:[function(require,module,exports){
var VRFieldOfView = require('./VRFieldOfView');
var DOMPoint = require('./DOMPoint');

var VREyeParameters = function(fov, translationX){
  this._fov = new VRFieldOfView(fov);
  this._translation = new DOMPoint(translationX, 0, 0, 0);
};

Object.defineProperties(VREyeParameters.prototype, {
  minimumFieldOfView: {
    get: function(){
      return this._fov;
    }
  },

  maximumFieldOfView: {
    get: function(){
      return this._fov;
    }
  },

  recommendedFieldOfView: {
    get: function(){
      return this._fov;
    }
  },

  currentFieldOfView: {
    get: function(){
      return this._fov;
    }
  },

  eyeTranslation: {
    get: function(){
      return this._translation;
    }
  },

  renderRect: {
    get: function(){
      throw new Error('Not implemented.');
    }
  }
});

VREyeParameters.prototype.constructor = VREyeParameters;

module.exports = VREyeParameters;

},{"./DOMPoint":2,"./VRFieldOfView":6}],6:[function(require,module,exports){
var VRFieldOfView = function(fov){
  this.upDegrees = fov/2;
  this.rightDegrees = fov/2;
  this.downDegrees = fov/2;
  this.leftDegrees = fov/2;
};

VRFieldOfView.prototype.constructor = VRFieldOfView;

module.exports = VRFieldOfView;

},{}],7:[function(require,module,exports){
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

},{"../src/base":9,"../src/fusion-position-sensor-vr-device":11,"../src/mouse-keyboard-position-sensor-vr-device":12,"../src/orientation-position-sensor-vr-device":13,"./CardboardHMDVRDevice":1,"./HMDVRDevice":3,"./VRDevice":4}],8:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// CM: must create our own polyfill instance
//var WebVRPolyfill = require('./webvr-polyfill.js');
//
// new WebVRPolyfill();


var WebVRPolyfill = require('./cm/WebVRPolyfill');
window.VR = window.VR || {};
window.VR.webVRPolyfill = new WebVRPolyfill();

},{"./cm/WebVRPolyfill":7}],9:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The base class for all VR devices.
 */
function VRDevice() {
  this.hardwareUnitId = 'webvr-polyfill hardwareUnitId';
  this.deviceId = 'webvr-polyfill deviceId';
  this.deviceName = 'webvr-polyfill deviceName';
}

/**
 * The base class for all VR HMD devices.
 */
function HMDVRDevice() {
}
HMDVRDevice.prototype = new VRDevice();

/**
 * The base class for all VR position sensor devices.
 */
function PositionSensorVRDevice() {
}
PositionSensorVRDevice.prototype = new VRDevice();

module.exports.VRDevice = VRDevice;
module.exports.HMDVRDevice = HMDVRDevice;
module.exports.PositionSensorVRDevice = PositionSensorVRDevice;

},{}],10:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * TODO: Fix up all "new THREE" instantiations to improve performance.
 */
var SensorSample = require('./sensor-sample.js');
var THREE = require('./three-math.js');
var Util = require('./util.js');

var DEBUG = false;

/**
 * An implementation of a simple complementary filter, which fuses gyroscope and
 * accelerometer data from the 'devicemotion' event.
 *
 * Accelerometer data is very noisy, but stable over the long term.
 * Gyroscope data is smooth, but tends to drift over the long term.
 *
 * This fusion is relatively simple:
 * 1. Get orientation estimates from accelerometer by applying a low-pass filter
 *    on that data.
 * 2. Get orientation estimates from gyroscope by integrating over time.
 * 3. Combine the two estimates, weighing (1) in the long term, but (2) for the
 *    short term.
 */
function ComplementaryFilter(kFilter) {
  this.kFilter = kFilter;

  // Raw sensor measurements.
  this.currentAccelMeasurement = new SensorSample();
  this.currentGyroMeasurement = new SensorSample();
  this.previousGyroMeasurement = new SensorSample();

  // Current filter orientation
  this.filterQ = new THREE.Quaternion();
  this.previousFilterQ = new THREE.Quaternion();

  // Orientation based on the accelerometer.
  this.accelQ = new THREE.Quaternion();
  // Whether or not the orientation has been initialized.
  this.isOrientationInitialized = false;
  // Running estimate of gravity based on the current orientation.
  this.estimatedGravity = new THREE.Vector3();
  // Measured gravity based on accelerometer.
  this.measuredGravity = new THREE.Vector3();

  // Debug only quaternion of gyro-based orientation.
  this.gyroIntegralQ = new THREE.Quaternion();
}

ComplementaryFilter.prototype.addAccelMeasurement = function(vector, timestampS) {
  this.currentAccelMeasurement.set(vector, timestampS);
};

ComplementaryFilter.prototype.addGyroMeasurement = function(vector, timestampS) {
  this.currentGyroMeasurement.set(vector, timestampS);

  var deltaT = timestampS - this.previousGyroMeasurement.timestampS;
  if (Util.isTimestampDeltaValid(deltaT)) {
    this.run_();
  }
  
  this.previousGyroMeasurement.copy(this.currentGyroMeasurement);
};

ComplementaryFilter.prototype.run_ = function() {
  this.accelQ = this.accelToQuaternion_(this.currentAccelMeasurement.sample);

  if (!this.isOrientationInitialized) {
    this.previousFilterQ.copy(this.accelQ);
    this.isOrientationInitialized = true;
    return;
  }

  var deltaT = this.currentGyroMeasurement.timestampS -
      this.previousGyroMeasurement.timestampS;

  // Convert gyro rotation vector to a quaternion delta.
  var gyroDeltaQ = this.gyroToQuaternionDelta_(this.currentGyroMeasurement.sample, deltaT);
  this.gyroIntegralQ.multiply(gyroDeltaQ);

  // filter_1 = K * (filter_0 + gyro * dT) + (1 - K) * accel.
  this.filterQ.copy(this.previousFilterQ);
  this.filterQ.multiply(gyroDeltaQ);

  // Calculate the delta between the current estimated gravity and the real
  // gravity vector from accelerometer.
  var invFilterQ = new THREE.Quaternion();
  invFilterQ.copy(this.filterQ);
  invFilterQ.inverse();

  this.estimatedGravity.set(0, 0, -1);
  this.estimatedGravity.applyQuaternion(invFilterQ);
  this.estimatedGravity.normalize();

  this.measuredGravity.copy(this.currentAccelMeasurement.sample);
  this.measuredGravity.normalize();

  // Compare estimated gravity with measured gravity, get the delta quaternion
  // between the two.
  var deltaQ = new THREE.Quaternion();
  deltaQ.setFromUnitVectors(this.estimatedGravity, this.measuredGravity);
  deltaQ.inverse();

  if (DEBUG) {
    console.log('Delta: %d deg, G_est: (%s, %s, %s), G_meas: (%s, %s, %s)',
                THREE.Math.radToDeg(Util.getQuaternionAngle(deltaQ)),
                (this.estimatedGravity.x).toFixed(1),
                (this.estimatedGravity.y).toFixed(1),
                (this.estimatedGravity.z).toFixed(1),
                (this.measuredGravity.x).toFixed(1),
                (this.measuredGravity.y).toFixed(1),
                (this.measuredGravity.z).toFixed(1));
  }

  // Calculate the SLERP target: current orientation plus the measured-estimated
  // quaternion delta.
  var targetQ = new THREE.Quaternion();
  targetQ.copy(this.filterQ);
  targetQ.multiply(deltaQ);

  // SLERP factor: 0 is pure gyro, 1 is pure accel.
  this.filterQ.slerp(targetQ, 1 - this.kFilter);

  this.previousFilterQ.copy(this.filterQ);
};

ComplementaryFilter.prototype.getOrientation = function() {
  return this.filterQ;
};

ComplementaryFilter.prototype.accelToQuaternion_ = function(accel) {
  var normAccel = new THREE.Vector3();
  normAccel.copy(accel);
  normAccel.normalize();
  var quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 0, -1), normAccel);
  return quat;
};

ComplementaryFilter.prototype.gyroToQuaternionDelta_ = function(gyro, dt) {
  // Extract axis and angle from the gyroscope data.
  var quat = new THREE.Quaternion();
  var axis = new THREE.Vector3();
  axis.copy(gyro);
  axis.normalize();
  quat.setFromAxisAngle(axis, gyro.length() * dt);
  return quat;
};


module.exports = ComplementaryFilter;

},{"./sensor-sample.js":15,"./three-math.js":16,"./util.js":18}],11:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PositionSensorVRDevice = require('./base.js').PositionSensorVRDevice;

var ComplementaryFilter = require('./complementary-filter.js');
var PosePredictor = require('./pose-predictor.js');
var TouchPanner = require('./touch-panner.js');
var THREE = require('./three-math.js');
var Util = require('./util.js');

/**
 * The positional sensor, implemented using DeviceMotion APIs.
 */
function FusionPositionSensorVRDevice() {
  this.deviceId = 'webvr-polyfill:fused';
  this.deviceName = 'VR Position Device (webvr-polyfill:fused)';

  this.accelerometer = new THREE.Vector3();
  this.gyroscope = new THREE.Vector3();

  window.addEventListener('devicemotion', this.onDeviceMotionChange_.bind(this));
  window.addEventListener('orientationchange', this.onScreenOrientationChange_.bind(this));

  this.filter = new ComplementaryFilter(WebVRConfig.K_FILTER || 0.98);
  this.posePredictor = new PosePredictor(WebVRConfig.PREDICTION_TIME_S || 0.050);
  this.touchPanner = new TouchPanner();

  this.filterToWorldQ = new THREE.Quaternion();

  // Set the filter to world transform, depending on OS.
  if (Util.isIOS()) {
    this.filterToWorldQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI/2);
  } else {
    this.filterToWorldQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);
  }

  this.worldToScreenQ = new THREE.Quaternion();
  this.setScreenTransform_();

  // Keep track of a reset transform for resetSensor.
  this.resetQ = new THREE.Quaternion();
}
FusionPositionSensorVRDevice.prototype = new PositionSensorVRDevice();

/**
 * Returns {orientation: {x,y,z,w}, position: null}.
 * Position is not supported since we can't do 6DOF.
 */
FusionPositionSensorVRDevice.prototype.getState = function() {
  return {
    hasOrientation: true,
    orientation: this.getOrientation(),
    hasPosition: false,
    position: null
  }
};

FusionPositionSensorVRDevice.prototype.getOrientation = function() {
  // Convert from filter space to the the same system used by the
  // deviceorientation event.
  var orientation = this.filter.getOrientation();

  // Predict orientation.
  this.predictedQ = this.posePredictor.getPrediction(orientation, this.gyroscope, this.previousTimestampS);

  // Convert to THREE coordinate system: -Z forward, Y up, X right.
  var out = new THREE.Quaternion();
  out.copy(this.filterToWorldQ);
  out.multiply(this.resetQ);
  out.multiply(this.touchPanner.getOrientation());
  out.multiply(this.predictedQ);
  out.multiply(this.worldToScreenQ);
  return out;
};

FusionPositionSensorVRDevice.prototype.resetSensor = function() {
  var euler = new THREE.Euler();
  euler.setFromQuaternion(this.filter.getOrientation());
  var yaw = euler.y;
  console.log('resetSensor with yaw: %f', yaw);
  this.resetQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -yaw);
  this.touchPanner.resetSensor();
};

FusionPositionSensorVRDevice.prototype.onDeviceMotionChange_ = function(deviceMotion) {
  var accGravity = deviceMotion.accelerationIncludingGravity;
  var rotRate = deviceMotion.rotationRate;
  var timestampS = deviceMotion.timeStamp / 1000;

  var deltaS = timestampS - this.previousTimestampS;
  if (deltaS <= Util.MIN_TIMESTEP || deltaS > Util.MAX_TIMESTEP) {
    console.warn('Invalid timestamps detected. Time step between successive ' +
                 'gyroscope sensor samples is very small or not monotonic');
    this.previousTimestampS = timestampS;
    return;
  }
  this.accelerometer.set(-accGravity.x, -accGravity.y, -accGravity.z);
  this.gyroscope.set(rotRate.alpha, rotRate.beta, rotRate.gamma);

  // In iOS, rotationRate is reported in degrees, so we first convert to
  // radians.
  if (Util.isIOS()) {
    this.gyroscope.multiplyScalar(Math.PI / 180);
  }

  this.filter.addAccelMeasurement(this.accelerometer, timestampS);
  this.filter.addGyroMeasurement(this.gyroscope, timestampS);

  this.previousTimestampS = timestampS;
};

FusionPositionSensorVRDevice.prototype.onScreenOrientationChange_ =
    function(screenOrientation) {
  this.setScreenTransform_();
};

FusionPositionSensorVRDevice.prototype.setScreenTransform_ = function() {
  this.worldToScreenQ.set(0, 0, 0, 1);
  switch (window.orientation) {
    case 0:
      break;
    case 90:
      this.worldToScreenQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI/2);
      break;
    case -90: 
      this.worldToScreenQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI/2);
      break;
    case 180:
      // TODO.
      break;
  }
};


module.exports = FusionPositionSensorVRDevice;

},{"./base.js":9,"./complementary-filter.js":10,"./pose-predictor.js":14,"./three-math.js":16,"./touch-panner.js":17,"./util.js":18}],12:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PositionSensorVRDevice = require('./base.js').PositionSensorVRDevice;
var Util = require('./util.js');

// How much to rotate per key stroke.
var KEY_SPEED = 0.15;
var KEY_ANIMATION_DURATION = 80;

// How much to rotate for mouse events.
var MOUSE_SPEED_X = 0.5;
var MOUSE_SPEED_Y = 0.3;

/**
 * A virtual position sensor, implemented using keyboard and
 * mouse APIs. This is designed as for desktops/laptops where no Device*
 * events work.
 */
function MouseKeyboardPositionSensorVRDevice() {
  this.deviceId = 'webvr-polyfill:mouse-keyboard';
  this.deviceName = 'VR Position Device (webvr-polyfill:mouse-keyboard)';

  // Attach to mouse and keyboard events.
  window.addEventListener('keydown', this.onKeyDown_.bind(this));
  window.addEventListener('mousemove', this.onMouseMove_.bind(this));
  window.addEventListener('mousedown', this.onMouseDown_.bind(this));
  window.addEventListener('mouseup', this.onMouseUp_.bind(this));

  this.phi = 0;
  this.theta = 0;

  // Variables for keyboard-based rotation animation.
  this.targetAngle = null;

  // State variables for calculations.
  this.euler = new THREE.Euler();
  this.orientation = new THREE.Quaternion();

  // Variables for mouse-based rotation.
  this.rotateStart = new THREE.Vector2();
  this.rotateEnd = new THREE.Vector2();
  this.rotateDelta = new THREE.Vector2();
}
MouseKeyboardPositionSensorVRDevice.prototype = new PositionSensorVRDevice();

/**
 * Returns {orientation: {x,y,z,w}, position: null}.
 * Position is not supported for parity with other PositionSensors.
 */
MouseKeyboardPositionSensorVRDevice.prototype.getState = function() {
  this.euler.set(this.phi, this.theta, 0, 'YXZ');
  this.orientation.setFromEuler(this.euler);

  return {
    hasOrientation: true,
    orientation: this.orientation,
    hasPosition: false,
    position: null
  }
};

MouseKeyboardPositionSensorVRDevice.prototype.onKeyDown_ = function(e) {
  // Track WASD and arrow keys.
  if (e.keyCode == 38) { // Up key.
    this.animatePhi_(this.phi + KEY_SPEED);
  } else if (e.keyCode == 39) { // Right key.
    this.animateTheta_(this.theta - KEY_SPEED);
  } else if (e.keyCode == 40) { // Down key.
    this.animatePhi_(this.phi - KEY_SPEED);
  } else if (e.keyCode == 37) { // Left key.
    this.animateTheta_(this.theta + KEY_SPEED);
  }
};

MouseKeyboardPositionSensorVRDevice.prototype.animateTheta_ = function(targetAngle) {
  this.animateKeyTransitions_('theta', targetAngle);
};

MouseKeyboardPositionSensorVRDevice.prototype.animatePhi_ = function(targetAngle) {
  // Prevent looking too far up or down.
  targetAngle = Util.clamp(targetAngle, -Math.PI/2, Math.PI/2);
  this.animateKeyTransitions_('phi', targetAngle);
};

/**
 * Start an animation to transition an angle from one value to another.
 */
MouseKeyboardPositionSensorVRDevice.prototype.animateKeyTransitions_ = function(angleName, targetAngle) {
  // If an animation is currently running, cancel it.
  if (this.angleAnimation) {
    clearInterval(this.angleAnimation);
  }
  var startAngle = this[angleName];
  var startTime = new Date();
  // Set up an interval timer to perform the animation.
  this.angleAnimation = setInterval(function() {
    // Once we're finished the animation, we're done.
    var elapsed = new Date() - startTime;
    if (elapsed >= KEY_ANIMATION_DURATION) {
      this[angleName] = targetAngle;
      clearInterval(this.angleAnimation);
      return;
    }
    // Linearly interpolate the angle some amount.
    var percent = elapsed / KEY_ANIMATION_DURATION;
    this[angleName] = startAngle + (targetAngle - startAngle) * percent;
  }.bind(this), 1000/60);
};

MouseKeyboardPositionSensorVRDevice.prototype.onMouseDown_ = function(e) {
  this.rotateStart.set(e.clientX, e.clientY);
  this.isDragging = true;
};

// Very similar to https://gist.github.com/mrflix/8351020
MouseKeyboardPositionSensorVRDevice.prototype.onMouseMove_ = function(e) {
  if (!this.isDragging && !this.isPointerLocked_()) {
    return;
  }
  // Support pointer lock API.
  if (this.isPointerLocked_()) {
    var movementX = e.movementX || e.mozMovementX || 0;
    var movementY = e.movementY || e.mozMovementY || 0;
    this.rotateEnd.set(this.rotateStart.x - movementX, this.rotateStart.y - movementY);
  } else {
    this.rotateEnd.set(e.clientX, e.clientY);
  }
  // Calculate how much we moved in mouse space.
  this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
  this.rotateStart.copy(this.rotateEnd);

  // Keep track of the cumulative euler angles.
  var element = document.body;
  this.phi += 2 * Math.PI * this.rotateDelta.y / element.clientHeight * MOUSE_SPEED_Y;
  this.theta += 2 * Math.PI * this.rotateDelta.x / element.clientWidth * MOUSE_SPEED_X;

  // Prevent looking too far up or down.
  this.phi = Util.clamp(this.phi, -Math.PI/2, Math.PI/2);
};

MouseKeyboardPositionSensorVRDevice.prototype.onMouseUp_ = function(e) {
  this.isDragging = false;
};

MouseKeyboardPositionSensorVRDevice.prototype.isPointerLocked_ = function() {
  var el = document.pointerLockElement || document.mozPointerLockElement ||
      document.webkitPointerLockElement;
  return el !== undefined;
};

MouseKeyboardPositionSensorVRDevice.prototype.resetSensor = function() {
  console.error('Not implemented yet.');
};

module.exports = MouseKeyboardPositionSensorVRDevice;

},{"./base.js":9,"./util.js":18}],13:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PositionSensorVRDevice = require('./base.js').PositionSensorVRDevice;
var TouchPanner = require('./touch-panner.js');
var Util = require('./util.js');

WEBVR_YAW_ONLY = false;

/**
 * The positional sensor, implemented using web DeviceOrientation APIs.
 */
function OrientationPositionSensorVRDevice() {
  this.deviceId = 'webvr-polyfill:gyro';
  this.deviceName = 'VR Position Device (webvr-polyfill:gyro)';

  // Subscribe to deviceorientation events.
  window.addEventListener('deviceorientation', this.onDeviceOrientationChange_.bind(this));
  window.addEventListener('orientationchange', this.onScreenOrientationChange_.bind(this));

  this.deviceOrientation = null;
  this.screenOrientation = window.orientation;

  // Helper objects for calculating orientation.
  this.finalQuaternion = new THREE.Quaternion();
  this.tmpQuaternion = new THREE.Quaternion();
  this.deviceEuler = new THREE.Euler();
  this.screenTransform = new THREE.Quaternion();
  // -PI/2 around the x-axis.
  this.worldTransform = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

  // The quaternion for taking into account the reset position.
  this.resetTransform = new THREE.Quaternion();

  this.touchPanner = new TouchPanner();
}
OrientationPositionSensorVRDevice.prototype = new PositionSensorVRDevice();

/**
 * Returns {orientation: {x,y,z,w}, position: null}.
 * Position is not supported since we can't do 6DOF.
 */
OrientationPositionSensorVRDevice.prototype.getState = function() {
  return {
    hasOrientation: true,
    orientation: this.getOrientation(),
    hasPosition: false,
    position: null
  }
};

OrientationPositionSensorVRDevice.prototype.onDeviceOrientationChange_ =
    function(deviceOrientation) {
  this.deviceOrientation = deviceOrientation;
};

OrientationPositionSensorVRDevice.prototype.onScreenOrientationChange_ =
    function(screenOrientation) {
  this.screenOrientation = window.orientation;
};

OrientationPositionSensorVRDevice.prototype.getOrientation = function() {
  if (this.deviceOrientation == null) {
    return null;
  }

  // Rotation around the z-axis.
  var alpha = THREE.Math.degToRad(this.deviceOrientation.alpha);
  // Front-to-back (in portrait) rotation (x-axis).
  var beta = THREE.Math.degToRad(this.deviceOrientation.beta);
  // Left to right (in portrait) rotation (y-axis).
  var gamma = THREE.Math.degToRad(this.deviceOrientation.gamma);
  var orient = THREE.Math.degToRad(this.screenOrientation);

  // Use three.js to convert to quaternion. Lifted from
  // https://github.com/richtr/threeVR/blob/master/js/DeviceOrientationController.js
  this.deviceEuler.set(beta, alpha, -gamma, 'YXZ');
  this.tmpQuaternion.setFromEuler(this.deviceEuler);
  this.minusHalfAngle = -orient / 2;
  this.screenTransform.set(0, Math.sin(this.minusHalfAngle), 0, Math.cos(this.minusHalfAngle));
  // Take into account the reset transformation.
  this.finalQuaternion.copy(this.resetTransform);
  // And any rotations done via touch events.
  this.finalQuaternion.multiply(this.touchPanner.getOrientation());
  this.finalQuaternion.multiply(this.tmpQuaternion);
  this.finalQuaternion.multiply(this.screenTransform);
  this.finalQuaternion.multiply(this.worldTransform);

  return this.finalQuaternion;
};

OrientationPositionSensorVRDevice.prototype.resetSensor = function() {
  var angle = THREE.Math.degToRad(this.deviceOrientation.alpha);
  console.log('Normalizing yaw to %f', angle);
  this.resetTransform.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
};

module.exports = OrientationPositionSensorVRDevice;

},{"./base.js":9,"./touch-panner.js":17,"./util.js":18}],14:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var DEBUG = false;

/**
 * Given an orientation and the gyroscope data, predicts the future orientation
 * of the head. This makes rendering appear faster.
 *
 * Also see: http://msl.cs.uiuc.edu/~lavalle/papers/LavYerKatAnt14.pdf
 *
 * @param {Number} predictionTimeS time from head movement to the appearance of
 * the corresponding image.
 */
function PosePredictor(predictionTimeS) {
  this.predictionTimeS = predictionTimeS;

  // The quaternion corresponding to the previous state.
  this.previousQ = new THREE.Quaternion();
  // Previous time a prediction occurred.
  this.previousTimestampS = null;

  // The delta quaternion that adjusts the current pose.
  this.deltaQ = new THREE.Quaternion();
  // The output quaternion.
  this.outQ = new THREE.Quaternion();
}

PosePredictor.prototype.getPrediction = function(currentQ, gyro, timestampS) {
  if (!this.previousTimestampS) {
    this.previousQ.copy(currentQ);
    this.previousTimestampS = timestampS;
    return currentQ;
  }

  // Calculate axis and angle based on gyroscope rotation rate data.
  var axis = new THREE.Vector3();
  axis.copy(gyro);
  axis.normalize();

  var angularSpeed = gyro.length();

  // If we're rotating slowly, don't do prediction.
  if (angularSpeed < THREE.Math.degToRad(20)) {
    if (DEBUG) {
      console.log('Moving slowly, at %s deg/s: no prediction',
                  THREE.Math.radToDeg(angularSpeed).toFixed(1));
    }
    this.outQ.copy(currentQ);
    this.previousQ.copy(currentQ);
    return this.outQ;
  }

  // Get the predicted angle based on the time delta and latency.
  var deltaT = timestampS - this.previousTimestampS;
  var predictAngle = angularSpeed * this.predictionTimeS;

  this.deltaQ.setFromAxisAngle(axis, predictAngle);
  this.outQ.copy(this.previousQ);
  this.outQ.multiply(this.deltaQ);

  this.previousQ.copy(currentQ);

  return this.outQ;
};


module.exports = PosePredictor;

},{}],15:[function(require,module,exports){
function SensorSample(sample, timestampS) {
  this.set(sample, timestampS);
};

SensorSample.prototype.set = function(sample, timestampS) {
  this.sample = sample;
  this.timestampS = timestampS;
};

SensorSample.prototype.copy = function(sensorSample) {
  this.set(sensorSample.sample, sensorSample.timestampS);
};

module.exports = SensorSample;

},{}],16:[function(require,module,exports){
/*
 * A subset of THREE.js, providing mostly quaternion and euler-related
 * operations, manually lifted from
 * https://github.com/mrdoob/three.js/tree/master/src/math, as of 9c30286b38df039fca389989ff06ea1c15d6bad1
 */

// Only use if the real THREE is not provided.
var THREE = window.THREE || {};

// If some piece of THREE is missing, fill it in here.
if (!THREE.Quaternion || !THREE.Vector3 || !THREE.Vector2 || !THREE.Euler || !THREE.Math) {
console.log('No THREE.js found.');


/*** START Quaternion ***/

/**
 * @author mikael emtinger / http://gomo.se/
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author bhouston / http://exocortex.com
 */

THREE.Quaternion = function ( x, y, z, w ) {

	this._x = x || 0;
	this._y = y || 0;
	this._z = z || 0;
	this._w = ( w !== undefined ) ? w : 1;

};

THREE.Quaternion.prototype = {

	constructor: THREE.Quaternion,

	_x: 0,_y: 0, _z: 0, _w: 0,

	get x () {

		return this._x;

	},

	set x ( value ) {

		this._x = value;
		this.onChangeCallback();

	},

	get y () {

		return this._y;

	},

	set y ( value ) {

		this._y = value;
		this.onChangeCallback();

	},

	get z () {

		return this._z;

	},

	set z ( value ) {

		this._z = value;
		this.onChangeCallback();

	},

	get w () {

		return this._w;

	},

	set w ( value ) {

		this._w = value;
		this.onChangeCallback();

	},

	set: function ( x, y, z, w ) {

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;

		this.onChangeCallback();

		return this;

	},

	copy: function ( quaternion ) {

		this._x = quaternion.x;
		this._y = quaternion.y;
		this._z = quaternion.z;
		this._w = quaternion.w;

		this.onChangeCallback();

		return this;

	},

	setFromEuler: function ( euler, update ) {

		if ( euler instanceof THREE.Euler === false ) {

			throw new Error( 'THREE.Quaternion: .setFromEuler() now expects a Euler rotation rather than a Vector3 and order.' );
		}

		// http://www.mathworks.com/matlabcentral/fileexchange/
		// 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
		//	content/SpinCalc.m

		var c1 = Math.cos( euler._x / 2 );
		var c2 = Math.cos( euler._y / 2 );
		var c3 = Math.cos( euler._z / 2 );
		var s1 = Math.sin( euler._x / 2 );
		var s2 = Math.sin( euler._y / 2 );
		var s3 = Math.sin( euler._z / 2 );

		if ( euler.order === 'XYZ' ) {

			this._x = s1 * c2 * c3 + c1 * s2 * s3;
			this._y = c1 * s2 * c3 - s1 * c2 * s3;
			this._z = c1 * c2 * s3 + s1 * s2 * c3;
			this._w = c1 * c2 * c3 - s1 * s2 * s3;

		} else if ( euler.order === 'YXZ' ) {

			this._x = s1 * c2 * c3 + c1 * s2 * s3;
			this._y = c1 * s2 * c3 - s1 * c2 * s3;
			this._z = c1 * c2 * s3 - s1 * s2 * c3;
			this._w = c1 * c2 * c3 + s1 * s2 * s3;

		} else if ( euler.order === 'ZXY' ) {

			this._x = s1 * c2 * c3 - c1 * s2 * s3;
			this._y = c1 * s2 * c3 + s1 * c2 * s3;
			this._z = c1 * c2 * s3 + s1 * s2 * c3;
			this._w = c1 * c2 * c3 - s1 * s2 * s3;

		} else if ( euler.order === 'ZYX' ) {

			this._x = s1 * c2 * c3 - c1 * s2 * s3;
			this._y = c1 * s2 * c3 + s1 * c2 * s3;
			this._z = c1 * c2 * s3 - s1 * s2 * c3;
			this._w = c1 * c2 * c3 + s1 * s2 * s3;

		} else if ( euler.order === 'YZX' ) {

			this._x = s1 * c2 * c3 + c1 * s2 * s3;
			this._y = c1 * s2 * c3 + s1 * c2 * s3;
			this._z = c1 * c2 * s3 - s1 * s2 * c3;
			this._w = c1 * c2 * c3 - s1 * s2 * s3;

		} else if ( euler.order === 'XZY' ) {

			this._x = s1 * c2 * c3 - c1 * s2 * s3;
			this._y = c1 * s2 * c3 - s1 * c2 * s3;
			this._z = c1 * c2 * s3 + s1 * s2 * c3;
			this._w = c1 * c2 * c3 + s1 * s2 * s3;

		}

		if ( update !== false ) this.onChangeCallback();

		return this;

	},

	setFromAxisAngle: function ( axis, angle ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm

		// assumes axis is normalized

		var halfAngle = angle / 2, s = Math.sin( halfAngle );

		this._x = axis.x * s;
		this._y = axis.y * s;
		this._z = axis.z * s;
		this._w = Math.cos( halfAngle );

		this.onChangeCallback();

		return this;

	},

	setFromRotationMatrix: function ( m ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		var te = m.elements,

			m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ],
			m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ],
			m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ],

			trace = m11 + m22 + m33,
			s;

		if ( trace > 0 ) {

			s = 0.5 / Math.sqrt( trace + 1.0 );

			this._w = 0.25 / s;
			this._x = ( m32 - m23 ) * s;
			this._y = ( m13 - m31 ) * s;
			this._z = ( m21 - m12 ) * s;

		} else if ( m11 > m22 && m11 > m33 ) {

			s = 2.0 * Math.sqrt( 1.0 + m11 - m22 - m33 );

			this._w = ( m32 - m23 ) / s;
			this._x = 0.25 * s;
			this._y = ( m12 + m21 ) / s;
			this._z = ( m13 + m31 ) / s;

		} else if ( m22 > m33 ) {

			s = 2.0 * Math.sqrt( 1.0 + m22 - m11 - m33 );

			this._w = ( m13 - m31 ) / s;
			this._x = ( m12 + m21 ) / s;
			this._y = 0.25 * s;
			this._z = ( m23 + m32 ) / s;

		} else {

			s = 2.0 * Math.sqrt( 1.0 + m33 - m11 - m22 );

			this._w = ( m21 - m12 ) / s;
			this._x = ( m13 + m31 ) / s;
			this._y = ( m23 + m32 ) / s;
			this._z = 0.25 * s;

		}

		this.onChangeCallback();

		return this;

	},

	setFromUnitVectors: function () {

		// http://lolengine.net/blog/2014/02/24/quaternion-from-two-vectors-final

		// assumes direction vectors vFrom and vTo are normalized

		var v1, r;

		var EPS = 0.000001;

		return function ( vFrom, vTo ) {

			if ( v1 === undefined ) v1 = new THREE.Vector3();

			r = vFrom.dot( vTo ) + 1;

			if ( r < EPS ) {

				r = 0;

				if ( Math.abs( vFrom.x ) > Math.abs( vFrom.z ) ) {

					v1.set( - vFrom.y, vFrom.x, 0 );

				} else {

					v1.set( 0, - vFrom.z, vFrom.y );

				}

			} else {

				v1.crossVectors( vFrom, vTo );

			}

			this._x = v1.x;
			this._y = v1.y;
			this._z = v1.z;
			this._w = r;

			this.normalize();

			return this;

		}

	}(),

	inverse: function () {

		this.conjugate().normalize();

		return this;

	},

	conjugate: function () {

		this._x *= - 1;
		this._y *= - 1;
		this._z *= - 1;

		this.onChangeCallback();

		return this;

	},

	dot: function ( v ) {

		return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;

	},

	lengthSq: function () {

		return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;

	},

	length: function () {

		return Math.sqrt( this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w );

	},

	normalize: function () {

		var l = this.length();

		if ( l === 0 ) {

			this._x = 0;
			this._y = 0;
			this._z = 0;
			this._w = 1;

		} else {

			l = 1 / l;

			this._x = this._x * l;
			this._y = this._y * l;
			this._z = this._z * l;
			this._w = this._w * l;

		}

		this.onChangeCallback();

		return this;

	},

	multiply: function ( q, p ) {

		if ( p !== undefined ) {

			console.warn( 'THREE.Quaternion: .multiply() now only accepts one argument. Use .multiplyQuaternions( a, b ) instead.' );
			return this.multiplyQuaternions( q, p );

		}

		return this.multiplyQuaternions( this, q );

	},

	multiplyQuaternions: function ( a, b ) {

		// from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm

		var qax = a._x, qay = a._y, qaz = a._z, qaw = a._w;
		var qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;

		this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
		this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
		this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
		this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

		this.onChangeCallback();

		return this;

	},

	multiplyVector3: function ( vector ) {

		console.warn( 'THREE.Quaternion: .multiplyVector3() has been removed. Use is now vector.applyQuaternion( quaternion ) instead.' );
		return vector.applyQuaternion( this );

	},

	slerp: function ( qb, t ) {

		if ( t === 0 ) return this;
		if ( t === 1 ) return this.copy( qb );

		var x = this._x, y = this._y, z = this._z, w = this._w;

		// http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

		var cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;

		if ( cosHalfTheta < 0 ) {

			this._w = - qb._w;
			this._x = - qb._x;
			this._y = - qb._y;
			this._z = - qb._z;

			cosHalfTheta = - cosHalfTheta;

		} else {

			this.copy( qb );

		}

		if ( cosHalfTheta >= 1.0 ) {

			this._w = w;
			this._x = x;
			this._y = y;
			this._z = z;

			return this;

		}

		var halfTheta = Math.acos( cosHalfTheta );
		var sinHalfTheta = Math.sqrt( 1.0 - cosHalfTheta * cosHalfTheta );

		if ( Math.abs( sinHalfTheta ) < 0.001 ) {

			this._w = 0.5 * ( w + this._w );
			this._x = 0.5 * ( x + this._x );
			this._y = 0.5 * ( y + this._y );
			this._z = 0.5 * ( z + this._z );

			return this;

		}

		var ratioA = Math.sin( ( 1 - t ) * halfTheta ) / sinHalfTheta,
		ratioB = Math.sin( t * halfTheta ) / sinHalfTheta;

		this._w = ( w * ratioA + this._w * ratioB );
		this._x = ( x * ratioA + this._x * ratioB );
		this._y = ( y * ratioA + this._y * ratioB );
		this._z = ( z * ratioA + this._z * ratioB );

		this.onChangeCallback();

		return this;

	},

	equals: function ( quaternion ) {

		return ( quaternion._x === this._x ) && ( quaternion._y === this._y ) && ( quaternion._z === this._z ) && ( quaternion._w === this._w );

	},

	fromArray: function ( array, offset ) {

		if ( offset === undefined ) offset = 0;

		this._x = array[ offset ];
		this._y = array[ offset + 1 ];
		this._z = array[ offset + 2 ];
		this._w = array[ offset + 3 ];

		this.onChangeCallback();

		return this;

	},

	toArray: function ( array, offset ) {

		if ( array === undefined ) array = [];
		if ( offset === undefined ) offset = 0;

		array[ offset ] = this._x;
		array[ offset + 1 ] = this._y;
		array[ offset + 2 ] = this._z;
		array[ offset + 3 ] = this._w;

		return array;

	},

	onChange: function ( callback ) {

		this.onChangeCallback = callback;

		return this;

	},

	onChangeCallback: function () {},

	clone: function () {

		return new THREE.Quaternion( this._x, this._y, this._z, this._w );

	}

};

THREE.Quaternion.slerp = function ( qa, qb, qm, t ) {

	return qm.copy( qa ).slerp( qb, t );

}

/*** END Quaternion ***/
/*** START Vector2 ***/
/**
 * @author mrdoob / http://mrdoob.com/
 * @author philogb / http://blog.thejit.org/
 * @author egraether / http://egraether.com/
 * @author zz85 / http://www.lab4games.net/zz85/blog
 */

THREE.Vector2 = function ( x, y ) {

	this.x = x || 0;
	this.y = y || 0;

};

THREE.Vector2.prototype = {

	constructor: THREE.Vector2,

	set: function ( x, y ) {

		this.x = x;
		this.y = y;

		return this;

	},

	setX: function ( x ) {

		this.x = x;

		return this;

	},

	setY: function ( y ) {

		this.y = y;

		return this;

	},

	setComponent: function ( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

	},

	getComponent: function ( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			default: throw new Error( 'index is out of range: ' + index );

		}

	},

	copy: function ( v ) {

		this.x = v.x;
		this.y = v.y;

		return this;

	},

	add: function ( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector2: .add() now only accepts one argument. Use .addVectors( a, b ) instead.' );
			return this.addVectors( v, w );

		}

		this.x += v.x;
		this.y += v.y;

		return this;

	},

	addVectors: function ( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;

		return this;

	},

	addScalar: function ( s ) {

		this.x += s;
		this.y += s;

		return this;

	},

	sub: function ( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector2: .sub() now only accepts one argument. Use .subVectors( a, b ) instead.' );
			return this.subVectors( v, w );

		}

		this.x -= v.x;
		this.y -= v.y;

		return this;

	},

	subVectors: function ( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;

		return this;

	},

	multiply: function ( v ) {

		this.x *= v.x;
		this.y *= v.y;

		return this;

	},

	multiplyScalar: function ( s ) {

		this.x *= s;
		this.y *= s;

		return this;

	},

	divide: function ( v ) {

		this.x /= v.x;
		this.y /= v.y;

		return this;

	},

	divideScalar: function ( scalar ) {

		if ( scalar !== 0 ) {

			var invScalar = 1 / scalar;

			this.x *= invScalar;
			this.y *= invScalar;

		} else {

			this.x = 0;
			this.y = 0;

		}

		return this;

	},

	min: function ( v ) {

		if ( this.x > v.x ) {

			this.x = v.x;

		}

		if ( this.y > v.y ) {

			this.y = v.y;

		}

		return this;

	},

	max: function ( v ) {

		if ( this.x < v.x ) {

			this.x = v.x;

		}

		if ( this.y < v.y ) {

			this.y = v.y;

		}

		return this;

	},

	clamp: function ( min, max ) {

		// This function assumes min < max, if this assumption isn't true it will not operate correctly

		if ( this.x < min.x ) {

			this.x = min.x;

		} else if ( this.x > max.x ) {

			this.x = max.x;

		}

		if ( this.y < min.y ) {

			this.y = min.y;

		} else if ( this.y > max.y ) {

			this.y = max.y;

		}

		return this;
	},

	clampScalar: ( function () {

		var min, max;

		return function ( minVal, maxVal ) {

			if ( min === undefined ) {

				min = new THREE.Vector2();
				max = new THREE.Vector2();

			}

			min.set( minVal, minVal );
			max.set( maxVal, maxVal );

			return this.clamp( min, max );

		};

	} )(),

	floor: function () {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );

		return this;

	},

	ceil: function () {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );

		return this;

	},

	round: function () {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );

		return this;

	},

	roundToZero: function () {

		this.x = ( this.x < 0 ) ? Math.ceil( this.x ) : Math.floor( this.x );
		this.y = ( this.y < 0 ) ? Math.ceil( this.y ) : Math.floor( this.y );

		return this;

	},

	negate: function () {

		this.x = - this.x;
		this.y = - this.y;

		return this;

	},

	dot: function ( v ) {

		return this.x * v.x + this.y * v.y;

	},

	lengthSq: function () {

		return this.x * this.x + this.y * this.y;

	},

	length: function () {

		return Math.sqrt( this.x * this.x + this.y * this.y );

	},

	normalize: function () {

		return this.divideScalar( this.length() );

	},

	distanceTo: function ( v ) {

		return Math.sqrt( this.distanceToSquared( v ) );

	},

	distanceToSquared: function ( v ) {

		var dx = this.x - v.x, dy = this.y - v.y;
		return dx * dx + dy * dy;

	},

	setLength: function ( l ) {

		var oldLength = this.length();

		if ( oldLength !== 0 && l !== oldLength ) {

			this.multiplyScalar( l / oldLength );
		}

		return this;

	},

	lerp: function ( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;

		return this;

	},

	equals: function ( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) );

	},

	fromArray: function ( array, offset ) {

		if ( offset === undefined ) offset = 0;

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];

		return this;

	},

	toArray: function ( array, offset ) {

		if ( array === undefined ) array = [];
		if ( offset === undefined ) offset = 0;

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;

		return array;

	},

	fromAttribute: function ( attribute, index, offset ) {

	    if ( offset === undefined ) offset = 0;

	    index = index * attribute.itemSize + offset;

	    this.x = attribute.array[ index ];
	    this.y = attribute.array[ index + 1 ];

	    return this;

	},

	clone: function () {

		return new THREE.Vector2( this.x, this.y );

	}

};
/*** END Vector2 ***/
/*** START Vector3 ***/

/**
 * @author mrdoob / http://mrdoob.com/
 * @author *kile / http://kile.stravaganza.org/
 * @author philogb / http://blog.thejit.org/
 * @author mikael emtinger / http://gomo.se/
 * @author egraether / http://egraether.com/
 * @author WestLangley / http://github.com/WestLangley
 */

THREE.Vector3 = function ( x, y, z ) {

	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;

};

THREE.Vector3.prototype = {

	constructor: THREE.Vector3,

	set: function ( x, y, z ) {

		this.x = x;
		this.y = y;
		this.z = z;

		return this;

	},

	setX: function ( x ) {

		this.x = x;

		return this;

	},

	setY: function ( y ) {

		this.y = y;

		return this;

	},

	setZ: function ( z ) {

		this.z = z;

		return this;

	},

	setComponent: function ( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			case 2: this.z = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

	},

	getComponent: function ( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			default: throw new Error( 'index is out of range: ' + index );

		}

	},

	copy: function ( v ) {

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;

		return this;

	},

	add: function ( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector3: .add() now only accepts one argument. Use .addVectors( a, b ) instead.' );
			return this.addVectors( v, w );

		}

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;

		return this;

	},

	addScalar: function ( s ) {

		this.x += s;
		this.y += s;
		this.z += s;

		return this;

	},

	addVectors: function ( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;

		return this;

	},

	sub: function ( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector3: .sub() now only accepts one argument. Use .subVectors( a, b ) instead.' );
			return this.subVectors( v, w );

		}

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;

		return this;

	},

	subVectors: function ( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;

		return this;

	},

	multiply: function ( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector3: .multiply() now only accepts one argument. Use .multiplyVectors( a, b ) instead.' );
			return this.multiplyVectors( v, w );

		}

		this.x *= v.x;
		this.y *= v.y;
		this.z *= v.z;

		return this;

	},

	multiplyScalar: function ( scalar ) {

		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;

		return this;

	},

	multiplyVectors: function ( a, b ) {

		this.x = a.x * b.x;
		this.y = a.y * b.y;
		this.z = a.z * b.z;

		return this;

	},

	applyEuler: function () {

		var quaternion;

		return function ( euler ) {

			if ( euler instanceof THREE.Euler === false ) {

				console.error( 'THREE.Vector3: .applyEuler() now expects a Euler rotation rather than a Vector3 and order.' );

			}

			if ( quaternion === undefined ) quaternion = new THREE.Quaternion();

			this.applyQuaternion( quaternion.setFromEuler( euler ) );

			return this;

		};

	}(),

	applyAxisAngle: function () {

		var quaternion;

		return function ( axis, angle ) {

			if ( quaternion === undefined ) quaternion = new THREE.Quaternion();

			this.applyQuaternion( quaternion.setFromAxisAngle( axis, angle ) );

			return this;

		};

	}(),

	applyMatrix3: function ( m ) {

		var x = this.x;
		var y = this.y;
		var z = this.z;

		var e = m.elements;

		this.x = e[ 0 ] * x + e[ 3 ] * y + e[ 6 ] * z;
		this.y = e[ 1 ] * x + e[ 4 ] * y + e[ 7 ] * z;
		this.z = e[ 2 ] * x + e[ 5 ] * y + e[ 8 ] * z;

		return this;

	},

	applyMatrix4: function ( m ) {

		// input: THREE.Matrix4 affine matrix

		var x = this.x, y = this.y, z = this.z;

		var e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ]  * z + e[ 12 ];
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ]  * z + e[ 13 ];
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ];

		return this;

	},

	applyProjection: function ( m ) {

		// input: THREE.Matrix4 projection matrix

		var x = this.x, y = this.y, z = this.z;

		var e = m.elements;
		var d = 1 / ( e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] ); // perspective divide

		this.x = ( e[ 0 ] * x + e[ 4 ] * y + e[ 8 ]  * z + e[ 12 ] ) * d;
		this.y = ( e[ 1 ] * x + e[ 5 ] * y + e[ 9 ]  * z + e[ 13 ] ) * d;
		this.z = ( e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] ) * d;

		return this;

	},

	applyQuaternion: function ( q ) {

		var x = this.x;
		var y = this.y;
		var z = this.z;

		var qx = q.x;
		var qy = q.y;
		var qz = q.z;
		var qw = q.w;

		// calculate quat * vector

		var ix =  qw * x + qy * z - qz * y;
		var iy =  qw * y + qz * x - qx * z;
		var iz =  qw * z + qx * y - qy * x;
		var iw = - qx * x - qy * y - qz * z;

		// calculate result * inverse quat

		this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
		this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
		this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;

		return this;

	},

	project: function () {

		var matrix;

		return function ( camera ) {

			if ( matrix === undefined ) matrix = new THREE.Matrix4();

			matrix.multiplyMatrices( camera.projectionMatrix, matrix.getInverse( camera.matrixWorld ) );
			return this.applyProjection( matrix );

		};

	}(),

	unproject: function () {

		var matrix;

		return function ( camera ) {

			if ( matrix === undefined ) matrix = new THREE.Matrix4();

			matrix.multiplyMatrices( camera.matrixWorld, matrix.getInverse( camera.projectionMatrix ) );
			return this.applyProjection( matrix );

		};

	}(),

	transformDirection: function ( m ) {

		// input: THREE.Matrix4 affine matrix
		// vector interpreted as a direction

		var x = this.x, y = this.y, z = this.z;

		var e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ]  * z;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ]  * z;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;

		this.normalize();

		return this;

	},

	divide: function ( v ) {

		this.x /= v.x;
		this.y /= v.y;
		this.z /= v.z;

		return this;

	},

	divideScalar: function ( scalar ) {

		if ( scalar !== 0 ) {

			var invScalar = 1 / scalar;

			this.x *= invScalar;
			this.y *= invScalar;
			this.z *= invScalar;

		} else {

			this.x = 0;
			this.y = 0;
			this.z = 0;

		}

		return this;

	},

	min: function ( v ) {

		if ( this.x > v.x ) {

			this.x = v.x;

		}

		if ( this.y > v.y ) {

			this.y = v.y;

		}

		if ( this.z > v.z ) {

			this.z = v.z;

		}

		return this;

	},

	max: function ( v ) {

		if ( this.x < v.x ) {

			this.x = v.x;

		}

		if ( this.y < v.y ) {

			this.y = v.y;

		}

		if ( this.z < v.z ) {

			this.z = v.z;

		}

		return this;

	},

	clamp: function ( min, max ) {

		// This function assumes min < max, if this assumption isn't true it will not operate correctly

		if ( this.x < min.x ) {

			this.x = min.x;

		} else if ( this.x > max.x ) {

			this.x = max.x;

		}

		if ( this.y < min.y ) {

			this.y = min.y;

		} else if ( this.y > max.y ) {

			this.y = max.y;

		}

		if ( this.z < min.z ) {

			this.z = min.z;

		} else if ( this.z > max.z ) {

			this.z = max.z;

		}

		return this;

	},

	clampScalar: ( function () {

		var min, max;

		return function ( minVal, maxVal ) {

			if ( min === undefined ) {

				min = new THREE.Vector3();
				max = new THREE.Vector3();

			}

			min.set( minVal, minVal, minVal );
			max.set( maxVal, maxVal, maxVal );

			return this.clamp( min, max );

		};

	} )(),

	floor: function () {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );
		this.z = Math.floor( this.z );

		return this;

	},

	ceil: function () {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );
		this.z = Math.ceil( this.z );

		return this;

	},

	round: function () {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );
		this.z = Math.round( this.z );

		return this;

	},

	roundToZero: function () {

		this.x = ( this.x < 0 ) ? Math.ceil( this.x ) : Math.floor( this.x );
		this.y = ( this.y < 0 ) ? Math.ceil( this.y ) : Math.floor( this.y );
		this.z = ( this.z < 0 ) ? Math.ceil( this.z ) : Math.floor( this.z );

		return this;

	},

	negate: function () {

		this.x = - this.x;
		this.y = - this.y;
		this.z = - this.z;

		return this;

	},

	dot: function ( v ) {

		return this.x * v.x + this.y * v.y + this.z * v.z;

	},

	lengthSq: function () {

		return this.x * this.x + this.y * this.y + this.z * this.z;

	},

	length: function () {

		return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );

	},

	lengthManhattan: function () {

		return Math.abs( this.x ) + Math.abs( this.y ) + Math.abs( this.z );

	},

	normalize: function () {

		return this.divideScalar( this.length() );

	},

	setLength: function ( l ) {

		var oldLength = this.length();

		if ( oldLength !== 0 && l !== oldLength  ) {

			this.multiplyScalar( l / oldLength );
		}

		return this;

	},

	lerp: function ( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;
		this.z += ( v.z - this.z ) * alpha;

		return this;

	},

	cross: function ( v, w ) {

		if ( w !== undefined ) {

			console.warn( 'THREE.Vector3: .cross() now only accepts one argument. Use .crossVectors( a, b ) instead.' );
			return this.crossVectors( v, w );

		}

		var x = this.x, y = this.y, z = this.z;

		this.x = y * v.z - z * v.y;
		this.y = z * v.x - x * v.z;
		this.z = x * v.y - y * v.x;

		return this;

	},

	crossVectors: function ( a, b ) {

		var ax = a.x, ay = a.y, az = a.z;
		var bx = b.x, by = b.y, bz = b.z;

		this.x = ay * bz - az * by;
		this.y = az * bx - ax * bz;
		this.z = ax * by - ay * bx;

		return this;

	},

	projectOnVector: function () {

		var v1, dot;

		return function ( vector ) {

			if ( v1 === undefined ) v1 = new THREE.Vector3();

			v1.copy( vector ).normalize();

			dot = this.dot( v1 );

			return this.copy( v1 ).multiplyScalar( dot );

		};

	}(),

	projectOnPlane: function () {

		var v1;

		return function ( planeNormal ) {

			if ( v1 === undefined ) v1 = new THREE.Vector3();

			v1.copy( this ).projectOnVector( planeNormal );

			return this.sub( v1 );

		}

	}(),

	reflect: function () {

		// reflect incident vector off plane orthogonal to normal
		// normal is assumed to have unit length

		var v1;

		return function ( normal ) {

			if ( v1 === undefined ) v1 = new THREE.Vector3();

			return this.sub( v1.copy( normal ).multiplyScalar( 2 * this.dot( normal ) ) );

		}

	}(),

	angleTo: function ( v ) {

		var theta = this.dot( v ) / ( this.length() * v.length() );

		// clamp, to handle numerical problems

		return Math.acos( THREE.Math.clamp( theta, - 1, 1 ) );

	},

	distanceTo: function ( v ) {

		return Math.sqrt( this.distanceToSquared( v ) );

	},

	distanceToSquared: function ( v ) {

		var dx = this.x - v.x;
		var dy = this.y - v.y;
		var dz = this.z - v.z;

		return dx * dx + dy * dy + dz * dz;

	},

	setEulerFromRotationMatrix: function ( m, order ) {

		console.error( 'THREE.Vector3: .setEulerFromRotationMatrix() has been removed. Use Euler.setFromRotationMatrix() instead.' );

	},

	setEulerFromQuaternion: function ( q, order ) {

		console.error( 'THREE.Vector3: .setEulerFromQuaternion() has been removed. Use Euler.setFromQuaternion() instead.' );

	},

	getPositionFromMatrix: function ( m ) {

		console.warn( 'THREE.Vector3: .getPositionFromMatrix() has been renamed to .setFromMatrixPosition().' );

		return this.setFromMatrixPosition( m );

	},

	getScaleFromMatrix: function ( m ) {

		console.warn( 'THREE.Vector3: .getScaleFromMatrix() has been renamed to .setFromMatrixScale().' );

		return this.setFromMatrixScale( m );
	},

	getColumnFromMatrix: function ( index, matrix ) {

		console.warn( 'THREE.Vector3: .getColumnFromMatrix() has been renamed to .setFromMatrixColumn().' );

		return this.setFromMatrixColumn( index, matrix );

	},

	setFromMatrixPosition: function ( m ) {

		this.x = m.elements[ 12 ];
		this.y = m.elements[ 13 ];
		this.z = m.elements[ 14 ];

		return this;

	},

	setFromMatrixScale: function ( m ) {

		var sx = this.set( m.elements[ 0 ], m.elements[ 1 ], m.elements[  2 ] ).length();
		var sy = this.set( m.elements[ 4 ], m.elements[ 5 ], m.elements[  6 ] ).length();
		var sz = this.set( m.elements[ 8 ], m.elements[ 9 ], m.elements[ 10 ] ).length();

		this.x = sx;
		this.y = sy;
		this.z = sz;

		return this;
	},

	setFromMatrixColumn: function ( index, matrix ) {

		var offset = index * 4;

		var me = matrix.elements;

		this.x = me[ offset ];
		this.y = me[ offset + 1 ];
		this.z = me[ offset + 2 ];

		return this;

	},

	equals: function ( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) );

	},

	fromArray: function ( array, offset ) {

		if ( offset === undefined ) offset = 0;

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];
		this.z = array[ offset + 2 ];

		return this;

	},

	toArray: function ( array, offset ) {

		if ( array === undefined ) array = [];
		if ( offset === undefined ) offset = 0;

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;
		array[ offset + 2 ] = this.z;

		return array;

	},

	fromAttribute: function ( attribute, index, offset ) {

	    if ( offset === undefined ) offset = 0;

	    index = index * attribute.itemSize + offset;

	    this.x = attribute.array[ index ];
	    this.y = attribute.array[ index + 1 ];
	    this.z = attribute.array[ index + 2 ];

	    return this;

	},

	clone: function () {

		return new THREE.Vector3( this.x, this.y, this.z );

	}

};
/*** END Vector3 ***/
/*** START Euler ***/
/**
 * @author mrdoob / http://mrdoob.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author bhouston / http://exocortex.com
 */

THREE.Euler = function ( x, y, z, order ) {

	this._x = x || 0;
	this._y = y || 0;
	this._z = z || 0;
	this._order = order || THREE.Euler.DefaultOrder;

};

THREE.Euler.RotationOrders = [ 'XYZ', 'YZX', 'ZXY', 'XZY', 'YXZ', 'ZYX' ];

THREE.Euler.DefaultOrder = 'XYZ';

THREE.Euler.prototype = {

	constructor: THREE.Euler,

	_x: 0, _y: 0, _z: 0, _order: THREE.Euler.DefaultOrder,

	get x () {

		return this._x;

	},

	set x ( value ) {

		this._x = value;
		this.onChangeCallback();

	},

	get y () {

		return this._y;

	},

	set y ( value ) {

		this._y = value;
		this.onChangeCallback();

	},

	get z () {

		return this._z;

	},

	set z ( value ) {

		this._z = value;
		this.onChangeCallback();

	},

	get order () {

		return this._order;

	},

	set order ( value ) {

		this._order = value;
		this.onChangeCallback();

	},

	set: function ( x, y, z, order ) {

		this._x = x;
		this._y = y;
		this._z = z;
		this._order = order || this._order;

		this.onChangeCallback();

		return this;

	},

	copy: function ( euler ) {

		this._x = euler._x;
		this._y = euler._y;
		this._z = euler._z;
		this._order = euler._order;

		this.onChangeCallback();

		return this;

	},

	setFromRotationMatrix: function ( m, order, update ) {

		var clamp = THREE.Math.clamp;

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		var te = m.elements;
		var m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ];
		var m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ];
		var m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ];

		order = order || this._order;

		if ( order === 'XYZ' ) {

			this._y = Math.asin( clamp( m13, - 1, 1 ) );

			if ( Math.abs( m13 ) < 0.99999 ) {

				this._x = Math.atan2( - m23, m33 );
				this._z = Math.atan2( - m12, m11 );

			} else {

				this._x = Math.atan2( m32, m22 );
				this._z = 0;

			}

		} else if ( order === 'YXZ' ) {

			this._x = Math.asin( - clamp( m23, - 1, 1 ) );

			if ( Math.abs( m23 ) < 0.99999 ) {

				this._y = Math.atan2( m13, m33 );
				this._z = Math.atan2( m21, m22 );

			} else {

				this._y = Math.atan2( - m31, m11 );
				this._z = 0;

			}

		} else if ( order === 'ZXY' ) {

			this._x = Math.asin( clamp( m32, - 1, 1 ) );

			if ( Math.abs( m32 ) < 0.99999 ) {

				this._y = Math.atan2( - m31, m33 );
				this._z = Math.atan2( - m12, m22 );

			} else {

				this._y = 0;
				this._z = Math.atan2( m21, m11 );

			}

		} else if ( order === 'ZYX' ) {

			this._y = Math.asin( - clamp( m31, - 1, 1 ) );

			if ( Math.abs( m31 ) < 0.99999 ) {

				this._x = Math.atan2( m32, m33 );
				this._z = Math.atan2( m21, m11 );

			} else {

				this._x = 0;
				this._z = Math.atan2( - m12, m22 );

			}

		} else if ( order === 'YZX' ) {

			this._z = Math.asin( clamp( m21, - 1, 1 ) );

			if ( Math.abs( m21 ) < 0.99999 ) {

				this._x = Math.atan2( - m23, m22 );
				this._y = Math.atan2( - m31, m11 );

			} else {

				this._x = 0;
				this._y = Math.atan2( m13, m33 );

			}

		} else if ( order === 'XZY' ) {

			this._z = Math.asin( - clamp( m12, - 1, 1 ) );

			if ( Math.abs( m12 ) < 0.99999 ) {

				this._x = Math.atan2( m32, m22 );
				this._y = Math.atan2( m13, m11 );

			} else {

				this._x = Math.atan2( - m23, m33 );
				this._y = 0;

			}

		} else {

			console.warn( 'THREE.Euler: .setFromRotationMatrix() given unsupported order: ' + order )

		}

		this._order = order;

		if ( update !== false ) this.onChangeCallback();

		return this;

	},

	setFromQuaternion: function () {

		var matrix;

		return function ( q, order, update ) {

			if ( matrix === undefined ) matrix = new THREE.Matrix4();
			matrix.makeRotationFromQuaternion( q );
			this.setFromRotationMatrix( matrix, order, update );

			return this;

		};

	}(),

	setFromVector3: function ( v, order ) {

		return this.set( v.x, v.y, v.z, order || this._order );

	},

	reorder: function () {

		// WARNING: this discards revolution information -bhouston

		var q = new THREE.Quaternion();

		return function ( newOrder ) {

			q.setFromEuler( this );
			this.setFromQuaternion( q, newOrder );

		};

	}(),

	equals: function ( euler ) {

		return ( euler._x === this._x ) && ( euler._y === this._y ) && ( euler._z === this._z ) && ( euler._order === this._order );

	},

	fromArray: function ( array ) {

		this._x = array[ 0 ];
		this._y = array[ 1 ];
		this._z = array[ 2 ];
		if ( array[ 3 ] !== undefined ) this._order = array[ 3 ];

		this.onChangeCallback();

		return this;

	},

	toArray: function () {

		return [ this._x, this._y, this._z, this._order ];

	},

	toVector3: function ( optionalResult ) {

		if ( optionalResult ) {

			return optionalResult.set( this._x, this._y, this._z );

		} else {

			return new THREE.Vector3( this._x, this._y, this._z );

		}

	},

	onChange: function ( callback ) {

		this.onChangeCallback = callback;

		return this;

	},

	onChangeCallback: function () {},

	clone: function () {

		return new THREE.Euler( this._x, this._y, this._z, this._order );

	}

};
/*** END Euler ***/
/*** START Math ***/
/**
 * @author alteredq / http://alteredqualia.com/
 * @author mrdoob / http://mrdoob.com/
 */

THREE.Math = {

	generateUUID: function () {

		// http://www.broofa.com/Tools/Math.uuid.htm

		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split( '' );
		var uuid = new Array( 36 );
		var rnd = 0, r;

		return function () {

			for ( var i = 0; i < 36; i ++ ) {

				if ( i == 8 || i == 13 || i == 18 || i == 23 ) {

					uuid[ i ] = '-';

				} else if ( i == 14 ) {

					uuid[ i ] = '4';

				} else {

					if ( rnd <= 0x02 ) rnd = 0x2000000 + ( Math.random() * 0x1000000 ) | 0;
					r = rnd & 0xf;
					rnd = rnd >> 4;
					uuid[ i ] = chars[ ( i == 19 ) ? ( r & 0x3 ) | 0x8 : r ];

				}
			}

			return uuid.join( '' );

		};

	}(),

	// Clamp value to range <a, b>

	clamp: function ( x, a, b ) {

		return ( x < a ) ? a : ( ( x > b ) ? b : x );

	},

	// Clamp value to range <a, inf)

	clampBottom: function ( x, a ) {

		return x < a ? a : x;

	},

	// Linear mapping from range <a1, a2> to range <b1, b2>

	mapLinear: function ( x, a1, a2, b1, b2 ) {

		return b1 + ( x - a1 ) * ( b2 - b1 ) / ( a2 - a1 );

	},

	// http://en.wikipedia.org/wiki/Smoothstep

	smoothstep: function ( x, min, max ) {

		if ( x <= min ) return 0;
		if ( x >= max ) return 1;

		x = ( x - min ) / ( max - min );

		return x * x * ( 3 - 2 * x );

	},

	smootherstep: function ( x, min, max ) {

		if ( x <= min ) return 0;
		if ( x >= max ) return 1;

		x = ( x - min ) / ( max - min );

		return x * x * x * ( x * ( x * 6 - 15 ) + 10 );

	},

	// Random float from <0, 1> with 16 bits of randomness
	// (standard Math.random() creates repetitive patterns when applied over larger space)

	random16: function () {

		return ( 65280 * Math.random() + 255 * Math.random() ) / 65535;

	},

	// Random integer from <low, high> interval

	randInt: function ( low, high ) {

		return Math.floor( this.randFloat( low, high ) );

	},

	// Random float from <low, high> interval

	randFloat: function ( low, high ) {

		return low + Math.random() * ( high - low );

	},

	// Random float from <-range/2, range/2> interval

	randFloatSpread: function ( range ) {

		return range * ( 0.5 - Math.random() );

	},

	degToRad: function () {

		var degreeToRadiansFactor = Math.PI / 180;

		return function ( degrees ) {

			return degrees * degreeToRadiansFactor;

		};

	}(),

	radToDeg: function () {

		var radianToDegreesFactor = 180 / Math.PI;

		return function ( radians ) {

			return radians * radianToDegreesFactor;

		};

	}(),

	isPowerOfTwo: function ( value ) {

		return ( value & ( value - 1 ) ) === 0 && value !== 0;

	},

	nextPowerOfTwo: function ( value ) {

		value --;
		value |= value >> 1;
		value |= value >> 2;
		value |= value >> 4;
		value |= value >> 8;
		value |= value >> 16;
		value ++;

		return value;
	}

};

/*** END Math ***/

}

module.exports = THREE;

},{}],17:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var ROTATE_SPEED = 0.5;
/**
 * Provides a quaternion responsible for pre-panning the scene before further
 * transformations due to device sensors.
 */
function TouchPanner() {
  window.addEventListener('touchstart', this.onTouchStart_.bind(this));
  window.addEventListener('touchmove', this.onTouchMove_.bind(this));
  window.addEventListener('touchend', this.onTouchEnd_.bind(this));

  this.isTouching = false;
  this.rotateStart = new THREE.Vector2();
  this.rotateEnd = new THREE.Vector2();
  this.rotateDelta = new THREE.Vector2();

  this.theta = 0;
  this.orientation = new THREE.Quaternion();
}

TouchPanner.prototype.getOrientation = function() {
  this.orientation.setFromEuler(new THREE.Euler(0, 0, this.theta));
  return this.orientation;
};

TouchPanner.prototype.resetSensor = function() {
  this.theta = 0;
};

TouchPanner.prototype.onTouchStart_ = function(e) {
  // Only respond if there is exactly one touch.
  if (e.touches.length != 1) {
    return;
  }
  this.rotateStart.set(e.touches[0].pageX, e.touches[0].pageY);
  this.isTouching = true;
};

TouchPanner.prototype.onTouchMove_ = function(e) {
  if (!this.isTouching) {
    return;
  }
  this.rotateEnd.set(e.touches[0].pageX, e.touches[0].pageY);
  this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
  this.rotateStart.copy(this.rotateEnd);

  var element = document.body;
  this.theta += 2 * Math.PI * this.rotateDelta.x / element.clientWidth * ROTATE_SPEED;
};

TouchPanner.prototype.onTouchEnd_ = function(e) {
  this.isTouching = false;
};

module.exports = TouchPanner;

},{}],18:[function(require,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Util = window.Util || {};

Util.MIN_TIMESTEP = 0.001;
Util.MAX_TIMESTEP = 1;

Util.clamp = function(value, min, max) {
  return Math.min(Math.max(min, value), max);
};

Util.isIOS = function() {
  return /iPad|iPhone|iPod/.test(navigator.platform);
};

// Helper method to validate the time steps of sensor timestamps.
Util.isTimestampDeltaValid = function(timestampDeltaS) {
  if (isNaN(timestampDeltaS)) {
    return false;
  }
  if (timestampDeltaS <= Util.MIN_TIMESTEP) {
    return false;
  }
  if (timestampDeltaS > Util.MAX_TIMESTEP) {
    return false;
  }
  return true;
}

module.exports = Util;

},{}]},{},[8])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbS9DYXJkYm9hcmRITURWUkRldmljZS5qcyIsImNtL0RPTVBvaW50LmpzIiwiY20vSE1EVlJEZXZpY2UuanMiLCJjbS9WUkRldmljZS5qcyIsImNtL1ZSRXllUGFyYW1ldGVycy5qcyIsImNtL1ZSRmllbGRPZlZpZXcuanMiLCJjbS9XZWJWUlBvbHlmaWxsLmpzIiwibWFpbi5qcyIsInNyYy9iYXNlLmpzIiwic3JjL2NvbXBsZW1lbnRhcnktZmlsdGVyLmpzIiwic3JjL2Z1c2lvbi1wb3NpdGlvbi1zZW5zb3ItdnItZGV2aWNlLmpzIiwic3JjL21vdXNlLWtleWJvYXJkLXBvc2l0aW9uLXNlbnNvci12ci1kZXZpY2UuanMiLCJzcmMvb3JpZW50YXRpb24tcG9zaXRpb24tc2Vuc29yLXZyLWRldmljZS5qcyIsInNyYy9wb3NlLXByZWRpY3Rvci5qcyIsInNyYy9zZW5zb3Itc2FtcGxlLmpzIiwic3JjL3RocmVlLW1hdGguanMiLCJzcmMvdG91Y2gtcGFubmVyLmpzIiwic3JjL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcnZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEhNRFZSRGV2aWNlID0gcmVxdWlyZSgnLi9ITURWUkRldmljZScpO1xuXG52YXIgREVGQVVMVF9GT1YgPSA5NjtcbnZhciBERUZBVUxUX0lOVEVSUFVQSUxMQVJZX0RJU1RBTkNFID0gMC4wNjtcbnZhciBERUZBVUxUX0RJU1RPUlRJT05fRkFDVE9SUyA9IHtcbiAgazE6IDAuNDExLFxuICBrMjogMC4xNTZcbn07XG5cblxudmFyIENhcmRib2FyZEhNRFZSRGV2aWNlID0gZnVuY3Rpb24oKXtcbiAgSE1EVlJEZXZpY2UuY2FsbCh0aGlzLCAnMScsICcxJywgJ3BvbHlmaWxsLmNhcmRib2FyZCcsIERFRkFVTFRfRk9WLCBERUZBVUxUX0lOVEVSUFVQSUxMQVJZX0RJU1RBTkNFLCBERUZBVUxUX0RJU1RPUlRJT05fRkFDVE9SUyk7XG59O1xuXG5DYXJkYm9hcmRITURWUkRldmljZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhNRFZSRGV2aWNlLnByb3RvdHlwZSk7XG5DYXJkYm9hcmRITURWUkRldmljZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDYXJkYm9hcmRITURWUkRldmljZTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkYm9hcmRITURWUkRldmljZTtcbiIsInZhciBET01Qb2ludCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICB0aGlzLnggPSB4O1xuICB0aGlzLnkgPSB5O1xuICB0aGlzLnogPSB6O1xuICB0aGlzLncgPSB3O1xufTtcblxuRE9NUG9pbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRE9NUG9pbnQ7XG5cbm1vZHVsZS5leHBvcnRzID0gRE9NUG9pbnQ7XG4iLCJ2YXIgVlJFeWVQYXJhbWV0ZXJzID0gcmVxdWlyZSgnLi9WUkV5ZVBhcmFtZXRlcnMnKTtcbnZhciBWUkRldmljZSA9IHJlcXVpcmUoJy4vVlJEZXZpY2UnKTtcblxudmFyIEhNRFZSRGV2aWNlID0gZnVuY3Rpb24oaGFyZHdhcmVVbml0SWQsIGRldmljZUlkLCBkZXZpY2VOYW1lLCBmb3YsIGludGVycHVwaWxsYXJ5RGlzdGFuY2UsIGxlbnNEaXN0b3J0aW9uRmFjdG9ycyl7XG4gIFZSRGV2aWNlLmNhbGwodGhpcywgaGFyZHdhcmVVbml0SWQsIGRldmljZUlkLCBkZXZpY2VOYW1lKTtcbiAgdGhpcy5fZm92ID1cbiAgdGhpcy5fZXllVHJhbnNsYXRpb25MZWZ0ID0gbmV3IFZSRXllUGFyYW1ldGVycyhmb3YsIGludGVycHVwaWxsYXJ5RGlzdGFuY2UgKiAtMC41KTtcbiAgdGhpcy5fZXllVHJhbnNsYXRpb25SaWdodCA9IG5ldyBWUkV5ZVBhcmFtZXRlcnMoZm92LCBpbnRlcnB1cGlsbGFyeURpc3RhbmNlICogMC41KTtcbiAgdGhpcy5fbGVuc0Rpc3RvcnRpb25GYWN0b3JzID0gbGVuc0Rpc3RvcnRpb25GYWN0b3JzO1xufTtcblxudmFyIHByb3RvID0gSE1EVlJEZXZpY2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShWUkRldmljZS5wcm90b3R5cGUpO1xuXG4vKipcbiAqIEBwYXJhbSB7bGVmdHxyaWdodH0gd2hpY2hFeWVcbiAqIEByZXR1cm5zIHt7cmVjb21tZW5kZWRGaWVsZE9mVmlldzogKiwgZXllVHJhbnNsYXRpb246ICp9fVxuICovXG5wcm90by5nZXRFeWVQYXJhbWV0ZXJzID0gZnVuY3Rpb24od2hpY2hFeWUpIHtcbiAgdmFyIGV5ZVRyYW5zbGF0aW9uO1xuICBpZiAod2hpY2hFeWUgPT0gJ2xlZnQnKSB7XG4gICAgZXllVHJhbnNsYXRpb24gPSB0aGlzLl9leWVUcmFuc2xhdGlvbkxlZnQ7XG4gIH0gZWxzZSBpZiAod2hpY2hFeWUgPT0gJ3JpZ2h0Jykge1xuICAgIGV5ZVRyYW5zbGF0aW9uID0gdGhpcy5fZXllVHJhbnNsYXRpb25SaWdodDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZXllIHByb3ZpZGVkOiAnICsgd2hpY2hFeWUpO1xuICB9XG4gIHJldHVybiBleWVUcmFuc2xhdGlvbjtcbn07XG5cbi8qKlxuICogQHJldHVybnMge3trMTogbnVtYmVyLCBrMjogbnVtYmVyfX1cbiAqL1xucHJvdG8uZ2V0TGVuc0Rpc3RvcnRpb25GYWN0b3JzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX2xlbnNEaXN0b3J0aW9uRmFjdG9ycztcbn07XG5cbnByb3RvLmNvbnN0cnVjdG9yID0gSE1EVlJEZXZpY2U7XG5cbm1vZHVsZS5leHBvcnRzID0gSE1EVlJEZXZpY2U7XG4iLCJ2YXIgVlJEZXZpY2UgPSBmdW5jdGlvbihoYXJkd2FyZVVuaXRJZCwgZGV2aWNlSWQsIGRldmljZU5hbWUpe1xuICB0aGlzLmhhcmR3YXJlVW5pdElkID0gaGFyZHdhcmVVbml0SWQ7XG4gIHRoaXMuZGV2aWNlSWQgPSBkZXZpY2VJZDtcbiAgdGhpcy5kZXZpY2VOYW1lID0gZGV2aWNlTmFtZTtcbn07XG5cblZSRGV2aWNlLnByb3RvdHlwZSA9IHt9O1xuVlJEZXZpY2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVlJEZXZpY2U7XG5cbm1vZHVsZS5leHBvcnRzID0gVlJEZXZpY2U7XG4iLCJ2YXIgVlJGaWVsZE9mVmlldyA9IHJlcXVpcmUoJy4vVlJGaWVsZE9mVmlldycpO1xudmFyIERPTVBvaW50ID0gcmVxdWlyZSgnLi9ET01Qb2ludCcpO1xuXG52YXIgVlJFeWVQYXJhbWV0ZXJzID0gZnVuY3Rpb24oZm92LCB0cmFuc2xhdGlvblgpe1xuICB0aGlzLl9mb3YgPSBuZXcgVlJGaWVsZE9mVmlldyhmb3YpO1xuICB0aGlzLl90cmFuc2xhdGlvbiA9IG5ldyBET01Qb2ludCh0cmFuc2xhdGlvblgsIDAsIDAsIDApO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoVlJFeWVQYXJhbWV0ZXJzLnByb3RvdHlwZSwge1xuICBtaW5pbXVtRmllbGRPZlZpZXc6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5fZm92O1xuICAgIH1cbiAgfSxcblxuICBtYXhpbXVtRmllbGRPZlZpZXc6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5fZm92O1xuICAgIH1cbiAgfSxcblxuICByZWNvbW1lbmRlZEZpZWxkT2ZWaWV3OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuX2ZvdjtcbiAgICB9XG4gIH0sXG5cbiAgY3VycmVudEZpZWxkT2ZWaWV3OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuX2ZvdjtcbiAgICB9XG4gIH0sXG5cbiAgZXllVHJhbnNsYXRpb246IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5fdHJhbnNsYXRpb247XG4gICAgfVxuICB9LFxuXG4gIHJlbmRlclJlY3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZC4nKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5WUkV5ZVBhcmFtZXRlcnMucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVlJFeWVQYXJhbWV0ZXJzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZSRXllUGFyYW1ldGVycztcbiIsInZhciBWUkZpZWxkT2ZWaWV3ID0gZnVuY3Rpb24oZm92KXtcbiAgdGhpcy51cERlZ3JlZXMgPSBmb3YvMjtcbiAgdGhpcy5yaWdodERlZ3JlZXMgPSBmb3YvMjtcbiAgdGhpcy5kb3duRGVncmVlcyA9IGZvdi8yO1xuICB0aGlzLmxlZnREZWdyZWVzID0gZm92LzI7XG59O1xuXG5WUkZpZWxkT2ZWaWV3LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZSRmllbGRPZlZpZXc7XG5cbm1vZHVsZS5leHBvcnRzID0gVlJGaWVsZE9mVmlldztcbiIsInZhciBWUkRldmljZSA9IHJlcXVpcmUoJy4vVlJEZXZpY2UnKTtcbnZhciBITURWUkRldmljZSA9IHJlcXVpcmUoJy4vSE1EVlJEZXZpY2UnKTtcbnZhciBDYXJkYm9hcmRITURWUkRldmljZSA9IHJlcXVpcmUoJy4vQ2FyZGJvYXJkSE1EVlJEZXZpY2UnKTtcblxudmFyIFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSByZXF1aXJlKCcuLi9zcmMvYmFzZScpLlBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG52YXIgT3JpZW50YXRpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi4vc3JjL29yaWVudGF0aW9uLXBvc2l0aW9uLXNlbnNvci12ci1kZXZpY2UnKTtcbnZhciBGdXNpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi4vc3JjL2Z1c2lvbi1wb3NpdGlvbi1zZW5zb3ItdnItZGV2aWNlJyk7XG52YXIgTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSByZXF1aXJlKCcuLi9zcmMvbW91c2Uta2V5Ym9hcmQtcG9zaXRpb24tc2Vuc29yLXZyLWRldmljZScpO1xuXG5cbndpbmRvdy5XZWJWUkNvbmZpZyA9IHtcbiAgLy8gRm9yY2VzIGF2YWlsYWJpbGl0eSBvZiBWUiBtb2RlLlxuICBGT1JDRV9FTkFCTEVfVlI6IGZhbHNlLCAvLyBEZWZhdWx0OiBmYWxzZS5cbiAgLy8gQ29tcGxlbWVudGFyeSBmaWx0ZXIgY29lZmZpY2llbnQuIDAgZm9yIGFjY2VsZXJvbWV0ZXIsIDEgZm9yIGd5cm8uXG4gIEtfRklMVEVSOiAwLjk4LCAvLyBEZWZhdWx0OiAwLjk4LlxuICAvLyBIb3cgZmFyIGludG8gdGhlIGZ1dHVyZSB0byBwcmVkaWN0IGR1cmluZyBmYXN0IG1vdGlvbi5cbiAgUFJFRElDVElPTl9USU1FX1M6IDAuMDUwLCAvLyBEZWZhdWx0OiAwLjA1MHMuXG59O1xuXG4vKipcbiAqIEBwYXJhbSB7VlJEZXZpY2V9IGRlZmF1bHREZXZpY2VcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1dlYlZSUG9seWZpbGx9XG4gKi9cbnZhciBXZWJWUlBvbHlmaWxsRXh0ZW5kZWQgPSBmdW5jdGlvbihkZWZhdWx0RGV2aWNlKSB7XG4gIHRoaXMuZGV2aWNlcyA9IFtdO1xuICB0aGlzLl9kZWZhdWx0RGV2aWNlID0gZGVmYXVsdERldmljZSB8fCBuZXcgQ2FyZGJvYXJkSE1EVlJEZXZpY2UoKTtcbiAgdGhpcy5lbmFibGVQb2x5ZmlsbCgpO1xufTtcblxuV2ViVlJQb2x5ZmlsbEV4dGVuZGVkLnByb3RvdHlwZSA9IHtcblxuICBlbmFibGVQb2x5ZmlsbDogZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9nZXRWUkRldmljZXNQcm9taXNlID0gdGhpcy5pc1dlYlZSQXZhaWxhYmxlKCkgPyBuYXZpZ2F0b3IuZ2V0VlJEZXZpY2VzKCkgOiBQcm9taXNlLnJlc29sdmUoW10pO1xuXG4gICAgLy8gUHJvdmlkZSBuYXZpZ2F0b3IuZ2V0VlJEZXZpY2VzLlxuICAgIG5hdmlnYXRvci5nZXRWUkRldmljZXMgPSB0aGlzLmdldFZSRGV2aWNlcy5iaW5kKHRoaXMpO1xuXG4gICAgLy8ga2VlcCBhIHJlZmVyZW5jZSBvZiBuYXRpdmUgVlJEZXZpY2UgY29uc3RydWN0b3JcbiAgICB0aGlzLl9uYXRpdmVDb25zdHJ1Y3RvcnMgPSB7XG4gICAgICBWUkRldmljZTogd2luZG93LlZSRGV2aWNlLFxuICAgICAgSE1EVlJEZXZpY2U6IHdpbmRvdy5ITURWUkRldmljZVxuICAgIH07XG5cbiAgICB3aW5kb3cuVlJEZXZpY2UgPSBWUkRldmljZTtcbiAgICB3aW5kb3cuSE1EVlJEZXZpY2UgPSBITURWUkRldmljZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1ZSRGV2aWNlfSBkZXZpY2VcbiAgICovXG4gIHNldERlZmF1bHREZXZpY2U6IGZ1bmN0aW9uKGRldmljZSkge1xuICAgIGlmICghKGRldmljZSBpbnN0YW5jZW9mIEhNRFZSRGV2aWNlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWZhdWx0IGRldmljZSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIEhNRFZSRGV2aWNlLicpO1xuICAgIH1cbiAgICB0aGlzLl9kZWZhdWx0RGV2aWNlID0gZGV2aWNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGdldFZSRGV2aWNlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFZSRGV2aWNlc1Byb21pc2UudGhlbih0aGlzLl9wcm9jZXNzVlJEZXZpY2VzLmJpbmQodGhpcykpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBWUkRldmljZVtdXG4gICAqL1xuICBfcHJvY2Vzc1ZSRGV2aWNlczogZnVuY3Rpb24obmF0aXZlRGV2aWNlcykge1xuXG4gICAgdmFyIGRldmljZUJ5VHlwZSA9IGZ1bmN0aW9uKGRldmljZUxpc3QsIEluc3RhbmNlVHlwZSkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGRldmljZUxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGRldmljZUxpc3RbaV0gaW5zdGFuY2VvZiBJbnN0YW5jZVR5cGUpIHtcbiAgICAgICAgICByZXR1cm4gZGV2aWNlTGlzdFtpXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZGV2aWNlSE1EVlIgPSB0aGlzLl9kZWZhdWx0RGV2aWNlO1xuXG4gICAgdmFyIGRldmljZVNlbnNvciA9IGRldmljZUJ5VHlwZShuYXRpdmVEZXZpY2VzLCB3aW5kb3cuUG9zaXRpb25TZW5zb3JWUkRldmljZSk7XG4gICAgaWYgKCFkZXZpY2VTZW5zb3IpIHtcbiAgICAgIC8vIG92ZXJyaWRlIHRoZSBuYXRpdmUgY29uc3RydWN0b3IgdG8gYWxsb3cgY2hlY2tzIHdpdGggYGluc3RhbmNlb2ZgXG4gICAgICB3aW5kb3cuUG9zaXRpb25TZW5zb3JWUkRldmljZSA9IFBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG4gICAgICBpZiAodGhpcy5faGFzRGV2aWNlTW90aW9uU3VwcG9ydCgpICYmIHRoaXMuX2hhc0RldmljZU9yaWVudGF0aW9uU3VwcG9ydCgpKSB7XG4gICAgICAgIGRldmljZVNlbnNvciA9IG5ldyBGdXNpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlKCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2hhc0RldmljZU9yaWVudGF0aW9uU3VwcG9ydCgpKSB7XG4gICAgICAgIGRldmljZVNlbnNvciA9IG5ldyBPcmllbnRhdGlvblBvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRldmljZVNlbnNvciA9IG5ldyBNb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmRldmljZXMgPSBbZGV2aWNlSE1EVlIsIGRldmljZVNlbnNvcl07XG4gICAgcmV0dXJuIHRoaXMuZGV2aWNlcztcbiAgfSxcblxuICBfaGFzRGV2aWNlT3JpZW50YXRpb25TdXBwb3J0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdHlwZW9mIHdpbmRvdy5vcmllbnRhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgISF3aW5kb3cuRGV2aWNlT3JpZW50YXRpb25FdmVudDtcbiAgfSxcblxuICBfaGFzRGV2aWNlTW90aW9uU3VwcG9ydDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICEhd2luZG93LkRldmljZU1vdGlvbkV2ZW50O1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzV2ViVlJBdmFpbGFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoJ2dldFZSRGV2aWNlcycgaW4gbmF2aWdhdG9yKSB8fCAoJ21vekdldFZSRGV2aWNlcycgaW4gbmF2aWdhdG9yKTtcbiAgfVxufTtcblxuXG5XZWJWUlBvbHlmaWxsRXh0ZW5kZWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gV2ViVlJQb2x5ZmlsbEV4dGVuZGVkO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gV2ViVlJQb2x5ZmlsbEV4dGVuZGVkO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLy8gQ006IG11c3QgY3JlYXRlIG91ciBvd24gcG9seWZpbGwgaW5zdGFuY2Vcbi8vdmFyIFdlYlZSUG9seWZpbGwgPSByZXF1aXJlKCcuL3dlYnZyLXBvbHlmaWxsLmpzJyk7XG4vL1xuLy8gbmV3IFdlYlZSUG9seWZpbGwoKTtcblxuXG52YXIgV2ViVlJQb2x5ZmlsbCA9IHJlcXVpcmUoJy4vY20vV2ViVlJQb2x5ZmlsbCcpO1xud2luZG93LlZSID0gd2luZG93LlZSIHx8IHt9O1xud2luZG93LlZSLndlYlZSUG9seWZpbGwgPSBuZXcgV2ViVlJQb2x5ZmlsbCgpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLyoqXG4gKiBUaGUgYmFzZSBjbGFzcyBmb3IgYWxsIFZSIGRldmljZXMuXG4gKi9cbmZ1bmN0aW9uIFZSRGV2aWNlKCkge1xuICB0aGlzLmhhcmR3YXJlVW5pdElkID0gJ3dlYnZyLXBvbHlmaWxsIGhhcmR3YXJlVW5pdElkJztcbiAgdGhpcy5kZXZpY2VJZCA9ICd3ZWJ2ci1wb2x5ZmlsbCBkZXZpY2VJZCc7XG4gIHRoaXMuZGV2aWNlTmFtZSA9ICd3ZWJ2ci1wb2x5ZmlsbCBkZXZpY2VOYW1lJztcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBjbGFzcyBmb3IgYWxsIFZSIEhNRCBkZXZpY2VzLlxuICovXG5mdW5jdGlvbiBITURWUkRldmljZSgpIHtcbn1cbkhNRFZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBWUkRldmljZSgpO1xuXG4vKipcbiAqIFRoZSBiYXNlIGNsYXNzIGZvciBhbGwgVlIgcG9zaXRpb24gc2Vuc29yIGRldmljZXMuXG4gKi9cbmZ1bmN0aW9uIFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKSB7XG59XG5Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBWUkRldmljZSgpO1xuXG5tb2R1bGUuZXhwb3J0cy5WUkRldmljZSA9IFZSRGV2aWNlO1xubW9kdWxlLmV4cG9ydHMuSE1EVlJEZXZpY2UgPSBITURWUkRldmljZTtcbm1vZHVsZS5leHBvcnRzLlBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSBQb3NpdGlvblNlbnNvclZSRGV2aWNlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLyoqXG4gKiBUT0RPOiBGaXggdXAgYWxsIFwibmV3IFRIUkVFXCIgaW5zdGFudGlhdGlvbnMgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZS5cbiAqL1xudmFyIFNlbnNvclNhbXBsZSA9IHJlcXVpcmUoJy4vc2Vuc29yLXNhbXBsZS5qcycpO1xudmFyIFRIUkVFID0gcmVxdWlyZSgnLi90aHJlZS1tYXRoLmpzJyk7XG52YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG52YXIgREVCVUcgPSBmYWxzZTtcblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiBhIHNpbXBsZSBjb21wbGVtZW50YXJ5IGZpbHRlciwgd2hpY2ggZnVzZXMgZ3lyb3Njb3BlIGFuZFxuICogYWNjZWxlcm9tZXRlciBkYXRhIGZyb20gdGhlICdkZXZpY2Vtb3Rpb24nIGV2ZW50LlxuICpcbiAqIEFjY2VsZXJvbWV0ZXIgZGF0YSBpcyB2ZXJ5IG5vaXN5LCBidXQgc3RhYmxlIG92ZXIgdGhlIGxvbmcgdGVybS5cbiAqIEd5cm9zY29wZSBkYXRhIGlzIHNtb290aCwgYnV0IHRlbmRzIHRvIGRyaWZ0IG92ZXIgdGhlIGxvbmcgdGVybS5cbiAqXG4gKiBUaGlzIGZ1c2lvbiBpcyByZWxhdGl2ZWx5IHNpbXBsZTpcbiAqIDEuIEdldCBvcmllbnRhdGlvbiBlc3RpbWF0ZXMgZnJvbSBhY2NlbGVyb21ldGVyIGJ5IGFwcGx5aW5nIGEgbG93LXBhc3MgZmlsdGVyXG4gKiAgICBvbiB0aGF0IGRhdGEuXG4gKiAyLiBHZXQgb3JpZW50YXRpb24gZXN0aW1hdGVzIGZyb20gZ3lyb3Njb3BlIGJ5IGludGVncmF0aW5nIG92ZXIgdGltZS5cbiAqIDMuIENvbWJpbmUgdGhlIHR3byBlc3RpbWF0ZXMsIHdlaWdoaW5nICgxKSBpbiB0aGUgbG9uZyB0ZXJtLCBidXQgKDIpIGZvciB0aGVcbiAqICAgIHNob3J0IHRlcm0uXG4gKi9cbmZ1bmN0aW9uIENvbXBsZW1lbnRhcnlGaWx0ZXIoa0ZpbHRlcikge1xuICB0aGlzLmtGaWx0ZXIgPSBrRmlsdGVyO1xuXG4gIC8vIFJhdyBzZW5zb3IgbWVhc3VyZW1lbnRzLlxuICB0aGlzLmN1cnJlbnRBY2NlbE1lYXN1cmVtZW50ID0gbmV3IFNlbnNvclNhbXBsZSgpO1xuICB0aGlzLmN1cnJlbnRHeXJvTWVhc3VyZW1lbnQgPSBuZXcgU2Vuc29yU2FtcGxlKCk7XG4gIHRoaXMucHJldmlvdXNHeXJvTWVhc3VyZW1lbnQgPSBuZXcgU2Vuc29yU2FtcGxlKCk7XG5cbiAgLy8gQ3VycmVudCBmaWx0ZXIgb3JpZW50YXRpb25cbiAgdGhpcy5maWx0ZXJRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgdGhpcy5wcmV2aW91c0ZpbHRlclEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXG4gIC8vIE9yaWVudGF0aW9uIGJhc2VkIG9uIHRoZSBhY2NlbGVyb21ldGVyLlxuICB0aGlzLmFjY2VsUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIC8vIFdoZXRoZXIgb3Igbm90IHRoZSBvcmllbnRhdGlvbiBoYXMgYmVlbiBpbml0aWFsaXplZC5cbiAgdGhpcy5pc09yaWVudGF0aW9uSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgLy8gUnVubmluZyBlc3RpbWF0ZSBvZiBncmF2aXR5IGJhc2VkIG9uIHRoZSBjdXJyZW50IG9yaWVudGF0aW9uLlxuICB0aGlzLmVzdGltYXRlZEdyYXZpdHkgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICAvLyBNZWFzdXJlZCBncmF2aXR5IGJhc2VkIG9uIGFjY2VsZXJvbWV0ZXIuXG4gIHRoaXMubWVhc3VyZWRHcmF2aXR5ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuICAvLyBEZWJ1ZyBvbmx5IHF1YXRlcm5pb24gb2YgZ3lyby1iYXNlZCBvcmllbnRhdGlvbi5cbiAgdGhpcy5neXJvSW50ZWdyYWxRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbn1cblxuQ29tcGxlbWVudGFyeUZpbHRlci5wcm90b3R5cGUuYWRkQWNjZWxNZWFzdXJlbWVudCA9IGZ1bmN0aW9uKHZlY3RvciwgdGltZXN0YW1wUykge1xuICB0aGlzLmN1cnJlbnRBY2NlbE1lYXN1cmVtZW50LnNldCh2ZWN0b3IsIHRpbWVzdGFtcFMpO1xufTtcblxuQ29tcGxlbWVudGFyeUZpbHRlci5wcm90b3R5cGUuYWRkR3lyb01lYXN1cmVtZW50ID0gZnVuY3Rpb24odmVjdG9yLCB0aW1lc3RhbXBTKSB7XG4gIHRoaXMuY3VycmVudEd5cm9NZWFzdXJlbWVudC5zZXQodmVjdG9yLCB0aW1lc3RhbXBTKTtcblxuICB2YXIgZGVsdGFUID0gdGltZXN0YW1wUyAtIHRoaXMucHJldmlvdXNHeXJvTWVhc3VyZW1lbnQudGltZXN0YW1wUztcbiAgaWYgKFV0aWwuaXNUaW1lc3RhbXBEZWx0YVZhbGlkKGRlbHRhVCkpIHtcbiAgICB0aGlzLnJ1bl8oKTtcbiAgfVxuICBcbiAgdGhpcy5wcmV2aW91c0d5cm9NZWFzdXJlbWVudC5jb3B5KHRoaXMuY3VycmVudEd5cm9NZWFzdXJlbWVudCk7XG59O1xuXG5Db21wbGVtZW50YXJ5RmlsdGVyLnByb3RvdHlwZS5ydW5fID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuYWNjZWxRID0gdGhpcy5hY2NlbFRvUXVhdGVybmlvbl8odGhpcy5jdXJyZW50QWNjZWxNZWFzdXJlbWVudC5zYW1wbGUpO1xuXG4gIGlmICghdGhpcy5pc09yaWVudGF0aW9uSW5pdGlhbGl6ZWQpIHtcbiAgICB0aGlzLnByZXZpb3VzRmlsdGVyUS5jb3B5KHRoaXMuYWNjZWxRKTtcbiAgICB0aGlzLmlzT3JpZW50YXRpb25Jbml0aWFsaXplZCA9IHRydWU7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGRlbHRhVCA9IHRoaXMuY3VycmVudEd5cm9NZWFzdXJlbWVudC50aW1lc3RhbXBTIC1cbiAgICAgIHRoaXMucHJldmlvdXNHeXJvTWVhc3VyZW1lbnQudGltZXN0YW1wUztcblxuICAvLyBDb252ZXJ0IGd5cm8gcm90YXRpb24gdmVjdG9yIHRvIGEgcXVhdGVybmlvbiBkZWx0YS5cbiAgdmFyIGd5cm9EZWx0YVEgPSB0aGlzLmd5cm9Ub1F1YXRlcm5pb25EZWx0YV8odGhpcy5jdXJyZW50R3lyb01lYXN1cmVtZW50LnNhbXBsZSwgZGVsdGFUKTtcbiAgdGhpcy5neXJvSW50ZWdyYWxRLm11bHRpcGx5KGd5cm9EZWx0YVEpO1xuXG4gIC8vIGZpbHRlcl8xID0gSyAqIChmaWx0ZXJfMCArIGd5cm8gKiBkVCkgKyAoMSAtIEspICogYWNjZWwuXG4gIHRoaXMuZmlsdGVyUS5jb3B5KHRoaXMucHJldmlvdXNGaWx0ZXJRKTtcbiAgdGhpcy5maWx0ZXJRLm11bHRpcGx5KGd5cm9EZWx0YVEpO1xuXG4gIC8vIENhbGN1bGF0ZSB0aGUgZGVsdGEgYmV0d2VlbiB0aGUgY3VycmVudCBlc3RpbWF0ZWQgZ3Jhdml0eSBhbmQgdGhlIHJlYWxcbiAgLy8gZ3Jhdml0eSB2ZWN0b3IgZnJvbSBhY2NlbGVyb21ldGVyLlxuICB2YXIgaW52RmlsdGVyUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIGludkZpbHRlclEuY29weSh0aGlzLmZpbHRlclEpO1xuICBpbnZGaWx0ZXJRLmludmVyc2UoKTtcblxuICB0aGlzLmVzdGltYXRlZEdyYXZpdHkuc2V0KDAsIDAsIC0xKTtcbiAgdGhpcy5lc3RpbWF0ZWRHcmF2aXR5LmFwcGx5UXVhdGVybmlvbihpbnZGaWx0ZXJRKTtcbiAgdGhpcy5lc3RpbWF0ZWRHcmF2aXR5Lm5vcm1hbGl6ZSgpO1xuXG4gIHRoaXMubWVhc3VyZWRHcmF2aXR5LmNvcHkodGhpcy5jdXJyZW50QWNjZWxNZWFzdXJlbWVudC5zYW1wbGUpO1xuICB0aGlzLm1lYXN1cmVkR3Jhdml0eS5ub3JtYWxpemUoKTtcblxuICAvLyBDb21wYXJlIGVzdGltYXRlZCBncmF2aXR5IHdpdGggbWVhc3VyZWQgZ3Jhdml0eSwgZ2V0IHRoZSBkZWx0YSBxdWF0ZXJuaW9uXG4gIC8vIGJldHdlZW4gdGhlIHR3by5cbiAgdmFyIGRlbHRhUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIGRlbHRhUS5zZXRGcm9tVW5pdFZlY3RvcnModGhpcy5lc3RpbWF0ZWRHcmF2aXR5LCB0aGlzLm1lYXN1cmVkR3Jhdml0eSk7XG4gIGRlbHRhUS5pbnZlcnNlKCk7XG5cbiAgaWYgKERFQlVHKSB7XG4gICAgY29uc29sZS5sb2coJ0RlbHRhOiAlZCBkZWcsIEdfZXN0OiAoJXMsICVzLCAlcyksIEdfbWVhczogKCVzLCAlcywgJXMpJyxcbiAgICAgICAgICAgICAgICBUSFJFRS5NYXRoLnJhZFRvRGVnKFV0aWwuZ2V0UXVhdGVybmlvbkFuZ2xlKGRlbHRhUSkpLFxuICAgICAgICAgICAgICAgICh0aGlzLmVzdGltYXRlZEdyYXZpdHkueCkudG9GaXhlZCgxKSxcbiAgICAgICAgICAgICAgICAodGhpcy5lc3RpbWF0ZWRHcmF2aXR5LnkpLnRvRml4ZWQoMSksXG4gICAgICAgICAgICAgICAgKHRoaXMuZXN0aW1hdGVkR3Jhdml0eS56KS50b0ZpeGVkKDEpLFxuICAgICAgICAgICAgICAgICh0aGlzLm1lYXN1cmVkR3Jhdml0eS54KS50b0ZpeGVkKDEpLFxuICAgICAgICAgICAgICAgICh0aGlzLm1lYXN1cmVkR3Jhdml0eS55KS50b0ZpeGVkKDEpLFxuICAgICAgICAgICAgICAgICh0aGlzLm1lYXN1cmVkR3Jhdml0eS56KS50b0ZpeGVkKDEpKTtcbiAgfVxuXG4gIC8vIENhbGN1bGF0ZSB0aGUgU0xFUlAgdGFyZ2V0OiBjdXJyZW50IG9yaWVudGF0aW9uIHBsdXMgdGhlIG1lYXN1cmVkLWVzdGltYXRlZFxuICAvLyBxdWF0ZXJuaW9uIGRlbHRhLlxuICB2YXIgdGFyZ2V0USA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRhcmdldFEuY29weSh0aGlzLmZpbHRlclEpO1xuICB0YXJnZXRRLm11bHRpcGx5KGRlbHRhUSk7XG5cbiAgLy8gU0xFUlAgZmFjdG9yOiAwIGlzIHB1cmUgZ3lybywgMSBpcyBwdXJlIGFjY2VsLlxuICB0aGlzLmZpbHRlclEuc2xlcnAodGFyZ2V0USwgMSAtIHRoaXMua0ZpbHRlcik7XG5cbiAgdGhpcy5wcmV2aW91c0ZpbHRlclEuY29weSh0aGlzLmZpbHRlclEpO1xufTtcblxuQ29tcGxlbWVudGFyeUZpbHRlci5wcm90b3R5cGUuZ2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmlsdGVyUTtcbn07XG5cbkNvbXBsZW1lbnRhcnlGaWx0ZXIucHJvdG90eXBlLmFjY2VsVG9RdWF0ZXJuaW9uXyA9IGZ1bmN0aW9uKGFjY2VsKSB7XG4gIHZhciBub3JtQWNjZWwgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBub3JtQWNjZWwuY29weShhY2NlbCk7XG4gIG5vcm1BY2NlbC5ub3JtYWxpemUoKTtcbiAgdmFyIHF1YXQgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICBxdWF0LnNldEZyb21Vbml0VmVjdG9ycyhuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAtMSksIG5vcm1BY2NlbCk7XG4gIHJldHVybiBxdWF0O1xufTtcblxuQ29tcGxlbWVudGFyeUZpbHRlci5wcm90b3R5cGUuZ3lyb1RvUXVhdGVybmlvbkRlbHRhXyA9IGZ1bmN0aW9uKGd5cm8sIGR0KSB7XG4gIC8vIEV4dHJhY3QgYXhpcyBhbmQgYW5nbGUgZnJvbSB0aGUgZ3lyb3Njb3BlIGRhdGEuXG4gIHZhciBxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgdmFyIGF4aXMgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBheGlzLmNvcHkoZ3lybyk7XG4gIGF4aXMubm9ybWFsaXplKCk7XG4gIHF1YXQuc2V0RnJvbUF4aXNBbmdsZShheGlzLCBneXJvLmxlbmd0aCgpICogZHQpO1xuICByZXR1cm4gcXVhdDtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDb21wbGVtZW50YXJ5RmlsdGVyO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbnZhciBQb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi9iYXNlLmpzJykuUG9zaXRpb25TZW5zb3JWUkRldmljZTtcblxudmFyIENvbXBsZW1lbnRhcnlGaWx0ZXIgPSByZXF1aXJlKCcuL2NvbXBsZW1lbnRhcnktZmlsdGVyLmpzJyk7XG52YXIgUG9zZVByZWRpY3RvciA9IHJlcXVpcmUoJy4vcG9zZS1wcmVkaWN0b3IuanMnKTtcbnZhciBUb3VjaFBhbm5lciA9IHJlcXVpcmUoJy4vdG91Y2gtcGFubmVyLmpzJyk7XG52YXIgVEhSRUUgPSByZXF1aXJlKCcuL3RocmVlLW1hdGguanMnKTtcbnZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsLmpzJyk7XG5cbi8qKlxuICogVGhlIHBvc2l0aW9uYWwgc2Vuc29yLCBpbXBsZW1lbnRlZCB1c2luZyBEZXZpY2VNb3Rpb24gQVBJcy5cbiAqL1xuZnVuY3Rpb24gRnVzaW9uUG9zaXRpb25TZW5zb3JWUkRldmljZSgpIHtcbiAgdGhpcy5kZXZpY2VJZCA9ICd3ZWJ2ci1wb2x5ZmlsbDpmdXNlZCc7XG4gIHRoaXMuZGV2aWNlTmFtZSA9ICdWUiBQb3NpdGlvbiBEZXZpY2UgKHdlYnZyLXBvbHlmaWxsOmZ1c2VkKSc7XG5cbiAgdGhpcy5hY2NlbGVyb21ldGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgdGhpcy5neXJvc2NvcGUgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2Vtb3Rpb24nLCB0aGlzLm9uRGV2aWNlTW90aW9uQ2hhbmdlXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vblNjcmVlbk9yaWVudGF0aW9uQ2hhbmdlXy5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmZpbHRlciA9IG5ldyBDb21wbGVtZW50YXJ5RmlsdGVyKFdlYlZSQ29uZmlnLktfRklMVEVSIHx8IDAuOTgpO1xuICB0aGlzLnBvc2VQcmVkaWN0b3IgPSBuZXcgUG9zZVByZWRpY3RvcihXZWJWUkNvbmZpZy5QUkVESUNUSU9OX1RJTUVfUyB8fCAwLjA1MCk7XG4gIHRoaXMudG91Y2hQYW5uZXIgPSBuZXcgVG91Y2hQYW5uZXIoKTtcblxuICB0aGlzLmZpbHRlclRvV29ybGRRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICAvLyBTZXQgdGhlIGZpbHRlciB0byB3b3JsZCB0cmFuc2Zvcm0sIGRlcGVuZGluZyBvbiBPUy5cbiAgaWYgKFV0aWwuaXNJT1MoKSkge1xuICAgIHRoaXMuZmlsdGVyVG9Xb3JsZFEuc2V0RnJvbUF4aXNBbmdsZShuZXcgVEhSRUUuVmVjdG9yMygxLCAwLCAwKSwgTWF0aC5QSS8yKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmZpbHRlclRvV29ybGRRLnNldEZyb21BeGlzQW5nbGUobmV3IFRIUkVFLlZlY3RvcjMoMSwgMCwgMCksIC1NYXRoLlBJLzIpO1xuICB9XG5cbiAgdGhpcy53b3JsZFRvU2NyZWVuUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMuc2V0U2NyZWVuVHJhbnNmb3JtXygpO1xuXG4gIC8vIEtlZXAgdHJhY2sgb2YgYSByZXNldCB0cmFuc2Zvcm0gZm9yIHJlc2V0U2Vuc29yLlxuICB0aGlzLnJlc2V0USA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG59XG5GdXNpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBQb3NpdGlvblNlbnNvclZSRGV2aWNlKCk7XG5cbi8qKlxuICogUmV0dXJucyB7b3JpZW50YXRpb246IHt4LHkseix3fSwgcG9zaXRpb246IG51bGx9LlxuICogUG9zaXRpb24gaXMgbm90IHN1cHBvcnRlZCBzaW5jZSB3ZSBjYW4ndCBkbyA2RE9GLlxuICovXG5GdXNpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5nZXRTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIGhhc09yaWVudGF0aW9uOiB0cnVlLFxuICAgIG9yaWVudGF0aW9uOiB0aGlzLmdldE9yaWVudGF0aW9uKCksXG4gICAgaGFzUG9zaXRpb246IGZhbHNlLFxuICAgIHBvc2l0aW9uOiBudWxsXG4gIH1cbn07XG5cbkZ1c2lvblBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmdldE9yaWVudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gIC8vIENvbnZlcnQgZnJvbSBmaWx0ZXIgc3BhY2UgdG8gdGhlIHRoZSBzYW1lIHN5c3RlbSB1c2VkIGJ5IHRoZVxuICAvLyBkZXZpY2VvcmllbnRhdGlvbiBldmVudC5cbiAgdmFyIG9yaWVudGF0aW9uID0gdGhpcy5maWx0ZXIuZ2V0T3JpZW50YXRpb24oKTtcblxuICAvLyBQcmVkaWN0IG9yaWVudGF0aW9uLlxuICB0aGlzLnByZWRpY3RlZFEgPSB0aGlzLnBvc2VQcmVkaWN0b3IuZ2V0UHJlZGljdGlvbihvcmllbnRhdGlvbiwgdGhpcy5neXJvc2NvcGUsIHRoaXMucHJldmlvdXNUaW1lc3RhbXBTKTtcblxuICAvLyBDb252ZXJ0IHRvIFRIUkVFIGNvb3JkaW5hdGUgc3lzdGVtOiAtWiBmb3J3YXJkLCBZIHVwLCBYIHJpZ2h0LlxuICB2YXIgb3V0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgb3V0LmNvcHkodGhpcy5maWx0ZXJUb1dvcmxkUSk7XG4gIG91dC5tdWx0aXBseSh0aGlzLnJlc2V0USk7XG4gIG91dC5tdWx0aXBseSh0aGlzLnRvdWNoUGFubmVyLmdldE9yaWVudGF0aW9uKCkpO1xuICBvdXQubXVsdGlwbHkodGhpcy5wcmVkaWN0ZWRRKTtcbiAgb3V0Lm11bHRpcGx5KHRoaXMud29ybGRUb1NjcmVlblEpO1xuICByZXR1cm4gb3V0O1xufTtcblxuRnVzaW9uUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUucmVzZXRTZW5zb3IgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGV1bGVyID0gbmV3IFRIUkVFLkV1bGVyKCk7XG4gIGV1bGVyLnNldEZyb21RdWF0ZXJuaW9uKHRoaXMuZmlsdGVyLmdldE9yaWVudGF0aW9uKCkpO1xuICB2YXIgeWF3ID0gZXVsZXIueTtcbiAgY29uc29sZS5sb2coJ3Jlc2V0U2Vuc29yIHdpdGggeWF3OiAlZicsIHlhdyk7XG4gIHRoaXMucmVzZXRRLnNldEZyb21BeGlzQW5nbGUobmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSksIC15YXcpO1xuICB0aGlzLnRvdWNoUGFubmVyLnJlc2V0U2Vuc29yKCk7XG59O1xuXG5GdXNpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbkRldmljZU1vdGlvbkNoYW5nZV8gPSBmdW5jdGlvbihkZXZpY2VNb3Rpb24pIHtcbiAgdmFyIGFjY0dyYXZpdHkgPSBkZXZpY2VNb3Rpb24uYWNjZWxlcmF0aW9uSW5jbHVkaW5nR3Jhdml0eTtcbiAgdmFyIHJvdFJhdGUgPSBkZXZpY2VNb3Rpb24ucm90YXRpb25SYXRlO1xuICB2YXIgdGltZXN0YW1wUyA9IGRldmljZU1vdGlvbi50aW1lU3RhbXAgLyAxMDAwO1xuXG4gIHZhciBkZWx0YVMgPSB0aW1lc3RhbXBTIC0gdGhpcy5wcmV2aW91c1RpbWVzdGFtcFM7XG4gIGlmIChkZWx0YVMgPD0gVXRpbC5NSU5fVElNRVNURVAgfHwgZGVsdGFTID4gVXRpbC5NQVhfVElNRVNURVApIHtcbiAgICBjb25zb2xlLndhcm4oJ0ludmFsaWQgdGltZXN0YW1wcyBkZXRlY3RlZC4gVGltZSBzdGVwIGJldHdlZW4gc3VjY2Vzc2l2ZSAnICtcbiAgICAgICAgICAgICAgICAgJ2d5cm9zY29wZSBzZW5zb3Igc2FtcGxlcyBpcyB2ZXJ5IHNtYWxsIG9yIG5vdCBtb25vdG9uaWMnKTtcbiAgICB0aGlzLnByZXZpb3VzVGltZXN0YW1wUyA9IHRpbWVzdGFtcFM7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuYWNjZWxlcm9tZXRlci5zZXQoLWFjY0dyYXZpdHkueCwgLWFjY0dyYXZpdHkueSwgLWFjY0dyYXZpdHkueik7XG4gIHRoaXMuZ3lyb3Njb3BlLnNldChyb3RSYXRlLmFscGhhLCByb3RSYXRlLmJldGEsIHJvdFJhdGUuZ2FtbWEpO1xuXG4gIC8vIEluIGlPUywgcm90YXRpb25SYXRlIGlzIHJlcG9ydGVkIGluIGRlZ3JlZXMsIHNvIHdlIGZpcnN0IGNvbnZlcnQgdG9cbiAgLy8gcmFkaWFucy5cbiAgaWYgKFV0aWwuaXNJT1MoKSkge1xuICAgIHRoaXMuZ3lyb3Njb3BlLm11bHRpcGx5U2NhbGFyKE1hdGguUEkgLyAxODApO1xuICB9XG5cbiAgdGhpcy5maWx0ZXIuYWRkQWNjZWxNZWFzdXJlbWVudCh0aGlzLmFjY2VsZXJvbWV0ZXIsIHRpbWVzdGFtcFMpO1xuICB0aGlzLmZpbHRlci5hZGRHeXJvTWVhc3VyZW1lbnQodGhpcy5neXJvc2NvcGUsIHRpbWVzdGFtcFMpO1xuXG4gIHRoaXMucHJldmlvdXNUaW1lc3RhbXBTID0gdGltZXN0YW1wUztcbn07XG5cbkZ1c2lvblBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uU2NyZWVuT3JpZW50YXRpb25DaGFuZ2VfID1cbiAgICBmdW5jdGlvbihzY3JlZW5PcmllbnRhdGlvbikge1xuICB0aGlzLnNldFNjcmVlblRyYW5zZm9ybV8oKTtcbn07XG5cbkZ1c2lvblBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLnNldFNjcmVlblRyYW5zZm9ybV8gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy53b3JsZFRvU2NyZWVuUS5zZXQoMCwgMCwgMCwgMSk7XG4gIHN3aXRjaCAod2luZG93Lm9yaWVudGF0aW9uKSB7XG4gICAgY2FzZSAwOlxuICAgICAgYnJlYWs7XG4gICAgY2FzZSA5MDpcbiAgICAgIHRoaXMud29ybGRUb1NjcmVlblEuc2V0RnJvbUF4aXNBbmdsZShuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAxKSwgLU1hdGguUEkvMik7XG4gICAgICBicmVhaztcbiAgICBjYXNlIC05MDogXG4gICAgICB0aGlzLndvcmxkVG9TY3JlZW5RLnNldEZyb21BeGlzQW5nbGUobmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgMSksIE1hdGguUEkvMik7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE4MDpcbiAgICAgIC8vIFRPRE8uXG4gICAgICBicmVhaztcbiAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEZ1c2lvblBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xudmFyIFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSByZXF1aXJlKCcuL2Jhc2UuanMnKS5Qb3NpdGlvblNlbnNvclZSRGV2aWNlO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwuanMnKTtcblxuLy8gSG93IG11Y2ggdG8gcm90YXRlIHBlciBrZXkgc3Ryb2tlLlxudmFyIEtFWV9TUEVFRCA9IDAuMTU7XG52YXIgS0VZX0FOSU1BVElPTl9EVVJBVElPTiA9IDgwO1xuXG4vLyBIb3cgbXVjaCB0byByb3RhdGUgZm9yIG1vdXNlIGV2ZW50cy5cbnZhciBNT1VTRV9TUEVFRF9YID0gMC41O1xudmFyIE1PVVNFX1NQRUVEX1kgPSAwLjM7XG5cbi8qKlxuICogQSB2aXJ0dWFsIHBvc2l0aW9uIHNlbnNvciwgaW1wbGVtZW50ZWQgdXNpbmcga2V5Ym9hcmQgYW5kXG4gKiBtb3VzZSBBUElzLiBUaGlzIGlzIGRlc2lnbmVkIGFzIGZvciBkZXNrdG9wcy9sYXB0b3BzIHdoZXJlIG5vIERldmljZSpcbiAqIGV2ZW50cyB3b3JrLlxuICovXG5mdW5jdGlvbiBNb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZSgpIHtcbiAgdGhpcy5kZXZpY2VJZCA9ICd3ZWJ2ci1wb2x5ZmlsbDptb3VzZS1rZXlib2FyZCc7XG4gIHRoaXMuZGV2aWNlTmFtZSA9ICdWUiBQb3NpdGlvbiBEZXZpY2UgKHdlYnZyLXBvbHlmaWxsOm1vdXNlLWtleWJvYXJkKSc7XG5cbiAgLy8gQXR0YWNoIHRvIG1vdXNlIGFuZCBrZXlib2FyZCBldmVudHMuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgdGhpcy5vbktleURvd25fLmJpbmQodGhpcykpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5vbk1vdXNlTW92ZV8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLm9uTW91c2VEb3duXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLm9uTW91c2VVcF8uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5waGkgPSAwO1xuICB0aGlzLnRoZXRhID0gMDtcblxuICAvLyBWYXJpYWJsZXMgZm9yIGtleWJvYXJkLWJhc2VkIHJvdGF0aW9uIGFuaW1hdGlvbi5cbiAgdGhpcy50YXJnZXRBbmdsZSA9IG51bGw7XG5cbiAgLy8gU3RhdGUgdmFyaWFibGVzIGZvciBjYWxjdWxhdGlvbnMuXG4gIHRoaXMuZXVsZXIgPSBuZXcgVEhSRUUuRXVsZXIoKTtcbiAgdGhpcy5vcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cbiAgLy8gVmFyaWFibGVzIGZvciBtb3VzZS1iYXNlZCByb3RhdGlvbi5cbiAgdGhpcy5yb3RhdGVTdGFydCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gIHRoaXMucm90YXRlRW5kID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgdGhpcy5yb3RhdGVEZWx0YSA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG59XG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUgPSBuZXcgUG9zaXRpb25TZW5zb3JWUkRldmljZSgpO1xuXG4vKipcbiAqIFJldHVybnMge29yaWVudGF0aW9uOiB7eCx5LHosd30sIHBvc2l0aW9uOiBudWxsfS5cbiAqIFBvc2l0aW9uIGlzIG5vdCBzdXBwb3J0ZWQgZm9yIHBhcml0eSB3aXRoIG90aGVyIFBvc2l0aW9uU2Vuc29ycy5cbiAqL1xuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZXVsZXIuc2V0KHRoaXMucGhpLCB0aGlzLnRoZXRhLCAwLCAnWVhaJyk7XG4gIHRoaXMub3JpZW50YXRpb24uc2V0RnJvbUV1bGVyKHRoaXMuZXVsZXIpO1xuXG4gIHJldHVybiB7XG4gICAgaGFzT3JpZW50YXRpb246IHRydWUsXG4gICAgb3JpZW50YXRpb246IHRoaXMub3JpZW50YXRpb24sXG4gICAgaGFzUG9zaXRpb246IGZhbHNlLFxuICAgIHBvc2l0aW9uOiBudWxsXG4gIH1cbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbktleURvd25fID0gZnVuY3Rpb24oZSkge1xuICAvLyBUcmFjayBXQVNEIGFuZCBhcnJvdyBrZXlzLlxuICBpZiAoZS5rZXlDb2RlID09IDM4KSB7IC8vIFVwIGtleS5cbiAgICB0aGlzLmFuaW1hdGVQaGlfKHRoaXMucGhpICsgS0VZX1NQRUVEKTtcbiAgfSBlbHNlIGlmIChlLmtleUNvZGUgPT0gMzkpIHsgLy8gUmlnaHQga2V5LlxuICAgIHRoaXMuYW5pbWF0ZVRoZXRhXyh0aGlzLnRoZXRhIC0gS0VZX1NQRUVEKTtcbiAgfSBlbHNlIGlmIChlLmtleUNvZGUgPT0gNDApIHsgLy8gRG93biBrZXkuXG4gICAgdGhpcy5hbmltYXRlUGhpXyh0aGlzLnBoaSAtIEtFWV9TUEVFRCk7XG4gIH0gZWxzZSBpZiAoZS5rZXlDb2RlID09IDM3KSB7IC8vIExlZnQga2V5LlxuICAgIHRoaXMuYW5pbWF0ZVRoZXRhXyh0aGlzLnRoZXRhICsgS0VZX1NQRUVEKTtcbiAgfVxufTtcblxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmFuaW1hdGVUaGV0YV8gPSBmdW5jdGlvbih0YXJnZXRBbmdsZSkge1xuICB0aGlzLmFuaW1hdGVLZXlUcmFuc2l0aW9uc18oJ3RoZXRhJywgdGFyZ2V0QW5nbGUpO1xufTtcblxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmFuaW1hdGVQaGlfID0gZnVuY3Rpb24odGFyZ2V0QW5nbGUpIHtcbiAgLy8gUHJldmVudCBsb29raW5nIHRvbyBmYXIgdXAgb3IgZG93bi5cbiAgdGFyZ2V0QW5nbGUgPSBVdGlsLmNsYW1wKHRhcmdldEFuZ2xlLCAtTWF0aC5QSS8yLCBNYXRoLlBJLzIpO1xuICB0aGlzLmFuaW1hdGVLZXlUcmFuc2l0aW9uc18oJ3BoaScsIHRhcmdldEFuZ2xlKTtcbn07XG5cbi8qKlxuICogU3RhcnQgYW4gYW5pbWF0aW9uIHRvIHRyYW5zaXRpb24gYW4gYW5nbGUgZnJvbSBvbmUgdmFsdWUgdG8gYW5vdGhlci5cbiAqL1xuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmFuaW1hdGVLZXlUcmFuc2l0aW9uc18gPSBmdW5jdGlvbihhbmdsZU5hbWUsIHRhcmdldEFuZ2xlKSB7XG4gIC8vIElmIGFuIGFuaW1hdGlvbiBpcyBjdXJyZW50bHkgcnVubmluZywgY2FuY2VsIGl0LlxuICBpZiAodGhpcy5hbmdsZUFuaW1hdGlvbikge1xuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5hbmdsZUFuaW1hdGlvbik7XG4gIH1cbiAgdmFyIHN0YXJ0QW5nbGUgPSB0aGlzW2FuZ2xlTmFtZV07XG4gIHZhciBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpO1xuICAvLyBTZXQgdXAgYW4gaW50ZXJ2YWwgdGltZXIgdG8gcGVyZm9ybSB0aGUgYW5pbWF0aW9uLlxuICB0aGlzLmFuZ2xlQW5pbWF0aW9uID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgLy8gT25jZSB3ZSdyZSBmaW5pc2hlZCB0aGUgYW5pbWF0aW9uLCB3ZSdyZSBkb25lLlxuICAgIHZhciBlbGFwc2VkID0gbmV3IERhdGUoKSAtIHN0YXJ0VGltZTtcbiAgICBpZiAoZWxhcHNlZCA+PSBLRVlfQU5JTUFUSU9OX0RVUkFUSU9OKSB7XG4gICAgICB0aGlzW2FuZ2xlTmFtZV0gPSB0YXJnZXRBbmdsZTtcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5hbmdsZUFuaW1hdGlvbik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIExpbmVhcmx5IGludGVycG9sYXRlIHRoZSBhbmdsZSBzb21lIGFtb3VudC5cbiAgICB2YXIgcGVyY2VudCA9IGVsYXBzZWQgLyBLRVlfQU5JTUFUSU9OX0RVUkFUSU9OO1xuICAgIHRoaXNbYW5nbGVOYW1lXSA9IHN0YXJ0QW5nbGUgKyAodGFyZ2V0QW5nbGUgLSBzdGFydEFuZ2xlKSAqIHBlcmNlbnQ7XG4gIH0uYmluZCh0aGlzKSwgMTAwMC82MCk7XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUub25Nb3VzZURvd25fID0gZnVuY3Rpb24oZSkge1xuICB0aGlzLnJvdGF0ZVN0YXJ0LnNldChlLmNsaWVudFgsIGUuY2xpZW50WSk7XG4gIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XG59O1xuXG4vLyBWZXJ5IHNpbWlsYXIgdG8gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vbXJmbGl4LzgzNTEwMjBcbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbk1vdXNlTW92ZV8gPSBmdW5jdGlvbihlKSB7XG4gIGlmICghdGhpcy5pc0RyYWdnaW5nICYmICF0aGlzLmlzUG9pbnRlckxvY2tlZF8oKSkge1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBTdXBwb3J0IHBvaW50ZXIgbG9jayBBUEkuXG4gIGlmICh0aGlzLmlzUG9pbnRlckxvY2tlZF8oKSkge1xuICAgIHZhciBtb3ZlbWVudFggPSBlLm1vdmVtZW50WCB8fCBlLm1vek1vdmVtZW50WCB8fCAwO1xuICAgIHZhciBtb3ZlbWVudFkgPSBlLm1vdmVtZW50WSB8fCBlLm1vek1vdmVtZW50WSB8fCAwO1xuICAgIHRoaXMucm90YXRlRW5kLnNldCh0aGlzLnJvdGF0ZVN0YXJ0LnggLSBtb3ZlbWVudFgsIHRoaXMucm90YXRlU3RhcnQueSAtIG1vdmVtZW50WSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5yb3RhdGVFbmQuc2V0KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcbiAgfVxuICAvLyBDYWxjdWxhdGUgaG93IG11Y2ggd2UgbW92ZWQgaW4gbW91c2Ugc3BhY2UuXG4gIHRoaXMucm90YXRlRGVsdGEuc3ViVmVjdG9ycyh0aGlzLnJvdGF0ZUVuZCwgdGhpcy5yb3RhdGVTdGFydCk7XG4gIHRoaXMucm90YXRlU3RhcnQuY29weSh0aGlzLnJvdGF0ZUVuZCk7XG5cbiAgLy8gS2VlcCB0cmFjayBvZiB0aGUgY3VtdWxhdGl2ZSBldWxlciBhbmdsZXMuXG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcbiAgdGhpcy5waGkgKz0gMiAqIE1hdGguUEkgKiB0aGlzLnJvdGF0ZURlbHRhLnkgLyBlbGVtZW50LmNsaWVudEhlaWdodCAqIE1PVVNFX1NQRUVEX1k7XG4gIHRoaXMudGhldGEgKz0gMiAqIE1hdGguUEkgKiB0aGlzLnJvdGF0ZURlbHRhLnggLyBlbGVtZW50LmNsaWVudFdpZHRoICogTU9VU0VfU1BFRURfWDtcblxuICAvLyBQcmV2ZW50IGxvb2tpbmcgdG9vIGZhciB1cCBvciBkb3duLlxuICB0aGlzLnBoaSA9IFV0aWwuY2xhbXAodGhpcy5waGksIC1NYXRoLlBJLzIsIE1hdGguUEkvMik7XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUub25Nb3VzZVVwXyA9IGZ1bmN0aW9uKGUpIHtcbiAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuaXNQb2ludGVyTG9ja2VkXyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZWwgPSBkb2N1bWVudC5wb2ludGVyTG9ja0VsZW1lbnQgfHwgZG9jdW1lbnQubW96UG9pbnRlckxvY2tFbGVtZW50IHx8XG4gICAgICBkb2N1bWVudC53ZWJraXRQb2ludGVyTG9ja0VsZW1lbnQ7XG4gIHJldHVybiBlbCAhPT0gdW5kZWZpbmVkO1xufTtcblxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLnJlc2V0U2Vuc29yID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUuZXJyb3IoJ05vdCBpbXBsZW1lbnRlZCB5ZXQuJyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbnZhciBQb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi9iYXNlLmpzJykuUG9zaXRpb25TZW5zb3JWUkRldmljZTtcbnZhciBUb3VjaFBhbm5lciA9IHJlcXVpcmUoJy4vdG91Y2gtcGFubmVyLmpzJyk7XG52YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG5XRUJWUl9ZQVdfT05MWSA9IGZhbHNlO1xuXG4vKipcbiAqIFRoZSBwb3NpdGlvbmFsIHNlbnNvciwgaW1wbGVtZW50ZWQgdXNpbmcgd2ViIERldmljZU9yaWVudGF0aW9uIEFQSXMuXG4gKi9cbmZ1bmN0aW9uIE9yaWVudGF0aW9uUG9zaXRpb25TZW5zb3JWUkRldmljZSgpIHtcbiAgdGhpcy5kZXZpY2VJZCA9ICd3ZWJ2ci1wb2x5ZmlsbDpneXJvJztcbiAgdGhpcy5kZXZpY2VOYW1lID0gJ1ZSIFBvc2l0aW9uIERldmljZSAod2VidnItcG9seWZpbGw6Z3lybyknO1xuXG4gIC8vIFN1YnNjcmliZSB0byBkZXZpY2VvcmllbnRhdGlvbiBldmVudHMuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VvcmllbnRhdGlvbicsIHRoaXMub25EZXZpY2VPcmllbnRhdGlvbkNoYW5nZV8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMub25TY3JlZW5PcmllbnRhdGlvbkNoYW5nZV8uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5kZXZpY2VPcmllbnRhdGlvbiA9IG51bGw7XG4gIHRoaXMuc2NyZWVuT3JpZW50YXRpb24gPSB3aW5kb3cub3JpZW50YXRpb247XG5cbiAgLy8gSGVscGVyIG9iamVjdHMgZm9yIGNhbGN1bGF0aW5nIG9yaWVudGF0aW9uLlxuICB0aGlzLmZpbmFsUXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMudG1wUXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMuZGV2aWNlRXVsZXIgPSBuZXcgVEhSRUUuRXVsZXIoKTtcbiAgdGhpcy5zY3JlZW5UcmFuc2Zvcm0gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICAvLyAtUEkvMiBhcm91bmQgdGhlIHgtYXhpcy5cbiAgdGhpcy53b3JsZFRyYW5zZm9ybSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKC1NYXRoLnNxcnQoMC41KSwgMCwgMCwgTWF0aC5zcXJ0KDAuNSkpO1xuXG4gIC8vIFRoZSBxdWF0ZXJuaW9uIGZvciB0YWtpbmcgaW50byBhY2NvdW50IHRoZSByZXNldCBwb3NpdGlvbi5cbiAgdGhpcy5yZXNldFRyYW5zZm9ybSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cbiAgdGhpcy50b3VjaFBhbm5lciA9IG5ldyBUb3VjaFBhbm5lcigpO1xufVxuT3JpZW50YXRpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBQb3NpdGlvblNlbnNvclZSRGV2aWNlKCk7XG5cbi8qKlxuICogUmV0dXJucyB7b3JpZW50YXRpb246IHt4LHkseix3fSwgcG9zaXRpb246IG51bGx9LlxuICogUG9zaXRpb24gaXMgbm90IHN1cHBvcnRlZCBzaW5jZSB3ZSBjYW4ndCBkbyA2RE9GLlxuICovXG5PcmllbnRhdGlvblBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgaGFzT3JpZW50YXRpb246IHRydWUsXG4gICAgb3JpZW50YXRpb246IHRoaXMuZ2V0T3JpZW50YXRpb24oKSxcbiAgICBoYXNQb3NpdGlvbjogZmFsc2UsXG4gICAgcG9zaXRpb246IG51bGxcbiAgfVxufTtcblxuT3JpZW50YXRpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbkRldmljZU9yaWVudGF0aW9uQ2hhbmdlXyA9XG4gICAgZnVuY3Rpb24oZGV2aWNlT3JpZW50YXRpb24pIHtcbiAgdGhpcy5kZXZpY2VPcmllbnRhdGlvbiA9IGRldmljZU9yaWVudGF0aW9uO1xufTtcblxuT3JpZW50YXRpb25Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vblNjcmVlbk9yaWVudGF0aW9uQ2hhbmdlXyA9XG4gICAgZnVuY3Rpb24oc2NyZWVuT3JpZW50YXRpb24pIHtcbiAgdGhpcy5zY3JlZW5PcmllbnRhdGlvbiA9IHdpbmRvdy5vcmllbnRhdGlvbjtcbn07XG5cbk9yaWVudGF0aW9uUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuZ2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZGV2aWNlT3JpZW50YXRpb24gPT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gUm90YXRpb24gYXJvdW5kIHRoZSB6LWF4aXMuXG4gIHZhciBhbHBoYSA9IFRIUkVFLk1hdGguZGVnVG9SYWQodGhpcy5kZXZpY2VPcmllbnRhdGlvbi5hbHBoYSk7XG4gIC8vIEZyb250LXRvLWJhY2sgKGluIHBvcnRyYWl0KSByb3RhdGlvbiAoeC1heGlzKS5cbiAgdmFyIGJldGEgPSBUSFJFRS5NYXRoLmRlZ1RvUmFkKHRoaXMuZGV2aWNlT3JpZW50YXRpb24uYmV0YSk7XG4gIC8vIExlZnQgdG8gcmlnaHQgKGluIHBvcnRyYWl0KSByb3RhdGlvbiAoeS1heGlzKS5cbiAgdmFyIGdhbW1hID0gVEhSRUUuTWF0aC5kZWdUb1JhZCh0aGlzLmRldmljZU9yaWVudGF0aW9uLmdhbW1hKTtcbiAgdmFyIG9yaWVudCA9IFRIUkVFLk1hdGguZGVnVG9SYWQodGhpcy5zY3JlZW5PcmllbnRhdGlvbik7XG5cbiAgLy8gVXNlIHRocmVlLmpzIHRvIGNvbnZlcnQgdG8gcXVhdGVybmlvbi4gTGlmdGVkIGZyb21cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3JpY2h0ci90aHJlZVZSL2Jsb2IvbWFzdGVyL2pzL0RldmljZU9yaWVudGF0aW9uQ29udHJvbGxlci5qc1xuICB0aGlzLmRldmljZUV1bGVyLnNldChiZXRhLCBhbHBoYSwgLWdhbW1hLCAnWVhaJyk7XG4gIHRoaXMudG1wUXVhdGVybmlvbi5zZXRGcm9tRXVsZXIodGhpcy5kZXZpY2VFdWxlcik7XG4gIHRoaXMubWludXNIYWxmQW5nbGUgPSAtb3JpZW50IC8gMjtcbiAgdGhpcy5zY3JlZW5UcmFuc2Zvcm0uc2V0KDAsIE1hdGguc2luKHRoaXMubWludXNIYWxmQW5nbGUpLCAwLCBNYXRoLmNvcyh0aGlzLm1pbnVzSGFsZkFuZ2xlKSk7XG4gIC8vIFRha2UgaW50byBhY2NvdW50IHRoZSByZXNldCB0cmFuc2Zvcm1hdGlvbi5cbiAgdGhpcy5maW5hbFF1YXRlcm5pb24uY29weSh0aGlzLnJlc2V0VHJhbnNmb3JtKTtcbiAgLy8gQW5kIGFueSByb3RhdGlvbnMgZG9uZSB2aWEgdG91Y2ggZXZlbnRzLlxuICB0aGlzLmZpbmFsUXVhdGVybmlvbi5tdWx0aXBseSh0aGlzLnRvdWNoUGFubmVyLmdldE9yaWVudGF0aW9uKCkpO1xuICB0aGlzLmZpbmFsUXVhdGVybmlvbi5tdWx0aXBseSh0aGlzLnRtcFF1YXRlcm5pb24pO1xuICB0aGlzLmZpbmFsUXVhdGVybmlvbi5tdWx0aXBseSh0aGlzLnNjcmVlblRyYW5zZm9ybSk7XG4gIHRoaXMuZmluYWxRdWF0ZXJuaW9uLm11bHRpcGx5KHRoaXMud29ybGRUcmFuc2Zvcm0pO1xuXG4gIHJldHVybiB0aGlzLmZpbmFsUXVhdGVybmlvbjtcbn07XG5cbk9yaWVudGF0aW9uUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUucmVzZXRTZW5zb3IgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFuZ2xlID0gVEhSRUUuTWF0aC5kZWdUb1JhZCh0aGlzLmRldmljZU9yaWVudGF0aW9uLmFscGhhKTtcbiAgY29uc29sZS5sb2coJ05vcm1hbGl6aW5nIHlhdyB0byAlZicsIGFuZ2xlKTtcbiAgdGhpcy5yZXNldFRyYW5zZm9ybS5zZXRGcm9tQXhpc0FuZ2xlKG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApLCAtYW5nbGUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcmllbnRhdGlvblBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG52YXIgREVCVUcgPSBmYWxzZTtcblxuLyoqXG4gKiBHaXZlbiBhbiBvcmllbnRhdGlvbiBhbmQgdGhlIGd5cm9zY29wZSBkYXRhLCBwcmVkaWN0cyB0aGUgZnV0dXJlIG9yaWVudGF0aW9uXG4gKiBvZiB0aGUgaGVhZC4gVGhpcyBtYWtlcyByZW5kZXJpbmcgYXBwZWFyIGZhc3Rlci5cbiAqXG4gKiBBbHNvIHNlZTogaHR0cDovL21zbC5jcy51aXVjLmVkdS9+bGF2YWxsZS9wYXBlcnMvTGF2WWVyS2F0QW50MTQucGRmXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHByZWRpY3Rpb25UaW1lUyB0aW1lIGZyb20gaGVhZCBtb3ZlbWVudCB0byB0aGUgYXBwZWFyYW5jZSBvZlxuICogdGhlIGNvcnJlc3BvbmRpbmcgaW1hZ2UuXG4gKi9cbmZ1bmN0aW9uIFBvc2VQcmVkaWN0b3IocHJlZGljdGlvblRpbWVTKSB7XG4gIHRoaXMucHJlZGljdGlvblRpbWVTID0gcHJlZGljdGlvblRpbWVTO1xuXG4gIC8vIFRoZSBxdWF0ZXJuaW9uIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHByZXZpb3VzIHN0YXRlLlxuICB0aGlzLnByZXZpb3VzUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIC8vIFByZXZpb3VzIHRpbWUgYSBwcmVkaWN0aW9uIG9jY3VycmVkLlxuICB0aGlzLnByZXZpb3VzVGltZXN0YW1wUyA9IG51bGw7XG5cbiAgLy8gVGhlIGRlbHRhIHF1YXRlcm5pb24gdGhhdCBhZGp1c3RzIHRoZSBjdXJyZW50IHBvc2UuXG4gIHRoaXMuZGVsdGFRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgLy8gVGhlIG91dHB1dCBxdWF0ZXJuaW9uLlxuICB0aGlzLm91dFEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xufVxuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRQcmVkaWN0aW9uID0gZnVuY3Rpb24oY3VycmVudFEsIGd5cm8sIHRpbWVzdGFtcFMpIHtcbiAgaWYgKCF0aGlzLnByZXZpb3VzVGltZXN0YW1wUykge1xuICAgIHRoaXMucHJldmlvdXNRLmNvcHkoY3VycmVudFEpO1xuICAgIHRoaXMucHJldmlvdXNUaW1lc3RhbXBTID0gdGltZXN0YW1wUztcbiAgICByZXR1cm4gY3VycmVudFE7XG4gIH1cblxuICAvLyBDYWxjdWxhdGUgYXhpcyBhbmQgYW5nbGUgYmFzZWQgb24gZ3lyb3Njb3BlIHJvdGF0aW9uIHJhdGUgZGF0YS5cbiAgdmFyIGF4aXMgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBheGlzLmNvcHkoZ3lybyk7XG4gIGF4aXMubm9ybWFsaXplKCk7XG5cbiAgdmFyIGFuZ3VsYXJTcGVlZCA9IGd5cm8ubGVuZ3RoKCk7XG5cbiAgLy8gSWYgd2UncmUgcm90YXRpbmcgc2xvd2x5LCBkb24ndCBkbyBwcmVkaWN0aW9uLlxuICBpZiAoYW5ndWxhclNwZWVkIDwgVEhSRUUuTWF0aC5kZWdUb1JhZCgyMCkpIHtcbiAgICBpZiAoREVCVUcpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdNb3Zpbmcgc2xvd2x5LCBhdCAlcyBkZWcvczogbm8gcHJlZGljdGlvbicsXG4gICAgICAgICAgICAgICAgICBUSFJFRS5NYXRoLnJhZFRvRGVnKGFuZ3VsYXJTcGVlZCkudG9GaXhlZCgxKSk7XG4gICAgfVxuICAgIHRoaXMub3V0US5jb3B5KGN1cnJlbnRRKTtcbiAgICB0aGlzLnByZXZpb3VzUS5jb3B5KGN1cnJlbnRRKTtcbiAgICByZXR1cm4gdGhpcy5vdXRRO1xuICB9XG5cbiAgLy8gR2V0IHRoZSBwcmVkaWN0ZWQgYW5nbGUgYmFzZWQgb24gdGhlIHRpbWUgZGVsdGEgYW5kIGxhdGVuY3kuXG4gIHZhciBkZWx0YVQgPSB0aW1lc3RhbXBTIC0gdGhpcy5wcmV2aW91c1RpbWVzdGFtcFM7XG4gIHZhciBwcmVkaWN0QW5nbGUgPSBhbmd1bGFyU3BlZWQgKiB0aGlzLnByZWRpY3Rpb25UaW1lUztcblxuICB0aGlzLmRlbHRhUS5zZXRGcm9tQXhpc0FuZ2xlKGF4aXMsIHByZWRpY3RBbmdsZSk7XG4gIHRoaXMub3V0US5jb3B5KHRoaXMucHJldmlvdXNRKTtcbiAgdGhpcy5vdXRRLm11bHRpcGx5KHRoaXMuZGVsdGFRKTtcblxuICB0aGlzLnByZXZpb3VzUS5jb3B5KGN1cnJlbnRRKTtcblxuICByZXR1cm4gdGhpcy5vdXRRO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFBvc2VQcmVkaWN0b3I7XG4iLCJmdW5jdGlvbiBTZW5zb3JTYW1wbGUoc2FtcGxlLCB0aW1lc3RhbXBTKSB7XG4gIHRoaXMuc2V0KHNhbXBsZSwgdGltZXN0YW1wUyk7XG59O1xuXG5TZW5zb3JTYW1wbGUucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHNhbXBsZSwgdGltZXN0YW1wUykge1xuICB0aGlzLnNhbXBsZSA9IHNhbXBsZTtcbiAgdGhpcy50aW1lc3RhbXBTID0gdGltZXN0YW1wUztcbn07XG5cblNlbnNvclNhbXBsZS5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uKHNlbnNvclNhbXBsZSkge1xuICB0aGlzLnNldChzZW5zb3JTYW1wbGUuc2FtcGxlLCBzZW5zb3JTYW1wbGUudGltZXN0YW1wUyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbnNvclNhbXBsZTtcbiIsIi8qXG4gKiBBIHN1YnNldCBvZiBUSFJFRS5qcywgcHJvdmlkaW5nIG1vc3RseSBxdWF0ZXJuaW9uIGFuZCBldWxlci1yZWxhdGVkXG4gKiBvcGVyYXRpb25zLCBtYW51YWxseSBsaWZ0ZWQgZnJvbVxuICogaHR0cHM6Ly9naXRodWIuY29tL21yZG9vYi90aHJlZS5qcy90cmVlL21hc3Rlci9zcmMvbWF0aCwgYXMgb2YgOWMzMDI4NmIzOGRmMDM5ZmNhMzg5OTg5ZmYwNmVhMWMxNWQ2YmFkMVxuICovXG5cbi8vIE9ubHkgdXNlIGlmIHRoZSByZWFsIFRIUkVFIGlzIG5vdCBwcm92aWRlZC5cbnZhciBUSFJFRSA9IHdpbmRvdy5USFJFRSB8fCB7fTtcblxuLy8gSWYgc29tZSBwaWVjZSBvZiBUSFJFRSBpcyBtaXNzaW5nLCBmaWxsIGl0IGluIGhlcmUuXG5pZiAoIVRIUkVFLlF1YXRlcm5pb24gfHwgIVRIUkVFLlZlY3RvcjMgfHwgIVRIUkVFLlZlY3RvcjIgfHwgIVRIUkVFLkV1bGVyIHx8ICFUSFJFRS5NYXRoKSB7XG5jb25zb2xlLmxvZygnTm8gVEhSRUUuanMgZm91bmQuJyk7XG5cblxuLyoqKiBTVEFSVCBRdWF0ZXJuaW9uICoqKi9cblxuLyoqXG4gKiBAYXV0aG9yIG1pa2FlbCBlbXRpbmdlciAvIGh0dHA6Ly9nb21vLnNlL1xuICogQGF1dGhvciBhbHRlcmVkcSAvIGh0dHA6Ly9hbHRlcmVkcXVhbGlhLmNvbS9cbiAqIEBhdXRob3IgV2VzdExhbmdsZXkgLyBodHRwOi8vZ2l0aHViLmNvbS9XZXN0TGFuZ2xleVxuICogQGF1dGhvciBiaG91c3RvbiAvIGh0dHA6Ly9leG9jb3J0ZXguY29tXG4gKi9cblxuVEhSRUUuUXVhdGVybmlvbiA9IGZ1bmN0aW9uICggeCwgeSwgeiwgdyApIHtcblxuXHR0aGlzLl94ID0geCB8fCAwO1xuXHR0aGlzLl95ID0geSB8fCAwO1xuXHR0aGlzLl96ID0geiB8fCAwO1xuXHR0aGlzLl93ID0gKCB3ICE9PSB1bmRlZmluZWQgKSA/IHcgOiAxO1xuXG59O1xuXG5USFJFRS5RdWF0ZXJuaW9uLnByb3RvdHlwZSA9IHtcblxuXHRjb25zdHJ1Y3RvcjogVEhSRUUuUXVhdGVybmlvbixcblxuXHRfeDogMCxfeTogMCwgX3o6IDAsIF93OiAwLFxuXG5cdGdldCB4ICgpIHtcblxuXHRcdHJldHVybiB0aGlzLl94O1xuXG5cdH0sXG5cblx0c2V0IHggKCB2YWx1ZSApIHtcblxuXHRcdHRoaXMuX3ggPSB2YWx1ZTtcblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHR9LFxuXG5cdGdldCB5ICgpIHtcblxuXHRcdHJldHVybiB0aGlzLl95O1xuXG5cdH0sXG5cblx0c2V0IHkgKCB2YWx1ZSApIHtcblxuXHRcdHRoaXMuX3kgPSB2YWx1ZTtcblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHR9LFxuXG5cdGdldCB6ICgpIHtcblxuXHRcdHJldHVybiB0aGlzLl96O1xuXG5cdH0sXG5cblx0c2V0IHogKCB2YWx1ZSApIHtcblxuXHRcdHRoaXMuX3ogPSB2YWx1ZTtcblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHR9LFxuXG5cdGdldCB3ICgpIHtcblxuXHRcdHJldHVybiB0aGlzLl93O1xuXG5cdH0sXG5cblx0c2V0IHcgKCB2YWx1ZSApIHtcblxuXHRcdHRoaXMuX3cgPSB2YWx1ZTtcblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKCB4LCB5LCB6LCB3ICkge1xuXG5cdFx0dGhpcy5feCA9IHg7XG5cdFx0dGhpcy5feSA9IHk7XG5cdFx0dGhpcy5feiA9IHo7XG5cdFx0dGhpcy5fdyA9IHc7XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0Y29weTogZnVuY3Rpb24gKCBxdWF0ZXJuaW9uICkge1xuXG5cdFx0dGhpcy5feCA9IHF1YXRlcm5pb24ueDtcblx0XHR0aGlzLl95ID0gcXVhdGVybmlvbi55O1xuXHRcdHRoaXMuX3ogPSBxdWF0ZXJuaW9uLno7XG5cdFx0dGhpcy5fdyA9IHF1YXRlcm5pb24udztcblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzZXRGcm9tRXVsZXI6IGZ1bmN0aW9uICggZXVsZXIsIHVwZGF0ZSApIHtcblxuXHRcdGlmICggZXVsZXIgaW5zdGFuY2VvZiBUSFJFRS5FdWxlciA9PT0gZmFsc2UgKSB7XG5cblx0XHRcdHRocm93IG5ldyBFcnJvciggJ1RIUkVFLlF1YXRlcm5pb246IC5zZXRGcm9tRXVsZXIoKSBub3cgZXhwZWN0cyBhIEV1bGVyIHJvdGF0aW9uIHJhdGhlciB0aGFuIGEgVmVjdG9yMyBhbmQgb3JkZXIuJyApO1xuXHRcdH1cblxuXHRcdC8vIGh0dHA6Ly93d3cubWF0aHdvcmtzLmNvbS9tYXRsYWJjZW50cmFsL2ZpbGVleGNoYW5nZS9cblx0XHQvLyBcdDIwNjk2LWZ1bmN0aW9uLXRvLWNvbnZlcnQtYmV0d2Vlbi1kY20tZXVsZXItYW5nbGVzLXF1YXRlcm5pb25zLWFuZC1ldWxlci12ZWN0b3JzL1xuXHRcdC8vXHRjb250ZW50L1NwaW5DYWxjLm1cblxuXHRcdHZhciBjMSA9IE1hdGguY29zKCBldWxlci5feCAvIDIgKTtcblx0XHR2YXIgYzIgPSBNYXRoLmNvcyggZXVsZXIuX3kgLyAyICk7XG5cdFx0dmFyIGMzID0gTWF0aC5jb3MoIGV1bGVyLl96IC8gMiApO1xuXHRcdHZhciBzMSA9IE1hdGguc2luKCBldWxlci5feCAvIDIgKTtcblx0XHR2YXIgczIgPSBNYXRoLnNpbiggZXVsZXIuX3kgLyAyICk7XG5cdFx0dmFyIHMzID0gTWF0aC5zaW4oIGV1bGVyLl96IC8gMiApO1xuXG5cdFx0aWYgKCBldWxlci5vcmRlciA9PT0gJ1hZWicgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSBzMSAqIGMyICogYzMgKyBjMSAqIHMyICogczM7XG5cdFx0XHR0aGlzLl95ID0gYzEgKiBzMiAqIGMzIC0gczEgKiBjMiAqIHMzO1xuXHRcdFx0dGhpcy5feiA9IGMxICogYzIgKiBzMyArIHMxICogczIgKiBjMztcblx0XHRcdHRoaXMuX3cgPSBjMSAqIGMyICogYzMgLSBzMSAqIHMyICogczM7XG5cblx0XHR9IGVsc2UgaWYgKCBldWxlci5vcmRlciA9PT0gJ1lYWicgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSBzMSAqIGMyICogYzMgKyBjMSAqIHMyICogczM7XG5cdFx0XHR0aGlzLl95ID0gYzEgKiBzMiAqIGMzIC0gczEgKiBjMiAqIHMzO1xuXHRcdFx0dGhpcy5feiA9IGMxICogYzIgKiBzMyAtIHMxICogczIgKiBjMztcblx0XHRcdHRoaXMuX3cgPSBjMSAqIGMyICogYzMgKyBzMSAqIHMyICogczM7XG5cblx0XHR9IGVsc2UgaWYgKCBldWxlci5vcmRlciA9PT0gJ1pYWScgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSBzMSAqIGMyICogYzMgLSBjMSAqIHMyICogczM7XG5cdFx0XHR0aGlzLl95ID0gYzEgKiBzMiAqIGMzICsgczEgKiBjMiAqIHMzO1xuXHRcdFx0dGhpcy5feiA9IGMxICogYzIgKiBzMyArIHMxICogczIgKiBjMztcblx0XHRcdHRoaXMuX3cgPSBjMSAqIGMyICogYzMgLSBzMSAqIHMyICogczM7XG5cblx0XHR9IGVsc2UgaWYgKCBldWxlci5vcmRlciA9PT0gJ1pZWCcgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSBzMSAqIGMyICogYzMgLSBjMSAqIHMyICogczM7XG5cdFx0XHR0aGlzLl95ID0gYzEgKiBzMiAqIGMzICsgczEgKiBjMiAqIHMzO1xuXHRcdFx0dGhpcy5feiA9IGMxICogYzIgKiBzMyAtIHMxICogczIgKiBjMztcblx0XHRcdHRoaXMuX3cgPSBjMSAqIGMyICogYzMgKyBzMSAqIHMyICogczM7XG5cblx0XHR9IGVsc2UgaWYgKCBldWxlci5vcmRlciA9PT0gJ1laWCcgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSBzMSAqIGMyICogYzMgKyBjMSAqIHMyICogczM7XG5cdFx0XHR0aGlzLl95ID0gYzEgKiBzMiAqIGMzICsgczEgKiBjMiAqIHMzO1xuXHRcdFx0dGhpcy5feiA9IGMxICogYzIgKiBzMyAtIHMxICogczIgKiBjMztcblx0XHRcdHRoaXMuX3cgPSBjMSAqIGMyICogYzMgLSBzMSAqIHMyICogczM7XG5cblx0XHR9IGVsc2UgaWYgKCBldWxlci5vcmRlciA9PT0gJ1haWScgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSBzMSAqIGMyICogYzMgLSBjMSAqIHMyICogczM7XG5cdFx0XHR0aGlzLl95ID0gYzEgKiBzMiAqIGMzIC0gczEgKiBjMiAqIHMzO1xuXHRcdFx0dGhpcy5feiA9IGMxICogYzIgKiBzMyArIHMxICogczIgKiBjMztcblx0XHRcdHRoaXMuX3cgPSBjMSAqIGMyICogYzMgKyBzMSAqIHMyICogczM7XG5cblx0XHR9XG5cblx0XHRpZiAoIHVwZGF0ZSAhPT0gZmFsc2UgKSB0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0RnJvbUF4aXNBbmdsZTogZnVuY3Rpb24gKCBheGlzLCBhbmdsZSApIHtcblxuXHRcdC8vIGh0dHA6Ly93d3cuZXVjbGlkZWFuc3BhY2UuY29tL21hdGhzL2dlb21ldHJ5L3JvdGF0aW9ucy9jb252ZXJzaW9ucy9hbmdsZVRvUXVhdGVybmlvbi9pbmRleC5odG1cblxuXHRcdC8vIGFzc3VtZXMgYXhpcyBpcyBub3JtYWxpemVkXG5cblx0XHR2YXIgaGFsZkFuZ2xlID0gYW5nbGUgLyAyLCBzID0gTWF0aC5zaW4oIGhhbGZBbmdsZSApO1xuXG5cdFx0dGhpcy5feCA9IGF4aXMueCAqIHM7XG5cdFx0dGhpcy5feSA9IGF4aXMueSAqIHM7XG5cdFx0dGhpcy5feiA9IGF4aXMueiAqIHM7XG5cdFx0dGhpcy5fdyA9IE1hdGguY29zKCBoYWxmQW5nbGUgKTtcblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzZXRGcm9tUm90YXRpb25NYXRyaXg6IGZ1bmN0aW9uICggbSApIHtcblxuXHRcdC8vIGh0dHA6Ly93d3cuZXVjbGlkZWFuc3BhY2UuY29tL21hdGhzL2dlb21ldHJ5L3JvdGF0aW9ucy9jb252ZXJzaW9ucy9tYXRyaXhUb1F1YXRlcm5pb24vaW5kZXguaHRtXG5cblx0XHQvLyBhc3N1bWVzIHRoZSB1cHBlciAzeDMgb2YgbSBpcyBhIHB1cmUgcm90YXRpb24gbWF0cml4IChpLmUsIHVuc2NhbGVkKVxuXG5cdFx0dmFyIHRlID0gbS5lbGVtZW50cyxcblxuXHRcdFx0bTExID0gdGVbIDAgXSwgbTEyID0gdGVbIDQgXSwgbTEzID0gdGVbIDggXSxcblx0XHRcdG0yMSA9IHRlWyAxIF0sIG0yMiA9IHRlWyA1IF0sIG0yMyA9IHRlWyA5IF0sXG5cdFx0XHRtMzEgPSB0ZVsgMiBdLCBtMzIgPSB0ZVsgNiBdLCBtMzMgPSB0ZVsgMTAgXSxcblxuXHRcdFx0dHJhY2UgPSBtMTEgKyBtMjIgKyBtMzMsXG5cdFx0XHRzO1xuXG5cdFx0aWYgKCB0cmFjZSA+IDAgKSB7XG5cblx0XHRcdHMgPSAwLjUgLyBNYXRoLnNxcnQoIHRyYWNlICsgMS4wICk7XG5cblx0XHRcdHRoaXMuX3cgPSAwLjI1IC8gcztcblx0XHRcdHRoaXMuX3ggPSAoIG0zMiAtIG0yMyApICogcztcblx0XHRcdHRoaXMuX3kgPSAoIG0xMyAtIG0zMSApICogcztcblx0XHRcdHRoaXMuX3ogPSAoIG0yMSAtIG0xMiApICogcztcblxuXHRcdH0gZWxzZSBpZiAoIG0xMSA+IG0yMiAmJiBtMTEgPiBtMzMgKSB7XG5cblx0XHRcdHMgPSAyLjAgKiBNYXRoLnNxcnQoIDEuMCArIG0xMSAtIG0yMiAtIG0zMyApO1xuXG5cdFx0XHR0aGlzLl93ID0gKCBtMzIgLSBtMjMgKSAvIHM7XG5cdFx0XHR0aGlzLl94ID0gMC4yNSAqIHM7XG5cdFx0XHR0aGlzLl95ID0gKCBtMTIgKyBtMjEgKSAvIHM7XG5cdFx0XHR0aGlzLl96ID0gKCBtMTMgKyBtMzEgKSAvIHM7XG5cblx0XHR9IGVsc2UgaWYgKCBtMjIgPiBtMzMgKSB7XG5cblx0XHRcdHMgPSAyLjAgKiBNYXRoLnNxcnQoIDEuMCArIG0yMiAtIG0xMSAtIG0zMyApO1xuXG5cdFx0XHR0aGlzLl93ID0gKCBtMTMgLSBtMzEgKSAvIHM7XG5cdFx0XHR0aGlzLl94ID0gKCBtMTIgKyBtMjEgKSAvIHM7XG5cdFx0XHR0aGlzLl95ID0gMC4yNSAqIHM7XG5cdFx0XHR0aGlzLl96ID0gKCBtMjMgKyBtMzIgKSAvIHM7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRzID0gMi4wICogTWF0aC5zcXJ0KCAxLjAgKyBtMzMgLSBtMTEgLSBtMjIgKTtcblxuXHRcdFx0dGhpcy5fdyA9ICggbTIxIC0gbTEyICkgLyBzO1xuXHRcdFx0dGhpcy5feCA9ICggbTEzICsgbTMxICkgLyBzO1xuXHRcdFx0dGhpcy5feSA9ICggbTIzICsgbTMyICkgLyBzO1xuXHRcdFx0dGhpcy5feiA9IDAuMjUgKiBzO1xuXG5cdFx0fVxuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldEZyb21Vbml0VmVjdG9yczogZnVuY3Rpb24gKCkge1xuXG5cdFx0Ly8gaHR0cDovL2xvbGVuZ2luZS5uZXQvYmxvZy8yMDE0LzAyLzI0L3F1YXRlcm5pb24tZnJvbS10d28tdmVjdG9ycy1maW5hbFxuXG5cdFx0Ly8gYXNzdW1lcyBkaXJlY3Rpb24gdmVjdG9ycyB2RnJvbSBhbmQgdlRvIGFyZSBub3JtYWxpemVkXG5cblx0XHR2YXIgdjEsIHI7XG5cblx0XHR2YXIgRVBTID0gMC4wMDAwMDE7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCB2RnJvbSwgdlRvICkge1xuXG5cdFx0XHRpZiAoIHYxID09PSB1bmRlZmluZWQgKSB2MSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cblx0XHRcdHIgPSB2RnJvbS5kb3QoIHZUbyApICsgMTtcblxuXHRcdFx0aWYgKCByIDwgRVBTICkge1xuXG5cdFx0XHRcdHIgPSAwO1xuXG5cdFx0XHRcdGlmICggTWF0aC5hYnMoIHZGcm9tLnggKSA+IE1hdGguYWJzKCB2RnJvbS56ICkgKSB7XG5cblx0XHRcdFx0XHR2MS5zZXQoIC0gdkZyb20ueSwgdkZyb20ueCwgMCApO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0XHR2MS5zZXQoIDAsIC0gdkZyb20ueiwgdkZyb20ueSApO1xuXG5cdFx0XHRcdH1cblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHR2MS5jcm9zc1ZlY3RvcnMoIHZGcm9tLCB2VG8gKTtcblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl94ID0gdjEueDtcblx0XHRcdHRoaXMuX3kgPSB2MS55O1xuXHRcdFx0dGhpcy5feiA9IHYxLno7XG5cdFx0XHR0aGlzLl93ID0gcjtcblxuXHRcdFx0dGhpcy5ub3JtYWxpemUoKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHR9XG5cblx0fSgpLFxuXG5cdGludmVyc2U6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHRoaXMuY29uanVnYXRlKCkubm9ybWFsaXplKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGNvbmp1Z2F0ZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy5feCAqPSAtIDE7XG5cdFx0dGhpcy5feSAqPSAtIDE7XG5cdFx0dGhpcy5feiAqPSAtIDE7XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0ZG90OiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRyZXR1cm4gdGhpcy5feCAqIHYuX3ggKyB0aGlzLl95ICogdi5feSArIHRoaXMuX3ogKiB2Ll96ICsgdGhpcy5fdyAqIHYuX3c7XG5cblx0fSxcblxuXHRsZW5ndGhTcTogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX3ggKiB0aGlzLl94ICsgdGhpcy5feSAqIHRoaXMuX3kgKyB0aGlzLl96ICogdGhpcy5feiArIHRoaXMuX3cgKiB0aGlzLl93O1xuXG5cdH0sXG5cblx0bGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gTWF0aC5zcXJ0KCB0aGlzLl94ICogdGhpcy5feCArIHRoaXMuX3kgKiB0aGlzLl95ICsgdGhpcy5feiAqIHRoaXMuX3ogKyB0aGlzLl93ICogdGhpcy5fdyApO1xuXG5cdH0sXG5cblx0bm9ybWFsaXplOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgbCA9IHRoaXMubGVuZ3RoKCk7XG5cblx0XHRpZiAoIGwgPT09IDAgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSAwO1xuXHRcdFx0dGhpcy5feSA9IDA7XG5cdFx0XHR0aGlzLl96ID0gMDtcblx0XHRcdHRoaXMuX3cgPSAxO1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0bCA9IDEgLyBsO1xuXG5cdFx0XHR0aGlzLl94ID0gdGhpcy5feCAqIGw7XG5cdFx0XHR0aGlzLl95ID0gdGhpcy5feSAqIGw7XG5cdFx0XHR0aGlzLl96ID0gdGhpcy5feiAqIGw7XG5cdFx0XHR0aGlzLl93ID0gdGhpcy5fdyAqIGw7XG5cblx0XHR9XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bXVsdGlwbHk6IGZ1bmN0aW9uICggcSwgcCApIHtcblxuXHRcdGlmICggcCAhPT0gdW5kZWZpbmVkICkge1xuXG5cdFx0XHRjb25zb2xlLndhcm4oICdUSFJFRS5RdWF0ZXJuaW9uOiAubXVsdGlwbHkoKSBub3cgb25seSBhY2NlcHRzIG9uZSBhcmd1bWVudC4gVXNlIC5tdWx0aXBseVF1YXRlcm5pb25zKCBhLCBiICkgaW5zdGVhZC4nICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5tdWx0aXBseVF1YXRlcm5pb25zKCBxLCBwICk7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5tdWx0aXBseVF1YXRlcm5pb25zKCB0aGlzLCBxICk7XG5cblx0fSxcblxuXHRtdWx0aXBseVF1YXRlcm5pb25zOiBmdW5jdGlvbiAoIGEsIGIgKSB7XG5cblx0XHQvLyBmcm9tIGh0dHA6Ly93d3cuZXVjbGlkZWFuc3BhY2UuY29tL21hdGhzL2FsZ2VicmEvcmVhbE5vcm1lZEFsZ2VicmEvcXVhdGVybmlvbnMvY29kZS9pbmRleC5odG1cblxuXHRcdHZhciBxYXggPSBhLl94LCBxYXkgPSBhLl95LCBxYXogPSBhLl96LCBxYXcgPSBhLl93O1xuXHRcdHZhciBxYnggPSBiLl94LCBxYnkgPSBiLl95LCBxYnogPSBiLl96LCBxYncgPSBiLl93O1xuXG5cdFx0dGhpcy5feCA9IHFheCAqIHFidyArIHFhdyAqIHFieCArIHFheSAqIHFieiAtIHFheiAqIHFieTtcblx0XHR0aGlzLl95ID0gcWF5ICogcWJ3ICsgcWF3ICogcWJ5ICsgcWF6ICogcWJ4IC0gcWF4ICogcWJ6O1xuXHRcdHRoaXMuX3ogPSBxYXogKiBxYncgKyBxYXcgKiBxYnogKyBxYXggKiBxYnkgLSBxYXkgKiBxYng7XG5cdFx0dGhpcy5fdyA9IHFhdyAqIHFidyAtIHFheCAqIHFieCAtIHFheSAqIHFieSAtIHFheiAqIHFiejtcblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtdWx0aXBseVZlY3RvcjM6IGZ1bmN0aW9uICggdmVjdG9yICkge1xuXG5cdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuUXVhdGVybmlvbjogLm11bHRpcGx5VmVjdG9yMygpIGhhcyBiZWVuIHJlbW92ZWQuIFVzZSBpcyBub3cgdmVjdG9yLmFwcGx5UXVhdGVybmlvbiggcXVhdGVybmlvbiApIGluc3RlYWQuJyApO1xuXHRcdHJldHVybiB2ZWN0b3IuYXBwbHlRdWF0ZXJuaW9uKCB0aGlzICk7XG5cblx0fSxcblxuXHRzbGVycDogZnVuY3Rpb24gKCBxYiwgdCApIHtcblxuXHRcdGlmICggdCA9PT0gMCApIHJldHVybiB0aGlzO1xuXHRcdGlmICggdCA9PT0gMSApIHJldHVybiB0aGlzLmNvcHkoIHFiICk7XG5cblx0XHR2YXIgeCA9IHRoaXMuX3gsIHkgPSB0aGlzLl95LCB6ID0gdGhpcy5feiwgdyA9IHRoaXMuX3c7XG5cblx0XHQvLyBodHRwOi8vd3d3LmV1Y2xpZGVhbnNwYWNlLmNvbS9tYXRocy9hbGdlYnJhL3JlYWxOb3JtZWRBbGdlYnJhL3F1YXRlcm5pb25zL3NsZXJwL1xuXG5cdFx0dmFyIGNvc0hhbGZUaGV0YSA9IHcgKiBxYi5fdyArIHggKiBxYi5feCArIHkgKiBxYi5feSArIHogKiBxYi5fejtcblxuXHRcdGlmICggY29zSGFsZlRoZXRhIDwgMCApIHtcblxuXHRcdFx0dGhpcy5fdyA9IC0gcWIuX3c7XG5cdFx0XHR0aGlzLl94ID0gLSBxYi5feDtcblx0XHRcdHRoaXMuX3kgPSAtIHFiLl95O1xuXHRcdFx0dGhpcy5feiA9IC0gcWIuX3o7XG5cblx0XHRcdGNvc0hhbGZUaGV0YSA9IC0gY29zSGFsZlRoZXRhO1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0dGhpcy5jb3B5KCBxYiApO1xuXG5cdFx0fVxuXG5cdFx0aWYgKCBjb3NIYWxmVGhldGEgPj0gMS4wICkge1xuXG5cdFx0XHR0aGlzLl93ID0gdztcblx0XHRcdHRoaXMuX3ggPSB4O1xuXHRcdFx0dGhpcy5feSA9IHk7XG5cdFx0XHR0aGlzLl96ID0gejtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHR9XG5cblx0XHR2YXIgaGFsZlRoZXRhID0gTWF0aC5hY29zKCBjb3NIYWxmVGhldGEgKTtcblx0XHR2YXIgc2luSGFsZlRoZXRhID0gTWF0aC5zcXJ0KCAxLjAgLSBjb3NIYWxmVGhldGEgKiBjb3NIYWxmVGhldGEgKTtcblxuXHRcdGlmICggTWF0aC5hYnMoIHNpbkhhbGZUaGV0YSApIDwgMC4wMDEgKSB7XG5cblx0XHRcdHRoaXMuX3cgPSAwLjUgKiAoIHcgKyB0aGlzLl93ICk7XG5cdFx0XHR0aGlzLl94ID0gMC41ICogKCB4ICsgdGhpcy5feCApO1xuXHRcdFx0dGhpcy5feSA9IDAuNSAqICggeSArIHRoaXMuX3kgKTtcblx0XHRcdHRoaXMuX3ogPSAwLjUgKiAoIHogKyB0aGlzLl96ICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXG5cdFx0fVxuXG5cdFx0dmFyIHJhdGlvQSA9IE1hdGguc2luKCAoIDEgLSB0ICkgKiBoYWxmVGhldGEgKSAvIHNpbkhhbGZUaGV0YSxcblx0XHRyYXRpb0IgPSBNYXRoLnNpbiggdCAqIGhhbGZUaGV0YSApIC8gc2luSGFsZlRoZXRhO1xuXG5cdFx0dGhpcy5fdyA9ICggdyAqIHJhdGlvQSArIHRoaXMuX3cgKiByYXRpb0IgKTtcblx0XHR0aGlzLl94ID0gKCB4ICogcmF0aW9BICsgdGhpcy5feCAqIHJhdGlvQiApO1xuXHRcdHRoaXMuX3kgPSAoIHkgKiByYXRpb0EgKyB0aGlzLl95ICogcmF0aW9CICk7XG5cdFx0dGhpcy5feiA9ICggeiAqIHJhdGlvQSArIHRoaXMuX3ogKiByYXRpb0IgKTtcblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRlcXVhbHM6IGZ1bmN0aW9uICggcXVhdGVybmlvbiApIHtcblxuXHRcdHJldHVybiAoIHF1YXRlcm5pb24uX3ggPT09IHRoaXMuX3ggKSAmJiAoIHF1YXRlcm5pb24uX3kgPT09IHRoaXMuX3kgKSAmJiAoIHF1YXRlcm5pb24uX3ogPT09IHRoaXMuX3ogKSAmJiAoIHF1YXRlcm5pb24uX3cgPT09IHRoaXMuX3cgKTtcblxuXHR9LFxuXG5cdGZyb21BcnJheTogZnVuY3Rpb24gKCBhcnJheSwgb2Zmc2V0ICkge1xuXG5cdFx0aWYgKCBvZmZzZXQgPT09IHVuZGVmaW5lZCApIG9mZnNldCA9IDA7XG5cblx0XHR0aGlzLl94ID0gYXJyYXlbIG9mZnNldCBdO1xuXHRcdHRoaXMuX3kgPSBhcnJheVsgb2Zmc2V0ICsgMSBdO1xuXHRcdHRoaXMuX3ogPSBhcnJheVsgb2Zmc2V0ICsgMiBdO1xuXHRcdHRoaXMuX3cgPSBhcnJheVsgb2Zmc2V0ICsgMyBdO1xuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHRvQXJyYXk6IGZ1bmN0aW9uICggYXJyYXksIG9mZnNldCApIHtcblxuXHRcdGlmICggYXJyYXkgPT09IHVuZGVmaW5lZCApIGFycmF5ID0gW107XG5cdFx0aWYgKCBvZmZzZXQgPT09IHVuZGVmaW5lZCApIG9mZnNldCA9IDA7XG5cblx0XHRhcnJheVsgb2Zmc2V0IF0gPSB0aGlzLl94O1xuXHRcdGFycmF5WyBvZmZzZXQgKyAxIF0gPSB0aGlzLl95O1xuXHRcdGFycmF5WyBvZmZzZXQgKyAyIF0gPSB0aGlzLl96O1xuXHRcdGFycmF5WyBvZmZzZXQgKyAzIF0gPSB0aGlzLl93O1xuXG5cdFx0cmV0dXJuIGFycmF5O1xuXG5cdH0sXG5cblx0b25DaGFuZ2U6IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0b25DaGFuZ2VDYWxsYmFjazogZnVuY3Rpb24gKCkge30sXG5cblx0Y2xvbmU6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBuZXcgVEhSRUUuUXVhdGVybmlvbiggdGhpcy5feCwgdGhpcy5feSwgdGhpcy5feiwgdGhpcy5fdyApO1xuXG5cdH1cblxufTtcblxuVEhSRUUuUXVhdGVybmlvbi5zbGVycCA9IGZ1bmN0aW9uICggcWEsIHFiLCBxbSwgdCApIHtcblxuXHRyZXR1cm4gcW0uY29weSggcWEgKS5zbGVycCggcWIsIHQgKTtcblxufVxuXG4vKioqIEVORCBRdWF0ZXJuaW9uICoqKi9cbi8qKiogU1RBUlQgVmVjdG9yMiAqKiovXG4vKipcbiAqIEBhdXRob3IgbXJkb29iIC8gaHR0cDovL21yZG9vYi5jb20vXG4gKiBAYXV0aG9yIHBoaWxvZ2IgLyBodHRwOi8vYmxvZy50aGVqaXQub3JnL1xuICogQGF1dGhvciBlZ3JhZXRoZXIgLyBodHRwOi8vZWdyYWV0aGVyLmNvbS9cbiAqIEBhdXRob3Igeno4NSAvIGh0dHA6Ly93d3cubGFiNGdhbWVzLm5ldC96ejg1L2Jsb2dcbiAqL1xuXG5USFJFRS5WZWN0b3IyID0gZnVuY3Rpb24gKCB4LCB5ICkge1xuXG5cdHRoaXMueCA9IHggfHwgMDtcblx0dGhpcy55ID0geSB8fCAwO1xuXG59O1xuXG5USFJFRS5WZWN0b3IyLnByb3RvdHlwZSA9IHtcblxuXHRjb25zdHJ1Y3RvcjogVEhSRUUuVmVjdG9yMixcblxuXHRzZXQ6IGZ1bmN0aW9uICggeCwgeSApIHtcblxuXHRcdHRoaXMueCA9IHg7XG5cdFx0dGhpcy55ID0geTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0WDogZnVuY3Rpb24gKCB4ICkge1xuXG5cdFx0dGhpcy54ID0geDtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0WTogZnVuY3Rpb24gKCB5ICkge1xuXG5cdFx0dGhpcy55ID0geTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0Q29tcG9uZW50OiBmdW5jdGlvbiAoIGluZGV4LCB2YWx1ZSApIHtcblxuXHRcdHN3aXRjaCAoIGluZGV4ICkge1xuXG5cdFx0XHRjYXNlIDA6IHRoaXMueCA9IHZhbHVlOyBicmVhaztcblx0XHRcdGNhc2UgMTogdGhpcy55ID0gdmFsdWU7IGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCAnaW5kZXggaXMgb3V0IG9mIHJhbmdlOiAnICsgaW5kZXggKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdGdldENvbXBvbmVudDogZnVuY3Rpb24gKCBpbmRleCApIHtcblxuXHRcdHN3aXRjaCAoIGluZGV4ICkge1xuXG5cdFx0XHRjYXNlIDA6IHJldHVybiB0aGlzLng7XG5cdFx0XHRjYXNlIDE6IHJldHVybiB0aGlzLnk7XG5cdFx0XHRkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoICdpbmRleCBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBpbmRleCApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Y29weTogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0dGhpcy54ID0gdi54O1xuXHRcdHRoaXMueSA9IHYueTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YWRkOiBmdW5jdGlvbiAoIHYsIHcgKSB7XG5cblx0XHRpZiAoIHcgIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuVmVjdG9yMjogLmFkZCgpIG5vdyBvbmx5IGFjY2VwdHMgb25lIGFyZ3VtZW50LiBVc2UgLmFkZFZlY3RvcnMoIGEsIGIgKSBpbnN0ZWFkLicgKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFZlY3RvcnMoIHYsIHcgKTtcblxuXHRcdH1cblxuXHRcdHRoaXMueCArPSB2Lng7XG5cdFx0dGhpcy55ICs9IHYueTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YWRkVmVjdG9yczogZnVuY3Rpb24gKCBhLCBiICkge1xuXG5cdFx0dGhpcy54ID0gYS54ICsgYi54O1xuXHRcdHRoaXMueSA9IGEueSArIGIueTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YWRkU2NhbGFyOiBmdW5jdGlvbiAoIHMgKSB7XG5cblx0XHR0aGlzLnggKz0gcztcblx0XHR0aGlzLnkgKz0gcztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c3ViOiBmdW5jdGlvbiAoIHYsIHcgKSB7XG5cblx0XHRpZiAoIHcgIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuVmVjdG9yMjogLnN1YigpIG5vdyBvbmx5IGFjY2VwdHMgb25lIGFyZ3VtZW50LiBVc2UgLnN1YlZlY3RvcnMoIGEsIGIgKSBpbnN0ZWFkLicgKTtcblx0XHRcdHJldHVybiB0aGlzLnN1YlZlY3RvcnMoIHYsIHcgKTtcblxuXHRcdH1cblxuXHRcdHRoaXMueCAtPSB2Lng7XG5cdFx0dGhpcy55IC09IHYueTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c3ViVmVjdG9yczogZnVuY3Rpb24gKCBhLCBiICkge1xuXG5cdFx0dGhpcy54ID0gYS54IC0gYi54O1xuXHRcdHRoaXMueSA9IGEueSAtIGIueTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bXVsdGlwbHk6IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdHRoaXMueCAqPSB2Lng7XG5cdFx0dGhpcy55ICo9IHYueTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bXVsdGlwbHlTY2FsYXI6IGZ1bmN0aW9uICggcyApIHtcblxuXHRcdHRoaXMueCAqPSBzO1xuXHRcdHRoaXMueSAqPSBzO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRkaXZpZGU6IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdHRoaXMueCAvPSB2Lng7XG5cdFx0dGhpcy55IC89IHYueTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0ZGl2aWRlU2NhbGFyOiBmdW5jdGlvbiAoIHNjYWxhciApIHtcblxuXHRcdGlmICggc2NhbGFyICE9PSAwICkge1xuXG5cdFx0XHR2YXIgaW52U2NhbGFyID0gMSAvIHNjYWxhcjtcblxuXHRcdFx0dGhpcy54ICo9IGludlNjYWxhcjtcblx0XHRcdHRoaXMueSAqPSBpbnZTY2FsYXI7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHR0aGlzLnggPSAwO1xuXHRcdFx0dGhpcy55ID0gMDtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bWluOiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRpZiAoIHRoaXMueCA+IHYueCApIHtcblxuXHRcdFx0dGhpcy54ID0gdi54O1xuXG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzLnkgPiB2LnkgKSB7XG5cblx0XHRcdHRoaXMueSA9IHYueTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bWF4OiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRpZiAoIHRoaXMueCA8IHYueCApIHtcblxuXHRcdFx0dGhpcy54ID0gdi54O1xuXG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzLnkgPCB2LnkgKSB7XG5cblx0XHRcdHRoaXMueSA9IHYueTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0Y2xhbXA6IGZ1bmN0aW9uICggbWluLCBtYXggKSB7XG5cblx0XHQvLyBUaGlzIGZ1bmN0aW9uIGFzc3VtZXMgbWluIDwgbWF4LCBpZiB0aGlzIGFzc3VtcHRpb24gaXNuJ3QgdHJ1ZSBpdCB3aWxsIG5vdCBvcGVyYXRlIGNvcnJlY3RseVxuXG5cdFx0aWYgKCB0aGlzLnggPCBtaW4ueCApIHtcblxuXHRcdFx0dGhpcy54ID0gbWluLng7XG5cblx0XHR9IGVsc2UgaWYgKCB0aGlzLnggPiBtYXgueCApIHtcblxuXHRcdFx0dGhpcy54ID0gbWF4Lng7XG5cblx0XHR9XG5cblx0XHRpZiAoIHRoaXMueSA8IG1pbi55ICkge1xuXG5cdFx0XHR0aGlzLnkgPSBtaW4ueTtcblxuXHRcdH0gZWxzZSBpZiAoIHRoaXMueSA+IG1heC55ICkge1xuXG5cdFx0XHR0aGlzLnkgPSBtYXgueTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGNsYW1wU2NhbGFyOiAoIGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBtaW4sIG1heDtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIG1pblZhbCwgbWF4VmFsICkge1xuXG5cdFx0XHRpZiAoIG1pbiA9PT0gdW5kZWZpbmVkICkge1xuXG5cdFx0XHRcdG1pbiA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG5cdFx0XHRcdG1heCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG5cblx0XHRcdH1cblxuXHRcdFx0bWluLnNldCggbWluVmFsLCBtaW5WYWwgKTtcblx0XHRcdG1heC5zZXQoIG1heFZhbCwgbWF4VmFsICk7XG5cblx0XHRcdHJldHVybiB0aGlzLmNsYW1wKCBtaW4sIG1heCApO1xuXG5cdFx0fTtcblxuXHR9ICkoKSxcblxuXHRmbG9vcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gTWF0aC5mbG9vciggdGhpcy54ICk7XG5cdFx0dGhpcy55ID0gTWF0aC5mbG9vciggdGhpcy55ICk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGNlaWw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHRoaXMueCA9IE1hdGguY2VpbCggdGhpcy54ICk7XG5cdFx0dGhpcy55ID0gTWF0aC5jZWlsKCB0aGlzLnkgKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0cm91bmQ6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHRoaXMueCA9IE1hdGgucm91bmQoIHRoaXMueCApO1xuXHRcdHRoaXMueSA9IE1hdGgucm91bmQoIHRoaXMueSApO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRyb3VuZFRvWmVybzogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gKCB0aGlzLnggPCAwICkgPyBNYXRoLmNlaWwoIHRoaXMueCApIDogTWF0aC5mbG9vciggdGhpcy54ICk7XG5cdFx0dGhpcy55ID0gKCB0aGlzLnkgPCAwICkgPyBNYXRoLmNlaWwoIHRoaXMueSApIDogTWF0aC5mbG9vciggdGhpcy55ICk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdG5lZ2F0ZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gLSB0aGlzLng7XG5cdFx0dGhpcy55ID0gLSB0aGlzLnk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGRvdDogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0cmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcblxuXHR9LFxuXG5cdGxlbmd0aFNxOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xuXG5cdH0sXG5cblx0bGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gTWF0aC5zcXJ0KCB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkgKTtcblxuXHR9LFxuXG5cdG5vcm1hbGl6ZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuZGl2aWRlU2NhbGFyKCB0aGlzLmxlbmd0aCgpICk7XG5cblx0fSxcblxuXHRkaXN0YW5jZVRvOiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRyZXR1cm4gTWF0aC5zcXJ0KCB0aGlzLmRpc3RhbmNlVG9TcXVhcmVkKCB2ICkgKTtcblxuXHR9LFxuXG5cdGRpc3RhbmNlVG9TcXVhcmVkOiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHR2YXIgZHggPSB0aGlzLnggLSB2LngsIGR5ID0gdGhpcy55IC0gdi55O1xuXHRcdHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcblxuXHR9LFxuXG5cdHNldExlbmd0aDogZnVuY3Rpb24gKCBsICkge1xuXG5cdFx0dmFyIG9sZExlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XG5cblx0XHRpZiAoIG9sZExlbmd0aCAhPT0gMCAmJiBsICE9PSBvbGRMZW5ndGggKSB7XG5cblx0XHRcdHRoaXMubXVsdGlwbHlTY2FsYXIoIGwgLyBvbGRMZW5ndGggKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGxlcnA6IGZ1bmN0aW9uICggdiwgYWxwaGEgKSB7XG5cblx0XHR0aGlzLnggKz0gKCB2LnggLSB0aGlzLnggKSAqIGFscGhhO1xuXHRcdHRoaXMueSArPSAoIHYueSAtIHRoaXMueSApICogYWxwaGE7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGVxdWFsczogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0cmV0dXJuICggKCB2LnggPT09IHRoaXMueCApICYmICggdi55ID09PSB0aGlzLnkgKSApO1xuXG5cdH0sXG5cblx0ZnJvbUFycmF5OiBmdW5jdGlvbiAoIGFycmF5LCBvZmZzZXQgKSB7XG5cblx0XHRpZiAoIG9mZnNldCA9PT0gdW5kZWZpbmVkICkgb2Zmc2V0ID0gMDtcblxuXHRcdHRoaXMueCA9IGFycmF5WyBvZmZzZXQgXTtcblx0XHR0aGlzLnkgPSBhcnJheVsgb2Zmc2V0ICsgMSBdO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHR0b0FycmF5OiBmdW5jdGlvbiAoIGFycmF5LCBvZmZzZXQgKSB7XG5cblx0XHRpZiAoIGFycmF5ID09PSB1bmRlZmluZWQgKSBhcnJheSA9IFtdO1xuXHRcdGlmICggb2Zmc2V0ID09PSB1bmRlZmluZWQgKSBvZmZzZXQgPSAwO1xuXG5cdFx0YXJyYXlbIG9mZnNldCBdID0gdGhpcy54O1xuXHRcdGFycmF5WyBvZmZzZXQgKyAxIF0gPSB0aGlzLnk7XG5cblx0XHRyZXR1cm4gYXJyYXk7XG5cblx0fSxcblxuXHRmcm9tQXR0cmlidXRlOiBmdW5jdGlvbiAoIGF0dHJpYnV0ZSwgaW5kZXgsIG9mZnNldCApIHtcblxuXHQgICAgaWYgKCBvZmZzZXQgPT09IHVuZGVmaW5lZCApIG9mZnNldCA9IDA7XG5cblx0ICAgIGluZGV4ID0gaW5kZXggKiBhdHRyaWJ1dGUuaXRlbVNpemUgKyBvZmZzZXQ7XG5cblx0ICAgIHRoaXMueCA9IGF0dHJpYnV0ZS5hcnJheVsgaW5kZXggXTtcblx0ICAgIHRoaXMueSA9IGF0dHJpYnV0ZS5hcnJheVsgaW5kZXggKyAxIF07XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0Y2xvbmU6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMiggdGhpcy54LCB0aGlzLnkgKTtcblxuXHR9XG5cbn07XG4vKioqIEVORCBWZWN0b3IyICoqKi9cbi8qKiogU1RBUlQgVmVjdG9yMyAqKiovXG5cbi8qKlxuICogQGF1dGhvciBtcmRvb2IgLyBodHRwOi8vbXJkb29iLmNvbS9cbiAqIEBhdXRob3IgKmtpbGUgLyBodHRwOi8va2lsZS5zdHJhdmFnYW56YS5vcmcvXG4gKiBAYXV0aG9yIHBoaWxvZ2IgLyBodHRwOi8vYmxvZy50aGVqaXQub3JnL1xuICogQGF1dGhvciBtaWthZWwgZW10aW5nZXIgLyBodHRwOi8vZ29tby5zZS9cbiAqIEBhdXRob3IgZWdyYWV0aGVyIC8gaHR0cDovL2VncmFldGhlci5jb20vXG4gKiBAYXV0aG9yIFdlc3RMYW5nbGV5IC8gaHR0cDovL2dpdGh1Yi5jb20vV2VzdExhbmdsZXlcbiAqL1xuXG5USFJFRS5WZWN0b3IzID0gZnVuY3Rpb24gKCB4LCB5LCB6ICkge1xuXG5cdHRoaXMueCA9IHggfHwgMDtcblx0dGhpcy55ID0geSB8fCAwO1xuXHR0aGlzLnogPSB6IHx8IDA7XG5cbn07XG5cblRIUkVFLlZlY3RvcjMucHJvdG90eXBlID0ge1xuXG5cdGNvbnN0cnVjdG9yOiBUSFJFRS5WZWN0b3IzLFxuXG5cdHNldDogZnVuY3Rpb24gKCB4LCB5LCB6ICkge1xuXG5cdFx0dGhpcy54ID0geDtcblx0XHR0aGlzLnkgPSB5O1xuXHRcdHRoaXMueiA9IHo7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldFg6IGZ1bmN0aW9uICggeCApIHtcblxuXHRcdHRoaXMueCA9IHg7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldFk6IGZ1bmN0aW9uICggeSApIHtcblxuXHRcdHRoaXMueSA9IHk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldFo6IGZ1bmN0aW9uICggeiApIHtcblxuXHRcdHRoaXMueiA9IHo7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldENvbXBvbmVudDogZnVuY3Rpb24gKCBpbmRleCwgdmFsdWUgKSB7XG5cblx0XHRzd2l0Y2ggKCBpbmRleCApIHtcblxuXHRcdFx0Y2FzZSAwOiB0aGlzLnggPSB2YWx1ZTsgYnJlYWs7XG5cdFx0XHRjYXNlIDE6IHRoaXMueSA9IHZhbHVlOyBicmVhaztcblx0XHRcdGNhc2UgMjogdGhpcy56ID0gdmFsdWU7IGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKCAnaW5kZXggaXMgb3V0IG9mIHJhbmdlOiAnICsgaW5kZXggKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdGdldENvbXBvbmVudDogZnVuY3Rpb24gKCBpbmRleCApIHtcblxuXHRcdHN3aXRjaCAoIGluZGV4ICkge1xuXG5cdFx0XHRjYXNlIDA6IHJldHVybiB0aGlzLng7XG5cdFx0XHRjYXNlIDE6IHJldHVybiB0aGlzLnk7XG5cdFx0XHRjYXNlIDI6IHJldHVybiB0aGlzLno7XG5cdFx0XHRkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoICdpbmRleCBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBpbmRleCApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Y29weTogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0dGhpcy54ID0gdi54O1xuXHRcdHRoaXMueSA9IHYueTtcblx0XHR0aGlzLnogPSB2Lno7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGFkZDogZnVuY3Rpb24gKCB2LCB3ICkge1xuXG5cdFx0aWYgKCB3ICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdGNvbnNvbGUud2FybiggJ1RIUkVFLlZlY3RvcjM6IC5hZGQoKSBub3cgb25seSBhY2NlcHRzIG9uZSBhcmd1bWVudC4gVXNlIC5hZGRWZWN0b3JzKCBhLCBiICkgaW5zdGVhZC4nICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hZGRWZWN0b3JzKCB2LCB3ICk7XG5cblx0XHR9XG5cblx0XHR0aGlzLnggKz0gdi54O1xuXHRcdHRoaXMueSArPSB2Lnk7XG5cdFx0dGhpcy56ICs9IHYuejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YWRkU2NhbGFyOiBmdW5jdGlvbiAoIHMgKSB7XG5cblx0XHR0aGlzLnggKz0gcztcblx0XHR0aGlzLnkgKz0gcztcblx0XHR0aGlzLnogKz0gcztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YWRkVmVjdG9yczogZnVuY3Rpb24gKCBhLCBiICkge1xuXG5cdFx0dGhpcy54ID0gYS54ICsgYi54O1xuXHRcdHRoaXMueSA9IGEueSArIGIueTtcblx0XHR0aGlzLnogPSBhLnogKyBiLno7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHN1YjogZnVuY3Rpb24gKCB2LCB3ICkge1xuXG5cdFx0aWYgKCB3ICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdGNvbnNvbGUud2FybiggJ1RIUkVFLlZlY3RvcjM6IC5zdWIoKSBub3cgb25seSBhY2NlcHRzIG9uZSBhcmd1bWVudC4gVXNlIC5zdWJWZWN0b3JzKCBhLCBiICkgaW5zdGVhZC4nICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5zdWJWZWN0b3JzKCB2LCB3ICk7XG5cblx0XHR9XG5cblx0XHR0aGlzLnggLT0gdi54O1xuXHRcdHRoaXMueSAtPSB2Lnk7XG5cdFx0dGhpcy56IC09IHYuejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c3ViVmVjdG9yczogZnVuY3Rpb24gKCBhLCBiICkge1xuXG5cdFx0dGhpcy54ID0gYS54IC0gYi54O1xuXHRcdHRoaXMueSA9IGEueSAtIGIueTtcblx0XHR0aGlzLnogPSBhLnogLSBiLno7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdG11bHRpcGx5OiBmdW5jdGlvbiAoIHYsIHcgKSB7XG5cblx0XHRpZiAoIHcgIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuVmVjdG9yMzogLm11bHRpcGx5KCkgbm93IG9ubHkgYWNjZXB0cyBvbmUgYXJndW1lbnQuIFVzZSAubXVsdGlwbHlWZWN0b3JzKCBhLCBiICkgaW5zdGVhZC4nICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5tdWx0aXBseVZlY3RvcnMoIHYsIHcgKTtcblxuXHRcdH1cblxuXHRcdHRoaXMueCAqPSB2Lng7XG5cdFx0dGhpcy55ICo9IHYueTtcblx0XHR0aGlzLnogKj0gdi56O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtdWx0aXBseVNjYWxhcjogZnVuY3Rpb24gKCBzY2FsYXIgKSB7XG5cblx0XHR0aGlzLnggKj0gc2NhbGFyO1xuXHRcdHRoaXMueSAqPSBzY2FsYXI7XG5cdFx0dGhpcy56ICo9IHNjYWxhcjtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bXVsdGlwbHlWZWN0b3JzOiBmdW5jdGlvbiAoIGEsIGIgKSB7XG5cblx0XHR0aGlzLnggPSBhLnggKiBiLng7XG5cdFx0dGhpcy55ID0gYS55ICogYi55O1xuXHRcdHRoaXMueiA9IGEueiAqIGIuejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YXBwbHlFdWxlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIHF1YXRlcm5pb247XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCBldWxlciApIHtcblxuXHRcdFx0aWYgKCBldWxlciBpbnN0YW5jZW9mIFRIUkVFLkV1bGVyID09PSBmYWxzZSApIHtcblxuXHRcdFx0XHRjb25zb2xlLmVycm9yKCAnVEhSRUUuVmVjdG9yMzogLmFwcGx5RXVsZXIoKSBub3cgZXhwZWN0cyBhIEV1bGVyIHJvdGF0aW9uIHJhdGhlciB0aGFuIGEgVmVjdG9yMyBhbmQgb3JkZXIuJyApO1xuXG5cdFx0XHR9XG5cblx0XHRcdGlmICggcXVhdGVybmlvbiA9PT0gdW5kZWZpbmVkICkgcXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cblx0XHRcdHRoaXMuYXBwbHlRdWF0ZXJuaW9uKCBxdWF0ZXJuaW9uLnNldEZyb21FdWxlciggZXVsZXIgKSApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdGFwcGx5QXhpc0FuZ2xlOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgcXVhdGVybmlvbjtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIGF4aXMsIGFuZ2xlICkge1xuXG5cdFx0XHRpZiAoIHF1YXRlcm5pb24gPT09IHVuZGVmaW5lZCApIHF1YXRlcm5pb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXG5cdFx0XHR0aGlzLmFwcGx5UXVhdGVybmlvbiggcXVhdGVybmlvbi5zZXRGcm9tQXhpc0FuZ2xlKCBheGlzLCBhbmdsZSApICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXG5cdFx0fTtcblxuXHR9KCksXG5cblx0YXBwbHlNYXRyaXgzOiBmdW5jdGlvbiAoIG0gKSB7XG5cblx0XHR2YXIgeCA9IHRoaXMueDtcblx0XHR2YXIgeSA9IHRoaXMueTtcblx0XHR2YXIgeiA9IHRoaXMuejtcblxuXHRcdHZhciBlID0gbS5lbGVtZW50cztcblxuXHRcdHRoaXMueCA9IGVbIDAgXSAqIHggKyBlWyAzIF0gKiB5ICsgZVsgNiBdICogejtcblx0XHR0aGlzLnkgPSBlWyAxIF0gKiB4ICsgZVsgNCBdICogeSArIGVbIDcgXSAqIHo7XG5cdFx0dGhpcy56ID0gZVsgMiBdICogeCArIGVbIDUgXSAqIHkgKyBlWyA4IF0gKiB6O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRhcHBseU1hdHJpeDQ6IGZ1bmN0aW9uICggbSApIHtcblxuXHRcdC8vIGlucHV0OiBUSFJFRS5NYXRyaXg0IGFmZmluZSBtYXRyaXhcblxuXHRcdHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56O1xuXG5cdFx0dmFyIGUgPSBtLmVsZW1lbnRzO1xuXG5cdFx0dGhpcy54ID0gZVsgMCBdICogeCArIGVbIDQgXSAqIHkgKyBlWyA4IF0gICogeiArIGVbIDEyIF07XG5cdFx0dGhpcy55ID0gZVsgMSBdICogeCArIGVbIDUgXSAqIHkgKyBlWyA5IF0gICogeiArIGVbIDEzIF07XG5cdFx0dGhpcy56ID0gZVsgMiBdICogeCArIGVbIDYgXSAqIHkgKyBlWyAxMCBdICogeiArIGVbIDE0IF07XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGFwcGx5UHJvamVjdGlvbjogZnVuY3Rpb24gKCBtICkge1xuXG5cdFx0Ly8gaW5wdXQ6IFRIUkVFLk1hdHJpeDQgcHJvamVjdGlvbiBtYXRyaXhcblxuXHRcdHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56O1xuXG5cdFx0dmFyIGUgPSBtLmVsZW1lbnRzO1xuXHRcdHZhciBkID0gMSAvICggZVsgMyBdICogeCArIGVbIDcgXSAqIHkgKyBlWyAxMSBdICogeiArIGVbIDE1IF0gKTsgLy8gcGVyc3BlY3RpdmUgZGl2aWRlXG5cblx0XHR0aGlzLnggPSAoIGVbIDAgXSAqIHggKyBlWyA0IF0gKiB5ICsgZVsgOCBdICAqIHogKyBlWyAxMiBdICkgKiBkO1xuXHRcdHRoaXMueSA9ICggZVsgMSBdICogeCArIGVbIDUgXSAqIHkgKyBlWyA5IF0gICogeiArIGVbIDEzIF0gKSAqIGQ7XG5cdFx0dGhpcy56ID0gKCBlWyAyIF0gKiB4ICsgZVsgNiBdICogeSArIGVbIDEwIF0gKiB6ICsgZVsgMTQgXSApICogZDtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YXBwbHlRdWF0ZXJuaW9uOiBmdW5jdGlvbiAoIHEgKSB7XG5cblx0XHR2YXIgeCA9IHRoaXMueDtcblx0XHR2YXIgeSA9IHRoaXMueTtcblx0XHR2YXIgeiA9IHRoaXMuejtcblxuXHRcdHZhciBxeCA9IHEueDtcblx0XHR2YXIgcXkgPSBxLnk7XG5cdFx0dmFyIHF6ID0gcS56O1xuXHRcdHZhciBxdyA9IHEudztcblxuXHRcdC8vIGNhbGN1bGF0ZSBxdWF0ICogdmVjdG9yXG5cblx0XHR2YXIgaXggPSAgcXcgKiB4ICsgcXkgKiB6IC0gcXogKiB5O1xuXHRcdHZhciBpeSA9ICBxdyAqIHkgKyBxeiAqIHggLSBxeCAqIHo7XG5cdFx0dmFyIGl6ID0gIHF3ICogeiArIHF4ICogeSAtIHF5ICogeDtcblx0XHR2YXIgaXcgPSAtIHF4ICogeCAtIHF5ICogeSAtIHF6ICogejtcblxuXHRcdC8vIGNhbGN1bGF0ZSByZXN1bHQgKiBpbnZlcnNlIHF1YXRcblxuXHRcdHRoaXMueCA9IGl4ICogcXcgKyBpdyAqIC0gcXggKyBpeSAqIC0gcXogLSBpeiAqIC0gcXk7XG5cdFx0dGhpcy55ID0gaXkgKiBxdyArIGl3ICogLSBxeSArIGl6ICogLSBxeCAtIGl4ICogLSBxejtcblx0XHR0aGlzLnogPSBpeiAqIHF3ICsgaXcgKiAtIHF6ICsgaXggKiAtIHF5IC0gaXkgKiAtIHF4O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRwcm9qZWN0OiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgbWF0cml4O1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICggY2FtZXJhICkge1xuXG5cdFx0XHRpZiAoIG1hdHJpeCA9PT0gdW5kZWZpbmVkICkgbWF0cml4ID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcblxuXHRcdFx0bWF0cml4Lm11bHRpcGx5TWF0cmljZXMoIGNhbWVyYS5wcm9qZWN0aW9uTWF0cml4LCBtYXRyaXguZ2V0SW52ZXJzZSggY2FtZXJhLm1hdHJpeFdvcmxkICkgKTtcblx0XHRcdHJldHVybiB0aGlzLmFwcGx5UHJvamVjdGlvbiggbWF0cml4ICk7XG5cblx0XHR9O1xuXG5cdH0oKSxcblxuXHR1bnByb2plY3Q6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBtYXRyaXg7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCBjYW1lcmEgKSB7XG5cblx0XHRcdGlmICggbWF0cml4ID09PSB1bmRlZmluZWQgKSBtYXRyaXggPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuXG5cdFx0XHRtYXRyaXgubXVsdGlwbHlNYXRyaWNlcyggY2FtZXJhLm1hdHJpeFdvcmxkLCBtYXRyaXguZ2V0SW52ZXJzZSggY2FtZXJhLnByb2plY3Rpb25NYXRyaXggKSApO1xuXHRcdFx0cmV0dXJuIHRoaXMuYXBwbHlQcm9qZWN0aW9uKCBtYXRyaXggKTtcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdHRyYW5zZm9ybURpcmVjdGlvbjogZnVuY3Rpb24gKCBtICkge1xuXG5cdFx0Ly8gaW5wdXQ6IFRIUkVFLk1hdHJpeDQgYWZmaW5lIG1hdHJpeFxuXHRcdC8vIHZlY3RvciBpbnRlcnByZXRlZCBhcyBhIGRpcmVjdGlvblxuXG5cdFx0dmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLno7XG5cblx0XHR2YXIgZSA9IG0uZWxlbWVudHM7XG5cblx0XHR0aGlzLnggPSBlWyAwIF0gKiB4ICsgZVsgNCBdICogeSArIGVbIDggXSAgKiB6O1xuXHRcdHRoaXMueSA9IGVbIDEgXSAqIHggKyBlWyA1IF0gKiB5ICsgZVsgOSBdICAqIHo7XG5cdFx0dGhpcy56ID0gZVsgMiBdICogeCArIGVbIDYgXSAqIHkgKyBlWyAxMCBdICogejtcblxuXHRcdHRoaXMubm9ybWFsaXplKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGRpdmlkZTogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0dGhpcy54IC89IHYueDtcblx0XHR0aGlzLnkgLz0gdi55O1xuXHRcdHRoaXMueiAvPSB2Lno7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGRpdmlkZVNjYWxhcjogZnVuY3Rpb24gKCBzY2FsYXIgKSB7XG5cblx0XHRpZiAoIHNjYWxhciAhPT0gMCApIHtcblxuXHRcdFx0dmFyIGludlNjYWxhciA9IDEgLyBzY2FsYXI7XG5cblx0XHRcdHRoaXMueCAqPSBpbnZTY2FsYXI7XG5cdFx0XHR0aGlzLnkgKj0gaW52U2NhbGFyO1xuXHRcdFx0dGhpcy56ICo9IGludlNjYWxhcjtcblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdHRoaXMueCA9IDA7XG5cdFx0XHR0aGlzLnkgPSAwO1xuXHRcdFx0dGhpcy56ID0gMDtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bWluOiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRpZiAoIHRoaXMueCA+IHYueCApIHtcblxuXHRcdFx0dGhpcy54ID0gdi54O1xuXG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzLnkgPiB2LnkgKSB7XG5cblx0XHRcdHRoaXMueSA9IHYueTtcblxuXHRcdH1cblxuXHRcdGlmICggdGhpcy56ID4gdi56ICkge1xuXG5cdFx0XHR0aGlzLnogPSB2Lno7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdG1heDogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0aWYgKCB0aGlzLnggPCB2LnggKSB7XG5cblx0XHRcdHRoaXMueCA9IHYueDtcblxuXHRcdH1cblxuXHRcdGlmICggdGhpcy55IDwgdi55ICkge1xuXG5cdFx0XHR0aGlzLnkgPSB2Lnk7XG5cblx0XHR9XG5cblx0XHRpZiAoIHRoaXMueiA8IHYueiApIHtcblxuXHRcdFx0dGhpcy56ID0gdi56O1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjbGFtcDogZnVuY3Rpb24gKCBtaW4sIG1heCApIHtcblxuXHRcdC8vIFRoaXMgZnVuY3Rpb24gYXNzdW1lcyBtaW4gPCBtYXgsIGlmIHRoaXMgYXNzdW1wdGlvbiBpc24ndCB0cnVlIGl0IHdpbGwgbm90IG9wZXJhdGUgY29ycmVjdGx5XG5cblx0XHRpZiAoIHRoaXMueCA8IG1pbi54ICkge1xuXG5cdFx0XHR0aGlzLnggPSBtaW4ueDtcblxuXHRcdH0gZWxzZSBpZiAoIHRoaXMueCA+IG1heC54ICkge1xuXG5cdFx0XHR0aGlzLnggPSBtYXgueDtcblxuXHRcdH1cblxuXHRcdGlmICggdGhpcy55IDwgbWluLnkgKSB7XG5cblx0XHRcdHRoaXMueSA9IG1pbi55O1xuXG5cdFx0fSBlbHNlIGlmICggdGhpcy55ID4gbWF4LnkgKSB7XG5cblx0XHRcdHRoaXMueSA9IG1heC55O1xuXG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzLnogPCBtaW4ueiApIHtcblxuXHRcdFx0dGhpcy56ID0gbWluLno7XG5cblx0XHR9IGVsc2UgaWYgKCB0aGlzLnogPiBtYXgueiApIHtcblxuXHRcdFx0dGhpcy56ID0gbWF4Lno7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGNsYW1wU2NhbGFyOiAoIGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBtaW4sIG1heDtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIG1pblZhbCwgbWF4VmFsICkge1xuXG5cdFx0XHRpZiAoIG1pbiA9PT0gdW5kZWZpbmVkICkge1xuXG5cdFx0XHRcdG1pbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cdFx0XHRcdG1heCA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cblx0XHRcdH1cblxuXHRcdFx0bWluLnNldCggbWluVmFsLCBtaW5WYWwsIG1pblZhbCApO1xuXHRcdFx0bWF4LnNldCggbWF4VmFsLCBtYXhWYWwsIG1heFZhbCApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcy5jbGFtcCggbWluLCBtYXggKTtcblxuXHRcdH07XG5cblx0fSApKCksXG5cblx0Zmxvb3I6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHRoaXMueCA9IE1hdGguZmxvb3IoIHRoaXMueCApO1xuXHRcdHRoaXMueSA9IE1hdGguZmxvb3IoIHRoaXMueSApO1xuXHRcdHRoaXMueiA9IE1hdGguZmxvb3IoIHRoaXMueiApO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjZWlsOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR0aGlzLnggPSBNYXRoLmNlaWwoIHRoaXMueCApO1xuXHRcdHRoaXMueSA9IE1hdGguY2VpbCggdGhpcy55ICk7XG5cdFx0dGhpcy56ID0gTWF0aC5jZWlsKCB0aGlzLnogKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0cm91bmQ6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHRoaXMueCA9IE1hdGgucm91bmQoIHRoaXMueCApO1xuXHRcdHRoaXMueSA9IE1hdGgucm91bmQoIHRoaXMueSApO1xuXHRcdHRoaXMueiA9IE1hdGgucm91bmQoIHRoaXMueiApO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRyb3VuZFRvWmVybzogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gKCB0aGlzLnggPCAwICkgPyBNYXRoLmNlaWwoIHRoaXMueCApIDogTWF0aC5mbG9vciggdGhpcy54ICk7XG5cdFx0dGhpcy55ID0gKCB0aGlzLnkgPCAwICkgPyBNYXRoLmNlaWwoIHRoaXMueSApIDogTWF0aC5mbG9vciggdGhpcy55ICk7XG5cdFx0dGhpcy56ID0gKCB0aGlzLnogPCAwICkgPyBNYXRoLmNlaWwoIHRoaXMueiApIDogTWF0aC5mbG9vciggdGhpcy56ICk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdG5lZ2F0ZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gLSB0aGlzLng7XG5cdFx0dGhpcy55ID0gLSB0aGlzLnk7XG5cdFx0dGhpcy56ID0gLSB0aGlzLno7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGRvdDogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0cmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueSArIHRoaXMueiAqIHYuejtcblxuXHR9LFxuXG5cdGxlbmd0aFNxOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55ICsgdGhpcy56ICogdGhpcy56O1xuXG5cdH0sXG5cblx0bGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gTWF0aC5zcXJ0KCB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkgKyB0aGlzLnogKiB0aGlzLnogKTtcblxuXHR9LFxuXG5cdGxlbmd0aE1hbmhhdHRhbjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIE1hdGguYWJzKCB0aGlzLnggKSArIE1hdGguYWJzKCB0aGlzLnkgKSArIE1hdGguYWJzKCB0aGlzLnogKTtcblxuXHR9LFxuXG5cdG5vcm1hbGl6ZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuZGl2aWRlU2NhbGFyKCB0aGlzLmxlbmd0aCgpICk7XG5cblx0fSxcblxuXHRzZXRMZW5ndGg6IGZ1bmN0aW9uICggbCApIHtcblxuXHRcdHZhciBvbGRMZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xuXG5cdFx0aWYgKCBvbGRMZW5ndGggIT09IDAgJiYgbCAhPT0gb2xkTGVuZ3RoICApIHtcblxuXHRcdFx0dGhpcy5tdWx0aXBseVNjYWxhciggbCAvIG9sZExlbmd0aCApO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bGVycDogZnVuY3Rpb24gKCB2LCBhbHBoYSApIHtcblxuXHRcdHRoaXMueCArPSAoIHYueCAtIHRoaXMueCApICogYWxwaGE7XG5cdFx0dGhpcy55ICs9ICggdi55IC0gdGhpcy55ICkgKiBhbHBoYTtcblx0XHR0aGlzLnogKz0gKCB2LnogLSB0aGlzLnogKSAqIGFscGhhO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjcm9zczogZnVuY3Rpb24gKCB2LCB3ICkge1xuXG5cdFx0aWYgKCB3ICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdGNvbnNvbGUud2FybiggJ1RIUkVFLlZlY3RvcjM6IC5jcm9zcygpIG5vdyBvbmx5IGFjY2VwdHMgb25lIGFyZ3VtZW50LiBVc2UgLmNyb3NzVmVjdG9ycyggYSwgYiApIGluc3RlYWQuJyApO1xuXHRcdFx0cmV0dXJuIHRoaXMuY3Jvc3NWZWN0b3JzKCB2LCB3ICk7XG5cblx0XHR9XG5cblx0XHR2YXIgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgeiA9IHRoaXMuejtcblxuXHRcdHRoaXMueCA9IHkgKiB2LnogLSB6ICogdi55O1xuXHRcdHRoaXMueSA9IHogKiB2LnggLSB4ICogdi56O1xuXHRcdHRoaXMueiA9IHggKiB2LnkgLSB5ICogdi54O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjcm9zc1ZlY3RvcnM6IGZ1bmN0aW9uICggYSwgYiApIHtcblxuXHRcdHZhciBheCA9IGEueCwgYXkgPSBhLnksIGF6ID0gYS56O1xuXHRcdHZhciBieCA9IGIueCwgYnkgPSBiLnksIGJ6ID0gYi56O1xuXG5cdFx0dGhpcy54ID0gYXkgKiBieiAtIGF6ICogYnk7XG5cdFx0dGhpcy55ID0gYXogKiBieCAtIGF4ICogYno7XG5cdFx0dGhpcy56ID0gYXggKiBieSAtIGF5ICogYng7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHByb2plY3RPblZlY3RvcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIHYxLCBkb3Q7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCB2ZWN0b3IgKSB7XG5cblx0XHRcdGlmICggdjEgPT09IHVuZGVmaW5lZCApIHYxID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuXHRcdFx0djEuY29weSggdmVjdG9yICkubm9ybWFsaXplKCk7XG5cblx0XHRcdGRvdCA9IHRoaXMuZG90KCB2MSApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcy5jb3B5KCB2MSApLm11bHRpcGx5U2NhbGFyKCBkb3QgKTtcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdHByb2plY3RPblBsYW5lOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgdjE7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCBwbGFuZU5vcm1hbCApIHtcblxuXHRcdFx0aWYgKCB2MSA9PT0gdW5kZWZpbmVkICkgdjEgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXG5cdFx0XHR2MS5jb3B5KCB0aGlzICkucHJvamVjdE9uVmVjdG9yKCBwbGFuZU5vcm1hbCApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcy5zdWIoIHYxICk7XG5cblx0XHR9XG5cblx0fSgpLFxuXG5cdHJlZmxlY3Q6IGZ1bmN0aW9uICgpIHtcblxuXHRcdC8vIHJlZmxlY3QgaW5jaWRlbnQgdmVjdG9yIG9mZiBwbGFuZSBvcnRob2dvbmFsIHRvIG5vcm1hbFxuXHRcdC8vIG5vcm1hbCBpcyBhc3N1bWVkIHRvIGhhdmUgdW5pdCBsZW5ndGhcblxuXHRcdHZhciB2MTtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIG5vcm1hbCApIHtcblxuXHRcdFx0aWYgKCB2MSA9PT0gdW5kZWZpbmVkICkgdjEgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcy5zdWIoIHYxLmNvcHkoIG5vcm1hbCApLm11bHRpcGx5U2NhbGFyKCAyICogdGhpcy5kb3QoIG5vcm1hbCApICkgKTtcblxuXHRcdH1cblxuXHR9KCksXG5cblx0YW5nbGVUbzogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0dmFyIHRoZXRhID0gdGhpcy5kb3QoIHYgKSAvICggdGhpcy5sZW5ndGgoKSAqIHYubGVuZ3RoKCkgKTtcblxuXHRcdC8vIGNsYW1wLCB0byBoYW5kbGUgbnVtZXJpY2FsIHByb2JsZW1zXG5cblx0XHRyZXR1cm4gTWF0aC5hY29zKCBUSFJFRS5NYXRoLmNsYW1wKCB0aGV0YSwgLSAxLCAxICkgKTtcblxuXHR9LFxuXG5cdGRpc3RhbmNlVG86IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdHJldHVybiBNYXRoLnNxcnQoIHRoaXMuZGlzdGFuY2VUb1NxdWFyZWQoIHYgKSApO1xuXG5cdH0sXG5cblx0ZGlzdGFuY2VUb1NxdWFyZWQ6IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdHZhciBkeCA9IHRoaXMueCAtIHYueDtcblx0XHR2YXIgZHkgPSB0aGlzLnkgLSB2Lnk7XG5cdFx0dmFyIGR6ID0gdGhpcy56IC0gdi56O1xuXG5cdFx0cmV0dXJuIGR4ICogZHggKyBkeSAqIGR5ICsgZHogKiBkejtcblxuXHR9LFxuXG5cdHNldEV1bGVyRnJvbVJvdGF0aW9uTWF0cml4OiBmdW5jdGlvbiAoIG0sIG9yZGVyICkge1xuXG5cdFx0Y29uc29sZS5lcnJvciggJ1RIUkVFLlZlY3RvcjM6IC5zZXRFdWxlckZyb21Sb3RhdGlvbk1hdHJpeCgpIGhhcyBiZWVuIHJlbW92ZWQuIFVzZSBFdWxlci5zZXRGcm9tUm90YXRpb25NYXRyaXgoKSBpbnN0ZWFkLicgKTtcblxuXHR9LFxuXG5cdHNldEV1bGVyRnJvbVF1YXRlcm5pb246IGZ1bmN0aW9uICggcSwgb3JkZXIgKSB7XG5cblx0XHRjb25zb2xlLmVycm9yKCAnVEhSRUUuVmVjdG9yMzogLnNldEV1bGVyRnJvbVF1YXRlcm5pb24oKSBoYXMgYmVlbiByZW1vdmVkLiBVc2UgRXVsZXIuc2V0RnJvbVF1YXRlcm5pb24oKSBpbnN0ZWFkLicgKTtcblxuXHR9LFxuXG5cdGdldFBvc2l0aW9uRnJvbU1hdHJpeDogZnVuY3Rpb24gKCBtICkge1xuXG5cdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuVmVjdG9yMzogLmdldFBvc2l0aW9uRnJvbU1hdHJpeCgpIGhhcyBiZWVuIHJlbmFtZWQgdG8gLnNldEZyb21NYXRyaXhQb3NpdGlvbigpLicgKTtcblxuXHRcdHJldHVybiB0aGlzLnNldEZyb21NYXRyaXhQb3NpdGlvbiggbSApO1xuXG5cdH0sXG5cblx0Z2V0U2NhbGVGcm9tTWF0cml4OiBmdW5jdGlvbiAoIG0gKSB7XG5cblx0XHRjb25zb2xlLndhcm4oICdUSFJFRS5WZWN0b3IzOiAuZ2V0U2NhbGVGcm9tTWF0cml4KCkgaGFzIGJlZW4gcmVuYW1lZCB0byAuc2V0RnJvbU1hdHJpeFNjYWxlKCkuJyApO1xuXG5cdFx0cmV0dXJuIHRoaXMuc2V0RnJvbU1hdHJpeFNjYWxlKCBtICk7XG5cdH0sXG5cblx0Z2V0Q29sdW1uRnJvbU1hdHJpeDogZnVuY3Rpb24gKCBpbmRleCwgbWF0cml4ICkge1xuXG5cdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuVmVjdG9yMzogLmdldENvbHVtbkZyb21NYXRyaXgoKSBoYXMgYmVlbiByZW5hbWVkIHRvIC5zZXRGcm9tTWF0cml4Q29sdW1uKCkuJyApO1xuXG5cdFx0cmV0dXJuIHRoaXMuc2V0RnJvbU1hdHJpeENvbHVtbiggaW5kZXgsIG1hdHJpeCApO1xuXG5cdH0sXG5cblx0c2V0RnJvbU1hdHJpeFBvc2l0aW9uOiBmdW5jdGlvbiAoIG0gKSB7XG5cblx0XHR0aGlzLnggPSBtLmVsZW1lbnRzWyAxMiBdO1xuXHRcdHRoaXMueSA9IG0uZWxlbWVudHNbIDEzIF07XG5cdFx0dGhpcy56ID0gbS5lbGVtZW50c1sgMTQgXTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0RnJvbU1hdHJpeFNjYWxlOiBmdW5jdGlvbiAoIG0gKSB7XG5cblx0XHR2YXIgc3ggPSB0aGlzLnNldCggbS5lbGVtZW50c1sgMCBdLCBtLmVsZW1lbnRzWyAxIF0sIG0uZWxlbWVudHNbICAyIF0gKS5sZW5ndGgoKTtcblx0XHR2YXIgc3kgPSB0aGlzLnNldCggbS5lbGVtZW50c1sgNCBdLCBtLmVsZW1lbnRzWyA1IF0sIG0uZWxlbWVudHNbICA2IF0gKS5sZW5ndGgoKTtcblx0XHR2YXIgc3ogPSB0aGlzLnNldCggbS5lbGVtZW50c1sgOCBdLCBtLmVsZW1lbnRzWyA5IF0sIG0uZWxlbWVudHNbIDEwIF0gKS5sZW5ndGgoKTtcblxuXHRcdHRoaXMueCA9IHN4O1xuXHRcdHRoaXMueSA9IHN5O1xuXHRcdHRoaXMueiA9IHN6O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0c2V0RnJvbU1hdHJpeENvbHVtbjogZnVuY3Rpb24gKCBpbmRleCwgbWF0cml4ICkge1xuXG5cdFx0dmFyIG9mZnNldCA9IGluZGV4ICogNDtcblxuXHRcdHZhciBtZSA9IG1hdHJpeC5lbGVtZW50cztcblxuXHRcdHRoaXMueCA9IG1lWyBvZmZzZXQgXTtcblx0XHR0aGlzLnkgPSBtZVsgb2Zmc2V0ICsgMSBdO1xuXHRcdHRoaXMueiA9IG1lWyBvZmZzZXQgKyAyIF07XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGVxdWFsczogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0cmV0dXJuICggKCB2LnggPT09IHRoaXMueCApICYmICggdi55ID09PSB0aGlzLnkgKSAmJiAoIHYueiA9PT0gdGhpcy56ICkgKTtcblxuXHR9LFxuXG5cdGZyb21BcnJheTogZnVuY3Rpb24gKCBhcnJheSwgb2Zmc2V0ICkge1xuXG5cdFx0aWYgKCBvZmZzZXQgPT09IHVuZGVmaW5lZCApIG9mZnNldCA9IDA7XG5cblx0XHR0aGlzLnggPSBhcnJheVsgb2Zmc2V0IF07XG5cdFx0dGhpcy55ID0gYXJyYXlbIG9mZnNldCArIDEgXTtcblx0XHR0aGlzLnogPSBhcnJheVsgb2Zmc2V0ICsgMiBdO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHR0b0FycmF5OiBmdW5jdGlvbiAoIGFycmF5LCBvZmZzZXQgKSB7XG5cblx0XHRpZiAoIGFycmF5ID09PSB1bmRlZmluZWQgKSBhcnJheSA9IFtdO1xuXHRcdGlmICggb2Zmc2V0ID09PSB1bmRlZmluZWQgKSBvZmZzZXQgPSAwO1xuXG5cdFx0YXJyYXlbIG9mZnNldCBdID0gdGhpcy54O1xuXHRcdGFycmF5WyBvZmZzZXQgKyAxIF0gPSB0aGlzLnk7XG5cdFx0YXJyYXlbIG9mZnNldCArIDIgXSA9IHRoaXMuejtcblxuXHRcdHJldHVybiBhcnJheTtcblxuXHR9LFxuXG5cdGZyb21BdHRyaWJ1dGU6IGZ1bmN0aW9uICggYXR0cmlidXRlLCBpbmRleCwgb2Zmc2V0ICkge1xuXG5cdCAgICBpZiAoIG9mZnNldCA9PT0gdW5kZWZpbmVkICkgb2Zmc2V0ID0gMDtcblxuXHQgICAgaW5kZXggPSBpbmRleCAqIGF0dHJpYnV0ZS5pdGVtU2l6ZSArIG9mZnNldDtcblxuXHQgICAgdGhpcy54ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCBdO1xuXHQgICAgdGhpcy55ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCArIDEgXTtcblx0ICAgIHRoaXMueiA9IGF0dHJpYnV0ZS5hcnJheVsgaW5kZXggKyAyIF07XG5cblx0ICAgIHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0Y2xvbmU6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyggdGhpcy54LCB0aGlzLnksIHRoaXMueiApO1xuXG5cdH1cblxufTtcbi8qKiogRU5EIFZlY3RvcjMgKioqL1xuLyoqKiBTVEFSVCBFdWxlciAqKiovXG4vKipcbiAqIEBhdXRob3IgbXJkb29iIC8gaHR0cDovL21yZG9vYi5jb20vXG4gKiBAYXV0aG9yIFdlc3RMYW5nbGV5IC8gaHR0cDovL2dpdGh1Yi5jb20vV2VzdExhbmdsZXlcbiAqIEBhdXRob3IgYmhvdXN0b24gLyBodHRwOi8vZXhvY29ydGV4LmNvbVxuICovXG5cblRIUkVFLkV1bGVyID0gZnVuY3Rpb24gKCB4LCB5LCB6LCBvcmRlciApIHtcblxuXHR0aGlzLl94ID0geCB8fCAwO1xuXHR0aGlzLl95ID0geSB8fCAwO1xuXHR0aGlzLl96ID0geiB8fCAwO1xuXHR0aGlzLl9vcmRlciA9IG9yZGVyIHx8IFRIUkVFLkV1bGVyLkRlZmF1bHRPcmRlcjtcblxufTtcblxuVEhSRUUuRXVsZXIuUm90YXRpb25PcmRlcnMgPSBbICdYWVonLCAnWVpYJywgJ1pYWScsICdYWlknLCAnWVhaJywgJ1pZWCcgXTtcblxuVEhSRUUuRXVsZXIuRGVmYXVsdE9yZGVyID0gJ1hZWic7XG5cblRIUkVFLkV1bGVyLnByb3RvdHlwZSA9IHtcblxuXHRjb25zdHJ1Y3RvcjogVEhSRUUuRXVsZXIsXG5cblx0X3g6IDAsIF95OiAwLCBfejogMCwgX29yZGVyOiBUSFJFRS5FdWxlci5EZWZhdWx0T3JkZXIsXG5cblx0Z2V0IHggKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX3g7XG5cblx0fSxcblxuXHRzZXQgeCAoIHZhbHVlICkge1xuXG5cdFx0dGhpcy5feCA9IHZhbHVlO1xuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdH0sXG5cblx0Z2V0IHkgKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX3k7XG5cblx0fSxcblxuXHRzZXQgeSAoIHZhbHVlICkge1xuXG5cdFx0dGhpcy5feSA9IHZhbHVlO1xuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdH0sXG5cblx0Z2V0IHogKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX3o7XG5cblx0fSxcblxuXHRzZXQgeiAoIHZhbHVlICkge1xuXG5cdFx0dGhpcy5feiA9IHZhbHVlO1xuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdH0sXG5cblx0Z2V0IG9yZGVyICgpIHtcblxuXHRcdHJldHVybiB0aGlzLl9vcmRlcjtcblxuXHR9LFxuXG5cdHNldCBvcmRlciAoIHZhbHVlICkge1xuXG5cdFx0dGhpcy5fb3JkZXIgPSB2YWx1ZTtcblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHR9LFxuXG5cdHNldDogZnVuY3Rpb24gKCB4LCB5LCB6LCBvcmRlciApIHtcblxuXHRcdHRoaXMuX3ggPSB4O1xuXHRcdHRoaXMuX3kgPSB5O1xuXHRcdHRoaXMuX3ogPSB6O1xuXHRcdHRoaXMuX29yZGVyID0gb3JkZXIgfHwgdGhpcy5fb3JkZXI7XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0Y29weTogZnVuY3Rpb24gKCBldWxlciApIHtcblxuXHRcdHRoaXMuX3ggPSBldWxlci5feDtcblx0XHR0aGlzLl95ID0gZXVsZXIuX3k7XG5cdFx0dGhpcy5feiA9IGV1bGVyLl96O1xuXHRcdHRoaXMuX29yZGVyID0gZXVsZXIuX29yZGVyO1xuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldEZyb21Sb3RhdGlvbk1hdHJpeDogZnVuY3Rpb24gKCBtLCBvcmRlciwgdXBkYXRlICkge1xuXG5cdFx0dmFyIGNsYW1wID0gVEhSRUUuTWF0aC5jbGFtcDtcblxuXHRcdC8vIGFzc3VtZXMgdGhlIHVwcGVyIDN4MyBvZiBtIGlzIGEgcHVyZSByb3RhdGlvbiBtYXRyaXggKGkuZSwgdW5zY2FsZWQpXG5cblx0XHR2YXIgdGUgPSBtLmVsZW1lbnRzO1xuXHRcdHZhciBtMTEgPSB0ZVsgMCBdLCBtMTIgPSB0ZVsgNCBdLCBtMTMgPSB0ZVsgOCBdO1xuXHRcdHZhciBtMjEgPSB0ZVsgMSBdLCBtMjIgPSB0ZVsgNSBdLCBtMjMgPSB0ZVsgOSBdO1xuXHRcdHZhciBtMzEgPSB0ZVsgMiBdLCBtMzIgPSB0ZVsgNiBdLCBtMzMgPSB0ZVsgMTAgXTtcblxuXHRcdG9yZGVyID0gb3JkZXIgfHwgdGhpcy5fb3JkZXI7XG5cblx0XHRpZiAoIG9yZGVyID09PSAnWFlaJyApIHtcblxuXHRcdFx0dGhpcy5feSA9IE1hdGguYXNpbiggY2xhbXAoIG0xMywgLSAxLCAxICkgKTtcblxuXHRcdFx0aWYgKCBNYXRoLmFicyggbTEzICkgPCAwLjk5OTk5ICkge1xuXG5cdFx0XHRcdHRoaXMuX3ggPSBNYXRoLmF0YW4yKCAtIG0yMywgbTMzICk7XG5cdFx0XHRcdHRoaXMuX3ogPSBNYXRoLmF0YW4yKCAtIG0xMiwgbTExICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0dGhpcy5feCA9IE1hdGguYXRhbjIoIG0zMiwgbTIyICk7XG5cdFx0XHRcdHRoaXMuX3ogPSAwO1xuXG5cdFx0XHR9XG5cblx0XHR9IGVsc2UgaWYgKCBvcmRlciA9PT0gJ1lYWicgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSBNYXRoLmFzaW4oIC0gY2xhbXAoIG0yMywgLSAxLCAxICkgKTtcblxuXHRcdFx0aWYgKCBNYXRoLmFicyggbTIzICkgPCAwLjk5OTk5ICkge1xuXG5cdFx0XHRcdHRoaXMuX3kgPSBNYXRoLmF0YW4yKCBtMTMsIG0zMyApO1xuXHRcdFx0XHR0aGlzLl96ID0gTWF0aC5hdGFuMiggbTIxLCBtMjIgKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHR0aGlzLl95ID0gTWF0aC5hdGFuMiggLSBtMzEsIG0xMSApO1xuXHRcdFx0XHR0aGlzLl96ID0gMDtcblxuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIGlmICggb3JkZXIgPT09ICdaWFknICkge1xuXG5cdFx0XHR0aGlzLl94ID0gTWF0aC5hc2luKCBjbGFtcCggbTMyLCAtIDEsIDEgKSApO1xuXG5cdFx0XHRpZiAoIE1hdGguYWJzKCBtMzIgKSA8IDAuOTk5OTkgKSB7XG5cblx0XHRcdFx0dGhpcy5feSA9IE1hdGguYXRhbjIoIC0gbTMxLCBtMzMgKTtcblx0XHRcdFx0dGhpcy5feiA9IE1hdGguYXRhbjIoIC0gbTEyLCBtMjIgKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHR0aGlzLl95ID0gMDtcblx0XHRcdFx0dGhpcy5feiA9IE1hdGguYXRhbjIoIG0yMSwgbTExICk7XG5cblx0XHRcdH1cblxuXHRcdH0gZWxzZSBpZiAoIG9yZGVyID09PSAnWllYJyApIHtcblxuXHRcdFx0dGhpcy5feSA9IE1hdGguYXNpbiggLSBjbGFtcCggbTMxLCAtIDEsIDEgKSApO1xuXG5cdFx0XHRpZiAoIE1hdGguYWJzKCBtMzEgKSA8IDAuOTk5OTkgKSB7XG5cblx0XHRcdFx0dGhpcy5feCA9IE1hdGguYXRhbjIoIG0zMiwgbTMzICk7XG5cdFx0XHRcdHRoaXMuX3ogPSBNYXRoLmF0YW4yKCBtMjEsIG0xMSApO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdHRoaXMuX3ggPSAwO1xuXHRcdFx0XHR0aGlzLl96ID0gTWF0aC5hdGFuMiggLSBtMTIsIG0yMiApO1xuXG5cdFx0XHR9XG5cblx0XHR9IGVsc2UgaWYgKCBvcmRlciA9PT0gJ1laWCcgKSB7XG5cblx0XHRcdHRoaXMuX3ogPSBNYXRoLmFzaW4oIGNsYW1wKCBtMjEsIC0gMSwgMSApICk7XG5cblx0XHRcdGlmICggTWF0aC5hYnMoIG0yMSApIDwgMC45OTk5OSApIHtcblxuXHRcdFx0XHR0aGlzLl94ID0gTWF0aC5hdGFuMiggLSBtMjMsIG0yMiApO1xuXHRcdFx0XHR0aGlzLl95ID0gTWF0aC5hdGFuMiggLSBtMzEsIG0xMSApO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdHRoaXMuX3ggPSAwO1xuXHRcdFx0XHR0aGlzLl95ID0gTWF0aC5hdGFuMiggbTEzLCBtMzMgKTtcblxuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIGlmICggb3JkZXIgPT09ICdYWlknICkge1xuXG5cdFx0XHR0aGlzLl96ID0gTWF0aC5hc2luKCAtIGNsYW1wKCBtMTIsIC0gMSwgMSApICk7XG5cblx0XHRcdGlmICggTWF0aC5hYnMoIG0xMiApIDwgMC45OTk5OSApIHtcblxuXHRcdFx0XHR0aGlzLl94ID0gTWF0aC5hdGFuMiggbTMyLCBtMjIgKTtcblx0XHRcdFx0dGhpcy5feSA9IE1hdGguYXRhbjIoIG0xMywgbTExICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0dGhpcy5feCA9IE1hdGguYXRhbjIoIC0gbTIzLCBtMzMgKTtcblx0XHRcdFx0dGhpcy5feSA9IDA7XG5cblx0XHRcdH1cblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdGNvbnNvbGUud2FybiggJ1RIUkVFLkV1bGVyOiAuc2V0RnJvbVJvdGF0aW9uTWF0cml4KCkgZ2l2ZW4gdW5zdXBwb3J0ZWQgb3JkZXI6ICcgKyBvcmRlciApXG5cblx0XHR9XG5cblx0XHR0aGlzLl9vcmRlciA9IG9yZGVyO1xuXG5cdFx0aWYgKCB1cGRhdGUgIT09IGZhbHNlICkgdGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldEZyb21RdWF0ZXJuaW9uOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgbWF0cml4O1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICggcSwgb3JkZXIsIHVwZGF0ZSApIHtcblxuXHRcdFx0aWYgKCBtYXRyaXggPT09IHVuZGVmaW5lZCApIG1hdHJpeCA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG5cdFx0XHRtYXRyaXgubWFrZVJvdGF0aW9uRnJvbVF1YXRlcm5pb24oIHEgKTtcblx0XHRcdHRoaXMuc2V0RnJvbVJvdGF0aW9uTWF0cml4KCBtYXRyaXgsIG9yZGVyLCB1cGRhdGUgKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHR9O1xuXG5cdH0oKSxcblxuXHRzZXRGcm9tVmVjdG9yMzogZnVuY3Rpb24gKCB2LCBvcmRlciApIHtcblxuXHRcdHJldHVybiB0aGlzLnNldCggdi54LCB2LnksIHYueiwgb3JkZXIgfHwgdGhpcy5fb3JkZXIgKTtcblxuXHR9LFxuXG5cdHJlb3JkZXI6IGZ1bmN0aW9uICgpIHtcblxuXHRcdC8vIFdBUk5JTkc6IHRoaXMgZGlzY2FyZHMgcmV2b2x1dGlvbiBpbmZvcm1hdGlvbiAtYmhvdXN0b25cblxuXHRcdHZhciBxID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIG5ld09yZGVyICkge1xuXG5cdFx0XHRxLnNldEZyb21FdWxlciggdGhpcyApO1xuXHRcdFx0dGhpcy5zZXRGcm9tUXVhdGVybmlvbiggcSwgbmV3T3JkZXIgKTtcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdGVxdWFsczogZnVuY3Rpb24gKCBldWxlciApIHtcblxuXHRcdHJldHVybiAoIGV1bGVyLl94ID09PSB0aGlzLl94ICkgJiYgKCBldWxlci5feSA9PT0gdGhpcy5feSApICYmICggZXVsZXIuX3ogPT09IHRoaXMuX3ogKSAmJiAoIGV1bGVyLl9vcmRlciA9PT0gdGhpcy5fb3JkZXIgKTtcblxuXHR9LFxuXG5cdGZyb21BcnJheTogZnVuY3Rpb24gKCBhcnJheSApIHtcblxuXHRcdHRoaXMuX3ggPSBhcnJheVsgMCBdO1xuXHRcdHRoaXMuX3kgPSBhcnJheVsgMSBdO1xuXHRcdHRoaXMuX3ogPSBhcnJheVsgMiBdO1xuXHRcdGlmICggYXJyYXlbIDMgXSAhPT0gdW5kZWZpbmVkICkgdGhpcy5fb3JkZXIgPSBhcnJheVsgMyBdO1xuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHRvQXJyYXk6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBbIHRoaXMuX3gsIHRoaXMuX3ksIHRoaXMuX3osIHRoaXMuX29yZGVyIF07XG5cblx0fSxcblxuXHR0b1ZlY3RvcjM6IGZ1bmN0aW9uICggb3B0aW9uYWxSZXN1bHQgKSB7XG5cblx0XHRpZiAoIG9wdGlvbmFsUmVzdWx0ICkge1xuXG5cdFx0XHRyZXR1cm4gb3B0aW9uYWxSZXN1bHQuc2V0KCB0aGlzLl94LCB0aGlzLl95LCB0aGlzLl96ICk7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRyZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoIHRoaXMuX3gsIHRoaXMuX3ksIHRoaXMuX3ogKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdG9uQ2hhbmdlOiBmdW5jdGlvbiAoIGNhbGxiYWNrICkge1xuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdG9uQ2hhbmdlQ2FsbGJhY2s6IGZ1bmN0aW9uICgpIHt9LFxuXG5cdGNsb25lOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gbmV3IFRIUkVFLkV1bGVyKCB0aGlzLl94LCB0aGlzLl95LCB0aGlzLl96LCB0aGlzLl9vcmRlciApO1xuXG5cdH1cblxufTtcbi8qKiogRU5EIEV1bGVyICoqKi9cbi8qKiogU1RBUlQgTWF0aCAqKiovXG4vKipcbiAqIEBhdXRob3IgYWx0ZXJlZHEgLyBodHRwOi8vYWx0ZXJlZHF1YWxpYS5jb20vXG4gKiBAYXV0aG9yIG1yZG9vYiAvIGh0dHA6Ly9tcmRvb2IuY29tL1xuICovXG5cblRIUkVFLk1hdGggPSB7XG5cblx0Z2VuZXJhdGVVVUlEOiBmdW5jdGlvbiAoKSB7XG5cblx0XHQvLyBodHRwOi8vd3d3LmJyb29mYS5jb20vVG9vbHMvTWF0aC51dWlkLmh0bVxuXG5cdFx0dmFyIGNoYXJzID0gJzAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6Jy5zcGxpdCggJycgKTtcblx0XHR2YXIgdXVpZCA9IG5ldyBBcnJheSggMzYgKTtcblx0XHR2YXIgcm5kID0gMCwgcjtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdGZvciAoIHZhciBpID0gMDsgaSA8IDM2OyBpICsrICkge1xuXG5cdFx0XHRcdGlmICggaSA9PSA4IHx8IGkgPT0gMTMgfHwgaSA9PSAxOCB8fCBpID09IDIzICkge1xuXG5cdFx0XHRcdFx0dXVpZFsgaSBdID0gJy0nO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAoIGkgPT0gMTQgKSB7XG5cblx0XHRcdFx0XHR1dWlkWyBpIF0gPSAnNCc7XG5cblx0XHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRcdGlmICggcm5kIDw9IDB4MDIgKSBybmQgPSAweDIwMDAwMDAgKyAoIE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDAgKSB8IDA7XG5cdFx0XHRcdFx0ciA9IHJuZCAmIDB4Zjtcblx0XHRcdFx0XHRybmQgPSBybmQgPj4gNDtcblx0XHRcdFx0XHR1dWlkWyBpIF0gPSBjaGFyc1sgKCBpID09IDE5ICkgPyAoIHIgJiAweDMgKSB8IDB4OCA6IHIgXTtcblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB1dWlkLmpvaW4oICcnICk7XG5cblx0XHR9O1xuXG5cdH0oKSxcblxuXHQvLyBDbGFtcCB2YWx1ZSB0byByYW5nZSA8YSwgYj5cblxuXHRjbGFtcDogZnVuY3Rpb24gKCB4LCBhLCBiICkge1xuXG5cdFx0cmV0dXJuICggeCA8IGEgKSA/IGEgOiAoICggeCA+IGIgKSA/IGIgOiB4ICk7XG5cblx0fSxcblxuXHQvLyBDbGFtcCB2YWx1ZSB0byByYW5nZSA8YSwgaW5mKVxuXG5cdGNsYW1wQm90dG9tOiBmdW5jdGlvbiAoIHgsIGEgKSB7XG5cblx0XHRyZXR1cm4geCA8IGEgPyBhIDogeDtcblxuXHR9LFxuXG5cdC8vIExpbmVhciBtYXBwaW5nIGZyb20gcmFuZ2UgPGExLCBhMj4gdG8gcmFuZ2UgPGIxLCBiMj5cblxuXHRtYXBMaW5lYXI6IGZ1bmN0aW9uICggeCwgYTEsIGEyLCBiMSwgYjIgKSB7XG5cblx0XHRyZXR1cm4gYjEgKyAoIHggLSBhMSApICogKCBiMiAtIGIxICkgLyAoIGEyIC0gYTEgKTtcblxuXHR9LFxuXG5cdC8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU21vb3Roc3RlcFxuXG5cdHNtb290aHN0ZXA6IGZ1bmN0aW9uICggeCwgbWluLCBtYXggKSB7XG5cblx0XHRpZiAoIHggPD0gbWluICkgcmV0dXJuIDA7XG5cdFx0aWYgKCB4ID49IG1heCApIHJldHVybiAxO1xuXG5cdFx0eCA9ICggeCAtIG1pbiApIC8gKCBtYXggLSBtaW4gKTtcblxuXHRcdHJldHVybiB4ICogeCAqICggMyAtIDIgKiB4ICk7XG5cblx0fSxcblxuXHRzbW9vdGhlcnN0ZXA6IGZ1bmN0aW9uICggeCwgbWluLCBtYXggKSB7XG5cblx0XHRpZiAoIHggPD0gbWluICkgcmV0dXJuIDA7XG5cdFx0aWYgKCB4ID49IG1heCApIHJldHVybiAxO1xuXG5cdFx0eCA9ICggeCAtIG1pbiApIC8gKCBtYXggLSBtaW4gKTtcblxuXHRcdHJldHVybiB4ICogeCAqIHggKiAoIHggKiAoIHggKiA2IC0gMTUgKSArIDEwICk7XG5cblx0fSxcblxuXHQvLyBSYW5kb20gZmxvYXQgZnJvbSA8MCwgMT4gd2l0aCAxNiBiaXRzIG9mIHJhbmRvbW5lc3Ncblx0Ly8gKHN0YW5kYXJkIE1hdGgucmFuZG9tKCkgY3JlYXRlcyByZXBldGl0aXZlIHBhdHRlcm5zIHdoZW4gYXBwbGllZCBvdmVyIGxhcmdlciBzcGFjZSlcblxuXHRyYW5kb20xNjogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuICggNjUyODAgKiBNYXRoLnJhbmRvbSgpICsgMjU1ICogTWF0aC5yYW5kb20oKSApIC8gNjU1MzU7XG5cblx0fSxcblxuXHQvLyBSYW5kb20gaW50ZWdlciBmcm9tIDxsb3csIGhpZ2g+IGludGVydmFsXG5cblx0cmFuZEludDogZnVuY3Rpb24gKCBsb3csIGhpZ2ggKSB7XG5cblx0XHRyZXR1cm4gTWF0aC5mbG9vciggdGhpcy5yYW5kRmxvYXQoIGxvdywgaGlnaCApICk7XG5cblx0fSxcblxuXHQvLyBSYW5kb20gZmxvYXQgZnJvbSA8bG93LCBoaWdoPiBpbnRlcnZhbFxuXG5cdHJhbmRGbG9hdDogZnVuY3Rpb24gKCBsb3csIGhpZ2ggKSB7XG5cblx0XHRyZXR1cm4gbG93ICsgTWF0aC5yYW5kb20oKSAqICggaGlnaCAtIGxvdyApO1xuXG5cdH0sXG5cblx0Ly8gUmFuZG9tIGZsb2F0IGZyb20gPC1yYW5nZS8yLCByYW5nZS8yPiBpbnRlcnZhbFxuXG5cdHJhbmRGbG9hdFNwcmVhZDogZnVuY3Rpb24gKCByYW5nZSApIHtcblxuXHRcdHJldHVybiByYW5nZSAqICggMC41IC0gTWF0aC5yYW5kb20oKSApO1xuXG5cdH0sXG5cblx0ZGVnVG9SYWQ6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBkZWdyZWVUb1JhZGlhbnNGYWN0b3IgPSBNYXRoLlBJIC8gMTgwO1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICggZGVncmVlcyApIHtcblxuXHRcdFx0cmV0dXJuIGRlZ3JlZXMgKiBkZWdyZWVUb1JhZGlhbnNGYWN0b3I7XG5cblx0XHR9O1xuXG5cdH0oKSxcblxuXHRyYWRUb0RlZzogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIHJhZGlhblRvRGVncmVlc0ZhY3RvciA9IDE4MCAvIE1hdGguUEk7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCByYWRpYW5zICkge1xuXG5cdFx0XHRyZXR1cm4gcmFkaWFucyAqIHJhZGlhblRvRGVncmVlc0ZhY3RvcjtcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdGlzUG93ZXJPZlR3bzogZnVuY3Rpb24gKCB2YWx1ZSApIHtcblxuXHRcdHJldHVybiAoIHZhbHVlICYgKCB2YWx1ZSAtIDEgKSApID09PSAwICYmIHZhbHVlICE9PSAwO1xuXG5cdH0sXG5cblx0bmV4dFBvd2VyT2ZUd286IGZ1bmN0aW9uICggdmFsdWUgKSB7XG5cblx0XHR2YWx1ZSAtLTtcblx0XHR2YWx1ZSB8PSB2YWx1ZSA+PiAxO1xuXHRcdHZhbHVlIHw9IHZhbHVlID4+IDI7XG5cdFx0dmFsdWUgfD0gdmFsdWUgPj4gNDtcblx0XHR2YWx1ZSB8PSB2YWx1ZSA+PiA4O1xuXHRcdHZhbHVlIHw9IHZhbHVlID4+IDE2O1xuXHRcdHZhbHVlICsrO1xuXG5cdFx0cmV0dXJuIHZhbHVlO1xuXHR9XG5cbn07XG5cbi8qKiogRU5EIE1hdGggKioqL1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gVEhSRUU7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG52YXIgUk9UQVRFX1NQRUVEID0gMC41O1xuLyoqXG4gKiBQcm92aWRlcyBhIHF1YXRlcm5pb24gcmVzcG9uc2libGUgZm9yIHByZS1wYW5uaW5nIHRoZSBzY2VuZSBiZWZvcmUgZnVydGhlclxuICogdHJhbnNmb3JtYXRpb25zIGR1ZSB0byBkZXZpY2Ugc2Vuc29ycy5cbiAqL1xuZnVuY3Rpb24gVG91Y2hQYW5uZXIoKSB7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdGhpcy5vblRvdWNoU3RhcnRfLmJpbmQodGhpcykpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgdGhpcy5vblRvdWNoTW92ZV8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHRoaXMub25Ub3VjaEVuZF8uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5pc1RvdWNoaW5nID0gZmFsc2U7XG4gIHRoaXMucm90YXRlU3RhcnQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICB0aGlzLnJvdGF0ZUVuZCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gIHRoaXMucm90YXRlRGVsdGEgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuXG4gIHRoaXMudGhldGEgPSAwO1xuICB0aGlzLm9yaWVudGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbn1cblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLmdldE9yaWVudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMub3JpZW50YXRpb24uc2V0RnJvbUV1bGVyKG5ldyBUSFJFRS5FdWxlcigwLCAwLCB0aGlzLnRoZXRhKSk7XG4gIHJldHVybiB0aGlzLm9yaWVudGF0aW9uO1xufTtcblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLnJlc2V0U2Vuc29yID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMudGhldGEgPSAwO1xufTtcblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLm9uVG91Y2hTdGFydF8gPSBmdW5jdGlvbihlKSB7XG4gIC8vIE9ubHkgcmVzcG9uZCBpZiB0aGVyZSBpcyBleGFjdGx5IG9uZSB0b3VjaC5cbiAgaWYgKGUudG91Y2hlcy5sZW5ndGggIT0gMSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnJvdGF0ZVN0YXJ0LnNldChlLnRvdWNoZXNbMF0ucGFnZVgsIGUudG91Y2hlc1swXS5wYWdlWSk7XG4gIHRoaXMuaXNUb3VjaGluZyA9IHRydWU7XG59O1xuXG5Ub3VjaFBhbm5lci5wcm90b3R5cGUub25Ub3VjaE1vdmVfID0gZnVuY3Rpb24oZSkge1xuICBpZiAoIXRoaXMuaXNUb3VjaGluZykge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnJvdGF0ZUVuZC5zZXQoZS50b3VjaGVzWzBdLnBhZ2VYLCBlLnRvdWNoZXNbMF0ucGFnZVkpO1xuICB0aGlzLnJvdGF0ZURlbHRhLnN1YlZlY3RvcnModGhpcy5yb3RhdGVFbmQsIHRoaXMucm90YXRlU3RhcnQpO1xuICB0aGlzLnJvdGF0ZVN0YXJ0LmNvcHkodGhpcy5yb3RhdGVFbmQpO1xuXG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcbiAgdGhpcy50aGV0YSArPSAyICogTWF0aC5QSSAqIHRoaXMucm90YXRlRGVsdGEueCAvIGVsZW1lbnQuY2xpZW50V2lkdGggKiBST1RBVEVfU1BFRUQ7XG59O1xuXG5Ub3VjaFBhbm5lci5wcm90b3R5cGUub25Ub3VjaEVuZF8gPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMuaXNUb3VjaGluZyA9IGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb3VjaFBhbm5lcjtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgVXRpbCA9IHdpbmRvdy5VdGlsIHx8IHt9O1xuXG5VdGlsLk1JTl9USU1FU1RFUCA9IDAuMDAxO1xuVXRpbC5NQVhfVElNRVNURVAgPSAxO1xuXG5VdGlsLmNsYW1wID0gZnVuY3Rpb24odmFsdWUsIG1pbiwgbWF4KSB7XG4gIHJldHVybiBNYXRoLm1pbihNYXRoLm1heChtaW4sIHZhbHVlKSwgbWF4KTtcbn07XG5cblV0aWwuaXNJT1MgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIC9pUGFkfGlQaG9uZXxpUG9kLy50ZXN0KG5hdmlnYXRvci5wbGF0Zm9ybSk7XG59O1xuXG4vLyBIZWxwZXIgbWV0aG9kIHRvIHZhbGlkYXRlIHRoZSB0aW1lIHN0ZXBzIG9mIHNlbnNvciB0aW1lc3RhbXBzLlxuVXRpbC5pc1RpbWVzdGFtcERlbHRhVmFsaWQgPSBmdW5jdGlvbih0aW1lc3RhbXBEZWx0YVMpIHtcbiAgaWYgKGlzTmFOKHRpbWVzdGFtcERlbHRhUykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHRpbWVzdGFtcERlbHRhUyA8PSBVdGlsLk1JTl9USU1FU1RFUCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodGltZXN0YW1wRGVsdGFTID4gVXRpbC5NQVhfVElNRVNURVApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDtcbiJdfQ==
