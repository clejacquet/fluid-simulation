"use strict";

function log(msg) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(msg));
  document.body.appendChild(div);
}                  

function glEnum(gl, v) {
  for (var key in gl) {
    if (gl[key] === v) {
      return key;
    }
  }
  return "0x" + v.toString(16);
}

window.onload = function() {
  // Get A WebGL context
  var canvas = document.getElementById("c");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }
  
  
  function getExt(name, msg) {
    var ext = gl.getExtension(name);
    log((ext ? "can " : "can **NOT** ") + msg);
    return ext;
  }
  
  var testFloat = getExt("OES_texture_float", "make floating point textures");
  getExt("OES_texture_float_linear", "linear filter floating point textures");
  var testHalfFloat = getExt("OES_texture_half_float", "make half floating point textures");
  getExt("OES_texture_half_float_linear", "linear filter half floating point textures");
  
  gl.HALF_FLOAT_OES = 0x8D61;
  
  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["2d-vertex-shader", "2d-fragment-shader"]);
  gl.useProgram(program);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position"); 
  var colorLoc = gl.getUniformLocation(program, "u_color");

  // provide texture coordinates for the rectangle.
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     -1.0, -1.0,
      1.0, -1.0,
     -1.0,  1.0,
     -1.0,  1.0,
      1.0, -1.0,
      1.0,  1.0]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  
  var whiteTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, whiteTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                new Uint8Array([255, 255, 255, 255]));
  
  function test(format) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, format, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      log("can **NOT** render to " + glEnum(gl, format) + " texture");
      return;
    }
    
    // Draw the rectangle.
    gl.bindTexture(gl.TEXTURE_2D, whiteTex);
    gl.uniform4fv(colorLoc, [0, 10, 20, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.uniform4fv(colorLoc, [0, 1/10, 1/20, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    var pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    
    if (pixel[0] !== 0 ||
        pixel[1] < 248 ||
        pixel[2] < 248 ||
        pixel[3] < 254) {
      log("FAIL!!!: Was not able to actually render to " + glEnum(gl, format) + " texture");
    } else {
      log("succesfully rendered to " + glEnum(gl, format) + " texture");
    }    
  }
  if (testFloat) {
    test(gl.FLOAT);
  }
  if (testHalfFloat) {
    test(gl.HALF_FLOAT_OES);
  }
}