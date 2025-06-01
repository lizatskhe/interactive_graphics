precision mediump float;

varying vec3 vPosition;
varying vec3 vNormal;

uniform vec3 uLightPositions[3];
uniform vec3 uLightColors[3];
uniform float uLightIntensities[3];


uniform vec3 uBaseColor;
uniform float uShininess;
uniform float uSpecularStrength;
uniform vec3 uViewPos;

uniform int uIsShadow;
uniform float uTime;

uniform float uBloomThreshold;
uniform float uBloomIntensity;

vec3 calculatePointLight(vec3 lightPos, vec3 lightColor, float intensity, vec3 normal, vec3 fragPos, vec3 viewDir) {
    vec3 lightDir = normalize(lightPos - fragPos);
    
    float diff = max(dot(normal, lightDir), 0.0);
    
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
    
    float distance = length(lightPos - fragPos);
    float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * (distance * distance));
    
    vec3 diffuse = diff * lightColor * intensity;
    vec3 specular = spec * lightColor * intensity * uSpecularStrength;
    
    return (diffuse + specular) * attenuation;
}

void main() {
    if (uIsShadow == 1) {
        //gl_FragColor = vec4(0.1, 0.1, 0.1, 0.5);
        // gl_FragColor = vec4(0.5, 0.55, 0.5, 0.3); // slight green tinted shadow
        // gl_FragColor = vec4(0.3, 0.35, 0.3, 0.4); // darker green tinted shadow        
        // gl_FragColor = vec4(0.2, 0.25, 0.2, 0.5); // darker green shadow grey-blueish
        gl_FragColor = vec4(0.07, 0.15, 0.07, 0.7); // dark green shadow
        // gl_FragColor = vec4(0.1, 0.35, 0.1, 0.5); // darker, more green shadow
        return;
    }
    
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uViewPos - vPosition);
    
    // ambient lighting
    vec3 ambient = 0.1 * uBaseColor;
    
    // lighting from multiple sources
    vec3 lighting = ambient;
    
    for (int i = 0; i < 3; i++) {
        lighting += calculatePointLight(
            uLightPositions[i], 
            uLightColors[i], 
            uLightIntensities[i], 
            normal, 
            vPosition, 
            viewDir
        ) * uBaseColor;
    }
    
    // subtle paper-like effects
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0);
    vec3 fresnelColor = vec3(0.9, 0.95, 1.0) * fresnel * 0.3;
    lighting += fresnelColor;
    
    // subtle golden sparkle for magical tulip effect
    float sparkle = sin(uTime * 3.0 + vPosition.x * 10.0 + vPosition.z * 10.0) * 0.02 + 0.02;
    lighting += vec3(1.0, 0.85, 0.7) * sparkle;
    
    // brightness for bloom
    float brightness = dot(lighting, vec3(0.299, 0.587, 0.114));
    
    vec3 finalColor = lighting;
    
    // bloom effect for bright areas with pink/purple tint
    if (brightness > uBloomThreshold) {
        float bloomFactor = (brightness - uBloomThreshold) * uBloomIntensity;
        finalColor += vec3(bloomFactor * 0.4, bloomFactor * 0.2, bloomFactor * 0.4); // Pink-purple bloom
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}
