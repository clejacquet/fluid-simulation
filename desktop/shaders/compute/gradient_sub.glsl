#version 430
#pragma optionNV (unroll all)

layout(local_size_x = 16, local_size_y = 16) in;


layout(binding = 1, rg32f) uniform restrict image2D velocity;

layout(location = 1) uniform sampler2D velocity_sampler;
layout(location = 2) uniform sampler2D pressure_sampler;

uniform float timestep;

uniform vec2 dx;
uniform float viscosity;


void gradient_sub(ivec2 coords, ivec2 size) {
    vec2 rel_coords = (vec2(coords) + vec2(0.5f)) / vec2(size);
    vec2 d = vec2(1.0f) / (vec2(size) - vec2(1));
    
    float halfrdx = 0.5f / length(dx);

    vec2 current_velocity = texture(velocity_sampler, rel_coords).xy;
    vec2 new_velocity;

    if (rel_coords.x > 0.0f && rel_coords.x < 1.0f && rel_coords.y > 0.0f && rel_coords.y < 1.0f) {
        float pL = texture(pressure_sampler, rel_coords - vec2(d.x, 0)).x;
        float pR = texture(pressure_sampler, rel_coords + vec2(d.x, 0)).x;
        float pB = texture(pressure_sampler, rel_coords - vec2(0, d.y)).x;
        float pT = texture(pressure_sampler, rel_coords + vec2(0, d.y)).x;

        new_velocity = current_velocity - halfrdx * vec2(pR - pL, pT - pB);
    } else {
        new_velocity = current_velocity;
    }

    imageStore(velocity, coords, vec4(new_velocity, 0.0f, 0.0f));
}


void main() {
    ivec2 coords = ivec2(gl_GlobalInvocationID);
    ivec2 size = imageSize(velocity);

    gradient_sub(coords, size);
}