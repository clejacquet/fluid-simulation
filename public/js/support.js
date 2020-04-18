const getFloatTypeBuilder = (gl, exts, format, inner_format, float_type, half_float_type) => {
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
    gl.vertexAttribPointer(positionLocation, 2, float_type, false, 0, 0);
    
    var whiteTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, whiteTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                    new Uint8Array([255, 255, 255, 255]));
                
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);



    function test(gl, type) {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, inner_format, 1, 1, 0, format, type, null);
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
        gl.vertexAttribPointer(positionLocation, 2, float_type, false, 0, 0);
        
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
        gl.readPixels(0, 0, 1, 1, format, gl.UNSIGNED_BYTE, pixel);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.useProgram(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        
        return !(pixel[0] !== 0 ||
            pixel[1] < 248 ||
            pixel[2] < 248 ||
            pixel[3] < 254);
    }
        
    return () => {
        if (test(gl, float_type)) {
            // alert("float");
            return float_type;
            // return half_float_type;

        } else if (test(gl, half_float_type)) {
            // alert("half_float");
            return half_float_type;
        } else {
            return half_float_type;
        }
    }
};

function loadWebGL1(gl) {
    const exts = {
        color_float: gl.getExtension('EXT_color_buffer_float'),
        texture_float: gl.getExtension('OES_texture_float'),
        texture_float_linear: gl.getExtension('OES_texture_float_linear'),
        texture_half_float: gl.getExtension('OES_texture_half_float'),
        texture_half_float_linear: gl.getExtension('OES_texture_half_float_linear')
    };

    const float_type = getFloatTypeBuilder(gl, exts, gl.RGBA, gl.RGBA, gl.FLOAT, exts.texture_half_float.HALF_FLOAT_OES)();

    return {
        version: 1,
        exts: exts,
        gl: gl,
        float32Support: (float_type == gl.FLOAT),
        float16Support: (float_type == gl.FLOAT || float_type == exts.texture_half_float.HALF_FLOAT_OES),
        format: {
            r: gl.RGBA,
            rg: gl.RGBA,
            rgb: gl.RGBA,
            rgba: gl.RGBA
        },
        inner_format: {
            rf: gl.RGBA,
            rgf: gl.RGBA,
            rgbf: gl.RGBA,
            rgbaf: gl.RGBA
        },
        type: {
            float: float_type
        }
    };
}

function loadWebGL2(gl) {
    const exts = {
        color_float: gl.getExtension('EXT_color_buffer_float'),
        texture_float: gl.getExtension('OES_texture_float'),
        texture_float_linear: gl.getExtension('OES_texture_float_linear')
    };

    const float_type = getFloatTypeBuilder(gl, exts, gl.RGBA, gl.RGBA32F, gl.FLOAT, gl.HALF_FLOAT)();

    return {
        version: 2,
        exts: exts,
        gl: gl,
        float32Support: (float_type == gl.FLOAT),
        float16Support: (float_type == gl.FLOAT || float_type == gl.HALF_FLOAT),
        format: {
            r: gl.RED,
            rg: gl.RG,
            rgb: gl.RGB,
            rgba: gl.RGBA
        },
        inner_format: {
            rf: (float_type == gl.FLOAT) ? gl.R32F : gl.R16F,
            rgf: (float_type == gl.FLOAT) ? gl.RG32F : gl.RG16F,
            rgbf: (float_type == gl.FLOAT) ? gl.RGB32F : gl.RGB16F,
            rgbaf: (float_type == gl.FLOAT) ? gl.RGBA32F : gl.RGBA16F
        },
        type: {
            float: float_type
        }
    };
}

function loadGL(canvas) {
    let gl = canvas.getContext("webgl2", { antialias: false });

    if (!gl) {
        gl = canvas.getContext("webgl", { antialias: false });

        if (!gl) {
            return null;
        } else {
            return loadWebGL1(gl);
        }
    } else {
        return loadWebGL2(gl);
    }
}