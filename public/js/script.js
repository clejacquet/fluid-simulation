

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
varying highp vec2 rel_coords;

uniform sampler2D tex;
uniform highp float dt;

void main() {
    highp vec4 color = texture2D(tex, rel_coords);

    // highp float red_val = dt - floor(dt);
    // highp vec3 color = vec3(0.2, 0.6, 1.0);

    // color = color_factor.x * color;
    gl_FragColor = vec4(color.rgb, 1.0);
}
`;

const fsAdvectBoundaryX = 
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;

uniform highp float timestep;
uniform highp float dx;
uniform highp float viscosity;
uniform ivec2 size;


highp float advect_boundary(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size.x + 1, size.y) - vec2(1.0));

    if (coords.x <= 0) {
        return - texture2D(velocity_sampler_x, rel_coords + vec2(d.x, 0)).x;
    }
    else if (coords.x >= size.x) {
        return - texture2D(velocity_sampler_x, rel_coords - vec2(d.x, 0)).x;
    }

    return texture2D(velocity_sampler_x, rel_coords).x;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size.x + 1, size.y)));

    gl_FragColor = vec4(advect_boundary(coords), 0.0, 0.0, 0.0);
}
`;

const fsAdvectBoundaryY = 
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_y;

uniform highp float timestep;
uniform highp float dx;
uniform highp float viscosity;
uniform ivec2 size;


highp float advect_boundary(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size.x, size.y + 1) - vec2(1.0));

    if (coords.y <= 0) {
        return - texture2D(velocity_sampler_y, rel_coords + vec2(0, d.y)).x;
    }
    else if (coords.y >= size.y) {
        return - texture2D(velocity_sampler_y, rel_coords - vec2(0, d.y)).x;
    }

    return texture2D(velocity_sampler_y, rel_coords).x;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size.x, size.y + 1)));

    gl_FragColor = vec4(advect_boundary(coords), 0.0, 0.0, 0.0);
}
`;

const fsFirstColor =
`
varying highp vec2 rel_coords;

void main() {
    // gl_FragColor = vec4(0.7071 - length(rel_coords - vec2(0.5, 0.5)), 0.0, 0.0, 0.0);
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
}
`;

const fsSetColor =
`
varying highp vec2 rel_coords;

uniform highp float timestep;

uniform sampler2D color_sampler;

uniform highp vec2 dx;
uniform highp float viscosity;
uniform ivec2 click_pos;
uniform ivec2 size_color;
uniform highp vec2 force_dir;
uniform highp vec3 new_color;


void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size_color)));
    highp float dist = distance(vec2(coords), vec2(click_pos));
    highp float force_factor = (0.2 * length(force_dir));
    highp float factor = force_factor * force_factor * exp(-  (dist * dist) / 10000.0);
    factor = clamp(factor, 0.0, 1.0);

    highp vec3 old_color = texture2D(color_sampler, rel_coords).rgb;
    gl_FragColor = vec4((1.0 - factor) * old_color + factor * new_color, 0.0);
    // gl_FragColor = vec4(new_color, 0.0);
}
`

const fsAdvectColor =
`
varying highp vec2 rel_coords;

uniform sampler2D color_sampler;
uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;

uniform highp float dx;
uniform highp float dy;

uniform ivec2 size;
uniform ivec2 size_color;


highp vec2 velocity_sample(highp vec2 c) {
    highp float min_v = 1.0 / float(size.x);
    highp float max_v = 1.0 - min_v;

    highp float ux = texture2D(velocity_sampler_x, vec2(min_v + c.x * (max_v - min_v), c.y)).x;
    highp float uy = texture2D(velocity_sampler_y, vec2(c.x, min_v + c.y * (max_v - min_v))).x;

    return vec2(ux, uy);
}

