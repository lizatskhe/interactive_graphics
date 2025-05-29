precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform vec3 uBaseColor;
uniform vec3 uViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPosition - vPosition);
  vec3 viewDir = normalize(uViewPosition - vPosition);

  // Ambient term
  float ambientStrength = 0.2;
  vec3 ambient = ambientStrength * uLightColor;

  // Diffuse term (Lambert)
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * uLightColor;

  // Specular term (Blinn-Phong)
  float specularStrength = 0.5;
  vec3 halfwayDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
  vec3 specular = specularStrength * spec * uLightColor;

  vec3 color = (ambient + diffuse + specular) * uBaseColor;

  gl_FragColor = vec4(color, 1.0);
}
