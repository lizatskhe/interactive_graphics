var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade(Material mtl, vec3 position, vec3 normal, vec3 view)
{
    vec3 color = vec3(0.0);

    for (int i = 0; i < NUM_LIGHTS; ++i) {
        Light light = lights[i];
        vec3 lightDir = normalize(light.position - position);

        Ray shadowRay;
        shadowRay.pos = position + normal * 0.001; // offset to avoid self-intersection
        shadowRay.dir = lightDir;

        HitInfo shadowHit;
        if (IntersectRay(shadowHit, shadowRay) && shadowHit.t < length(light.position - position)) {
            continue; // in shadow skip this light
        }

        // diffuse component
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * mtl.k_d * light.intensity;

        // specular component (Blinn-Phong)
        vec3 halfVec = normalize(lightDir + view);
        float spec = pow(max(dot(normal, halfVec), 0.0), mtl.n);
        vec3 specular = spec * mtl.k_s * light.intensity;

        color += diffuse + specular;
    }

    return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
    hit.t = 1e30; 
    bool foundHit = false;

    for (int i = 0; i < NUM_SPHERES; ++i) {
        Sphere sphere = spheres[i];
        vec3 oc = ray.pos - sphere.center;

        float a = dot(ray.dir, ray.dir);
        float b = 2.0 * dot(oc, ray.dir);
        float c = dot(oc, oc) - sphere.radius * sphere.radius;

        float discriminant = b * b - 4.0 * a * c;

        if (discriminant > 0.0) {
            float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
            float t2 = (-b + sqrt(discriminant)) / (2.0 * a);

            if (t1 > 0.0 && t1 < hit.t) {
                hit.t = t1;
                hit.position = ray.pos + t1 * ray.dir;
                hit.normal = normalize(hit.position - sphere.center);
                hit.mtl = sphere.mtl;
                foundHit = true;
            }

            if (t2 > 0.0 && t2 < hit.t) {
                hit.t = t2;
                hit.position = ray.pos + t2 * ray.dir;
                hit.normal = normalize(hit.position - sphere.center);
                hit.mtl = sphere.mtl;
                foundHit = true;
            }
        }
    }

    return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer(Ray ray)
{
    ray.dir = normalize(ray.dir); 

    HitInfo hit;
    if (IntersectRay(hit, ray)) {
        vec3 view = normalize(-ray.dir);
        vec3 clr = Shade(hit.mtl, hit.position, hit.normal, view);

        // reflections
        vec3 k_s = hit.mtl.k_s;
        for (int bounce = 0; bounce < MAX_BOUNCES; ++bounce) {
            if (bounce >= bounceLimit) break;
            if (k_s.r + k_s.g + k_s.b <= 0.0) break;

            Ray reflectionRay;
            reflectionRay.pos = hit.position + hit.normal * 0.01; // increased offset to prevent self-hit
            reflectionRay.dir = normalize(reflect(ray.dir, hit.normal)); // ensure normalized

            HitInfo reflectionHit;
            if (IntersectRay(reflectionHit, reflectionRay)) {
                vec3 reflectionView = normalize(-reflectionRay.dir);
                vec3 reflectionColor = Shade(reflectionHit.mtl, reflectionHit.position, reflectionHit.normal, reflectionView);
                clr += k_s * reflectionColor;

                // update for next bounce
                k_s *= reflectionHit.mtl.k_s;
                hit = reflectionHit;
                ray = reflectionRay;
            } else {
                clr += k_s * textureCube(envMap, reflectionRay.dir).rgb; 
                break;
            }
        }

        return vec4(clr, 1.0);
    } else {
        return vec4(textureCube(envMap, ray.dir).rgb, 0.0); 
    }
}

`;