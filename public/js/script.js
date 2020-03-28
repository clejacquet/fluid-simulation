

const vsRender = 
`attribute vec3 pos;

varying vec2 rel_coords;

void main() {
    gl_Position = vec4(pos, 1.0);

    rel_coords = pos.xy * 0.5 + 0.5;
}
`;

const fsRender = 
`
varying mediump vec2 rel_coords;

uniform sampler2D tex;
uniform mediump float dt;

void main() {
    mediump vec4 color = texture2D(tex, rel_coords);

    // mediump float red_val = dt - floor(dt);
    // mediump vec3 color = vec3(0.2, 0.6, 1.0);

    // color = color_factor.x * color;
    gl_FragColor = vec4(color.rgb, 1.0);
}
`;

const fsAdvectBoundary = 
`
varying mediump vec2 rel_coords;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform mediump float viscosity;
uniform ivec2 size;


mediump vec2 advect_boundary(ivec2 coords) {
    mediump vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));

    if (coords.x == 0 && coords.y == 0) {
        return - texture2D(velocity_sampler, rel_coords + vec2(d.x, d.y)).xy;
    }
    else if (coords.x == size.x - 1 && coords.y == size.y - 1) {
        return - texture2D(velocity_sampler, rel_coords + vec2(-d.x, -d.y)).xy;
    }
    else if (coords.x == size.x - 1 && coords.y == 0) {
        return - texture2D(velocity_sampler, rel_coords + vec2(-d.x, d.y)).xy;
    }
    else if (coords.x == 0 && coords.y == size.y - 1) {
        return - texture2D(velocity_sampler, rel_coords + vec2(d.x, -d.y)).xy;
    }
    else if (coords.x == 0) {
        return - texture2D(velocity_sampler, rel_coords + vec2(d.x, 0.0)).xy;
    }
    else if (coords.x == size.x - 1) {
        return - texture2D(velocity_sampler, rel_coords + vec2(-d.x, 0.0)).xy;
    }
    else if (coords.y == 0) {
        return - texture2D(velocity_sampler, rel_coords + vec2(0.0, d.y)).xy;
    }
    else if (coords.y == size.y - 1) {
        return - texture2D(velocity_sampler, rel_coords + vec2(0.0, -d.y)).xy;
    }

    return texture2D(velocity_sampler, rel_coords).xy;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(advect_boundary(coords), 0.0, 0.0);
}
`;

const fsFirstColor =
`
varying mediump vec2 rel_coords;

void main() {
    // gl_FragColor = vec4(0.7071 - length(rel_coords - vec2(0.5, 0.5)), 0.0, 0.0, 0.0);
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
}
`;

const fsSetColor =
`
varying mediump vec2 rel_coords;

uniform mediump float timestep;

uniform sampler2D color_sampler;

uniform mediump vec2 dx;
uniform mediump float viscosity;
uniform ivec2 click_pos;
uniform ivec2 size_color;
uniform mediump vec2 force_dir;
uniform mediump vec3 new_color;


void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size_color)));
    mediump float factor = 500.0 * timestep * length(force_dir) * exp(-  distance(vec2(coords), vec2(click_pos)) / 10.0);
    factor = clamp(factor, 0.0, 1.0);

    mediump vec3 old_color = texture2D(color_sampler, rel_coords).rgb;
    gl_FragColor = vec4((1.0 - factor) * old_color + factor * new_color, 0.0);
    // gl_FragColor = vec4(new_color, 0.0);
}
`

const fsAdvectColor =
`
varying mediump vec2 rel_coords;

uniform sampler2D color_sampler;
uniform sampler2D velocity_sampler;

uniform mediump float timestep;

uniform mediump float dx;

uniform ivec2 size;
uniform ivec2 size_color;


mediump vec3 advect(ivec2 coords) {
    mediump vec2 velocity_value = texture2D(velocity_sampler, rel_coords).xy;
    // mediump vec2 velocity_value = vec2(0, -60);

    velocity_value /= vec2(size - ivec2(1));

    mediump vec2 rel_prev_coords = rel_coords - timestep * dx * velocity_value;

    clamp(rel_prev_coords, vec2(0.0), vec2(1.0));

    return 0.995 * texture2D(color_sampler, rel_prev_coords).rgb;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size_color)));

    gl_FragColor = vec4(advect(coords), 0.0);
}
`;

