var DOMPoint = function(x, y, z, w){
  this.x = x;
  this.y = y;
  this.z = z;
  this.w = w;
};

DOMPoint.prototype.constructor = DOMPoint;

module.exports = DOMPoint;
