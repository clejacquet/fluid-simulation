const vsRender = 
`#version 300 es
layout (location = 0) in vec3 pos;

out vec2 rel_coords;

void main() {
    gl_Position = vec4(pos, 1.0);

    rel_coords = pos.xy * 0.5f + 0.5f;
}
`;

const fsRender = 
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D tex;

void main() {
    mediump float color_factor = texture(tex, rel_coords).r;

    mediump vec3 color = color_factor * vec3(0.2f, 0.6f, 1.0f);
    _frag_color = vec4(color, 1.0f);
}
`;

const fsAdvectBoundary = 
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform mediump float viscosity;
uniform ivec2 size;


mediump vec2 advect_boundary(ivec2 coords) {
    mediump vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));

    if (coords.x == 0 && coords.y == 0) {
        return - texture(velocity_sampler, rel_coords + vec2(d.x, d.y)).xy;
    }
    else if (coords.x == size.x - 1 && coords.y == size.y - 1) {
        return - texture(velocity_sampler, rel_coords + vec2(-d.x, -d.y)).xy;
    }
    else if (coords.x == size.x - 1 && coords.y == 0) {
        return - texture(velocity_sampler, rel_coords + vec2(-d.x, d.y)).xy;
    }
    else if (coords.x == 0 && coords.y == size.y - 1) {
        return - texture(velocity_sampler, rel_coords + vec2(d.x, -d.y)).xy;
    }
    else if (coords.x == 0) {
        return - texture(velocity_sampler, rel_coords + vec2(d.x, 0.0f)).xy;
    }
    else if (coords.x == size.x - 1) {
        return - texture(velocity_sampler, rel_coords + vec2(-d.x, 0.0f)).xy;
    }
    else if (coords.y == 0) {
        return - texture(velocity_sampler, rel_coords + vec2(0.0f, d.y)).xy;
    }
    else if (coords.y == size.y - 1) {
        return - texture(velocity_sampler, rel_coords + vec2(0.0f, -d.y)).xy;
    }

    return texture(velocity_sampler, rel_coords).xy;
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(advect_boundary(coords), 0.0f, 0.0f);
}
`;

const fsAdvectColor =
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D color_sampler;
uniform sampler2D velocity_sampler;

uniform mediump float timestep;

uniform mediump float dx;

uniform ivec2 size;


mediump float advect(ivec2 coords) {
    mediump vec2 velocity_value = texture(velocity_sampler, rel_coords).xy;
    // mediump vec2 velocity_value = vec2(0, -60);

    velocity_value /= vec2(size - ivec2(1));

    mediump vec2 rel_prev_coords = rel_coords - timestep * dx * velocity_value;

    clamp(rel_prev_coords, vec2(0.0f), vec2(1.0f));

    return texture(color_sampler, rel_prev_coords).x;
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(advect(coords), 0.0f, 0.0f, 0.0f);
}
`;

const fsAdvectVelocity =
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;

uniform mediump float dx;

uniform ivec2 size;


mediump vec2 advect(ivec2 coords) {
    mediump vec2 velocity_value = texture(velocity_sampler, rel_coords).xy;

    velocity_value /= vec2(size - ivec2(1));

    mediump vec2 rel_prev_coords = rel_coords - timestep * dx * velocity_value;

    clamp(rel_prev_coords, vec2(0.0f), vec2(1.0f));

    return texture(velocity_sampler, rel_prev_coords).xy;
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(advect(coords), 0.0f, 0.0f);
}
`;

const fsAdvectPressure =
`#version 300 es
in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D pressure_sampler;
uniform sampler2D velocity_sampler;

uniform mediump float timestep;

uniform mediump float dx;

uniform ivec2 size;


mediump float advect(ivec2 coords) {
    mediump vec2 velocity_value = texture(velocity_sampler, rel_coords).xy;

    velocity_value /= vec2(size - ivec2(1));

    mediump vec2 rel_prev_coords = rel_coords - timestep * dx * velocity_value;

    clamp(rel_prev_coords, vec2(0.0f), vec2(1.0f));

    return texture(pressure_sampler, rel_prev_coords).x;
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(advect(coords), 0.0f, 0.0f, 0.0f);
}
`;

const fsDiffuse =
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform mediump float viscosity;
uniform ivec2 size;


