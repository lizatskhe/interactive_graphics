// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform( positionX, positionY, rotation, scale )
{
	    // convert rotation from degrees to radians
		const radians = (rotation * Math.PI) / 180;

		// compute cosine and sine of the rotation angle
		const cosTheta = Math.cos(radians);
		const sinTheta = Math.sin(radians);
	
		// the transformation matrix
		return [
			scale * cosTheta, scale * sinTheta, 0, // first column
			-scale * sinTheta, scale * cosTheta, 0, // second column
			positionX, positionY, 1 // third column (translation)
		];
	// return Array( 1, 0, 0, 0, 1, 0, 0, 0, 1 );
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 )
{
    return [
        // first column
        trans2[0] * trans1[0] + trans2[3] * trans1[1] + trans2[6] * trans1[2],
        trans2[1] * trans1[0] + trans2[4] * trans1[1] + trans2[7] * trans1[2],
        trans2[2] * trans1[0] + trans2[5] * trans1[1] + trans2[8] * trans1[2],

        // second column
        trans2[0] * trans1[3] + trans2[3] * trans1[4] + trans2[6] * trans1[5],
        trans2[1] * trans1[3] + trans2[4] * trans1[4] + trans2[7] * trans1[5],
        trans2[2] * trans1[3] + trans2[5] * trans1[4] + trans2[8] * trans1[5],

        // third column
        trans2[0] * trans1[6] + trans2[3] * trans1[7] + trans2[6] * trans1[8],
        trans2[1] * trans1[6] + trans2[4] * trans1[7] + trans2[7] * trans1[8],
        trans2[2] * trans1[6] + trans2[5] * trans1[7] + trans2[8] * trans1[8],
    ];
	// return Array( 1, 0, 0, 0, 1, 0, 0, 0, 1 );
}