const fsAdvectVelocity =
`
varying mediump vec2 rel_coords;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;

uniform mediump float dx;

uniform ivec2 size;


mediump vec2 advect(ivec2 coords) {
    mediump vec2 velocity_value = texture2D(velocity_sampler, rel_coords).xy;

    velocity_value /= vec2(size - ivec2(1));

    mediump vec2 rel_prev_coords = rel_coords - timestep * dx * velocity_value;

    clamp(rel_prev_coords, vec2(0.0), vec2(1.0));

    return texture2D(velocity_sampler, rel_prev_coords).xy;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(advect(coords), 0.0, 0.0);
}
`;

const fsAdvectPressure =
`varying mediump vec2 rel_coords;

uniform sampler2D pressure_sampler;
uniform sampler2D velocity_sampler;

uniform mediump float timestep;

uniform mediump float dx;

uniform ivec2 size;


mediump float advect(ivec2 coords) {
    mediump vec2 velocity_value = texture2D(velocity_sampler, rel_coords).xy;

    velocity_value /= vec2(size - ivec2(1));

    mediump vec2 rel_prev_coords = rel_coords - timestep * dx * velocity_value;

    clamp(rel_prev_coords, vec2(0.0), vec2(1.0));

    return texture2D(pressure_sampler, rel_prev_coords).x;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(advect(coords), 0.0, 0.0, 0.0);
}
`;

const fsDiffuse =
`
varying mediump vec2 rel_coords;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform mediump float viscosity;
uniform ivec2 size;


mediump vec2 velocity_diffuse(ivec2 coords) {
    mediump vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));
    mediump float alpha = dx * dx / (viscosity * timestep);
    mediump float r_beta = 1.0 / (4.0 + alpha);

    mediump vec2 diffused_velocity;

    if (rel_coords.x > 0.0 && rel_coords.x < 1.0 && rel_coords.y > 0.0 && rel_coords.y < 1.0) {
        mediump vec2 xL = texture2D(velocity_sampler, rel_coords - vec2(d.x, 0)).xy;
        mediump vec2 xR = texture2D(velocity_sampler, rel_coords + vec2(d.x, 0)).xy;
        mediump vec2 xB = texture2D(velocity_sampler, rel_coords - vec2(0, d.y)).xy;
        mediump vec2 xT = texture2D(velocity_sampler, rel_coords + vec2(0, d.y)).xy;

        mediump vec2 b = texture2D(velocity_sampler, rel_coords).xy;

        diffused_velocity = (xL + xR + xB + xT + alpha * b) * r_beta;
    } else {
        diffused_velocity = texture2D(velocity_sampler, rel_coords).xy;
    }

    return diffused_velocity;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(velocity_diffuse(coords), 0.0, 0.0);
}
`

const fsApplyForce =
`
varying mediump vec2 rel_coords;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform ivec2 size;
uniform ivec2 click_pos;
uniform mediump vec2 force_dir;


mediump vec2 applyForce(ivec2 coords) {
    mediump vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));

    if (coords.x > 0 && coords.x < size.x - 1 && coords.y > 0 && coords.y < size.x - 1) {
        mediump vec2 v_xy = 1000.0 * timestep * force_dir * exp(- distance(vec2(coords), vec2(click_pos)) * distance(vec2(coords), vec2(click_pos)) / 5.0);
        // mediump vec2 v_xy = 250.0 * vec2(0.0, -1.0) * exp(- distance(vec2(coords), vec2(click_pos)) * distance(vec2(coords), vec2(click_pos)) / 100.0);
        // mediump vec2 dir = vec2(click_pos) - vec2(coords);
        // mediump vec2 v_xy = length(dir) < 10.0 ? normalize(dir) * 40.0 : vec2(0.0);
        // mediump vec2 v_xy = vec2(0.0, -50.0);
        return v_xy + texture2D(velocity_sampler, rel_coords).xy;
    }

    return vec2(0.0, 0.0);
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(applyForce(coords), 0.0, 0.0);
}
`

