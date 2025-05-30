console.log("starting");

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl", { alpha: true });
gl.clearColor(0.0, 0.0, 0.0, 0.0); // transparent black
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

let isFolding = false;

function startFolding() {
  console.log("starting boat folding");
  isFolding = true;
  currentFoldStep = 0;
  lastStepTime = 0;

  for (let fold of manualFolds) {
    fold.angle = 0;
    fold.active = false;
  }

  // activate first fold
  if (manualFolds.length > 0) {
    manualFolds[0].active = true;
    console.log("step 1: folding paper in half");
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


// load shaders
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


// create a square
function createPaperGeometry(subdivisions = 10) {
  const positions = [];
  const normals = [];

  for (let i = 0; i < subdivisions; i++) {
    for (let j = 0; j < subdivisions; j++) {
      const x0 = i / subdivisions - 0.5;
      const x1 = (i + 1) / subdivisions - 0.5;
      const y0 = j / subdivisions - 0.5;
      const y1 = (j + 1) / subdivisions - 0.5;

      // two triangles per quad
      positions.push(x0, 0, y0, x1, 0, y0, x1, 0, y1);
      positions.push(x0, 0, y0, x1, 0, y1, x0, 0, y1);

      for (let k = 0; k < 6; k++) {
        normals.push(0, 1, 0);
      }
    }
  }
  console.log("geometry created: ", positions.length / 3, " vertices");


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

    // find intersection with y = planeY plane
    const t = (planeY - lightPos[1]) / lightToVertex[1];

    const shadowX = lightPos[0] + t * lightToVertex[0];
    const shadowZ = lightPos[2] + t * lightToVertex[2];

    shadowPositions.push(shadowX, planeY, shadowZ);
  }

  return new Float32Array(shadowPositions);
}


// paper plane folding 
let manualFolds = [

  {
    axis: [0, 0, 1], // fold around Z-axis
    pivot: [0, 0, 0], // center line
    angle: 0,
    targetAngle: -Math.PI / 2.5, // -72 degrees (steeper)
    speed: 1.0,
    condition: (pos) => pos[0] < 0 && pos[1] > -0.1, // left side, upper part
    active: false
  },
  // fold right wing down  
  {
    axis: [0, 0, 1], // fold around Z-axis
    pivot: [0, 0, 0], // center line
    angle: 0,
    targetAngle: Math.PI / 2.5, // 72 degrees (steeper)
    speed: 1.0,
    condition: (pos) => pos[0] > 0 && pos[1] > -0.1, // right side, upper part
    active: false
  },
  // flatten wing left
  {
    axis: [0, 0, 1], // fold around Z-axis
    pivot: [-0.25, 0, 0], // pivot point on left wing
    angle: 0,
    targetAngle: Math.PI / 3, // positive angle to fold outwards
    speed: 0.8,
    condition: (pos) => pos[0] < -0.15 && pos[1] > -0.1, // left wing area
    active: false
  },
  // flatten right wing 
  {
    axis: [0, 0, 1], // fold around Z-axis
    pivot: [0.25, 0, 0], // pivot point on right wing
    angle: 0,
    targetAngle: -Math.PI / 3, // negative angle to fold outwards (opposite direction)
    speed: 0.8,
    condition: (pos) => pos[0] > 0.15 && pos[1] > -0.1, // right wing area
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

  const attribLocations = {
    position: gl.getAttribLocation(shaderProgram, "aPosition"),
    normal: gl.getAttribLocation(shaderProgram, "aNormal"),
  };

  const uniformLocations = {
    projection: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
    modelView: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    normalMatrix: gl.getUniformLocation(shaderProgram, "uNormalMatrix"),
    lightPos: gl.getUniformLocation(shaderProgram, "uLightPosition"),
    lightColor: gl.getUniformLocation(shaderProgram, "uLightColor"),
    baseColor: gl.getUniformLocation(shaderProgram, "uBaseColor"),
    foldAxis: gl.getUniformLocation(shaderProgram, "uFoldAxis"),
    foldOrigin: gl.getUniformLocation(shaderProgram, "uFoldOrigin"),
    foldAngle: gl.getUniformLocation(shaderProgram, "uFoldAngle"),
    viewPos: gl.getUniformLocation(shaderProgram, "uViewPos"),
  };

  gl.uniform3fv(uniformLocations.viewPos, [0, 0, 0]);

  const { positions, normals } = createPaperGeometry(20);
  const originalPositions = new Float32Array(positions); // copy for reference
  const folds = createFolds(originalPositions, 20);

  const shadowPlane = createShadowPlane();


  console.log("Folds created:", folds.length);
  console.log("First fold:", folds[0]);


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

  // Shadow object buffers
  const shadowPositionBuffer = gl.createBuffer();

  gl.enable(gl.DEPTH_TEST);

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


    // perspective projection
    const aspect = canvas.width / canvas.height;
    const projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix, Math.PI / 3, aspect, 0.1, 100.0);

    // camera + model
    const modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, -0.1, -1]);
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

    const cameraWorldPos = glMatrix.vec3.fromValues(0, 0, 0);
    const cameraViewPos = glMatrix.vec3.create();
    glMatrix.vec3.transformMat4(cameraViewPos, cameraWorldPos, viewMatrix);

    gl.uniform3fv(uniformLocations.lightPos, lightViewPos);
    gl.uniform3fv(uniformLocations.viewPos, cameraViewPos);


    const normalMatrix = glMatrix.mat4.create();
    glMatrix.mat4.invert(normalMatrix, modelViewMatrix);
    glMatrix.mat4.transpose(normalMatrix, normalMatrix);

    const transformedPositions = new Float32Array(originalPositions); // fresh copy



    // Apply manual folds transformations
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
    gl.uniform3fv(uniformLocations.baseColor, [0.3, 0.3, 0.3]); // dark ground

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowPlanePositionBuffer);
    gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.position);

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowPlaneNormalBuffer);
    gl.vertexAttribPointer(attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.normal);

    gl.drawArrays(gl.TRIANGLES, 0, shadowPlane.positions.length / 3);

    // render paper shadow
    gl.uniform1i(uniformLocations.isShadow, 1);
    gl.uniform3fv(uniformLocations.baseColor, [0.1, 0.1, 0.1]); // dark shadow

    const shadowPositions = createShadowVertices(originalPositions, transformedPositions, lightWorldPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, shadowPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, shadowPositions, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.position);

    // use paper normals for shadow (pointing up)
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.normal);

    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);

    // render the paper object
    gl.uniform1i(uniformLocations.isShadow, 0);
    gl.uniform3fv(uniformLocations.baseColor, [0.9, 0.85, 0.8]);



    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, transformedPositions, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.position);

    // bind normals
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.normal);



    // draw
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();