highp vec3 advect(ivec2 coords) {
    highp vec2 velocity_value = velocity_sample(rel_coords);

    // highp vec2 velocity_value = vec2(0, -60);

    velocity_value /= 1000.0;

    highp vec2 rel_mid_coords = rel_coords - 0.5 * timestep * vec2(dx, dy) * velocity_value;
    highp vec2 mid_velocity_value = velocity_sample(rel_mid_coords);

    mid_velocity_value /= 1000.0;

    highp vec2 rel_prev_coords = rel_coords - timestep * vec2(dx, dy) * mid_velocity_value;

    clamp(rel_prev_coords, vec2(0.0), vec2(1.0));

    return 0.995 * texture2D(color_sampler, rel_prev_coords).rgb;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size_color)));

    // ivec2 vel_coords = ivec2(floor(rel_coords))

    gl_FragColor = vec4(advect(coords), 0.0);
}
`;

const fsAdvectVelocityX =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;

uniform highp float dx;
uniform highp float dy;

uniform ivec2 size;

highp vec2 velocity_sample(highp vec2 c) {
    highp float d = 1.0 / float(size.x);

    highp float ux = texture2D(velocity_sampler_x, rel_coords).x;
    highp float uy = texture2D(velocity_sampler_y, vec2(-d + c.x * (1.0 + 2.0 * d), d + c.y * (1.0 - 2.0 * d))).x;

    return vec2(ux, uy);
}

highp float advect(ivec2 coords) {
    highp vec2 velocity_value = velocity_sample(rel_coords);

    // highp vec2 velocity_value = vec2(0, -60);

    velocity_value /= 1000.0;

    highp vec2 rel_mid_coords = rel_coords - 0.5 * timestep * vec2(dx, dy) * velocity_value;
    highp vec2 mid_velocity_value = velocity_sample(rel_mid_coords);

    mid_velocity_value /= 1000.0;

    highp vec2 rel_prev_coords = rel_coords - timestep * vec2(dx, dy) * mid_velocity_value;

    clamp(rel_prev_coords, vec2(0.0), vec2(1.0));

    return texture2D(velocity_sampler_x, rel_prev_coords).x;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(advect(coords), 0.0, 0.0, 0.0);
}
`;


const fsAdvectVelocityY =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;

uniform highp float dx;
uniform highp float dy;

uniform ivec2 size;

highp vec2 velocity_sample(highp vec2 c) {
    highp float d = 1.0 / float(size.x);

    highp float ux = texture2D(velocity_sampler_x, vec2(d + c.x * (1.0 - 2.0 * d), -d + c.y * (1.0 + 2.0 * d))).x;
    highp float uy = texture2D(velocity_sampler_y, rel_coords).x;

    return vec2(ux, uy);
}

highp float advect(ivec2 coords) {
    highp vec2 velocity_value = velocity_sample(rel_coords);

    // highp vec2 velocity_value = vec2(0, -60);

    velocity_value /= 1000.0;

    highp vec2 rel_mid_coords = rel_coords - 0.5 * timestep * vec2(dx, dy) * velocity_value;
    highp vec2 mid_velocity_value = velocity_sample(rel_mid_coords);

    mid_velocity_value /= 1000.0;

    highp vec2 rel_prev_coords = rel_coords - timestep * vec2(dx, dy) * mid_velocity_value;

    clamp(rel_prev_coords, vec2(0.0), vec2(1.0));

    return texture2D(velocity_sampler_y, rel_prev_coords).x;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(advect(coords), 0.0, 0.0, 0.0);
}
`;

const fsAdvectPressure =
`varying highp vec2 rel_coords;

uniform sampler2D pressure_sampler;
uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;

uniform highp float dx;
uniform highp float dy;

uniform ivec2 size;

highp vec2 velocity_sample(highp vec2 c) {
    highp float min_v = 1.0 / float(size.x);
    highp float max_v = 1.0 - min_v;

    highp float ux = texture2D(velocity_sampler_x, vec2(min_v + c.x * (max_v - min_v), c.y)).x;
    highp float uy = texture2D(velocity_sampler_y, vec2(c.x, min_v + c.y * (max_v - min_v))).x;

    return vec2(ux, uy);
}

highp float advect(ivec2 coords) {
    highp vec2 velocity_value = velocity_sample(rel_coords);

    // highp vec2 velocity_value = vec2(0, -60);

    velocity_value /= 1000.0;

    highp vec2 rel_mid_coords = rel_coords - 0.5 * timestep * vec2(dx, dy) * velocity_value;
    highp vec2 mid_velocity_value = velocity_sample(rel_mid_coords);

    mid_velocity_value /= 1000.0;

    highp vec2 rel_prev_coords = rel_coords - timestep * vec2(dx, dy) * mid_velocity_value;

    clamp(rel_prev_coords, vec2(0.0), vec2(1.0));

    return texture2D(pressure_sampler, rel_prev_coords).x;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(advect(coords), 0.0, 0.0, 0.0);
}
`;

const fsDiffuseX =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;
uniform highp float dx;
uniform highp float viscosity;
uniform ivec2 size;


highp float velocity_diffuse() {
    highp vec2 d = vec2(1.0) / (vec2(size.x + 1, size.y) - vec2(1.0));
    highp float alpha = dx * dx / (viscosity * timestep);
    highp float r_beta = 1.0 / (4.0 + alpha);

    highp float diffused_velocity;

    if (rel_coords.x > 0.0 && rel_coords.x < 1.0 && rel_coords.y > 0.0 && rel_coords.y < 1.0) {
        highp float xL = texture2D(velocity_sampler_x, rel_coords - vec2(d.x, 0)).x;
        highp float xR = texture2D(velocity_sampler_x, rel_coords + vec2(d.x, 0)).x;
        highp float xB = texture2D(velocity_sampler_x, rel_coords - vec2(0, d.y)).x;
        highp float xT = texture2D(velocity_sampler_x, rel_coords + vec2(0, d.y)).x;

        highp float b = texture2D(velocity_sampler_x, rel_coords).x;

        diffused_velocity = (xL + xR + xB + xT + alpha * b) * r_beta;
    } else {
        diffused_velocity = texture2D(velocity_sampler_x, rel_coords).x;
    }

    return diffused_velocity;
}

void main() {
    gl_FragColor = vec4(velocity_diffuse(), 0.0, 0.0, 0.0);
}
`


