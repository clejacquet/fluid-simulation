#version 430

layout (location = 0) in vec3 pos;

out vec2 coords;

void main() {
    gl_Position = vec4(pos, 1.0);

    coords = pos.xy * 0.5f + 0.5f;
}