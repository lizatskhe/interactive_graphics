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


  // calculate dot product of normal and light direction
  float NdotL = dot(normal, lightDir);

  // ambient light fixed minimum for dark areas
  float ambientStrength = 0.15;
  vec3 ambient = ambientStrength * uLightColor;

  // diffuse with stronger contrast: clamp at 0 and sharpen shadows
  float diffuseFactor = clamp(NdotL, 0.0, 1.0);

  // sharpen the shadow edges by squaring diffuse factor to exaggerate difference
  diffuseFactor = pow(diffuseFactor, 3.0);

  vec3 diffuse = diffuseFactor * uLightColor;

  // specular remains
  float specularStrength = 0.3;
  vec3 halfwayDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfwayDir), 0.0), 16.0);
  vec3 specular = specularStrength * spec * uLightColor;

  // combine lighting with base color
  vec3 litColor = (ambient + diffuse + specular) * uBaseColor;

  // rim glow for edges
  float rim = 1.0 - max(dot(normal, viewDir), 0.0);
  rim = smoothstep(0.0, 0.3, rim);
  vec3 rimColor = vec3(1.0, 1.0, 0.6);
  vec3 glow = rim * rimColor * 0.3;

  // paper grain noise
  float grain = fbm(gl_FragCoord.xy * 0.05);
  float grainStrength = 0.15;

  vec3 paperTint = vec3(0.95, 0.92, 0.85);
  vec3 colorVariation = mix(paperTint, litColor, 0.6);

  vec3 finalColor = colorVariation + glow + grainStrength * grain * 0.15;

  gl_FragColor = vec4(finalColor, 1.0);
}
