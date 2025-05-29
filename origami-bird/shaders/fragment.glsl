precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform vec3 uBaseColor;
uniform vec3 uViewPosition;

// simple hash for noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}

// 2D noise function
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// fractal Brownian Motion noise for richer detail
float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 5; i++) {
    total += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return total;
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPosition - vPosition);
  vec3 viewDir = normalize(uViewPosition - vPosition);

  // lighting terms
  float ambientStrength = 0.2;
  vec3 ambient = ambientStrength * uLightColor;

  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * uLightColor;

  float specularStrength = 0.3;
  vec3 halfwayDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfwayDir), 0.0), 16.0);
  vec3 specular = specularStrength * spec * uLightColor;

  vec3 litColor = (ambient + diffuse + specular) * uBaseColor;

  // paper-like grain using fbm noise on screen coords
  float grain = fbm(gl_FragCoord.xy * 0.05);
  float grainStrength = 0.15;

  // subtle color variation to simulate paper fibers
  vec3 paperTint = vec3(0.95, 0.92, 0.85); // soft off-white
  vec3 colorVariation = mix(paperTint, litColor, 0.6);

  vec3 finalColor = mix(colorVariation, litColor, 1.0 - grainStrength) + grainStrength * grain * 0.15;

  gl_FragColor = vec4(finalColor, 1.0);
}
