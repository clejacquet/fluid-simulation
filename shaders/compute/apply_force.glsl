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
uniform bool has_clicked;
uniform ivec2 click_pos;


void applyForce(ivec2 coords, ivec2 size) {
    vec2 rel_coords = (vec2(coords) + vec2(0.5f)) / vec2(size);
    vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));

    if (coords.x > 0 && coords.x < size.x - 1 && coords.y > 0 && coords.y < size.x - 1) {
        vec2 v_xy = 500.0f * vec2(0.0f, -1.0f) * exp(- distance(vec2(coords), vec2(click_pos)) * distance(vec2(coords), vec2(click_pos)) / 1000.0f);
        vec2 new_velocity = v_xy + texture(velocity_sampler, rel_coords).xy;

        imageStore(velocity, coords, vec4(new_velocity, 0.0f, 0.0f));
    }
}

void main() {
    if (!has_clicked) {
        return;
    }

    ivec2 coords = ivec2(gl_GlobalInvocationID);
    ivec2 size = imageSize(color);

    applyForce(coords, size);
}