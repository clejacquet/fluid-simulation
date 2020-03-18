
const getFloatTypeBuilder = (gl, exts) => {
    const vs = 
    `attribute vec4 a_position;
    
    void main() {
        gl_Position = a_position;
    }`
    
    const fs = 
    `precision mediump float;
        uniform vec4 u_color;
        uniform sampler2D u_texture;
        
        void main() {
            gl_FragColor = texture2D(u_texture, vec2(0.5, 0.5)) * u_color;
        }
    `

    // setup GLSL program
    var program = initShaderProgram(gl, vs, fs);
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
                
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);



    function test(gl, format) {
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
            return false;
        }

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
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

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.useProgram(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        
        return !(pixel[0] !== 0 ||
            pixel[1] < 248 ||
            pixel[2] < 248 ||
            pixel[3] < 254);
    }
        
    return () => {
        if (test(gl, gl.FLOAT)) {
            return gl.FLOAT;
        } else {
            return exts.texture_half_float.HALF_FLOAT_OES;
        }
    }
};