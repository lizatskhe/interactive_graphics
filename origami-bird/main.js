console.log("starting");

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl", { alpha: true });
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

let isFolding = false;

function startFolding() {
  console.log("starting flower folding");
  isFolding = true;
  currentFoldStep = 0;
  lastStepTime = 0;

  for (let fold of manualFolds) {
    fold.angle = 0;
    fold.active = false;
  }

  if (manualFolds.length > 0) {
    manualFolds[0].active = true;
    console.log("step 1");
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const foldBtn = document.getElementById('foldBtn');
  if (foldBtn) {
    foldBtn.addEventListener('click', () => {
      console.log('fold button clicked');
      startFolding();
    });
    console.log("button event listener added successfully");
  } else {
    console.error("could not find element with id 'foldBtn'");
  }
});


async function loadShaderSource(url) {
  const response = await fetch(url);
  return await response.text();
}

async function initShaders() {
  const vsSource = await loadShaderSource("shaders/vertex.glsl");
  const fsSource = await loadShaderSource("shaders/fragment.glsl");

  const vertexShader = compileShader(gl.VERTEX_SHADER, vsSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("unable to initialize the shader:", gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
console.log("shader program initialized");


// create a square paper
function createPaperGeometry(subdivisions = 10, scale = 0.3) { // with a scale parameter
  const positions = [];
  const normals = [];

  for (let i = 0; i < subdivisions; i++) {
    for (let j = 0; j < subdivisions; j++) {
      // scale down the coordinates
      const x0 = (i / subdivisions - 0.5) * scale;
      const x1 = ((i + 1) / subdivisions - 0.5) * scale;
      const y0 = 0; // keep Y at 0 (flat)
      const y1 = 0;
      const z0 = (j / subdivisions - 0.5) * scale;
      const z1 = ((j + 1) / subdivisions - 0.5) * scale;

      // two triangles per quad
      positions.push(x0, y0, z0, x1, y1, z0, x1, y1, z1);
      positions.push(x0, y0, z0, x1, y1, z1, x0, y0, z1);

      // normals pointing up - for lighting
      for (let k = 0; k < 6; k++) {
        normals.push(0, 1, 0);
      }
    }
  }

  console.log("geometry created: ", positions.length / 3, " vertices");
  console.log("paper size: ", scale, "x", scale, "units");

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
  };
}

function createShadowPlane() {
  const positions = [
    -2, -0.5, -2, 2, -0.5, -2, 2, -0.5, 2,
    -2, -0.5, -2, 2, -0.5, 2, -2, -0.5, 2
  ];

  const normals = [
    0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, 1, 0, 0, 1, 0, 0, 1, 0
  ];

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
  };
}

//project each vertex onto the shadow plane
function createShadowVertices(originalPositions, transformedPositions, lightPos) {
  const shadowPositions = [];
  const planeY = -0.49; // slightly above the shadow plane to avoid z-fighting

  for (let i = 0; i < transformedPositions.length; i += 3) {
    const vertex = [
      transformedPositions[i],
      transformedPositions[i + 1],
      transformedPositions[i + 2]
    ];

    // project vertex onto the shadow plane using light position
    const lightToVertex = [
      vertex[0] - lightPos[0],
      vertex[1] - lightPos[1],
      vertex[2] - lightPos[2]
    ];

    // find intersection with y = planeY plane (where ray intersects the shadow plane)
    const t = (planeY - lightPos[1]) / lightToVertex[1];

    // projected x and z coordinates
    const shadowX = lightPos[0] + t * lightToVertex[0];
    const shadowZ = lightPos[2] + t * lightToVertex[2];

    shadowPositions.push(shadowX, planeY, shadowZ);
  }

  return new Float32Array(shadowPositions);
}


// paper flower folding 
let manualFolds = [
  // OUTER PETALS (4 petals from corners)
  // step 1: fold top-left petal upward
  {
    axis: [-0.707, 0, -0.707], // fold axis
    pivot: [-0.05, 0, 0.05], // fold origin point
    angle: 0, // current angle
    targetAngle: Math.PI / 2, 
    speed: 1.0,
    condition: (pos) => pos[0] < -0.08 && pos[2] > 0.08, // which part of the paper to fold
    active: false
  },

  // // step 2: fold top-right petal upward 
  {
    axis: [-0.707, 0, 0.707], 
    pivot: [0.05, 0, 0.05], // top-right quadrant pivot
    angle: 0,
    targetAngle: Math.PI / 2, 
    speed: 1.0,
    condition: (pos) => pos[0] > 0.08 && pos[2] > 0.08, // top-right quadrant
    active: false
  },

  // step 3: fold bottom-left petal upward
  {
    axis: [0.707, 0, -0.707], 
    pivot: [-0.05, 0, -0.05], // bottom-left quadrant pivot
    angle: 0,
    targetAngle: Math.PI / 2, 
    speed: 1.0,
    condition: (pos) => pos[0] < -0.08 && pos[2] < -0.08, // bottom-left quadrant
    active: false
  },

  // step 4: fold bottom-right petal upward
  {
    axis: [0.707, 0, 0.707], 
    pivot: [0.05, 0, -0.05], // bottom-right quadrant pivot
    angle: 0,
    targetAngle: Math.PI / 2, 
    speed: 1.0,
    condition: (pos) => pos[0] > 0.08 && pos[2] < -0.08, // bottom-right quadrant
    active: false
  },
  // INNER PETALS (4 additional petals from flat areas)
  // step 5: fold left inner petal (between top-left and bottom-left)
  {
    axis: [0, 0, -1], 
    pivot: [-0.12, 0, 0], // left edge
    angle: 0,
    targetAngle: Math.PI / 3, 
    speed: 1.2,
    condition: (pos) => pos[0] < -0.05 && Math.abs(pos[2]) < 0.05,
    active: false
  },

  // step 6: fold right inner petal 
  {
    axis: [0, 0, 1], 
    pivot: [0.12, 0, 0], // right edge
    angle: 0,
    targetAngle: Math.PI / 3,
    speed: 1.2,
    condition: (pos) => pos[0] > 0.05 && Math.abs(pos[2]) < 0.05,
    active: false
  },

  // step 7: fold top inner petal
  {
    axis: [-1, 0, 0], 
    pivot: [0, 0, 0.12], // top edge
    angle: 0,
    targetAngle: Math.PI / 3,
    speed: 1.2,
    condition: (pos) => pos[2] > 0.05 && Math.abs(pos[0]) < 0.05,
    active: false
  },

  // step 8: fold bottom inner petal
  {
    axis: [1, 0, 0], 
    pivot: [0, 0, -0.12], // bottom edge
    angle: 0,
    targetAngle: Math.PI / 3,
    speed: 1.2,
    condition: (pos) => pos[2] < -0.05 && Math.abs(pos[0]) < 0.05,
    active: false
  }

];

let currentFoldStep = 0;
let stepDelay = 1000; // 1 second delay between steps
let lastStepTime = 0;

let currentFoldIndex = 0;


function createFolds(positions, subdivisions) {
  const folds = [];
  for (let i = 0; i < subdivisions; i++) {
    for (let j = 0; j < subdivisions; j++) {
      const baseIndex = (i * subdivisions + j) * 6 * 3; // 6 vertices * 3 coords

      // compute the center of the quad
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 6; k++) {
        cx += positions[baseIndex + k * 3 + 0];
        cy += positions[baseIndex + k * 3 + 1];
        cz += positions[baseIndex + k * 3 + 2];
      }
      cx /= 6; cy /= 6; cz /= 6;

      // create a fold region
      folds.push({
        indices: Array.from({ length: 6 }, (_, k) => baseIndex + k * 3),
        pivot: [cx, cy, cz],
        axis: [1, 0, 0], // horizontal fold by default
        angle: 0,
        targetAngle: Math.PI / 2, // 90° fold
        speed: 1.0,
      });
    }
  }

  return folds;
}