const fsDiffuseY =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;
uniform highp float dx;
uniform highp float viscosity;
uniform ivec2 size;

highp vec2 velocity_sample(highp vec2 c) {
    highp float d = 1.0 / float(size.x);

    // highp float ux = texture2D(velocity_sampler_x, vec2(d + c.x * (1.0 - 2.0 * d), -d + c.y * (1.0 + 2.0 * d))).x;
    highp float ux = texture2D(velocity_sampler_x, rel_coords).x;
    highp float uy = texture2D(velocity_sampler_y, rel_coords).x;

    return vec2(ux, uy);
}

highp float velocity_diffuse(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size.x, size.y + 1) - vec2(1));
    highp float alpha = dx * dx / (viscosity * timestep);
    highp float r_beta = 1.0 / (4.0 + alpha);

    highp float diffused_velocity;

    if (rel_coords.x > 0.0 && rel_coords.x < 1.0 && rel_coords.y > 0.0 && rel_coords.y < 1.0) {
        highp float xL = texture2D(velocity_sampler_y, rel_coords - vec2(d.x, 0)).x;
        highp float xR = texture2D(velocity_sampler_y, rel_coords + vec2(d.x, 0)).x;
        highp float xB = texture2D(velocity_sampler_y, rel_coords - vec2(0, d.y)).x;
        highp float xT = texture2D(velocity_sampler_y, rel_coords + vec2(0, d.y)).x;

        highp float b = texture2D(velocity_sampler_y, rel_coords).x;

        diffused_velocity = (xL + xR + xB + xT + alpha * b) * r_beta;
    } else {
        diffused_velocity = texture2D(velocity_sampler_y, rel_coords).x;
    }

    return diffused_velocity;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(velocity_diffuse(coords), 0.0, 0.0, 0.0);
}
`

const fsApplyForceX =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;
uniform highp float dx;
uniform ivec2 size;
uniform ivec2 click_pos;
uniform highp vec2 force_dir;


highp float applyForce(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));

    if (coords.x > 0 && coords.x < size.x && coords.y > 0 && coords.y < size.x - 1) {
        highp float dist = distance(vec2(coords), vec2(click_pos));
        highp vec2 v_xy = 100.0 * timestep * force_dir * length(force_dir) * exp(- (dist * dist) / 50.0);
        return v_xy.x + texture2D(velocity_sampler_x, rel_coords).x;
        // return texture2D(velocity_sampler_x, rel_coords).x;
    }

    return 0.0;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size.x + 1, size.y)));

    gl_FragColor = vec4(applyForce(coords), 0.0, 0.0, 0.0);
}
`


const fsApplyForceY =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;
uniform highp float dx;
uniform ivec2 size;
uniform ivec2 click_pos;
uniform highp vec2 force_dir;


highp float applyForce(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));

    if (coords.x > 0 && coords.x < size.x - 1 && coords.y > 0 && coords.y < size.y) {
        highp float dist = distance(vec2(coords), vec2(click_pos));
        highp vec2 v_xy = 100.0 * timestep * force_dir * length(force_dir) * exp(- (dist * dist) / 50.0);
        // highp vec2 v_xy = 100.0 * timestep * vec2(-2.0, -2.0) * length(force_dir) * exp(- (dist * dist) / 50.0);

        return v_xy.y + texture2D(velocity_sampler_y, rel_coords).x;
    }

    return 0.0;
}