const fsDivergence =
`
varying mediump vec2 rel_coords;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform mediump float viscosity;
uniform ivec2 size;


mediump float divergence_calc(ivec2 coords) {
    mediump vec2 d = vec2(1.0) / (vec2(size) - vec2(1));
    mediump float halfrdx = 0.5 / dx;

    if (rel_coords.x > 0.0 && rel_coords.x < 1.0 && rel_coords.y > 0.0 && rel_coords.y < 1.0) {
        mediump vec2 xL = texture2D(velocity_sampler, rel_coords - vec2(d.x, 0)).xy;
        mediump vec2 xR = texture2D(velocity_sampler, rel_coords + vec2(d.x, 0)).xy;
        mediump vec2 xB = texture2D(velocity_sampler, rel_coords - vec2(0, d.y)).xy;
        mediump vec2 xT = texture2D(velocity_sampler, rel_coords + vec2(0, d.y)).xy;

        return halfrdx * ((xR.x - xL.x) + (xT.y - xB.y));
    }

    return 0.0;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(divergence_calc(coords), 0.0, 0.0, 0.0);
}`;

const fsPressureBoundary =
`
varying mediump vec2 rel_coords;

uniform sampler2D pressure_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform ivec2 size;


mediump float pressure_boundary(ivec2 coords) {
    mediump vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));

    if (coords.x == 0 && coords.y == 0) {
        return texture2D(pressure_sampler, rel_coords + vec2(d.x, d.y)).x;
    }
    else if (coords.x == size.x - 1 && coords.y == size.y - 1) {
        return texture2D(pressure_sampler, rel_coords + vec2(-d.x, -d.y)).x;
    }
    else if (coords.x == size.x - 1 && coords.y == 0) {
        return texture2D(pressure_sampler, rel_coords + vec2(-d.x, d.y)).x;
    }
    else if (coords.x == 0 && coords.y == size.y - 1) {
        return texture2D(pressure_sampler, rel_coords + vec2(d.x, -d.y)).x;
    }
    else if (coords.x == 0) {
        return texture2D(pressure_sampler, rel_coords + vec2(d.x, 0.0)).x;
    }
    else if (coords.x == size.x - 1) {
        return texture2D(pressure_sampler, rel_coords + vec2(-d.x, 0.0)).x;
    }
    else if (coords.y == 0) {
        return texture2D(pressure_sampler, rel_coords + vec2(0.0, d.y)).x;
    }
    else if (coords.y == size.y - 1) {
        return texture2D(pressure_sampler, rel_coords + vec2(0.0, -d.y)).x;
    }

    return texture2D(pressure_sampler, rel_coords).x;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(pressure_boundary(coords), 0.0, 0.0, 0.0);
}`;


const fsPressureSolve =
`
varying mediump vec2 rel_coords;

uniform sampler2D pressure_sampler;
uniform sampler2D divergence_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform ivec2 size;


mediump float pressure_solve(ivec2 coords) {
    mediump vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));

    mediump float alpha = -dx * dx;
    mediump float r_beta = 1.0 / 4.0;

    mediump float pressure_val;

    if (rel_coords.x >= 0.0 && rel_coords.x <= 1.0 && rel_coords.y >= 0.0 && rel_coords.y <= 1.0) {
        mediump float pL = texture2D(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        mediump float pR = texture2D(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        mediump float pB = texture2D(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        mediump float pT = texture2D(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        mediump float b = texture2D(divergence_sampler, rel_coords).x;

        pressure_val = (pL + pR + pB + pT + alpha * b) * r_beta;
    } else {
        pressure_val = texture2D(pressure_sampler, rel_coords).x;
    }

    return pressure_val;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(pressure_solve(coords), 0.0, 0.0, 0.0);
}`;

const fsGradientSub =
`
varying mediump vec2 rel_coords;

uniform sampler2D velocity_sampler;
uniform sampler2D pressure_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform mediump float viscosity;
uniform ivec2 size;


mediump vec2 gradient_sub(ivec2 coords) {
    mediump vec2 d = vec2(1.0) / (vec2(size) - vec2(1));
    
    mediump float halfrdx = 0.5 / dx;

    if (rel_coords.x > 0.0 && rel_coords.x < 1.0 && rel_coords.y > 0.0 && rel_coords.y < 1.0) {
        mediump float pL = texture2D(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        mediump float pR = texture2D(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        mediump float pB = texture2D(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        mediump float pT = texture2D(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        mediump vec2 current_velocity = texture2D(velocity_sampler, rel_coords).xy;
        return current_velocity - halfrdx * vec2(pR - pL, pT - pB);
    } else {
        return texture2D(velocity_sampler, rel_coords).xy;
    }
}


void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(gradient_sub(coords), 0.0, 0.0);
}
`;