mediump vec2 velocity_diffuse(ivec2 coords) {
    mediump vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));
    mediump float alpha = dx * dx / (viscosity * timestep);
    mediump float r_beta = 1.0f / (4.0f + alpha);

    mediump vec2 diffused_velocity;

    if (rel_coords.x > 0.0f && rel_coords.x < 1.0f && rel_coords.y > 0.0f && rel_coords.y < 1.0f) {
        mediump vec2 xL = texture(velocity_sampler, rel_coords - vec2(d.x, 0)).xy;
        mediump vec2 xR = texture(velocity_sampler, rel_coords + vec2(d.x, 0)).xy;
        mediump vec2 xB = texture(velocity_sampler, rel_coords - vec2(0, d.y)).xy;
        mediump vec2 xT = texture(velocity_sampler, rel_coords + vec2(0, d.y)).xy;

        mediump vec2 b = texture(velocity_sampler, rel_coords).xy;

        diffused_velocity = (xL + xR + xB + xT + alpha * b) * r_beta;
    } else {
        diffused_velocity = texture(velocity_sampler, rel_coords).xy;
    }

    return diffused_velocity;
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(velocity_diffuse(coords), 0.0f, 0.0f);
}
`

const fsApplyForce =
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform ivec2 size;
uniform ivec2 click_pos;


mediump vec2 applyForce(ivec2 coords) {
    mediump vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));

    if (coords.x > 0 && coords.x < size.x - 1 && coords.y > 0 && coords.y < size.x - 1) {
        mediump vec2 v_xy = 500.0f * vec2(0.0f, -1.0f) * exp(- distance(vec2(coords), vec2(click_pos)) * distance(vec2(coords), vec2(click_pos)) / 1000.0f);
        // mediump vec2 dir = vec2(click_pos) - vec2(coords);
        // mediump vec2 v_xy = length(dir) < 10.0f ? normalize(dir) * 40.0f : vec2(0.0f);
        // mediump vec2 v_xy = vec2(0.0f, -50.0f);
        return v_xy + texture(velocity_sampler, rel_coords).xy;
    }

    return vec2(0.0f, 0.0f);
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(applyForce(coords), 0.0f, 0.0f);
}
`

const fsDivergence =
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D velocity_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform mediump float viscosity;
uniform ivec2 size;


mediump float divergence_calc(ivec2 coords) {
    mediump vec2 d = vec2(1.0f) / (vec2(size) - vec2(1));
    mediump float halfrdx = 0.5f / dx;

    if (rel_coords.x > 0.0f && rel_coords.x < 1.0f && rel_coords.y > 0.0f && rel_coords.y < 1.0f) {
        mediump vec2 xL = texture(velocity_sampler, rel_coords - vec2(d.x, 0)).xy;
        mediump vec2 xR = texture(velocity_sampler, rel_coords + vec2(d.x, 0)).xy;
        mediump vec2 xB = texture(velocity_sampler, rel_coords - vec2(0, d.y)).xy;
        mediump vec2 xT = texture(velocity_sampler, rel_coords + vec2(0, d.y)).xy;

        return halfrdx * ((xR.x - xL.x) + (xT.y - xB.y));
    }

    return 0.0f;
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(divergence_calc(coords), 0.0f, 0.0f, 0.0f);
}`;

const fsPressureBoundary =
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D pressure_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform ivec2 size;


mediump float pressure_boundary(ivec2 coords) {
    mediump vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));

    if (coords.x == 0 && coords.y == 0) {
        return texture(pressure_sampler, rel_coords + vec2(d.x, d.y)).x;
    }
    else if (coords.x == size.x - 1 && coords.y == size.y - 1) {
        return texture(pressure_sampler, rel_coords + vec2(-d.x, -d.y)).x;
    }
    else if (coords.x == size.x - 1 && coords.y == 0) {
        return texture(pressure_sampler, rel_coords + vec2(-d.x, d.y)).x;
    }
    else if (coords.x == 0 && coords.y == size.y - 1) {
        return texture(pressure_sampler, rel_coords + vec2(d.x, -d.y)).x;
    }
    else if (coords.x == 0) {
        return texture(pressure_sampler, rel_coords + vec2(d.x, 0.0f)).x;
    }
    else if (coords.x == size.x - 1) {
        return texture(pressure_sampler, rel_coords + vec2(-d.x, 0.0f)).x;
    }
    else if (coords.y == 0) {
        return texture(pressure_sampler, rel_coords + vec2(0.0f, d.y)).x;
    }
    else if (coords.y == size.y - 1) {
        return texture(pressure_sampler, rel_coords + vec2(0.0f, -d.y)).x;
    }

    return texture(pressure_sampler, rel_coords).x;
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(pressure_boundary(coords), 0.0f, 0.0f, 0.0f);
}`;


