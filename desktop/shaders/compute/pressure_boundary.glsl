#version 430
#pragma optionNV (unroll all)

layout(local_size_x = 16, local_size_y = 16) in;


layout(binding = 2, r32f) uniform restrict image2D pressure;

layout(location = 2) uniform sampler2D pressure_sampler;

uniform float timestep;

uniform float viscosity;


void pressure_boundary(ivec2 coords, ivec2 size) {
    vec2 rel_coords = (vec2(coords) + vec2(0.5f)) / vec2(size);
    vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));

    float new_pressure;

    if (coords.x == 0 && coords.y == 0) {
        new_pressure = texture(pressure_sampler, rel_coords + vec2(d.x, d.y)).x;
    }
    else if (coords.x == size.x - 1 && coords.y == size.y - 1) {
        new_pressure = texture(pressure_sampler, rel_coords + vec2(-d.x, -d.y)).x;
    }
    else if (coords.x == size.x - 1 && coords.y == 0) {
        new_pressure = texture(pressure_sampler, rel_coords + vec2(-d.x, d.y)).x;
    }
    else if (coords.x == 0 && coords.y == size.y - 1) {
        new_pressure = texture(pressure_sampler, rel_coords + vec2(d.x, -d.y)).x;
    }
    else if (coords.x == 0) {
        new_pressure = texture(pressure_sampler, rel_coords + vec2(d.x, 0.0f)).x;
    }
    else if (coords.x == size.x - 1) {
        new_pressure = texture(pressure_sampler, rel_coords + vec2(-d.x, 0.0f)).x;
    }
    else if (coords.y == 0) {
        new_pressure = texture(pressure_sampler, rel_coords + vec2(0.0f, d.y)).x;
    }
    else if (coords.y == size.y - 1) {
        new_pressure = texture(pressure_sampler, rel_coords + vec2(0.0f, -d.y)).x;
    } 
    else {
        new_pressure = texture(pressure_sampler, rel_coords).x;
    }

    imageStore(pressure, coords, vec4(new_pressure, 0.0f, 0.0f, 0.0f));
}

void main() {
    ivec2 coords = ivec2(gl_GlobalInvocationID);
    ivec2 size = imageSize(pressure);

    pressure_boundary(coords, size);
}