void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size.x, size.y + 1)));

    gl_FragColor = vec4(applyForce(coords), 0.0, 0.0, 0.0);
}
`

const fsDivergence =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;

uniform highp float timestep;
uniform highp float dx;
uniform highp float viscosity;
uniform ivec2 size;

highp vec2 velocity_sample(highp vec2 c) {
    highp float min_v = 1.0 / float(size.x);
    highp float max_v = 1.0 - min_v;

    highp float ux = texture2D(velocity_sampler_x, vec2(min_v + c.x * (max_v - min_v), c.y)).x;
    highp float uy = texture2D(velocity_sampler_y, vec2(c.x, min_v + c.y * (max_v - min_v))).x;

    return vec2(ux, uy);
}

highp float divergence_calc(ivec2 coords) {
    highp vec2 d = vec2(0.5) / (vec2(size) - vec2(1));
    highp float halfrdx = 0.5 / dx;

    if (rel_coords.x > 0.0 && rel_coords.x < 1.0 && rel_coords.y > 0.0 && rel_coords.y < 1.0) {
        highp vec2 xL = velocity_sample(rel_coords - vec2(d.x, 0));
        highp vec2 xR = velocity_sample(rel_coords + vec2(d.x, 0));
        highp vec2 xB = velocity_sample(rel_coords - vec2(0, d.y));
        highp vec2 xT = velocity_sample(rel_coords + vec2(0, d.y));

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
varying highp vec2 rel_coords;

uniform sampler2D pressure_sampler;

uniform highp float timestep;
uniform highp float dx;
uniform ivec2 size;


highp float pressure_boundary(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));

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
varying highp vec2 rel_coords;

uniform sampler2D pressure_sampler;
uniform sampler2D divergence_sampler;

uniform highp float timestep;
uniform highp float dx;
uniform ivec2 size;


highp float pressure_solve(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size) - vec2(1.0));

    highp float alpha = -dx * dx;
    highp float r_beta = 1.0 / 4.0;

    highp float pressure_val;

    if (rel_coords.x >= 0.0 && rel_coords.x <= 1.0 && rel_coords.y >= 0.0 && rel_coords.y <= 1.0) {
        highp float pL = texture2D(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        highp float pR = texture2D(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        highp float pB = texture2D(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        highp float pT = texture2D(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        highp float b = texture2D(divergence_sampler, rel_coords).x;

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

const fsGradientSubX =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;
uniform sampler2D pressure_sampler;

uniform highp float timestep;
uniform highp float dx;
uniform highp float viscosity;
uniform ivec2 size;

highp vec2 velocity_sample(highp vec2 c) {
    highp float d = 1.0 / float(size.x);

    highp float ux = texture2D(velocity_sampler_x, rel_coords).x;
    highp float uy = texture2D(velocity_sampler_y, vec2(-d + c.x * (1.0 + 2.0 * d), d + c.y * (1.0 - 2.0 * d))).x;

    return vec2(ux, uy);
}

highp float gradient_sub(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size) - vec2(1));
    
    highp float halfrdx = 0.5 / dx;

    if (rel_coords.x > 0.0 && rel_coords.x < 1.0 && rel_coords.y > 0.0 && rel_coords.y < 1.0) {
        highp float pL = texture2D(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        highp float pR = texture2D(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        highp float pB = texture2D(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        highp float pT = texture2D(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        highp vec2 current_velocity = velocity_sample(rel_coords);
        return (current_velocity - halfrdx * vec2(pR - pL, pT - pB)).x;
    } else {
        return texture2D(velocity_sampler_x, rel_coords).x;
    }
}


void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(gradient_sub(coords), 0.0, 0.0, 0.0);
}
`;


const fsGradientSubY =
`
varying highp vec2 rel_coords;

uniform sampler2D velocity_sampler_x;
uniform sampler2D velocity_sampler_y;
uniform sampler2D pressure_sampler;

uniform highp float timestep;
uniform highp float dx;
uniform highp float viscosity;
uniform ivec2 size;

highp vec2 velocity_sample(highp vec2 c) {
    highp float d = 1.0 / float(size.x);

    highp float ux = texture2D(velocity_sampler_x, vec2(d + c.x * (1.0 - 2.0 * d), -d + c.y * (1.0 + 2.0 * d))).x;
    highp float uy = texture2D(velocity_sampler_y, rel_coords).x;

    return vec2(ux, uy);
}

highp float gradient_sub(ivec2 coords) {
    highp vec2 d = vec2(1.0) / (vec2(size) - vec2(1));
    
    highp float halfrdx = 0.5 / dx;

    if (rel_coords.x > 0.0 && rel_coords.x < 1.0 && rel_coords.y > 0.0 && rel_coords.y < 1.0) {
        highp float pL = texture2D(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        highp float pR = texture2D(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        highp float pB = texture2D(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        highp float pT = texture2D(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        highp vec2 current_velocity = velocity_sample(rel_coords);
        return (current_velocity - halfrdx * vec2(pR - pL, pT - pB)).y;
    } else {
        return texture2D(velocity_sampler_y, rel_coords).x;
    }
}


void main() {
    ivec2 coords = ivec2(floor(rel_coords * vec2(size)));

    gl_FragColor = vec4(gradient_sub(coords), 0.0, 0.0, 0.0);
}
`;

