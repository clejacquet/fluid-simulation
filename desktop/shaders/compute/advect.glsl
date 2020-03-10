#version 430
#pragma optionNV (unroll all)

layout(local_size_x = 16, local_size_y = 16) in;

layout(binding = 0, r32f) uniform restrict image2D color;
layout(binding = 1, rg32f) uniform restrict image2D velocity;
layout(binding = 2, r32f) uniform restrict image2D pressure;

layout(location = 0) uniform sampler2D color_sampler;
layout(location = 1) uniform sampler2D velocity_sampler;
layout(location = 2) uniform sampler2D pressure_sampler;

uniform float timestep;

uniform float dx;
uniform float viscosity;

void advect(ivec2 coords, ivec2 size) {
    vec2 rel_coords = (vec2(coords) + vec2(0.5f)) / vec2(size);
    vec2 velocity_value = texture(velocity_sampler, rel_coords).xy;

    velocity_value /= vec2(size - ivec2(1));

    vec2 rel_prev_coords = rel_coords - timestep * dx * velocity_value;

    clamp(rel_prev_coords, dvec2(0.0f), dvec2(1.0f));

    float new_color = texture(color_sampler, rel_prev_coords).x;
    vec2 new_velocity = texture(velocity_sampler, rel_prev_coords).xy;
    float new_pressure = texture(pressure_sampler, rel_prev_coords).x;

    imageStore(color, coords, vec4(new_color, 0.0f, 0.0f, 0.0f));
    imageStore(velocity, coords, vec4(new_velocity, 0.0f, 0.0f));
    imageStore(pressure, coords, vec4(new_pressure, 0.0f, 0.0f, 0.0f));
}


void main() {
    ivec2 coords = ivec2(gl_GlobalInvocationID);
    ivec2 size = imageSize(color);

    advect(coords, size);
}