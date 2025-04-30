// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
    const translationMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];

    // rotation matrix around the X axis
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const rotationXMatrix = [
        1, 0, 0, 0,
        0, cosX, sinX, 0,
        0, -sinX, cosX, 0,
        0, 0, 0, 1
    ];

	// rotation matrix around the Y axis
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const rotationYMatrix = [
        cosY, 0, -sinY, 0,
        0, 1, 0, 0,
        sinY, 0, cosY, 0,
        0, 0, 0, 1
    ];

    // combine transformations: rotationY -> rotationX -> translation
    const modelViewMatrix = MatrixMult(translationMatrix, MatrixMult(rotationYMatrix, rotationXMatrix));

    // combine with projection matrix
    const mvpMatrix = MatrixMult(projectionMatrix, modelViewMatrix);

    return mvpMatrix;
}

// const canvas = document.getElementById("webglCanvas");
// const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

// if (!gl) {
//     console.error("WebGL is not supported by your browser.");
// }

// function createShader(gl, type, source) {
//     const shader = gl.createShader(type);
//     gl.shaderSource(shader, source);
//     gl.compileShader(shader);
//     if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
//         console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
//         gl.deleteShader(shader);
//         return null;
//     }
//     return shader;
// }

// function createShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
//     const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
//     const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

//     if (!vertexShader || !fragmentShader) {
//         return null;
//     }

//     const program = gl.createProgram();
//     gl.attachShader(program, vertexShader);
//     gl.attachShader(program, fragmentShader);
//     gl.linkProgram(program);

//     if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
//         console.error("Error linking program:", gl.getProgramInfoLog(program));
//         gl.deleteProgram(program);
//         return null;
//     }

//     return program;
// }

// // example
// const vertexShaderSource = `
//     attribute vec3 aPosition;
//     uniform mat4 uTransform;
//     uniform int uSwapYZ;

//     void main() {
//         vec3 position = aPosition;
//         if (uSwapYZ == 1) {
//             position = vec3(position.x, position.z, position.y); // Swap Y and Z
//         }
//         gl_Position = uTransform * vec4(position, 1.0);
//     }
// `;

// // example
// const fragmentShaderSource = `
//     precision mediump float;
//     uniform int uUseTexture;

//     void main() {
//         if (uUseTexture == 1) {
//             gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // White color for texture
//         } else {
//             gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0); // Orange color
//         }
//     }
// `;


// const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
// if (!shaderProgram) {
//     console.error("Failed to create shader program.");
// } else {
//     console.log("Shader program created successfully.");
// }


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor(shaderProgram)
	{
		this.shaderProgram = shaderProgram;
        this.vertexBuffer = gl.createBuffer();
        this.numTriangles = 0; // Initialize the number of triangles to 0
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords )
	{
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    
        this.numTriangles = vertPos.length / 9; // Each triangle has 3 vertices, each with 3 coordinates
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		const swapUniformLocation = gl.getUniformLocation(shaderProgram, "uSwapYZ");

		gl.uniform1i(swapUniformLocation, swap ? 1 : 0);
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		// gl.useProgram(this.shaderProgram);
	
		// gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	
		// const positionLocation = gl.getAttribLocation(this.shaderProgram, "aPosition");
		// if (positionLocation !== -1) {
		// 	gl.enableVertexAttribArray(positionLocation);
	
		// 	gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
		// } else {
		// 	console.error("Attribute 'aPosition' not found in the shader program.");
		// 	return; 
		// }
	
		// const transformLocation = gl.getUniformLocation(this.shaderProgram, "uTransform");
		// if (transformLocation !== -1) {
		// 	gl.uniformMatrix4fv(transformLocation, false, trans);
		// } else {
		// 	console.error("Uniform 'uTransform' not found in the shader program.");
		// 	return; 
		// }
	
		// if (this.numTriangles > 0) {
		// 	gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles * 3); // Each triangle has 3 vertices
		// } else {
		// 	console.error("No triangles to draw. Ensure 'setMesh' is called with valid data.");
		// }
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const useTextureLocation = gl.getUniformLocation(shaderProgram, "uUseTexture");
        gl.uniform1i(useTextureLocation, 1);
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
        const useTextureLocation = gl.getUniformLocation(shaderProgram, "uUseTexture");
        gl.uniform1i(useTextureLocation, show ? 1 : 0);
    }
	
}
