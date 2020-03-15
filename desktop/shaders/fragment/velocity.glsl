#version 430

in vec2 coords;
out vec4 _frag_color;

uniform sampler2D tex;


void main() {
    vec2 velocity = texture(tex, coords).rg;

    _frag_color = vec4(length(velocity) * 0.01f, 0.0f, 0.0f, 1.0f);
}