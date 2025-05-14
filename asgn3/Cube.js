class Cube {
    constructor() {
        this.type = 'cube';
        this.textureNum = -2; // Default: use color. Set to 0, 1, 2, etc., for textures.

        this.vertexBuffer = null;
        this.uvBuffer = null;
        this.numVertices = 36; // 6 faces * 2 triangles/face * 3 vertices/triangle

        this.initBuffers();
    }

    initBuffers() {
        // Vertices for a unit cube centered at the origin (-0.5 to 0.5)
        // prettier-ignore
        const vertices = new Float32Array([
            // Front face
            -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,
            -0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
            // Back face
            -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,
            -0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5, -0.5, -0.5,
            // Top face
            -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
            // Bottom face
            -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,
            -0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5,
            // Right face
             0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,
             0.5, -0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
            // Left face
            -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,
            -0.5, -0.5, -0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
        ]);

        // UV coordinates for each face
        // prettier-ignore
        const uvs = new Float32Array([
            // Front
            0, 0,   1, 0,   1, 1,
            0, 0,   1, 1,   0, 1,
            // Back
            0, 0,   1, 0,   1, 1, 
            0, 0,   1, 1,   0, 1,
            // Top
            0, 0,   1, 0,   1, 1,
            0, 0,   1, 1,   0, 1,
            // Bottom
            0, 0,   1, 0,   1, 1,
            0, 0,   1, 1,   0, 1,
            // Right
            0, 0,   1, 0,   1, 1,
            0, 0,   1, 1,   0, 1,
            // Left
            0, 0,   1, 0,   1, 1,
            0, 0,   1, 1,   0, 1,
        ]);

        this.vertexBuffer = gl.createBuffer();
        if (!this.vertexBuffer) { console.error('Failed to create cube vertex buffer'); return; }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        this.uvBuffer = gl.createBuffer();
        if (!this.uvBuffer) { console.error('Failed to create cube UV buffer'); return; }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    }

    // The 'color' argument is used if this.textureNum is -2 (solid color mode)
    drawCube(modelMatrix, colorIfSolid = [1.0, 1.0, 1.0, 1.0]) {
        if (!this.vertexBuffer || !this.uvBuffer) {
            console.error("Cube buffers not initialized for drawCube.");
            return;
        }

        gl.uniform1i(u_whichTexture, this.textureNum);

        if (this.textureNum === -2) { // Use color only if textureNum indicates solid color
            gl.uniform4f(u_FragColor, colorIfSolid[0], colorIfSolid[1], colorIfSolid[2], colorIfSolid[3]);
        }

        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

        // Bind vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Bind UV buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    }
}