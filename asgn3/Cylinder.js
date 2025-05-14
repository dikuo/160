class Cylinder {
    constructor(sides = 10) {
        this.type = 'cylinder';
        this.color = [1.0, 1.0, 1.0, 1.0]; // Default white, RGBA
        this.matrix = new Matrix4();       // Transformation matrix for this instance
        this.sides = sides;                // Number of sides for approximation
        this.textureNum = -2;              // Default to solid color (-2 for u_FragColor)

        this.vertexBuffer = null;
        this.uvBuffer = null;
        this.numVertices = 0;

        this.initBuffers();
    }

    initBuffers() {
        const allVertices = [];
        const allUVs = [];
        const radius = 0.5; // Cylinder radius (unit cylinder, height 1)
        const height = 1.0; // Unit cylinder height
        const angleStep = (2 * Math.PI) / this.sides; // Angle in radians

        // --- Side Panels ---
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;

            const x1 = radius * Math.cos(angle1);
            const z1 = radius * Math.sin(angle1);
            const x2 = radius * Math.cos(angle2);
            const z2 = radius * Math.sin(angle2);

            // Vertices for one side quad (y from 0 to 1, or -0.5 to 0.5 for centered)
            const y_bottom = -height / 2;
            const y_top = height / 2;

            const pt1_bottom = [x1, y_bottom, z1];
            const pt2_bottom = [x2, y_bottom, z2];
            const pt1_top =    [x1, y_top, z1];
            const pt2_top =    [x2, y_top, z2];

            // UVs for side panel
            const u1 = i / this.sides;
            const u2 = (i + 1) / this.sides;

            // Triangle 1 of side panel
            allVertices.push(...pt1_top, ...pt1_bottom, ...pt2_bottom);
            allUVs.push(u1, 1,  u1, 0,  u2, 0);
            // Triangle 2 of side panel
            allVertices.push(...pt2_bottom, ...pt2_top, ...pt1_top);
            allUVs.push(u2, 0,  u2, 1,  u1, 1);
        }

        // --- Top Cap ---
        const topCenter = [0, height / 2, 0];
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;

            const pt1_top = [radius * Math.cos(angle1), height / 2, radius * Math.sin(angle1)];
            const pt2_top = [radius * Math.cos(angle2), height / 2, radius * Math.sin(angle2)];
            
            allVertices.push(...topCenter, ...pt1_top, ...pt2_top);
            allUVs.push(
                0.5, 0.5, // Center of texture for topCenter
                0.5 + 0.5 * Math.cos(angle1), 0.5 + 0.5 * Math.sin(angle1), // UV for pt1_top
                0.5 + 0.5 * Math.cos(angle2), 0.5 + 0.5 * Math.sin(angle2)  // UV for pt2_top
            );
        }

        // --- Bottom Cap ---
        const bottomCenter = [0, -height / 2, 0];
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;

            const pt1_bottom = [radius * Math.cos(angle1), -height/2, radius * Math.sin(angle1)];
            const pt2_bottom = [radius * Math.cos(angle2), -height/2, radius * Math.sin(angle2)];
            
            // Reversed order for correct face culling
            allVertices.push(...bottomCenter, ...pt2_bottom, ...pt1_bottom);
             allUVs.push(
                0.5, 0.5, // Center of texture for bottomCenter
                0.5 + 0.5 * Math.cos(angle2), 0.5 + 0.5 * Math.sin(angle2), // UV for pt2_bottom
                0.5 + 0.5 * Math.cos(angle1), 0.5 + 0.5 * Math.sin(angle1)  // UV for pt1_bottom
            );
        }

        this.numVertices = allVertices.length / 3;

        // Create and buffer vertex data
        this.vertexBuffer = gl.createBuffer();
        if (!this.vertexBuffer) { console.error('Failed to create cylinder vertex buffer'); return; }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allVertices), gl.STATIC_DRAW);

        // Create and buffer UV data
        this.uvBuffer = gl.createBuffer();
        if (!this.uvBuffer) { console.error('Failed to create cylinder UV buffer'); return; }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allUVs), gl.STATIC_DRAW);
    }

    render() {
        if (!this.vertexBuffer || !this.uvBuffer) {
            console.error("Cylinder buffers not initialized for render.");
            return;
        }

        gl.uniform1i(u_whichTexture, this.textureNum);
        if (this.textureNum === -2) { // Use color if textureNum is -2
             gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        }

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Bind vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Bind UV buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        // Draw the cylinder
        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    }
}