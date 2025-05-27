// Cylinder.js

class Cylinder {
    constructor(sides = 10) {
        this.type = 'cylinder';
        this.color = [1.0, 1.0, 1.0, 1.0]; // RGBA
        this.matrix = new Matrix4();       // Transformation matrix
        this.sides = sides;
        this.textureNum = -2;              // Default: use solid color

        this.vertexBuffer = null;
        this.uvBuffer = null;
        this.numVertices = 0;

        // initBuffers(gl) is called externally after gl context is available.
    }

    initBuffers(gl) {
        if (!gl) {
            console.error("Cylinder.initBuffers: WebGL context (gl) is not provided or invalid.");
            return false;
        }
        if (this.vertexBuffer && this.uvBuffer) {
            return true; // Already initialized
        }

        const allVertices = [];
        const allUVs = [];
        const radius = 0.5; 
        const height = 1.0; 
        const y_bottom = -height / 2; // Center the cylinder around its local Y-axis
        const y_top = height / 2;
        const angleStep = (2 * Math.PI) / this.sides;

        // --- Side Panels ---
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;

            const x1 = radius * Math.cos(angle1);
            const z1 = radius * Math.sin(angle1);
            const x2 = radius * Math.cos(angle2);
            const z2 = radius * Math.sin(angle2);

            const pt1_bottom = [x1, y_bottom, z1];
            const pt2_bottom = [x2, y_bottom, z2];
            const pt1_top    = [x1, y_top, z1];
            const pt2_top    = [x2, y_top, z2];

            const u1 = i / this.sides;
            const u2 = (i + 1) / this.sides;

            allVertices.push(...pt1_top, ...pt1_bottom, ...pt2_bottom);
            allUVs.push(u1, 1,  u1, 0,  u2, 0);
            allVertices.push(...pt2_bottom, ...pt2_top, ...pt1_top);
            allUVs.push(u2, 0,  u2, 1,  u1, 1);
        }

        // --- Top Cap ---
        const topCenter = [0, y_top, 0];
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;
            const pt1_top = [radius * Math.cos(angle1), y_top, radius * Math.sin(angle1)];
            const pt2_top = [radius * Math.cos(angle2), y_top, radius * Math.sin(angle2)];
            allVertices.push(...topCenter, ...pt1_top, ...pt2_top);
            allUVs.push(
                0.5, 0.5, 
                0.5 + 0.5 * Math.cos(angle1), 0.5 - 0.5 * Math.sin(angle1), 
                0.5 + 0.5 * Math.cos(angle2), 0.5 - 0.5 * Math.sin(angle2)
            );
        }

        // --- Bottom Cap ---
        const bottomCenter = [0, y_bottom, 0];
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;
            const pt1_bottom = [radius * Math.cos(angle1), y_bottom, radius * Math.sin(angle1)];
            const pt2_bottom = [radius * Math.cos(angle2), y_bottom, radius * Math.sin(angle2)];
            allVertices.push(...bottomCenter, ...pt2_bottom, ...pt1_bottom); // Reversed order for culling
            allUVs.push(
                0.5, 0.5,
                0.5 + 0.5 * Math.cos(angle2), 0.5 - 0.5 * Math.sin(angle2),
                0.5 + 0.5 * Math.cos(angle1), 0.5 - 0.5 * Math.sin(angle1)
            );
        }

        this.numVertices = allVertices.length / 3;

        this.vertexBuffer = gl.createBuffer();
        if (!this.vertexBuffer) { 
            console.error('Cylinder.initBuffers: Failed to create vertex buffer.'); 
            return false; 
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allVertices), gl.STATIC_DRAW);

        this.uvBuffer = gl.createBuffer();
        if (!this.uvBuffer) { 
            console.error('Cylinder.initBuffers: Failed to create UV buffer.'); 
            if(this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer); // Clean up
            this.vertexBuffer = null;
            return false; 
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allUVs), gl.STATIC_DRAW);
        
        // console.log(`Cylinder (sides: ${this.sides}) buffers initialized. Vertices: ${this.numVertices}`); // Optional debug
        return true;
    }

    render(gl) {
        if (!this.vertexBuffer || !this.uvBuffer) {
            // Fallback initialization attempt (not ideal if this happens often)
            console.warn("Cylinder.render: Buffers not initialized. Attempting fallback init for instance:", this);
            if (!this.initBuffers(gl)) {
                 console.error("Cylinder.render: Fallback buffer initialization FAILED. Cannot render instance:", this);
                 return;
            }
        }

        // Shader uniforms (u_whichTexture, u_FragColor, etc.) are assumed to be globally accessible
        // and set up by connectVariablesToGSL in World.js.
        gl.uniform1i(u_whichTexture, this.textureNum);
        if (this.textureNum === -2) { // Use instance color if textureNum indicates solid color mode
             gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        }

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements); // Apply instance-specific transformation

        // Vertex positions
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // UV coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    }
}