const SCREEN_WIDTH = 1024;
const SCREEN_HEIGHT = 1024;
const SIM_WIDTH = 128;
const SIM_HEIGHT = 128;

let color_vec = [ 0.3, 0.5, 0.0 ];
let total_dt = 0.0;

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r: r,
        g: g,
        b: b
    };
}

function drawScene(gl, quad, shaders, textures, framebuffers, deltaTime) {
    total_dt += deltaTime * 0.0001;

    gl.viewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    
    // Set the shader uniforms
    quad.bind(gl);
    gl.useProgram(shaders.render);

    color_vec[0] = (color_vec[0] + deltaTime / 5000) % 1.0;
    color_vec[1] = (color_vec[1] + deltaTime / 5000) % 1.0;
    color_vec[2] = (color_vec[2] + deltaTime / 5000) % 1.0;

    gl.uniform3f(gl.getUniformLocation(shaders.render, "color"), color_vec[0], color_vec[1], color_vec[2]);
    gl.uniform1f(gl.getUniformLocation(shaders.render, "dt"), total_dt);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.color1);

    gl.uniform1i(gl.getUniformLocation(shaders.render, "tex"), 0);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}


function generateEmptyTextureData(width, height) {
    const data = new Array(4 * width * height);

    for (let j = 0; j < 4 * width * height; ++j) {
        data[j] = 0.1;
    }

    return new Float32Array(data);
}

function generateTextureData(width, height) {
    const data = new Uint16Array(4 * width * height);

    const max_distance = Math.sqrt(Math.pow(width * 0.5, 2) + Math.pow(height * 0.5, 2));

    for (let j = 0; j < height; ++j) {
        for (let i = 0; i < width; ++i) {
            const distance = Math.sqrt(Math.pow(width * 0.5 - i, 2) + Math.pow(height * 0.5 - j, 2)) / max_distance;

            data[(j * width + i) * 4 + 0] = toHalf(Math.pow(1.0 - distance, 2.0));
        }
    }

    return data;
}

function generateVelocityData(width, height) {
    const data = new Uint16Array(4 * width * height);


    for (let j = 0; j < height; ++j) {
        for (let i = 0; i < width; ++i) {
            data[(j * width + i) * 4 + 0] = toHalf(0.0);
            data[(j * width + i) * 4 + 1] = toHalf(0.0);
            data[(j * width + i) * 4 + 2] = toHalf(0.0);
            data[(j * width + i) * 4 + 3] = toHalf(0.0);
        }
    }

    return data;
}

let counter = 0;
class Framebuffer {

    constructor(fb) {
        this.id = counter++;
        this.fb = fb;
    }

}

function loadFramebuffer(gl, texture) {
    // Create and bind the framebuffer
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return new Framebuffer(fb);
}

