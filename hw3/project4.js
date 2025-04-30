// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
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

class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.shaderProgram = InitShaderProgram(objVS, objFS);

		this.positionLocation = gl.getAttribLocation(this.shaderProgram, 'pos');
		this.texCoordLocation = gl.getAttribLocation(this.shaderProgram, 'txc');

		this.mvpLocation = gl.getUniformLocation(this.shaderProgram, 'mvp');
		this.useTextureLocation = gl.getUniformLocation(this.shaderProgram, 'usingTexture');
		this.swapYZLocation = gl.getUniformLocation(this.shaderProgram, 'swapYZ');

		this.positionBuffer = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();
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
	setMesh(vertPos, texCoords) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		this.numTriangles = vertPos.length / 9; // Each triangle has 3 vertices, each with 3 coordinates
	}

	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ(swap) {
		gl.useProgram(this.shaderProgram);
		gl.uniform1f(this.swapYZLocation, swap ? 1.0 : 0.0);
	}

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(mvpMatrix) {
		gl.useProgram(this.shaderProgram);
		gl.uniformMatrix4fv(this.mvpLocation, false, mvpMatrix);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.positionLocation);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.texCoordLocation);

		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles * 3);
	}


	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		gl.useProgram(this.shaderProgram);

		const texture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);

		const samplerLoc = gl.getUniformLocation(this.shaderProgram, 'tex');
		gl.uniform1f(this.useTextureLocation, 1.0);
		gl.uniform1i(samplerLoc, 0);

	}

	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture(show) {
		gl.useProgram(this.shaderProgram);
		gl.uniform1f(this.useTextureLocation, show ? 1.0 : 0.0);
	}

}


var objVS = `
	attribute vec3 pos;
	attribute vec2 txc;
	varying vec2 texCoord;

	uniform mat4 mvp;
	uniform float swapYZ;

	void main() {
		vec3 position = pos;
		if (swapYZ > 0.5) {
			position = vec3(pos.x, pos.z, pos.y);
		}
		gl_Position = mvp * vec4(position, 1.0);
		texCoord = txc;
	}
`;



var objFS = `
	precision mediump float;

	varying vec2 texCoord;
	uniform sampler2D tex;
	uniform float usingTexture;

	void main() {
		vec4 texColor = texture2D(tex, texCoord);
		vec4 fallbackColor = vec4(1.0, gl_FragCoord.z * gl_FragCoord.z, 0.0, 1.0);
		gl_FragColor = mix(fallbackColor, texColor, step(0.5, usingTexture));
	}
`;