let SCREEN_WIDTH = 1024;
let SCREEN_HEIGHT = 1024;
const COLOR_WIDTH = 2048;
const COLOR_HEIGHT = 2048;
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

    gl.uniform1f(gl.getUniformLocation(shader, "timestep"), context.timestep);
    gl.uniform1f(gl.getUniformLocation(shader, "viscosity"), context.viscosity);
    gl.uniform2i(gl.getUniformLocation(shader, "size"), SIM_WIDTH, SIM_HEIGHT);
    gl.uniform2i(gl.getUniformLocation(shader, "size_color"), COLOR_WIDTH, COLOR_HEIGHT);
    
    let dx;
    if (context.new_color) {
        dx = 1.0 / COLOR_WIDTH;
        gl.uniform3f(gl.getUniformLocation(shader, "new_color"), context.new_color[0], context.new_color[1], context.new_color[2]);
        
        if (context.click_pos) {
            // console.log((SCREEN_WIDTH - 1) * context.click_pos[0], (SCREEN_HEIGHT - 1) * context.click_pos[1]);
            gl.uniform2i(gl.getUniformLocation(shader, "click_pos"), (COLOR_WIDTH - 1) * context.click_pos[0], (COLOR_HEIGHT - 1) * context.click_pos[1]);
        }
    } else {
        dx = 1.0 / SIM_WIDTH;

        if (context.click_pos) {
            // console.log((SIM_WIDTH - 1) * context.click_pos[0], (SIM_HEIGHT - 1) * context.click_pos[1]);
            gl.uniform2i(gl.getUniformLocation(shader, "click_pos"), (SIM_WIDTH - 1) * context.click_pos[0], (SIM_HEIGHT - 1) * context.click_pos[1]);
        }
    }

    dx = 10.0;
    // dx = 1 /dx;
    
    gl.uniform1f(gl.getUniformLocation(shader, "dx"), dx);
    gl.uniform1f(gl.getUniformLocation(shader, "dy"), dx * SCREEN_WIDTH / SCREEN_HEIGHT);

    if (context.force_dir) {
        gl.uniform2f(gl.getUniformLocation(shader, "force_dir"), (SIM_WIDTH - 1) * context.force_dir.x, (SIM_HEIGHT - 1) * context.force_dir.y);
    }

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    // gl.bindVertexArray(null);
}



