(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
var HMDVRDevice = require('./HMDVRDevice.js');

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

},{"./HMDVRDevice.js":4}],3:[function(require,module,exports){
var DOMPoint = function(x, y, z, w){
  this.x = x;
  this.y = y;
  this.z = z;
  this.w = w;
};

DOMPoint.prototype.constructor = DOMPoint;

module.exports = DOMPoint;

},{}],4:[function(require,module,exports){
var VREyeParameters = require('./VREyeParameters.js');
var VRDevice = require('./VRDevice.js');

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

},{"./VRDevice.js":6,"./VREyeParameters.js":7}],5:[function(require,module,exports){
var VRDevice = require('./VRDevice.js');
var HMDVRDevice = require('./HMDVRDevice.js');
var CardboardHMDVRDevice = require('./CardboardHMDVRDevice.js');

var PositionSensorVRDevice = require('../base.js').PositionSensorVRDevice;
var GyroPositionSensorVRDevice = require('../gyro-position-sensor-vr-device.js');
var MouseKeyboardPositionSensorVRDevice = require('../mouse-keyboard-position-sensor-vr-device.js');


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
      if (typeof window.orientation !== 'undefined') {
        deviceSensor = new GyroPositionSensorVRDevice();
      } else {
        deviceSensor = new MouseKeyboardPositionSensorVRDevice();
      }
    }

    this.devices = [deviceHMDVR, deviceSensor];
    return this.devices;
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

},{"../base.js":1,"../gyro-position-sensor-vr-device.js":9,"../mouse-keyboard-position-sensor-vr-device.js":11,"./CardboardHMDVRDevice.js":2,"./HMDVRDevice.js":4,"./VRDevice.js":6}],6:[function(require,module,exports){
var VRDevice = function(hardwareUnitId, deviceId, deviceName){
  this.hardwareUnitId = hardwareUnitId;
  this.deviceId = deviceId;
  this.deviceName = deviceName;
};

VRDevice.prototype = {};
VRDevice.prototype.constructor = VRDevice;

module.exports = VRDevice;

},{}],7:[function(require,module,exports){
var VRFieldOfView = require('./VRFieldOfView.js');
var DOMPoint = require('./DOMPoint.js');

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

},{"./DOMPoint.js":3,"./VRFieldOfView.js":8}],8:[function(require,module,exports){
var VRFieldOfView = function(fov){
  this.upDegrees = fov/2;
  this.rightDegrees = fov/2;
  this.downDegrees = fov/2;
  this.leftDegrees = fov/2;
};

VRFieldOfView.prototype.constructor = VRFieldOfView;

module.exports = VRFieldOfView;

},{}],9:[function(require,module,exports){
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
var PosePredictor = require('./pose-predictor.js');
var TouchPanner = require('./touch-panner.js');
var Util = require('./util.js');

WEBVR_YAW_ONLY = false;

/**
 * The positional sensor, implemented using web DeviceOrientation APIs.
 */
function GyroPositionSensorVRDevice() {
  this.deviceId = 'webvr-polyfill:gyro';
  this.deviceName = 'VR Position Device (webvr-polyfill:gyro)';

  // Subscribe to deviceorientation events.
  window.addEventListener('deviceorientation', this.onDeviceOrientationChange_.bind(this));
  window.addEventListener('devicemotion', this.onDeviceMotionChange_.bind(this));
  window.addEventListener('orientationchange', this.onScreenOrientationChange_.bind(this));

  this.deviceOrientation = null;
  this.screenOrientation = window.orientation.angle;

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
  this.posePredictor = new PosePredictor();
}
GyroPositionSensorVRDevice.prototype = new PositionSensorVRDevice();

/**
 * Returns {orientation: {x,y,z,w}, position: null}.
 * Position is not supported since we can't do 6DOF.
 */
GyroPositionSensorVRDevice.prototype.getState = function() {
  return {
    hasOrientation: true,
    orientation: this.getOrientation(),
    hasPosition: false,
    position: null
  }
};

GyroPositionSensorVRDevice.prototype.onDeviceOrientationChange_ =
    function(deviceOrientation) {
  this.deviceOrientation = deviceOrientation;
};

GyroPositionSensorVRDevice.prototype.onDeviceMotionChange_ =
    function(deviceMotion) {
  this.deviceMotion = deviceMotion;
};

GyroPositionSensorVRDevice.prototype.onScreenOrientationChange_ =
    function(screenOrientation) {
  this.screenOrientation = window.orientation.angle;
};

GyroPositionSensorVRDevice.prototype.getOrientation = function() {
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

  this.posePredictor.setScreenOrientation(this.screenOrientation);

  var bestTime = this.deviceOrientation.timeStamp;
  var rotRate = this.deviceMotion && this.deviceMotion.rotationRate;
  var out = this.posePredictor.getPrediction(
      this.finalQuaternion, rotRate, bestTime);

  // Adjust for pitch constraints (for non-spherical panos).
  if (WEBVR_YAW_ONLY) {
    out.x = 0;
    out.z = 0;
    out.normalize();
  }
  return out;
};

GyroPositionSensorVRDevice.prototype.resetSensor = function() {
  var angle = THREE.Math.degToRad(this.deviceOrientation.alpha);
  console.log('Normalizing yaw to %f', angle);
  this.resetTransform.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
};

module.exports = GyroPositionSensorVRDevice;

},{"./base.js":1,"./pose-predictor.js":12,"./touch-panner.js":13,"./util.js":14}],10:[function(require,module,exports){
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


var WebVRPolyfill = require('./cm/Polyfill.js');
window.VR = window.VR || {};
window.VR.webVRPolyfill = new WebVRPolyfill();

},{"./cm/Polyfill.js":5}],11:[function(require,module,exports){
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

},{"./base.js":1,"./util.js":14}],12:[function(require,module,exports){
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

var PredictionMode = {
  NONE: 'none',
  INTERPOLATE: 'interpolate',
  PREDICT: 'predict'
}

// How much to interpolate between the current orientation estimate and the
// previous estimate position. This is helpful for devices with low
// deviceorientation firing frequency (eg. on iOS8 and below, it is 20 Hz).  The
// larger this value (in [0, 1]), the smoother but more delayed the head
// tracking is.
var INTERPOLATION_SMOOTHING_FACTOR = 0.01;

// Angular threshold, if the angular speed (in deg/s) is less than this, do no
// prediction. Without it, the screen flickers quite a bit.
var PREDICTION_THRESHOLD_DEG_PER_S = 0.01;
//var PREDICTION_THRESHOLD_DEG_PER_S = 0;

// How far into the future to predict.
WEBVR_PREDICTION_TIME_MS = 80;

// Whether to predict or what.
WEBVR_PREDICTION_MODE = PredictionMode.PREDICT;

function PosePredictor() {
  this.lastQ = new THREE.Quaternion();
  this.lastTimestamp = null;

  this.outQ = new THREE.Quaternion();
  this.deltaQ = new THREE.Quaternion();
}

PosePredictor.prototype.getPrediction = function(currentQ, rotationRate, timestamp) {
  // If there's no previous quaternion, output the current one and save for
  // later.
  if (!this.lastTimestamp) {
    this.lastQ.copy(currentQ);
    this.lastTimestamp = timestamp;
    return currentQ;
  }

  // DEBUG ONLY: Try with a fixed 60 Hz update speed.
  //var elapsedMs = 1000/60;
  var elapsedMs = timestamp - this.lastTimestamp;

  switch (WEBVR_PREDICTION_MODE) {
    case PredictionMode.INTERPOLATE:
      this.outQ.copy(currentQ);
      this.outQ.slerp(this.lastQ, INTERPOLATION_SMOOTHING_FACTOR);

      // Save the current quaternion for later.
      this.lastQ.copy(currentQ);
      break;
    case PredictionMode.PREDICT:
      var axisAngle;
      if (rotationRate) {
        axisAngle = this.getAxisAngularSpeedFromRotationRate_(rotationRate);
      } else {
        axisAngle = this.getAxisAngularSpeedFromGyroDelta_(currentQ, elapsedMs);
      }

      // If there is no predicted axis/angle, don't do prediction.
      if (!axisAngle) {
        this.outQ.copy(currentQ);
        this.lastQ.copy(currentQ);
        break;
      }
      var angularSpeedDegS = axisAngle.speed;
      var axis = axisAngle.axis;
      var predictAngleDeg = (WEBVR_PREDICTION_TIME_MS / 1000) * angularSpeedDegS;

      // If we're rotating slowly, don't do prediction.
      if (angularSpeedDegS < PREDICTION_THRESHOLD_DEG_PER_S) {
        this.outQ.copy(currentQ);
        this.lastQ.copy(currentQ);
        break;
      }

      // Calculate the prediction delta to apply to the original angle.
      this.deltaQ.setFromAxisAngle(axis, THREE.Math.degToRad(predictAngleDeg));
      // DEBUG ONLY: As a sanity check, use the same axis and angle as before,
      // which should cause no prediction to happen.
      //this.deltaQ.setFromAxisAngle(axis, angle);

      this.outQ.copy(this.lastQ);
      this.outQ.multiply(this.deltaQ);

      // Use the predicted quaternion as the new last one.
      //this.lastQ.copy(this.outQ);
      this.lastQ.copy(currentQ);
      break;
    case PredictionMode.NONE:
    default:
      this.outQ.copy(currentQ);
  }
  this.lastTimestamp = timestamp;

  return this.outQ;
};

PosePredictor.prototype.setScreenOrientation = function(screenOrientation) {
  this.screenOrientation = screenOrientation;
};

PosePredictor.prototype.getAxis_ = function(quat) {
  // x = qx / sqrt(1-qw*qw)
  // y = qy / sqrt(1-qw*qw)
  // z = qz / sqrt(1-qw*qw)
  var d = Math.sqrt(1 - quat.w * quat.w);
  return new THREE.Vector3(quat.x / d, quat.y / d, quat.z / d);
};

PosePredictor.prototype.getAngle_ = function(quat) {
  // angle = 2 * acos(qw)
  // If w is greater than 1 (THREE.js, how can this be?), arccos is not defined.
  if (quat.w > 1) {
    return 0;
  }
  var angle = 2 * Math.acos(quat.w);
  // Normalize the angle to be in [-π, π].
  if (angle > Math.PI) {
    angle -= 2 * Math.PI;
  }
  return angle;
};

PosePredictor.prototype.getAxisAngularSpeedFromRotationRate_ = function(rotationRate) {
  if (!rotationRate) {
    return null;
  }
  var screenRotationRate;
  if (/iPad|iPhone|iPod/.test(navigator.platform)) {
    // iOS: angular speed in deg/s.
    var screenRotationRate = this.getScreenAdjustedRotationRateIOS_(rotationRate);
  } else {
    // Android: angular speed in rad/s, so need to convert.
    rotationRate.alpha = THREE.Math.radToDeg(rotationRate.alpha);
    rotationRate.beta = THREE.Math.radToDeg(rotationRate.beta);
    rotationRate.gamma = THREE.Math.radToDeg(rotationRate.gamma);
    var screenRotationRate = this.getScreenAdjustedRotationRate_(rotationRate);
  }
  var vec = new THREE.Vector3(
      screenRotationRate.beta, screenRotationRate.alpha, screenRotationRate.gamma);

  /*
  var vec;
  if (/iPad|iPhone|iPod/.test(navigator.platform)) {
    vec = new THREE.Vector3(rotationRate.gamma, rotationRate.alpha, rotationRate.beta);
  } else {
    vec = new THREE.Vector3(rotationRate.beta, rotationRate.alpha, rotationRate.gamma);
  }
  // Take into account the screen orientation too!
  vec.applyQuaternion(this.screenTransform);
  */

  // Angular speed in deg/s.
  var angularSpeedDegS = vec.length();

  var axis = vec.normalize();
  return {
    speed: angularSpeedDegS,
    axis: axis
  }
};

PosePredictor.prototype.getScreenAdjustedRotationRate_ = function(rotationRate) {
  var screenRotationRate = {
    alpha: -rotationRate.alpha,
    beta: rotationRate.beta,
    gamma: rotationRate.gamma
  };
  switch (this.screenOrientation) {
    case 90:
      screenRotationRate.beta  = - rotationRate.gamma;
      screenRotationRate.gamma =   rotationRate.beta;
      break;
    case 180:
      screenRotationRate.beta  = - rotationRate.beta;
      screenRotationRate.gamma = - rotationRate.gamma;
      break;
    case 270:
    case -90:
      screenRotationRate.beta  =   rotationRate.gamma;
      screenRotationRate.gamma = - rotationRate.beta;
      break;
    default: // SCREEN_ROTATION_0
      screenRotationRate.beta  =   rotationRate.beta;
      screenRotationRate.gamma =   rotationRate.gamma;
      break;
  }
  return screenRotationRate;
};

PosePredictor.prototype.getScreenAdjustedRotationRateIOS_ = function(rotationRate) {
  var screenRotationRate = {
    alpha: rotationRate.alpha,
    beta: rotationRate.beta,
    gamma: rotationRate.gamma
  };
  // Values empirically derived.
  switch (this.screenOrientation) {
    case 90:
      screenRotationRate.beta  = -rotationRate.beta;
      screenRotationRate.gamma =  rotationRate.gamma;
      break;
    case 180:
      // You can't even do this on iOS.
      break;
    case 270:
    case -90:
      screenRotationRate.alpha = -rotationRate.alpha;
      screenRotationRate.beta  =  rotationRate.beta;
      screenRotationRate.gamma =  rotationRate.gamma;
      break;
    default: // SCREEN_ROTATION_0
      screenRotationRate.alpha =  rotationRate.beta;
      screenRotationRate.beta  =  rotationRate.alpha;
      screenRotationRate.gamma =  rotationRate.gamma;
      break;
  }
  return screenRotationRate;
};

PosePredictor.prototype.getAxisAngularSpeedFromGyroDelta_ = function(currentQ, elapsedMs) {
  // Sometimes we use the same sensor timestamp, in which case prediction
  // won't work.
  if (elapsedMs == 0) {
    return null;
  }
  // Q_delta = Q_last^-1 * Q_curr
  this.deltaQ.copy(this.lastQ);
  this.deltaQ.inverse();
  this.deltaQ.multiply(currentQ);

  // Convert from delta quaternion to axis-angle.
  var axis = this.getAxis_(this.deltaQ);
  var angleRad = this.getAngle_(this.deltaQ);
  // It took `elapsed` ms to travel the angle amount over the axis. Now,
  // we make a new quaternion based how far in the future we want to
  // calculate.
  var angularSpeedRadMs = angleRad / elapsedMs;
  var angularSpeedDegS = THREE.Math.radToDeg(angularSpeedRadMs) * 1000;
  // If no rotation rate is provided, do no prediction.
  return {
    speed: angularSpeedDegS,
    axis: axis
  };
};

module.exports = PosePredictor;

},{}],13:[function(require,module,exports){
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
  this.euler = new THREE.Euler();
}

TouchPanner.prototype.getOrientation = function() {
  this.euler.set(0, this.theta, 0, 'YXZ');
  this.orientation.setFromEuler(this.euler);
  return this.orientation;
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

},{}],14:[function(require,module,exports){
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

Util.clamp = function(value, min, max) {
  return Math.min(Math.max(min, value), max);
};

Util.mapRange = function(value, minDomain, maxDomain, minRange, maxRange) {
  // If we're out of range, return an invalid value.
  var percent = (value - minDomain) / (maxDomain - minDomain);
  // Clamp percent to [0, 1].
  percent = Util.clamp(percent, 0, 1);
  return minRange + percent * (maxRange - minRange);
};

module.exports = Util;

},{}]},{},[10])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmFzZS5qcyIsInNyYy9jbS9DYXJkYm9hcmRITURWUkRldmljZS5qcyIsInNyYy9jbS9ET01Qb2ludC5qcyIsInNyYy9jbS9ITURWUkRldmljZS5qcyIsInNyYy9jbS9Qb2x5ZmlsbC5qcyIsInNyYy9jbS9WUkRldmljZS5qcyIsInNyYy9jbS9WUkV5ZVBhcmFtZXRlcnMuanMiLCJzcmMvY20vVlJGaWVsZE9mVmlldy5qcyIsInNyYy9neXJvLXBvc2l0aW9uLXNlbnNvci12ci1kZXZpY2UuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9tb3VzZS1rZXlib2FyZC1wb3NpdGlvbi1zZW5zb3ItdnItZGV2aWNlLmpzIiwic3JjL3Bvc2UtcHJlZGljdG9yLmpzIiwic3JjL3RvdWNoLXBhbm5lci5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4vKipcbiAqIFRoZSBiYXNlIGNsYXNzIGZvciBhbGwgVlIgZGV2aWNlcy5cbiAqL1xuZnVuY3Rpb24gVlJEZXZpY2UoKSB7XG4gIHRoaXMuaGFyZHdhcmVVbml0SWQgPSAnd2VidnItcG9seWZpbGwgaGFyZHdhcmVVbml0SWQnO1xuICB0aGlzLmRldmljZUlkID0gJ3dlYnZyLXBvbHlmaWxsIGRldmljZUlkJztcbiAgdGhpcy5kZXZpY2VOYW1lID0gJ3dlYnZyLXBvbHlmaWxsIGRldmljZU5hbWUnO1xufVxuXG4vKipcbiAqIFRoZSBiYXNlIGNsYXNzIGZvciBhbGwgVlIgSE1EIGRldmljZXMuXG4gKi9cbmZ1bmN0aW9uIEhNRFZSRGV2aWNlKCkge1xufVxuSE1EVlJEZXZpY2UucHJvdG90eXBlID0gbmV3IFZSRGV2aWNlKCk7XG5cbi8qKlxuICogVGhlIGJhc2UgY2xhc3MgZm9yIGFsbCBWUiBwb3NpdGlvbiBzZW5zb3IgZGV2aWNlcy5cbiAqL1xuZnVuY3Rpb24gUG9zaXRpb25TZW5zb3JWUkRldmljZSgpIHtcbn1cblBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlID0gbmV3IFZSRGV2aWNlKCk7XG5cbm1vZHVsZS5leHBvcnRzLlZSRGV2aWNlID0gVlJEZXZpY2U7XG5tb2R1bGUuZXhwb3J0cy5ITURWUkRldmljZSA9IEhNRFZSRGV2aWNlO1xubW9kdWxlLmV4cG9ydHMuUG9zaXRpb25TZW5zb3JWUkRldmljZSA9IFBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG4iLCJ2YXIgSE1EVlJEZXZpY2UgPSByZXF1aXJlKCcuL0hNRFZSRGV2aWNlLmpzJyk7XG5cbnZhciBERUZBVUxUX0ZPViA9IDk2O1xudmFyIERFRkFVTFRfSU5URVJQVVBJTExBUllfRElTVEFOQ0UgPSAwLjA2O1xudmFyIERFRkFVTFRfRElTVE9SVElPTl9GQUNUT1JTID0ge1xuICBrMTogMC40MTEsXG4gIGsyOiAwLjE1NlxufTtcblxuXG52YXIgQ2FyZGJvYXJkSE1EVlJEZXZpY2UgPSBmdW5jdGlvbigpe1xuICBITURWUkRldmljZS5jYWxsKHRoaXMsICcxJywgJzEnLCAncG9seWZpbGwuY2FyZGJvYXJkJywgREVGQVVMVF9GT1YsIERFRkFVTFRfSU5URVJQVVBJTExBUllfRElTVEFOQ0UsIERFRkFVTFRfRElTVE9SVElPTl9GQUNUT1JTKTtcbn07XG5cbkNhcmRib2FyZEhNRFZSRGV2aWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSE1EVlJEZXZpY2UucHJvdG90eXBlKTtcbkNhcmRib2FyZEhNRFZSRGV2aWNlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENhcmRib2FyZEhNRFZSRGV2aWNlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhcmRib2FyZEhNRFZSRGV2aWNlO1xuIiwidmFyIERPTVBvaW50ID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XG4gIHRoaXMueCA9IHg7XG4gIHRoaXMueSA9IHk7XG4gIHRoaXMueiA9IHo7XG4gIHRoaXMudyA9IHc7XG59O1xuXG5ET01Qb2ludC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBET01Qb2ludDtcblxubW9kdWxlLmV4cG9ydHMgPSBET01Qb2ludDtcbiIsInZhciBWUkV5ZVBhcmFtZXRlcnMgPSByZXF1aXJlKCcuL1ZSRXllUGFyYW1ldGVycy5qcycpO1xudmFyIFZSRGV2aWNlID0gcmVxdWlyZSgnLi9WUkRldmljZS5qcycpO1xuXG52YXIgSE1EVlJEZXZpY2UgPSBmdW5jdGlvbihoYXJkd2FyZVVuaXRJZCwgZGV2aWNlSWQsIGRldmljZU5hbWUsIGZvdiwgaW50ZXJwdXBpbGxhcnlEaXN0YW5jZSwgbGVuc0Rpc3RvcnRpb25GYWN0b3JzKXtcbiAgVlJEZXZpY2UuY2FsbCh0aGlzLCBoYXJkd2FyZVVuaXRJZCwgZGV2aWNlSWQsIGRldmljZU5hbWUpO1xuICB0aGlzLl9mb3YgPVxuICB0aGlzLl9leWVUcmFuc2xhdGlvbkxlZnQgPSBuZXcgVlJFeWVQYXJhbWV0ZXJzKGZvdiwgaW50ZXJwdXBpbGxhcnlEaXN0YW5jZSAqIC0wLjUpO1xuICB0aGlzLl9leWVUcmFuc2xhdGlvblJpZ2h0ID0gbmV3IFZSRXllUGFyYW1ldGVycyhmb3YsIGludGVycHVwaWxsYXJ5RGlzdGFuY2UgKiAwLjUpO1xuICB0aGlzLl9sZW5zRGlzdG9ydGlvbkZhY3RvcnMgPSBsZW5zRGlzdG9ydGlvbkZhY3RvcnM7XG59O1xuXG52YXIgcHJvdG8gPSBITURWUkRldmljZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFZSRGV2aWNlLnByb3RvdHlwZSk7XG5cbi8qKlxuICogQHBhcmFtIHtsZWZ0fHJpZ2h0fSB3aGljaEV5ZVxuICogQHJldHVybnMge3tyZWNvbW1lbmRlZEZpZWxkT2ZWaWV3OiAqLCBleWVUcmFuc2xhdGlvbjogKn19XG4gKi9cbnByb3RvLmdldEV5ZVBhcmFtZXRlcnMgPSBmdW5jdGlvbih3aGljaEV5ZSkge1xuICB2YXIgZXllVHJhbnNsYXRpb247XG4gIGlmICh3aGljaEV5ZSA9PSAnbGVmdCcpIHtcbiAgICBleWVUcmFuc2xhdGlvbiA9IHRoaXMuX2V5ZVRyYW5zbGF0aW9uTGVmdDtcbiAgfSBlbHNlIGlmICh3aGljaEV5ZSA9PSAncmlnaHQnKSB7XG4gICAgZXllVHJhbnNsYXRpb24gPSB0aGlzLl9leWVUcmFuc2xhdGlvblJpZ2h0O1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBleWUgcHJvdmlkZWQ6ICcgKyB3aGljaEV5ZSk7XG4gIH1cbiAgcmV0dXJuIGV5ZVRyYW5zbGF0aW9uO1xufTtcblxuLyoqXG4gKiBAcmV0dXJucyB7e2sxOiBudW1iZXIsIGsyOiBudW1iZXJ9fVxuICovXG5wcm90by5nZXRMZW5zRGlzdG9ydGlvbkZhY3RvcnMgPSBmdW5jdGlvbigpe1xuICByZXR1cm4gdGhpcy5fbGVuc0Rpc3RvcnRpb25GYWN0b3JzO1xufTtcblxucHJvdG8uY29uc3RydWN0b3IgPSBITURWUkRldmljZTtcblxubW9kdWxlLmV4cG9ydHMgPSBITURWUkRldmljZTtcbiIsInZhciBWUkRldmljZSA9IHJlcXVpcmUoJy4vVlJEZXZpY2UuanMnKTtcbnZhciBITURWUkRldmljZSA9IHJlcXVpcmUoJy4vSE1EVlJEZXZpY2UuanMnKTtcbnZhciBDYXJkYm9hcmRITURWUkRldmljZSA9IHJlcXVpcmUoJy4vQ2FyZGJvYXJkSE1EVlJEZXZpY2UuanMnKTtcblxudmFyIFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSByZXF1aXJlKCcuLi9iYXNlLmpzJykuUG9zaXRpb25TZW5zb3JWUkRldmljZTtcbnZhciBHeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZSA9IHJlcXVpcmUoJy4uL2d5cm8tcG9zaXRpb24tc2Vuc29yLXZyLWRldmljZS5qcycpO1xudmFyIE1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi4vbW91c2Uta2V5Ym9hcmQtcG9zaXRpb24tc2Vuc29yLXZyLWRldmljZS5qcycpO1xuXG5cbi8qKlxuICogQHBhcmFtIHtWUkRldmljZX0gZGVmYXVsdERldmljZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2ViVlJQb2x5ZmlsbH1cbiAqL1xudmFyIFdlYlZSUG9seWZpbGxFeHRlbmRlZCA9IGZ1bmN0aW9uKGRlZmF1bHREZXZpY2UpIHtcbiAgdGhpcy5kZXZpY2VzID0gW107XG4gIHRoaXMuX2RlZmF1bHREZXZpY2UgPSBkZWZhdWx0RGV2aWNlIHx8IG5ldyBDYXJkYm9hcmRITURWUkRldmljZSgpO1xuICB0aGlzLmVuYWJsZVBvbHlmaWxsKCk7XG59O1xuXG5XZWJWUlBvbHlmaWxsRXh0ZW5kZWQucHJvdG90eXBlID0ge1xuXG4gIGVuYWJsZVBvbHlmaWxsOiBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2dldFZSRGV2aWNlc1Byb21pc2UgPSB0aGlzLmlzV2ViVlJBdmFpbGFibGUoKSA/IG5hdmlnYXRvci5nZXRWUkRldmljZXMoKSA6IFByb21pc2UucmVzb2x2ZShbXSk7XG5cbiAgICAvLyBQcm92aWRlIG5hdmlnYXRvci5nZXRWUkRldmljZXMuXG4gICAgbmF2aWdhdG9yLmdldFZSRGV2aWNlcyA9IHRoaXMuZ2V0VlJEZXZpY2VzLmJpbmQodGhpcyk7XG5cbiAgICAvLyBrZWVwIGEgcmVmZXJlbmNlIG9mIG5hdGl2ZSBWUkRldmljZSBjb25zdHJ1Y3RvclxuICAgIHRoaXMuX25hdGl2ZUNvbnN0cnVjdG9ycyA9IHtcbiAgICAgIFZSRGV2aWNlOiB3aW5kb3cuVlJEZXZpY2UsXG4gICAgICBITURWUkRldmljZTogd2luZG93LkhNRFZSRGV2aWNlXG4gICAgfTtcblxuICAgIHdpbmRvdy5WUkRldmljZSA9IFZSRGV2aWNlO1xuICAgIHdpbmRvdy5ITURWUkRldmljZSA9IEhNRFZSRGV2aWNlO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7VlJEZXZpY2V9IGRldmljZVxuICAgKi9cbiAgc2V0RGVmYXVsdERldmljZTogZnVuY3Rpb24oZGV2aWNlKSB7XG4gICAgaWYgKCEoZGV2aWNlIGluc3RhbmNlb2YgSE1EVlJEZXZpY2UpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RlZmF1bHQgZGV2aWNlIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgSE1EVlJEZXZpY2UuJyk7XG4gICAgfVxuICAgIHRoaXMuX2RlZmF1bHREZXZpY2UgPSBkZXZpY2U7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgZ2V0VlJEZXZpY2VzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0VlJEZXZpY2VzUHJvbWlzZS50aGVuKHRoaXMuX3Byb2Nlc3NWUkRldmljZXMuYmluZCh0aGlzKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIFZSRGV2aWNlW11cbiAgICovXG4gIF9wcm9jZXNzVlJEZXZpY2VzOiBmdW5jdGlvbihuYXRpdmVEZXZpY2VzKSB7XG5cbiAgICB2YXIgZGV2aWNlQnlUeXBlID0gZnVuY3Rpb24oZGV2aWNlTGlzdCwgSW5zdGFuY2VUeXBlKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgZGV2aWNlTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZGV2aWNlTGlzdFtpXSBpbnN0YW5jZW9mIEluc3RhbmNlVHlwZSkge1xuICAgICAgICAgIHJldHVybiBkZXZpY2VMaXN0W2ldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBkZXZpY2VITURWUiA9IHRoaXMuX2RlZmF1bHREZXZpY2U7XG5cbiAgICB2YXIgZGV2aWNlU2Vuc29yID0gZGV2aWNlQnlUeXBlKG5hdGl2ZURldmljZXMsIHdpbmRvdy5Qb3NpdGlvblNlbnNvclZSRGV2aWNlKTtcbiAgICBpZiAoIWRldmljZVNlbnNvcikge1xuICAgICAgLy8gb3ZlcnJpZGUgdGhlIG5hdGl2ZSBjb25zdHJ1Y3RvciB0byBhbGxvdyBjaGVja3Mgd2l0aCBgaW5zdGFuY2VvZmBcbiAgICAgIHdpbmRvdy5Qb3NpdGlvblNlbnNvclZSRGV2aWNlID0gUG9zaXRpb25TZW5zb3JWUkRldmljZTtcbiAgICAgIGlmICh0eXBlb2Ygd2luZG93Lm9yaWVudGF0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBkZXZpY2VTZW5zb3IgPSBuZXcgR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRldmljZVNlbnNvciA9IG5ldyBNb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZGV2aWNlcyA9IFtkZXZpY2VITURWUiwgZGV2aWNlU2Vuc29yXTtcbiAgICByZXR1cm4gdGhpcy5kZXZpY2VzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzV2ViVlJBdmFpbGFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoJ2dldFZSRGV2aWNlcycgaW4gbmF2aWdhdG9yKSB8fCAoJ21vekdldFZSRGV2aWNlcycgaW4gbmF2aWdhdG9yKTtcbiAgfVxufTtcblxuXG5XZWJWUlBvbHlmaWxsRXh0ZW5kZWQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gV2ViVlJQb2x5ZmlsbEV4dGVuZGVkO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gV2ViVlJQb2x5ZmlsbEV4dGVuZGVkO1xuIiwidmFyIFZSRGV2aWNlID0gZnVuY3Rpb24oaGFyZHdhcmVVbml0SWQsIGRldmljZUlkLCBkZXZpY2VOYW1lKXtcbiAgdGhpcy5oYXJkd2FyZVVuaXRJZCA9IGhhcmR3YXJlVW5pdElkO1xuICB0aGlzLmRldmljZUlkID0gZGV2aWNlSWQ7XG4gIHRoaXMuZGV2aWNlTmFtZSA9IGRldmljZU5hbWU7XG59O1xuXG5WUkRldmljZS5wcm90b3R5cGUgPSB7fTtcblZSRGV2aWNlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZSRGV2aWNlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZSRGV2aWNlO1xuIiwidmFyIFZSRmllbGRPZlZpZXcgPSByZXF1aXJlKCcuL1ZSRmllbGRPZlZpZXcuanMnKTtcbnZhciBET01Qb2ludCA9IHJlcXVpcmUoJy4vRE9NUG9pbnQuanMnKTtcblxudmFyIFZSRXllUGFyYW1ldGVycyA9IGZ1bmN0aW9uKGZvdiwgdHJhbnNsYXRpb25YKXtcbiAgdGhpcy5fZm92ID0gbmV3IFZSRmllbGRPZlZpZXcoZm92KTtcbiAgdGhpcy5fdHJhbnNsYXRpb24gPSBuZXcgRE9NUG9pbnQodHJhbnNsYXRpb25YLCAwLCAwLCAwKTtcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFZSRXllUGFyYW1ldGVycy5wcm90b3R5cGUsIHtcbiAgbWluaW11bUZpZWxkT2ZWaWV3OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuX2ZvdjtcbiAgICB9XG4gIH0sXG5cbiAgbWF4aW11bUZpZWxkT2ZWaWV3OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuX2ZvdjtcbiAgICB9XG4gIH0sXG5cbiAgcmVjb21tZW5kZWRGaWVsZE9mVmlldzoge1xuICAgIGdldDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiB0aGlzLl9mb3Y7XG4gICAgfVxuICB9LFxuXG4gIGN1cnJlbnRGaWVsZE9mVmlldzoge1xuICAgIGdldDogZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiB0aGlzLl9mb3Y7XG4gICAgfVxuICB9LFxuXG4gIGV5ZVRyYW5zbGF0aW9uOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuX3RyYW5zbGF0aW9uO1xuICAgIH1cbiAgfSxcblxuICByZW5kZXJSZWN0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQuJyk7XG4gICAgfVxuICB9XG59KTtcblxuVlJFeWVQYXJhbWV0ZXJzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZSRXllUGFyYW1ldGVycztcblxubW9kdWxlLmV4cG9ydHMgPSBWUkV5ZVBhcmFtZXRlcnM7XG4iLCJ2YXIgVlJGaWVsZE9mVmlldyA9IGZ1bmN0aW9uKGZvdil7XG4gIHRoaXMudXBEZWdyZWVzID0gZm92LzI7XG4gIHRoaXMucmlnaHREZWdyZWVzID0gZm92LzI7XG4gIHRoaXMuZG93bkRlZ3JlZXMgPSBmb3YvMjtcbiAgdGhpcy5sZWZ0RGVncmVlcyA9IGZvdi8yO1xufTtcblxuVlJGaWVsZE9mVmlldy5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWUkZpZWxkT2ZWaWV3O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZSRmllbGRPZlZpZXc7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xudmFyIFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSByZXF1aXJlKCcuL2Jhc2UuanMnKS5Qb3NpdGlvblNlbnNvclZSRGV2aWNlO1xudmFyIFBvc2VQcmVkaWN0b3IgPSByZXF1aXJlKCcuL3Bvc2UtcHJlZGljdG9yLmpzJyk7XG52YXIgVG91Y2hQYW5uZXIgPSByZXF1aXJlKCcuL3RvdWNoLXBhbm5lci5qcycpO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwuanMnKTtcblxuV0VCVlJfWUFXX09OTFkgPSBmYWxzZTtcblxuLyoqXG4gKiBUaGUgcG9zaXRpb25hbCBzZW5zb3IsIGltcGxlbWVudGVkIHVzaW5nIHdlYiBEZXZpY2VPcmllbnRhdGlvbiBBUElzLlxuICovXG5mdW5jdGlvbiBHeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZSgpIHtcbiAgdGhpcy5kZXZpY2VJZCA9ICd3ZWJ2ci1wb2x5ZmlsbDpneXJvJztcbiAgdGhpcy5kZXZpY2VOYW1lID0gJ1ZSIFBvc2l0aW9uIERldmljZSAod2VidnItcG9seWZpbGw6Z3lybyknO1xuXG4gIC8vIFN1YnNjcmliZSB0byBkZXZpY2VvcmllbnRhdGlvbiBldmVudHMuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VvcmllbnRhdGlvbicsIHRoaXMub25EZXZpY2VPcmllbnRhdGlvbkNoYW5nZV8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2Vtb3Rpb24nLCB0aGlzLm9uRGV2aWNlTW90aW9uQ2hhbmdlXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vblNjcmVlbk9yaWVudGF0aW9uQ2hhbmdlXy5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmRldmljZU9yaWVudGF0aW9uID0gbnVsbDtcbiAgdGhpcy5zY3JlZW5PcmllbnRhdGlvbiA9IHdpbmRvdy5vcmllbnRhdGlvbi5hbmdsZTtcblxuICAvLyBIZWxwZXIgb2JqZWN0cyBmb3IgY2FsY3VsYXRpbmcgb3JpZW50YXRpb24uXG4gIHRoaXMuZmluYWxRdWF0ZXJuaW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgdGhpcy50bXBRdWF0ZXJuaW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgdGhpcy5kZXZpY2VFdWxlciA9IG5ldyBUSFJFRS5FdWxlcigpO1xuICB0aGlzLnNjcmVlblRyYW5zZm9ybSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIC8vIC1QSS8yIGFyb3VuZCB0aGUgeC1heGlzLlxuICB0aGlzLndvcmxkVHJhbnNmb3JtID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oLU1hdGguc3FydCgwLjUpLCAwLCAwLCBNYXRoLnNxcnQoMC41KSk7XG5cbiAgLy8gVGhlIHF1YXRlcm5pb24gZm9yIHRha2luZyBpbnRvIGFjY291bnQgdGhlIHJlc2V0IHBvc2l0aW9uLlxuICB0aGlzLnJlc2V0VHJhbnNmb3JtID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICB0aGlzLnRvdWNoUGFubmVyID0gbmV3IFRvdWNoUGFubmVyKCk7XG4gIHRoaXMucG9zZVByZWRpY3RvciA9IG5ldyBQb3NlUHJlZGljdG9yKCk7XG59XG5HeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUgPSBuZXcgUG9zaXRpb25TZW5zb3JWUkRldmljZSgpO1xuXG4vKipcbiAqIFJldHVybnMge29yaWVudGF0aW9uOiB7eCx5LHosd30sIHBvc2l0aW9uOiBudWxsfS5cbiAqIFBvc2l0aW9uIGlzIG5vdCBzdXBwb3J0ZWQgc2luY2Ugd2UgY2FuJ3QgZG8gNkRPRi5cbiAqL1xuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgaGFzT3JpZW50YXRpb246IHRydWUsXG4gICAgb3JpZW50YXRpb246IHRoaXMuZ2V0T3JpZW50YXRpb24oKSxcbiAgICBoYXNQb3NpdGlvbjogZmFsc2UsXG4gICAgcG9zaXRpb246IG51bGxcbiAgfVxufTtcblxuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uRGV2aWNlT3JpZW50YXRpb25DaGFuZ2VfID1cbiAgICBmdW5jdGlvbihkZXZpY2VPcmllbnRhdGlvbikge1xuICB0aGlzLmRldmljZU9yaWVudGF0aW9uID0gZGV2aWNlT3JpZW50YXRpb247XG59O1xuXG5HeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUub25EZXZpY2VNb3Rpb25DaGFuZ2VfID1cbiAgICBmdW5jdGlvbihkZXZpY2VNb3Rpb24pIHtcbiAgdGhpcy5kZXZpY2VNb3Rpb24gPSBkZXZpY2VNb3Rpb247XG59O1xuXG5HeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUub25TY3JlZW5PcmllbnRhdGlvbkNoYW5nZV8gPVxuICAgIGZ1bmN0aW9uKHNjcmVlbk9yaWVudGF0aW9uKSB7XG4gIHRoaXMuc2NyZWVuT3JpZW50YXRpb24gPSB3aW5kb3cub3JpZW50YXRpb24uYW5nbGU7XG59O1xuXG5HeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuZ2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZGV2aWNlT3JpZW50YXRpb24gPT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gUm90YXRpb24gYXJvdW5kIHRoZSB6LWF4aXMuXG4gIHZhciBhbHBoYSA9IFRIUkVFLk1hdGguZGVnVG9SYWQodGhpcy5kZXZpY2VPcmllbnRhdGlvbi5hbHBoYSk7XG4gIC8vIEZyb250LXRvLWJhY2sgKGluIHBvcnRyYWl0KSByb3RhdGlvbiAoeC1heGlzKS5cbiAgdmFyIGJldGEgPSBUSFJFRS5NYXRoLmRlZ1RvUmFkKHRoaXMuZGV2aWNlT3JpZW50YXRpb24uYmV0YSk7XG4gIC8vIExlZnQgdG8gcmlnaHQgKGluIHBvcnRyYWl0KSByb3RhdGlvbiAoeS1heGlzKS5cbiAgdmFyIGdhbW1hID0gVEhSRUUuTWF0aC5kZWdUb1JhZCh0aGlzLmRldmljZU9yaWVudGF0aW9uLmdhbW1hKTtcbiAgdmFyIG9yaWVudCA9IFRIUkVFLk1hdGguZGVnVG9SYWQodGhpcy5zY3JlZW5PcmllbnRhdGlvbik7XG5cbiAgLy8gVXNlIHRocmVlLmpzIHRvIGNvbnZlcnQgdG8gcXVhdGVybmlvbi4gTGlmdGVkIGZyb21cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3JpY2h0ci90aHJlZVZSL2Jsb2IvbWFzdGVyL2pzL0RldmljZU9yaWVudGF0aW9uQ29udHJvbGxlci5qc1xuICB0aGlzLmRldmljZUV1bGVyLnNldChiZXRhLCBhbHBoYSwgLWdhbW1hLCAnWVhaJyk7XG4gIHRoaXMudG1wUXVhdGVybmlvbi5zZXRGcm9tRXVsZXIodGhpcy5kZXZpY2VFdWxlcik7XG4gIHRoaXMubWludXNIYWxmQW5nbGUgPSAtb3JpZW50IC8gMjtcbiAgdGhpcy5zY3JlZW5UcmFuc2Zvcm0uc2V0KDAsIE1hdGguc2luKHRoaXMubWludXNIYWxmQW5nbGUpLCAwLCBNYXRoLmNvcyh0aGlzLm1pbnVzSGFsZkFuZ2xlKSk7XG4gIC8vIFRha2UgaW50byBhY2NvdW50IHRoZSByZXNldCB0cmFuc2Zvcm1hdGlvbi5cbiAgdGhpcy5maW5hbFF1YXRlcm5pb24uY29weSh0aGlzLnJlc2V0VHJhbnNmb3JtKTtcbiAgLy8gQW5kIGFueSByb3RhdGlvbnMgZG9uZSB2aWEgdG91Y2ggZXZlbnRzLlxuICB0aGlzLmZpbmFsUXVhdGVybmlvbi5tdWx0aXBseSh0aGlzLnRvdWNoUGFubmVyLmdldE9yaWVudGF0aW9uKCkpO1xuICB0aGlzLmZpbmFsUXVhdGVybmlvbi5tdWx0aXBseSh0aGlzLnRtcFF1YXRlcm5pb24pO1xuICB0aGlzLmZpbmFsUXVhdGVybmlvbi5tdWx0aXBseSh0aGlzLnNjcmVlblRyYW5zZm9ybSk7XG4gIHRoaXMuZmluYWxRdWF0ZXJuaW9uLm11bHRpcGx5KHRoaXMud29ybGRUcmFuc2Zvcm0pO1xuXG4gIHRoaXMucG9zZVByZWRpY3Rvci5zZXRTY3JlZW5PcmllbnRhdGlvbih0aGlzLnNjcmVlbk9yaWVudGF0aW9uKTtcblxuICB2YXIgYmVzdFRpbWUgPSB0aGlzLmRldmljZU9yaWVudGF0aW9uLnRpbWVTdGFtcDtcbiAgdmFyIHJvdFJhdGUgPSB0aGlzLmRldmljZU1vdGlvbiAmJiB0aGlzLmRldmljZU1vdGlvbi5yb3RhdGlvblJhdGU7XG4gIHZhciBvdXQgPSB0aGlzLnBvc2VQcmVkaWN0b3IuZ2V0UHJlZGljdGlvbihcbiAgICAgIHRoaXMuZmluYWxRdWF0ZXJuaW9uLCByb3RSYXRlLCBiZXN0VGltZSk7XG5cbiAgLy8gQWRqdXN0IGZvciBwaXRjaCBjb25zdHJhaW50cyAoZm9yIG5vbi1zcGhlcmljYWwgcGFub3MpLlxuICBpZiAoV0VCVlJfWUFXX09OTFkpIHtcbiAgICBvdXQueCA9IDA7XG4gICAgb3V0LnogPSAwO1xuICAgIG91dC5ub3JtYWxpemUoKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufTtcblxuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLnJlc2V0U2Vuc29yID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhbmdsZSA9IFRIUkVFLk1hdGguZGVnVG9SYWQodGhpcy5kZXZpY2VPcmllbnRhdGlvbi5hbHBoYSk7XG4gIGNvbnNvbGUubG9nKCdOb3JtYWxpemluZyB5YXcgdG8gJWYnLCBhbmdsZSk7XG4gIHRoaXMucmVzZXRUcmFuc2Zvcm0uc2V0RnJvbUF4aXNBbmdsZShuZXcgVEhSRUUuVmVjdG9yMygwLCAxLCAwKSwgLWFuZ2xlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG4vLyBDTTogbXVzdCBjcmVhdGUgb3VyIG93biBwb2x5ZmlsbCBpbnN0YW5jZVxuLy92YXIgV2ViVlJQb2x5ZmlsbCA9IHJlcXVpcmUoJy4vd2VidnItcG9seWZpbGwuanMnKTtcbi8vXG4vLyBuZXcgV2ViVlJQb2x5ZmlsbCgpO1xuXG5cbnZhciBXZWJWUlBvbHlmaWxsID0gcmVxdWlyZSgnLi9jbS9Qb2x5ZmlsbC5qcycpO1xud2luZG93LlZSID0gd2luZG93LlZSIHx8IHt9O1xud2luZG93LlZSLndlYlZSUG9seWZpbGwgPSBuZXcgV2ViVlJQb2x5ZmlsbCgpO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbnZhciBQb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi9iYXNlLmpzJykuUG9zaXRpb25TZW5zb3JWUkRldmljZTtcbnZhciBVdGlsID0gcmVxdWlyZSgnLi91dGlsLmpzJyk7XG5cbi8vIEhvdyBtdWNoIHRvIHJvdGF0ZSBwZXIga2V5IHN0cm9rZS5cbnZhciBLRVlfU1BFRUQgPSAwLjE1O1xudmFyIEtFWV9BTklNQVRJT05fRFVSQVRJT04gPSA4MDtcblxuLy8gSG93IG11Y2ggdG8gcm90YXRlIGZvciBtb3VzZSBldmVudHMuXG52YXIgTU9VU0VfU1BFRURfWCA9IDAuNTtcbnZhciBNT1VTRV9TUEVFRF9ZID0gMC4zO1xuXG4vKipcbiAqIEEgdmlydHVhbCBwb3NpdGlvbiBzZW5zb3IsIGltcGxlbWVudGVkIHVzaW5nIGtleWJvYXJkIGFuZFxuICogbW91c2UgQVBJcy4gVGhpcyBpcyBkZXNpZ25lZCBhcyBmb3IgZGVza3RvcHMvbGFwdG9wcyB3aGVyZSBubyBEZXZpY2UqXG4gKiBldmVudHMgd29yay5cbiAqL1xuZnVuY3Rpb24gTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKSB7XG4gIHRoaXMuZGV2aWNlSWQgPSAnd2VidnItcG9seWZpbGw6bW91c2Uta2V5Ym9hcmQnO1xuICB0aGlzLmRldmljZU5hbWUgPSAnVlIgUG9zaXRpb24gRGV2aWNlICh3ZWJ2ci1wb2x5ZmlsbDptb3VzZS1rZXlib2FyZCknO1xuXG4gIC8vIEF0dGFjaCB0byBtb3VzZSBhbmQga2V5Ym9hcmQgZXZlbnRzLlxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMub25LZXlEb3duXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmVfLmJpbmQodGhpcykpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5vbk1vdXNlRG93bl8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgdGhpcy5vbk1vdXNlVXBfLmJpbmQodGhpcykpO1xuXG4gIHRoaXMucGhpID0gMDtcbiAgdGhpcy50aGV0YSA9IDA7XG5cbiAgLy8gVmFyaWFibGVzIGZvciBrZXlib2FyZC1iYXNlZCByb3RhdGlvbiBhbmltYXRpb24uXG4gIHRoaXMudGFyZ2V0QW5nbGUgPSBudWxsO1xuXG4gIC8vIFN0YXRlIHZhcmlhYmxlcyBmb3IgY2FsY3VsYXRpb25zLlxuICB0aGlzLmV1bGVyID0gbmV3IFRIUkVFLkV1bGVyKCk7XG4gIHRoaXMub3JpZW50YXRpb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXG4gIC8vIFZhcmlhYmxlcyBmb3IgbW91c2UtYmFzZWQgcm90YXRpb24uXG4gIHRoaXMucm90YXRlU3RhcnQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICB0aGlzLnJvdGF0ZUVuZCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gIHRoaXMucm90YXRlRGVsdGEgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xufVxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlID0gbmV3IFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKTtcblxuLyoqXG4gKiBSZXR1cm5zIHtvcmllbnRhdGlvbjoge3gseSx6LHd9LCBwb3NpdGlvbjogbnVsbH0uXG4gKiBQb3NpdGlvbiBpcyBub3Qgc3VwcG9ydGVkIGZvciBwYXJpdHkgd2l0aCBvdGhlciBQb3NpdGlvblNlbnNvcnMuXG4gKi9cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5nZXRTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmV1bGVyLnNldCh0aGlzLnBoaSwgdGhpcy50aGV0YSwgMCwgJ1lYWicpO1xuICB0aGlzLm9yaWVudGF0aW9uLnNldEZyb21FdWxlcih0aGlzLmV1bGVyKTtcblxuICByZXR1cm4ge1xuICAgIGhhc09yaWVudGF0aW9uOiB0cnVlLFxuICAgIG9yaWVudGF0aW9uOiB0aGlzLm9yaWVudGF0aW9uLFxuICAgIGhhc1Bvc2l0aW9uOiBmYWxzZSxcbiAgICBwb3NpdGlvbjogbnVsbFxuICB9XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUub25LZXlEb3duXyA9IGZ1bmN0aW9uKGUpIHtcbiAgLy8gVHJhY2sgV0FTRCBhbmQgYXJyb3cga2V5cy5cbiAgaWYgKGUua2V5Q29kZSA9PSAzOCkgeyAvLyBVcCBrZXkuXG4gICAgdGhpcy5hbmltYXRlUGhpXyh0aGlzLnBoaSArIEtFWV9TUEVFRCk7XG4gIH0gZWxzZSBpZiAoZS5rZXlDb2RlID09IDM5KSB7IC8vIFJpZ2h0IGtleS5cbiAgICB0aGlzLmFuaW1hdGVUaGV0YV8odGhpcy50aGV0YSAtIEtFWV9TUEVFRCk7XG4gIH0gZWxzZSBpZiAoZS5rZXlDb2RlID09IDQwKSB7IC8vIERvd24ga2V5LlxuICAgIHRoaXMuYW5pbWF0ZVBoaV8odGhpcy5waGkgLSBLRVlfU1BFRUQpO1xuICB9IGVsc2UgaWYgKGUua2V5Q29kZSA9PSAzNykgeyAvLyBMZWZ0IGtleS5cbiAgICB0aGlzLmFuaW1hdGVUaGV0YV8odGhpcy50aGV0YSArIEtFWV9TUEVFRCk7XG4gIH1cbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5hbmltYXRlVGhldGFfID0gZnVuY3Rpb24odGFyZ2V0QW5nbGUpIHtcbiAgdGhpcy5hbmltYXRlS2V5VHJhbnNpdGlvbnNfKCd0aGV0YScsIHRhcmdldEFuZ2xlKTtcbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5hbmltYXRlUGhpXyA9IGZ1bmN0aW9uKHRhcmdldEFuZ2xlKSB7XG4gIC8vIFByZXZlbnQgbG9va2luZyB0b28gZmFyIHVwIG9yIGRvd24uXG4gIHRhcmdldEFuZ2xlID0gVXRpbC5jbGFtcCh0YXJnZXRBbmdsZSwgLU1hdGguUEkvMiwgTWF0aC5QSS8yKTtcbiAgdGhpcy5hbmltYXRlS2V5VHJhbnNpdGlvbnNfKCdwaGknLCB0YXJnZXRBbmdsZSk7XG59O1xuXG4vKipcbiAqIFN0YXJ0IGFuIGFuaW1hdGlvbiB0byB0cmFuc2l0aW9uIGFuIGFuZ2xlIGZyb20gb25lIHZhbHVlIHRvIGFub3RoZXIuXG4gKi9cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5hbmltYXRlS2V5VHJhbnNpdGlvbnNfID0gZnVuY3Rpb24oYW5nbGVOYW1lLCB0YXJnZXRBbmdsZSkge1xuICAvLyBJZiBhbiBhbmltYXRpb24gaXMgY3VycmVudGx5IHJ1bm5pbmcsIGNhbmNlbCBpdC5cbiAgaWYgKHRoaXMuYW5nbGVBbmltYXRpb24pIHtcbiAgICBjbGVhckludGVydmFsKHRoaXMuYW5nbGVBbmltYXRpb24pO1xuICB9XG4gIHZhciBzdGFydEFuZ2xlID0gdGhpc1thbmdsZU5hbWVdO1xuICB2YXIgc3RhcnRUaW1lID0gbmV3IERhdGUoKTtcbiAgLy8gU2V0IHVwIGFuIGludGVydmFsIHRpbWVyIHRvIHBlcmZvcm0gdGhlIGFuaW1hdGlvbi5cbiAgdGhpcy5hbmdsZUFuaW1hdGlvbiA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgIC8vIE9uY2Ugd2UncmUgZmluaXNoZWQgdGhlIGFuaW1hdGlvbiwgd2UncmUgZG9uZS5cbiAgICB2YXIgZWxhcHNlZCA9IG5ldyBEYXRlKCkgLSBzdGFydFRpbWU7XG4gICAgaWYgKGVsYXBzZWQgPj0gS0VZX0FOSU1BVElPTl9EVVJBVElPTikge1xuICAgICAgdGhpc1thbmdsZU5hbWVdID0gdGFyZ2V0QW5nbGU7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMuYW5nbGVBbmltYXRpb24pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBMaW5lYXJseSBpbnRlcnBvbGF0ZSB0aGUgYW5nbGUgc29tZSBhbW91bnQuXG4gICAgdmFyIHBlcmNlbnQgPSBlbGFwc2VkIC8gS0VZX0FOSU1BVElPTl9EVVJBVElPTjtcbiAgICB0aGlzW2FuZ2xlTmFtZV0gPSBzdGFydEFuZ2xlICsgKHRhcmdldEFuZ2xlIC0gc3RhcnRBbmdsZSkgKiBwZXJjZW50O1xuICB9LmJpbmQodGhpcyksIDEwMDAvNjApO1xufTtcblxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uTW91c2VEb3duXyA9IGZ1bmN0aW9uKGUpIHtcbiAgdGhpcy5yb3RhdGVTdGFydC5zZXQoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuICB0aGlzLmlzRHJhZ2dpbmcgPSB0cnVlO1xufTtcblxuLy8gVmVyeSBzaW1pbGFyIHRvIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL21yZmxpeC84MzUxMDIwXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUub25Nb3VzZU1vdmVfID0gZnVuY3Rpb24oZSkge1xuICBpZiAoIXRoaXMuaXNEcmFnZ2luZyAmJiAhdGhpcy5pc1BvaW50ZXJMb2NrZWRfKCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gU3VwcG9ydCBwb2ludGVyIGxvY2sgQVBJLlxuICBpZiAodGhpcy5pc1BvaW50ZXJMb2NrZWRfKCkpIHtcbiAgICB2YXIgbW92ZW1lbnRYID0gZS5tb3ZlbWVudFggfHwgZS5tb3pNb3ZlbWVudFggfHwgMDtcbiAgICB2YXIgbW92ZW1lbnRZID0gZS5tb3ZlbWVudFkgfHwgZS5tb3pNb3ZlbWVudFkgfHwgMDtcbiAgICB0aGlzLnJvdGF0ZUVuZC5zZXQodGhpcy5yb3RhdGVTdGFydC54IC0gbW92ZW1lbnRYLCB0aGlzLnJvdGF0ZVN0YXJ0LnkgLSBtb3ZlbWVudFkpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucm90YXRlRW5kLnNldChlLmNsaWVudFgsIGUuY2xpZW50WSk7XG4gIH1cbiAgLy8gQ2FsY3VsYXRlIGhvdyBtdWNoIHdlIG1vdmVkIGluIG1vdXNlIHNwYWNlLlxuICB0aGlzLnJvdGF0ZURlbHRhLnN1YlZlY3RvcnModGhpcy5yb3RhdGVFbmQsIHRoaXMucm90YXRlU3RhcnQpO1xuICB0aGlzLnJvdGF0ZVN0YXJ0LmNvcHkodGhpcy5yb3RhdGVFbmQpO1xuXG4gIC8vIEtlZXAgdHJhY2sgb2YgdGhlIGN1bXVsYXRpdmUgZXVsZXIgYW5nbGVzLlxuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmJvZHk7XG4gIHRoaXMucGhpICs9IDIgKiBNYXRoLlBJICogdGhpcy5yb3RhdGVEZWx0YS55IC8gZWxlbWVudC5jbGllbnRIZWlnaHQgKiBNT1VTRV9TUEVFRF9ZO1xuICB0aGlzLnRoZXRhICs9IDIgKiBNYXRoLlBJICogdGhpcy5yb3RhdGVEZWx0YS54IC8gZWxlbWVudC5jbGllbnRXaWR0aCAqIE1PVVNFX1NQRUVEX1g7XG5cbiAgLy8gUHJldmVudCBsb29raW5nIHRvbyBmYXIgdXAgb3IgZG93bi5cbiAgdGhpcy5waGkgPSBVdGlsLmNsYW1wKHRoaXMucGhpLCAtTWF0aC5QSS8yLCBNYXRoLlBJLzIpO1xufTtcblxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uTW91c2VVcF8gPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xufTtcblxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmlzUG9pbnRlckxvY2tlZF8gPSBmdW5jdGlvbigpIHtcbiAgdmFyIGVsID0gZG9jdW1lbnQucG9pbnRlckxvY2tFbGVtZW50IHx8IGRvY3VtZW50Lm1velBvaW50ZXJMb2NrRWxlbWVudCB8fFxuICAgICAgZG9jdW1lbnQud2Via2l0UG9pbnRlckxvY2tFbGVtZW50O1xuICByZXR1cm4gZWwgIT09IHVuZGVmaW5lZDtcbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5yZXNldFNlbnNvciA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmVycm9yKCdOb3QgaW1wbGVtZW50ZWQgeWV0LicpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbnZhciBQcmVkaWN0aW9uTW9kZSA9IHtcbiAgTk9ORTogJ25vbmUnLFxuICBJTlRFUlBPTEFURTogJ2ludGVycG9sYXRlJyxcbiAgUFJFRElDVDogJ3ByZWRpY3QnXG59XG5cbi8vIEhvdyBtdWNoIHRvIGludGVycG9sYXRlIGJldHdlZW4gdGhlIGN1cnJlbnQgb3JpZW50YXRpb24gZXN0aW1hdGUgYW5kIHRoZVxuLy8gcHJldmlvdXMgZXN0aW1hdGUgcG9zaXRpb24uIFRoaXMgaXMgaGVscGZ1bCBmb3IgZGV2aWNlcyB3aXRoIGxvd1xuLy8gZGV2aWNlb3JpZW50YXRpb24gZmlyaW5nIGZyZXF1ZW5jeSAoZWcuIG9uIGlPUzggYW5kIGJlbG93LCBpdCBpcyAyMCBIeikuICBUaGVcbi8vIGxhcmdlciB0aGlzIHZhbHVlIChpbiBbMCwgMV0pLCB0aGUgc21vb3RoZXIgYnV0IG1vcmUgZGVsYXllZCB0aGUgaGVhZFxuLy8gdHJhY2tpbmcgaXMuXG52YXIgSU5URVJQT0xBVElPTl9TTU9PVEhJTkdfRkFDVE9SID0gMC4wMTtcblxuLy8gQW5ndWxhciB0aHJlc2hvbGQsIGlmIHRoZSBhbmd1bGFyIHNwZWVkIChpbiBkZWcvcykgaXMgbGVzcyB0aGFuIHRoaXMsIGRvIG5vXG4vLyBwcmVkaWN0aW9uLiBXaXRob3V0IGl0LCB0aGUgc2NyZWVuIGZsaWNrZXJzIHF1aXRlIGEgYml0LlxudmFyIFBSRURJQ1RJT05fVEhSRVNIT0xEX0RFR19QRVJfUyA9IDAuMDE7XG4vL3ZhciBQUkVESUNUSU9OX1RIUkVTSE9MRF9ERUdfUEVSX1MgPSAwO1xuXG4vLyBIb3cgZmFyIGludG8gdGhlIGZ1dHVyZSB0byBwcmVkaWN0LlxuV0VCVlJfUFJFRElDVElPTl9USU1FX01TID0gODA7XG5cbi8vIFdoZXRoZXIgdG8gcHJlZGljdCBvciB3aGF0LlxuV0VCVlJfUFJFRElDVElPTl9NT0RFID0gUHJlZGljdGlvbk1vZGUuUFJFRElDVDtcblxuZnVuY3Rpb24gUG9zZVByZWRpY3RvcigpIHtcbiAgdGhpcy5sYXN0USA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMubGFzdFRpbWVzdGFtcCA9IG51bGw7XG5cbiAgdGhpcy5vdXRRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgdGhpcy5kZWx0YVEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xufVxuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRQcmVkaWN0aW9uID0gZnVuY3Rpb24oY3VycmVudFEsIHJvdGF0aW9uUmF0ZSwgdGltZXN0YW1wKSB7XG4gIC8vIElmIHRoZXJlJ3Mgbm8gcHJldmlvdXMgcXVhdGVybmlvbiwgb3V0cHV0IHRoZSBjdXJyZW50IG9uZSBhbmQgc2F2ZSBmb3JcbiAgLy8gbGF0ZXIuXG4gIGlmICghdGhpcy5sYXN0VGltZXN0YW1wKSB7XG4gICAgdGhpcy5sYXN0US5jb3B5KGN1cnJlbnRRKTtcbiAgICB0aGlzLmxhc3RUaW1lc3RhbXAgPSB0aW1lc3RhbXA7XG4gICAgcmV0dXJuIGN1cnJlbnRRO1xuICB9XG5cbiAgLy8gREVCVUcgT05MWTogVHJ5IHdpdGggYSBmaXhlZCA2MCBIeiB1cGRhdGUgc3BlZWQuXG4gIC8vdmFyIGVsYXBzZWRNcyA9IDEwMDAvNjA7XG4gIHZhciBlbGFwc2VkTXMgPSB0aW1lc3RhbXAgLSB0aGlzLmxhc3RUaW1lc3RhbXA7XG5cbiAgc3dpdGNoIChXRUJWUl9QUkVESUNUSU9OX01PREUpIHtcbiAgICBjYXNlIFByZWRpY3Rpb25Nb2RlLklOVEVSUE9MQVRFOlxuICAgICAgdGhpcy5vdXRRLmNvcHkoY3VycmVudFEpO1xuICAgICAgdGhpcy5vdXRRLnNsZXJwKHRoaXMubGFzdFEsIElOVEVSUE9MQVRJT05fU01PT1RISU5HX0ZBQ1RPUik7XG5cbiAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgcXVhdGVybmlvbiBmb3IgbGF0ZXIuXG4gICAgICB0aGlzLmxhc3RRLmNvcHkoY3VycmVudFEpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBQcmVkaWN0aW9uTW9kZS5QUkVESUNUOlxuICAgICAgdmFyIGF4aXNBbmdsZTtcbiAgICAgIGlmIChyb3RhdGlvblJhdGUpIHtcbiAgICAgICAgYXhpc0FuZ2xlID0gdGhpcy5nZXRBeGlzQW5ndWxhclNwZWVkRnJvbVJvdGF0aW9uUmF0ZV8ocm90YXRpb25SYXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF4aXNBbmdsZSA9IHRoaXMuZ2V0QXhpc0FuZ3VsYXJTcGVlZEZyb21HeXJvRGVsdGFfKGN1cnJlbnRRLCBlbGFwc2VkTXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBubyBwcmVkaWN0ZWQgYXhpcy9hbmdsZSwgZG9uJ3QgZG8gcHJlZGljdGlvbi5cbiAgICAgIGlmICghYXhpc0FuZ2xlKSB7XG4gICAgICAgIHRoaXMub3V0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgICAgdGhpcy5sYXN0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB2YXIgYW5ndWxhclNwZWVkRGVnUyA9IGF4aXNBbmdsZS5zcGVlZDtcbiAgICAgIHZhciBheGlzID0gYXhpc0FuZ2xlLmF4aXM7XG4gICAgICB2YXIgcHJlZGljdEFuZ2xlRGVnID0gKFdFQlZSX1BSRURJQ1RJT05fVElNRV9NUyAvIDEwMDApICogYW5ndWxhclNwZWVkRGVnUztcblxuICAgICAgLy8gSWYgd2UncmUgcm90YXRpbmcgc2xvd2x5LCBkb24ndCBkbyBwcmVkaWN0aW9uLlxuICAgICAgaWYgKGFuZ3VsYXJTcGVlZERlZ1MgPCBQUkVESUNUSU9OX1RIUkVTSE9MRF9ERUdfUEVSX1MpIHtcbiAgICAgICAgdGhpcy5vdXRRLmNvcHkoY3VycmVudFEpO1xuICAgICAgICB0aGlzLmxhc3RRLmNvcHkoY3VycmVudFEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBwcmVkaWN0aW9uIGRlbHRhIHRvIGFwcGx5IHRvIHRoZSBvcmlnaW5hbCBhbmdsZS5cbiAgICAgIHRoaXMuZGVsdGFRLnNldEZyb21BeGlzQW5nbGUoYXhpcywgVEhSRUUuTWF0aC5kZWdUb1JhZChwcmVkaWN0QW5nbGVEZWcpKTtcbiAgICAgIC8vIERFQlVHIE9OTFk6IEFzIGEgc2FuaXR5IGNoZWNrLCB1c2UgdGhlIHNhbWUgYXhpcyBhbmQgYW5nbGUgYXMgYmVmb3JlLFxuICAgICAgLy8gd2hpY2ggc2hvdWxkIGNhdXNlIG5vIHByZWRpY3Rpb24gdG8gaGFwcGVuLlxuICAgICAgLy90aGlzLmRlbHRhUS5zZXRGcm9tQXhpc0FuZ2xlKGF4aXMsIGFuZ2xlKTtcblxuICAgICAgdGhpcy5vdXRRLmNvcHkodGhpcy5sYXN0USk7XG4gICAgICB0aGlzLm91dFEubXVsdGlwbHkodGhpcy5kZWx0YVEpO1xuXG4gICAgICAvLyBVc2UgdGhlIHByZWRpY3RlZCBxdWF0ZXJuaW9uIGFzIHRoZSBuZXcgbGFzdCBvbmUuXG4gICAgICAvL3RoaXMubGFzdFEuY29weSh0aGlzLm91dFEpO1xuICAgICAgdGhpcy5sYXN0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgUHJlZGljdGlvbk1vZGUuTk9ORTpcbiAgICBkZWZhdWx0OlxuICAgICAgdGhpcy5vdXRRLmNvcHkoY3VycmVudFEpO1xuICB9XG4gIHRoaXMubGFzdFRpbWVzdGFtcCA9IHRpbWVzdGFtcDtcblxuICByZXR1cm4gdGhpcy5vdXRRO1xufTtcblxuUG9zZVByZWRpY3Rvci5wcm90b3R5cGUuc2V0U2NyZWVuT3JpZW50YXRpb24gPSBmdW5jdGlvbihzY3JlZW5PcmllbnRhdGlvbikge1xuICB0aGlzLnNjcmVlbk9yaWVudGF0aW9uID0gc2NyZWVuT3JpZW50YXRpb247XG59O1xuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRBeGlzXyA9IGZ1bmN0aW9uKHF1YXQpIHtcbiAgLy8geCA9IHF4IC8gc3FydCgxLXF3KnF3KVxuICAvLyB5ID0gcXkgLyBzcXJ0KDEtcXcqcXcpXG4gIC8vIHogPSBxeiAvIHNxcnQoMS1xdypxdylcbiAgdmFyIGQgPSBNYXRoLnNxcnQoMSAtIHF1YXQudyAqIHF1YXQudyk7XG4gIHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyhxdWF0LnggLyBkLCBxdWF0LnkgLyBkLCBxdWF0LnogLyBkKTtcbn07XG5cblBvc2VQcmVkaWN0b3IucHJvdG90eXBlLmdldEFuZ2xlXyA9IGZ1bmN0aW9uKHF1YXQpIHtcbiAgLy8gYW5nbGUgPSAyICogYWNvcyhxdylcbiAgLy8gSWYgdyBpcyBncmVhdGVyIHRoYW4gMSAoVEhSRUUuanMsIGhvdyBjYW4gdGhpcyBiZT8pLCBhcmNjb3MgaXMgbm90IGRlZmluZWQuXG4gIGlmIChxdWF0LncgPiAxKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbiAgdmFyIGFuZ2xlID0gMiAqIE1hdGguYWNvcyhxdWF0LncpO1xuICAvLyBOb3JtYWxpemUgdGhlIGFuZ2xlIHRvIGJlIGluIFstz4AsIM+AXS5cbiAgaWYgKGFuZ2xlID4gTWF0aC5QSSkge1xuICAgIGFuZ2xlIC09IDIgKiBNYXRoLlBJO1xuICB9XG4gIHJldHVybiBhbmdsZTtcbn07XG5cblBvc2VQcmVkaWN0b3IucHJvdG90eXBlLmdldEF4aXNBbmd1bGFyU3BlZWRGcm9tUm90YXRpb25SYXRlXyA9IGZ1bmN0aW9uKHJvdGF0aW9uUmF0ZSkge1xuICBpZiAoIXJvdGF0aW9uUmF0ZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZhciBzY3JlZW5Sb3RhdGlvblJhdGU7XG4gIGlmICgvaVBhZHxpUGhvbmV8aVBvZC8udGVzdChuYXZpZ2F0b3IucGxhdGZvcm0pKSB7XG4gICAgLy8gaU9TOiBhbmd1bGFyIHNwZWVkIGluIGRlZy9zLlxuICAgIHZhciBzY3JlZW5Sb3RhdGlvblJhdGUgPSB0aGlzLmdldFNjcmVlbkFkanVzdGVkUm90YXRpb25SYXRlSU9TXyhyb3RhdGlvblJhdGUpO1xuICB9IGVsc2Uge1xuICAgIC8vIEFuZHJvaWQ6IGFuZ3VsYXIgc3BlZWQgaW4gcmFkL3MsIHNvIG5lZWQgdG8gY29udmVydC5cbiAgICByb3RhdGlvblJhdGUuYWxwaGEgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKHJvdGF0aW9uUmF0ZS5hbHBoYSk7XG4gICAgcm90YXRpb25SYXRlLmJldGEgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKHJvdGF0aW9uUmF0ZS5iZXRhKTtcbiAgICByb3RhdGlvblJhdGUuZ2FtbWEgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKHJvdGF0aW9uUmF0ZS5nYW1tYSk7XG4gICAgdmFyIHNjcmVlblJvdGF0aW9uUmF0ZSA9IHRoaXMuZ2V0U2NyZWVuQWRqdXN0ZWRSb3RhdGlvblJhdGVfKHJvdGF0aW9uUmF0ZSk7XG4gIH1cbiAgdmFyIHZlYyA9IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmJldGEsIHNjcmVlblJvdGF0aW9uUmF0ZS5hbHBoYSwgc2NyZWVuUm90YXRpb25SYXRlLmdhbW1hKTtcblxuICAvKlxuICB2YXIgdmVjO1xuICBpZiAoL2lQYWR8aVBob25lfGlQb2QvLnRlc3QobmF2aWdhdG9yLnBsYXRmb3JtKSkge1xuICAgIHZlYyA9IG5ldyBUSFJFRS5WZWN0b3IzKHJvdGF0aW9uUmF0ZS5nYW1tYSwgcm90YXRpb25SYXRlLmFscGhhLCByb3RhdGlvblJhdGUuYmV0YSk7XG4gIH0gZWxzZSB7XG4gICAgdmVjID0gbmV3IFRIUkVFLlZlY3RvcjMocm90YXRpb25SYXRlLmJldGEsIHJvdGF0aW9uUmF0ZS5hbHBoYSwgcm90YXRpb25SYXRlLmdhbW1hKTtcbiAgfVxuICAvLyBUYWtlIGludG8gYWNjb3VudCB0aGUgc2NyZWVuIG9yaWVudGF0aW9uIHRvbyFcbiAgdmVjLmFwcGx5UXVhdGVybmlvbih0aGlzLnNjcmVlblRyYW5zZm9ybSk7XG4gICovXG5cbiAgLy8gQW5ndWxhciBzcGVlZCBpbiBkZWcvcy5cbiAgdmFyIGFuZ3VsYXJTcGVlZERlZ1MgPSB2ZWMubGVuZ3RoKCk7XG5cbiAgdmFyIGF4aXMgPSB2ZWMubm9ybWFsaXplKCk7XG4gIHJldHVybiB7XG4gICAgc3BlZWQ6IGFuZ3VsYXJTcGVlZERlZ1MsXG4gICAgYXhpczogYXhpc1xuICB9XG59O1xuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRTY3JlZW5BZGp1c3RlZFJvdGF0aW9uUmF0ZV8gPSBmdW5jdGlvbihyb3RhdGlvblJhdGUpIHtcbiAgdmFyIHNjcmVlblJvdGF0aW9uUmF0ZSA9IHtcbiAgICBhbHBoYTogLXJvdGF0aW9uUmF0ZS5hbHBoYSxcbiAgICBiZXRhOiByb3RhdGlvblJhdGUuYmV0YSxcbiAgICBnYW1tYTogcm90YXRpb25SYXRlLmdhbW1hXG4gIH07XG4gIHN3aXRjaCAodGhpcy5zY3JlZW5PcmllbnRhdGlvbikge1xuICAgIGNhc2UgOTA6XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuYmV0YSAgPSAtIHJvdGF0aW9uUmF0ZS5nYW1tYTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5nYW1tYSA9ICAgcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE4MDpcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhICA9IC0gcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAtIHJvdGF0aW9uUmF0ZS5nYW1tYTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjcwOlxuICAgIGNhc2UgLTkwOlxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmJldGEgID0gICByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAtIHJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDogLy8gU0NSRUVOX1JPVEFUSU9OXzBcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhICA9ICAgcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAgIHJvdGF0aW9uUmF0ZS5nYW1tYTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiBzY3JlZW5Sb3RhdGlvblJhdGU7XG59O1xuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRTY3JlZW5BZGp1c3RlZFJvdGF0aW9uUmF0ZUlPU18gPSBmdW5jdGlvbihyb3RhdGlvblJhdGUpIHtcbiAgdmFyIHNjcmVlblJvdGF0aW9uUmF0ZSA9IHtcbiAgICBhbHBoYTogcm90YXRpb25SYXRlLmFscGhhLFxuICAgIGJldGE6IHJvdGF0aW9uUmF0ZS5iZXRhLFxuICAgIGdhbW1hOiByb3RhdGlvblJhdGUuZ2FtbWFcbiAgfTtcbiAgLy8gVmFsdWVzIGVtcGlyaWNhbGx5IGRlcml2ZWQuXG4gIHN3aXRjaCAodGhpcy5zY3JlZW5PcmllbnRhdGlvbikge1xuICAgIGNhc2UgOTA6XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuYmV0YSAgPSAtcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAgcm90YXRpb25SYXRlLmdhbW1hO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAxODA6XG4gICAgICAvLyBZb3UgY2FuJ3QgZXZlbiBkbyB0aGlzIG9uIGlPUy5cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjcwOlxuICAgIGNhc2UgLTkwOlxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmFscGhhID0gLXJvdGF0aW9uUmF0ZS5hbHBoYTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhICA9ICByb3RhdGlvblJhdGUuYmV0YTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5nYW1tYSA9ICByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OiAvLyBTQ1JFRU5fUk9UQVRJT05fMFxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmFscGhhID0gIHJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmJldGEgID0gIHJvdGF0aW9uUmF0ZS5hbHBoYTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5nYW1tYSA9ICByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gc2NyZWVuUm90YXRpb25SYXRlO1xufTtcblxuUG9zZVByZWRpY3Rvci5wcm90b3R5cGUuZ2V0QXhpc0FuZ3VsYXJTcGVlZEZyb21HeXJvRGVsdGFfID0gZnVuY3Rpb24oY3VycmVudFEsIGVsYXBzZWRNcykge1xuICAvLyBTb21ldGltZXMgd2UgdXNlIHRoZSBzYW1lIHNlbnNvciB0aW1lc3RhbXAsIGluIHdoaWNoIGNhc2UgcHJlZGljdGlvblxuICAvLyB3b24ndCB3b3JrLlxuICBpZiAoZWxhcHNlZE1zID09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyBRX2RlbHRhID0gUV9sYXN0Xi0xICogUV9jdXJyXG4gIHRoaXMuZGVsdGFRLmNvcHkodGhpcy5sYXN0USk7XG4gIHRoaXMuZGVsdGFRLmludmVyc2UoKTtcbiAgdGhpcy5kZWx0YVEubXVsdGlwbHkoY3VycmVudFEpO1xuXG4gIC8vIENvbnZlcnQgZnJvbSBkZWx0YSBxdWF0ZXJuaW9uIHRvIGF4aXMtYW5nbGUuXG4gIHZhciBheGlzID0gdGhpcy5nZXRBeGlzXyh0aGlzLmRlbHRhUSk7XG4gIHZhciBhbmdsZVJhZCA9IHRoaXMuZ2V0QW5nbGVfKHRoaXMuZGVsdGFRKTtcbiAgLy8gSXQgdG9vayBgZWxhcHNlZGAgbXMgdG8gdHJhdmVsIHRoZSBhbmdsZSBhbW91bnQgb3ZlciB0aGUgYXhpcy4gTm93LFxuICAvLyB3ZSBtYWtlIGEgbmV3IHF1YXRlcm5pb24gYmFzZWQgaG93IGZhciBpbiB0aGUgZnV0dXJlIHdlIHdhbnQgdG9cbiAgLy8gY2FsY3VsYXRlLlxuICB2YXIgYW5ndWxhclNwZWVkUmFkTXMgPSBhbmdsZVJhZCAvIGVsYXBzZWRNcztcbiAgdmFyIGFuZ3VsYXJTcGVlZERlZ1MgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKGFuZ3VsYXJTcGVlZFJhZE1zKSAqIDEwMDA7XG4gIC8vIElmIG5vIHJvdGF0aW9uIHJhdGUgaXMgcHJvdmlkZWQsIGRvIG5vIHByZWRpY3Rpb24uXG4gIHJldHVybiB7XG4gICAgc3BlZWQ6IGFuZ3VsYXJTcGVlZERlZ1MsXG4gICAgYXhpczogYXhpc1xuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQb3NlUHJlZGljdG9yO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxudmFyIFJPVEFURV9TUEVFRCA9IDAuNTtcbi8qKlxuICogUHJvdmlkZXMgYSBxdWF0ZXJuaW9uIHJlc3BvbnNpYmxlIGZvciBwcmUtcGFubmluZyB0aGUgc2NlbmUgYmVmb3JlIGZ1cnRoZXJcbiAqIHRyYW5zZm9ybWF0aW9ucyBkdWUgdG8gZGV2aWNlIHNlbnNvcnMuXG4gKi9cbmZ1bmN0aW9uIFRvdWNoUGFubmVyKCkge1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRoaXMub25Ub3VjaFN0YXJ0Xy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMub25Ub3VjaE1vdmVfLmJpbmQodGhpcykpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB0aGlzLm9uVG91Y2hFbmRfLmJpbmQodGhpcykpO1xuXG4gIHRoaXMuaXNUb3VjaGluZyA9IGZhbHNlO1xuICB0aGlzLnJvdGF0ZVN0YXJ0ID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgdGhpcy5yb3RhdGVFbmQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICB0aGlzLnJvdGF0ZURlbHRhID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcblxuICB0aGlzLnRoZXRhID0gMDtcbiAgdGhpcy5vcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMuZXVsZXIgPSBuZXcgVEhSRUUuRXVsZXIoKTtcbn1cblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLmdldE9yaWVudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZXVsZXIuc2V0KDAsIHRoaXMudGhldGEsIDAsICdZWFonKTtcbiAgdGhpcy5vcmllbnRhdGlvbi5zZXRGcm9tRXVsZXIodGhpcy5ldWxlcik7XG4gIHJldHVybiB0aGlzLm9yaWVudGF0aW9uO1xufTtcblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLm9uVG91Y2hTdGFydF8gPSBmdW5jdGlvbihlKSB7XG4gIC8vIE9ubHkgcmVzcG9uZCBpZiB0aGVyZSBpcyBleGFjdGx5IG9uZSB0b3VjaC5cbiAgaWYgKGUudG91Y2hlcy5sZW5ndGggIT0gMSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnJvdGF0ZVN0YXJ0LnNldChlLnRvdWNoZXNbMF0ucGFnZVgsIGUudG91Y2hlc1swXS5wYWdlWSk7XG4gIHRoaXMuaXNUb3VjaGluZyA9IHRydWU7XG59O1xuXG5Ub3VjaFBhbm5lci5wcm90b3R5cGUub25Ub3VjaE1vdmVfID0gZnVuY3Rpb24oZSkge1xuICBpZiAoIXRoaXMuaXNUb3VjaGluZykge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnJvdGF0ZUVuZC5zZXQoZS50b3VjaGVzWzBdLnBhZ2VYLCBlLnRvdWNoZXNbMF0ucGFnZVkpO1xuICB0aGlzLnJvdGF0ZURlbHRhLnN1YlZlY3RvcnModGhpcy5yb3RhdGVFbmQsIHRoaXMucm90YXRlU3RhcnQpO1xuICB0aGlzLnJvdGF0ZVN0YXJ0LmNvcHkodGhpcy5yb3RhdGVFbmQpO1xuXG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcbiAgdGhpcy50aGV0YSArPSAyICogTWF0aC5QSSAqIHRoaXMucm90YXRlRGVsdGEueCAvIGVsZW1lbnQuY2xpZW50V2lkdGggKiBST1RBVEVfU1BFRUQ7XG59O1xuXG5Ub3VjaFBhbm5lci5wcm90b3R5cGUub25Ub3VjaEVuZF8gPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMuaXNUb3VjaGluZyA9IGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb3VjaFBhbm5lcjtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgVXRpbCA9IHdpbmRvdy5VdGlsIHx8IHt9O1xuXG5VdGlsLmNsYW1wID0gZnVuY3Rpb24odmFsdWUsIG1pbiwgbWF4KSB7XG4gIHJldHVybiBNYXRoLm1pbihNYXRoLm1heChtaW4sIHZhbHVlKSwgbWF4KTtcbn07XG5cblV0aWwubWFwUmFuZ2UgPSBmdW5jdGlvbih2YWx1ZSwgbWluRG9tYWluLCBtYXhEb21haW4sIG1pblJhbmdlLCBtYXhSYW5nZSkge1xuICAvLyBJZiB3ZSdyZSBvdXQgb2YgcmFuZ2UsIHJldHVybiBhbiBpbnZhbGlkIHZhbHVlLlxuICB2YXIgcGVyY2VudCA9ICh2YWx1ZSAtIG1pbkRvbWFpbikgLyAobWF4RG9tYWluIC0gbWluRG9tYWluKTtcbiAgLy8gQ2xhbXAgcGVyY2VudCB0byBbMCwgMV0uXG4gIHBlcmNlbnQgPSBVdGlsLmNsYW1wKHBlcmNlbnQsIDAsIDEpO1xuICByZXR1cm4gbWluUmFuZ2UgKyBwZXJjZW50ICogKG1heFJhbmdlIC0gbWluUmFuZ2UpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsO1xuIl19
