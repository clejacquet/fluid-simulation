#version 430

in vec2 coords;
out vec4 _frag_color;

uniform sampler2D tex;


void main() {
    vec3 color = texture(tex, coords).rgb;
    _frag_color = vec4(color, 1.0f);
}