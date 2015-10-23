var VRDevice = function(hardwareUnitId, deviceId, deviceName){
  this.hardwareUnitId = hardwareUnitId;
  this.deviceId = deviceId;
  this.deviceName = deviceName;
};

VRDevice.prototype = {};
VRDevice.prototype.constructor = VRDevice;

module.exports = VRDevice;
