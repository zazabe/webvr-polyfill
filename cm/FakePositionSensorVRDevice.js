var PositionSensorVRDevice = require('../src/base.js').PositionSensorVRDevice;


function FakePositionSensorVRDevice() {
  this.deviceId = 'webvr-polyfill:fake';
  this.deviceName = 'VR Position Device (webvr-polyfill:fake)';

  // State variables for calculations.
  this.euler = new THREE.Euler();
  this.orientation = new THREE.Quaternion();
}
FakePositionSensorVRDevice.prototype = new PositionSensorVRDevice();

FakePositionSensorVRDevice.prototype.setRotation = function(vector, order) {
  this.euler.setFromVector3(vector, order);
};

FakePositionSensorVRDevice.prototype.addRotation = function(vector, order) {
  this.euler.setFromVector3(
    this.euler.toVector3().add(vector), order
  );
};

FakePositionSensorVRDevice.prototype.getState = function() {
  this.orientation.setFromEuler(this.euler);
  return {
    hasOrientation: true,
    orientation: this.orientation,
    hasPosition: false,
    position: null
  }
};

FakePositionSensorVRDevice.prototype.resetSensor = function() {
  console.error('Not implemented yet.');
};

module.exports = FakePositionSensorVRDevice;
