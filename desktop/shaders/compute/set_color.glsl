#version 430
#pragma optionNV (unroll all)

layout(local_size_x = 16, local_size_y = 16) in;

layout(binding = 0, rgba32f) uniform restrict image2D color;

layout(location = 0) uniform sampler2D color_sampler;


uniform float timestep;

uniform vec2 dx;
uniform float viscosity;
uniform ivec2 click_pos;
uniform vec2 force_dir;
uniform vec3 new_color;


void setColor(ivec2 coords, ivec2 size) {
    vec2 rel_coords = (vec2(coords) + vec2(0.5f)) / vec2(size);

    float factor = 10.0f * timestep * length(force_dir) * exp(-  distance(vec2(coords), vec2(click_pos)) / 10.0f);
    factor = clamp(factor, 0.0f, 1.0f);

    vec3 old_color = texture(color_sampler, rel_coords).rgb;
    vec3 next_color = (1.0f - factor) * old_color + factor * new_color;

    imageStore(color, coords, vec4(next_color, 0.0f));
}


void main() {
    ivec2 coords = ivec2(gl_GlobalInvocationID);
    ivec2 size = imageSize(color);

    setColor(coords, size);
}