function main() {
    const body = document.querySelector("body");
    const info = document.querySelector("#info-section > span");
    const canvas = document.querySelector("#glCanvas");

    SCREEN_WIDTH = body.getBoundingClientRect().width;
    SCREEN_HEIGHT = body.getBoundingClientRect().height;

    console.log([ SCREEN_WIDTH, SCREEN_HEIGHT ]);

    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;

    let click_pos;
    let force_dir = {
        x: 0,
        y: 0
    };
    let rec_force_dir = {
        x: 0,
        y: 0
    };
    
    // canvas.addEventListener("touch", (e) => {
    //     const x = e.clientX - canvas.getBoundingClientRect().left;
    //     const y = SCREEN_HEIGHT - (e.clientY - canvas.getBoundingClientRect().top) - 1;

    //     click_pos = [x / (SCREEN_WIDTH - 1), y / (SCREEN_HEIGHT - 1)];
    // });

    // Initialisation du contexte WebGL
    let loaded_func = loadGL(canvas);

    const version = loaded_func.version;
    const gl = loaded_func.gl;
    const inner_formats = loaded_func.inner_format;
    const formats = loaded_func.format;
    const types = loaded_func.type;

    const high_prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const medium_prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
    const low_prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT);

    const refresh = (dt) => {
        info.innerHTML = 
        `
        Linear Float Texture extension:  ${loaded_func.exts.texture_float_linear ? 'Yes' : 'No' }<br>
        Version: ${version}<br>
        Renderer Size: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}<br>
        Supports "Float32 Texture": ${loaded_func.float32Support ? 'Yes' : 'No' }
        `;
    }
    
    // Continuer seulement si WebGL est disponible et fonctionnel
    if (!gl) {
        alert("Impossible d'initialiser WebGL. Votre navigateur ou votre machine peut ne pas le supporter.");
        return;
    }

    if (types.float === null) {
        alert("No float type supported");
        return;
    }

    // alert('Version: ' + version);
    
    const quad = new Quad(gl);
    const render_shader = initShaderProgram(gl, vsRender, fsRender);
    const first_color_shader = initShaderProgram(gl, vsRender, fsFirstColor);
    const set_color_shader = initShaderProgram(gl, vsRender, fsSetColor);
    const advect_boundary_x_shader = initShaderProgram(gl, vsRender, fsAdvectBoundaryX);
    const advect_boundary_y_shader = initShaderProgram(gl, vsRender, fsAdvectBoundaryY);
    const advect_color_shader = initShaderProgram(gl, vsRender, fsAdvectColor);
    const advect_velocity_x_shader = initShaderProgram(gl, vsRender, fsAdvectVelocityX);
    const advect_velocity_y_shader = initShaderProgram(gl, vsRender, fsAdvectVelocityY);
    const advect_pressure_shader = initShaderProgram(gl, vsRender, fsAdvectPressure);
    const diffuse_x_shader = initShaderProgram(gl, vsRender, fsDiffuseX);
    const diffuse_y_shader = initShaderProgram(gl, vsRender, fsDiffuseY);
    const apply_force_x_shader = initShaderProgram(gl, vsRender, fsApplyForceX);
    const apply_force_y_shader = initShaderProgram(gl, vsRender, fsApplyForceY);
    const divergence_shader = initShaderProgram(gl, vsRender, fsDivergence);
    const pressure_boundary_shader = initShaderProgram(gl, vsRender, fsPressureBoundary);
    const pressure_solve_shader = initShaderProgram(gl, vsRender, fsPressureSolve);
    const gradient_sub_x_shader = initShaderProgram(gl, vsRender, fsGradientSubX);
    const gradient_sub_y_shader = initShaderProgram(gl, vsRender, fsGradientSubY);

    
    // inner_formats.rgbaf = gl.RGBA16F; 
    // inner_formats.rgf = gl.RG16F; 
    // inner_formats.rf = gl.R16F; 
    // formats.rgba = gl.RGBA;
    // formats.rg = gl.RG;
    // formats.r = gl.RED;
    // types.float = gl.HALF_FLOAT;

    // const color1 = loadTextureData(gl, SCREEN_WIDTH, SCREEN_HEIGHT, gl.RGBA, gl.RGBA, hf_ext.HALF_FLOAT_OES);
    const color1 = loadTextureData(gl, COLOR_WIDTH, COLOR_HEIGHT, inner_formats.rgbaf, formats.rgba, types.float);
    const color2 = loadTextureData(gl, COLOR_WIDTH, COLOR_HEIGHT, inner_formats.rgbaf, formats.rgba, types.float);
    const velocity1x = loadTextureData(gl, SIM_WIDTH + 1, SIM_HEIGHT, inner_formats.rf, formats.r, types.float);
    const velocity2x = loadTextureData(gl, SIM_WIDTH + 1, SIM_HEIGHT, inner_formats.rf, formats.r, types.float);
    const velocity1y = loadTextureData(gl, SIM_WIDTH, SIM_HEIGHT + 1, inner_formats.rf, formats.r, types.float);
    const velocity2y = loadTextureData(gl, SIM_WIDTH, SIM_HEIGHT + 1, inner_formats.rf, formats.r, types.float);
    const pressure1 = loadTexture(gl, SIM_WIDTH, SIM_HEIGHT, inner_formats.rf, formats.r, types.float);
    const pressure2 = loadTexture(gl, SIM_WIDTH, SIM_HEIGHT, inner_formats.rf, formats.r, types.float);
    const divergence = loadTexture(gl, SIM_WIDTH, SIM_HEIGHT, inner_formats.rf, formats.r, types.float);

    const color1_fb = loadFramebuffer(gl, color1);
    const color2_fb = loadFramebuffer(gl, color2);
    const velocity1x_fb = loadFramebuffer(gl, velocity1x);
    const velocity2x_fb = loadFramebuffer(gl, velocity2x);
    const velocity1y_fb = loadFramebuffer(gl, velocity1y);
    const velocity2y_fb = loadFramebuffer(gl, velocity2y);
    const pressure1_fb = loadFramebuffer(gl, pressure1);
    const pressure2_fb = loadFramebuffer(gl, pressure2);
    const divergence_fb = loadFramebuffer(gl, divergence);

    let then = 0.0;

    const textures = {
        color1: color1,
        color2: color2,
        velocity1x: velocity1x,
        velocity2x: velocity2x,
        velocity1y: velocity1y,
        velocity2y: velocity2y,
        pressure1: pressure1,
        pressure2: pressure2,
        divergence: divergence
    };

    const framebuffers = {
        color1: color1_fb,
        color2: color2_fb,
        velocity1x: velocity1x_fb,
        velocity2x: velocity2x_fb,
        velocity1y: velocity1y_fb,
        velocity2y: velocity2y_fb,
        pressure1: pressure1_fb,
        pressure2: pressure2_fb,
        divergence: divergence_fb
    };

    const shaders = {
        render: render_shader,
        first_color: first_color_shader,
        set_color: set_color_shader,
        advect_boundary_x: advect_boundary_x_shader,
        advect_boundary_y: advect_boundary_y_shader,
        advect_color: advect_color_shader,
        advect_velocity_x: advect_velocity_x_shader,
        advect_velocity_y: advect_velocity_y_shader,
        advect_pressure: advect_pressure_shader,
        diffuse_x: diffuse_x_shader,
        diffuse_y: diffuse_y_shader,
        apply_force_x: apply_force_x_shader,
        apply_force_y: apply_force_y_shader,
        divergence: divergence_shader,
        pressure_boundary: pressure_boundary_shader,
        pressure_solve: pressure_solve_shader,
        gradient_sub_x: gradient_sub_x_shader,
        gradient_sub_y: gradient_sub_y_shader
    };

    const context = {
        timestep: 0.033,
        viscosity: 1.0
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
    window.addEventListener("resize", (e) => {
        // console.log('resize');
        SCREEN_WIDTH = window.innerWidth;
        SCREEN_HEIGHT = window.innerHeight;
        canvas.width = SCREEN_WIDTH;
        canvas.height = SCREEN_HEIGHT;
    }, false);

    canvas.addEventListener("mousemove", mouse_move_func, false);
    canvas.addEventListener("touchmove", touch_move_func, false);

    runStep(gl, context, quad, shaders.first_color, framebuffers.color1, []);

    const step_func = (deltaTime) => {
        context.timestep = deltaTime / 1000.0;

        gl.viewport(0, 0, SIM_WIDTH + 1, SIM_HEIGHT);
        
        runStep(gl, context, quad, shaders.advect_boundary_x, framebuffers.velocity2x, [ 
            { id: textures.velocity1x, name: "velocity_sampler_x" }
        ]);
        
        [ textures.velocity1x, textures.velocity2x ] = [ textures.velocity2x, textures.velocity1x ];
        [ framebuffers.velocity1x, framebuffers.velocity2x ] = [ framebuffers.velocity2x, framebuffers.velocity1x ];

        gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT + 1);
        
        runStep(gl, context, quad, shaders.advect_boundary_y, framebuffers.velocity2y, [ 
            { id: textures.velocity1y, name: "velocity_sampler_y" }
        ]);
        
        [ textures.velocity1y, textures.velocity2y ] = [ textures.velocity2y, textures.velocity1y ];
        [ framebuffers.velocity1y, framebuffers.velocity2y ] = [ framebuffers.velocity2y, framebuffers.velocity1y ];
        
        gl.viewport(0, 0, COLOR_WIDTH, COLOR_HEIGHT);

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
            { id: textures.velocity1x, name: "velocity_sampler_x" },
            { id: textures.velocity1y, name: "velocity_sampler_y" }
        ]);
        
        [ textures.color1, textures.color2 ] = [ textures.color2, textures.color1 ];
        [ framebuffers.color1, framebuffers.color2] = [ framebuffers.color2, framebuffers.color1 ];
        
        gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT);

        runStep(gl, context, quad, shaders.advect_pressure, framebuffers.pressure2, [ 
            { id: textures.velocity1x, name: "velocity_sampler_x" },
            { id: textures.velocity1y, name: "velocity_sampler_y" },
            { id: textures.pressure1, name: "pressure_sampler" }
        ]);

        [ textures.pressure1, textures.pressure2 ] = [ textures.pressure2, textures.pressure1 ];
        [ framebuffers.pressure1, framebuffers.pressure2 ] = [ framebuffers.pressure2, framebuffers.pressure1 ];

        gl.viewport(0, 0, SIM_WIDTH + 1, SIM_HEIGHT);

        runStep(gl, context, quad, shaders.advect_velocity_x, framebuffers.velocity2x, [ 
            { id: textures.velocity1x, name: "velocity_sampler_x" },
            { id: textures.velocity1y, name: "velocity_sampler_y" }
        ]);

        [ textures.velocity1x, textures.velocity2x ] = [ textures.velocity2x, textures.velocity1x ];
        [ framebuffers.velocity1x, framebuffers.velocity2x ] = [ framebuffers.velocity2x, framebuffers.velocity1x ];

        gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT + 1);

        runStep(gl, context, quad, shaders.advect_velocity_y, framebuffers.velocity2y, [ 
            { id: textures.velocity1x, name: "velocity_sampler_x" },
            { id: textures.velocity1y, name: "velocity_sampler_y" }
        ]);

        [ textures.velocity1y, textures.velocity2y ] = [ textures.velocity2y, textures.velocity1y ];
        [ framebuffers.velocity1y, framebuffers.velocity2y ] = [ framebuffers.velocity2y, framebuffers.velocity1y ];

        for (let i = 0; i < 30; ++i) {
            gl.viewport(0, 0, SIM_WIDTH + 1, SIM_HEIGHT);

            runStep(gl, context, quad, shaders.diffuse_x, framebuffers.velocity2x, [ 
                { id: textures.velocity1x, name: "velocity_sampler_x" },
                { id: textures.velocity1y, name: "velocity_sampler_y" }
            ]);

            [ textures.velocity1x, textures.velocity2x ] = [ textures.velocity2x, textures.velocity1x ];
            [ framebuffers.velocity1x, framebuffers.velocity2x ] = [ framebuffers.velocity2x, framebuffers.velocity1x ];

            gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT + 1);

            runStep(gl, context, quad, shaders.diffuse_y, framebuffers.velocity2y, [ 
                { id: textures.velocity1x, name: "velocity_sampler_x" },
                { id: textures.velocity1y, name: "velocity_sampler_y" }
            ]);

            [ textures.velocity1y, textures.velocity2y ] = [ textures.velocity2y, textures.velocity1y ];
            [ framebuffers.velocity1y, framebuffers.velocity2y ] = [ framebuffers.velocity2y, framebuffers.velocity1y ];
        }

        if (is_button_down) {
            context.click_pos = click_pos;
            context.force_dir = force_dir;

            gl.viewport(0, 0, SIM_WIDTH + 1, SIM_HEIGHT);

            runStep(gl, context, quad, shaders.apply_force_x, framebuffers.velocity2x, [
                { id: textures.velocity1x, name: "velocity_sampler_x" },
                { id: textures.velocity1y, name: "velocity_sampler_y" }
            ]);

            [ textures.velocity1x, textures.velocity2x ] = [ textures.velocity2x, textures.velocity1x ];
            [ framebuffers.velocity1x, framebuffers.velocity2x ] = [ framebuffers.velocity2x, framebuffers.velocity1x ];

            gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT + 1);

            runStep(gl, context, quad, shaders.apply_force_y, framebuffers.velocity2y, [
                { id: textures.velocity1x, name: "velocity_sampler_x" },
                { id: textures.velocity1y, name: "velocity_sampler_y" },
            ]);

            [ textures.velocity1y, textures.velocity2y ] = [ textures.velocity2y, textures.velocity1y ];
            [ framebuffers.velocity1y, framebuffers.velocity2y ] = [ framebuffers.velocity2y, framebuffers.velocity1y ];

            delete context.click_pos;
            delete context.force_dir;

            rec_force_dir.x = force_dir.x;
            rec_force_dir.y = force_dir.y;

            force_dir.x = 0;
            force_dir.y = 0;
        }

        gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT);

        runStep(gl, context, quad, shaders.divergence, framebuffers.divergence, [
            { id: textures.velocity1x, name: "velocity_sampler_x" },
            { id: textures.velocity1y, name: "velocity_sampler_y" }
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

        gl.viewport(0, 0, SIM_WIDTH + 1, SIM_HEIGHT);

        runStep(gl, context, quad, shaders.advect_boundary_x, framebuffers.velocity2x, [ 
            { id: textures.velocity1x, name: "velocity_sampler_x" }
        ]);
        
        [ textures.velocity1x, textures.velocity2x ] = [ textures.velocity2x, textures.velocity1x ];
        [ framebuffers.velocity1x, framebuffers.velocity2x ] = [ framebuffers.velocity2x, framebuffers.velocity1x ];
        
        gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT + 1);
        
        runStep(gl, context, quad, shaders.advect_boundary_y, framebuffers.velocity2y, [ 
            { id: textures.velocity1y, name: "velocity_sampler_y" }
        ]);
        
        [ textures.velocity1y, textures.velocity2y ] = [ textures.velocity2y, textures.velocity1y ];
        [ framebuffers.velocity1y, framebuffers.velocity2y ] = [ framebuffers.velocity2y, framebuffers.velocity1y ];

        gl.viewport(0, 0, SIM_WIDTH + 1, SIM_HEIGHT);

        runStep(gl, context, quad, shaders.gradient_sub_x, framebuffers.velocity2x, [ 
            { id: textures.pressure1, name: "pressure_sampler" },
            { id: textures.velocity1x, name: "velocity_sampler_x" },
            { id: textures.velocity1y, name: "velocity_sampler_y" }
        ]);

        [ textures.velocity1x, textures.velocity2x ] = [ textures.velocity2x, textures.velocity1x ];
        [ framebuffers.velocity1x, framebuffers.velocity2x ] = [ framebuffers.velocity2x, framebuffers.velocity1x ];

        gl.viewport(0, 0, SIM_WIDTH, SIM_HEIGHT + 1);
        
        runStep(gl, context, quad, shaders.gradient_sub_y, framebuffers.velocity2y, [ 
            { id: textures.pressure1, name: "pressure_sampler" },
            { id: textures.velocity1x, name: "velocity_sampler_x" },
            { id: textures.velocity1y, name: "velocity_sampler_y" }
        ]);

        [ textures.velocity1y, textures.velocity2y ] = [ textures.velocity2y, textures.velocity1y ];
        [ framebuffers.velocity1y, framebuffers.velocity2y ] = [ framebuffers.velocity2y, framebuffers.velocity1y ];

        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    // setInterval(() => {
        
    // }, 33);
    const color1_ref = framebuffers.color1;

    let deltaTime;
    // Draw the scene repeatedly
    function render(now) {
        deltaTime = now - then;
        then = now;

        
        step_func(deltaTime);

        drawScene(gl, quad, shaders, textures, framebuffers, deltaTime);
        
        requestAnimationFrame(render);
    }

    setInterval(() => {
        refresh(Math.round(deltaTime * 100) / 100);
    }, 100)

    requestAnimationFrame(render);
}

window.onload = () => {
    main(); 
}