#version 430
#pragma optionNV (unroll all)

layout(local_size_x = 16, local_size_y = 16) in;

layout(binding = 0, r32f) uniform image2D color;
layout(binding = 1, rg32f) uniform image2D velocity;
layout(binding = 2, r32f) uniform image2D pressure;
layout(binding = 3, r32f) uniform image2D divergence;

layout(location = 0) uniform sampler2D color_sampler;
layout(location = 1) uniform sampler2D velocity_sampler;
layout(location = 2) uniform sampler2D pressure_sampler;
layout(location = 3) uniform sampler2D divergence_sampler;

uniform float timestep;

uniform float dx;
uniform float viscosity;


void gradient_sub(ivec2 coords, ivec2 size) {
    vec2 rel_coords = (vec2(coords) + vec2(0.5f)) / vec2(size);
    vec2 d = vec2(1.0f) / (vec2(size) - vec2(1));
    
    float halfrdx = 0.5f / dx;

    if (rel_coords.x > 0.0f && rel_coords.x < 1.0f && rel_coords.y > 0.0f && rel_coords.y < 1.0f) {
        float pL = texture(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        float pR = texture(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        float pB = texture(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        float pT = texture(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        vec2 current_velocity = texture(velocity_sampler, rel_coords).xy;
        vec2 new_velocity = current_velocity - halfrdx * vec2(pR - pL, pT - pB);

        imageStore(velocity, coords, vec4(new_velocity, 0.0f, 0.0f));
    }

    memoryBarrier();
}


void main() {
    ivec2 coords = ivec2(gl_GlobalInvocationID);
    ivec2 size = imageSize(color);

    gradient_sub(coords, size);
}