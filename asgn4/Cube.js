// Cube.js

class Cube {
    constructor() {
        this.type = 'cube';
        this.textureNum = -2; // Default: use solid color. -1 for Triangles, 0+ for textures
        this.color = [1.0, 1.0, 1.0, 1.0]; // Default color: white

        // WebGL Buffers - To be initialized in initBuffers()
        this.vertexBuffer = null;
        this.uvBuffer = null;
        this.normalBuffer = null; 
        this.normalMatrix = null;

        // 6 faces * 2 triangles/face * 3 vertices/triangle = 36 vertices
        this.numVertices = 36;
    }

    initBuffers(gl) {
        if (!gl) {
            console.error("Cube.initBuffers: WebGL context (gl) is not provided or invalid.");
            return false;
        }
        // Avoid re-initializing if buffers already exist
        if (this.vertexBuffer && this.uvBuffer && this.normalBuffer) {
            return true;
        }

        const vertices = new Float32Array([
            // Front face (+Z)
            -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,
            -0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
            // Back face (-Z)
            -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,
            -0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5, -0.5, -0.5,
            // Top face (+Y)
            -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
            // Bottom face (-Y)
            -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,
            -0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5,
            // Right face (+X)
             0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,
             0.5, -0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
            // Left face (-X)
            -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,
            -0.5, -0.5, -0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
        ]);

        const normals = new Float32Array([
            // Front face: Normal (0, 0, 1) -> BLUE
            0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
            // Back face: Normal (0, 0, -1) -> DARK
            0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,
            // Top face: Normal (0, 1, 0) -> GREEN
            0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
            // Bottom face: Normal (0, -1, 0) -> DARK
            0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,
            // Right face: Normal (1, 0, 0) -> RED
            1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
            // Left face: Normal (-1, 0, 0) -> DARK
           -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
        ]);

        const uvs = new Float32Array([
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Front
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Back
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Top
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Bottom
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Right
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Left
        ]);

        // Vertex Buffer
        this.vertexBuffer = gl.createBuffer();
        if (!this.vertexBuffer) {
            console.error('Cube.initBuffers: Failed to create the vertex buffer object.');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // UV Buffer
        this.uvBuffer = gl.createBuffer();
        if (!this.uvBuffer) {
            console.error('Cube.initBuffers: Failed to create the UV buffer object.');
            gl.deleteBuffer(this.vertexBuffer); this.vertexBuffer = null; 
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

        // Normal Buffer
        this.normalBuffer = gl.createBuffer();
        if (!this.normalBuffer) {
            console.error('Cube.initBuffers: Failed to create the Normal buffer object.');
            gl.deleteBuffer(this.vertexBuffer); this.vertexBuffer = null; 
            gl.deleteBuffer(this.uvBuffer); this.uvBuffer = null; 
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        // Unbind the buffer (good practice, though not strictly necessary)
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        console.log("Cube buffers initialized successfully.");
        return true;
    }

    drawCube(gl, modelMatrix, color) {
        if (!this.vertexBuffer || !this.uvBuffer || !this.normalBuffer) {
            console.error("Cube.drawCube: Buffers not initialized. Call initBuffers(gl). Trying to initialize now...");
            if (!this.initBuffers(gl)) {
                console.error("Cube.drawCube: Fallback initialization failed. Cannot draw.");
                return; // Can't draw if buffers aren't ready
            }
        }


        // Determine the color to use
        const drawColor = color || this.color;

        // Pass the texture number (-2 for solid color, 0+ for textures)
        gl.uniform1i(u_whichTexture, this.textureNum);

        // Pass the color (will be used if u_whichTexture is < 0)
        gl.uniform4f(u_FragColor, drawColor[0], drawColor[1], drawColor[2], drawColor[3]);

        // Pass the model matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

        // --- Calculate and Pass Normal Matrix ---
        // The normal matrix transforms normals correctly, even with non-uniform scaling.
        // It's the inverse transpose of the upper-left 3x3 part of the model matrix.
        let normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        // Bind Vertex Buffer and Point a_Position to it
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Bind UV Buffer and Point a_UV to it
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        // Bind Normal Buffer and Point a_Normal to it
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        // --- Draw the Cube ---
        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);

    }
}