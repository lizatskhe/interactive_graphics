console.log("starting");

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

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

let folds = [
  {
    axis: [1, 0, 0],        // fold around X
    pivot: [0, 0, 0],       // fold origin
    angle: 0,               // current fold angle
    targetAngle: Math.PI / 2, // 90° fold
    speed: 1.0              // radians per second
  },
  {
    axis: [0, 0, 1],        // fold around Z
    pivot: [0.25, 0, 0],    // example origin
    angle: 0,
    targetAngle: -Math.PI / 2,
    speed: 1.0
  }
];

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
  };


  const { positions, normals } = createPaperGeometry(20);
  const originalPositions = new Float32Array(positions); // copy for reference
  const folds = createFolds(positions, 20);
  console.log("Folds created:", folds.length);
  console.log("First fold:", folds[0]);


  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

  gl.enable(gl.DEPTH_TEST);

  let previousTime = 0;

  function render(time) {
    time *= 0.001; // convert to seconds

    const deltaTime = time - previousTime;
    previousTime = time;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.95, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    console.log(`Fold ${currentFoldIndex} angle: ${folds[currentFoldIndex]?.angle.toFixed(3)}`);

    if (currentFoldIndex < folds.length) {
      const fold = folds[currentFoldIndex];
      const deltaAngle = fold.speed * deltaTime; // approx. 60 FPS
      const remaining = fold.targetAngle - fold.angle;
      const step = Math.sign(remaining) * Math.min(Math.abs(remaining), deltaAngle);

      fold.angle += step;

      if (Math.abs(fold.angle - fold.targetAngle) < 0.01) {
        fold.angle = fold.targetAngle;
        currentFoldIndex++;
      }
    }


    // perspective projection
    const aspect = canvas.width / canvas.height;
    const projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.perspective(projectionMatrix, Math.PI / 4, aspect, 0.1, 100.0);

    // camera + model
    const modelViewMatrix = glMatrix.mat4.create();
    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, -0.2, -1.5]);
    glMatrix.mat4.rotateY(modelViewMatrix, modelViewMatrix, time * 0.2);

    const normalMatrix = glMatrix.mat4.create();
    glMatrix.mat4.invert(normalMatrix, modelViewMatrix);
    glMatrix.mat4.transpose(normalMatrix, normalMatrix);

    const transformedPositions = new Float32Array(originalPositions); // fresh copy


    for (const fold of folds) {
      for (let idxCoord of fold.indices) {
        const idxVertex = idxCoord / 3;
        const pos = glMatrix.vec3.fromValues(
          originalPositions[idxCoord + 0],
          originalPositions[idxCoord + 1],
          originalPositions[idxCoord + 2]
        );

        const rotated = rotatePointAroundAxis(pos, fold.pivot, fold.axis, fold.angle);

        transformedPositions[idxCoord + 0] = rotated[0];
        transformedPositions[idxCoord + 1] = rotated[1];
        transformedPositions[idxCoord + 2] = rotated[2];
      }
    }


    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, transformedPositions, gl.DYNAMIC_DRAW);


    // bind positions
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.position);

    // bind normals
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLocations.normal);

    // set uniforms
    gl.uniformMatrix4fv(uniformLocations.projection, false, projectionMatrix);
    gl.uniformMatrix4fv(uniformLocations.modelView, false, modelViewMatrix);
    gl.uniformMatrix4fv(uniformLocations.normalMatrix, false, normalMatrix);

    gl.uniform3fv(uniformLocations.lightPos, [2, 2, 2]);
    gl.uniform3fv(uniformLocations.lightColor, [1, 1, 1]);
    gl.uniform3fv(uniformLocations.baseColor, [0.8, 0.7, 0.6]);


    if (currentFoldIndex < folds.length) {
      const f = folds[currentFoldIndex];
      // gl.uniform3fv(uniformLocations.foldAxis, new Float32Array(f.axis));
      // gl.uniform3fv(uniformLocations.foldOrigin, new Float32Array(f.pivot));
      // gl.uniform1f(uniformLocations.foldAngle, f.angle);
    } else {
      // No fold, reset angle
      gl.uniform1f(uniformLocations.foldAngle, 0.0);
    }


    // draw
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