function runStep(gl, context, quad, shader, framebuffer, textures) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.fb);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    
    // Set the shader uniforms
    quad.bind(gl);
    gl.useProgram(shader);

    textures.forEach((texture, i) => {
        gl.activeTexture(gl[`TEXTURE${i}`]);
        gl.bindTexture(gl.TEXTURE_2D, texture.id);
        gl.uniform1i(gl.getUniformLocation(shader, texture.name), i);
    });

    gl.uniform1f(gl.getUniformLocation(shader, "timestep"), 0.033);
    gl.uniform1f(gl.getUniformLocation(shader, "dx"), 1.0);
    gl.uniform1f(gl.getUniformLocation(shader, "viscosity"), 0.1);
    gl.uniform2i(gl.getUniformLocation(shader, "size"), SIM_WIDTH, SIM_HEIGHT);
    gl.uniform2i(gl.getUniformLocation(shader, "size_color"), SCREEN_WIDTH, SCREEN_HEIGHT);

    if (context.new_color) {
        gl.uniform3f(gl.getUniformLocation(shader, "new_color"), context.new_color[0], context.new_color[1], context.new_color[2]);
        
        if (context.click_pos) {
            // console.log((SCREEN_WIDTH - 1) * context.click_pos[0], (SCREEN_HEIGHT - 1) * context.click_pos[1]);
            gl.uniform2i(gl.getUniformLocation(shader, "click_pos"), (SCREEN_WIDTH - 1) * context.click_pos[0], (SCREEN_HEIGHT - 1) * context.click_pos[1]);
        }
    } else {
        if (context.click_pos) {
            // console.log((SIM_WIDTH - 1) * context.click_pos[0], (SIM_HEIGHT - 1) * context.click_pos[1]);
            gl.uniform2i(gl.getUniformLocation(shader, "click_pos"), (SIM_WIDTH - 1) * context.click_pos[0], (SIM_HEIGHT - 1) * context.click_pos[1]);
        }
    }

    if (context.force_dir) {
        gl.uniform2f(gl.getUniformLocation(shader, "force_dir"), (SIM_WIDTH - 1) * context.force_dir.x, (SIM_HEIGHT - 1) * context.force_dir.y);
    }

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    // gl.bindVertexArray(null);
}

function supportedFloatType() {

}

