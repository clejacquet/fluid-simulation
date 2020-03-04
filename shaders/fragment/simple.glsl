#version 430

in vec2 coords;
out vec4 _frag_color;

uniform sampler2D tex;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    float color_factor = texture(tex, coords).r;

    vec3 color = color_factor * vec3(0.2f, 0.6f, 1.0f);
    _frag_color = vec4(color, 1.0f);
}