function rotatePointAroundAxis(point, pivot, axis, angle) {
  const out = glMatrix.vec3.create();
  const translated = glMatrix.vec3.create();
  glMatrix.vec3.subtract(translated, point, pivot); // move to origin

  const rotationMatrix = glMatrix.mat4.create();
  glMatrix.mat4.fromRotation(rotationMatrix, angle, axis);

  glMatrix.vec3.transformMat4(translated, translated, rotationMatrix);
  glMatrix.vec3.add(out, translated, pivot); // move back

  return out;
}


async function main() {
  const shaderProgram = await initShaders();
  gl.useProgram(shaderProgram);

  const attribLocations = { // shader attributes
    position: gl.getAttribLocation(shaderProgram, "aPosition"),
    normal: gl.getAttribLocation(shaderProgram, "aNormal"),
  };

  const uniformLocations = {
    projection: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
    modelView: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    normalMatrix: gl.getUniformLocation(shaderProgram, "uNormalMatrix"),

    lightPos: gl.getUniformLocation(shaderProgram, "uLightPosition"),
    lightColor: gl.getUniformLocation(shaderProgram, "uLightColor"),
    lightIntensities: gl.getUniformLocation(shaderProgram, "uLightIntensities"),

    baseColor: gl.getUniformLocation(shaderProgram, "uBaseColor"),
    shininess: gl.getUniformLocation(shaderProgram, "uShininess"),
    specularStrength: gl.getUniformLocation(shaderProgram, "uSpecularStrength"),

    viewPos: gl.getUniformLocation(shaderProgram, "uViewPos"),
    time: gl.getUniformLocation(shaderProgram, "uTime"),
    bloomThreshold: gl.getUniformLocation(shaderProgram, "uBloomThreshold"),
    bloomIntensity: gl.getUniformLocation(shaderProgram, "uBloomIntensity"),
    isShadow: gl.getUniformLocation(shaderProgram, "uIsShadow"),
    isFlower: gl.getUniformLocation(shaderProgram, "uIsFlower"),
  };

  function setupEnhancedLighting(time) {
    // three dynamic light sources
    const lightPositions = [
      // main rotating light (warm)
      2.5 * Math.cos(time * 0.5),
      2.0 + Math.sin(time * 0.3),
      2.5 * Math.sin(time * 0.5),

      // secondary light (cool, counter-rotating)
      -1.5 * Math.cos(time * 0.3 + Math.PI),
      1.5,
      -1.5 * Math.sin(time * 0.3 + Math.PI),

      // // accent light (subtle, high up)
      0.5 * Math.sin(time * 0.7),
      3.0,
      0.5 * Math.cos(time * 0.7)
    ];

    const lightColors = [
      // warm main light
      1.0, 0.9, 0.7,

      // cool secondary light
      0.7, 0.8, 1.0,

      // soft accent light
      0.9, 0.95, 1.0
    ];

    const lightIntensities = [
      1.2,  // main light
      0.8,  // secondary light
      0.4   // accent light
    ];

    gl.uniform3fv(uniformLocations.lightPositions, lightPositions);
    gl.uniform3fv(uniformLocations.lightColors, lightColors);
    gl.uniform1fv(uniformLocations.lightIntensities, lightIntensities);

    // paper-like appearance
    gl.uniform1f(uniformLocations.shininess, 32.0);
    gl.uniform1f(uniformLocations.specularStrength, 0.3);

    // bloom effect settings
    gl.uniform1f(uniformLocations.bloomThreshold, 0.8);
    gl.uniform1f(uniformLocations.bloomIntensity, 1.5);

    // time for animated effects
    gl.uniform1f(uniformLocations.time, time);
  }

  gl.uniform3fv(uniformLocations.viewPos, [0, 0, 0]);

  const { positions, normals } = createPaperGeometry(20, 0.5);
  const originalPositions = new Float32Array(positions); // copy for reference
  const folds = createFolds(originalPositions, 20);

  const shadowPlane = createShadowPlane();


  console.log("folds created:", folds.length);
  console.log("first fold:", folds[0]);


  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

  const shadowPlanePositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, shadowPlanePositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, shadowPlane.positions, gl.STATIC_DRAW);

  const shadowPlaneNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, shadowPlaneNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, shadowPlane.normals, gl.STATIC_DRAW);

  // shadow object buffers
  const shadowPositionBuffer = gl.createBuffer();

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let previousTime = 0;

  function render(time) {
    time *= 0.001; // convert to seconds

    const deltaTime = time - previousTime;
    previousTime = time;


    if (isFolding) {
      let allCurrentStepsDone = true;

      // only animate currently active folds
      for (let i = 0; i < manualFolds.length; i++) {
        const fold = manualFolds[i];

        if (!fold.active) continue;

        const deltaAngle = fold.speed * deltaTime;
        const remaining = fold.targetAngle - fold.angle;
        const step = Math.sign(remaining) * Math.min(Math.abs(remaining), deltaAngle);
        fold.angle += step;

        if (Math.abs(fold.angle - fold.targetAngle) > 0.01) {
          allCurrentStepsDone = false;
        } else {
          fold.angle = fold.targetAngle; // snap if close
        }
      }

      // if current step is done, move to next step after delay
      if (allCurrentStepsDone) {
        if (lastStepTime === 0) {
          lastStepTime = time;
        } else if (time - lastStepTime > stepDelay / 1000) { // convert ms to seconds
          currentFoldStep++;

          if (currentFoldStep < manualFolds.length) {
            manualFolds[currentFoldStep].active = true;
            lastStepTime = 0;
            console.log(`step ${currentFoldStep + 1}`);
          } else {
            console.log("boat folding complete");
            isFolding = false;
          }
        }
      }
    }

    setupEnhancedLighting(time);

    // perspective projection
    const aspect = canvas.width / canvas.height;
    const projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix, Math.PI / 3, aspect, 0.1, 100.0);

    // camera + model
    const modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, -0.1, -0.8]);
    glMatrix.mat4.rotateY(modelViewMatrix, modelViewMatrix, time * 0.2);

    const viewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.invert(viewMatrix, modelViewMatrix);


    const lightWorldPos = glMatrix.vec3.fromValues(
      2 * Math.cos(time * 0.5),
      2 + Math.sin(time * 0.3),
      2 * Math.sin(time * 0.5)
    );
    const lightViewPos = glMatrix.vec3.create();
    glMatrix.vec3.transformMat4(lightViewPos, lightWorldPos, viewMatrix);

    // view position for specular calculations
    const cameraWorldPos = [
      Math.sin(time * 0.2) * 0.1,  // subtle camera movement
      0.1,
      0.8
    ];
    gl.uniform3fv(uniformLocations.viewPos, cameraWorldPos);
    const cameraViewPos = glMatrix.vec3.create();
    glMatrix.vec3.transformMat4(cameraViewPos, cameraWorldPos, viewMatrix);

    gl.uniform3fv(uniformLocations.lightPos, lightViewPos);
    gl.uniform3fv(uniformLocations.viewPos, cameraViewPos);


    const normalMatrix = glMatrix.mat4.create();
    glMatrix.mat4.invert(normalMatrix, modelViewMatrix);
    glMatrix.mat4.transpose(normalMatrix, normalMatrix);

    const transformedPositions = new Float32Array(originalPositions); // fresh copy

    // apply manual folds transformations
    for (const fold of manualFolds) {
      if (!fold.active && fold.angle === 0) continue;

      for (let i = 0; i < transformedPositions.length; i += 3) {
        // use original positions for condition checking
        const originalPos = glMatrix.vec3.fromValues(
          originalPositions[i],
          originalPositions[i + 1],
          originalPositions[i + 2]
        );

        const currentPos = glMatrix.vec3.fromValues(
          transformedPositions[i],
          transformedPositions[i + 1],
          transformedPositions[i + 2]
        );

        if (fold.condition && !fold.condition(originalPos)) continue;

        const rotated = rotatePointAroundAxis(currentPos, fold.pivot, fold.axis, fold.angle);

        transformedPositions[i + 0] = rotated[0];
        transformedPositions[i + 1] = rotated[1];
        transformedPositions[i + 2] = rotated[2];
      }
    }

    // set uniforms
    gl.uniformMatrix4fv(uniformLocations.projection, false, projectionMatrix);
    gl.uniformMatrix4fv(uniformLocations.modelView, false, modelViewMatrix);
    gl.uniformMatrix4fv(uniformLocations.normalMatrix, false, normalMatrix);

    gl.uniform3fv(uniformLocations.lightPos, lightWorldPos);
    gl.uniform3fv(uniformLocations.lightColor, [1, 1, 1]);
    gl.uniform3fv(uniformLocations.viewPos, [0, 0, 0]);

    // render shadow plane 
    gl.uniform1i(uniformLocations.isShadow, 0);
    gl.uniform1i(uniformLocations.isFlower, 0); 
    gl.uniform3fv(uniformLocations.baseColor, [5, 6, 4.5]); // light green color

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowPlanePositionBuffer);
    gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.position);

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowPlaneNormalBuffer);
    gl.vertexAttribPointer(attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.normal);

    gl.drawArrays(gl.TRIANGLES, 0, shadowPlane.positions.length / 3); // ground


    // render paper shadow
    gl.uniform1i(uniformLocations.isShadow, 1);
    gl.uniform1i(uniformLocations.isFlower, 0);


    const shadowPositions = createShadowVertices(originalPositions, transformedPositions, lightWorldPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, shadowPositions, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.position);

    // use paper normals for shadow (pointing up)
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.normal);


    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3); // shadow on the ground

    // render the paper object
    gl.uniform1i(uniformLocations.isShadow, 0);
    gl.uniform1i(uniformLocations.isFlower, 1); 


    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, transformedPositions, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.position);

    // bind normals
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.normal);

    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3); // paper

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
