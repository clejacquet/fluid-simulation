#version 430
#pragma optionNV (unroll all)

layout(local_size_x = 16, local_size_y = 16) in;


layout(binding = 2, r32f) uniform restrict image2D pressure;

layout(location = 2) uniform sampler2D pressure_sampler;
layout(location = 3) uniform sampler2D divergence_sampler;

uniform float timestep;

uniform vec2 dx;
uniform float viscosity;


void pressure_solve(ivec2 coords, ivec2 size) {
    vec2 rel_coords = (vec2(coords) + vec2(0.5f)) / vec2(size);
    vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));

    float alpha = -length(dx) * length(dx);
    float r_beta = 1.0f / 4.0f;

    float pressure_val;

    if (rel_coords.x >= 0.0f && rel_coords.x <= 1.0f && rel_coords.y >= 0.0f && rel_coords.y <= 1.0f) {
        float pL = texture(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        float pR = texture(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        float pB = texture(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        float pT = texture(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        float b = texture(divergence_sampler, rel_coords).x;

        pressure_val = (pL + pR + pB + pT + alpha * b) * r_beta;
    } else {
        pressure_val = texture(pressure_sampler, rel_coords).x;
    }

    imageStore(pressure, coords, vec4(pressure_val, 0.0f, 0.0f, 0.0f));
}

void main() {
    ivec2 coords = ivec2(gl_GlobalInvocationID);
    ivec2 size = imageSize(pressure);

    pressure_solve(coords, size);
}