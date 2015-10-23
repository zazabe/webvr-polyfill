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
