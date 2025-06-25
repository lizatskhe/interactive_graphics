precision mediump float;

varying vec3 vPosition;
varying vec3 vNormal;

uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform float uLightIntensity;

uniform vec3 uBaseColor;
uniform float uShininess;
uniform float uSpecularStrength;
uniform vec3 uViewPos;

uniform int uIsShadow;
uniform int uIsFlower;
uniform float uTime;


uniform bool uIsParticle;

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
    
    vec3 bottomColor = vec3(0, 0.3, 0.1);  
    vec3 topColor = vec3(1, 0.2, 0.9);    

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
    if (uIsParticle) {
        gl_FragColor = vec4(uBaseColor, 0.6); // semi-transparent particles
        return;
    }

    if (uIsShadow == 1) {
        gl_FragColor = vec4(0.07, 0.15, 0.07, 0.7); // dark green shadow
        return;
    }
    
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uViewPos - vPosition);
    
    // gradient base color for flower, use uniform base color for ground
    vec3 baseColor = (uIsFlower == 1) ? createGradientColor(uBaseColor, vPosition) : uBaseColor;
    
    // ambient lighting
    vec3 ambient = 0.1 * baseColor;
    
    // lighting from single source
    vec3 lighting = ambient;
    
    lighting += calculatePointLight(
        uLightPosition, 
        uLightColor, 
        uLightIntensity, 
        normal, 
        vPosition, 
        viewDir
    ) * baseColor;
    
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0);
    vec3 fresnelColor = vec3(0.9, 0.95, 1.0) * fresnel * 0.3;
    lighting += fresnelColor;
    
    float sparkle = sin(uTime * 3.0 + vPosition.x * 10.0 + vPosition.z * 10.0) * 0.02 + 0.02;
    if (uIsFlower == 1) {
        vec3 sparkleColor = mix(vec3(0.7, 1.0, 0.8), vec3(1.0, 0.85, 0.7), smoothstep(-0.3, 0.4, vPosition.y));
        lighting += sparkleColor * sparkle;
    } else {
        lighting += vec3(1.0, 0.85, 0.7) * sparkle * 0.5;
    }
    
    vec3 finalColor = lighting;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
