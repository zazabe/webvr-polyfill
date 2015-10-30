var VRFieldOfView = function(fov) {
  this.upDegrees = fov / 2;
  this.rightDegrees = fov / 2;
  this.downDegrees = fov / 2;
  this.leftDegrees = fov / 2;
};

VRFieldOfView.prototype.constructor = VRFieldOfView;

module.exports = VRFieldOfView;
