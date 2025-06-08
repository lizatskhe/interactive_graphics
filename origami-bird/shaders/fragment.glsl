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

vec3 createGradientColor(vec3 baseColor, vec3 position) {
    float gradientFactor = smoothstep(-0.2, 0.3, position.y);
    
    vec3 bottomColor = vec3(0, 3, 1);  // Green
    vec3 topColor = vec3(15, 0, 10);    // beautiful pink-purple

    vec3 gradientColor = mix(bottomColor, topColor, gradientFactor);
    
    float hue = uTime * 0.1;
    vec3 colorVariation = vec3(
        0.1 * sin(hue),
        0.1 * sin(hue + 1.57), // PI/2
        0.1 * sin(hue + 3.14)  // PI
    );
    
    return gradientColor + colorVariation;
}

void main() {
    if (uIsShadow == 1) {
        gl_FragColor = vec4(0.07, 0.15, 0.07, 0.7); // dark green shadow
        return;
    }
    
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uViewPos - vPosition);
    
    vec3 gradientBaseColor = createGradientColor(uBaseColor, vPosition);
    
    // ambient lighting
    vec3 ambient = 0.1 * gradientBaseColor;
    
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
        ) * gradientBaseColor;  // Use gradient color here too
    }
    
    // paper-like effects
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0);
    vec3 fresnelColor = vec3(0.9, 0.95, 1.0) * fresnel * 0.3;
    lighting += fresnelColor;
    
    float sparkle = sin(uTime * 3.0 + vPosition.x * 10.0 + vPosition.z * 10.0) * 0.02 + 0.02;
    vec3 sparkleColor = mix(vec3(0.7, 1.0, 0.8), vec3(1.0, 0.85, 0.7), smoothstep(-0.3, 0.4, vPosition.y));
    lighting += sparkleColor * sparkle;
    
    // brightness for bloom
    float brightness = dot(lighting, vec3(0.299, 0.587, 0.114));
    
    vec3 finalColor = lighting;
    
    // bloom effect that adapts to gradient
    if (brightness > uBloomThreshold) {
        float bloomFactor = (brightness - uBloomThreshold) * uBloomIntensity;
        // bloom color that transitions from green-tinted at bottom to pink-purple at top
        vec3 bloomTint = mix(
            vec3(0.2, 0.4, 0.2),  // Green bloom for bottom
            vec3(0.4, 0.2, 0.4),  // Pink-purple bloom for top
            smoothstep(-0.3, 0.4, vPosition.y)
        );
        finalColor += bloomTint * bloomFactor;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}
