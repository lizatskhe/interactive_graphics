// window.onload = function() {
//   console.log("Starting WebGL Origami App");
//   const m = glMatrix.mat4.create();
//   console.log("mat4 loaded: ", m);
// };

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
      positions.push(x0, 0, y0,  x1, 0, y0,  x1, 0, y1);
      positions.push(x0, 0, y0,  x1, 0, y1,  x0, 0, y1);

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
  };

  const { positions, normals } = createPaperGeometry(20);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

  gl.enable(gl.DEPTH_TEST);

  function render(time) {
    time *= 0.001; // convert to seconds

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.95, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    
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

    // draw
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
