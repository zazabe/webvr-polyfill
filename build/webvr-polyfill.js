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
var MouseKeyboardPositionSensorVRDevice = require('../src/mouse-keyboard-position-sensor-vr-device');


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
        deviceSensor = new OrientationPositionSensorVRDevice();
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

},{"../src/base":9,"../src/mouse-keyboard-position-sensor-vr-device":10,"../src/orientation-position-sensor-vr-device":11,"./CardboardHMDVRDevice":1,"./HMDVRDevice":3,"./VRDevice":4}],8:[function(require,module,exports){
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

},{"./base.js":9,"./util.js":13}],11:[function(require,module,exports){
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

},{"./base.js":9,"./touch-panner.js":12,"./util.js":13}],12:[function(require,module,exports){
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

},{}]},{},[8]);
