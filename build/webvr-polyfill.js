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
var HMDVRDevice = require('./base.js').HMDVRDevice;

// Constants from vrtoolkit: https://github.com/googlesamples/cardboard-java.
var INTERPUPILLARY_DISTANCE = 0.06;
var DEFAULT_MAX_FOV_LEFT_RIGHT = 40;
var DEFAULT_MAX_FOV_BOTTOM = 40;
var DEFAULT_MAX_FOV_TOP = 40;

/**
 * The HMD itself, providing rendering parameters.
 */
function CardboardHMDVRDevice() {
  // From com/google/vrtoolkit/cardboard/FieldOfView.java.
  this.fov = {
    upDegrees: DEFAULT_MAX_FOV_TOP,
    downDegrees: DEFAULT_MAX_FOV_BOTTOM,
    leftDegrees: DEFAULT_MAX_FOV_LEFT_RIGHT,
    rightDegrees: DEFAULT_MAX_FOV_LEFT_RIGHT
  };
  // Set display constants.
  this.eyeTranslationLeft = {
    x: INTERPUPILLARY_DISTANCE * -0.5,
    y: 0,
    z: 0
  };
  this.eyeTranslationRight = {
    x: INTERPUPILLARY_DISTANCE * 0.5,
    y: 0,
    z: 0
  };
}
CardboardHMDVRDevice.prototype = new HMDVRDevice();

CardboardHMDVRDevice.prototype.getEyeParameters = function(whichEye) {
  var eyeTranslation;
  if (whichEye == 'left') {
    eyeTranslation = this.eyeTranslationLeft;
  } else if (whichEye == 'right') {
    eyeTranslation = this.eyeTranslationRight;
  } else {
    console.error('Invalid eye provided: %s', whichEye);
    return null;
  }
  return {
    recommendedFieldOfView: this.fov,
    eyeTranslation: eyeTranslation
  };
};

module.exports = CardboardHMDVRDevice;

},{"./base.js":1}],3:[function(require,module,exports){
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
var THREE = require('./three-math.js');
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

},{"./base.js":1,"./pose-predictor.js":6,"./three-math.js":7,"./touch-panner.js":8,"./util.js":9}],4:[function(require,module,exports){
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


var WebVRPolyfill = require('./webvr-polyfill-extended.js');
window.VR = window.VR || {};
window.VR.webVRPolyfill = new WebVRPolyfill();

},{"./webvr-polyfill-extended.js":10}],5:[function(require,module,exports){
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
var THREE = require('./three-math.js');
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

},{"./base.js":1,"./three-math.js":7,"./util.js":9}],6:[function(require,module,exports){
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
var THREE = require('./three-math.js');

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

},{"./three-math.js":7}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
var THREE = require('./three-math.js');

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

},{"./three-math.js":7}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
var VRDevice = require('./base.js').VRDevice;
var HMDVRDevice = require('./base.js').HMDVRDevice;
var PositionSensorVRDevice = require('./base.js').PositionSensorVRDevice;

