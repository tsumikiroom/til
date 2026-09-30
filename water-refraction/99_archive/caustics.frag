// caustics.frag — Worley F2-F1 caustics for TouchDesigner GLSL TOP
// Reference: water-refraction/references/bf06573c82367cf61732caefac615c5d.jpg

uniform float uScale;   // cell density       (default 8.0,  range 3.0  - 20.0)
uniform float uSpeed;   // animation speed    (default 0.5,  range 0.0  - 2.0)
uniform float uSharp;   // highlight sharpness(default 8.0,  range 2.0  - 16.0)
uniform vec3  uColorA;  // deep color         (default 0.10, 0.43, 0.55)
uniform vec3  uColorB;  // highlight color    (default 0.85, 0.98, 1.00)

out vec4 fragColor;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

vec2 worleyF1F2(vec2 uv, float t) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 o = hash2(i + g);
            o = 0.5 + 0.5 * sin(t + 6.2831 * o);
            float d = length(g + o - f);
            if (d < f1) {
                f2 = f1;
                f1 = d;
            } else if (d < f2) {
                f2 = d;
            }
        }
    }
    return vec2(f1, f2);
}

void main() {
    vec2 uv = vUV.st * uScale;
    float t = absTime.seconds * uSpeed;
    vec2 ff = worleyF1F2(uv, t);
    float edge = pow(1.0 - (ff.y - ff.x), uSharp);
    vec3 col = mix(uColorA, uColorB, edge);
    fragColor = TDOutputSwizzle(vec4(col, 1.0));
}