function main() {
    const canvas = document.querySelector("#glCanvas");

    let click_pos;
    let force_dir = {
        x: 0,
        y: 0
    };
    
    // canvas.addEventListener("touch", (e) => {
    //     const x = e.clientX - canvas.getBoundingClientRect().left;
    //     const y = SCREEN_HEIGHT - (e.clientY - canvas.getBoundingClientRect().top) - 1;

    //     click_pos = [x / (SCREEN_WIDTH - 1), y / (SCREEN_HEIGHT - 1)];
    // });

    // Initialisation du contexte WebGL
    const gl = canvas.getContext("webgl", { antialias: false });
    
    // Continuer seulement si WebGL est disponible et fonctionnel
    if (!gl) {
        alert("Impossible d'initialiser WebGL. Votre navigateur ou votre machine peut ne pas le supporter.");
        return;
    }

    const exts = {
        color_float: gl.getExtension('EXT_color_buffer_float'),
        texture_float: gl.getExtension('OES_texture_float'),
        texture_float_linear: gl.getExtension('OES_texture_float_linear'),
        texture_half_float: gl.getExtension('OES_texture_half_float'),
        texture_half_float_linear: gl.getExtension('OES_texture_half_float_linear')
    };
    
    
    const getFloatType = getFloatTypeBuilder(gl, exts);
    
    const quad = new Quad(gl);
    const render_shader = initShaderProgram(gl, vsRender, fsRender);
    const first_color_shader = initShaderProgram(gl, vsRender, fsFirstColor);
    const set_color_shader = initShaderProgram(gl, vsRender, fsSetColor);
    const advect_boundary_shader = initShaderProgram(gl, vsRender, fsAdvectBoundary);
    const advect_color_shader = initShaderProgram(gl, vsRender, fsAdvectColor);
    const advect_velocity_shader = initShaderProgram(gl, vsRender, fsAdvectVelocity);
    const advect_pressure_shader = initShaderProgram(gl, vsRender, fsAdvectPressure);
    const diffuse_shader = initShaderProgram(gl, vsRender, fsDiffuse);
    const apply_force_shader = initShaderProgram(gl, vsRender, fsApplyForce);
    const divergence_shader = initShaderProgram(gl, vsRender, fsDivergence);
    const pressure_boundary_shader = initShaderProgram(gl, vsRender, fsPressureBoundary);
    const pressure_solve_shader = initShaderProgram(gl, vsRender, fsPressureSolve);
    const gradient_sub_shader = initShaderProgram(gl, vsRender, fsGradientSub);
    

    const float_type = getFloatType();

    // const color1 = loadTextureData(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.RGBA, gl.RGBA, hf_ext.HALF_FLOAT_OES);
    const color1 = loadTextureData(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.RGBA, gl.RGBA, float_type);
    const color2 = loadTextureData(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.RGBA, gl.RGBA, float_type);
    const velocity1 = loadTextureData(gl, SIM_WIDTH, SIM_HEIGHT, gl.RGBA, gl.RGBA, float_type);
    const velocity2 = loadTextureData(gl, SIM_WIDTH, SIM_HEIGHT, gl.RGBA, gl.RGBA, float_type);
    const pressure1 = loadTexture(gl, SIM_WIDTH, SIM_HEIGHT, gl.RGBA, gl.RGBA, float_type);
    const pressure2 = loadTexture(gl, SIM_WIDTH, SIM_HEIGHT, gl.RGBA, gl.RGBA, float_type);
    const divergence = loadTexture(gl, SIM_WIDTH, SIM_HEIGHT, gl.RGBA, gl.RGBA, float_type);

    const color1_fb = loadFramebuffer(gl, color1);
    const color2_fb = loadFramebuffer(gl, color2);
    const velocity1_fb = loadFramebuffer(gl, velocity1);
    const velocity2_fb = loadFramebuffer(gl, velocity2);
    const pressure1_fb = loadFramebuffer(gl, pressure1);
    const pressure2_fb = loadFramebuffer(gl, pressure2);
    const divergence_fb = loadFramebuffer(gl, divergence);

    let then = 0.0;

    const textures = {
        color1: color1,
        color2: color2,
        velocity1: velocity1,
        velocity2: velocity2,
        pressure1: pressure1,
        pressure2: pressure2,
        divergence: divergence
    };

    const framebuffers = {
        color1: color1_fb,
        color2: color2_fb,
        velocity1: velocity1_fb,
        velocity2: velocity2_fb,
        pressure1: pressure1_fb,
        pressure2: pressure2_fb,
        divergence: divergence_fb
    };

    const shaders = {
        render: render_shader,
        first_color: first_color_shader,
        set_color: set_color_shader,
        advect_boundary: advect_boundary_shader,
        advect_color: advect_color_shader,
        advect_velocity: advect_velocity_shader,
        advect_pressure: advect_pressure_shader,
        diffuse: diffuse_shader,
        apply_force: apply_force_shader,
        divergence: divergence_shader,
        pressure_boundary: pressure_boundary_shader,
        pressure_solve: pressure_solve_shader,
        gradient_sub: gradient_sub_shader
    };

    const context = {
        timestep: 0.033,
        dx: 1.0,
        viscosity: 0.1
    };
    
    let reset = false;

    let old_click_pos;

    let is_button_down = false;

    let splat_color;

    const mouse_down_func = (e) => {
        is_button_down = true;

        const x = e.clientX - canvas.getBoundingClientRect().left;
        const y = SCREEN_HEIGHT - (e.clientY - canvas.getBoundingClientRect().top) - 1;
        
        old_click_pos = [x / (SCREEN_WIDTH - 1), y / (SCREEN_HEIGHT - 1)];

        splat_color = HSVtoRGB(Math.random(), 1, 1);
        splat_color = [splat_color.r, splat_color.g, splat_color.b];
    };

    const touch_down_func = (e) => {
        is_button_down = true;

        const x = e.changedTouches[0].clientX - canvas.getBoundingClientRect().left;
        const y = SCREEN_HEIGHT - (e.changedTouches[0].clientY - canvas.getBoundingClientRect().top) - 1;
        
        old_click_pos = [x / (SCREEN_WIDTH - 1), y / (SCREEN_HEIGHT - 1)];

        splat_color = HSVtoRGB(Math.random(), 1, 1);
        splat_color = [splat_color.r, splat_color.g, splat_color.b];
    };

    const up_func = (e) => {
        is_button_down = false;
        old_click_pos = null;
        click_pos = null;
    };

    const mouse_move_func =  (e) => {
        if (!is_button_down) {
            return;
        }

        
        const x = e.clientX - canvas.getBoundingClientRect().left;
        const y = SCREEN_HEIGHT - (e.clientY - canvas.getBoundingClientRect().top) - 1;
        
        click_pos = [x / (SCREEN_WIDTH - 1), y / (SCREEN_HEIGHT - 1)];
        
        if (old_click_pos) {
            force_dir.x += click_pos[0] - old_click_pos[0];
            force_dir.y += click_pos[1] - old_click_pos[1];
        }
        // console.log([force_dir.x, force_dir.y, click_pos.x, click_pos.y ]);

        old_click_pos = click_pos;
    };

    const touch_move_func =  (e) => {
        if (!is_button_down) {
            return;
        }

        
        const x = e.changedTouches[0].clientX - canvas.getBoundingClientRect().left;
        const y = SCREEN_HEIGHT - (e.changedTouches[0].clientY - canvas.getBoundingClientRect().top) - 1;
        
        click_pos = [x / (SCREEN_WIDTH - 1), y / (SCREEN_HEIGHT - 1)];
        
        if (old_click_pos) {
            force_dir.x += click_pos[0] - old_click_pos[0];
            force_dir.y += click_pos[1] - old_click_pos[1];
        }
        console.log([force_dir.x, force_dir.y, click_pos.x, click_pos.y ]);

        old_click_pos = click_pos;

        e.preventDefault();
    };

    canvas.addEventListener("mousedown", mouse_down_func, false);
    canvas.addEventListener("touchstart", touch_down_func, false);

    window.addEventListener("mouseup", up_func, false);
    window.addEventListener("touchend", up_func, false);

    canvas.addEventListener("mousemove", mouse_move_func, false);
    canvas.addEventListener("touchmove", touch_move_func, false);

    runStep(gl, context, quad, shaders.first_color, framebuffers.color1, []);

    const step_func = (deltaTime) => {
        context.timestep = deltaTime / 1000.0;

        gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT);
        
        runStep(gl, context, quad, shaders.advect_boundary, framebuffers.velocity2, [ 
            { id: textures.velocity1, name: "velocity_sampler" }
        ]);
        
        [ textures.velocity1, textures.velocity2 ] = [ textures.velocity2, textures.velocity1 ];
        [ framebuffers.velocity1, framebuffers.velocity2 ] = [ framebuffers.velocity2, framebuffers.velocity1 ];
        
        gl.viewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        if (is_button_down && click_pos) {
            context.click_pos = click_pos;
            context.force_dir = force_dir;

            // context.new_color = [1.0, 0.0, 0.0];
            context.new_color = splat_color;

            runStep(gl, context, quad, shaders.set_color, framebuffers.color2, [
                { id: textures.color1, name: "color_sampler" }
            ]);

            [ textures.color1, textures.color2 ] = [ textures.color2, textures.color1 ];
            [ framebuffers.color1, framebuffers.color2] = [ framebuffers.color2, framebuffers.color1 ];

            delete context.new_color;
        }
        
        runStep(gl, context, quad, shaders.advect_color, framebuffers.color2, [
            { id: textures.color1, name: "color_sampler" },
            { id: textures.velocity1, name: "velocity_sampler" },
        ]);
        
        [ textures.color1, textures.color2 ] = [ textures.color2, textures.color1 ];
        [ framebuffers.color1, framebuffers.color2] = [ framebuffers.color2, framebuffers.color1 ];
        
        gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT);

        runStep(gl, context, quad, shaders.advect_pressure, framebuffers.pressure2, [ 
            { id: textures.velocity2, name: "velocity_sampler" },
            { id: textures.pressure1, name: "pressure_sampler" }
        ]);

        [ textures.pressure1, textures.pressure2 ] = [ textures.pressure2, textures.pressure1 ];
        [ framebuffers.pressure1, framebuffers.pressure2 ] = [ framebuffers.pressure2, framebuffers.pressure1 ];

        runStep(gl, context, quad, shaders.advect_velocity, framebuffers.velocity2, [ 
            { id: textures.velocity1, name: "velocity_sampler" }
        ]);

        [ textures.velocity1, textures.velocity2 ] = [ textures.velocity2, textures.velocity1 ];
        [ framebuffers.velocity1, framebuffers.velocity2 ] = [ framebuffers.velocity2, framebuffers.velocity1 ];

        for (let i = 0; i < 30; ++i) {
            runStep(gl, context, quad, shaders.diffuse, framebuffers.velocity2, [ 
                { id: textures.velocity1, name: "velocity_sampler" }
            ]);

            [ textures.velocity1, textures.velocity2 ] = [ textures.velocity2, textures.velocity1 ];
            [ framebuffers.velocity1, framebuffers.velocity2 ] = [ framebuffers.velocity2, framebuffers.velocity1 ];
        }

        if (is_button_down) {
            context.click_pos = click_pos;
            context.force_dir = force_dir;

            runStep(gl, context, quad, shaders.apply_force, framebuffers.velocity2, [
                { id: textures.velocity1, name: "velocity_sampler" }
            ]);

            [ textures.velocity1, textures.velocity2 ] = [ textures.velocity2, textures.velocity1 ];
            [ framebuffers.velocity1, framebuffers.velocity2 ] = [ framebuffers.velocity2, framebuffers.velocity1 ];

            delete context.click_pos;
            delete context.force_dir;

            force_dir.x = 0;
            force_dir.y = 0;
        }

        runStep(gl, context, quad, shaders.divergence, framebuffers.divergence, [
            { id: textures.velocity1, name: "velocity_sampler" }
        ]);

        runStep(gl, context, quad, shaders.pressure_boundary, framebuffers.pressure2, [ 
            { id: textures.pressure1, name: "pressure_sampler" }
        ]);

        [ textures.pressure1, textures.pressure2 ] = [ textures.pressure2, textures.pressure1 ];
        [ framebuffers.pressure1, framebuffers.pressure2 ] = [ framebuffers.pressure2, framebuffers.pressure1 ];

        for (let i = 0; i < 70; ++i) {
            runStep(gl, context, quad, shaders.pressure_solve, framebuffers.pressure2, [ 
                { id: textures.pressure1, name: "pressure_sampler" },
                { id: textures.divergence, name: "divergence_sampler" }
            ]);

            [ textures.pressure1, textures.pressure2 ] = [ textures.pressure2, textures.pressure1 ];
            [ framebuffers.pressure1, framebuffers.pressure2] = [ framebuffers.pressure2, framebuffers.pressure1 ];
        }

        runStep(gl, context, quad, shaders.advect_boundary, framebuffers.velocity2, [ 
            { id: textures.velocity1, name: "velocity_sampler" }
        ]);

        [ textures.velocity1, textures.velocity2 ] = [ textures.velocity2, textures.velocity1 ];
        [ framebuffers.velocity1, framebuffers.velocity2 ] = [ framebuffers.velocity2, framebuffers.velocity1 ];

        runStep(gl, context, quad, shaders.gradient_sub, framebuffers.velocity2, [ 
            { id: textures.pressure1, name: "pressure_sampler" },
            { id: textures.velocity1, name: "velocity_sampler" }
        ]);

        [ textures.velocity1, textures.velocity2 ] = [ textures.velocity2, textures.velocity1 ];
        [ framebuffers.velocity1, framebuffers.velocity2 ] = [ framebuffers.velocity2, framebuffers.velocity1 ];

        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    // setInterval(() => {
        
    // }, 33);
    const color1_ref = framebuffers.color1;
    // Draw the scene repeatedly
    function render(now) {
        const deltaTime = now - then;
        then = now;

        // if (reset) {
        //     reset = false;

        //     gl.bindTexture(gl.TEXTURE_2D, textures.color1);

        //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SCREEN_WIDTH, SCREEN_HEIGHT, 0, gl.RGBA, gl.FLOAT, generateEmptyTextureData(SCREEN_WIDTH, SCREEN_HEIGHT));

        //     gl.bindTexture(gl.TEXTURE_2D, textures.color2);

        //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SCREEN_WIDTH, SCREEN_HEIGHT, 0, gl.RGBA, gl.FLOAT, generateEmptyTextureData(SCREEN_WIDTH, SCREEN_HEIGHT));

        //     gl.bindTexture(gl.TEXTURE_2D, null);
        // }

        
        step_func(deltaTime);

        // if (color1_ref.id !== framebuffers.color1.id) {
        //     console.log('not the same!! ' + color1_ref.id + ', ' + framebuffers.color1.id);
        // } else {
        //     console.log('same!! ' + color1_ref.id + ', ' + framebuffers.color1.id);
        // }

        drawScene(gl, quad, shaders, textures, framebuffers, deltaTime);
        
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

window.onload = () => {
    main(); 
}