const fsPressureSolve =
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D pressure_sampler;
uniform sampler2D divergence_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform ivec2 size;


mediump float pressure_solve(ivec2 coords) {
    mediump vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));

    mediump float alpha = -dx * dx;
    mediump float r_beta = 1.0f / 4.0f;

    mediump float pressure_val;

    if (rel_coords.x >= 0.0f && rel_coords.x <= 1.0f && rel_coords.y >= 0.0f && rel_coords.y <= 1.0f) {
        mediump float pL = texture(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        mediump float pR = texture(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        mediump float pB = texture(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        mediump float pT = texture(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        mediump float b = texture(divergence_sampler, rel_coords).x;

        pressure_val = (pL + pR + pB + pT + alpha * b) * r_beta;
    } else {
        pressure_val = texture(pressure_sampler, rel_coords).x;
    }

    return pressure_val;
}

void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(pressure_solve(coords), 0.0f, 0.0f, 0.0f);
}`;

const fsGradientSub =
`#version 300 es

in mediump vec2 rel_coords;
out mediump vec4 _frag_color;

uniform sampler2D velocity_sampler;
uniform sampler2D pressure_sampler;

uniform mediump float timestep;
uniform mediump float dx;
uniform mediump float viscosity;
uniform ivec2 size;


mediump vec2 gradient_sub(ivec2 coords) {
    mediump vec2 d = vec2(1.0f) / (vec2(size) - vec2(1));
    
    mediump float halfrdx = 0.5f / dx;

    if (rel_coords.x > 0.0f && rel_coords.x < 1.0f && rel_coords.y > 0.0f && rel_coords.y < 1.0f) {
        mediump float pL = texture(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        mediump float pR = texture(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        mediump float pB = texture(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        mediump float pT = texture(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        mediump vec2 current_velocity = texture(velocity_sampler, rel_coords).xy;
        return current_velocity - halfrdx * vec2(pR - pL, pT - pB);
    } else {
        return texture(velocity_sampler, rel_coords).xy;
    }
}


void main() {
    ivec2 coords = ivec2(round(rel_coords * vec2(size) - vec2(0.5)));

    _frag_color = vec4(gradient_sub(coords), 0.0f, 0.0f);
}
`;


let color_vec = [ 0.3, 0.5, 0.0 ];

function drawScene(gl, quad, shaders, textures, framebuffers, deltaTime) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    
    // Set the shader uniforms
    gl.bindVertexArray(quad.vao);
    gl.useProgram(shaders.render);

    color_vec[0] = (color_vec[0] + deltaTime / 5000) % 1.0;
    color_vec[1] = (color_vec[1] + deltaTime / 5000) % 1.0;
    color_vec[2] = (color_vec[2] + deltaTime / 5000) % 1.0;

    gl.uniform3f(gl.getUniformLocation(shaders.render, "color"), color_vec[0], color_vec[1], color_vec[2]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.color1);

    gl.uniform1i(gl.getUniformLocation(shaders.render, "tex"), 0);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);

    gl.bindVertexArray(null);
}
  
const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;

function generateTextureData(width, height) {
    const data = new Array(width * height);

    const max_distance = Math.sqrt(Math.pow(width * 0.5, 2) + Math.pow(height * 0.5, 2));

    for (let j = 0; j < height; ++j) {
        for (let i = 0; i < width; ++i) {
            const distance = Math.sqrt(Math.pow(width * 0.5 - i, 2) + Math.pow(height * 0.5 - j, 2)) / max_distance;

            data[j * width + i] = Math.pow(1.0 - distance, 2.0);
        }
    }

    return new Float32Array(data);
}

function generateVelocityData(width, height) {
    const data = new Array(2 * width * height);


    for (let j = 0; j < height; ++j) {
        for (let i = 0; i < width; ++i) {
            data[j * width * 2 + i * 2 + 0] = 0.0;
            data[j * width * 2 + i * 2 + 1] = 0.0;
        }
    }

    return new Float32Array(data);
}

function loadFramebuffer(gl, texture) {
    // Create and bind the framebuffer
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return fb;
}

function runStep(gl, context, quad, shader, framebuffer, textures) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    
    // Set the shader uniforms
    gl.bindVertexArray(quad.vao);
    gl.useProgram(shader);

    // console.log(textures[0]);

    textures.forEach((texture, i) => {
        gl.activeTexture(gl[`TEXTURE${i}`]);
        gl.bindTexture(gl.TEXTURE_2D, texture.id);
        gl.uniform1i(gl.getUniformLocation(shader, texture.name), i);
    });

    gl.uniform1f(gl.getUniformLocation(shader, "timestep"), 0.033);
    gl.uniform1f(gl.getUniformLocation(shader, "dx"), 1.0);
    gl.uniform1f(gl.getUniformLocation(shader, "viscosity"), 0.1);
    gl.uniform2i(gl.getUniformLocation(shader, "size"), SCREEN_WIDTH, SCREEN_HEIGHT);

    if (context.click_pos) {
        gl.uniform2i(gl.getUniformLocation(shader, "click_pos"), context.click_pos[0], context.click_pos[1]);
    }

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);

    gl.bindVertexArray(null);
}

function main() {
    const canvas = document.querySelector("#glCanvas");

    let has_clicked = false;
    let click_pos;

    canvas.addEventListener("click", (e) => {
        const x = e.clientX - canvas.getBoundingClientRect().left;
        const y = SCREEN_HEIGHT - (e.clientY - canvas.getBoundingClientRect().top) - 1;

        click_pos = [x, y];
        has_clicked = true;
    });

    // Initialisation du contexte WebGL
    const gl = canvas.getContext("webgl2", { antialias: false });
    
    // Continuer seulement si WebGL est disponible et fonctionnel
    if (!gl) {
        alert("Impossible d'initialiser WebGL. Votre navigateur ou votre machine peut ne pas le supporter.");
        return;
    }

    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float');
    gl.getExtension('OES_texture_float_linear');
    
    const quad = new Quad(gl);
    const render_shader = initShaderProgram(gl, vsRender, fsRender);
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

    const color1 = loadTextureData(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.R32F, gl.RED, gl.FLOAT, generateTextureData(SCREEN_WIDTH, SCREEN_HEIGHT));
    const color2 = loadTextureData(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.R32F, gl.RED, gl.FLOAT, generateTextureData(SCREEN_WIDTH, SCREEN_HEIGHT));
    const velocity1 = loadTextureData(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.RG32F, gl.RG, gl.FLOAT, generateVelocityData(SCREEN_WIDTH, SCREEN_HEIGHT));
    const velocity2 = loadTextureData(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.RG32F, gl.RG, gl.FLOAT, generateVelocityData(SCREEN_WIDTH, SCREEN_HEIGHT));
    const pressure1 = loadTexture(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.R32F);
    const pressure2 = loadTexture(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.R32F);
    const divergence = loadTexture(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.R32F);

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

    setInterval(() => {
        runStep(gl, context, quad, shaders.advect_boundary, framebuffers.velocity2, [ 
            { id: textures.velocity1, name: "velocity_sampler" }
        ]);

        [ textures.velocity1, textures.velocity2 ] = [ textures.velocity2, textures.velocity1 ];
        [ framebuffers.velocity1, framebuffers.velocity2 ] = [ framebuffers.velocity2, framebuffers.velocity1 ];

        runStep(gl, context, quad, shaders.advect_color, framebuffers.color2, [ 
            { id: textures.color1, name: "color_sampler" },
            { id: textures.velocity1, name: "velocity_sampler" },
        ]);

        [ textures.color1, textures.color2 ] = [ textures.color2, textures.color1 ];
        [ framebuffers.color1, framebuffers.color2] = [ framebuffers.color2, framebuffers.color1 ];

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

        if (has_clicked) {
            has_clicked = false;
            context.click_pos = click_pos;

            runStep(gl, context, quad, shaders.apply_force, framebuffers.velocity2, [
                { id: textures.velocity1, name: "velocity_sampler" }
            ]);

            [ textures.velocity1, textures.velocity2 ] = [ textures.velocity2, textures.velocity1 ];
            [ framebuffers.velocity1, framebuffers.velocity2 ] = [ framebuffers.velocity2, framebuffers.velocity1 ];

            delete context.click_pos;
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

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffers.color1);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        gl.blitFramebuffer(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, gl.COLOR_BUFFER_BIT , gl.NEAREST);
        
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }, 33);

    // Draw the scene repeatedly
    function render(now) {
        const deltaTime = now - then;
        then = now;

        drawScene(gl, quad, shaders, textures, framebuffers, deltaTime);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main(); 