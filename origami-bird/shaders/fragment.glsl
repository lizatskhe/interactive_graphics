precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform vec3 uBaseColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPosition - vPosition);
  float diff = max(dot(normal, lightDir), 0.0);

  vec3 color = uBaseColor * uLightColor * diff;
  gl_FragColor = vec4(color, 1.0);
}
