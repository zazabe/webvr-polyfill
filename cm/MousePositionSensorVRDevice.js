var MouseKeyboardPositionSensorVRDevice = require('../src/mouse-keyboard-position-sensor-vr-device');

function MousePositionSensorVRDevice() {
  MouseKeyboardPositionSensorVRDevice.call(this);
  this.deviceId = 'webvr-polyfill:mouse';
  this.deviceName = 'VR Position Device (webvr-polyfill:mouse)';
}

MousePositionSensorVRDevice.prototype = Object.create(MouseKeyboardPositionSensorVRDevice.prototype);
MousePositionSensorVRDevice.prototype.constructor = MousePositionSensorVRDevice;
MousePositionSensorVRDevice.prototype.onKeyDown_ = function() {
};

module.exports = MousePositionSensorVRDevice;
