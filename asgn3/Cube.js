// Cube.js

class Cube {
    constructor() {
        this.type = 'cube';
        this.textureNum = -2; // Default: use solid color.
        
        this.vertexBuffer = null;
        this.uvBuffer = null;
        this.numVertices = 36; // 6 faces * 2 triangles/face * 3 vertices/triangle

        // initBuffers(gl) is called externally from World.js main() after gl is initialized.
    }

    initBuffers(gl) {
        if (!gl) {
            console.error("Cube.initBuffers: WebGL context (gl) is not provided or invalid.");
            return false;
        }
        if (this.vertexBuffer && this.uvBuffer) {
            return true; // Buffers are already initialized
        }

        // Vertices for a unit cube centered at the origin (-0.5 to 0.5 on each axis)
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

        // UV coordinates for each face (standard square mapping per face)
        // prettier-ignore
        const uvs = new Float32Array([
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Front
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Back
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Top
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Bottom
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Right
            0,0, 1,0, 1,1,  0,0, 1,1, 0,1, // Left
        ]);

        this.vertexBuffer = gl.createBuffer();
        if (!this.vertexBuffer) {
            console.error('Cube.initBuffers: Failed to create the vertex buffer object.');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        this.uvBuffer = gl.createBuffer();
        if (!this.uvBuffer) { 
            console.error('Cube.initBuffers: Failed to create the UV buffer object.');
            if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer); // Clean up
            this.vertexBuffer = null;
            return false; 
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
        
        return true;
    }

    drawCube(gl, modelMatrix, colorIfSolid = [1.0, 1.0, 1.0, 1.0]) {
        if (!this.vertexBuffer || !this.uvBuffer) {
            console.error("Cube.drawCube: Buffers not initialized. Call initBuffers(gl) from main(). Instance:", this);
            // Fallback initialization attempt (not ideal if called during render loop)
            if (!this.initBuffers(gl)) return; 
        }

        gl.uniform1i(u_whichTexture, this.textureNum);

        if (this.textureNum === -2) { // Use passed color if textureNum indicates solid color mode
            gl.uniform4f(u_FragColor, colorIfSolid[0], colorIfSolid[1], colorIfSolid[2], colorIfSolid[3]);
        }
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    }
}