var CardboardHMDVRDevice = require('./cardboard-hmd-vr-device.js');
var GyroPositionSensorVRDevice = require('./gyro-position-sensor-vr-device.js');
var MouseKeyboardPositionSensorVRDevice = require('./mouse-keyboard-position-sensor-vr-device.js');


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

},{"./base.js":1,"./cardboard-hmd-vr-device.js":2,"./gyro-position-sensor-vr-device.js":3,"./mouse-keyboard-position-sensor-vr-device.js":5}]},{},[4])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYmFzZS5qcyIsInNyYy9jYXJkYm9hcmQtaG1kLXZyLWRldmljZS5qcyIsInNyYy9neXJvLXBvc2l0aW9uLXNlbnNvci12ci1kZXZpY2UuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9tb3VzZS1rZXlib2FyZC1wb3NpdGlvbi1zZW5zb3ItdnItZGV2aWNlLmpzIiwic3JjL3Bvc2UtcHJlZGljdG9yLmpzIiwic3JjL3RocmVlLW1hdGguanMiLCJzcmMvdG91Y2gtcGFubmVyLmpzIiwic3JjL3V0aWwuanMiLCJzcmMvd2VidnItcG9seWZpbGwtZXh0ZW5kZWQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcnZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLyoqXG4gKiBUaGUgYmFzZSBjbGFzcyBmb3IgYWxsIFZSIGRldmljZXMuXG4gKi9cbmZ1bmN0aW9uIFZSRGV2aWNlKCkge1xuICB0aGlzLmhhcmR3YXJlVW5pdElkID0gJ3dlYnZyLXBvbHlmaWxsIGhhcmR3YXJlVW5pdElkJztcbiAgdGhpcy5kZXZpY2VJZCA9ICd3ZWJ2ci1wb2x5ZmlsbCBkZXZpY2VJZCc7XG4gIHRoaXMuZGV2aWNlTmFtZSA9ICd3ZWJ2ci1wb2x5ZmlsbCBkZXZpY2VOYW1lJztcbn1cblxuLyoqXG4gKiBUaGUgYmFzZSBjbGFzcyBmb3IgYWxsIFZSIEhNRCBkZXZpY2VzLlxuICovXG5mdW5jdGlvbiBITURWUkRldmljZSgpIHtcbn1cbkhNRFZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBWUkRldmljZSgpO1xuXG4vKipcbiAqIFRoZSBiYXNlIGNsYXNzIGZvciBhbGwgVlIgcG9zaXRpb24gc2Vuc29yIGRldmljZXMuXG4gKi9cbmZ1bmN0aW9uIFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKSB7XG59XG5Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBWUkRldmljZSgpO1xuXG5tb2R1bGUuZXhwb3J0cy5WUkRldmljZSA9IFZSRGV2aWNlO1xubW9kdWxlLmV4cG9ydHMuSE1EVlJEZXZpY2UgPSBITURWUkRldmljZTtcbm1vZHVsZS5leHBvcnRzLlBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSBQb3NpdGlvblNlbnNvclZSRGV2aWNlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbnZhciBITURWUkRldmljZSA9IHJlcXVpcmUoJy4vYmFzZS5qcycpLkhNRFZSRGV2aWNlO1xuXG4vLyBDb25zdGFudHMgZnJvbSB2cnRvb2xraXQ6IGh0dHBzOi8vZ2l0aHViLmNvbS9nb29nbGVzYW1wbGVzL2NhcmRib2FyZC1qYXZhLlxudmFyIElOVEVSUFVQSUxMQVJZX0RJU1RBTkNFID0gMC4wNjtcbnZhciBERUZBVUxUX01BWF9GT1ZfTEVGVF9SSUdIVCA9IDQwO1xudmFyIERFRkFVTFRfTUFYX0ZPVl9CT1RUT00gPSA0MDtcbnZhciBERUZBVUxUX01BWF9GT1ZfVE9QID0gNDA7XG5cbi8qKlxuICogVGhlIEhNRCBpdHNlbGYsIHByb3ZpZGluZyByZW5kZXJpbmcgcGFyYW1ldGVycy5cbiAqL1xuZnVuY3Rpb24gQ2FyZGJvYXJkSE1EVlJEZXZpY2UoKSB7XG4gIC8vIEZyb20gY29tL2dvb2dsZS92cnRvb2xraXQvY2FyZGJvYXJkL0ZpZWxkT2ZWaWV3LmphdmEuXG4gIHRoaXMuZm92ID0ge1xuICAgIHVwRGVncmVlczogREVGQVVMVF9NQVhfRk9WX1RPUCxcbiAgICBkb3duRGVncmVlczogREVGQVVMVF9NQVhfRk9WX0JPVFRPTSxcbiAgICBsZWZ0RGVncmVlczogREVGQVVMVF9NQVhfRk9WX0xFRlRfUklHSFQsXG4gICAgcmlnaHREZWdyZWVzOiBERUZBVUxUX01BWF9GT1ZfTEVGVF9SSUdIVFxuICB9O1xuICAvLyBTZXQgZGlzcGxheSBjb25zdGFudHMuXG4gIHRoaXMuZXllVHJhbnNsYXRpb25MZWZ0ID0ge1xuICAgIHg6IElOVEVSUFVQSUxMQVJZX0RJU1RBTkNFICogLTAuNSxcbiAgICB5OiAwLFxuICAgIHo6IDBcbiAgfTtcbiAgdGhpcy5leWVUcmFuc2xhdGlvblJpZ2h0ID0ge1xuICAgIHg6IElOVEVSUFVQSUxMQVJZX0RJU1RBTkNFICogMC41LFxuICAgIHk6IDAsXG4gICAgejogMFxuICB9O1xufVxuQ2FyZGJvYXJkSE1EVlJEZXZpY2UucHJvdG90eXBlID0gbmV3IEhNRFZSRGV2aWNlKCk7XG5cbkNhcmRib2FyZEhNRFZSRGV2aWNlLnByb3RvdHlwZS5nZXRFeWVQYXJhbWV0ZXJzID0gZnVuY3Rpb24od2hpY2hFeWUpIHtcbiAgdmFyIGV5ZVRyYW5zbGF0aW9uO1xuICBpZiAod2hpY2hFeWUgPT0gJ2xlZnQnKSB7XG4gICAgZXllVHJhbnNsYXRpb24gPSB0aGlzLmV5ZVRyYW5zbGF0aW9uTGVmdDtcbiAgfSBlbHNlIGlmICh3aGljaEV5ZSA9PSAncmlnaHQnKSB7XG4gICAgZXllVHJhbnNsYXRpb24gPSB0aGlzLmV5ZVRyYW5zbGF0aW9uUmlnaHQ7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignSW52YWxpZCBleWUgcHJvdmlkZWQ6ICVzJywgd2hpY2hFeWUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB7XG4gICAgcmVjb21tZW5kZWRGaWVsZE9mVmlldzogdGhpcy5mb3YsXG4gICAgZXllVHJhbnNsYXRpb246IGV5ZVRyYW5zbGF0aW9uXG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhcmRib2FyZEhNRFZSRGV2aWNlO1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbnZhciBQb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi9iYXNlLmpzJykuUG9zaXRpb25TZW5zb3JWUkRldmljZTtcbnZhciBQb3NlUHJlZGljdG9yID0gcmVxdWlyZSgnLi9wb3NlLXByZWRpY3Rvci5qcycpO1xudmFyIFRIUkVFID0gcmVxdWlyZSgnLi90aHJlZS1tYXRoLmpzJyk7XG52YXIgVG91Y2hQYW5uZXIgPSByZXF1aXJlKCcuL3RvdWNoLXBhbm5lci5qcycpO1xudmFyIFV0aWwgPSByZXF1aXJlKCcuL3V0aWwuanMnKTtcblxuV0VCVlJfWUFXX09OTFkgPSBmYWxzZTtcblxuLyoqXG4gKiBUaGUgcG9zaXRpb25hbCBzZW5zb3IsIGltcGxlbWVudGVkIHVzaW5nIHdlYiBEZXZpY2VPcmllbnRhdGlvbiBBUElzLlxuICovXG5mdW5jdGlvbiBHeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZSgpIHtcbiAgdGhpcy5kZXZpY2VJZCA9ICd3ZWJ2ci1wb2x5ZmlsbDpneXJvJztcbiAgdGhpcy5kZXZpY2VOYW1lID0gJ1ZSIFBvc2l0aW9uIERldmljZSAod2VidnItcG9seWZpbGw6Z3lybyknO1xuXG4gIC8vIFN1YnNjcmliZSB0byBkZXZpY2VvcmllbnRhdGlvbiBldmVudHMuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VvcmllbnRhdGlvbicsIHRoaXMub25EZXZpY2VPcmllbnRhdGlvbkNoYW5nZV8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2Vtb3Rpb24nLCB0aGlzLm9uRGV2aWNlTW90aW9uQ2hhbmdlXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5vblNjcmVlbk9yaWVudGF0aW9uQ2hhbmdlXy5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmRldmljZU9yaWVudGF0aW9uID0gbnVsbDtcbiAgdGhpcy5zY3JlZW5PcmllbnRhdGlvbiA9IHdpbmRvdy5zY3JlZW4ub3JpZW50YXRpb24uYW5nbGU7XG5cbiAgLy8gSGVscGVyIG9iamVjdHMgZm9yIGNhbGN1bGF0aW5nIG9yaWVudGF0aW9uLlxuICB0aGlzLmZpbmFsUXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMudG1wUXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMuZGV2aWNlRXVsZXIgPSBuZXcgVEhSRUUuRXVsZXIoKTtcbiAgdGhpcy5zY3JlZW5UcmFuc2Zvcm0gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICAvLyAtUEkvMiBhcm91bmQgdGhlIHgtYXhpcy5cbiAgdGhpcy53b3JsZFRyYW5zZm9ybSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKC1NYXRoLnNxcnQoMC41KSwgMCwgMCwgTWF0aC5zcXJ0KDAuNSkpO1xuXG4gIC8vIFRoZSBxdWF0ZXJuaW9uIGZvciB0YWtpbmcgaW50byBhY2NvdW50IHRoZSByZXNldCBwb3NpdGlvbi5cbiAgdGhpcy5yZXNldFRyYW5zZm9ybSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cbiAgdGhpcy50b3VjaFBhbm5lciA9IG5ldyBUb3VjaFBhbm5lcigpO1xuICB0aGlzLnBvc2VQcmVkaWN0b3IgPSBuZXcgUG9zZVByZWRpY3RvcigpO1xufVxuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlID0gbmV3IFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UoKTtcblxuLyoqXG4gKiBSZXR1cm5zIHtvcmllbnRhdGlvbjoge3gseSx6LHd9LCBwb3NpdGlvbjogbnVsbH0uXG4gKiBQb3NpdGlvbiBpcyBub3Qgc3VwcG9ydGVkIHNpbmNlIHdlIGNhbid0IGRvIDZET0YuXG4gKi9cbkd5cm9Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5nZXRTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIGhhc09yaWVudGF0aW9uOiB0cnVlLFxuICAgIG9yaWVudGF0aW9uOiB0aGlzLmdldE9yaWVudGF0aW9uKCksXG4gICAgaGFzUG9zaXRpb246IGZhbHNlLFxuICAgIHBvc2l0aW9uOiBudWxsXG4gIH1cbn07XG5cbkd5cm9Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbkRldmljZU9yaWVudGF0aW9uQ2hhbmdlXyA9XG4gICAgZnVuY3Rpb24oZGV2aWNlT3JpZW50YXRpb24pIHtcbiAgdGhpcy5kZXZpY2VPcmllbnRhdGlvbiA9IGRldmljZU9yaWVudGF0aW9uO1xufTtcblxuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uRGV2aWNlTW90aW9uQ2hhbmdlXyA9XG4gICAgZnVuY3Rpb24oZGV2aWNlTW90aW9uKSB7XG4gIHRoaXMuZGV2aWNlTW90aW9uID0gZGV2aWNlTW90aW9uO1xufTtcblxuR3lyb1Bvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uU2NyZWVuT3JpZW50YXRpb25DaGFuZ2VfID1cbiAgICBmdW5jdGlvbihzY3JlZW5PcmllbnRhdGlvbikge1xuICB0aGlzLnNjcmVlbk9yaWVudGF0aW9uID0gd2luZG93LnNjcmVlbi5vcmllbnRhdGlvbi5hbmdsZTtcbn07XG5cbkd5cm9Qb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5nZXRPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5kZXZpY2VPcmllbnRhdGlvbiA9PSBudWxsKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBSb3RhdGlvbiBhcm91bmQgdGhlIHotYXhpcy5cbiAgdmFyIGFscGhhID0gVEhSRUUuTWF0aC5kZWdUb1JhZCh0aGlzLmRldmljZU9yaWVudGF0aW9uLmFscGhhKTtcbiAgLy8gRnJvbnQtdG8tYmFjayAoaW4gcG9ydHJhaXQpIHJvdGF0aW9uICh4LWF4aXMpLlxuICB2YXIgYmV0YSA9IFRIUkVFLk1hdGguZGVnVG9SYWQodGhpcy5kZXZpY2VPcmllbnRhdGlvbi5iZXRhKTtcbiAgLy8gTGVmdCB0byByaWdodCAoaW4gcG9ydHJhaXQpIHJvdGF0aW9uICh5LWF4aXMpLlxuICB2YXIgZ2FtbWEgPSBUSFJFRS5NYXRoLmRlZ1RvUmFkKHRoaXMuZGV2aWNlT3JpZW50YXRpb24uZ2FtbWEpO1xuICB2YXIgb3JpZW50ID0gVEhSRUUuTWF0aC5kZWdUb1JhZCh0aGlzLnNjcmVlbk9yaWVudGF0aW9uKTtcblxuICAvLyBVc2UgdGhyZWUuanMgdG8gY29udmVydCB0byBxdWF0ZXJuaW9uLiBMaWZ0ZWQgZnJvbVxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vcmljaHRyL3RocmVlVlIvYmxvYi9tYXN0ZXIvanMvRGV2aWNlT3JpZW50YXRpb25Db250cm9sbGVyLmpzXG4gIHRoaXMuZGV2aWNlRXVsZXIuc2V0KGJldGEsIGFscGhhLCAtZ2FtbWEsICdZWFonKTtcbiAgdGhpcy50bXBRdWF0ZXJuaW9uLnNldEZyb21FdWxlcih0aGlzLmRldmljZUV1bGVyKTtcbiAgdGhpcy5taW51c0hhbGZBbmdsZSA9IC1vcmllbnQgLyAyO1xuICB0aGlzLnNjcmVlblRyYW5zZm9ybS5zZXQoMCwgTWF0aC5zaW4odGhpcy5taW51c0hhbGZBbmdsZSksIDAsIE1hdGguY29zKHRoaXMubWludXNIYWxmQW5nbGUpKTtcbiAgLy8gVGFrZSBpbnRvIGFjY291bnQgdGhlIHJlc2V0IHRyYW5zZm9ybWF0aW9uLlxuICB0aGlzLmZpbmFsUXVhdGVybmlvbi5jb3B5KHRoaXMucmVzZXRUcmFuc2Zvcm0pO1xuICAvLyBBbmQgYW55IHJvdGF0aW9ucyBkb25lIHZpYSB0b3VjaCBldmVudHMuXG4gIHRoaXMuZmluYWxRdWF0ZXJuaW9uLm11bHRpcGx5KHRoaXMudG91Y2hQYW5uZXIuZ2V0T3JpZW50YXRpb24oKSk7XG4gIHRoaXMuZmluYWxRdWF0ZXJuaW9uLm11bHRpcGx5KHRoaXMudG1wUXVhdGVybmlvbik7XG4gIHRoaXMuZmluYWxRdWF0ZXJuaW9uLm11bHRpcGx5KHRoaXMuc2NyZWVuVHJhbnNmb3JtKTtcbiAgdGhpcy5maW5hbFF1YXRlcm5pb24ubXVsdGlwbHkodGhpcy53b3JsZFRyYW5zZm9ybSk7XG5cbiAgdGhpcy5wb3NlUHJlZGljdG9yLnNldFNjcmVlbk9yaWVudGF0aW9uKHRoaXMuc2NyZWVuT3JpZW50YXRpb24pO1xuXG4gIHZhciBiZXN0VGltZSA9IHRoaXMuZGV2aWNlT3JpZW50YXRpb24udGltZVN0YW1wO1xuICB2YXIgcm90UmF0ZSA9IHRoaXMuZGV2aWNlTW90aW9uICYmIHRoaXMuZGV2aWNlTW90aW9uLnJvdGF0aW9uUmF0ZTtcbiAgdmFyIG91dCA9IHRoaXMucG9zZVByZWRpY3Rvci5nZXRQcmVkaWN0aW9uKFxuICAgICAgdGhpcy5maW5hbFF1YXRlcm5pb24sIHJvdFJhdGUsIGJlc3RUaW1lKTtcblxuICAvLyBBZGp1c3QgZm9yIHBpdGNoIGNvbnN0cmFpbnRzIChmb3Igbm9uLXNwaGVyaWNhbCBwYW5vcykuXG4gIGlmIChXRUJWUl9ZQVdfT05MWSkge1xuICAgIG91dC54ID0gMDtcbiAgICBvdXQueiA9IDA7XG4gICAgb3V0Lm5vcm1hbGl6ZSgpO1xuICB9XG4gIHJldHVybiBvdXQ7XG59O1xuXG5HeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUucmVzZXRTZW5zb3IgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGFuZ2xlID0gVEhSRUUuTWF0aC5kZWdUb1JhZCh0aGlzLmRldmljZU9yaWVudGF0aW9uLmFscGhhKTtcbiAgY29uc29sZS5sb2coJ05vcm1hbGl6aW5nIHlhdyB0byAlZicsIGFuZ2xlKTtcbiAgdGhpcy5yZXNldFRyYW5zZm9ybS5zZXRGcm9tQXhpc0FuZ2xlKG5ldyBUSFJFRS5WZWN0b3IzKDAsIDEsIDApLCAtYW5nbGUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbi8vIENNOiBtdXN0IGNyZWF0ZSBvdXIgb3duIHBvbHlmaWxsIGluc3RhbmNlXG4vL3ZhciBXZWJWUlBvbHlmaWxsID0gcmVxdWlyZSgnLi93ZWJ2ci1wb2x5ZmlsbC5qcycpO1xuLy9cbi8vIG5ldyBXZWJWUlBvbHlmaWxsKCk7XG5cblxudmFyIFdlYlZSUG9seWZpbGwgPSByZXF1aXJlKCcuL3dlYnZyLXBvbHlmaWxsLWV4dGVuZGVkLmpzJyk7XG53aW5kb3cuVlIgPSB3aW5kb3cuVlIgfHwge307XG53aW5kb3cuVlIud2ViVlJQb2x5ZmlsbCA9IG5ldyBXZWJWUlBvbHlmaWxsKCk7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xudmFyIFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UgPSByZXF1aXJlKCcuL2Jhc2UuanMnKS5Qb3NpdGlvblNlbnNvclZSRGV2aWNlO1xudmFyIFRIUkVFID0gcmVxdWlyZSgnLi90aHJlZS1tYXRoLmpzJyk7XG52YXIgVXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG4vLyBIb3cgbXVjaCB0byByb3RhdGUgcGVyIGtleSBzdHJva2UuXG52YXIgS0VZX1NQRUVEID0gMC4xNTtcbnZhciBLRVlfQU5JTUFUSU9OX0RVUkFUSU9OID0gODA7XG5cbi8vIEhvdyBtdWNoIHRvIHJvdGF0ZSBmb3IgbW91c2UgZXZlbnRzLlxudmFyIE1PVVNFX1NQRUVEX1ggPSAwLjU7XG52YXIgTU9VU0VfU1BFRURfWSA9IDAuMztcblxuLyoqXG4gKiBBIHZpcnR1YWwgcG9zaXRpb24gc2Vuc29yLCBpbXBsZW1lbnRlZCB1c2luZyBrZXlib2FyZCBhbmRcbiAqIG1vdXNlIEFQSXMuIFRoaXMgaXMgZGVzaWduZWQgYXMgZm9yIGRlc2t0b3BzL2xhcHRvcHMgd2hlcmUgbm8gRGV2aWNlKlxuICogZXZlbnRzIHdvcmsuXG4gKi9cbmZ1bmN0aW9uIE1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlKCkge1xuICB0aGlzLmRldmljZUlkID0gJ3dlYnZyLXBvbHlmaWxsOm1vdXNlLWtleWJvYXJkJztcbiAgdGhpcy5kZXZpY2VOYW1lID0gJ1ZSIFBvc2l0aW9uIERldmljZSAod2VidnItcG9seWZpbGw6bW91c2Uta2V5Ym9hcmQpJztcblxuICAvLyBBdHRhY2ggdG8gbW91c2UgYW5kIGtleWJvYXJkIGV2ZW50cy5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLm9uS2V5RG93bl8uYmluZCh0aGlzKSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlXy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMub25Nb3VzZURvd25fLmJpbmQodGhpcykpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMub25Nb3VzZVVwXy5iaW5kKHRoaXMpKTtcblxuICB0aGlzLnBoaSA9IDA7XG4gIHRoaXMudGhldGEgPSAwO1xuXG4gIC8vIFZhcmlhYmxlcyBmb3Iga2V5Ym9hcmQtYmFzZWQgcm90YXRpb24gYW5pbWF0aW9uLlxuICB0aGlzLnRhcmdldEFuZ2xlID0gbnVsbDtcblxuICAvLyBTdGF0ZSB2YXJpYWJsZXMgZm9yIGNhbGN1bGF0aW9ucy5cbiAgdGhpcy5ldWxlciA9IG5ldyBUSFJFRS5FdWxlcigpO1xuICB0aGlzLm9yaWVudGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICAvLyBWYXJpYWJsZXMgZm9yIG1vdXNlLWJhc2VkIHJvdGF0aW9uLlxuICB0aGlzLnJvdGF0ZVN0YXJ0ID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgdGhpcy5yb3RhdGVFbmQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICB0aGlzLnJvdGF0ZURlbHRhID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbn1cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZSA9IG5ldyBQb3NpdGlvblNlbnNvclZSRGV2aWNlKCk7XG5cbi8qKlxuICogUmV0dXJucyB7b3JpZW50YXRpb246IHt4LHkseix3fSwgcG9zaXRpb246IG51bGx9LlxuICogUG9zaXRpb24gaXMgbm90IHN1cHBvcnRlZCBmb3IgcGFyaXR5IHdpdGggb3RoZXIgUG9zaXRpb25TZW5zb3JzLlxuICovXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuZ2V0U3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5ldWxlci5zZXQodGhpcy5waGksIHRoaXMudGhldGEsIDAsICdZWFonKTtcbiAgdGhpcy5vcmllbnRhdGlvbi5zZXRGcm9tRXVsZXIodGhpcy5ldWxlcik7XG5cbiAgcmV0dXJuIHtcbiAgICBoYXNPcmllbnRhdGlvbjogdHJ1ZSxcbiAgICBvcmllbnRhdGlvbjogdGhpcy5vcmllbnRhdGlvbixcbiAgICBoYXNQb3NpdGlvbjogZmFsc2UsXG4gICAgcG9zaXRpb246IG51bGxcbiAgfVxufTtcblxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uS2V5RG93bl8gPSBmdW5jdGlvbihlKSB7XG4gIC8vIFRyYWNrIFdBU0QgYW5kIGFycm93IGtleXMuXG4gIGlmIChlLmtleUNvZGUgPT0gMzgpIHsgLy8gVXAga2V5LlxuICAgIHRoaXMuYW5pbWF0ZVBoaV8odGhpcy5waGkgKyBLRVlfU1BFRUQpO1xuICB9IGVsc2UgaWYgKGUua2V5Q29kZSA9PSAzOSkgeyAvLyBSaWdodCBrZXkuXG4gICAgdGhpcy5hbmltYXRlVGhldGFfKHRoaXMudGhldGEgLSBLRVlfU1BFRUQpO1xuICB9IGVsc2UgaWYgKGUua2V5Q29kZSA9PSA0MCkgeyAvLyBEb3duIGtleS5cbiAgICB0aGlzLmFuaW1hdGVQaGlfKHRoaXMucGhpIC0gS0VZX1NQRUVEKTtcbiAgfSBlbHNlIGlmIChlLmtleUNvZGUgPT0gMzcpIHsgLy8gTGVmdCBrZXkuXG4gICAgdGhpcy5hbmltYXRlVGhldGFfKHRoaXMudGhldGEgKyBLRVlfU1BFRUQpO1xuICB9XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuYW5pbWF0ZVRoZXRhXyA9IGZ1bmN0aW9uKHRhcmdldEFuZ2xlKSB7XG4gIHRoaXMuYW5pbWF0ZUtleVRyYW5zaXRpb25zXygndGhldGEnLCB0YXJnZXRBbmdsZSk7XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuYW5pbWF0ZVBoaV8gPSBmdW5jdGlvbih0YXJnZXRBbmdsZSkge1xuICAvLyBQcmV2ZW50IGxvb2tpbmcgdG9vIGZhciB1cCBvciBkb3duLlxuICB0YXJnZXRBbmdsZSA9IFV0aWwuY2xhbXAodGFyZ2V0QW5nbGUsIC1NYXRoLlBJLzIsIE1hdGguUEkvMik7XG4gIHRoaXMuYW5pbWF0ZUtleVRyYW5zaXRpb25zXygncGhpJywgdGFyZ2V0QW5nbGUpO1xufTtcblxuLyoqXG4gKiBTdGFydCBhbiBhbmltYXRpb24gdG8gdHJhbnNpdGlvbiBhbiBhbmdsZSBmcm9tIG9uZSB2YWx1ZSB0byBhbm90aGVyLlxuICovXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUuYW5pbWF0ZUtleVRyYW5zaXRpb25zXyA9IGZ1bmN0aW9uKGFuZ2xlTmFtZSwgdGFyZ2V0QW5nbGUpIHtcbiAgLy8gSWYgYW4gYW5pbWF0aW9uIGlzIGN1cnJlbnRseSBydW5uaW5nLCBjYW5jZWwgaXQuXG4gIGlmICh0aGlzLmFuZ2xlQW5pbWF0aW9uKSB7XG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmFuZ2xlQW5pbWF0aW9uKTtcbiAgfVxuICB2YXIgc3RhcnRBbmdsZSA9IHRoaXNbYW5nbGVOYW1lXTtcbiAgdmFyIHN0YXJ0VGltZSA9IG5ldyBEYXRlKCk7XG4gIC8vIFNldCB1cCBhbiBpbnRlcnZhbCB0aW1lciB0byBwZXJmb3JtIHRoZSBhbmltYXRpb24uXG4gIHRoaXMuYW5nbGVBbmltYXRpb24gPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAvLyBPbmNlIHdlJ3JlIGZpbmlzaGVkIHRoZSBhbmltYXRpb24sIHdlJ3JlIGRvbmUuXG4gICAgdmFyIGVsYXBzZWQgPSBuZXcgRGF0ZSgpIC0gc3RhcnRUaW1lO1xuICAgIGlmIChlbGFwc2VkID49IEtFWV9BTklNQVRJT05fRFVSQVRJT04pIHtcbiAgICAgIHRoaXNbYW5nbGVOYW1lXSA9IHRhcmdldEFuZ2xlO1xuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmFuZ2xlQW5pbWF0aW9uKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gTGluZWFybHkgaW50ZXJwb2xhdGUgdGhlIGFuZ2xlIHNvbWUgYW1vdW50LlxuICAgIHZhciBwZXJjZW50ID0gZWxhcHNlZCAvIEtFWV9BTklNQVRJT05fRFVSQVRJT047XG4gICAgdGhpc1thbmdsZU5hbWVdID0gc3RhcnRBbmdsZSArICh0YXJnZXRBbmdsZSAtIHN0YXJ0QW5nbGUpICogcGVyY2VudDtcbiAgfS5iaW5kKHRoaXMpLCAxMDAwLzYwKTtcbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbk1vdXNlRG93bl8gPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMucm90YXRlU3RhcnQuc2V0KGUuY2xpZW50WCwgZS5jbGllbnRZKTtcbiAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcbn07XG5cbi8vIFZlcnkgc2ltaWxhciB0byBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9tcmZsaXgvODM1MTAyMFxuTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2UucHJvdG90eXBlLm9uTW91c2VNb3ZlXyA9IGZ1bmN0aW9uKGUpIHtcbiAgaWYgKCF0aGlzLmlzRHJhZ2dpbmcgJiYgIXRoaXMuaXNQb2ludGVyTG9ja2VkXygpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIFN1cHBvcnQgcG9pbnRlciBsb2NrIEFQSS5cbiAgaWYgKHRoaXMuaXNQb2ludGVyTG9ja2VkXygpKSB7XG4gICAgdmFyIG1vdmVtZW50WCA9IGUubW92ZW1lbnRYIHx8IGUubW96TW92ZW1lbnRYIHx8IDA7XG4gICAgdmFyIG1vdmVtZW50WSA9IGUubW92ZW1lbnRZIHx8IGUubW96TW92ZW1lbnRZIHx8IDA7XG4gICAgdGhpcy5yb3RhdGVFbmQuc2V0KHRoaXMucm90YXRlU3RhcnQueCAtIG1vdmVtZW50WCwgdGhpcy5yb3RhdGVTdGFydC55IC0gbW92ZW1lbnRZKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnJvdGF0ZUVuZC5zZXQoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuICB9XG4gIC8vIENhbGN1bGF0ZSBob3cgbXVjaCB3ZSBtb3ZlZCBpbiBtb3VzZSBzcGFjZS5cbiAgdGhpcy5yb3RhdGVEZWx0YS5zdWJWZWN0b3JzKHRoaXMucm90YXRlRW5kLCB0aGlzLnJvdGF0ZVN0YXJ0KTtcbiAgdGhpcy5yb3RhdGVTdGFydC5jb3B5KHRoaXMucm90YXRlRW5kKTtcblxuICAvLyBLZWVwIHRyYWNrIG9mIHRoZSBjdW11bGF0aXZlIGV1bGVyIGFuZ2xlcy5cbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5ib2R5O1xuICB0aGlzLnBoaSArPSAyICogTWF0aC5QSSAqIHRoaXMucm90YXRlRGVsdGEueSAvIGVsZW1lbnQuY2xpZW50SGVpZ2h0ICogTU9VU0VfU1BFRURfWTtcbiAgdGhpcy50aGV0YSArPSAyICogTWF0aC5QSSAqIHRoaXMucm90YXRlRGVsdGEueCAvIGVsZW1lbnQuY2xpZW50V2lkdGggKiBNT1VTRV9TUEVFRF9YO1xuXG4gIC8vIFByZXZlbnQgbG9va2luZyB0b28gZmFyIHVwIG9yIGRvd24uXG4gIHRoaXMucGhpID0gVXRpbC5jbGFtcCh0aGlzLnBoaSwgLU1hdGguUEkvMiwgTWF0aC5QSS8yKTtcbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5vbk1vdXNlVXBfID0gZnVuY3Rpb24oZSkge1xuICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbn07XG5cbk1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlLnByb3RvdHlwZS5pc1BvaW50ZXJMb2NrZWRfID0gZnVuY3Rpb24oKSB7XG4gIHZhciBlbCA9IGRvY3VtZW50LnBvaW50ZXJMb2NrRWxlbWVudCB8fCBkb2N1bWVudC5tb3pQb2ludGVyTG9ja0VsZW1lbnQgfHxcbiAgICAgIGRvY3VtZW50LndlYmtpdFBvaW50ZXJMb2NrRWxlbWVudDtcbiAgcmV0dXJuIGVsICE9PSB1bmRlZmluZWQ7XG59O1xuXG5Nb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZS5wcm90b3R5cGUucmVzZXRTZW5zb3IgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5lcnJvcignTm90IGltcGxlbWVudGVkIHlldC4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2VLZXlib2FyZFBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xudmFyIFRIUkVFID0gcmVxdWlyZSgnLi90aHJlZS1tYXRoLmpzJyk7XG5cbnZhciBQcmVkaWN0aW9uTW9kZSA9IHtcbiAgTk9ORTogJ25vbmUnLFxuICBJTlRFUlBPTEFURTogJ2ludGVycG9sYXRlJyxcbiAgUFJFRElDVDogJ3ByZWRpY3QnXG59XG5cbi8vIEhvdyBtdWNoIHRvIGludGVycG9sYXRlIGJldHdlZW4gdGhlIGN1cnJlbnQgb3JpZW50YXRpb24gZXN0aW1hdGUgYW5kIHRoZVxuLy8gcHJldmlvdXMgZXN0aW1hdGUgcG9zaXRpb24uIFRoaXMgaXMgaGVscGZ1bCBmb3IgZGV2aWNlcyB3aXRoIGxvd1xuLy8gZGV2aWNlb3JpZW50YXRpb24gZmlyaW5nIGZyZXF1ZW5jeSAoZWcuIG9uIGlPUzggYW5kIGJlbG93LCBpdCBpcyAyMCBIeikuICBUaGVcbi8vIGxhcmdlciB0aGlzIHZhbHVlIChpbiBbMCwgMV0pLCB0aGUgc21vb3RoZXIgYnV0IG1vcmUgZGVsYXllZCB0aGUgaGVhZFxuLy8gdHJhY2tpbmcgaXMuXG52YXIgSU5URVJQT0xBVElPTl9TTU9PVEhJTkdfRkFDVE9SID0gMC4wMTtcblxuLy8gQW5ndWxhciB0aHJlc2hvbGQsIGlmIHRoZSBhbmd1bGFyIHNwZWVkIChpbiBkZWcvcykgaXMgbGVzcyB0aGFuIHRoaXMsIGRvIG5vXG4vLyBwcmVkaWN0aW9uLiBXaXRob3V0IGl0LCB0aGUgc2NyZWVuIGZsaWNrZXJzIHF1aXRlIGEgYml0LlxudmFyIFBSRURJQ1RJT05fVEhSRVNIT0xEX0RFR19QRVJfUyA9IDAuMDE7XG4vL3ZhciBQUkVESUNUSU9OX1RIUkVTSE9MRF9ERUdfUEVSX1MgPSAwO1xuXG4vLyBIb3cgZmFyIGludG8gdGhlIGZ1dHVyZSB0byBwcmVkaWN0LlxuV0VCVlJfUFJFRElDVElPTl9USU1FX01TID0gODA7XG5cbi8vIFdoZXRoZXIgdG8gcHJlZGljdCBvciB3aGF0LlxuV0VCVlJfUFJFRElDVElPTl9NT0RFID0gUHJlZGljdGlvbk1vZGUuUFJFRElDVDtcblxuZnVuY3Rpb24gUG9zZVByZWRpY3RvcigpIHtcbiAgdGhpcy5sYXN0USA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMubGFzdFRpbWVzdGFtcCA9IG51bGw7XG5cbiAgdGhpcy5vdXRRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgdGhpcy5kZWx0YVEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xufVxuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRQcmVkaWN0aW9uID0gZnVuY3Rpb24oY3VycmVudFEsIHJvdGF0aW9uUmF0ZSwgdGltZXN0YW1wKSB7XG4gIC8vIElmIHRoZXJlJ3Mgbm8gcHJldmlvdXMgcXVhdGVybmlvbiwgb3V0cHV0IHRoZSBjdXJyZW50IG9uZSBhbmQgc2F2ZSBmb3JcbiAgLy8gbGF0ZXIuXG4gIGlmICghdGhpcy5sYXN0VGltZXN0YW1wKSB7XG4gICAgdGhpcy5sYXN0US5jb3B5KGN1cnJlbnRRKTtcbiAgICB0aGlzLmxhc3RUaW1lc3RhbXAgPSB0aW1lc3RhbXA7XG4gICAgcmV0dXJuIGN1cnJlbnRRO1xuICB9XG5cbiAgLy8gREVCVUcgT05MWTogVHJ5IHdpdGggYSBmaXhlZCA2MCBIeiB1cGRhdGUgc3BlZWQuXG4gIC8vdmFyIGVsYXBzZWRNcyA9IDEwMDAvNjA7XG4gIHZhciBlbGFwc2VkTXMgPSB0aW1lc3RhbXAgLSB0aGlzLmxhc3RUaW1lc3RhbXA7XG5cbiAgc3dpdGNoIChXRUJWUl9QUkVESUNUSU9OX01PREUpIHtcbiAgICBjYXNlIFByZWRpY3Rpb25Nb2RlLklOVEVSUE9MQVRFOlxuICAgICAgdGhpcy5vdXRRLmNvcHkoY3VycmVudFEpO1xuICAgICAgdGhpcy5vdXRRLnNsZXJwKHRoaXMubGFzdFEsIElOVEVSUE9MQVRJT05fU01PT1RISU5HX0ZBQ1RPUik7XG5cbiAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgcXVhdGVybmlvbiBmb3IgbGF0ZXIuXG4gICAgICB0aGlzLmxhc3RRLmNvcHkoY3VycmVudFEpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBQcmVkaWN0aW9uTW9kZS5QUkVESUNUOlxuICAgICAgdmFyIGF4aXNBbmdsZTtcbiAgICAgIGlmIChyb3RhdGlvblJhdGUpIHtcbiAgICAgICAgYXhpc0FuZ2xlID0gdGhpcy5nZXRBeGlzQW5ndWxhclNwZWVkRnJvbVJvdGF0aW9uUmF0ZV8ocm90YXRpb25SYXRlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF4aXNBbmdsZSA9IHRoaXMuZ2V0QXhpc0FuZ3VsYXJTcGVlZEZyb21HeXJvRGVsdGFfKGN1cnJlbnRRLCBlbGFwc2VkTXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGVyZSBpcyBubyBwcmVkaWN0ZWQgYXhpcy9hbmdsZSwgZG9uJ3QgZG8gcHJlZGljdGlvbi5cbiAgICAgIGlmICghYXhpc0FuZ2xlKSB7XG4gICAgICAgIHRoaXMub3V0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgICAgdGhpcy5sYXN0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB2YXIgYW5ndWxhclNwZWVkRGVnUyA9IGF4aXNBbmdsZS5zcGVlZDtcbiAgICAgIHZhciBheGlzID0gYXhpc0FuZ2xlLmF4aXM7XG4gICAgICB2YXIgcHJlZGljdEFuZ2xlRGVnID0gKFdFQlZSX1BSRURJQ1RJT05fVElNRV9NUyAvIDEwMDApICogYW5ndWxhclNwZWVkRGVnUztcblxuICAgICAgLy8gSWYgd2UncmUgcm90YXRpbmcgc2xvd2x5LCBkb24ndCBkbyBwcmVkaWN0aW9uLlxuICAgICAgaWYgKGFuZ3VsYXJTcGVlZERlZ1MgPCBQUkVESUNUSU9OX1RIUkVTSE9MRF9ERUdfUEVSX1MpIHtcbiAgICAgICAgdGhpcy5vdXRRLmNvcHkoY3VycmVudFEpO1xuICAgICAgICB0aGlzLmxhc3RRLmNvcHkoY3VycmVudFEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBwcmVkaWN0aW9uIGRlbHRhIHRvIGFwcGx5IHRvIHRoZSBvcmlnaW5hbCBhbmdsZS5cbiAgICAgIHRoaXMuZGVsdGFRLnNldEZyb21BeGlzQW5nbGUoYXhpcywgVEhSRUUuTWF0aC5kZWdUb1JhZChwcmVkaWN0QW5nbGVEZWcpKTtcbiAgICAgIC8vIERFQlVHIE9OTFk6IEFzIGEgc2FuaXR5IGNoZWNrLCB1c2UgdGhlIHNhbWUgYXhpcyBhbmQgYW5nbGUgYXMgYmVmb3JlLFxuICAgICAgLy8gd2hpY2ggc2hvdWxkIGNhdXNlIG5vIHByZWRpY3Rpb24gdG8gaGFwcGVuLlxuICAgICAgLy90aGlzLmRlbHRhUS5zZXRGcm9tQXhpc0FuZ2xlKGF4aXMsIGFuZ2xlKTtcblxuICAgICAgdGhpcy5vdXRRLmNvcHkodGhpcy5sYXN0USk7XG4gICAgICB0aGlzLm91dFEubXVsdGlwbHkodGhpcy5kZWx0YVEpO1xuXG4gICAgICAvLyBVc2UgdGhlIHByZWRpY3RlZCBxdWF0ZXJuaW9uIGFzIHRoZSBuZXcgbGFzdCBvbmUuXG4gICAgICAvL3RoaXMubGFzdFEuY29weSh0aGlzLm91dFEpO1xuICAgICAgdGhpcy5sYXN0US5jb3B5KGN1cnJlbnRRKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgUHJlZGljdGlvbk1vZGUuTk9ORTpcbiAgICBkZWZhdWx0OlxuICAgICAgdGhpcy5vdXRRLmNvcHkoY3VycmVudFEpO1xuICB9XG4gIHRoaXMubGFzdFRpbWVzdGFtcCA9IHRpbWVzdGFtcDtcblxuICByZXR1cm4gdGhpcy5vdXRRO1xufTtcblxuUG9zZVByZWRpY3Rvci5wcm90b3R5cGUuc2V0U2NyZWVuT3JpZW50YXRpb24gPSBmdW5jdGlvbihzY3JlZW5PcmllbnRhdGlvbikge1xuICB0aGlzLnNjcmVlbk9yaWVudGF0aW9uID0gc2NyZWVuT3JpZW50YXRpb247XG59O1xuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRBeGlzXyA9IGZ1bmN0aW9uKHF1YXQpIHtcbiAgLy8geCA9IHF4IC8gc3FydCgxLXF3KnF3KVxuICAvLyB5ID0gcXkgLyBzcXJ0KDEtcXcqcXcpXG4gIC8vIHogPSBxeiAvIHNxcnQoMS1xdypxdylcbiAgdmFyIGQgPSBNYXRoLnNxcnQoMSAtIHF1YXQudyAqIHF1YXQudyk7XG4gIHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyhxdWF0LnggLyBkLCBxdWF0LnkgLyBkLCBxdWF0LnogLyBkKTtcbn07XG5cblBvc2VQcmVkaWN0b3IucHJvdG90eXBlLmdldEFuZ2xlXyA9IGZ1bmN0aW9uKHF1YXQpIHtcbiAgLy8gYW5nbGUgPSAyICogYWNvcyhxdylcbiAgLy8gSWYgdyBpcyBncmVhdGVyIHRoYW4gMSAoVEhSRUUuanMsIGhvdyBjYW4gdGhpcyBiZT8pLCBhcmNjb3MgaXMgbm90IGRlZmluZWQuXG4gIGlmIChxdWF0LncgPiAxKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbiAgdmFyIGFuZ2xlID0gMiAqIE1hdGguYWNvcyhxdWF0LncpO1xuICAvLyBOb3JtYWxpemUgdGhlIGFuZ2xlIHRvIGJlIGluIFstz4AsIM+AXS5cbiAgaWYgKGFuZ2xlID4gTWF0aC5QSSkge1xuICAgIGFuZ2xlIC09IDIgKiBNYXRoLlBJO1xuICB9XG4gIHJldHVybiBhbmdsZTtcbn07XG5cblBvc2VQcmVkaWN0b3IucHJvdG90eXBlLmdldEF4aXNBbmd1bGFyU3BlZWRGcm9tUm90YXRpb25SYXRlXyA9IGZ1bmN0aW9uKHJvdGF0aW9uUmF0ZSkge1xuICBpZiAoIXJvdGF0aW9uUmF0ZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZhciBzY3JlZW5Sb3RhdGlvblJhdGU7XG4gIGlmICgvaVBhZHxpUGhvbmV8aVBvZC8udGVzdChuYXZpZ2F0b3IucGxhdGZvcm0pKSB7XG4gICAgLy8gaU9TOiBhbmd1bGFyIHNwZWVkIGluIGRlZy9zLlxuICAgIHZhciBzY3JlZW5Sb3RhdGlvblJhdGUgPSB0aGlzLmdldFNjcmVlbkFkanVzdGVkUm90YXRpb25SYXRlSU9TXyhyb3RhdGlvblJhdGUpO1xuICB9IGVsc2Uge1xuICAgIC8vIEFuZHJvaWQ6IGFuZ3VsYXIgc3BlZWQgaW4gcmFkL3MsIHNvIG5lZWQgdG8gY29udmVydC5cbiAgICByb3RhdGlvblJhdGUuYWxwaGEgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKHJvdGF0aW9uUmF0ZS5hbHBoYSk7XG4gICAgcm90YXRpb25SYXRlLmJldGEgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKHJvdGF0aW9uUmF0ZS5iZXRhKTtcbiAgICByb3RhdGlvblJhdGUuZ2FtbWEgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKHJvdGF0aW9uUmF0ZS5nYW1tYSk7XG4gICAgdmFyIHNjcmVlblJvdGF0aW9uUmF0ZSA9IHRoaXMuZ2V0U2NyZWVuQWRqdXN0ZWRSb3RhdGlvblJhdGVfKHJvdGF0aW9uUmF0ZSk7XG4gIH1cbiAgdmFyIHZlYyA9IG5ldyBUSFJFRS5WZWN0b3IzKFxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmJldGEsIHNjcmVlblJvdGF0aW9uUmF0ZS5hbHBoYSwgc2NyZWVuUm90YXRpb25SYXRlLmdhbW1hKTtcblxuICAvKlxuICB2YXIgdmVjO1xuICBpZiAoL2lQYWR8aVBob25lfGlQb2QvLnRlc3QobmF2aWdhdG9yLnBsYXRmb3JtKSkge1xuICAgIHZlYyA9IG5ldyBUSFJFRS5WZWN0b3IzKHJvdGF0aW9uUmF0ZS5nYW1tYSwgcm90YXRpb25SYXRlLmFscGhhLCByb3RhdGlvblJhdGUuYmV0YSk7XG4gIH0gZWxzZSB7XG4gICAgdmVjID0gbmV3IFRIUkVFLlZlY3RvcjMocm90YXRpb25SYXRlLmJldGEsIHJvdGF0aW9uUmF0ZS5hbHBoYSwgcm90YXRpb25SYXRlLmdhbW1hKTtcbiAgfVxuICAvLyBUYWtlIGludG8gYWNjb3VudCB0aGUgc2NyZWVuIG9yaWVudGF0aW9uIHRvbyFcbiAgdmVjLmFwcGx5UXVhdGVybmlvbih0aGlzLnNjcmVlblRyYW5zZm9ybSk7XG4gICovXG5cbiAgLy8gQW5ndWxhciBzcGVlZCBpbiBkZWcvcy5cbiAgdmFyIGFuZ3VsYXJTcGVlZERlZ1MgPSB2ZWMubGVuZ3RoKCk7XG5cbiAgdmFyIGF4aXMgPSB2ZWMubm9ybWFsaXplKCk7XG4gIHJldHVybiB7XG4gICAgc3BlZWQ6IGFuZ3VsYXJTcGVlZERlZ1MsXG4gICAgYXhpczogYXhpc1xuICB9XG59O1xuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRTY3JlZW5BZGp1c3RlZFJvdGF0aW9uUmF0ZV8gPSBmdW5jdGlvbihyb3RhdGlvblJhdGUpIHtcbiAgdmFyIHNjcmVlblJvdGF0aW9uUmF0ZSA9IHtcbiAgICBhbHBoYTogLXJvdGF0aW9uUmF0ZS5hbHBoYSxcbiAgICBiZXRhOiByb3RhdGlvblJhdGUuYmV0YSxcbiAgICBnYW1tYTogcm90YXRpb25SYXRlLmdhbW1hXG4gIH07XG4gIHN3aXRjaCAodGhpcy5zY3JlZW5PcmllbnRhdGlvbikge1xuICAgIGNhc2UgOTA6XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuYmV0YSAgPSAtIHJvdGF0aW9uUmF0ZS5nYW1tYTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5nYW1tYSA9ICAgcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE4MDpcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhICA9IC0gcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAtIHJvdGF0aW9uUmF0ZS5nYW1tYTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjcwOlxuICAgIGNhc2UgLTkwOlxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmJldGEgID0gICByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAtIHJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDogLy8gU0NSRUVOX1JPVEFUSU9OXzBcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhICA9ICAgcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAgIHJvdGF0aW9uUmF0ZS5nYW1tYTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiBzY3JlZW5Sb3RhdGlvblJhdGU7XG59O1xuXG5Qb3NlUHJlZGljdG9yLnByb3RvdHlwZS5nZXRTY3JlZW5BZGp1c3RlZFJvdGF0aW9uUmF0ZUlPU18gPSBmdW5jdGlvbihyb3RhdGlvblJhdGUpIHtcbiAgdmFyIHNjcmVlblJvdGF0aW9uUmF0ZSA9IHtcbiAgICBhbHBoYTogcm90YXRpb25SYXRlLmFscGhhLFxuICAgIGJldGE6IHJvdGF0aW9uUmF0ZS5iZXRhLFxuICAgIGdhbW1hOiByb3RhdGlvblJhdGUuZ2FtbWFcbiAgfTtcbiAgLy8gVmFsdWVzIGVtcGlyaWNhbGx5IGRlcml2ZWQuXG4gIHN3aXRjaCAodGhpcy5zY3JlZW5PcmllbnRhdGlvbikge1xuICAgIGNhc2UgOTA6XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuYmV0YSAgPSAtcm90YXRpb25SYXRlLmJldGE7XG4gICAgICBzY3JlZW5Sb3RhdGlvblJhdGUuZ2FtbWEgPSAgcm90YXRpb25SYXRlLmdhbW1hO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAxODA6XG4gICAgICAvLyBZb3UgY2FuJ3QgZXZlbiBkbyB0aGlzIG9uIGlPUy5cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMjcwOlxuICAgIGNhc2UgLTkwOlxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmFscGhhID0gLXJvdGF0aW9uUmF0ZS5hbHBoYTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5iZXRhICA9ICByb3RhdGlvblJhdGUuYmV0YTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5nYW1tYSA9ICByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OiAvLyBTQ1JFRU5fUk9UQVRJT05fMFxuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmFscGhhID0gIHJvdGF0aW9uUmF0ZS5iZXRhO1xuICAgICAgc2NyZWVuUm90YXRpb25SYXRlLmJldGEgID0gIHJvdGF0aW9uUmF0ZS5hbHBoYTtcbiAgICAgIHNjcmVlblJvdGF0aW9uUmF0ZS5nYW1tYSA9ICByb3RhdGlvblJhdGUuZ2FtbWE7XG4gICAgICBicmVhaztcbiAgfVxuICByZXR1cm4gc2NyZWVuUm90YXRpb25SYXRlO1xufTtcblxuUG9zZVByZWRpY3Rvci5wcm90b3R5cGUuZ2V0QXhpc0FuZ3VsYXJTcGVlZEZyb21HeXJvRGVsdGFfID0gZnVuY3Rpb24oY3VycmVudFEsIGVsYXBzZWRNcykge1xuICAvLyBTb21ldGltZXMgd2UgdXNlIHRoZSBzYW1lIHNlbnNvciB0aW1lc3RhbXAsIGluIHdoaWNoIGNhc2UgcHJlZGljdGlvblxuICAvLyB3b24ndCB3b3JrLlxuICBpZiAoZWxhcHNlZE1zID09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyBRX2RlbHRhID0gUV9sYXN0Xi0xICogUV9jdXJyXG4gIHRoaXMuZGVsdGFRLmNvcHkodGhpcy5sYXN0USk7XG4gIHRoaXMuZGVsdGFRLmludmVyc2UoKTtcbiAgdGhpcy5kZWx0YVEubXVsdGlwbHkoY3VycmVudFEpO1xuXG4gIC8vIENvbnZlcnQgZnJvbSBkZWx0YSBxdWF0ZXJuaW9uIHRvIGF4aXMtYW5nbGUuXG4gIHZhciBheGlzID0gdGhpcy5nZXRBeGlzXyh0aGlzLmRlbHRhUSk7XG4gIHZhciBhbmdsZVJhZCA9IHRoaXMuZ2V0QW5nbGVfKHRoaXMuZGVsdGFRKTtcbiAgLy8gSXQgdG9vayBgZWxhcHNlZGAgbXMgdG8gdHJhdmVsIHRoZSBhbmdsZSBhbW91bnQgb3ZlciB0aGUgYXhpcy4gTm93LFxuICAvLyB3ZSBtYWtlIGEgbmV3IHF1YXRlcm5pb24gYmFzZWQgaG93IGZhciBpbiB0aGUgZnV0dXJlIHdlIHdhbnQgdG9cbiAgLy8gY2FsY3VsYXRlLlxuICB2YXIgYW5ndWxhclNwZWVkUmFkTXMgPSBhbmdsZVJhZCAvIGVsYXBzZWRNcztcbiAgdmFyIGFuZ3VsYXJTcGVlZERlZ1MgPSBUSFJFRS5NYXRoLnJhZFRvRGVnKGFuZ3VsYXJTcGVlZFJhZE1zKSAqIDEwMDA7XG4gIC8vIElmIG5vIHJvdGF0aW9uIHJhdGUgaXMgcHJvdmlkZWQsIGRvIG5vIHByZWRpY3Rpb24uXG4gIHJldHVybiB7XG4gICAgc3BlZWQ6IGFuZ3VsYXJTcGVlZERlZ1MsXG4gICAgYXhpczogYXhpc1xuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQb3NlUHJlZGljdG9yO1xuIiwiLypcbiAqIEEgc3Vic2V0IG9mIFRIUkVFLmpzLCBwcm92aWRpbmcgbW9zdGx5IHF1YXRlcm5pb24gYW5kIGV1bGVyLXJlbGF0ZWRcbiAqIG9wZXJhdGlvbnMsIG1hbnVhbGx5IGxpZnRlZCBmcm9tXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbXJkb29iL3RocmVlLmpzL3RyZWUvbWFzdGVyL3NyYy9tYXRoLCBhcyBvZiA5YzMwMjg2YjM4ZGYwMzlmY2EzODk5ODlmZjA2ZWExYzE1ZDZiYWQxXG4gKi9cblxuLy8gT25seSB1c2UgaWYgdGhlIHJlYWwgVEhSRUUgaXMgbm90IHByb3ZpZGVkLlxudmFyIFRIUkVFID0gd2luZG93LlRIUkVFIHx8IHt9O1xuXG4vLyBJZiBzb21lIHBpZWNlIG9mIFRIUkVFIGlzIG1pc3NpbmcsIGZpbGwgaXQgaW4gaGVyZS5cbmlmICghVEhSRUUuUXVhdGVybmlvbiB8fCAhVEhSRUUuVmVjdG9yMyB8fCAhVEhSRUUuVmVjdG9yMiB8fCAhVEhSRUUuRXVsZXIgfHwgIVRIUkVFLk1hdGgpIHtcbmNvbnNvbGUubG9nKCdObyBUSFJFRS5qcyBmb3VuZC4nKTtcblxuXG4vKioqIFNUQVJUIFF1YXRlcm5pb24gKioqL1xuXG4vKipcbiAqIEBhdXRob3IgbWlrYWVsIGVtdGluZ2VyIC8gaHR0cDovL2dvbW8uc2UvXG4gKiBAYXV0aG9yIGFsdGVyZWRxIC8gaHR0cDovL2FsdGVyZWRxdWFsaWEuY29tL1xuICogQGF1dGhvciBXZXN0TGFuZ2xleSAvIGh0dHA6Ly9naXRodWIuY29tL1dlc3RMYW5nbGV5XG4gKiBAYXV0aG9yIGJob3VzdG9uIC8gaHR0cDovL2V4b2NvcnRleC5jb21cbiAqL1xuXG5USFJFRS5RdWF0ZXJuaW9uID0gZnVuY3Rpb24gKCB4LCB5LCB6LCB3ICkge1xuXG5cdHRoaXMuX3ggPSB4IHx8IDA7XG5cdHRoaXMuX3kgPSB5IHx8IDA7XG5cdHRoaXMuX3ogPSB6IHx8IDA7XG5cdHRoaXMuX3cgPSAoIHcgIT09IHVuZGVmaW5lZCApID8gdyA6IDE7XG5cbn07XG5cblRIUkVFLlF1YXRlcm5pb24ucHJvdG90eXBlID0ge1xuXG5cdGNvbnN0cnVjdG9yOiBUSFJFRS5RdWF0ZXJuaW9uLFxuXG5cdF94OiAwLF95OiAwLCBfejogMCwgX3c6IDAsXG5cblx0Z2V0IHggKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX3g7XG5cblx0fSxcblxuXHRzZXQgeCAoIHZhbHVlICkge1xuXG5cdFx0dGhpcy5feCA9IHZhbHVlO1xuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdH0sXG5cblx0Z2V0IHkgKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX3k7XG5cblx0fSxcblxuXHRzZXQgeSAoIHZhbHVlICkge1xuXG5cdFx0dGhpcy5feSA9IHZhbHVlO1xuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdH0sXG5cblx0Z2V0IHogKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX3o7XG5cblx0fSxcblxuXHRzZXQgeiAoIHZhbHVlICkge1xuXG5cdFx0dGhpcy5feiA9IHZhbHVlO1xuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdH0sXG5cblx0Z2V0IHcgKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX3c7XG5cblx0fSxcblxuXHRzZXQgdyAoIHZhbHVlICkge1xuXG5cdFx0dGhpcy5fdyA9IHZhbHVlO1xuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAoIHgsIHksIHosIHcgKSB7XG5cblx0XHR0aGlzLl94ID0geDtcblx0XHR0aGlzLl95ID0geTtcblx0XHR0aGlzLl96ID0gejtcblx0XHR0aGlzLl93ID0gdztcblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjb3B5OiBmdW5jdGlvbiAoIHF1YXRlcm5pb24gKSB7XG5cblx0XHR0aGlzLl94ID0gcXVhdGVybmlvbi54O1xuXHRcdHRoaXMuX3kgPSBxdWF0ZXJuaW9uLnk7XG5cdFx0dGhpcy5feiA9IHF1YXRlcm5pb24uejtcblx0XHR0aGlzLl93ID0gcXVhdGVybmlvbi53O1xuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldEZyb21FdWxlcjogZnVuY3Rpb24gKCBldWxlciwgdXBkYXRlICkge1xuXG5cdFx0aWYgKCBldWxlciBpbnN0YW5jZW9mIFRIUkVFLkV1bGVyID09PSBmYWxzZSApIHtcblxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCAnVEhSRUUuUXVhdGVybmlvbjogLnNldEZyb21FdWxlcigpIG5vdyBleHBlY3RzIGEgRXVsZXIgcm90YXRpb24gcmF0aGVyIHRoYW4gYSBWZWN0b3IzIGFuZCBvcmRlci4nICk7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cDovL3d3dy5tYXRod29ya3MuY29tL21hdGxhYmNlbnRyYWwvZmlsZWV4Y2hhbmdlL1xuXHRcdC8vIFx0MjA2OTYtZnVuY3Rpb24tdG8tY29udmVydC1iZXR3ZWVuLWRjbS1ldWxlci1hbmdsZXMtcXVhdGVybmlvbnMtYW5kLWV1bGVyLXZlY3RvcnMvXG5cdFx0Ly9cdGNvbnRlbnQvU3BpbkNhbGMubVxuXG5cdFx0dmFyIGMxID0gTWF0aC5jb3MoIGV1bGVyLl94IC8gMiApO1xuXHRcdHZhciBjMiA9IE1hdGguY29zKCBldWxlci5feSAvIDIgKTtcblx0XHR2YXIgYzMgPSBNYXRoLmNvcyggZXVsZXIuX3ogLyAyICk7XG5cdFx0dmFyIHMxID0gTWF0aC5zaW4oIGV1bGVyLl94IC8gMiApO1xuXHRcdHZhciBzMiA9IE1hdGguc2luKCBldWxlci5feSAvIDIgKTtcblx0XHR2YXIgczMgPSBNYXRoLnNpbiggZXVsZXIuX3ogLyAyICk7XG5cblx0XHRpZiAoIGV1bGVyLm9yZGVyID09PSAnWFlaJyApIHtcblxuXHRcdFx0dGhpcy5feCA9IHMxICogYzIgKiBjMyArIGMxICogczIgKiBzMztcblx0XHRcdHRoaXMuX3kgPSBjMSAqIHMyICogYzMgLSBzMSAqIGMyICogczM7XG5cdFx0XHR0aGlzLl96ID0gYzEgKiBjMiAqIHMzICsgczEgKiBzMiAqIGMzO1xuXHRcdFx0dGhpcy5fdyA9IGMxICogYzIgKiBjMyAtIHMxICogczIgKiBzMztcblxuXHRcdH0gZWxzZSBpZiAoIGV1bGVyLm9yZGVyID09PSAnWVhaJyApIHtcblxuXHRcdFx0dGhpcy5feCA9IHMxICogYzIgKiBjMyArIGMxICogczIgKiBzMztcblx0XHRcdHRoaXMuX3kgPSBjMSAqIHMyICogYzMgLSBzMSAqIGMyICogczM7XG5cdFx0XHR0aGlzLl96ID0gYzEgKiBjMiAqIHMzIC0gczEgKiBzMiAqIGMzO1xuXHRcdFx0dGhpcy5fdyA9IGMxICogYzIgKiBjMyArIHMxICogczIgKiBzMztcblxuXHRcdH0gZWxzZSBpZiAoIGV1bGVyLm9yZGVyID09PSAnWlhZJyApIHtcblxuXHRcdFx0dGhpcy5feCA9IHMxICogYzIgKiBjMyAtIGMxICogczIgKiBzMztcblx0XHRcdHRoaXMuX3kgPSBjMSAqIHMyICogYzMgKyBzMSAqIGMyICogczM7XG5cdFx0XHR0aGlzLl96ID0gYzEgKiBjMiAqIHMzICsgczEgKiBzMiAqIGMzO1xuXHRcdFx0dGhpcy5fdyA9IGMxICogYzIgKiBjMyAtIHMxICogczIgKiBzMztcblxuXHRcdH0gZWxzZSBpZiAoIGV1bGVyLm9yZGVyID09PSAnWllYJyApIHtcblxuXHRcdFx0dGhpcy5feCA9IHMxICogYzIgKiBjMyAtIGMxICogczIgKiBzMztcblx0XHRcdHRoaXMuX3kgPSBjMSAqIHMyICogYzMgKyBzMSAqIGMyICogczM7XG5cdFx0XHR0aGlzLl96ID0gYzEgKiBjMiAqIHMzIC0gczEgKiBzMiAqIGMzO1xuXHRcdFx0dGhpcy5fdyA9IGMxICogYzIgKiBjMyArIHMxICogczIgKiBzMztcblxuXHRcdH0gZWxzZSBpZiAoIGV1bGVyLm9yZGVyID09PSAnWVpYJyApIHtcblxuXHRcdFx0dGhpcy5feCA9IHMxICogYzIgKiBjMyArIGMxICogczIgKiBzMztcblx0XHRcdHRoaXMuX3kgPSBjMSAqIHMyICogYzMgKyBzMSAqIGMyICogczM7XG5cdFx0XHR0aGlzLl96ID0gYzEgKiBjMiAqIHMzIC0gczEgKiBzMiAqIGMzO1xuXHRcdFx0dGhpcy5fdyA9IGMxICogYzIgKiBjMyAtIHMxICogczIgKiBzMztcblxuXHRcdH0gZWxzZSBpZiAoIGV1bGVyLm9yZGVyID09PSAnWFpZJyApIHtcblxuXHRcdFx0dGhpcy5feCA9IHMxICogYzIgKiBjMyAtIGMxICogczIgKiBzMztcblx0XHRcdHRoaXMuX3kgPSBjMSAqIHMyICogYzMgLSBzMSAqIGMyICogczM7XG5cdFx0XHR0aGlzLl96ID0gYzEgKiBjMiAqIHMzICsgczEgKiBzMiAqIGMzO1xuXHRcdFx0dGhpcy5fdyA9IGMxICogYzIgKiBjMyArIHMxICogczIgKiBzMztcblxuXHRcdH1cblxuXHRcdGlmICggdXBkYXRlICE9PSBmYWxzZSApIHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzZXRGcm9tQXhpc0FuZ2xlOiBmdW5jdGlvbiAoIGF4aXMsIGFuZ2xlICkge1xuXG5cdFx0Ly8gaHR0cDovL3d3dy5ldWNsaWRlYW5zcGFjZS5jb20vbWF0aHMvZ2VvbWV0cnkvcm90YXRpb25zL2NvbnZlcnNpb25zL2FuZ2xlVG9RdWF0ZXJuaW9uL2luZGV4Lmh0bVxuXG5cdFx0Ly8gYXNzdW1lcyBheGlzIGlzIG5vcm1hbGl6ZWRcblxuXHRcdHZhciBoYWxmQW5nbGUgPSBhbmdsZSAvIDIsIHMgPSBNYXRoLnNpbiggaGFsZkFuZ2xlICk7XG5cblx0XHR0aGlzLl94ID0gYXhpcy54ICogcztcblx0XHR0aGlzLl95ID0gYXhpcy55ICogcztcblx0XHR0aGlzLl96ID0gYXhpcy56ICogcztcblx0XHR0aGlzLl93ID0gTWF0aC5jb3MoIGhhbGZBbmdsZSApO1xuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHNldEZyb21Sb3RhdGlvbk1hdHJpeDogZnVuY3Rpb24gKCBtICkge1xuXG5cdFx0Ly8gaHR0cDovL3d3dy5ldWNsaWRlYW5zcGFjZS5jb20vbWF0aHMvZ2VvbWV0cnkvcm90YXRpb25zL2NvbnZlcnNpb25zL21hdHJpeFRvUXVhdGVybmlvbi9pbmRleC5odG1cblxuXHRcdC8vIGFzc3VtZXMgdGhlIHVwcGVyIDN4MyBvZiBtIGlzIGEgcHVyZSByb3RhdGlvbiBtYXRyaXggKGkuZSwgdW5zY2FsZWQpXG5cblx0XHR2YXIgdGUgPSBtLmVsZW1lbnRzLFxuXG5cdFx0XHRtMTEgPSB0ZVsgMCBdLCBtMTIgPSB0ZVsgNCBdLCBtMTMgPSB0ZVsgOCBdLFxuXHRcdFx0bTIxID0gdGVbIDEgXSwgbTIyID0gdGVbIDUgXSwgbTIzID0gdGVbIDkgXSxcblx0XHRcdG0zMSA9IHRlWyAyIF0sIG0zMiA9IHRlWyA2IF0sIG0zMyA9IHRlWyAxMCBdLFxuXG5cdFx0XHR0cmFjZSA9IG0xMSArIG0yMiArIG0zMyxcblx0XHRcdHM7XG5cblx0XHRpZiAoIHRyYWNlID4gMCApIHtcblxuXHRcdFx0cyA9IDAuNSAvIE1hdGguc3FydCggdHJhY2UgKyAxLjAgKTtcblxuXHRcdFx0dGhpcy5fdyA9IDAuMjUgLyBzO1xuXHRcdFx0dGhpcy5feCA9ICggbTMyIC0gbTIzICkgKiBzO1xuXHRcdFx0dGhpcy5feSA9ICggbTEzIC0gbTMxICkgKiBzO1xuXHRcdFx0dGhpcy5feiA9ICggbTIxIC0gbTEyICkgKiBzO1xuXG5cdFx0fSBlbHNlIGlmICggbTExID4gbTIyICYmIG0xMSA+IG0zMyApIHtcblxuXHRcdFx0cyA9IDIuMCAqIE1hdGguc3FydCggMS4wICsgbTExIC0gbTIyIC0gbTMzICk7XG5cblx0XHRcdHRoaXMuX3cgPSAoIG0zMiAtIG0yMyApIC8gcztcblx0XHRcdHRoaXMuX3ggPSAwLjI1ICogcztcblx0XHRcdHRoaXMuX3kgPSAoIG0xMiArIG0yMSApIC8gcztcblx0XHRcdHRoaXMuX3ogPSAoIG0xMyArIG0zMSApIC8gcztcblxuXHRcdH0gZWxzZSBpZiAoIG0yMiA+IG0zMyApIHtcblxuXHRcdFx0cyA9IDIuMCAqIE1hdGguc3FydCggMS4wICsgbTIyIC0gbTExIC0gbTMzICk7XG5cblx0XHRcdHRoaXMuX3cgPSAoIG0xMyAtIG0zMSApIC8gcztcblx0XHRcdHRoaXMuX3ggPSAoIG0xMiArIG0yMSApIC8gcztcblx0XHRcdHRoaXMuX3kgPSAwLjI1ICogcztcblx0XHRcdHRoaXMuX3ogPSAoIG0yMyArIG0zMiApIC8gcztcblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdHMgPSAyLjAgKiBNYXRoLnNxcnQoIDEuMCArIG0zMyAtIG0xMSAtIG0yMiApO1xuXG5cdFx0XHR0aGlzLl93ID0gKCBtMjEgLSBtMTIgKSAvIHM7XG5cdFx0XHR0aGlzLl94ID0gKCBtMTMgKyBtMzEgKSAvIHM7XG5cdFx0XHR0aGlzLl95ID0gKCBtMjMgKyBtMzIgKSAvIHM7XG5cdFx0XHR0aGlzLl96ID0gMC4yNSAqIHM7XG5cblx0XHR9XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0RnJvbVVuaXRWZWN0b3JzOiBmdW5jdGlvbiAoKSB7XG5cblx0XHQvLyBodHRwOi8vbG9sZW5naW5lLm5ldC9ibG9nLzIwMTQvMDIvMjQvcXVhdGVybmlvbi1mcm9tLXR3by12ZWN0b3JzLWZpbmFsXG5cblx0XHQvLyBhc3N1bWVzIGRpcmVjdGlvbiB2ZWN0b3JzIHZGcm9tIGFuZCB2VG8gYXJlIG5vcm1hbGl6ZWRcblxuXHRcdHZhciB2MSwgcjtcblxuXHRcdHZhciBFUFMgPSAwLjAwMDAwMTtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIHZGcm9tLCB2VG8gKSB7XG5cblx0XHRcdGlmICggdjEgPT09IHVuZGVmaW5lZCApIHYxID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuXHRcdFx0ciA9IHZGcm9tLmRvdCggdlRvICkgKyAxO1xuXG5cdFx0XHRpZiAoIHIgPCBFUFMgKSB7XG5cblx0XHRcdFx0ciA9IDA7XG5cblx0XHRcdFx0aWYgKCBNYXRoLmFicyggdkZyb20ueCApID4gTWF0aC5hYnMoIHZGcm9tLnogKSApIHtcblxuXHRcdFx0XHRcdHYxLnNldCggLSB2RnJvbS55LCB2RnJvbS54LCAwICk7XG5cblx0XHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRcdHYxLnNldCggMCwgLSB2RnJvbS56LCB2RnJvbS55ICk7XG5cblx0XHRcdFx0fVxuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdHYxLmNyb3NzVmVjdG9ycyggdkZyb20sIHZUbyApO1xuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX3ggPSB2MS54O1xuXHRcdFx0dGhpcy5feSA9IHYxLnk7XG5cdFx0XHR0aGlzLl96ID0gdjEuejtcblx0XHRcdHRoaXMuX3cgPSByO1xuXG5cdFx0XHR0aGlzLm5vcm1hbGl6ZSgpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblxuXHRcdH1cblxuXHR9KCksXG5cblx0aW52ZXJzZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy5jb25qdWdhdGUoKS5ub3JtYWxpemUoKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0Y29uanVnYXRlOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR0aGlzLl94ICo9IC0gMTtcblx0XHR0aGlzLl95ICo9IC0gMTtcblx0XHR0aGlzLl96ICo9IC0gMTtcblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRkb3Q6IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdHJldHVybiB0aGlzLl94ICogdi5feCArIHRoaXMuX3kgKiB2Ll95ICsgdGhpcy5feiAqIHYuX3ogKyB0aGlzLl93ICogdi5fdztcblxuXHR9LFxuXG5cdGxlbmd0aFNxOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gdGhpcy5feCAqIHRoaXMuX3ggKyB0aGlzLl95ICogdGhpcy5feSArIHRoaXMuX3ogKiB0aGlzLl96ICsgdGhpcy5fdyAqIHRoaXMuX3c7XG5cblx0fSxcblxuXHRsZW5ndGg6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBNYXRoLnNxcnQoIHRoaXMuX3ggKiB0aGlzLl94ICsgdGhpcy5feSAqIHRoaXMuX3kgKyB0aGlzLl96ICogdGhpcy5feiArIHRoaXMuX3cgKiB0aGlzLl93ICk7XG5cblx0fSxcblxuXHRub3JtYWxpemU6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBsID0gdGhpcy5sZW5ndGgoKTtcblxuXHRcdGlmICggbCA9PT0gMCApIHtcblxuXHRcdFx0dGhpcy5feCA9IDA7XG5cdFx0XHR0aGlzLl95ID0gMDtcblx0XHRcdHRoaXMuX3ogPSAwO1xuXHRcdFx0dGhpcy5fdyA9IDE7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRsID0gMSAvIGw7XG5cblx0XHRcdHRoaXMuX3ggPSB0aGlzLl94ICogbDtcblx0XHRcdHRoaXMuX3kgPSB0aGlzLl95ICogbDtcblx0XHRcdHRoaXMuX3ogPSB0aGlzLl96ICogbDtcblx0XHRcdHRoaXMuX3cgPSB0aGlzLl93ICogbDtcblxuXHRcdH1cblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtdWx0aXBseTogZnVuY3Rpb24gKCBxLCBwICkge1xuXG5cdFx0aWYgKCBwICE9PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdGNvbnNvbGUud2FybiggJ1RIUkVFLlF1YXRlcm5pb246IC5tdWx0aXBseSgpIG5vdyBvbmx5IGFjY2VwdHMgb25lIGFyZ3VtZW50LiBVc2UgLm11bHRpcGx5UXVhdGVybmlvbnMoIGEsIGIgKSBpbnN0ZWFkLicgKTtcblx0XHRcdHJldHVybiB0aGlzLm11bHRpcGx5UXVhdGVybmlvbnMoIHEsIHAgKTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLm11bHRpcGx5UXVhdGVybmlvbnMoIHRoaXMsIHEgKTtcblxuXHR9LFxuXG5cdG11bHRpcGx5UXVhdGVybmlvbnM6IGZ1bmN0aW9uICggYSwgYiApIHtcblxuXHRcdC8vIGZyb20gaHR0cDovL3d3dy5ldWNsaWRlYW5zcGFjZS5jb20vbWF0aHMvYWxnZWJyYS9yZWFsTm9ybWVkQWxnZWJyYS9xdWF0ZXJuaW9ucy9jb2RlL2luZGV4Lmh0bVxuXG5cdFx0dmFyIHFheCA9IGEuX3gsIHFheSA9IGEuX3ksIHFheiA9IGEuX3osIHFhdyA9IGEuX3c7XG5cdFx0dmFyIHFieCA9IGIuX3gsIHFieSA9IGIuX3ksIHFieiA9IGIuX3osIHFidyA9IGIuX3c7XG5cblx0XHR0aGlzLl94ID0gcWF4ICogcWJ3ICsgcWF3ICogcWJ4ICsgcWF5ICogcWJ6IC0gcWF6ICogcWJ5O1xuXHRcdHRoaXMuX3kgPSBxYXkgKiBxYncgKyBxYXcgKiBxYnkgKyBxYXogKiBxYnggLSBxYXggKiBxYno7XG5cdFx0dGhpcy5feiA9IHFheiAqIHFidyArIHFhdyAqIHFieiArIHFheCAqIHFieSAtIHFheSAqIHFieDtcblx0XHR0aGlzLl93ID0gcWF3ICogcWJ3IC0gcWF4ICogcWJ4IC0gcWF5ICogcWJ5IC0gcWF6ICogcWJ6O1xuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdG11bHRpcGx5VmVjdG9yMzogZnVuY3Rpb24gKCB2ZWN0b3IgKSB7XG5cblx0XHRjb25zb2xlLndhcm4oICdUSFJFRS5RdWF0ZXJuaW9uOiAubXVsdGlwbHlWZWN0b3IzKCkgaGFzIGJlZW4gcmVtb3ZlZC4gVXNlIGlzIG5vdyB2ZWN0b3IuYXBwbHlRdWF0ZXJuaW9uKCBxdWF0ZXJuaW9uICkgaW5zdGVhZC4nICk7XG5cdFx0cmV0dXJuIHZlY3Rvci5hcHBseVF1YXRlcm5pb24oIHRoaXMgKTtcblxuXHR9LFxuXG5cdHNsZXJwOiBmdW5jdGlvbiAoIHFiLCB0ICkge1xuXG5cdFx0aWYgKCB0ID09PSAwICkgcmV0dXJuIHRoaXM7XG5cdFx0aWYgKCB0ID09PSAxICkgcmV0dXJuIHRoaXMuY29weSggcWIgKTtcblxuXHRcdHZhciB4ID0gdGhpcy5feCwgeSA9IHRoaXMuX3ksIHogPSB0aGlzLl96LCB3ID0gdGhpcy5fdztcblxuXHRcdC8vIGh0dHA6Ly93d3cuZXVjbGlkZWFuc3BhY2UuY29tL21hdGhzL2FsZ2VicmEvcmVhbE5vcm1lZEFsZ2VicmEvcXVhdGVybmlvbnMvc2xlcnAvXG5cblx0XHR2YXIgY29zSGFsZlRoZXRhID0gdyAqIHFiLl93ICsgeCAqIHFiLl94ICsgeSAqIHFiLl95ICsgeiAqIHFiLl96O1xuXG5cdFx0aWYgKCBjb3NIYWxmVGhldGEgPCAwICkge1xuXG5cdFx0XHR0aGlzLl93ID0gLSBxYi5fdztcblx0XHRcdHRoaXMuX3ggPSAtIHFiLl94O1xuXHRcdFx0dGhpcy5feSA9IC0gcWIuX3k7XG5cdFx0XHR0aGlzLl96ID0gLSBxYi5fejtcblxuXHRcdFx0Y29zSGFsZlRoZXRhID0gLSBjb3NIYWxmVGhldGE7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHR0aGlzLmNvcHkoIHFiICk7XG5cblx0XHR9XG5cblx0XHRpZiAoIGNvc0hhbGZUaGV0YSA+PSAxLjAgKSB7XG5cblx0XHRcdHRoaXMuX3cgPSB3O1xuXHRcdFx0dGhpcy5feCA9IHg7XG5cdFx0XHR0aGlzLl95ID0geTtcblx0XHRcdHRoaXMuX3ogPSB6O1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblxuXHRcdH1cblxuXHRcdHZhciBoYWxmVGhldGEgPSBNYXRoLmFjb3MoIGNvc0hhbGZUaGV0YSApO1xuXHRcdHZhciBzaW5IYWxmVGhldGEgPSBNYXRoLnNxcnQoIDEuMCAtIGNvc0hhbGZUaGV0YSAqIGNvc0hhbGZUaGV0YSApO1xuXG5cdFx0aWYgKCBNYXRoLmFicyggc2luSGFsZlRoZXRhICkgPCAwLjAwMSApIHtcblxuXHRcdFx0dGhpcy5fdyA9IDAuNSAqICggdyArIHRoaXMuX3cgKTtcblx0XHRcdHRoaXMuX3ggPSAwLjUgKiAoIHggKyB0aGlzLl94ICk7XG5cdFx0XHR0aGlzLl95ID0gMC41ICogKCB5ICsgdGhpcy5feSApO1xuXHRcdFx0dGhpcy5feiA9IDAuNSAqICggeiArIHRoaXMuX3ogKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHR9XG5cblx0XHR2YXIgcmF0aW9BID0gTWF0aC5zaW4oICggMSAtIHQgKSAqIGhhbGZUaGV0YSApIC8gc2luSGFsZlRoZXRhLFxuXHRcdHJhdGlvQiA9IE1hdGguc2luKCB0ICogaGFsZlRoZXRhICkgLyBzaW5IYWxmVGhldGE7XG5cblx0XHR0aGlzLl93ID0gKCB3ICogcmF0aW9BICsgdGhpcy5fdyAqIHJhdGlvQiApO1xuXHRcdHRoaXMuX3ggPSAoIHggKiByYXRpb0EgKyB0aGlzLl94ICogcmF0aW9CICk7XG5cdFx0dGhpcy5feSA9ICggeSAqIHJhdGlvQSArIHRoaXMuX3kgKiByYXRpb0IgKTtcblx0XHR0aGlzLl96ID0gKCB6ICogcmF0aW9BICsgdGhpcy5feiAqIHJhdGlvQiApO1xuXG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGVxdWFsczogZnVuY3Rpb24gKCBxdWF0ZXJuaW9uICkge1xuXG5cdFx0cmV0dXJuICggcXVhdGVybmlvbi5feCA9PT0gdGhpcy5feCApICYmICggcXVhdGVybmlvbi5feSA9PT0gdGhpcy5feSApICYmICggcXVhdGVybmlvbi5feiA9PT0gdGhpcy5feiApICYmICggcXVhdGVybmlvbi5fdyA9PT0gdGhpcy5fdyApO1xuXG5cdH0sXG5cblx0ZnJvbUFycmF5OiBmdW5jdGlvbiAoIGFycmF5LCBvZmZzZXQgKSB7XG5cblx0XHRpZiAoIG9mZnNldCA9PT0gdW5kZWZpbmVkICkgb2Zmc2V0ID0gMDtcblxuXHRcdHRoaXMuX3ggPSBhcnJheVsgb2Zmc2V0IF07XG5cdFx0dGhpcy5feSA9IGFycmF5WyBvZmZzZXQgKyAxIF07XG5cdFx0dGhpcy5feiA9IGFycmF5WyBvZmZzZXQgKyAyIF07XG5cdFx0dGhpcy5fdyA9IGFycmF5WyBvZmZzZXQgKyAzIF07XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0dG9BcnJheTogZnVuY3Rpb24gKCBhcnJheSwgb2Zmc2V0ICkge1xuXG5cdFx0aWYgKCBhcnJheSA9PT0gdW5kZWZpbmVkICkgYXJyYXkgPSBbXTtcblx0XHRpZiAoIG9mZnNldCA9PT0gdW5kZWZpbmVkICkgb2Zmc2V0ID0gMDtcblxuXHRcdGFycmF5WyBvZmZzZXQgXSA9IHRoaXMuX3g7XG5cdFx0YXJyYXlbIG9mZnNldCArIDEgXSA9IHRoaXMuX3k7XG5cdFx0YXJyYXlbIG9mZnNldCArIDIgXSA9IHRoaXMuX3o7XG5cdFx0YXJyYXlbIG9mZnNldCArIDMgXSA9IHRoaXMuX3c7XG5cblx0XHRyZXR1cm4gYXJyYXk7XG5cblx0fSxcblxuXHRvbkNoYW5nZTogZnVuY3Rpb24gKCBjYWxsYmFjayApIHtcblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjayA9IGNhbGxiYWNrO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRvbkNoYW5nZUNhbGxiYWNrOiBmdW5jdGlvbiAoKSB7fSxcblxuXHRjbG9uZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCB0aGlzLl94LCB0aGlzLl95LCB0aGlzLl96LCB0aGlzLl93ICk7XG5cblx0fVxuXG59O1xuXG5USFJFRS5RdWF0ZXJuaW9uLnNsZXJwID0gZnVuY3Rpb24gKCBxYSwgcWIsIHFtLCB0ICkge1xuXG5cdHJldHVybiBxbS5jb3B5KCBxYSApLnNsZXJwKCBxYiwgdCApO1xuXG59XG5cbi8qKiogRU5EIFF1YXRlcm5pb24gKioqL1xuLyoqKiBTVEFSVCBWZWN0b3IyICoqKi9cbi8qKlxuICogQGF1dGhvciBtcmRvb2IgLyBodHRwOi8vbXJkb29iLmNvbS9cbiAqIEBhdXRob3IgcGhpbG9nYiAvIGh0dHA6Ly9ibG9nLnRoZWppdC5vcmcvXG4gKiBAYXV0aG9yIGVncmFldGhlciAvIGh0dHA6Ly9lZ3JhZXRoZXIuY29tL1xuICogQGF1dGhvciB6ejg1IC8gaHR0cDovL3d3dy5sYWI0Z2FtZXMubmV0L3p6ODUvYmxvZ1xuICovXG5cblRIUkVFLlZlY3RvcjIgPSBmdW5jdGlvbiAoIHgsIHkgKSB7XG5cblx0dGhpcy54ID0geCB8fCAwO1xuXHR0aGlzLnkgPSB5IHx8IDA7XG5cbn07XG5cblRIUkVFLlZlY3RvcjIucHJvdG90eXBlID0ge1xuXG5cdGNvbnN0cnVjdG9yOiBUSFJFRS5WZWN0b3IyLFxuXG5cdHNldDogZnVuY3Rpb24gKCB4LCB5ICkge1xuXG5cdFx0dGhpcy54ID0geDtcblx0XHR0aGlzLnkgPSB5O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzZXRYOiBmdW5jdGlvbiAoIHggKSB7XG5cblx0XHR0aGlzLnggPSB4O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzZXRZOiBmdW5jdGlvbiAoIHkgKSB7XG5cblx0XHR0aGlzLnkgPSB5O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzZXRDb21wb25lbnQ6IGZ1bmN0aW9uICggaW5kZXgsIHZhbHVlICkge1xuXG5cdFx0c3dpdGNoICggaW5kZXggKSB7XG5cblx0XHRcdGNhc2UgMDogdGhpcy54ID0gdmFsdWU7IGJyZWFrO1xuXHRcdFx0Y2FzZSAxOiB0aGlzLnkgPSB2YWx1ZTsgYnJlYWs7XG5cdFx0XHRkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoICdpbmRleCBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBpbmRleCApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Z2V0Q29tcG9uZW50OiBmdW5jdGlvbiAoIGluZGV4ICkge1xuXG5cdFx0c3dpdGNoICggaW5kZXggKSB7XG5cblx0XHRcdGNhc2UgMDogcmV0dXJuIHRoaXMueDtcblx0XHRcdGNhc2UgMTogcmV0dXJuIHRoaXMueTtcblx0XHRcdGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvciggJ2luZGV4IGlzIG91dCBvZiByYW5nZTogJyArIGluZGV4ICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRjb3B5OiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHR0aGlzLnggPSB2Lng7XG5cdFx0dGhpcy55ID0gdi55O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRhZGQ6IGZ1bmN0aW9uICggdiwgdyApIHtcblxuXHRcdGlmICggdyAhPT0gdW5kZWZpbmVkICkge1xuXG5cdFx0XHRjb25zb2xlLndhcm4oICdUSFJFRS5WZWN0b3IyOiAuYWRkKCkgbm93IG9ubHkgYWNjZXB0cyBvbmUgYXJndW1lbnQuIFVzZSAuYWRkVmVjdG9ycyggYSwgYiApIGluc3RlYWQuJyApO1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkVmVjdG9ycyggdiwgdyApO1xuXG5cdFx0fVxuXG5cdFx0dGhpcy54ICs9IHYueDtcblx0XHR0aGlzLnkgKz0gdi55O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRhZGRWZWN0b3JzOiBmdW5jdGlvbiAoIGEsIGIgKSB7XG5cblx0XHR0aGlzLnggPSBhLnggKyBiLng7XG5cdFx0dGhpcy55ID0gYS55ICsgYi55O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRhZGRTY2FsYXI6IGZ1bmN0aW9uICggcyApIHtcblxuXHRcdHRoaXMueCArPSBzO1xuXHRcdHRoaXMueSArPSBzO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzdWI6IGZ1bmN0aW9uICggdiwgdyApIHtcblxuXHRcdGlmICggdyAhPT0gdW5kZWZpbmVkICkge1xuXG5cdFx0XHRjb25zb2xlLndhcm4oICdUSFJFRS5WZWN0b3IyOiAuc3ViKCkgbm93IG9ubHkgYWNjZXB0cyBvbmUgYXJndW1lbnQuIFVzZSAuc3ViVmVjdG9ycyggYSwgYiApIGluc3RlYWQuJyApO1xuXHRcdFx0cmV0dXJuIHRoaXMuc3ViVmVjdG9ycyggdiwgdyApO1xuXG5cdFx0fVxuXG5cdFx0dGhpcy54IC09IHYueDtcblx0XHR0aGlzLnkgLT0gdi55O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzdWJWZWN0b3JzOiBmdW5jdGlvbiAoIGEsIGIgKSB7XG5cblx0XHR0aGlzLnggPSBhLnggLSBiLng7XG5cdFx0dGhpcy55ID0gYS55IC0gYi55O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtdWx0aXBseTogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0dGhpcy54ICo9IHYueDtcblx0XHR0aGlzLnkgKj0gdi55O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtdWx0aXBseVNjYWxhcjogZnVuY3Rpb24gKCBzICkge1xuXG5cdFx0dGhpcy54ICo9IHM7XG5cdFx0dGhpcy55ICo9IHM7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGRpdmlkZTogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0dGhpcy54IC89IHYueDtcblx0XHR0aGlzLnkgLz0gdi55O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRkaXZpZGVTY2FsYXI6IGZ1bmN0aW9uICggc2NhbGFyICkge1xuXG5cdFx0aWYgKCBzY2FsYXIgIT09IDAgKSB7XG5cblx0XHRcdHZhciBpbnZTY2FsYXIgPSAxIC8gc2NhbGFyO1xuXG5cdFx0XHR0aGlzLnggKj0gaW52U2NhbGFyO1xuXHRcdFx0dGhpcy55ICo9IGludlNjYWxhcjtcblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdHRoaXMueCA9IDA7XG5cdFx0XHR0aGlzLnkgPSAwO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtaW46IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdGlmICggdGhpcy54ID4gdi54ICkge1xuXG5cdFx0XHR0aGlzLnggPSB2Lng7XG5cblx0XHR9XG5cblx0XHRpZiAoIHRoaXMueSA+IHYueSApIHtcblxuXHRcdFx0dGhpcy55ID0gdi55O1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtYXg6IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdGlmICggdGhpcy54IDwgdi54ICkge1xuXG5cdFx0XHR0aGlzLnggPSB2Lng7XG5cblx0XHR9XG5cblx0XHRpZiAoIHRoaXMueSA8IHYueSApIHtcblxuXHRcdFx0dGhpcy55ID0gdi55O1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjbGFtcDogZnVuY3Rpb24gKCBtaW4sIG1heCApIHtcblxuXHRcdC8vIFRoaXMgZnVuY3Rpb24gYXNzdW1lcyBtaW4gPCBtYXgsIGlmIHRoaXMgYXNzdW1wdGlvbiBpc24ndCB0cnVlIGl0IHdpbGwgbm90IG9wZXJhdGUgY29ycmVjdGx5XG5cblx0XHRpZiAoIHRoaXMueCA8IG1pbi54ICkge1xuXG5cdFx0XHR0aGlzLnggPSBtaW4ueDtcblxuXHRcdH0gZWxzZSBpZiAoIHRoaXMueCA+IG1heC54ICkge1xuXG5cdFx0XHR0aGlzLnggPSBtYXgueDtcblxuXHRcdH1cblxuXHRcdGlmICggdGhpcy55IDwgbWluLnkgKSB7XG5cblx0XHRcdHRoaXMueSA9IG1pbi55O1xuXG5cdFx0fSBlbHNlIGlmICggdGhpcy55ID4gbWF4LnkgKSB7XG5cblx0XHRcdHRoaXMueSA9IG1heC55O1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0Y2xhbXBTY2FsYXI6ICggZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIG1pbiwgbWF4O1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICggbWluVmFsLCBtYXhWYWwgKSB7XG5cblx0XHRcdGlmICggbWluID09PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdFx0bWluID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcblx0XHRcdFx0bWF4ID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcblxuXHRcdFx0fVxuXG5cdFx0XHRtaW4uc2V0KCBtaW5WYWwsIG1pblZhbCApO1xuXHRcdFx0bWF4LnNldCggbWF4VmFsLCBtYXhWYWwgKTtcblxuXHRcdFx0cmV0dXJuIHRoaXMuY2xhbXAoIG1pbiwgbWF4ICk7XG5cblx0XHR9O1xuXG5cdH0gKSgpLFxuXG5cdGZsb29yOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR0aGlzLnggPSBNYXRoLmZsb29yKCB0aGlzLnggKTtcblx0XHR0aGlzLnkgPSBNYXRoLmZsb29yKCB0aGlzLnkgKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0Y2VpbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gTWF0aC5jZWlsKCB0aGlzLnggKTtcblx0XHR0aGlzLnkgPSBNYXRoLmNlaWwoIHRoaXMueSApO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRyb3VuZDogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gTWF0aC5yb3VuZCggdGhpcy54ICk7XG5cdFx0dGhpcy55ID0gTWF0aC5yb3VuZCggdGhpcy55ICk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHJvdW5kVG9aZXJvOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR0aGlzLnggPSAoIHRoaXMueCA8IDAgKSA/IE1hdGguY2VpbCggdGhpcy54ICkgOiBNYXRoLmZsb29yKCB0aGlzLnggKTtcblx0XHR0aGlzLnkgPSAoIHRoaXMueSA8IDAgKSA/IE1hdGguY2VpbCggdGhpcy55ICkgOiBNYXRoLmZsb29yKCB0aGlzLnkgKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bmVnYXRlOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR0aGlzLnggPSAtIHRoaXMueDtcblx0XHR0aGlzLnkgPSAtIHRoaXMueTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0ZG90OiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRyZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55O1xuXG5cdH0sXG5cblx0bGVuZ3RoU3E6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnk7XG5cblx0fSxcblxuXHRsZW5ndGg6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBNYXRoLnNxcnQoIHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSApO1xuXG5cdH0sXG5cblx0bm9ybWFsaXplOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gdGhpcy5kaXZpZGVTY2FsYXIoIHRoaXMubGVuZ3RoKCkgKTtcblxuXHR9LFxuXG5cdGRpc3RhbmNlVG86IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdHJldHVybiBNYXRoLnNxcnQoIHRoaXMuZGlzdGFuY2VUb1NxdWFyZWQoIHYgKSApO1xuXG5cdH0sXG5cblx0ZGlzdGFuY2VUb1NxdWFyZWQ6IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdHZhciBkeCA9IHRoaXMueCAtIHYueCwgZHkgPSB0aGlzLnkgLSB2Lnk7XG5cdFx0cmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xuXG5cdH0sXG5cblx0c2V0TGVuZ3RoOiBmdW5jdGlvbiAoIGwgKSB7XG5cblx0XHR2YXIgb2xkTGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcblxuXHRcdGlmICggb2xkTGVuZ3RoICE9PSAwICYmIGwgIT09IG9sZExlbmd0aCApIHtcblxuXHRcdFx0dGhpcy5tdWx0aXBseVNjYWxhciggbCAvIG9sZExlbmd0aCApO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bGVycDogZnVuY3Rpb24gKCB2LCBhbHBoYSApIHtcblxuXHRcdHRoaXMueCArPSAoIHYueCAtIHRoaXMueCApICogYWxwaGE7XG5cdFx0dGhpcy55ICs9ICggdi55IC0gdGhpcy55ICkgKiBhbHBoYTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0ZXF1YWxzOiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRyZXR1cm4gKCAoIHYueCA9PT0gdGhpcy54ICkgJiYgKCB2LnkgPT09IHRoaXMueSApICk7XG5cblx0fSxcblxuXHRmcm9tQXJyYXk6IGZ1bmN0aW9uICggYXJyYXksIG9mZnNldCApIHtcblxuXHRcdGlmICggb2Zmc2V0ID09PSB1bmRlZmluZWQgKSBvZmZzZXQgPSAwO1xuXG5cdFx0dGhpcy54ID0gYXJyYXlbIG9mZnNldCBdO1xuXHRcdHRoaXMueSA9IGFycmF5WyBvZmZzZXQgKyAxIF07XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHRvQXJyYXk6IGZ1bmN0aW9uICggYXJyYXksIG9mZnNldCApIHtcblxuXHRcdGlmICggYXJyYXkgPT09IHVuZGVmaW5lZCApIGFycmF5ID0gW107XG5cdFx0aWYgKCBvZmZzZXQgPT09IHVuZGVmaW5lZCApIG9mZnNldCA9IDA7XG5cblx0XHRhcnJheVsgb2Zmc2V0IF0gPSB0aGlzLng7XG5cdFx0YXJyYXlbIG9mZnNldCArIDEgXSA9IHRoaXMueTtcblxuXHRcdHJldHVybiBhcnJheTtcblxuXHR9LFxuXG5cdGZyb21BdHRyaWJ1dGU6IGZ1bmN0aW9uICggYXR0cmlidXRlLCBpbmRleCwgb2Zmc2V0ICkge1xuXG5cdCAgICBpZiAoIG9mZnNldCA9PT0gdW5kZWZpbmVkICkgb2Zmc2V0ID0gMDtcblxuXHQgICAgaW5kZXggPSBpbmRleCAqIGF0dHJpYnV0ZS5pdGVtU2l6ZSArIG9mZnNldDtcblxuXHQgICAgdGhpcy54ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCBdO1xuXHQgICAgdGhpcy55ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCArIDEgXTtcblxuXHQgICAgcmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjbG9uZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IyKCB0aGlzLngsIHRoaXMueSApO1xuXG5cdH1cblxufTtcbi8qKiogRU5EIFZlY3RvcjIgKioqL1xuLyoqKiBTVEFSVCBWZWN0b3IzICoqKi9cblxuLyoqXG4gKiBAYXV0aG9yIG1yZG9vYiAvIGh0dHA6Ly9tcmRvb2IuY29tL1xuICogQGF1dGhvciAqa2lsZSAvIGh0dHA6Ly9raWxlLnN0cmF2YWdhbnphLm9yZy9cbiAqIEBhdXRob3IgcGhpbG9nYiAvIGh0dHA6Ly9ibG9nLnRoZWppdC5vcmcvXG4gKiBAYXV0aG9yIG1pa2FlbCBlbXRpbmdlciAvIGh0dHA6Ly9nb21vLnNlL1xuICogQGF1dGhvciBlZ3JhZXRoZXIgLyBodHRwOi8vZWdyYWV0aGVyLmNvbS9cbiAqIEBhdXRob3IgV2VzdExhbmdsZXkgLyBodHRwOi8vZ2l0aHViLmNvbS9XZXN0TGFuZ2xleVxuICovXG5cblRIUkVFLlZlY3RvcjMgPSBmdW5jdGlvbiAoIHgsIHksIHogKSB7XG5cblx0dGhpcy54ID0geCB8fCAwO1xuXHR0aGlzLnkgPSB5IHx8IDA7XG5cdHRoaXMueiA9IHogfHwgMDtcblxufTtcblxuVEhSRUUuVmVjdG9yMy5wcm90b3R5cGUgPSB7XG5cblx0Y29uc3RydWN0b3I6IFRIUkVFLlZlY3RvcjMsXG5cblx0c2V0OiBmdW5jdGlvbiAoIHgsIHksIHogKSB7XG5cblx0XHR0aGlzLnggPSB4O1xuXHRcdHRoaXMueSA9IHk7XG5cdFx0dGhpcy56ID0gejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0WDogZnVuY3Rpb24gKCB4ICkge1xuXG5cdFx0dGhpcy54ID0geDtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0WTogZnVuY3Rpb24gKCB5ICkge1xuXG5cdFx0dGhpcy55ID0geTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0WjogZnVuY3Rpb24gKCB6ICkge1xuXG5cdFx0dGhpcy56ID0gejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0Q29tcG9uZW50OiBmdW5jdGlvbiAoIGluZGV4LCB2YWx1ZSApIHtcblxuXHRcdHN3aXRjaCAoIGluZGV4ICkge1xuXG5cdFx0XHRjYXNlIDA6IHRoaXMueCA9IHZhbHVlOyBicmVhaztcblx0XHRcdGNhc2UgMTogdGhpcy55ID0gdmFsdWU7IGJyZWFrO1xuXHRcdFx0Y2FzZSAyOiB0aGlzLnogPSB2YWx1ZTsgYnJlYWs7XG5cdFx0XHRkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoICdpbmRleCBpcyBvdXQgb2YgcmFuZ2U6ICcgKyBpbmRleCApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Z2V0Q29tcG9uZW50OiBmdW5jdGlvbiAoIGluZGV4ICkge1xuXG5cdFx0c3dpdGNoICggaW5kZXggKSB7XG5cblx0XHRcdGNhc2UgMDogcmV0dXJuIHRoaXMueDtcblx0XHRcdGNhc2UgMTogcmV0dXJuIHRoaXMueTtcblx0XHRcdGNhc2UgMjogcmV0dXJuIHRoaXMuejtcblx0XHRcdGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvciggJ2luZGV4IGlzIG91dCBvZiByYW5nZTogJyArIGluZGV4ICk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRjb3B5OiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHR0aGlzLnggPSB2Lng7XG5cdFx0dGhpcy55ID0gdi55O1xuXHRcdHRoaXMueiA9IHYuejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YWRkOiBmdW5jdGlvbiAoIHYsIHcgKSB7XG5cblx0XHRpZiAoIHcgIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuVmVjdG9yMzogLmFkZCgpIG5vdyBvbmx5IGFjY2VwdHMgb25lIGFyZ3VtZW50LiBVc2UgLmFkZFZlY3RvcnMoIGEsIGIgKSBpbnN0ZWFkLicgKTtcblx0XHRcdHJldHVybiB0aGlzLmFkZFZlY3RvcnMoIHYsIHcgKTtcblxuXHRcdH1cblxuXHRcdHRoaXMueCArPSB2Lng7XG5cdFx0dGhpcy55ICs9IHYueTtcblx0XHR0aGlzLnogKz0gdi56O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRhZGRTY2FsYXI6IGZ1bmN0aW9uICggcyApIHtcblxuXHRcdHRoaXMueCArPSBzO1xuXHRcdHRoaXMueSArPSBzO1xuXHRcdHRoaXMueiArPSBzO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRhZGRWZWN0b3JzOiBmdW5jdGlvbiAoIGEsIGIgKSB7XG5cblx0XHR0aGlzLnggPSBhLnggKyBiLng7XG5cdFx0dGhpcy55ID0gYS55ICsgYi55O1xuXHRcdHRoaXMueiA9IGEueiArIGIuejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c3ViOiBmdW5jdGlvbiAoIHYsIHcgKSB7XG5cblx0XHRpZiAoIHcgIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuVmVjdG9yMzogLnN1YigpIG5vdyBvbmx5IGFjY2VwdHMgb25lIGFyZ3VtZW50LiBVc2UgLnN1YlZlY3RvcnMoIGEsIGIgKSBpbnN0ZWFkLicgKTtcblx0XHRcdHJldHVybiB0aGlzLnN1YlZlY3RvcnMoIHYsIHcgKTtcblxuXHRcdH1cblxuXHRcdHRoaXMueCAtPSB2Lng7XG5cdFx0dGhpcy55IC09IHYueTtcblx0XHR0aGlzLnogLT0gdi56O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzdWJWZWN0b3JzOiBmdW5jdGlvbiAoIGEsIGIgKSB7XG5cblx0XHR0aGlzLnggPSBhLnggLSBiLng7XG5cdFx0dGhpcy55ID0gYS55IC0gYi55O1xuXHRcdHRoaXMueiA9IGEueiAtIGIuejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bXVsdGlwbHk6IGZ1bmN0aW9uICggdiwgdyApIHtcblxuXHRcdGlmICggdyAhPT0gdW5kZWZpbmVkICkge1xuXG5cdFx0XHRjb25zb2xlLndhcm4oICdUSFJFRS5WZWN0b3IzOiAubXVsdGlwbHkoKSBub3cgb25seSBhY2NlcHRzIG9uZSBhcmd1bWVudC4gVXNlIC5tdWx0aXBseVZlY3RvcnMoIGEsIGIgKSBpbnN0ZWFkLicgKTtcblx0XHRcdHJldHVybiB0aGlzLm11bHRpcGx5VmVjdG9ycyggdiwgdyApO1xuXG5cdFx0fVxuXG5cdFx0dGhpcy54ICo9IHYueDtcblx0XHR0aGlzLnkgKj0gdi55O1xuXHRcdHRoaXMueiAqPSB2Lno7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdG11bHRpcGx5U2NhbGFyOiBmdW5jdGlvbiAoIHNjYWxhciApIHtcblxuXHRcdHRoaXMueCAqPSBzY2FsYXI7XG5cdFx0dGhpcy55ICo9IHNjYWxhcjtcblx0XHR0aGlzLnogKj0gc2NhbGFyO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtdWx0aXBseVZlY3RvcnM6IGZ1bmN0aW9uICggYSwgYiApIHtcblxuXHRcdHRoaXMueCA9IGEueCAqIGIueDtcblx0XHR0aGlzLnkgPSBhLnkgKiBiLnk7XG5cdFx0dGhpcy56ID0gYS56ICogYi56O1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRhcHBseUV1bGVyOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgcXVhdGVybmlvbjtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIGV1bGVyICkge1xuXG5cdFx0XHRpZiAoIGV1bGVyIGluc3RhbmNlb2YgVEhSRUUuRXVsZXIgPT09IGZhbHNlICkge1xuXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoICdUSFJFRS5WZWN0b3IzOiAuYXBwbHlFdWxlcigpIG5vdyBleHBlY3RzIGEgRXVsZXIgcm90YXRpb24gcmF0aGVyIHRoYW4gYSBWZWN0b3IzIGFuZCBvcmRlci4nICk7XG5cblx0XHRcdH1cblxuXHRcdFx0aWYgKCBxdWF0ZXJuaW9uID09PSB1bmRlZmluZWQgKSBxdWF0ZXJuaW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuXHRcdFx0dGhpcy5hcHBseVF1YXRlcm5pb24oIHF1YXRlcm5pb24uc2V0RnJvbUV1bGVyKCBldWxlciApICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXG5cdFx0fTtcblxuXHR9KCksXG5cblx0YXBwbHlBeGlzQW5nbGU6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBxdWF0ZXJuaW9uO1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICggYXhpcywgYW5nbGUgKSB7XG5cblx0XHRcdGlmICggcXVhdGVybmlvbiA9PT0gdW5kZWZpbmVkICkgcXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cblx0XHRcdHRoaXMuYXBwbHlRdWF0ZXJuaW9uKCBxdWF0ZXJuaW9uLnNldEZyb21BeGlzQW5nbGUoIGF4aXMsIGFuZ2xlICkgKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cblx0XHR9O1xuXG5cdH0oKSxcblxuXHRhcHBseU1hdHJpeDM6IGZ1bmN0aW9uICggbSApIHtcblxuXHRcdHZhciB4ID0gdGhpcy54O1xuXHRcdHZhciB5ID0gdGhpcy55O1xuXHRcdHZhciB6ID0gdGhpcy56O1xuXG5cdFx0dmFyIGUgPSBtLmVsZW1lbnRzO1xuXG5cdFx0dGhpcy54ID0gZVsgMCBdICogeCArIGVbIDMgXSAqIHkgKyBlWyA2IF0gKiB6O1xuXHRcdHRoaXMueSA9IGVbIDEgXSAqIHggKyBlWyA0IF0gKiB5ICsgZVsgNyBdICogejtcblx0XHR0aGlzLnogPSBlWyAyIF0gKiB4ICsgZVsgNSBdICogeSArIGVbIDggXSAqIHo7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGFwcGx5TWF0cml4NDogZnVuY3Rpb24gKCBtICkge1xuXG5cdFx0Ly8gaW5wdXQ6IFRIUkVFLk1hdHJpeDQgYWZmaW5lIG1hdHJpeFxuXG5cdFx0dmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLno7XG5cblx0XHR2YXIgZSA9IG0uZWxlbWVudHM7XG5cblx0XHR0aGlzLnggPSBlWyAwIF0gKiB4ICsgZVsgNCBdICogeSArIGVbIDggXSAgKiB6ICsgZVsgMTIgXTtcblx0XHR0aGlzLnkgPSBlWyAxIF0gKiB4ICsgZVsgNSBdICogeSArIGVbIDkgXSAgKiB6ICsgZVsgMTMgXTtcblx0XHR0aGlzLnogPSBlWyAyIF0gKiB4ICsgZVsgNiBdICogeSArIGVbIDEwIF0gKiB6ICsgZVsgMTQgXTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0YXBwbHlQcm9qZWN0aW9uOiBmdW5jdGlvbiAoIG0gKSB7XG5cblx0XHQvLyBpbnB1dDogVEhSRUUuTWF0cml4NCBwcm9qZWN0aW9uIG1hdHJpeFxuXG5cdFx0dmFyIHggPSB0aGlzLngsIHkgPSB0aGlzLnksIHogPSB0aGlzLno7XG5cblx0XHR2YXIgZSA9IG0uZWxlbWVudHM7XG5cdFx0dmFyIGQgPSAxIC8gKCBlWyAzIF0gKiB4ICsgZVsgNyBdICogeSArIGVbIDExIF0gKiB6ICsgZVsgMTUgXSApOyAvLyBwZXJzcGVjdGl2ZSBkaXZpZGVcblxuXHRcdHRoaXMueCA9ICggZVsgMCBdICogeCArIGVbIDQgXSAqIHkgKyBlWyA4IF0gICogeiArIGVbIDEyIF0gKSAqIGQ7XG5cdFx0dGhpcy55ID0gKCBlWyAxIF0gKiB4ICsgZVsgNSBdICogeSArIGVbIDkgXSAgKiB6ICsgZVsgMTMgXSApICogZDtcblx0XHR0aGlzLnogPSAoIGVbIDIgXSAqIHggKyBlWyA2IF0gKiB5ICsgZVsgMTAgXSAqIHogKyBlWyAxNCBdICkgKiBkO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRhcHBseVF1YXRlcm5pb246IGZ1bmN0aW9uICggcSApIHtcblxuXHRcdHZhciB4ID0gdGhpcy54O1xuXHRcdHZhciB5ID0gdGhpcy55O1xuXHRcdHZhciB6ID0gdGhpcy56O1xuXG5cdFx0dmFyIHF4ID0gcS54O1xuXHRcdHZhciBxeSA9IHEueTtcblx0XHR2YXIgcXogPSBxLno7XG5cdFx0dmFyIHF3ID0gcS53O1xuXG5cdFx0Ly8gY2FsY3VsYXRlIHF1YXQgKiB2ZWN0b3JcblxuXHRcdHZhciBpeCA9ICBxdyAqIHggKyBxeSAqIHogLSBxeiAqIHk7XG5cdFx0dmFyIGl5ID0gIHF3ICogeSArIHF6ICogeCAtIHF4ICogejtcblx0XHR2YXIgaXogPSAgcXcgKiB6ICsgcXggKiB5IC0gcXkgKiB4O1xuXHRcdHZhciBpdyA9IC0gcXggKiB4IC0gcXkgKiB5IC0gcXogKiB6O1xuXG5cdFx0Ly8gY2FsY3VsYXRlIHJlc3VsdCAqIGludmVyc2UgcXVhdFxuXG5cdFx0dGhpcy54ID0gaXggKiBxdyArIGl3ICogLSBxeCArIGl5ICogLSBxeiAtIGl6ICogLSBxeTtcblx0XHR0aGlzLnkgPSBpeSAqIHF3ICsgaXcgKiAtIHF5ICsgaXogKiAtIHF4IC0gaXggKiAtIHF6O1xuXHRcdHRoaXMueiA9IGl6ICogcXcgKyBpdyAqIC0gcXogKyBpeCAqIC0gcXkgLSBpeSAqIC0gcXg7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHByb2plY3Q6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBtYXRyaXg7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCBjYW1lcmEgKSB7XG5cblx0XHRcdGlmICggbWF0cml4ID09PSB1bmRlZmluZWQgKSBtYXRyaXggPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuXG5cdFx0XHRtYXRyaXgubXVsdGlwbHlNYXRyaWNlcyggY2FtZXJhLnByb2plY3Rpb25NYXRyaXgsIG1hdHJpeC5nZXRJbnZlcnNlKCBjYW1lcmEubWF0cml4V29ybGQgKSApO1xuXHRcdFx0cmV0dXJuIHRoaXMuYXBwbHlQcm9qZWN0aW9uKCBtYXRyaXggKTtcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdHVucHJvamVjdDogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIG1hdHJpeDtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIGNhbWVyYSApIHtcblxuXHRcdFx0aWYgKCBtYXRyaXggPT09IHVuZGVmaW5lZCApIG1hdHJpeCA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG5cblx0XHRcdG1hdHJpeC5tdWx0aXBseU1hdHJpY2VzKCBjYW1lcmEubWF0cml4V29ybGQsIG1hdHJpeC5nZXRJbnZlcnNlKCBjYW1lcmEucHJvamVjdGlvbk1hdHJpeCApICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5hcHBseVByb2plY3Rpb24oIG1hdHJpeCApO1xuXG5cdFx0fTtcblxuXHR9KCksXG5cblx0dHJhbnNmb3JtRGlyZWN0aW9uOiBmdW5jdGlvbiAoIG0gKSB7XG5cblx0XHQvLyBpbnB1dDogVEhSRUUuTWF0cml4NCBhZmZpbmUgbWF0cml4XG5cdFx0Ly8gdmVjdG9yIGludGVycHJldGVkIGFzIGEgZGlyZWN0aW9uXG5cblx0XHR2YXIgeCA9IHRoaXMueCwgeSA9IHRoaXMueSwgeiA9IHRoaXMuejtcblxuXHRcdHZhciBlID0gbS5lbGVtZW50cztcblxuXHRcdHRoaXMueCA9IGVbIDAgXSAqIHggKyBlWyA0IF0gKiB5ICsgZVsgOCBdICAqIHo7XG5cdFx0dGhpcy55ID0gZVsgMSBdICogeCArIGVbIDUgXSAqIHkgKyBlWyA5IF0gICogejtcblx0XHR0aGlzLnogPSBlWyAyIF0gKiB4ICsgZVsgNiBdICogeSArIGVbIDEwIF0gKiB6O1xuXG5cdFx0dGhpcy5ub3JtYWxpemUoKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0ZGl2aWRlOiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHR0aGlzLnggLz0gdi54O1xuXHRcdHRoaXMueSAvPSB2Lnk7XG5cdFx0dGhpcy56IC89IHYuejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0ZGl2aWRlU2NhbGFyOiBmdW5jdGlvbiAoIHNjYWxhciApIHtcblxuXHRcdGlmICggc2NhbGFyICE9PSAwICkge1xuXG5cdFx0XHR2YXIgaW52U2NhbGFyID0gMSAvIHNjYWxhcjtcblxuXHRcdFx0dGhpcy54ICo9IGludlNjYWxhcjtcblx0XHRcdHRoaXMueSAqPSBpbnZTY2FsYXI7XG5cdFx0XHR0aGlzLnogKj0gaW52U2NhbGFyO1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0dGhpcy54ID0gMDtcblx0XHRcdHRoaXMueSA9IDA7XG5cdFx0XHR0aGlzLnogPSAwO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRtaW46IGZ1bmN0aW9uICggdiApIHtcblxuXHRcdGlmICggdGhpcy54ID4gdi54ICkge1xuXG5cdFx0XHR0aGlzLnggPSB2Lng7XG5cblx0XHR9XG5cblx0XHRpZiAoIHRoaXMueSA+IHYueSApIHtcblxuXHRcdFx0dGhpcy55ID0gdi55O1xuXG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzLnogPiB2LnogKSB7XG5cblx0XHRcdHRoaXMueiA9IHYuejtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bWF4OiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRpZiAoIHRoaXMueCA8IHYueCApIHtcblxuXHRcdFx0dGhpcy54ID0gdi54O1xuXG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzLnkgPCB2LnkgKSB7XG5cblx0XHRcdHRoaXMueSA9IHYueTtcblxuXHRcdH1cblxuXHRcdGlmICggdGhpcy56IDwgdi56ICkge1xuXG5cdFx0XHR0aGlzLnogPSB2Lno7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGNsYW1wOiBmdW5jdGlvbiAoIG1pbiwgbWF4ICkge1xuXG5cdFx0Ly8gVGhpcyBmdW5jdGlvbiBhc3N1bWVzIG1pbiA8IG1heCwgaWYgdGhpcyBhc3N1bXB0aW9uIGlzbid0IHRydWUgaXQgd2lsbCBub3Qgb3BlcmF0ZSBjb3JyZWN0bHlcblxuXHRcdGlmICggdGhpcy54IDwgbWluLnggKSB7XG5cblx0XHRcdHRoaXMueCA9IG1pbi54O1xuXG5cdFx0fSBlbHNlIGlmICggdGhpcy54ID4gbWF4LnggKSB7XG5cblx0XHRcdHRoaXMueCA9IG1heC54O1xuXG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzLnkgPCBtaW4ueSApIHtcblxuXHRcdFx0dGhpcy55ID0gbWluLnk7XG5cblx0XHR9IGVsc2UgaWYgKCB0aGlzLnkgPiBtYXgueSApIHtcblxuXHRcdFx0dGhpcy55ID0gbWF4Lnk7XG5cblx0XHR9XG5cblx0XHRpZiAoIHRoaXMueiA8IG1pbi56ICkge1xuXG5cdFx0XHR0aGlzLnogPSBtaW4uejtcblxuXHRcdH0gZWxzZSBpZiAoIHRoaXMueiA+IG1heC56ICkge1xuXG5cdFx0XHR0aGlzLnogPSBtYXguejtcblxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0Y2xhbXBTY2FsYXI6ICggZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIG1pbiwgbWF4O1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICggbWluVmFsLCBtYXhWYWwgKSB7XG5cblx0XHRcdGlmICggbWluID09PSB1bmRlZmluZWQgKSB7XG5cblx0XHRcdFx0bWluID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblx0XHRcdFx0bWF4ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuXHRcdFx0fVxuXG5cdFx0XHRtaW4uc2V0KCBtaW5WYWwsIG1pblZhbCwgbWluVmFsICk7XG5cdFx0XHRtYXguc2V0KCBtYXhWYWwsIG1heFZhbCwgbWF4VmFsICk7XG5cblx0XHRcdHJldHVybiB0aGlzLmNsYW1wKCBtaW4sIG1heCApO1xuXG5cdFx0fTtcblxuXHR9ICkoKSxcblxuXHRmbG9vcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gTWF0aC5mbG9vciggdGhpcy54ICk7XG5cdFx0dGhpcy55ID0gTWF0aC5mbG9vciggdGhpcy55ICk7XG5cdFx0dGhpcy56ID0gTWF0aC5mbG9vciggdGhpcy56ICk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGNlaWw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHRoaXMueCA9IE1hdGguY2VpbCggdGhpcy54ICk7XG5cdFx0dGhpcy55ID0gTWF0aC5jZWlsKCB0aGlzLnkgKTtcblx0XHR0aGlzLnogPSBNYXRoLmNlaWwoIHRoaXMueiApO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRyb3VuZDogZnVuY3Rpb24gKCkge1xuXG5cdFx0dGhpcy54ID0gTWF0aC5yb3VuZCggdGhpcy54ICk7XG5cdFx0dGhpcy55ID0gTWF0aC5yb3VuZCggdGhpcy55ICk7XG5cdFx0dGhpcy56ID0gTWF0aC5yb3VuZCggdGhpcy56ICk7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHJvdW5kVG9aZXJvOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR0aGlzLnggPSAoIHRoaXMueCA8IDAgKSA/IE1hdGguY2VpbCggdGhpcy54ICkgOiBNYXRoLmZsb29yKCB0aGlzLnggKTtcblx0XHR0aGlzLnkgPSAoIHRoaXMueSA8IDAgKSA/IE1hdGguY2VpbCggdGhpcy55ICkgOiBNYXRoLmZsb29yKCB0aGlzLnkgKTtcblx0XHR0aGlzLnogPSAoIHRoaXMueiA8IDAgKSA/IE1hdGguY2VpbCggdGhpcy56ICkgOiBNYXRoLmZsb29yKCB0aGlzLnogKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0bmVnYXRlOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR0aGlzLnggPSAtIHRoaXMueDtcblx0XHR0aGlzLnkgPSAtIHRoaXMueTtcblx0XHR0aGlzLnogPSAtIHRoaXMuejtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0ZG90OiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRyZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55ICsgdGhpcy56ICogdi56O1xuXG5cdH0sXG5cblx0bGVuZ3RoU3E6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkgKyB0aGlzLnogKiB0aGlzLno7XG5cblx0fSxcblxuXHRsZW5ndGg6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBNYXRoLnNxcnQoIHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSArIHRoaXMueiAqIHRoaXMueiApO1xuXG5cdH0sXG5cblx0bGVuZ3RoTWFuaGF0dGFuOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gTWF0aC5hYnMoIHRoaXMueCApICsgTWF0aC5hYnMoIHRoaXMueSApICsgTWF0aC5hYnMoIHRoaXMueiApO1xuXG5cdH0sXG5cblx0bm9ybWFsaXplOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gdGhpcy5kaXZpZGVTY2FsYXIoIHRoaXMubGVuZ3RoKCkgKTtcblxuXHR9LFxuXG5cdHNldExlbmd0aDogZnVuY3Rpb24gKCBsICkge1xuXG5cdFx0dmFyIG9sZExlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XG5cblx0XHRpZiAoIG9sZExlbmd0aCAhPT0gMCAmJiBsICE9PSBvbGRMZW5ndGggICkge1xuXG5cdFx0XHR0aGlzLm11bHRpcGx5U2NhbGFyKCBsIC8gb2xkTGVuZ3RoICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRsZXJwOiBmdW5jdGlvbiAoIHYsIGFscGhhICkge1xuXG5cdFx0dGhpcy54ICs9ICggdi54IC0gdGhpcy54ICkgKiBhbHBoYTtcblx0XHR0aGlzLnkgKz0gKCB2LnkgLSB0aGlzLnkgKSAqIGFscGhhO1xuXHRcdHRoaXMueiArPSAoIHYueiAtIHRoaXMueiApICogYWxwaGE7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGNyb3NzOiBmdW5jdGlvbiAoIHYsIHcgKSB7XG5cblx0XHRpZiAoIHcgIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuVmVjdG9yMzogLmNyb3NzKCkgbm93IG9ubHkgYWNjZXB0cyBvbmUgYXJndW1lbnQuIFVzZSAuY3Jvc3NWZWN0b3JzKCBhLCBiICkgaW5zdGVhZC4nICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5jcm9zc1ZlY3RvcnMoIHYsIHcgKTtcblxuXHRcdH1cblxuXHRcdHZhciB4ID0gdGhpcy54LCB5ID0gdGhpcy55LCB6ID0gdGhpcy56O1xuXG5cdFx0dGhpcy54ID0geSAqIHYueiAtIHogKiB2Lnk7XG5cdFx0dGhpcy55ID0geiAqIHYueCAtIHggKiB2Lno7XG5cdFx0dGhpcy56ID0geCAqIHYueSAtIHkgKiB2Lng7XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdGNyb3NzVmVjdG9yczogZnVuY3Rpb24gKCBhLCBiICkge1xuXG5cdFx0dmFyIGF4ID0gYS54LCBheSA9IGEueSwgYXogPSBhLno7XG5cdFx0dmFyIGJ4ID0gYi54LCBieSA9IGIueSwgYnogPSBiLno7XG5cblx0XHR0aGlzLnggPSBheSAqIGJ6IC0gYXogKiBieTtcblx0XHR0aGlzLnkgPSBheiAqIGJ4IC0gYXggKiBiejtcblx0XHR0aGlzLnogPSBheCAqIGJ5IC0gYXkgKiBieDtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0cHJvamVjdE9uVmVjdG9yOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgdjEsIGRvdDtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIHZlY3RvciApIHtcblxuXHRcdFx0aWYgKCB2MSA9PT0gdW5kZWZpbmVkICkgdjEgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXG5cdFx0XHR2MS5jb3B5KCB2ZWN0b3IgKS5ub3JtYWxpemUoKTtcblxuXHRcdFx0ZG90ID0gdGhpcy5kb3QoIHYxICk7XG5cblx0XHRcdHJldHVybiB0aGlzLmNvcHkoIHYxICkubXVsdGlwbHlTY2FsYXIoIGRvdCApO1xuXG5cdFx0fTtcblxuXHR9KCksXG5cblx0cHJvamVjdE9uUGxhbmU6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciB2MTtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIHBsYW5lTm9ybWFsICkge1xuXG5cdFx0XHRpZiAoIHYxID09PSB1bmRlZmluZWQgKSB2MSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cblx0XHRcdHYxLmNvcHkoIHRoaXMgKS5wcm9qZWN0T25WZWN0b3IoIHBsYW5lTm9ybWFsICk7XG5cblx0XHRcdHJldHVybiB0aGlzLnN1YiggdjEgKTtcblxuXHRcdH1cblxuXHR9KCksXG5cblx0cmVmbGVjdDogZnVuY3Rpb24gKCkge1xuXG5cdFx0Ly8gcmVmbGVjdCBpbmNpZGVudCB2ZWN0b3Igb2ZmIHBsYW5lIG9ydGhvZ29uYWwgdG8gbm9ybWFsXG5cdFx0Ly8gbm9ybWFsIGlzIGFzc3VtZWQgdG8gaGF2ZSB1bml0IGxlbmd0aFxuXG5cdFx0dmFyIHYxO1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICggbm9ybWFsICkge1xuXG5cdFx0XHRpZiAoIHYxID09PSB1bmRlZmluZWQgKSB2MSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cblx0XHRcdHJldHVybiB0aGlzLnN1YiggdjEuY29weSggbm9ybWFsICkubXVsdGlwbHlTY2FsYXIoIDIgKiB0aGlzLmRvdCggbm9ybWFsICkgKSApO1xuXG5cdFx0fVxuXG5cdH0oKSxcblxuXHRhbmdsZVRvOiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHR2YXIgdGhldGEgPSB0aGlzLmRvdCggdiApIC8gKCB0aGlzLmxlbmd0aCgpICogdi5sZW5ndGgoKSApO1xuXG5cdFx0Ly8gY2xhbXAsIHRvIGhhbmRsZSBudW1lcmljYWwgcHJvYmxlbXNcblxuXHRcdHJldHVybiBNYXRoLmFjb3MoIFRIUkVFLk1hdGguY2xhbXAoIHRoZXRhLCAtIDEsIDEgKSApO1xuXG5cdH0sXG5cblx0ZGlzdGFuY2VUbzogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0cmV0dXJuIE1hdGguc3FydCggdGhpcy5kaXN0YW5jZVRvU3F1YXJlZCggdiApICk7XG5cblx0fSxcblxuXHRkaXN0YW5jZVRvU3F1YXJlZDogZnVuY3Rpb24gKCB2ICkge1xuXG5cdFx0dmFyIGR4ID0gdGhpcy54IC0gdi54O1xuXHRcdHZhciBkeSA9IHRoaXMueSAtIHYueTtcblx0XHR2YXIgZHogPSB0aGlzLnogLSB2Lno7XG5cblx0XHRyZXR1cm4gZHggKiBkeCArIGR5ICogZHkgKyBkeiAqIGR6O1xuXG5cdH0sXG5cblx0c2V0RXVsZXJGcm9tUm90YXRpb25NYXRyaXg6IGZ1bmN0aW9uICggbSwgb3JkZXIgKSB7XG5cblx0XHRjb25zb2xlLmVycm9yKCAnVEhSRUUuVmVjdG9yMzogLnNldEV1bGVyRnJvbVJvdGF0aW9uTWF0cml4KCkgaGFzIGJlZW4gcmVtb3ZlZC4gVXNlIEV1bGVyLnNldEZyb21Sb3RhdGlvbk1hdHJpeCgpIGluc3RlYWQuJyApO1xuXG5cdH0sXG5cblx0c2V0RXVsZXJGcm9tUXVhdGVybmlvbjogZnVuY3Rpb24gKCBxLCBvcmRlciApIHtcblxuXHRcdGNvbnNvbGUuZXJyb3IoICdUSFJFRS5WZWN0b3IzOiAuc2V0RXVsZXJGcm9tUXVhdGVybmlvbigpIGhhcyBiZWVuIHJlbW92ZWQuIFVzZSBFdWxlci5zZXRGcm9tUXVhdGVybmlvbigpIGluc3RlYWQuJyApO1xuXG5cdH0sXG5cblx0Z2V0UG9zaXRpb25Gcm9tTWF0cml4OiBmdW5jdGlvbiAoIG0gKSB7XG5cblx0XHRjb25zb2xlLndhcm4oICdUSFJFRS5WZWN0b3IzOiAuZ2V0UG9zaXRpb25Gcm9tTWF0cml4KCkgaGFzIGJlZW4gcmVuYW1lZCB0byAuc2V0RnJvbU1hdHJpeFBvc2l0aW9uKCkuJyApO1xuXG5cdFx0cmV0dXJuIHRoaXMuc2V0RnJvbU1hdHJpeFBvc2l0aW9uKCBtICk7XG5cblx0fSxcblxuXHRnZXRTY2FsZUZyb21NYXRyaXg6IGZ1bmN0aW9uICggbSApIHtcblxuXHRcdGNvbnNvbGUud2FybiggJ1RIUkVFLlZlY3RvcjM6IC5nZXRTY2FsZUZyb21NYXRyaXgoKSBoYXMgYmVlbiByZW5hbWVkIHRvIC5zZXRGcm9tTWF0cml4U2NhbGUoKS4nICk7XG5cblx0XHRyZXR1cm4gdGhpcy5zZXRGcm9tTWF0cml4U2NhbGUoIG0gKTtcblx0fSxcblxuXHRnZXRDb2x1bW5Gcm9tTWF0cml4OiBmdW5jdGlvbiAoIGluZGV4LCBtYXRyaXggKSB7XG5cblx0XHRjb25zb2xlLndhcm4oICdUSFJFRS5WZWN0b3IzOiAuZ2V0Q29sdW1uRnJvbU1hdHJpeCgpIGhhcyBiZWVuIHJlbmFtZWQgdG8gLnNldEZyb21NYXRyaXhDb2x1bW4oKS4nICk7XG5cblx0XHRyZXR1cm4gdGhpcy5zZXRGcm9tTWF0cml4Q29sdW1uKCBpbmRleCwgbWF0cml4ICk7XG5cblx0fSxcblxuXHRzZXRGcm9tTWF0cml4UG9zaXRpb246IGZ1bmN0aW9uICggbSApIHtcblxuXHRcdHRoaXMueCA9IG0uZWxlbWVudHNbIDEyIF07XG5cdFx0dGhpcy55ID0gbS5lbGVtZW50c1sgMTMgXTtcblx0XHR0aGlzLnogPSBtLmVsZW1lbnRzWyAxNCBdO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRzZXRGcm9tTWF0cml4U2NhbGU6IGZ1bmN0aW9uICggbSApIHtcblxuXHRcdHZhciBzeCA9IHRoaXMuc2V0KCBtLmVsZW1lbnRzWyAwIF0sIG0uZWxlbWVudHNbIDEgXSwgbS5lbGVtZW50c1sgIDIgXSApLmxlbmd0aCgpO1xuXHRcdHZhciBzeSA9IHRoaXMuc2V0KCBtLmVsZW1lbnRzWyA0IF0sIG0uZWxlbWVudHNbIDUgXSwgbS5lbGVtZW50c1sgIDYgXSApLmxlbmd0aCgpO1xuXHRcdHZhciBzeiA9IHRoaXMuc2V0KCBtLmVsZW1lbnRzWyA4IF0sIG0uZWxlbWVudHNbIDkgXSwgbS5lbGVtZW50c1sgMTAgXSApLmxlbmd0aCgpO1xuXG5cdFx0dGhpcy54ID0gc3g7XG5cdFx0dGhpcy55ID0gc3k7XG5cdFx0dGhpcy56ID0gc3o7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRzZXRGcm9tTWF0cml4Q29sdW1uOiBmdW5jdGlvbiAoIGluZGV4LCBtYXRyaXggKSB7XG5cblx0XHR2YXIgb2Zmc2V0ID0gaW5kZXggKiA0O1xuXG5cdFx0dmFyIG1lID0gbWF0cml4LmVsZW1lbnRzO1xuXG5cdFx0dGhpcy54ID0gbWVbIG9mZnNldCBdO1xuXHRcdHRoaXMueSA9IG1lWyBvZmZzZXQgKyAxIF07XG5cdFx0dGhpcy56ID0gbWVbIG9mZnNldCArIDIgXTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0ZXF1YWxzOiBmdW5jdGlvbiAoIHYgKSB7XG5cblx0XHRyZXR1cm4gKCAoIHYueCA9PT0gdGhpcy54ICkgJiYgKCB2LnkgPT09IHRoaXMueSApICYmICggdi56ID09PSB0aGlzLnogKSApO1xuXG5cdH0sXG5cblx0ZnJvbUFycmF5OiBmdW5jdGlvbiAoIGFycmF5LCBvZmZzZXQgKSB7XG5cblx0XHRpZiAoIG9mZnNldCA9PT0gdW5kZWZpbmVkICkgb2Zmc2V0ID0gMDtcblxuXHRcdHRoaXMueCA9IGFycmF5WyBvZmZzZXQgXTtcblx0XHR0aGlzLnkgPSBhcnJheVsgb2Zmc2V0ICsgMSBdO1xuXHRcdHRoaXMueiA9IGFycmF5WyBvZmZzZXQgKyAyIF07XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9LFxuXG5cdHRvQXJyYXk6IGZ1bmN0aW9uICggYXJyYXksIG9mZnNldCApIHtcblxuXHRcdGlmICggYXJyYXkgPT09IHVuZGVmaW5lZCApIGFycmF5ID0gW107XG5cdFx0aWYgKCBvZmZzZXQgPT09IHVuZGVmaW5lZCApIG9mZnNldCA9IDA7XG5cblx0XHRhcnJheVsgb2Zmc2V0IF0gPSB0aGlzLng7XG5cdFx0YXJyYXlbIG9mZnNldCArIDEgXSA9IHRoaXMueTtcblx0XHRhcnJheVsgb2Zmc2V0ICsgMiBdID0gdGhpcy56O1xuXG5cdFx0cmV0dXJuIGFycmF5O1xuXG5cdH0sXG5cblx0ZnJvbUF0dHJpYnV0ZTogZnVuY3Rpb24gKCBhdHRyaWJ1dGUsIGluZGV4LCBvZmZzZXQgKSB7XG5cblx0ICAgIGlmICggb2Zmc2V0ID09PSB1bmRlZmluZWQgKSBvZmZzZXQgPSAwO1xuXG5cdCAgICBpbmRleCA9IGluZGV4ICogYXR0cmlidXRlLml0ZW1TaXplICsgb2Zmc2V0O1xuXG5cdCAgICB0aGlzLnggPSBhdHRyaWJ1dGUuYXJyYXlbIGluZGV4IF07XG5cdCAgICB0aGlzLnkgPSBhdHRyaWJ1dGUuYXJyYXlbIGluZGV4ICsgMSBdO1xuXHQgICAgdGhpcy56ID0gYXR0cmlidXRlLmFycmF5WyBpbmRleCArIDIgXTtcblxuXHQgICAgcmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjbG9uZTogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIG5ldyBUSFJFRS5WZWN0b3IzKCB0aGlzLngsIHRoaXMueSwgdGhpcy56ICk7XG5cblx0fVxuXG59O1xuLyoqKiBFTkQgVmVjdG9yMyAqKiovXG4vKioqIFNUQVJUIEV1bGVyICoqKi9cbi8qKlxuICogQGF1dGhvciBtcmRvb2IgLyBodHRwOi8vbXJkb29iLmNvbS9cbiAqIEBhdXRob3IgV2VzdExhbmdsZXkgLyBodHRwOi8vZ2l0aHViLmNvbS9XZXN0TGFuZ2xleVxuICogQGF1dGhvciBiaG91c3RvbiAvIGh0dHA6Ly9leG9jb3J0ZXguY29tXG4gKi9cblxuVEhSRUUuRXVsZXIgPSBmdW5jdGlvbiAoIHgsIHksIHosIG9yZGVyICkge1xuXG5cdHRoaXMuX3ggPSB4IHx8IDA7XG5cdHRoaXMuX3kgPSB5IHx8IDA7XG5cdHRoaXMuX3ogPSB6IHx8IDA7XG5cdHRoaXMuX29yZGVyID0gb3JkZXIgfHwgVEhSRUUuRXVsZXIuRGVmYXVsdE9yZGVyO1xuXG59O1xuXG5USFJFRS5FdWxlci5Sb3RhdGlvbk9yZGVycyA9IFsgJ1hZWicsICdZWlgnLCAnWlhZJywgJ1haWScsICdZWFonLCAnWllYJyBdO1xuXG5USFJFRS5FdWxlci5EZWZhdWx0T3JkZXIgPSAnWFlaJztcblxuVEhSRUUuRXVsZXIucHJvdG90eXBlID0ge1xuXG5cdGNvbnN0cnVjdG9yOiBUSFJFRS5FdWxlcixcblxuXHRfeDogMCwgX3k6IDAsIF96OiAwLCBfb3JkZXI6IFRIUkVFLkV1bGVyLkRlZmF1bHRPcmRlcixcblxuXHRnZXQgeCAoKSB7XG5cblx0XHRyZXR1cm4gdGhpcy5feDtcblxuXHR9LFxuXG5cdHNldCB4ICggdmFsdWUgKSB7XG5cblx0XHR0aGlzLl94ID0gdmFsdWU7XG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0fSxcblxuXHRnZXQgeSAoKSB7XG5cblx0XHRyZXR1cm4gdGhpcy5feTtcblxuXHR9LFxuXG5cdHNldCB5ICggdmFsdWUgKSB7XG5cblx0XHR0aGlzLl95ID0gdmFsdWU7XG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0fSxcblxuXHRnZXQgeiAoKSB7XG5cblx0XHRyZXR1cm4gdGhpcy5fejtcblxuXHR9LFxuXG5cdHNldCB6ICggdmFsdWUgKSB7XG5cblx0XHR0aGlzLl96ID0gdmFsdWU7XG5cdFx0dGhpcy5vbkNoYW5nZUNhbGxiYWNrKCk7XG5cblx0fSxcblxuXHRnZXQgb3JkZXIgKCkge1xuXG5cdFx0cmV0dXJuIHRoaXMuX29yZGVyO1xuXG5cdH0sXG5cblx0c2V0IG9yZGVyICggdmFsdWUgKSB7XG5cblx0XHR0aGlzLl9vcmRlciA9IHZhbHVlO1xuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdH0sXG5cblx0c2V0OiBmdW5jdGlvbiAoIHgsIHksIHosIG9yZGVyICkge1xuXG5cdFx0dGhpcy5feCA9IHg7XG5cdFx0dGhpcy5feSA9IHk7XG5cdFx0dGhpcy5feiA9IHo7XG5cdFx0dGhpcy5fb3JkZXIgPSBvcmRlciB8fCB0aGlzLl9vcmRlcjtcblxuXHRcdHRoaXMub25DaGFuZ2VDYWxsYmFjaygpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fSxcblxuXHRjb3B5OiBmdW5jdGlvbiAoIGV1bGVyICkge1xuXG5cdFx0dGhpcy5feCA9IGV1bGVyLl94O1xuXHRcdHRoaXMuX3kgPSBldWxlci5feTtcblx0XHR0aGlzLl96ID0gZXVsZXIuX3o7XG5cdFx0dGhpcy5fb3JkZXIgPSBldWxlci5fb3JkZXI7XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0RnJvbVJvdGF0aW9uTWF0cml4OiBmdW5jdGlvbiAoIG0sIG9yZGVyLCB1cGRhdGUgKSB7XG5cblx0XHR2YXIgY2xhbXAgPSBUSFJFRS5NYXRoLmNsYW1wO1xuXG5cdFx0Ly8gYXNzdW1lcyB0aGUgdXBwZXIgM3gzIG9mIG0gaXMgYSBwdXJlIHJvdGF0aW9uIG1hdHJpeCAoaS5lLCB1bnNjYWxlZClcblxuXHRcdHZhciB0ZSA9IG0uZWxlbWVudHM7XG5cdFx0dmFyIG0xMSA9IHRlWyAwIF0sIG0xMiA9IHRlWyA0IF0sIG0xMyA9IHRlWyA4IF07XG5cdFx0dmFyIG0yMSA9IHRlWyAxIF0sIG0yMiA9IHRlWyA1IF0sIG0yMyA9IHRlWyA5IF07XG5cdFx0dmFyIG0zMSA9IHRlWyAyIF0sIG0zMiA9IHRlWyA2IF0sIG0zMyA9IHRlWyAxMCBdO1xuXG5cdFx0b3JkZXIgPSBvcmRlciB8fCB0aGlzLl9vcmRlcjtcblxuXHRcdGlmICggb3JkZXIgPT09ICdYWVonICkge1xuXG5cdFx0XHR0aGlzLl95ID0gTWF0aC5hc2luKCBjbGFtcCggbTEzLCAtIDEsIDEgKSApO1xuXG5cdFx0XHRpZiAoIE1hdGguYWJzKCBtMTMgKSA8IDAuOTk5OTkgKSB7XG5cblx0XHRcdFx0dGhpcy5feCA9IE1hdGguYXRhbjIoIC0gbTIzLCBtMzMgKTtcblx0XHRcdFx0dGhpcy5feiA9IE1hdGguYXRhbjIoIC0gbTEyLCBtMTEgKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHR0aGlzLl94ID0gTWF0aC5hdGFuMiggbTMyLCBtMjIgKTtcblx0XHRcdFx0dGhpcy5feiA9IDA7XG5cblx0XHRcdH1cblxuXHRcdH0gZWxzZSBpZiAoIG9yZGVyID09PSAnWVhaJyApIHtcblxuXHRcdFx0dGhpcy5feCA9IE1hdGguYXNpbiggLSBjbGFtcCggbTIzLCAtIDEsIDEgKSApO1xuXG5cdFx0XHRpZiAoIE1hdGguYWJzKCBtMjMgKSA8IDAuOTk5OTkgKSB7XG5cblx0XHRcdFx0dGhpcy5feSA9IE1hdGguYXRhbjIoIG0xMywgbTMzICk7XG5cdFx0XHRcdHRoaXMuX3ogPSBNYXRoLmF0YW4yKCBtMjEsIG0yMiApO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdHRoaXMuX3kgPSBNYXRoLmF0YW4yKCAtIG0zMSwgbTExICk7XG5cdFx0XHRcdHRoaXMuX3ogPSAwO1xuXG5cdFx0XHR9XG5cblx0XHR9IGVsc2UgaWYgKCBvcmRlciA9PT0gJ1pYWScgKSB7XG5cblx0XHRcdHRoaXMuX3ggPSBNYXRoLmFzaW4oIGNsYW1wKCBtMzIsIC0gMSwgMSApICk7XG5cblx0XHRcdGlmICggTWF0aC5hYnMoIG0zMiApIDwgMC45OTk5OSApIHtcblxuXHRcdFx0XHR0aGlzLl95ID0gTWF0aC5hdGFuMiggLSBtMzEsIG0zMyApO1xuXHRcdFx0XHR0aGlzLl96ID0gTWF0aC5hdGFuMiggLSBtMTIsIG0yMiApO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdHRoaXMuX3kgPSAwO1xuXHRcdFx0XHR0aGlzLl96ID0gTWF0aC5hdGFuMiggbTIxLCBtMTEgKTtcblxuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIGlmICggb3JkZXIgPT09ICdaWVgnICkge1xuXG5cdFx0XHR0aGlzLl95ID0gTWF0aC5hc2luKCAtIGNsYW1wKCBtMzEsIC0gMSwgMSApICk7XG5cblx0XHRcdGlmICggTWF0aC5hYnMoIG0zMSApIDwgMC45OTk5OSApIHtcblxuXHRcdFx0XHR0aGlzLl94ID0gTWF0aC5hdGFuMiggbTMyLCBtMzMgKTtcblx0XHRcdFx0dGhpcy5feiA9IE1hdGguYXRhbjIoIG0yMSwgbTExICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0dGhpcy5feCA9IDA7XG5cdFx0XHRcdHRoaXMuX3ogPSBNYXRoLmF0YW4yKCAtIG0xMiwgbTIyICk7XG5cblx0XHRcdH1cblxuXHRcdH0gZWxzZSBpZiAoIG9yZGVyID09PSAnWVpYJyApIHtcblxuXHRcdFx0dGhpcy5feiA9IE1hdGguYXNpbiggY2xhbXAoIG0yMSwgLSAxLCAxICkgKTtcblxuXHRcdFx0aWYgKCBNYXRoLmFicyggbTIxICkgPCAwLjk5OTk5ICkge1xuXG5cdFx0XHRcdHRoaXMuX3ggPSBNYXRoLmF0YW4yKCAtIG0yMywgbTIyICk7XG5cdFx0XHRcdHRoaXMuX3kgPSBNYXRoLmF0YW4yKCAtIG0zMSwgbTExICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0dGhpcy5feCA9IDA7XG5cdFx0XHRcdHRoaXMuX3kgPSBNYXRoLmF0YW4yKCBtMTMsIG0zMyApO1xuXG5cdFx0XHR9XG5cblx0XHR9IGVsc2UgaWYgKCBvcmRlciA9PT0gJ1haWScgKSB7XG5cblx0XHRcdHRoaXMuX3ogPSBNYXRoLmFzaW4oIC0gY2xhbXAoIG0xMiwgLSAxLCAxICkgKTtcblxuXHRcdFx0aWYgKCBNYXRoLmFicyggbTEyICkgPCAwLjk5OTk5ICkge1xuXG5cdFx0XHRcdHRoaXMuX3ggPSBNYXRoLmF0YW4yKCBtMzIsIG0yMiApO1xuXHRcdFx0XHR0aGlzLl95ID0gTWF0aC5hdGFuMiggbTEzLCBtMTEgKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHR0aGlzLl94ID0gTWF0aC5hdGFuMiggLSBtMjMsIG0zMyApO1xuXHRcdFx0XHR0aGlzLl95ID0gMDtcblxuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0Y29uc29sZS53YXJuKCAnVEhSRUUuRXVsZXI6IC5zZXRGcm9tUm90YXRpb25NYXRyaXgoKSBnaXZlbiB1bnN1cHBvcnRlZCBvcmRlcjogJyArIG9yZGVyIClcblxuXHRcdH1cblxuXHRcdHRoaXMuX29yZGVyID0gb3JkZXI7XG5cblx0XHRpZiAoIHVwZGF0ZSAhPT0gZmFsc2UgKSB0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0c2V0RnJvbVF1YXRlcm5pb246IGZ1bmN0aW9uICgpIHtcblxuXHRcdHZhciBtYXRyaXg7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCBxLCBvcmRlciwgdXBkYXRlICkge1xuXG5cdFx0XHRpZiAoIG1hdHJpeCA9PT0gdW5kZWZpbmVkICkgbWF0cml4ID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcblx0XHRcdG1hdHJpeC5tYWtlUm90YXRpb25Gcm9tUXVhdGVybmlvbiggcSApO1xuXHRcdFx0dGhpcy5zZXRGcm9tUm90YXRpb25NYXRyaXgoIG1hdHJpeCwgb3JkZXIsIHVwZGF0ZSApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdHNldEZyb21WZWN0b3IzOiBmdW5jdGlvbiAoIHYsIG9yZGVyICkge1xuXG5cdFx0cmV0dXJuIHRoaXMuc2V0KCB2LngsIHYueSwgdi56LCBvcmRlciB8fCB0aGlzLl9vcmRlciApO1xuXG5cdH0sXG5cblx0cmVvcmRlcjogZnVuY3Rpb24gKCkge1xuXG5cdFx0Ly8gV0FSTklORzogdGhpcyBkaXNjYXJkcyByZXZvbHV0aW9uIGluZm9ybWF0aW9uIC1iaG91c3RvblxuXG5cdFx0dmFyIHEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICggbmV3T3JkZXIgKSB7XG5cblx0XHRcdHEuc2V0RnJvbUV1bGVyKCB0aGlzICk7XG5cdFx0XHR0aGlzLnNldEZyb21RdWF0ZXJuaW9uKCBxLCBuZXdPcmRlciApO1xuXG5cdFx0fTtcblxuXHR9KCksXG5cblx0ZXF1YWxzOiBmdW5jdGlvbiAoIGV1bGVyICkge1xuXG5cdFx0cmV0dXJuICggZXVsZXIuX3ggPT09IHRoaXMuX3ggKSAmJiAoIGV1bGVyLl95ID09PSB0aGlzLl95ICkgJiYgKCBldWxlci5feiA9PT0gdGhpcy5feiApICYmICggZXVsZXIuX29yZGVyID09PSB0aGlzLl9vcmRlciApO1xuXG5cdH0sXG5cblx0ZnJvbUFycmF5OiBmdW5jdGlvbiAoIGFycmF5ICkge1xuXG5cdFx0dGhpcy5feCA9IGFycmF5WyAwIF07XG5cdFx0dGhpcy5feSA9IGFycmF5WyAxIF07XG5cdFx0dGhpcy5feiA9IGFycmF5WyAyIF07XG5cdFx0aWYgKCBhcnJheVsgMyBdICE9PSB1bmRlZmluZWQgKSB0aGlzLl9vcmRlciA9IGFycmF5WyAzIF07XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2soKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0dG9BcnJheTogZnVuY3Rpb24gKCkge1xuXG5cdFx0cmV0dXJuIFsgdGhpcy5feCwgdGhpcy5feSwgdGhpcy5feiwgdGhpcy5fb3JkZXIgXTtcblxuXHR9LFxuXG5cdHRvVmVjdG9yMzogZnVuY3Rpb24gKCBvcHRpb25hbFJlc3VsdCApIHtcblxuXHRcdGlmICggb3B0aW9uYWxSZXN1bHQgKSB7XG5cblx0XHRcdHJldHVybiBvcHRpb25hbFJlc3VsdC5zZXQoIHRoaXMuX3gsIHRoaXMuX3ksIHRoaXMuX3ogKTtcblxuXHRcdH0gZWxzZSB7XG5cblx0XHRcdHJldHVybiBuZXcgVEhSRUUuVmVjdG9yMyggdGhpcy5feCwgdGhpcy5feSwgdGhpcy5feiApO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0b25DaGFuZ2U6IGZ1bmN0aW9uICggY2FsbGJhY2sgKSB7XG5cblx0XHR0aGlzLm9uQ2hhbmdlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH0sXG5cblx0b25DaGFuZ2VDYWxsYmFjazogZnVuY3Rpb24gKCkge30sXG5cblx0Y2xvbmU6IGZ1bmN0aW9uICgpIHtcblxuXHRcdHJldHVybiBuZXcgVEhSRUUuRXVsZXIoIHRoaXMuX3gsIHRoaXMuX3ksIHRoaXMuX3osIHRoaXMuX29yZGVyICk7XG5cblx0fVxuXG59O1xuLyoqKiBFTkQgRXVsZXIgKioqL1xuLyoqKiBTVEFSVCBNYXRoICoqKi9cbi8qKlxuICogQGF1dGhvciBhbHRlcmVkcSAvIGh0dHA6Ly9hbHRlcmVkcXVhbGlhLmNvbS9cbiAqIEBhdXRob3IgbXJkb29iIC8gaHR0cDovL21yZG9vYi5jb20vXG4gKi9cblxuVEhSRUUuTWF0aCA9IHtcblxuXHRnZW5lcmF0ZVVVSUQ6IGZ1bmN0aW9uICgpIHtcblxuXHRcdC8vIGh0dHA6Ly93d3cuYnJvb2ZhLmNvbS9Ub29scy9NYXRoLnV1aWQuaHRtXG5cblx0XHR2YXIgY2hhcnMgPSAnMDEyMzQ1Njc4OUFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonLnNwbGl0KCAnJyApO1xuXHRcdHZhciB1dWlkID0gbmV3IEFycmF5KCAzNiApO1xuXHRcdHZhciBybmQgPSAwLCByO1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0Zm9yICggdmFyIGkgPSAwOyBpIDwgMzY7IGkgKysgKSB7XG5cblx0XHRcdFx0aWYgKCBpID09IDggfHwgaSA9PSAxMyB8fCBpID09IDE4IHx8IGkgPT0gMjMgKSB7XG5cblx0XHRcdFx0XHR1dWlkWyBpIF0gPSAnLSc7XG5cblx0XHRcdFx0fSBlbHNlIGlmICggaSA9PSAxNCApIHtcblxuXHRcdFx0XHRcdHV1aWRbIGkgXSA9ICc0JztcblxuXHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0aWYgKCBybmQgPD0gMHgwMiApIHJuZCA9IDB4MjAwMDAwMCArICggTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMCApIHwgMDtcblx0XHRcdFx0XHRyID0gcm5kICYgMHhmO1xuXHRcdFx0XHRcdHJuZCA9IHJuZCA+PiA0O1xuXHRcdFx0XHRcdHV1aWRbIGkgXSA9IGNoYXJzWyAoIGkgPT0gMTkgKSA/ICggciAmIDB4MyApIHwgMHg4IDogciBdO1xuXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHV1aWQuam9pbiggJycgKTtcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdC8vIENsYW1wIHZhbHVlIHRvIHJhbmdlIDxhLCBiPlxuXG5cdGNsYW1wOiBmdW5jdGlvbiAoIHgsIGEsIGIgKSB7XG5cblx0XHRyZXR1cm4gKCB4IDwgYSApID8gYSA6ICggKCB4ID4gYiApID8gYiA6IHggKTtcblxuXHR9LFxuXG5cdC8vIENsYW1wIHZhbHVlIHRvIHJhbmdlIDxhLCBpbmYpXG5cblx0Y2xhbXBCb3R0b206IGZ1bmN0aW9uICggeCwgYSApIHtcblxuXHRcdHJldHVybiB4IDwgYSA/IGEgOiB4O1xuXG5cdH0sXG5cblx0Ly8gTGluZWFyIG1hcHBpbmcgZnJvbSByYW5nZSA8YTEsIGEyPiB0byByYW5nZSA8YjEsIGIyPlxuXG5cdG1hcExpbmVhcjogZnVuY3Rpb24gKCB4LCBhMSwgYTIsIGIxLCBiMiApIHtcblxuXHRcdHJldHVybiBiMSArICggeCAtIGExICkgKiAoIGIyIC0gYjEgKSAvICggYTIgLSBhMSApO1xuXG5cdH0sXG5cblx0Ly8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TbW9vdGhzdGVwXG5cblx0c21vb3Roc3RlcDogZnVuY3Rpb24gKCB4LCBtaW4sIG1heCApIHtcblxuXHRcdGlmICggeCA8PSBtaW4gKSByZXR1cm4gMDtcblx0XHRpZiAoIHggPj0gbWF4ICkgcmV0dXJuIDE7XG5cblx0XHR4ID0gKCB4IC0gbWluICkgLyAoIG1heCAtIG1pbiApO1xuXG5cdFx0cmV0dXJuIHggKiB4ICogKCAzIC0gMiAqIHggKTtcblxuXHR9LFxuXG5cdHNtb290aGVyc3RlcDogZnVuY3Rpb24gKCB4LCBtaW4sIG1heCApIHtcblxuXHRcdGlmICggeCA8PSBtaW4gKSByZXR1cm4gMDtcblx0XHRpZiAoIHggPj0gbWF4ICkgcmV0dXJuIDE7XG5cblx0XHR4ID0gKCB4IC0gbWluICkgLyAoIG1heCAtIG1pbiApO1xuXG5cdFx0cmV0dXJuIHggKiB4ICogeCAqICggeCAqICggeCAqIDYgLSAxNSApICsgMTAgKTtcblxuXHR9LFxuXG5cdC8vIFJhbmRvbSBmbG9hdCBmcm9tIDwwLCAxPiB3aXRoIDE2IGJpdHMgb2YgcmFuZG9tbmVzc1xuXHQvLyAoc3RhbmRhcmQgTWF0aC5yYW5kb20oKSBjcmVhdGVzIHJlcGV0aXRpdmUgcGF0dGVybnMgd2hlbiBhcHBsaWVkIG92ZXIgbGFyZ2VyIHNwYWNlKVxuXG5cdHJhbmRvbTE2OiBmdW5jdGlvbiAoKSB7XG5cblx0XHRyZXR1cm4gKCA2NTI4MCAqIE1hdGgucmFuZG9tKCkgKyAyNTUgKiBNYXRoLnJhbmRvbSgpICkgLyA2NTUzNTtcblxuXHR9LFxuXG5cdC8vIFJhbmRvbSBpbnRlZ2VyIGZyb20gPGxvdywgaGlnaD4gaW50ZXJ2YWxcblxuXHRyYW5kSW50OiBmdW5jdGlvbiAoIGxvdywgaGlnaCApIHtcblxuXHRcdHJldHVybiBNYXRoLmZsb29yKCB0aGlzLnJhbmRGbG9hdCggbG93LCBoaWdoICkgKTtcblxuXHR9LFxuXG5cdC8vIFJhbmRvbSBmbG9hdCBmcm9tIDxsb3csIGhpZ2g+IGludGVydmFsXG5cblx0cmFuZEZsb2F0OiBmdW5jdGlvbiAoIGxvdywgaGlnaCApIHtcblxuXHRcdHJldHVybiBsb3cgKyBNYXRoLnJhbmRvbSgpICogKCBoaWdoIC0gbG93ICk7XG5cblx0fSxcblxuXHQvLyBSYW5kb20gZmxvYXQgZnJvbSA8LXJhbmdlLzIsIHJhbmdlLzI+IGludGVydmFsXG5cblx0cmFuZEZsb2F0U3ByZWFkOiBmdW5jdGlvbiAoIHJhbmdlICkge1xuXG5cdFx0cmV0dXJuIHJhbmdlICogKCAwLjUgLSBNYXRoLnJhbmRvbSgpICk7XG5cblx0fSxcblxuXHRkZWdUb1JhZDogZnVuY3Rpb24gKCkge1xuXG5cdFx0dmFyIGRlZ3JlZVRvUmFkaWFuc0ZhY3RvciA9IE1hdGguUEkgLyAxODA7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCBkZWdyZWVzICkge1xuXG5cdFx0XHRyZXR1cm4gZGVncmVlcyAqIGRlZ3JlZVRvUmFkaWFuc0ZhY3RvcjtcblxuXHRcdH07XG5cblx0fSgpLFxuXG5cdHJhZFRvRGVnOiBmdW5jdGlvbiAoKSB7XG5cblx0XHR2YXIgcmFkaWFuVG9EZWdyZWVzRmFjdG9yID0gMTgwIC8gTWF0aC5QSTtcblxuXHRcdHJldHVybiBmdW5jdGlvbiAoIHJhZGlhbnMgKSB7XG5cblx0XHRcdHJldHVybiByYWRpYW5zICogcmFkaWFuVG9EZWdyZWVzRmFjdG9yO1xuXG5cdFx0fTtcblxuXHR9KCksXG5cblx0aXNQb3dlck9mVHdvOiBmdW5jdGlvbiAoIHZhbHVlICkge1xuXG5cdFx0cmV0dXJuICggdmFsdWUgJiAoIHZhbHVlIC0gMSApICkgPT09IDAgJiYgdmFsdWUgIT09IDA7XG5cblx0fSxcblxuXHRuZXh0UG93ZXJPZlR3bzogZnVuY3Rpb24gKCB2YWx1ZSApIHtcblxuXHRcdHZhbHVlIC0tO1xuXHRcdHZhbHVlIHw9IHZhbHVlID4+IDE7XG5cdFx0dmFsdWUgfD0gdmFsdWUgPj4gMjtcblx0XHR2YWx1ZSB8PSB2YWx1ZSA+PiA0O1xuXHRcdHZhbHVlIHw9IHZhbHVlID4+IDg7XG5cdFx0dmFsdWUgfD0gdmFsdWUgPj4gMTY7XG5cdFx0dmFsdWUgKys7XG5cblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxufTtcblxuLyoqKiBFTkQgTWF0aCAqKiovXG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUSFJFRTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgVEhSRUUgPSByZXF1aXJlKCcuL3RocmVlLW1hdGguanMnKTtcblxudmFyIFJPVEFURV9TUEVFRCA9IDAuNTtcbi8qKlxuICogUHJvdmlkZXMgYSBxdWF0ZXJuaW9uIHJlc3BvbnNpYmxlIGZvciBwcmUtcGFubmluZyB0aGUgc2NlbmUgYmVmb3JlIGZ1cnRoZXJcbiAqIHRyYW5zZm9ybWF0aW9ucyBkdWUgdG8gZGV2aWNlIHNlbnNvcnMuXG4gKi9cbmZ1bmN0aW9uIFRvdWNoUGFubmVyKCkge1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRoaXMub25Ub3VjaFN0YXJ0Xy5iaW5kKHRoaXMpKTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMub25Ub3VjaE1vdmVfLmJpbmQodGhpcykpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB0aGlzLm9uVG91Y2hFbmRfLmJpbmQodGhpcykpO1xuXG4gIHRoaXMuaXNUb3VjaGluZyA9IGZhbHNlO1xuICB0aGlzLnJvdGF0ZVN0YXJ0ID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgdGhpcy5yb3RhdGVFbmQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICB0aGlzLnJvdGF0ZURlbHRhID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcblxuICB0aGlzLnRoZXRhID0gMDtcbiAgdGhpcy5vcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIHRoaXMuZXVsZXIgPSBuZXcgVEhSRUUuRXVsZXIoKTtcbn1cblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLmdldE9yaWVudGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZXVsZXIuc2V0KDAsIHRoaXMudGhldGEsIDAsICdZWFonKTtcbiAgdGhpcy5vcmllbnRhdGlvbi5zZXRGcm9tRXVsZXIodGhpcy5ldWxlcik7XG4gIHJldHVybiB0aGlzLm9yaWVudGF0aW9uO1xufTtcblxuVG91Y2hQYW5uZXIucHJvdG90eXBlLm9uVG91Y2hTdGFydF8gPSBmdW5jdGlvbihlKSB7XG4gIC8vIE9ubHkgcmVzcG9uZCBpZiB0aGVyZSBpcyBleGFjdGx5IG9uZSB0b3VjaC5cbiAgaWYgKGUudG91Y2hlcy5sZW5ndGggIT0gMSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnJvdGF0ZVN0YXJ0LnNldChlLnRvdWNoZXNbMF0ucGFnZVgsIGUudG91Y2hlc1swXS5wYWdlWSk7XG4gIHRoaXMuaXNUb3VjaGluZyA9IHRydWU7XG59O1xuXG5Ub3VjaFBhbm5lci5wcm90b3R5cGUub25Ub3VjaE1vdmVfID0gZnVuY3Rpb24oZSkge1xuICBpZiAoIXRoaXMuaXNUb3VjaGluZykge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLnJvdGF0ZUVuZC5zZXQoZS50b3VjaGVzWzBdLnBhZ2VYLCBlLnRvdWNoZXNbMF0ucGFnZVkpO1xuICB0aGlzLnJvdGF0ZURlbHRhLnN1YlZlY3RvcnModGhpcy5yb3RhdGVFbmQsIHRoaXMucm90YXRlU3RhcnQpO1xuICB0aGlzLnJvdGF0ZVN0YXJ0LmNvcHkodGhpcy5yb3RhdGVFbmQpO1xuXG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuYm9keTtcbiAgdGhpcy50aGV0YSArPSAyICogTWF0aC5QSSAqIHRoaXMucm90YXRlRGVsdGEueCAvIGVsZW1lbnQuY2xpZW50V2lkdGggKiBST1RBVEVfU1BFRUQ7XG59O1xuXG5Ub3VjaFBhbm5lci5wcm90b3R5cGUub25Ub3VjaEVuZF8gPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMuaXNUb3VjaGluZyA9IGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb3VjaFBhbm5lcjtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG52YXIgVXRpbCA9IHdpbmRvdy5VdGlsIHx8IHt9O1xuXG5VdGlsLmNsYW1wID0gZnVuY3Rpb24odmFsdWUsIG1pbiwgbWF4KSB7XG4gIHJldHVybiBNYXRoLm1pbihNYXRoLm1heChtaW4sIHZhbHVlKSwgbWF4KTtcbn07XG5cblV0aWwubWFwUmFuZ2UgPSBmdW5jdGlvbih2YWx1ZSwgbWluRG9tYWluLCBtYXhEb21haW4sIG1pblJhbmdlLCBtYXhSYW5nZSkge1xuICAvLyBJZiB3ZSdyZSBvdXQgb2YgcmFuZ2UsIHJldHVybiBhbiBpbnZhbGlkIHZhbHVlLlxuICB2YXIgcGVyY2VudCA9ICh2YWx1ZSAtIG1pbkRvbWFpbikgLyAobWF4RG9tYWluIC0gbWluRG9tYWluKTtcbiAgLy8gQ2xhbXAgcGVyY2VudCB0byBbMCwgMV0uXG4gIHBlcmNlbnQgPSBVdGlsLmNsYW1wKHBlcmNlbnQsIDAsIDEpO1xuICByZXR1cm4gbWluUmFuZ2UgKyBwZXJjZW50ICogKG1heFJhbmdlIC0gbWluUmFuZ2UpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsO1xuIiwidmFyIFZSRGV2aWNlID0gcmVxdWlyZSgnLi9iYXNlLmpzJykuVlJEZXZpY2U7XG52YXIgSE1EVlJEZXZpY2UgPSByZXF1aXJlKCcuL2Jhc2UuanMnKS5ITURWUkRldmljZTtcbnZhciBQb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi9iYXNlLmpzJykuUG9zaXRpb25TZW5zb3JWUkRldmljZTtcblxudmFyIENhcmRib2FyZEhNRFZSRGV2aWNlID0gcmVxdWlyZSgnLi9jYXJkYm9hcmQtaG1kLXZyLWRldmljZS5qcycpO1xudmFyIEd5cm9Qb3NpdGlvblNlbnNvclZSRGV2aWNlID0gcmVxdWlyZSgnLi9neXJvLXBvc2l0aW9uLXNlbnNvci12ci1kZXZpY2UuanMnKTtcbnZhciBNb3VzZUtleWJvYXJkUG9zaXRpb25TZW5zb3JWUkRldmljZSA9IHJlcXVpcmUoJy4vbW91c2Uta2V5Ym9hcmQtcG9zaXRpb24tc2Vuc29yLXZyLWRldmljZS5qcycpO1xuXG5cbi8qKlxuICogQHBhcmFtIHtWUkRldmljZX0gZGVmYXVsdERldmljZVxuICogQGNvbnN0cnVjdG9yXG4gKiBAZXh0ZW5kcyB7V2ViVlJQb2x5ZmlsbH1cbiAqL1xudmFyIFdlYlZSUG9seWZpbGxFeHRlbmRlZCA9IGZ1bmN0aW9uKGRlZmF1bHREZXZpY2UpIHtcbiAgdGhpcy5kZXZpY2VzID0gW107XG4gIHRoaXMuX2RlZmF1bHREZXZpY2UgPSBkZWZhdWx0RGV2aWNlIHx8IG5ldyBDYXJkYm9hcmRITURWUkRldmljZSgpO1xuICB0aGlzLmVuYWJsZVBvbHlmaWxsKCk7XG59O1xuXG5XZWJWUlBvbHlmaWxsRXh0ZW5kZWQucHJvdG90eXBlID0ge1xuXG4gIGVuYWJsZVBvbHlmaWxsOiBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuX2dldFZSRGV2aWNlc1Byb21pc2UgPSB0aGlzLmlzV2ViVlJBdmFpbGFibGUoKSA/IG5hdmlnYXRvci5nZXRWUkRldmljZXMoKSA6IFByb21pc2UucmVzb2x2ZShbXSk7XG5cbiAgICAvLyBQcm92aWRlIG5hdmlnYXRvci5nZXRWUkRldmljZXMuXG4gICAgbmF2aWdhdG9yLmdldFZSRGV2aWNlcyA9IHRoaXMuZ2V0VlJEZXZpY2VzLmJpbmQodGhpcyk7XG5cbiAgICAvLyBrZWVwIGEgcmVmZXJlbmNlIG9mIG5hdGl2ZSBWUkRldmljZSBjb25zdHJ1Y3RvclxuICAgIHRoaXMuX25hdGl2ZUNvbnN0cnVjdG9ycyA9IHtcbiAgICAgIFZSRGV2aWNlOiB3aW5kb3cuVlJEZXZpY2UsXG4gICAgICBITURWUkRldmljZTogd2luZG93LkhNRFZSRGV2aWNlXG4gICAgfTtcblxuICAgIHdpbmRvdy5WUkRldmljZSA9IFZSRGV2aWNlO1xuICAgIHdpbmRvdy5ITURWUkRldmljZSA9IEhNRFZSRGV2aWNlO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7VlJEZXZpY2V9IGRldmljZVxuICAgKi9cbiAgc2V0RGVmYXVsdERldmljZTogZnVuY3Rpb24oZGV2aWNlKSB7XG4gICAgaWYoIShkZXZpY2UgaW5zdGFuY2VvZiBITURWUkRldmljZSkpe1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWZhdWx0IGRldmljZSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIEhNRFZSRGV2aWNlLicpO1xuICAgIH1cbiAgICB0aGlzLl9kZWZhdWx0RGV2aWNlID0gZGV2aWNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGdldFZSRGV2aWNlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFZSRGV2aWNlc1Byb21pc2UudGhlbih0aGlzLl9wcm9jZXNzVlJEZXZpY2VzLmJpbmQodGhpcykpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBWUkRldmljZVtdXG4gICAqL1xuICBfcHJvY2Vzc1ZSRGV2aWNlczogZnVuY3Rpb24obmF0aXZlRGV2aWNlcykge1xuXG4gICAgdmFyIGRldmljZUJ5VHlwZSA9IGZ1bmN0aW9uKGRldmljZUxpc3QsIEluc3RhbmNlVHlwZSkge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGRldmljZUxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGRldmljZUxpc3RbaV0gaW5zdGFuY2VvZiBJbnN0YW5jZVR5cGUpIHtcbiAgICAgICAgICByZXR1cm4gZGV2aWNlTGlzdFtpXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZGV2aWNlSE1EVlIgPSB0aGlzLl9kZWZhdWx0RGV2aWNlO1xuXG4gICAgdmFyIGRldmljZVNlbnNvciA9IGRldmljZUJ5VHlwZShuYXRpdmVEZXZpY2VzLCB3aW5kb3cuUG9zaXRpb25TZW5zb3JWUkRldmljZSk7XG4gICAgaWYgKCFkZXZpY2VTZW5zb3IpIHtcbiAgICAgIC8vIG92ZXJyaWRlIHRoZSBuYXRpdmUgY29uc3RydWN0b3IgdG8gYWxsb3cgY2hlY2tzIHdpdGggYGluc3RhbmNlb2ZgXG4gICAgICB3aW5kb3cuUG9zaXRpb25TZW5zb3JWUkRldmljZSA9IFBvc2l0aW9uU2Vuc29yVlJEZXZpY2U7XG4gICAgICBpZiAodGhpcy5pc01vYmlsZSgpKSB7XG4gICAgICAgIGRldmljZVNlbnNvciA9IG5ldyBHeXJvUG9zaXRpb25TZW5zb3JWUkRldmljZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGV2aWNlU2Vuc29yID0gbmV3IE1vdXNlS2V5Ym9hcmRQb3NpdGlvblNlbnNvclZSRGV2aWNlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5kZXZpY2VzID0gW2RldmljZUhNRFZSLCBkZXZpY2VTZW5zb3JdO1xuICAgIHJldHVybiB0aGlzLmRldmljZXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgaXNXZWJWUkF2YWlsYWJsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgnZ2V0VlJEZXZpY2VzJyBpbiBuYXZpZ2F0b3IpIHx8ICgnbW96R2V0VlJEZXZpY2VzJyBpbiBuYXZpZ2F0b3IpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIGlzTW9iaWxlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gL0FuZHJvaWQvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpIHx8XG4gICAgICAvaVBob25lfGlQYWR8aVBvZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gIH1cbn07XG5cblxuV2ViVlJQb2x5ZmlsbEV4dGVuZGVkLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFdlYlZSUG9seWZpbGxFeHRlbmRlZDtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYlZSUG9seWZpbGxFeHRlbmRlZDtcbiJdfQ==
