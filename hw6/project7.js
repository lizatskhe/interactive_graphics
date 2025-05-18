// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
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
	// const mvpMatrix = MatrixMult(projectionMatrix, modelViewMatrix);
	const mvpMatrix = modelViewMatrix;

	return mvpMatrix;
}



// [TO-DO] Complete the implementation of the following class.

class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.shaderProgram = InitShaderProgram(objVS, objFS);

		this.positionLocation = gl.getAttribLocation(this.shaderProgram, 'pos');
		this.texCoordLocation = gl.getAttribLocation(this.shaderProgram, 'txc');

		this.mvpLocation = gl.getUniformLocation(this.shaderProgram, 'mvp');
		this.mvLocation = gl.getUniformLocation(this.shaderProgram, 'mv');
		this.useTextureLocation = gl.getUniformLocation(this.shaderProgram, 'usingTexture');
		this.swapYZLocation = gl.getUniformLocation(this.shaderProgram, 'swapYZ');
		this.normalLocation = gl.getUniformLocation(this.shaderProgram, 'normal');
		this.lightDirLocation = gl.getUniformLocation(this.shaderProgram, 'ltDir');
		this.alphaLocation = gl.getUniformLocation(this.shaderProgram, 'alpha');

		this.vertPos = gl.getAttribLocation(this.shaderProgram, 'vert_pos');
		this.txc = gl.getAttribLocation(this.shaderProgram, 'vert_txc');
		this.vertNormal = gl.getAttribLocation(this.shaderProgram, 'vert_n');

		this.positionBuffer = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();
		this.vertNormalbuffer = gl.createBuffer();
	}

	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords, normals) {
		// [TO-DO] Update the contents of the vertex buffer objects.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertNormalbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
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
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw(matrixMVP, matrixMV, matrixNormal) {
		gl.useProgram(this.shaderProgram);
		gl.uniformMatrix4fv(this.mvpLocation, false, matrixMVP);
		gl.uniformMatrix4fv(this.mvLocation, false, matrixMV);
		gl.uniformMatrix3fv(this.normalLocation, false, matrixNormal);

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

	// This method is called to set the incoming light direction
	setLightDir(x, y, z) {
		gl.useProgram(this.shaderProgram);
		gl.uniform3fv(this.lightDirLocation, [x, y, z]);
	}

	// This method is called to set the shininess of the material
	setShininess(shininess) {
		gl.useProgram(this.shaderProgram);
		gl.uniform1f(this.alphaLocation, shininess);
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
	}
}


// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep(dt, positions, velocities, springs, springStiffness, damping, particleMass, gravity, restitution) {
    // loop through each spring to compute spring forces
    const forces = positions.map(() => new Vec3(0, 0, 0)); // zero vectors
    for (const spring of springs) {
        const p0 = positions[spring.p0];
        const p1 = positions[spring.p1];
        const v0 = velocities[spring.p0];
        const v1 = velocities[spring.p1];

        const springVector = p1.sub(p0);
        const springLength = springVector.len();

        const springForce = springVector
            .unit()
            .mul(springStiffness * (springLength - spring.rest));

        const relativeVelocity = v1.sub(v0);
        const dampingForce = springVector
            .unit()
            .mul(damping * relativeVelocity.dot(springVector.unit()));

        // add forces to the respective particles
        forces[spring.p0].inc(springForce).inc(dampingForce.mul(-1));
        forces[spring.p1].inc(springForce.mul(-1)).inc(dampingForce);
    }

    // loop through each particle to update positions and velocities
    for (let i = 0; i < positions.length; i++) {
        const netForce = forces[i].add(gravity.mul(particleMass));

        velocities[i].inc(netForce.mul(dt / particleMass));

        positions[i].inc(velocities[i].mul(dt));

        for (const axis of ['x', 'y', 'z']) {
            if (positions[i][axis] < -1) {
                positions[i][axis] = -1;
                velocities[i][axis] *= -restitution;
            } else if (positions[i][axis] > 1) {
                positions[i][axis] = 1;
                velocities[i][axis] *= -restitution;
            }
        }
    }
}

