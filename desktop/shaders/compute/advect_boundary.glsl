#version 430
#pragma optionNV (unroll all)

layout(local_size_x = 16, local_size_y = 16) in;

layout(binding = 1, rg32f) uniform image2D velocity;

layout(location = 1) uniform sampler2D velocity_sampler;

uniform float timestep;

uniform float dx;
uniform float viscosity;


void advect_boundary(ivec2 coords, ivec2 size) {
    vec2 rel_coords = (vec2(coords) + vec2(0.5f)) / vec2(size);
    vec2 d = vec2(1.0f) / (vec2(size) - vec2(1.0f));

    vec2 new_velocity;

    if (coords.x == 0 && coords.y == 0) {
        new_velocity = - texture(velocity_sampler, rel_coords + vec2(d.x, d.y)).xy;
    }
    else if (coords.x == size.x - 1 && coords.y == size.y - 1) {
        new_velocity = - texture(velocity_sampler, rel_coords + vec2(-d.x, -d.y)).xy;
    }
    else if (coords.x == size.x - 1 && coords.y == 0) {
        new_velocity = - texture(velocity_sampler, rel_coords + vec2(-d.x, d.y)).xy;
    }
    else if (coords.x == 0 && coords.y == size.y - 1) {
        new_velocity = - texture(velocity_sampler, rel_coords + vec2(d.x, -d.y)).xy;
    }
    else if (coords.x == 0) {
        new_velocity = - texture(velocity_sampler, rel_coords + vec2(d.x, 0.0f)).xy;
    }
    else if (coords.x == size.x - 1) {
        new_velocity = - texture(velocity_sampler, rel_coords + vec2(-d.x, 0.0f)).xy;
    }
    else if (coords.y == 0) {
        new_velocity = - texture(velocity_sampler, rel_coords + vec2(0.0f, d.y)).xy;
    }
    else if (coords.y == size.y - 1) {
        new_velocity = - texture(velocity_sampler, rel_coords + vec2(0.0f, -d.y)).xy;
    } else {
        new_velocity = texture(velocity_sampler, rel_coords).xy;
    }

    imageStore(velocity, coords, vec4(new_velocity, 0.0f, 0.0f));
}

void main() {
    ivec2 coords = ivec2(gl_GlobalInvocationID);
    ivec2 size = imageSize(velocity);

    advect_boundary(coords, size);
}