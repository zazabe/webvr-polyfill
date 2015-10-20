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
    if(!(device instanceof HMDVRDevice)){
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
      if (this.isMobile()) {
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
  },

  /**
   * @returns {boolean}
   */
  isMobile: function() {
    return /Android/i.test(navigator.userAgent) ||
      /iPhone|iPad|iPod/i.test(navigator.userAgent);
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
  this.screenOrientation = window.screen.orientation.angle;

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
  this.screenOrientation = window.screen.orientation.angle;
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmFzZS5qcyIsInNyYy9jbS9DYXJkYm9hcmRITURWUkRldmljZS5qcyIsInNyYy9jbS9ET01Qb2ludC5qcyIsInNyYy9jbS9ITURWUkRldmljZS5qcyIsInNyYy9jbS9Qb2x5ZmlsbC5qcyIsInNyYy9jbS9WUkRldmljZS5qcyIsInNyYy9jbS9WUkV5ZVBhcmFtZXRlcnMuanMiLCJzcmMvY20vVlJGaWVsZE9mVmlldy5qcyIsInNyYy9neXJvLXBvc2l0aW9uLXNlbnNvci12ci1kZXZpY2UuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9tb3VzZS1rZXlib2FyZC1wb3NpdGlvbi1zZW5zb3ItdnItZGV2aWNlLmpzIiwic3JjL3Bvc2UtcHJlZGljdG9yLmpzIiwic3JjL3RvdWNoLXBhbm5lci5qcyIsInNyYy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLyoqXG4gKiBUaGUgYmFzZSBjbGFzcyBmb3IgYWxsIFZSIGRldmljZXMuXG4gKi9cbmZ1bmN0aW9uIFZSRGV2aWNlKCkge1xuICB0aGlzLmhhcmR3YXJlVW5pdElkID0gJ3dlYnZyLXBvbHlmaWxsIGhhcmR3YXJlVW5pdElkJztcbiAgdGhpcy5kZXZpY2VJZCA9ICd3ZWJ2ci1wb2x5ZmlsbCBkZXZpY2VJZCc7XG4gIHRoaXMuZGV2aWNlTmFtZSA9ICd3ZWJ2ci1wb2x5ZmlsbCBkZXZpY2VOYW1lJztcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBjbGFzcyBmb3IgYWxsIFZSIEhNRCBkZXZpY2VzLlxuICovXG5mdW5jdGlvbiBITURWUkRldmljZSgpIHtcbn1cbkhNRFZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBWUkRldmljZSgpO1xuXG4vKipcbiAqIFRoZSBiYXNlIGNsYXNzIGZvciBhbGwgVlIgcG9zaXRpb24gc2Vuc29yIGRldmljZXMuXG4gKi9cbmZ1bmN0aW9uIFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKSB7XG59XG5Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBWUkRldmljZSgpO1xuXG5tb2R1bGUuZXhwb3J0cy5WUkRldmljZSA9IFZSRGV2aWNlO1xubW9kdWxlLmV4cG9ydHMuSE1EVlJEZXZpY2UgPSBITURWUkRldmljZTtcbm1vZHVsZS5leHBvcnRzLlBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSBQb3NpdGlvblNlbnNvclZSRGV2aWNlO1xuIiwidmFyIEhNRFZSRGV2aWNlID0gcmVxdWlyZSgnLi9ITURWUkRldmljZS5qcycpO1xuXG52YXIgREVGQVVMVF9GT1YgPSA5NjtcbnZhciBERUZBVUxUX0lOVEVSUFVQSUxMQVJZX0RJU1RBTkNFID0gMC4wNjtcbnZhciBERUZBVUxUX0RJU1RPUlRJT05fRkFDVE9SUyA9IHtcbiAgazE6IDAuNDExLFxuICBrMjogMC4xNTZcbn07XG5cblxudmFyIENhcmRib2FyZEhNRFZSRGV2aWNlID0gZnVuY3Rpb24oKXtcbiAgSE1EVlJEZXZpY2UuY2FsbCh0aGlzLCAnMScsICcxJywgJ3BvbHlmaWxsLmNhcmRib2FyZCcsIERFRkFVTFRfRk9WLCBERUZBVUxUX0lOVEVSUFVQSUxMQVJZX0RJU1RBTkNFLCBERUZBVUxUX0RJU1RPUlRJT05fRkFDVE9SUyk7XG59O1xuXG5DYXJkYm9hcmRITURWUkRldmljZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhNRFZSRGV2aWNlLnByb3RvdHlwZSk7XG5DYXJkYm9hcmRITURWUkRldmljZS5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDYXJkYm9hcmRITURWUkRldmljZTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkYm9hcmRITURWUkRldmljZTtcbiIsInZhciBET01Qb2ludCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICB0aGlzLnggPSB4O1xuICB0aGlzLnkgPSB5O1xuICB0aGlzLnogPSB6O1xuICB0aGlzLncgPSB3O1xufTtcblxuRE9NUG9pbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRE9NUG9pbnQ7XG5cbm1vZHVsZS5leHBvcnRzID0gRE9NUG9pbnQ7XG4iLCJ2YXIgVlJFeWVQYXJhbWV0ZXJzID0gcmVxdWlyZSgnLi9WUkV5ZVBhcmFtZXRlcnMuanMnKTtcbnZhciBWUkRldmljZSA9IHJlcXVpcmUoJy4vVlJEZXZpY2UuanMnKTtcblxudmFyIEhNRFZSRGV2aWNlID0gZnVuY3Rpb24oaGFyZHdhcmVVbml0SWQsIGRldmljZUlkLCBkZXZpY2VOYW1lLCBmb3YsIGludGVycHVwaWxsYXJ5RGlzdGFuY2UsIGxlbnNEaXN0b3J0aW9uRmFjdG9ycyl7XG4gIFZSRGV2aWNlLmNhbGwodGhpcywgaGFyZHdhcmVVbml0SWQsIGRldmljZUlkLCBkZXZpY2VOYW1lKTtcbiAgdGhpcy5fZm92ID1cbiAgdGhpcy5fZXllVHJhbnNsYXRpb25MZWZ0ID0gbmV3IFZSRXllUGFyYW1ldGVycyhmb3YsIGludGVycHVwaWxsYXJ5RGlzdGFuY2UgKiAtMC41KTtcbiAgdGhpcy5fZXllVHJhbnNsYXRpb25SaWdodCA9IG5ldyBWUkV5ZVBhcmFtZXRlcnMoZm92LCBpbnRlcnB1cGlsbGFyeURpc3RhbmNlICogMC41KTtcbiAgdGhpcy5fbGVuc0Rpc3RvcnRpb25GYWN0b3JzID0gbGVuc0Rpc3RvcnRpb25GYWN0b3JzO1xufTtcblxudmFyIHByb3RvID0gSE1EVlJEZXZpY2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShWUkRldmljZS5wcm90b3R5cGUpO1xuXG4vKipcbiAqIEBwYXJhbSB7bGVmdHxyaWdodH0gd2hpY2hFeWVcbiAqIEByZXR1cm5zIHt7cmVjb21tZW5kZWRGaWVsZE9mVmlldzogKiwgZXllVHJhbnNsYXRpb246ICp9fVxuICovXG5wcm90by5nZXRFeWVQYXJhbWV0ZXJzID0gZnVuY3Rpb24od2hpY2hFeWUpIHtcbiAgdmFyIGV5ZVRyYW5zbGF0aW9uO1xuICBpZiAod2hpY2hFeWUgPT0gJ2xlZnQnKSB7XG4gICAgZXllVHJhbnNsYXRpb24gPSB0aGlzLl9leWVUcmFuc2xhdGlvbkxlZnQ7XG4gIH0gZWxzZSBpZiAod2hpY2hFeWUgPT0gJ3JpZ2h0Jykge1xuICAgIGV5ZVRyYW5zbGF0aW9uID0gdGhpcy5fZXllVHJhbnNsYXRpb25SaWdodDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZXllIHByb3ZpZGVkOiAnICsgd2hpY2hFeWUpO1xuICB9XG4gIHJldHVybiBleWVUcmFuc2xhdGlvbjtcbn07XG5cbi8qKlxuICogQHJldHVybnMge3trMTogbnVtYmVyLCBrMjogbnVtYmVyfX1cbiAqL1xucHJvdG8uZ2V0TGVuc0Rpc3RvcnRpb25GYWN0b3JzID0gZnVuY3Rpb24oKXtcbiAgcmV0dXJuIHRoaXMuX2xlbnNEaXN0b3J0aW9uRmFjdG9ycztcbn07XG5cbnByb3RvLmNvbnN0cnVjdG9yID0gSE1EVlJEZXZpY2U7XG5cbm1vZHVsZS5leHBvcnRzID0gSE1EVlJEZXZpY2U7XG4iLCJ2YXIgVlJEZXZpY2UgPSByZXF1aXJlKCcuL1ZSRGV2aWNlLmpzJyk7XG52YXIgSE1EVlJEZXZpY2UgPSByZXF1aXJlKCcuL0hNRFZSRGV2aWNlLmpzJyk7XG52YXIgQ2FyZGJvYXJkSE1EVlJEZXZpY2UgPSByZXF1aXJlKCcuL0NhcmRib2FyZEhNRFZSRGV2aWNlLmpzJyk7XG5cbnZhciBQb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi4vYmFzZS5qcycpLlBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG52YXIgR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSByZXF1aXJlKCcuLi9neXJvLXBvc2l0aW9uLXNlbnNvci12ci1kZXZpY2UuanMnKTtcbnZhciBNb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZSA9IHJlcXVpcmUoJy4uL21vdXNlLWtleWJvYXJkLXBvc2l0aW9uLXNlbnNvci12ci1kZXZpY2UuanMnKTtcblxuXG4vKipcbiAqIEBwYXJhbSB7VlJEZXZpY2V9IGRlZmF1bHREZXZpY2VcbiAqIEBjb25zdHJ1Y3RvclxuICogQGV4dGVuZHMge1dlYlZSUG9seWZpbGx9XG4gKi9cbnZhciBXZWJWUlBvbHlmaWxsRXh0ZW5kZWQgPSBmdW5jdGlvbihkZWZhdWx0RGV2aWNlKSB7XG4gIHRoaXMuZGV2aWNlcyA9IFtdO1xuICB0aGlzLl9kZWZhdWx0RGV2aWNlID0gZGVmYXVsdERldmljZSB8fCBuZXcgQ2FyZGJvYXJkSE1EVlJEZXZpY2UoKTtcbiAgdGhpcy5lbmFibGVQb2x5ZmlsbCgpO1xufTtcblxuV2ViVlJQb2x5ZmlsbEV4dGVuZGVkLnByb3RvdHlwZSA9IHtcblxuICBlbmFibGVQb2x5ZmlsbDogZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9nZXRWUkRldmljZXNQcm9taXNlID0gdGhpcy5pc1dlYlZSQXZhaWxhYmxlKCkgPyBuYXZpZ2F0b3IuZ2V0VlJEZXZpY2VzKCkgOiBQcm9taXNlLnJlc29sdmUoW10pO1xuXG4gICAgLy8gUHJvdmlkZSBuYXZpZ2F0b3IuZ2V0VlJEZXZpY2VzLlxuICAgIG5hdmlnYXRvci5nZXRWUkRldmljZXMgPSB0aGlzLmdldFZSRGV2aWNlcy5iaW5kKHRoaXMpO1xuXG4gICAgLy8ga2VlcCBhIHJlZmVyZW5jZSBvZiBuYXRpdmUgVlJEZXZpY2UgY29uc3RydWN0b3JcbiAgICB0aGlzLl9uYXRpdmVDb25zdHJ1Y3RvcnMgPSB7XG4gICAgICBWUkRldmljZTogd2luZG93LlZSRGV2aWNlLFxuICAgICAgSE1EVlJEZXZpY2U6IHdpbmRvdy5ITURWUkRldmljZVxuICAgIH07XG5cbiAgICB3aW5kb3cuVlJEZXZpY2UgPSBWUkRldmljZTtcbiAgICB3aW5kb3cuSE1EVlJEZXZpY2UgPSBITURWUkRldmljZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1ZSRGV2aWNlfSBkZXZpY2VcbiAgICovXG4gIHNldERlZmF1bHREZXZpY2U6IGZ1bmN0aW9uKGRldmljZSkge1xuICAgIGlmKCEoZGV2aWNlIGluc3RhbmNlb2YgSE1EVlJEZXZpY2UpKXtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRGVmYXVsdCBkZXZpY2UgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBITURWUkRldmljZS4nKTtcbiAgICB9XG4gICAgdGhpcy5fZGVmYXVsdERldmljZSA9IGRldmljZTtcbiAgfSxcblxuICAvKipcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBnZXRWUkRldmljZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9nZXRWUkRldmljZXNQcm9taXNlLnRoZW4odGhpcy5fcHJvY2Vzc1ZSRGV2aWNlcy5iaW5kKHRoaXMpKTtcbiAgfSxcblxuICAvKipcbiAgICogQHJldHVybnMgVlJEZXZpY2VbXVxuICAgKi9cbiAgX3Byb2Nlc3NWUkRldmljZXM6IGZ1bmN0aW9uKG5hdGl2ZURldmljZXMpIHtcblxuICAgIHZhciBkZXZpY2VCeVR5cGUgPSBmdW5jdGlvbihkZXZpY2VMaXN0LCBJbnN0YW5jZVR5cGUpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBkZXZpY2VMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChkZXZpY2VMaXN0W2ldIGluc3RhbmNlb2YgSW5zdGFuY2VUeXBlKSB7XG4gICAgICAgICAgcmV0dXJuIGRldmljZUxpc3RbaV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGRldmljZUhNRFZSID0gdGhpcy5fZGVmYXVsdERldmljZTtcblxuICAgIHZhciBkZXZpY2VTZW5zb3IgPSBkZXZpY2VCeVR5cGUobmF0aXZlRGV2aWNlcywgd2luZG93LlBvc2l0aW9uU2Vuc29yVlJEZXZpY2UpO1xuICAgIGlmICghZGV2aWNlU2Vuc29yKSB7XG4gICAgICAvLyBvdmVycmlkZSB0aGUgbmF0aXZlIGNvbnN0cnVjdG9yIHRvIGFsbG93IGNoZWNrcyB3aXRoIGBpbnN0YW5jZW9mYFxuICAgICAgd2luZG93LlBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSBQb3NpdGlvblNlbnNvclZSRGV2aWNlO1xuICAgICAgaWYgKHRoaXMuaXNNb2JpbGUoKSkge1xuICAgICAgICBkZXZpY2VTZW5zb3IgPSBuZXcgR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRldmljZVNlbnNvciA9IG5ldyBNb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZSgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZGV2aWNlcyA9IFtkZXZpY2VITURWUiwgZGV2aWNlU2Vuc29yXTtcbiAgICByZXR1cm4gdGhpcy5kZXZpY2VzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzV2ViVlJBdmFpbGFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoJ2dldFZSRGV2aWNlcycgaW4gbmF2aWdhdG9yKSB8fCAoJ21vekdldFZSRGV2aWNlcycgaW4gbmF2aWdhdG9yKTtcbiAgfSxcblxuICAvKipcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBpc01vYmlsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIC9BbmRyb2lkL2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSB8fFxuICAgICAgL2lQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuICB9XG59O1xuXG5cbldlYlZSUG9seWZpbGxFeHRlbmRlZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBXZWJWUlBvbHlmaWxsRXh0ZW5kZWQ7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBXZWJWUlBvbHlmaWxsRXh0ZW5kZWQ7XG4iLCJ2YXIgVlJEZXZpY2UgPSBmdW5jdGlvbihoYXJkd2FyZVVuaXRJZCwgZGV2aWNlSWQsIGRldmljZU5hbWUpe1xuICB0aGlzLmhhcmR3YXJlVW5pdElkID0gaGFyZHdhcmVVbml0SWQ7XG4gIHRoaXMuZGV2aWNlSWQgPSBkZXZpY2VJZDtcbiAgdGhpcy5kZXZpY2VOYW1lID0gZGV2aWNlTmFtZTtcbn07XG5cblZSRGV2aWNlLnByb3RvdHlwZSA9IHt9O1xuVlJEZXZpY2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVlJEZXZpY2U7XG5cbm1vZHVsZS5leHBvcnRzID0gVlJEZXZpY2U7XG4iLCJ2YXIgVlJGaWVsZE9mVmlldyA9IHJlcXVpcmUoJy4vVlJGaWVsZE9mVmlldy5qcycpO1xudmFyIERPTVBvaW50ID0gcmVxdWlyZSgnLi9ET01Qb2ludC5qcycpO1xuXG52YXIgVlJFeWVQYXJhbWV0ZXJzID0gZnVuY3Rpb24oZm92LCB0cmFuc2xhdGlvblgpe1xuICB0aGlzLl9mb3YgPSBuZXcgVlJGaWVsZE9mVmlldyhmb3YpO1xuICB0aGlzLl90cmFuc2xhdGlvbiA9IG5ldyBET01Qb2ludCh0cmFuc2xhdGlvblgsIDAsIDAsIDApO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoVlJFeWVQYXJhbWV0ZXJzLnByb3RvdHlwZSwge1xuICBtaW5pbXVtRmllbGRPZlZpZXc6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5fZm92O1xuICAgIH1cbiAgfSxcblxuICBtYXhpbXVtRmllbGRPZlZpZXc6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5fZm92O1xuICAgIH1cbiAgfSxcblxuICByZWNvbW1lbmRlZEZpZWxkT2ZWaWV3OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuX2ZvdjtcbiAgICB9XG4gIH0sXG5cbiAgY3VycmVudEZpZWxkT2ZWaWV3OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuX2ZvdjtcbiAgICB9XG4gIH0sXG5cbiAgZXllVHJhbnNsYXRpb246IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gdGhpcy5fdHJhbnNsYXRpb247XG4gICAgfVxuICB9LFxuXG4gIHJlbmRlclJlY3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCl7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZC4nKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5WUkV5ZVBhcmFtZXRlcnMucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVlJFeWVQYXJhbWV0ZXJzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZSRXllUGFyYW1ldGVycztcbiIsInZhciBWUkZpZWxkT2ZWaWV3ID0gZnVuY3Rpb24oZm92KXtcbiAgdGhpcy51cERlZ3JlZXMgPSBmb3YvMjtcbiAgdGhpcy5yaWdodERlZ3JlZXMgPSBmb3YvMjtcbiAgdGhpcy5kb3duRGVncmVlcyA9IGZvdi8yO1xuICB0aGlzLmxlZnREZWdyZWVzID0gZm92LzI7XG59O1xuXG5WUkZpZWxkT2ZWaWV3LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZSRmllbGRPZlZpZXc7XG5cbm1vZHVsZS5leHBvcnRzID0gVlJGaWVsZE9mVmlldztcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgUG9zaXRpb25TZW5zb3JWUkRldmljZSA9IHJlcXVpcmUoJy4vYmFzZS5qcycpLlBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG52YXIgUG9zZVByZWRpY3RvciA9IHJlcXVpcmUoJy4vcG9zZS1wcmVkaWN0b3IuanMnKTtcbnZhciBUb3VjaFBhbm5lciA9IHJlcXVpcmUoJy4vdG91Y2gtcGFubmVyLmpzJyk7XG52YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG5XRUJWUl9ZQVdfT05MWSA9IGZhbHNlO1xuXG4vKipcbiAqIFRoZSBwb3NpdGlvbmFsIHNlbnNvciwgaW1wbGVtZW50ZWQgdXNpbmcgd2ViIERldmljZU9yaWVudGF0aW9uIEFQSXMuXG4gKi9cbmZ1bmN0aW9uIEd5cm9Qb3NpdGlvblNlbnNvclZSRGV2aWNlKCkge1xuICB0aGlzLmRldmljZUlkID0gJ3dlYnZyLXBvbHlmaWxsOmd5cm8nO1xuICB0aGlzLmRldmljZU5hbWUgPSAnVlIgUG9zaXRpb24gRGV2aWNlICh3ZWJ2ci1wb2x5ZmlsbDpneXJvKSc7XG5cbiAgLy8gU3Vic2NyaWJlIHRvIGRldmljZW9yaWVudGF0aW9uIGV2ZW50cy5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZW9yaWVudGF0aW9uJywgdGhpcy5vbkRldmljZU9yaWVudGF0aW9uQ2hhbmdlXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZW1vdGlvbicsIHRoaXMub25EZXZpY2VNb3Rpb25DaGFuZ2VfLmJpbmQodGhpcykpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLm9uU2NyZWVuT3JpZW50YXRpb25DaGFuZ2VfLmJpbmQodGhpcykpO1xuXG4gIHRoaXMuZGV2aWNlT3JpZW50YXRpb24gPSBudWxsO1xuICB0aGlzLnNjcmVlbk9yaWVudGF0aW9uID0gd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbi5hbmdsZTtcblxuICAvLyBIZWxwZXIgb2JqZWN0cyBmb3IgY2FsY3VsYXRpbmcgb3JpZW50YXRpb24uXG4gIHRoaXMuZmluYWxRdWF0ZXJuaW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgdGhpcy50bXBRdWF0ZXJuaW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgdGhpcy5kZXZpY2VFdWxlciA9IG5ldyBUSFJFRS5FdWxlcigpO1xuICB0aGlzLnNjcmVlblRyYW5zZm9ybSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIC8vIC1QSS8yIGFyb3VuZCB0aGUgeC1heGlzLlxuICB0aGlzLndvcmxkVHJhbnNmb3JtID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oLU1hdGguc3FydCgwLjUpLCAwLCAwLCBNYXRoLnNxcnQoMC41KSk7XG5cbiAgLy8gVGhlIHF1YXRlcm5pb24gZm9yIHRha2luZyBpbnRvIGFjY291bnQgdGhlIHJlc2V0IHBvc2l0aW9uLlxuICB0aGlzLnJlc2V0VHJhbnNmb3JtID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICB0aGlzLnRvdWNoUGFubmVyID0gbmV3IFRvdWNoUGFubmVyKCk7XG4gIHRoaXMucG9zZVByZWRpY3RvciA9IG5ldyBQb3NlUHJlZGljdG9yKCk7XG59XG5HeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUgPSBuZXcgUG9zaXRpb25TZW5zb3JWUkRldmljZSgpO1xuXG4vKipcbiAqIFJldHVybnMge29yaWVudGF0aW9uOiB7eCx5LHosd30sIHBvc2l0aW9uOiBudWxsfS5cbiAqIFBvc2l0aW9uIGlzIG5vdCBzdXBwb3J0ZWQgc2luY2Ugd2UgY2FuJ3QgZG8gNkRPRi5cbiAqL1xuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmdldFN0YXRlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgaGFzT3JpZW50YXRpb246IHRydWUsXG4gICAgb3JpZW50YXRpb246IHRoaXMuZ2V0T3JpZW50YXRpb24oKSxcbiAgICBoYXNQb3NpdGlvbjogZmFsc2UsXG4gICAgcG9zaXRpb246IG51bGxcbiAgfVxufTtcblxuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uRGV2aWNlT3JpZW50YXRpb25DaGFuZ2VfID1cbiAgICBmdW5jdGlvbihkZXZpY2VPcmllbnRhdGlvbikge1xuICB0aGlzLmRldmljZU9yaWVudGF0aW9uID0gZGV2aWNlT3JpZW50YXRpb247XG59O1xuXG5HeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUub25EZXZpY2VNb3Rpb25DaGFuZ2VfID1cbiAgICBmdW5jdGlvbihkZXZpY2VNb3Rpb24pIHtcbiAgdGhpcy5kZXZpY2VNb3Rpb24gPSBkZXZpY2VNb3Rpb247XG59O1xuXG5HeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUub25TY3JlZW5PcmllbnRhdGlvbkNoYW5nZV8gPVxuICAgIGZ1bmN0aW9uKHNjcmVlbk9yaWVudGF0aW9uKSB7XG4gIHRoaXMuc2NyZWVuT3JpZW50YXRpb24gPSB3aW5kb3cuc2NyZWVuLm9yaWVudGF0aW9uLmFuZ2xlO1xufTtcblxuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLmdldE9yaWVudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmRldmljZU9yaWVudGF0aW9uID09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJvdGF0aW9uIGFyb3VuZCB0aGUgei1heGlzLlxuICB2YXIgYWxwaGEgPSBUSFJFRS5NYXRoLmRlZ1RvUmFkKHRoaXMuZGV2aWNlT3JpZW50YXRpb24uYWxwaGEpO1xuICAvLyBGcm9udC10by1iYWNrIChpbiBwb3J0cmFpdCkgcm90YXRpb24gKHgtYXhpcykuXG4gIHZhciBiZXRhID0gVEhSRUUuTWF0aC5kZWdUb1JhZCh0aGlzLmRldmljZU9yaWVudGF0aW9uLmJldGEpO1xuICAvLyBMZWZ0IHRvIHJpZ2h0IChpbiBwb3J0cmFpdCkgcm90YXRpb24gKHktYXhpcykuXG4gIHZhciBnYW1tYSA9IFRIUkVFLk1hdGguZGVnVG9SYWQodGhpcy5kZXZpY2VPcmllbnRhdGlvbi5nYW1tYSk7XG4gIHZhciBvcmllbnQgPSBUSFJFRS5NYXRoLmRlZ1RvUmFkKHRoaXMuc2NyZWVuT3JpZW50YXRpb24pO1xuXG4gIC8vIFVzZSB0aHJlZS5qcyB0byBjb252ZXJ0IHRvIHF1YXRlcm5pb24uIExpZnRlZCBmcm9tXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9yaWNodHIvdGhyZWVWUi9ibG9iL21hc3Rlci9qcy9EZXZpY2VPcmllbnRhdGlvbkNvbnRyb2xsZXIuanNcbiAgdGhpcy5kZXZpY2VFdWxlci5zZXQoYmV0YSwgYWxwaGEsIC1nYW1tYSwgJ1lYWicpO1xuICB0aGlzLnRtcFF1YXRlcm5pb24uc2V0RnJvbUV1bGVyKHRoaXMuZGV2aWNlRXVsZXIpO1xuICB0aGlzLm1pbnVzSGFsZkFuZ2xlID0gLW9yaWVudCAvIDI7XG4gIHRoaXMuc2NyZWVuVHJhbnNmb3JtLnNldCgwLCBNYXRoLnNpbih0aGlzLm1pbnVzSGFsZkFuZ2xlKSwgMCwgTWF0aC5jb3ModGhpcy5taW51c0hhbGZBbmdsZSkpO1xuICAvLyBUYWtlIGludG8gYWNjb3VudCB0aGUgcmVzZXQgdHJhbnNmb3JtYXRpb24uXG4gIHRoaXMuZmluYWxRdWF0ZXJuaW9uLmNvcHkodGhpcy5yZXNldFRyYW5zZm9ybSk7XG4gIC8vIEFuZCBhbnkgcm90YXRpb25zIGRvbmUgdmlhIHRvdWNoIGV2ZW50cy5cbiAgdGhpcy5maW5hbFF1YXRlcm5pb24ubXVsdGlwbHkodGhpcy50b3VjaFBhbm5lci5nZXRPcmllbnRhdGlvbigpKTtcbiAgdGhpcy5maW5hbFF1YXRlcm5pb24ubXVsdGlwbHkodGhpcy50bXBRdWF0ZXJuaW9uKTtcbiAgdGhpcy5maW5hbFF1YXRlcm5pb24ubXVsdGlwbHkodGhpcy5zY3JlZW5UcmFuc2Zvcm0pO1xuICB0aGlzLmZpbmFsUXVhdGVybmlvbi5tdWx0aXBseSh0aGlzLndvcmxkVHJhbnNmb3JtKTtcblxuICB0aGlzLnBvc2VQcmVkaWN0b3Iuc2V0U2NyZWVuT3JpZW50YXRpb24odGhpcy5zY3JlZW5PcmllbnRhdGlvbik7XG5cbiAgdmFyIGJlc3RUaW1lID0gdGhpcy5kZXZpY2VPcmllbnRhdGlvbi50aW1lU3RhbXA7XG4gIHZhciByb3RSYXRlID0gdGhpcy5kZXZpY2VNb3Rpb24gJiYgdGhpcy5kZXZpY2VNb3Rpb24ucm90YXRpb25SYXRlO1xuICB2YXIgb3V0ID0gdGhpcy5wb3NlUHJlZGljdG9yLmdldFByZWRpY3Rpb24oXG4gICAgICB0aGlzLmZpbmFsUXVhdGVybmlvbiwgcm90UmF0ZSwgYmVzdFRpbWUpO1xuXG4gIC8vIEFkanVzdCBmb3IgcGl0Y2ggY29uc3RyYWludHMgKGZvciBub24tc3BoZXJpY2FsIHBhbm9zKS5cbiAgaWYgKFdFQlZSX1lBV19PTkxZKSB7XG4gICAgb3V0LnggPSAwO1xuICAgIG91dC56ID0gMDtcbiAgICBvdXQubm9ybWFsaXplKCk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn07XG5cbkd5cm9Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5yZXNldFNlbnNvciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYW5nbGUgPSBUSFJFRS5NYXRoLmRlZ1RvUmFkKHRoaXMuZGV2aWNlT3JpZW50YXRpb24uYWxwaGEpO1xuICBjb25zb2xlLmxvZygnTm9ybWFsaXppbmcgeWF3IHRvICVmJywgYW5nbGUpO1xuICB0aGlzLnJlc2V0VHJhbnNmb3JtLnNldEZyb21BeGlzQW5nbGUobmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCksIC1hbmdsZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEd5cm9Qb3NpdGlvblNlbnNvclZSRGV2aWNlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLy8gQ006IG11c3QgY3JlYXRlIG91ciBvd24gcG9seWZpbGwgaW5zdGFuY2Vcbi8vdmFyIFdlYlZSUG9seWZpbGwgPSByZXF1aXJlKCcuL3dlYnZyLXBvbHlmaWxsLmpzJyk7XG4vL1xuLy8gbmV3IFdlYlZSUG9seWZpbGwoKTtcblxuXG52YXIgV2ViVlJQb2x5ZmlsbCA9IHJlcXVpcmUoJy4vY20vUG9seWZpbGwuanMnKTtcbndpbmRvdy5WUiA9IHdpbmRvdy5WUiB8fCB7fTtcbndpbmRvdy5WUi53ZWJWUlBvbHlmaWxsID0gbmV3IFdlYlZSUG9seWZpbGwoKTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgUG9zaXRpb25TZW5zb3JWUkRldmljZSA9IHJlcXVpcmUoJy4vYmFzZS5qcycpLlBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG52YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG4vLyBIb3cgbXVjaCB0byByb3RhdGUgcGVyIGtleSBzdHJva2UuXG52YXIgS0VZX1NQRUVEID0gMC4xNTtcbnZhciBLRVlfQU5JTUFUSU9OX0RVUkFUSU9OID0gODA7XG5cbi8vIEhvdyBtdWNoIHRvIHJvdGF0ZSBmb3IgbW91c2UgZXZlbnRzLlxudmFyIE1PVVNFX1NQRUVEX1ggPSAwLjU7XG52YXIgTU9VU0VfU1BFRURfWSA9IDAuMztcblxuLyoqXG4gKiBBIHZpcnR1YWwgcG9zaXRpb24gc2Vuc29yLCBpbXBsZW1lbnRlZCB1c2luZyBrZXlib2FyZCBhbmRcbiAqIG1vdXNlIEFQSXMuIFRoaXMgaXMgZGVzaWduZWQgYXMgZm9yIGRlc2t0b3BzL2xhcHRvcHMgd2hlcmUgbm8gRGV2aWNlKlxuICogZXZlbnRzIHdvcmsuXG4gKi9cbmZ1bmN0aW9uIE1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlKCkge1xuICB0aGlzLmRldmljZUlkID0gJ3dlYnZyLXBvbHlmaWxsOm1vdXNlLWtleWJvYXJkJztcbiAgdGhpcy5kZXZpY2VOYW1lID0gJ1ZSIFBvc2l0aW9uIERldmljZSAod2VidnItcG9seWZpbGw6bW91c2Uta2V5Ym9hcmQpJztcblxuICAvLyBBdHRhY2ggdG8gbW91c2UgYW5kIGtleWJvYXJkIGV2ZW50cy5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLm9uS2V5RG93bl8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMub25Nb3VzZURvd25fLmJpbmQodGhpcykpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpKTtcblxuICB0aGlzLnBoaSA9IDA7XG4gIHRoaXMudGhldGEgPSAwO1xuXG4gIC8vIFZhcmlhYmxlcyBmb3Iga2V5Ym9hcmQtYmFzZWQgcm90YXRpb24gYW5pbWF0aW9uLlxuICB0aGlzLnRhcmdldEFuZ2xlID0gbnVsbDtcblxuICAvLyBTdGF0ZSB2YXJpYWJsZXMgZm9yIGNhbGN1bGF0aW9ucy5cbiAgdGhpcy5ldWxlciA9IG5ldyBUSFJFRS5FdWxlcigpO1xuICB0aGlzLm9yaWVudGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICAvLyBWYXJpYWJsZXMgZm9yIG1vdXNlLWJhc2VkIHJvdGF0aW9uLlxuICB0aGlzLnJvdGF0ZVN0YXJ0ID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgdGhpcy5yb3RhdGVFbmQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICB0aGlzLnJvdGF0ZURlbHRhID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbn1cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBQb3NpdGlvblNlbnNvclZSRGV2aWNlKCk7XG5cbi8qKlxuICogUmV0dXJucyB7b3JpZW50YXRpb246IHt4LHkseix3fSwgcG9zaXRpb246IG51bGx9LlxuICogUG9zaXRpb24gaXMgbm90IHN1cHBvcnRlZCBmb3IgcGFyaXR5IHdpdGggb3RoZXIgUG9zaXRpb25TZW5zb3JzLlxuICovXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuZ2V0U3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5ldWxlci5zZXQodGhpcy5waGksIHRoaXMudGhldGEsIDAsICdZWFonKTtcbiAgdGhpcy5vcmllbnRhdGlvbi5zZXRGcm9tRXVsZXIodGhpcy5ldWxlcik7XG5cbiAgcmV0dXJuIHtcbiAgICBoYXNPcmllbnRhdGlvbjogdHJ1ZSxcbiAgICBvcmllbnRhdGlvbjogdGhpcy5vcmllbnRhdGlvbixcbiAgICBoYXNQb3NpdGlvbjogZmFsc2UsXG4gICAgcG9zaXRpb246IG51bGxcbiAgfVxufTtcblxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uS2V5RG93bl8gPSBmdW5jdGlvbihlKSB7XG4gIC8vIFRyYWNrIFdBU0QgYW5kIGFycm93IGtleXMuXG4gIGlmIChlLmtleUNvZGUgPT0gMzgpIHsgLy8gVXAga2V5LlxuICAgIHRoaXMuYW5pbWF0ZVBoaV8odGhpcy5waGkgKyBLRVlfU1BFRUQpO1xuICB9IGVsc2UgaWYgKGUua2V5Q29kZSA9PSAzOSkgeyAvLyBSaWdodCBrZXkuXG4gICAgdGhpcy5hbmltYXRlVGhldGFfKHRoaXMudGhldGEgLSBLRVlfU1BFRUQpO1xuICB9IGVsc2UgaWYgKGUua2V5Q29kZSA9PSA0MCkgeyAvLyBEb3duIGtleS5cbiAgICB0aGlzLmFuaW1hdGVQaGlfKHRoaXMucGhpIC0gS0VZX1NQRUVEKTtcbiAgfSBlbHNlIGlmIChlLmtleUNvZGUgPT0gMzcpIHsgLy8gTGVmdCBrZXkuXG4gICAgdGhpcy5hbmltYXRlVGhldGFfKHRoaXMudGhldGEgKyBLRVlfU1BFRUQpO1xuICB9XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuYW5pbWF0ZVRoZXRhXyA9IGZ1bmN0aW9uKHRhcmdldEFuZ2xlKSB7XG4gIHRoaXMuYW5pbWF0ZUtleVRyYW5zaXRpb25zXygndGhldGEnLCB0YXJnZXRBbmdsZSk7XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuYW5pbWF0ZVBoaV8gPSBmdW5jdGlvbih0YXJnZXRBbmdsZSkge1xuICAvLyBQcmV2ZW50IGxvb2tpbmcgdG9vIGZhciB1cCBvciBkb3duLlxuICB0YXJnZXRBbmdsZSA9IFV0aWwuY2xhbXAodGFyZ2V0QW5nbGUsIC1NYXRoLlBJLzIsIE1hdGguUEkvMik7XG4gIHRoaXMuYW5pbWF0ZUtleVRyYW5zaXRpb25zXygncGhpJywgdGFyZ2V0QW5nbGUpO1xufTtcblxuLyoqXG4gKiBTdGFydCBhbiBhbmltYXRpb24gdG8gdHJhbnNpdGlvbiBhbiBhbmdsZSBmcm9tIG9uZSB2YWx1ZSB0byBhbm90aGVyLlxuICovXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuYW5pbWF0ZUtleVRyYW5zaXRpb25zXyA9IGZ1bmN0aW9uKGFuZ2xlTmFtZSwgdGFyZ2V0QW5nbGUpIHtcbiAgLy8gSWYgYW4gYW5pbWF0aW9uIGlzIGN1cnJlbnRseSBydW5uaW5nLCBjYW5jZWwgaXQuXG4gIGlmICh0aGlzLmFuZ2xlQW5pbWF0aW9uKSB7XG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmFuZ2xlQW5pbWF0aW9uKTtcbiAgfVxuICB2YXIgc3RhcnRBbmdsZSA9IHRoaXNbYW5nbGVOYW1lXTtcbiAgdmFyIHN0YXJ0VGltZSA9IG5ldyBEYXRlKCk7XG4gIC8vIFNldCB1cCBhbiBpbnRlcnZhbCB0aW1lciB0byBwZXJmb3JtIHRoZSBhbmltYXRpb24uXG4gIHRoaXMuYW5nbGVBbmltYXRpb24gPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAvLyBPbmNlIHdlJ3JlIGZpbmlzaGVkIHRoZSBhbmltYXRpb24sIHdlJ3JlIGRvbmUuXG4gICAgdmFyIGVsYXBzZWQgPSBuZXcgRGF0ZSgpIC0gc3RhcnRUaW1lO1xuICAgIGlmIChlbGFwc2VkID49IEtFWV9BTklNQVRJT05fRFVSQVRJT04pIHtcbiAgICAgIHRoaXNbYW5nbGVOYW1lXSA9IHRhcmdldEFuZ2xlO1xuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmFuZ2xlQW5pbWF0aW9uKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gTGluZWFybHkgaW50ZXJwb2xhdGUgdGhlIGFuZ2xlIHNvbWUgYW1vdW50LlxuICAgIHZhciBwZXJjZW50ID0gZWxhcHNlZCAvIEtFWV9BTklNQVRJT05fRFVSQVRJT047XG4gICAgdGhpc1thbmdsZU5hbWVdID0gc3RhcnRBbmdsZSArICh0YXJnZXRBbmdsZSAtIHN0YXJ0QW5nbGUpICogcGVyY2VudDtcbiAgfS5iaW5kKHRoaXMpLCAxMDAwLzYwKTtcbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbk1vdXNlRG93bl8gPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMucm90YXRlU3RhcnQuc2V0KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcbiAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcbn07XG5cbi8vIFZlcnkgc2ltaWxhciB0byBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9tcmZsaXgvODM1MTAyMFxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uTW91c2VNb3ZlXyA9IGZ1bmN0aW9uKGUpIHtcbiAgaWYgKCF0aGlzLmlzRHJhZ2dpbmcgJiYgIXRoaXMuaXNQb2ludGVyTG9ja2VkXygpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIFN1cHBvcnQgcG9pbnRlciBsb2NrIEFQSS5cbiAgaWYgKHRoaXMuaXNQb2ludGVyTG9ja2VkXygpKSB7XG4gICAgdmFyIG1vdmVtZW50WCA9IGUubW92ZW1lbnRYIHx8IGUubW96TW92ZW1lbnRYIHx8IDA7XG4gICAgdmFyIG1vdmVtZW50WSA9IGUubW92ZW1lbnRZIHx8IGUubW96TW92ZW1lbnRZIHx8IDA7XG4gICAgdGhpcy5yb3RhdGVFbmQuc2V0KHRoaXMucm90YXRlU3RhcnQueCAtIG1vdmVtZW50WCwgdGhpcy5yb3RhdGVTdGFydC55IC0gbW92ZW1lbnRZKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnJvdGF0ZUVuZC5zZXQoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuICB9XG4gIC8vIENhbGN1bGF0ZSBob3cgbXVjaCB3ZSBtb3ZlZCBpbiBtb3VzZSBzcGFjZS5cbiAgdGhpcy5yb3RhdGVEZWx0YS5zdWJWZWN0b3JzKHRoaXMucm90YXRlRW5kLCB0aGlzLnJvdGF0ZVN0YXJ0KTtcbiAgdGhpcy5yb3RhdGVTdGFydC5jb3B5KHRoaXMucm90YXRlRW5kKTtcblxuICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBjdW11bGF0aXZlIGV1bGVyIGFuZ2xlcy5cbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5ib2R5O1xuICB0aGlzLnBoaSArPSAyICogTWF0aC5QSSAqIHRoaXMucm90YXRlRGVsdGEueSAvIGVsZW1lbnQuY2xpZW50SGVpZ2h0ICogTU9VU0VfU1BFRURfWTtcbiAgdGhpcy50aGV0YSArPSAyICogTWF0aC5QSSAqIHRoaXMucm90YXRlRGVsdGEueCAvIGVsZW1lbnQuY2xpZW50V2lkdGggKiBNT1VTRV9TUEVFRF9YO1xuXG4gIC8vIFByZXZlbnQgbG9va2luZyB0b28gZmFyIHVwIG9yIGRvd24uXG4gIHRoaXMucGhpID0gVXRpbC5jbGFtcCh0aGlzLnBoaSwgLU1hdGguUEkvMiwgTWF0aC5QSS8yKTtcbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbk1vdXNlVXBfID0gZnVuY3Rpb24oZSkge1xuICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5pc1BvaW50ZXJMb2NrZWRfID0gZnVuY3Rpb24oKSB7XG4gIHZhciBlbCA9IGRvY3VtZW50LnBvaW50ZXJMb2NrRWxlbWVudCB8fCBkb2N1bWVudC5tb3pQb2ludGVyTG9ja0VsZW1lbnQgfHxcbiAgICAgIGRvY3VtZW50LndlYmtpdFBvaW50ZXJMb2NrRWxlbWVudDtcbiAgcmV0dXJuIGVsICE9PSB1bmRlZmluZWQ7XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUucmVzZXRTZW5zb3IgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5lcnJvcignTm90IGltcGxlbWVudGVkIHlldC4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG52YXIgUHJlZGljdGlvbk1vZGUgPSB7XG4gIE5PTkU6ICdub25lJyxcbiAgSU5URVJQT0xBVEU6ICdpbnRlcnBvbGF0ZScsXG4gIFBSRURJQ1Q6ICdwcmVkaWN0J1xufVxuXG4vLyBIb3cgbXVjaCB0byBpbnRlcnBvbGF0ZSBiZXR3ZWVuIHRoZSBjdXJyZW50IG9yaWVudGF0aW9uIGVzdGltYXRlIGFuZCB0aGVcbi8vIHByZXZpb3VzIGVzdGltYXRlIHBvc2l0aW9uLiBUaGlzIGlzIGhlbHBmdWwgZm9yIGRldmljZXMgd2l0aCBsb3dcbi8vIGRldmljZW9yaWVudGF0aW9uIGZpcmluZyBmcmVxdWVuY3kgKGVnLiBvbiBpT1M4IGFuZCBiZWxvdywgaXQgaXMgMjAgSHopLiAgVGhlXG4vLyBsYXJnZXIgdGhpcyB2YWx1ZSAoaW4gWzAsIDFdKSwgdGhlIHNtb290aGVyIGJ1dCBtb3JlIGRlbGF5ZWQgdGhlIGhlYWRcbi8vIHRyYWNraW5nIGlzLlxudmFyIElOVEVSUE9MQVRJT05fU01PT1RISU5HX0ZBQ1RPUiA9IDAuMDE7XG5cbi8vIEFuZ3VsYXIgdGhyZXNob2xkLCBpZiB0aGUgYW5ndWxhciBzcGVlZCAoaW4gZGVnL3MpIGlzIGxlc3MgdGhhbiB0aGlzLCBkbyBub1xuLy8gcHJlZGljdGlvbi4gV2l0aG91dCBpdCwgdGhlIHNjcmVlbiBmbGlja2VycyBxdWl0ZSBhIGJpdC5cbnZhciBQUkVESUNUSU9OX1RIUkVTSE9MRF9ERUdfUEVSX1MgPSAwLjAxO1xuLy92YXIgUFJFRElDVElPTl9USFJFU0hPTERfREVHX1BFUl9TID0gMDtcblxuLy8gSG93IGZhciBpbnRvIHRoZSBmdXR1cmUgdG8gcHJlZGljdC5cbldFQlZSX1BSRURJQ1RJT05fVElNRV9NUyA9IDgwO1xuXG4vLyBXaGV0aGVyIHRvIHByZWRpY3Qgb3Igd2hhdC5cbldFQlZSX1BSRURJQ1RJT05fTU9ERSA9IFByZWRpY3Rpb25Nb2RlLlBSRURJQ1Q7XG5cbmZ1bmN0aW9uIFBvc2VQcmVkaWN0b3IoKSB7XG4gIHRoaXMubGFzdFEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICB0aGlzLmxhc3RUaW1lc3RhbXAgPSBudWxsO1xuXG4gIHRoaXMub3V0USA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMuZGVsdGFRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbn1cblxuUG9zZVByZWRpY3Rvci5wcm90b3R5cGUuZ2V0UHJlZGljdGlvbiA9IGZ1bmN0aW9uKGN1cnJlbnRRLCByb3RhdGlvblJhdGUsIHRpbWVzdGFtcCkge1xuICAvLyBJZiB0aGVyZSdzIG5vIHByZXZpb3VzIHF1YXRlcm5pb24sIG91dHB1dCB0aGUgY3VycmVudCBvbmUgYW5kIHNhdmUgZm9yXG4gIC8vIGxhdGVyLlxuICBpZiAoIXRoaXMubGFzdFRpbWVzdGFtcCkge1xuICAgIHRoaXMubGFzdFEuY29weShjdXJyZW50USk7XG4gICAgdGhpcy5sYXN0VGltZXN0YW1wID0gdGltZXN0YW1wO1xuICAgIHJldHVybiBjdXJyZW50UTtcbiAgfVxuXG4gIC8vIERFQlVHIE9OTFk6IFRyeSB3aXRoIGEgZml4ZWQgNjAgSHogdXBkYXRlIHNwZWVkLlxuICAvL3ZhciBlbGFwc2VkTXMgPSAxMDAwLzYwO1xuICB2YXIgZWxhcHNlZE1zID0gdGltZXN0YW1wIC0gdGhpcy5sYXN0VGltZXN0YW1wO1xuXG4gIHN3aXRjaCAoV0VCVlJfUFJFRElDVElPTl9NT0RFKSB7XG4gICAgY2FzZSBQcmVkaWN0aW9uTW9kZS5JTlRFUlBPTEFURTpcbiAgICAgIHRoaXMub3V0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgIHRoaXMub3V0US5zbGVycCh0aGlzLmxhc3RRLCBJTlRFUlBPTEFUSU9OX1NNT09USElOR19GQUNUT1IpO1xuXG4gICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IHF1YXRlcm5pb24gZm9yIGxhdGVyLlxuICAgICAgdGhpcy5sYXN0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgUHJlZGljdGlvbk1vZGUuUFJFRElDVDpcbiAgICAgIHZhciBheGlzQW5nbGU7XG4gICAgICBpZiAocm90YXRpb25SYXRlKSB7XG4gICAgICAgIGF4aXNBbmdsZSA9IHRoaXMuZ2V0QXhpc0FuZ3VsYXJTcGVlZEZyb21Sb3RhdGlvblJhdGVfKHJvdGF0aW9uUmF0ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBheGlzQW5nbGUgPSB0aGlzLmdldEF4aXNBbmd1bGFyU3BlZWRGcm9tR3lyb0RlbHRhXyhjdXJyZW50USwgZWxhcHNlZE1zKTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gcHJlZGljdGVkIGF4aXMvYW5nbGUsIGRvbid0IGRvIHByZWRpY3Rpb24uXG4gICAgICBpZiAoIWF4aXNBbmdsZSkge1xuICAgICAgICB0aGlzLm91dFEuY29weShjdXJyZW50USk7XG4gICAgICAgIHRoaXMubGFzdFEuY29weShjdXJyZW50USk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgdmFyIGFuZ3VsYXJTcGVlZERlZ1MgPSBheGlzQW5nbGUuc3BlZWQ7XG4gICAgICB2YXIgYXhpcyA9IGF4aXNBbmdsZS5heGlzO1xuICAgICAgdmFyIHByZWRpY3RBbmdsZURlZyA9IChXRUJWUl9QUkVESUNUSU9OX1RJTUVfTVMgLyAxMDAwKSAqIGFuZ3VsYXJTcGVlZERlZ1M7XG5cbiAgICAgIC8vIElmIHdlJ3JlIHJvdGF0aW5nIHNsb3dseSwgZG9uJ3QgZG8gcHJlZGljdGlvbi5cbiAgICAgIGlmIChhbmd1bGFyU3BlZWREZWdTIDwgUFJFRElDVElPTl9USFJFU0hPTERfREVHX1BFUl9TKSB7XG4gICAgICAgIHRoaXMub3V0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgICAgdGhpcy5sYXN0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGN1bGF0ZSB0aGUgcHJlZGljdGlvbiBkZWx0YSB0byBhcHBseSB0byB0aGUgb3JpZ2luYWwgYW5nbGUuXG4gICAgICB0aGlzLmRlbHRhUS5zZXRGcm9tQXhpc0FuZ2xlKGF4aXMsIFRIUkVFLk1hdGguZGVnVG9SYWQocHJlZGljdEFuZ2xlRGVnKSk7XG4gICAgICAvLyBERUJVRyBPTkxZOiBBcyBhIHNhbml0eSBjaGVjaywgdXNlIHRoZSBzYW1lIGF4aXMgYW5kIGFuZ2xlIGFzIGJlZm9yZSxcbiAgICAgIC8vIHdoaWNoIHNob3VsZCBjYXVzZSBubyBwcmVkaWN0aW9uIHRvIGhhcHBlbi5cbiAgICAgIC8vdGhpcy5kZWx0YVEuc2V0RnJvbUF4aXNBbmdsZShheGlzLCBhbmdsZSk7XG5cbiAgICAgIHRoaXMub3V0US5jb3B5KHRoaXMubGFzdFEpO1xuICAgICAgdGhpcy5vdXRRLm11bHRpcGx5KHRoaXMuZGVsdGFRKTtcblxuICAgICAgLy8gVXNlIHRoZSBwcmVkaWN0ZWQgcXVhdGVybmlvbiBhcyB0aGUgbmV3IGxhc3Qgb25lLlxuICAgICAgLy90aGlzLmxhc3RRLmNvcHkodGhpcy5vdXRRKTtcbiAgICAgIHRoaXMubGFzdFEuY29weShjdXJyZW50USk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFByZWRpY3Rpb25Nb2RlLk5PTkU6XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMub3V0US5jb3B5KGN1cnJlbnRRKTtcbiAgfVxuICB0aGlzLmxhc3RUaW1lc3RhbXAgPSB0aW1lc3RhbXA7XG5cbiAgcmV0dXJuIHRoaXMub3V0UTtcbn07XG5cblBvc2VQcmVkaWN0b3IucHJvdG90eXBlLnNldFNjcmVlbk9yaWVudGF0aW9uID0gZnVuY3Rpb24oc2NyZWVuT3JpZW50YXRpb24pIHtcbiAgdGhpcy5zY3JlZW5PcmllbnRhdGlvbiA9IHNjcmVlbk9yaWVudGF0aW9uO1xufTtcblxuUG9zZVByZWRpY3Rvci5wcm90b3R5cGUuZ2V0QXhpc18gPSBmdW5jdGlvbihxdWF0KSB7XG4gIC8vIHggPSBxeCAvIHNxcnQoMS1xdypxdylcbiAgLy8geSA9IHF5IC8gc3FydCgxLXF3KnF3KVxuICAvLyB6ID0gcXogLyBzcXJ0KDEtcXcqcXcpXG4gIHZhciBkID0gTWF0aC5zcXJ0KDEgLSBxdWF0LncgKiBxdWF0LncpO1xuICByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMocXVhdC54IC8gZCwgcXVhdC55IC8gZCwgcXVhdC56IC8gZCk7XG59O1xuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRBbmdsZV8gPSBmdW5jdGlvbihxdWF0KSB7XG4gIC8vIGFuZ2xlID0gMiAqIGFjb3MocXcpXG4gIC8vIElmIHcgaXMgZ3JlYXRlciB0aGFuIDEgKFRIUkVFLmpzLCBob3cgY2FuIHRoaXMgYmU/KSwgYXJjY29zIGlzIG5vdCBkZWZpbmVkLlxuICBpZiAocXVhdC53ID4gMSkge1xuICAgIHJldHVybiAwO1xuICB9XG4gIHZhciBhbmdsZSA9IDIgKiBNYXRoLmFjb3MocXVhdC53KTtcbiAgLy8gTm9ybWFsaXplIHRoZSBhbmdsZSB0byBiZSBpbiBbLc+ALCDPgF0uXG4gIGlmIChhbmdsZSA+IE1hdGguUEkpIHtcbiAgICBhbmdsZSAtPSAyICogTWF0aC5QSTtcbiAgfVxuICByZXR1cm4gYW5nbGU7XG59O1xuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRBeGlzQW5ndWxhclNwZWVkRnJvbVJvdGF0aW9uUmF0ZV8gPSBmdW5jdGlvbihyb3RhdGlvblJhdGUpIHtcbiAgaWYgKCFyb3RhdGlvblJhdGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICB2YXIgc2NyZWVuUm90YXRpb25SYXRlO1xuICBpZiAoL2lQYWR8aVBob25lfGlQb2QvLnRlc3QobmF2aWdhdG9yLnBsYXRmb3JtKSkge1xuICAgIC8vIGlPUzogYW5ndWxhciBzcGVlZCBpbiBkZWcvcy5cbiAgICB2YXIgc2NyZWVuUm90YXRpb25SYXRlID0gdGhpcy5nZXRTY3JlZW5BZGp1c3RlZFJvdGF0aW9uUmF0ZUlPU18ocm90YXRpb25SYXRlKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBBbmRyb2lkOiBhbmd1bGFyIHNwZWVkIGluIHJhZC9zLCBzbyBuZWVkIHRvIGNvbnZlcnQuXG4gICAgcm90YXRpb25SYXRlLmFscGhhID0gVEhSRUUuTWF0aC5yYWRUb0RlZyhyb3RhdGlvblJhdGUuYWxwaGEpO1xuICAgIHJvdGF0aW9uUmF0ZS5iZXRhID0gVEhSRUUuTWF0aC5yYWRUb0RlZyhyb3RhdGlvblJhdGUuYmV0YSk7XG4gICAgcm90YXRpb25SYXRlLmdhbW1hID0gVEhSRUUuTWF0aC5yYWRUb0RlZyhyb3RhdGlvblJhdGUuZ2FtbWEpO1xuICAgIHZhciBzY3JlZW5Sb3RhdGlvblJhdGUgPSB0aGlzLmdldFNjcmVlbkFkanVzdGVkUm90YXRpb25SYXRlXyhyb3RhdGlvblJhdGUpO1xuICB9XG4gIHZhciB2ZWMgPSBuZXcgVEhSRUUuVmVjdG9yMyhcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhLCBzY3JlZW5Sb3RhdGlvblJhdGUuYWxwaGEsIHNjcmVlblJvdGF0aW9uUmF0ZS5nYW1tYSk7XG5cbiAgLypcbiAgdmFyIHZlYztcbiAgaWYgKC9pUGFkfGlQaG9uZXxpUG9kLy50ZXN0KG5hdmlnYXRvci5wbGF0Zm9ybSkpIHtcbiAgICB2ZWMgPSBuZXcgVEhSRUUuVmVjdG9yMyhyb3RhdGlvblJhdGUuZ2FtbWEsIHJvdGF0aW9uUmF0ZS5hbHBoYSwgcm90YXRpb25SYXRlLmJldGEpO1xuICB9IGVsc2Uge1xuICAgIHZlYyA9IG5ldyBUSFJFRS5WZWN0b3IzKHJvdGF0aW9uUmF0ZS5iZXRhLCByb3RhdGlvblJhdGUuYWxwaGEsIHJvdGF0aW9uUmF0ZS5nYW1tYSk7XG4gIH1cbiAgLy8gVGFrZSBpbnRvIGFjY291bnQgdGhlIHNjcmVlbiBvcmllbnRhdGlvbiB0b28hXG4gIHZlYy5hcHBseVF1YXRlcm5pb24odGhpcy5zY3JlZW5UcmFuc2Zvcm0pO1xuICAqL1xuXG4gIC8vIEFuZ3VsYXIgc3BlZWQgaW4gZGVnL3MuXG4gIHZhciBhbmd1bGFyU3BlZWREZWdTID0gdmVjLmxlbmd0aCgpO1xuXG4gIHZhciBheGlzID0gdmVjLm5vcm1hbGl6ZSgpO1xuICByZXR1cm4ge1xuICAgIHNwZWVkOiBhbmd1bGFyU3BlZWREZWdTLFxuICAgIGF4aXM6IGF4aXNcbiAgfVxufTtcblxuUG9zZVByZWRpY3Rvci5wcm90b3R5cGUuZ2V0U2NyZWVuQWRqdXN0ZWRSb3RhdGlvblJhdGVfID0gZnVuY3Rpb24ocm90YXRpb25SYXRlKSB7XG4gIHZhciBzY3JlZW5Sb3RhdGlvblJhdGUgPSB7XG4gICAgYWxwaGE6IC1yb3RhdGlvblJhdGUuYWxwaGEsXG4gICAgYmV0YTogcm90YXRpb25SYXRlLmJldGEsXG4gICAgZ2FtbWE6IHJvdGF0aW9uUmF0ZS5nYW1tYVxuICB9O1xuICBzd2l0Y2ggKHRoaXMuc2NyZWVuT3JpZW50YXRpb24pIHtcbiAgICBjYXNlIDkwOlxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmJldGEgID0gLSByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAgIHJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAxODA6XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuYmV0YSAgPSAtIHJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmdhbW1hID0gLSByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDI3MDpcbiAgICBjYXNlIC05MDpcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhICA9ICAgcm90YXRpb25SYXRlLmdhbW1hO1xuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmdhbW1hID0gLSByb3RhdGlvblJhdGUuYmV0YTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6IC8vIFNDUkVFTl9ST1RBVElPTl8wXG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuYmV0YSAgPSAgIHJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmdhbW1hID0gICByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gc2NyZWVuUm90YXRpb25SYXRlO1xufTtcblxuUG9zZVByZWRpY3Rvci5wcm90b3R5cGUuZ2V0U2NyZWVuQWRqdXN0ZWRSb3RhdGlvblJhdGVJT1NfID0gZnVuY3Rpb24ocm90YXRpb25SYXRlKSB7XG4gIHZhciBzY3JlZW5Sb3RhdGlvblJhdGUgPSB7XG4gICAgYWxwaGE6IHJvdGF0aW9uUmF0ZS5hbHBoYSxcbiAgICBiZXRhOiByb3RhdGlvblJhdGUuYmV0YSxcbiAgICBnYW1tYTogcm90YXRpb25SYXRlLmdhbW1hXG4gIH07XG4gIC8vIFZhbHVlcyBlbXBpcmljYWxseSBkZXJpdmVkLlxuICBzd2l0Y2ggKHRoaXMuc2NyZWVuT3JpZW50YXRpb24pIHtcbiAgICBjYXNlIDkwOlxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmJldGEgID0gLXJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmdhbW1hID0gIHJvdGF0aW9uUmF0ZS5nYW1tYTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMTgwOlxuICAgICAgLy8gWW91IGNhbid0IGV2ZW4gZG8gdGhpcyBvbiBpT1MuXG4gICAgICBicmVhaztcbiAgICBjYXNlIDI3MDpcbiAgICBjYXNlIC05MDpcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5hbHBoYSA9IC1yb3RhdGlvblJhdGUuYWxwaGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuYmV0YSAgPSAgcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAgcm90YXRpb25SYXRlLmdhbW1hO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDogLy8gU0NSRUVOX1JPVEFUSU9OXzBcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5hbHBoYSA9ICByb3RhdGlvblJhdGUuYmV0YTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhICA9ICByb3RhdGlvblJhdGUuYWxwaGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAgcm90YXRpb25SYXRlLmdhbW1hO1xuICAgICAgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHNjcmVlblJvdGF0aW9uUmF0ZTtcbn07XG5cblBvc2VQcmVkaWN0b3IucHJvdG90eXBlLmdldEF4aXNBbmd1bGFyU3BlZWRGcm9tR3lyb0RlbHRhXyA9IGZ1bmN0aW9uKGN1cnJlbnRRLCBlbGFwc2VkTXMpIHtcbiAgLy8gU29tZXRpbWVzIHdlIHVzZSB0aGUgc2FtZSBzZW5zb3IgdGltZXN0YW1wLCBpbiB3aGljaCBjYXNlIHByZWRpY3Rpb25cbiAgLy8gd29uJ3Qgd29yay5cbiAgaWYgKGVsYXBzZWRNcyA9PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gUV9kZWx0YSA9IFFfbGFzdF4tMSAqIFFfY3VyclxuICB0aGlzLmRlbHRhUS5jb3B5KHRoaXMubGFzdFEpO1xuICB0aGlzLmRlbHRhUS5pbnZlcnNlKCk7XG4gIHRoaXMuZGVsdGFRLm11bHRpcGx5KGN1cnJlbnRRKTtcblxuICAvLyBDb252ZXJ0IGZyb20gZGVsdGEgcXVhdGVybmlvbiB0byBheGlzLWFuZ2xlLlxuICB2YXIgYXhpcyA9IHRoaXMuZ2V0QXhpc18odGhpcy5kZWx0YVEpO1xuICB2YXIgYW5nbGVSYWQgPSB0aGlzLmdldEFuZ2xlXyh0aGlzLmRlbHRhUSk7XG4gIC8vIEl0IHRvb2sgYGVsYXBzZWRgIG1zIHRvIHRyYXZlbCB0aGUgYW5nbGUgYW1vdW50IG92ZXIgdGhlIGF4aXMuIE5vdyxcbiAgLy8gd2UgbWFrZSBhIG5ldyBxdWF0ZXJuaW9uIGJhc2VkIGhvdyBmYXIgaW4gdGhlIGZ1dHVyZSB3ZSB3YW50IHRvXG4gIC8vIGNhbGN1bGF0ZS5cbiAgdmFyIGFuZ3VsYXJTcGVlZFJhZE1zID0gYW5nbGVSYWQgLyBlbGFwc2VkTXM7XG4gIHZhciBhbmd1bGFyU3BlZWREZWdTID0gVEhSRUUuTWF0aC5yYWRUb0RlZyhhbmd1bGFyU3BlZWRSYWRNcykgKiAxMDAwO1xuICAvLyBJZiBubyByb3RhdGlvbiByYXRlIGlzIHByb3ZpZGVkLCBkbyBubyBwcmVkaWN0aW9uLlxuICByZXR1cm4ge1xuICAgIHNwZWVkOiBhbmd1bGFyU3BlZWREZWdTLFxuICAgIGF4aXM6IGF4aXNcbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUG9zZVByZWRpY3RvcjtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbnZhciBST1RBVEVfU1BFRUQgPSAwLjU7XG4vKipcbiAqIFByb3ZpZGVzIGEgcXVhdGVybmlvbiByZXNwb25zaWJsZSBmb3IgcHJlLXBhbm5pbmcgdGhlIHNjZW5lIGJlZm9yZSBmdXJ0aGVyXG4gKiB0cmFuc2Zvcm1hdGlvbnMgZHVlIHRvIGRldmljZSBzZW5zb3JzLlxuICovXG5mdW5jdGlvbiBUb3VjaFBhbm5lcigpIHtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0aGlzLm9uVG91Y2hTdGFydF8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLm9uVG91Y2hNb3ZlXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgdGhpcy5vblRvdWNoRW5kXy5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmlzVG91Y2hpbmcgPSBmYWxzZTtcbiAgdGhpcy5yb3RhdGVTdGFydCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gIHRoaXMucm90YXRlRW5kID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgdGhpcy5yb3RhdGVEZWx0YSA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG5cbiAgdGhpcy50aGV0YSA9IDA7XG4gIHRoaXMub3JpZW50YXRpb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICB0aGlzLmV1bGVyID0gbmV3IFRIUkVFLkV1bGVyKCk7XG59XG5cblRvdWNoUGFubmVyLnByb3RvdHlwZS5nZXRPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmV1bGVyLnNldCgwLCB0aGlzLnRoZXRhLCAwLCAnWVhaJyk7XG4gIHRoaXMub3JpZW50YXRpb24uc2V0RnJvbUV1bGVyKHRoaXMuZXVsZXIpO1xuICByZXR1cm4gdGhpcy5vcmllbnRhdGlvbjtcbn07XG5cblRvdWNoUGFubmVyLnByb3RvdHlwZS5vblRvdWNoU3RhcnRfID0gZnVuY3Rpb24oZSkge1xuICAvLyBPbmx5IHJlc3BvbmQgaWYgdGhlcmUgaXMgZXhhY3RseSBvbmUgdG91Y2guXG4gIGlmIChlLnRvdWNoZXMubGVuZ3RoICE9IDEpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5yb3RhdGVTdGFydC5zZXQoZS50b3VjaGVzWzBdLnBhZ2VYLCBlLnRvdWNoZXNbMF0ucGFnZVkpO1xuICB0aGlzLmlzVG91Y2hpbmcgPSB0cnVlO1xufTtcblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLm9uVG91Y2hNb3ZlXyA9IGZ1bmN0aW9uKGUpIHtcbiAgaWYgKCF0aGlzLmlzVG91Y2hpbmcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5yb3RhdGVFbmQuc2V0KGUudG91Y2hlc1swXS5wYWdlWCwgZS50b3VjaGVzWzBdLnBhZ2VZKTtcbiAgdGhpcy5yb3RhdGVEZWx0YS5zdWJWZWN0b3JzKHRoaXMucm90YXRlRW5kLCB0aGlzLnJvdGF0ZVN0YXJ0KTtcbiAgdGhpcy5yb3RhdGVTdGFydC5jb3B5KHRoaXMucm90YXRlRW5kKTtcblxuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmJvZHk7XG4gIHRoaXMudGhldGEgKz0gMiAqIE1hdGguUEkgKiB0aGlzLnJvdGF0ZURlbHRhLnggLyBlbGVtZW50LmNsaWVudFdpZHRoICogUk9UQVRFX1NQRUVEO1xufTtcblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLm9uVG91Y2hFbmRfID0gZnVuY3Rpb24oZSkge1xuICB0aGlzLmlzVG91Y2hpbmcgPSBmYWxzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG91Y2hQYW5uZXI7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xudmFyIFV0aWwgPSB3aW5kb3cuVXRpbCB8fCB7fTtcblxuVXRpbC5jbGFtcCA9IGZ1bmN0aW9uKHZhbHVlLCBtaW4sIG1heCkge1xuICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgobWluLCB2YWx1ZSksIG1heCk7XG59O1xuXG5VdGlsLm1hcFJhbmdlID0gZnVuY3Rpb24odmFsdWUsIG1pbkRvbWFpbiwgbWF4RG9tYWluLCBtaW5SYW5nZSwgbWF4UmFuZ2UpIHtcbiAgLy8gSWYgd2UncmUgb3V0IG9mIHJhbmdlLCByZXR1cm4gYW4gaW52YWxpZCB2YWx1ZS5cbiAgdmFyIHBlcmNlbnQgPSAodmFsdWUgLSBtaW5Eb21haW4pIC8gKG1heERvbWFpbiAtIG1pbkRvbWFpbik7XG4gIC8vIENsYW1wIHBlcmNlbnQgdG8gWzAsIDFdLlxuICBwZXJjZW50ID0gVXRpbC5jbGFtcChwZXJjZW50LCAwLCAxKTtcbiAgcmV0dXJuIG1pblJhbmdlICsgcGVyY2VudCAqIChtYXhSYW5nZSAtIG1pblJhbmdlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbDtcbiJdfQ==
