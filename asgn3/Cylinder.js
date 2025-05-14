// Cylinder.js - Refactored for correct GL initialization timing and performance

class Cylinder {
    constructor(sides = 10) {
        this.type = 'cylinder';
        this.color = [1.0, 1.0, 1.0, 1.0]; // Default RGBA color (white)
        this.matrix = new Matrix4();       // Transformation matrix for this specific cylinder instance
        this.sides = sides;                // Number of sides to approximate the cylinder's curve
        this.textureNum = -2;              // Default to solid color (-2 means use u_FragColor directly)

        this.vertexBuffer = null;          // Will hold the VBO for vertex positions
        this.uvBuffer = null;              // Will hold the VBO for UV coordinates
        this.numVertices = 0;              // Total number of vertices to draw

        // Note: initBuffers(gl) is called externally (e.g., from World.js's main function)
        // after the WebGL context 'gl' is available.
    }

    initBuffers(gl) {
        // Check if WebGL context is provided
        if (!gl) {
            console.error("Cylinder.initBuffers: WebGL context (gl) is not provided or invalid.");
            return false;
        }
        // Prevent re-initialization if buffers already exist
        if (this.vertexBuffer && this.uvBuffer) {
            // console.log("Cylinder buffers already initialized for this instance."); // Optional debug
            return true; 
        }

        const allVertices = [];
        const allUVs = [];
        const radius = 0.5; // Defines a unit cylinder with radius 0.5
        const height = 1.0; // Defines a unit cylinder with height 1.0
        const y_bottom = -height / 2; // Center the cylinder around its local Y-axis
        const y_top = height / 2;
        const angleStep = (2 * Math.PI) / this.sides; // Angle increment for each side

        // --- Calculate Vertices and UVs for Side Panels ---
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;

            // Calculate vertex coordinates for the current side panel
            const x1 = radius * Math.cos(angle1);
            const z1 = radius * Math.sin(angle1);
            const x2 = radius * Math.cos(angle2);
            const z2 = radius * Math.sin(angle2);

            // Define the 4 corners of the quad for this side panel
            const pt1_bottom = [x1, y_bottom, z1];
            const pt2_bottom = [x2, y_bottom, z2];
            const pt1_top    = [x1, y_top, z1];
            const pt2_top    = [x2, y_top, z2];

            // Define UV coordinates to map texture around the cylinder side
            const u1 = i / this.sides;         // U-coordinate for the start of the panel
            const u2 = (i + 1) / this.sides; // U-coordinate for the end of the panel

            // Triangle 1 of the side panel (quad)
            allVertices.push(...pt1_top, ...pt1_bottom, ...pt2_bottom);
            allUVs.push(u1, 1,  u1, 0,  u2, 0); // V goes from 0 (bottom) to 1 (top)
            
            // Triangle 2 of the side panel (quad)
            allVertices.push(...pt2_bottom, ...pt2_top, ...pt1_top);
            allUVs.push(u2, 0,  u2, 1,  u1, 1);
        }

        // --- Calculate Vertices and UVs for Top Cap ---
        const topCenter = [0, y_top, 0]; // Center vertex for the top fan
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;

            // Vertices on the perimeter of the top cap
            const pt1_top = [radius * Math.cos(angle1), y_top, radius * Math.sin(angle1)];
            const pt2_top = [radius * Math.cos(angle2), y_top, radius * Math.sin(angle2)];
            
            allVertices.push(...topCenter, ...pt1_top, ...pt2_top);
            // UVs for the top cap (circular mapping from texture center)
            allUVs.push(
                0.5, 0.5,                                                    // UV for topCenter
                0.5 + 0.5 * Math.cos(angle1), 0.5 - 0.5 * Math.sin(angle1), // UV for pt1_top (V inverted for standard image coords)
                0.5 + 0.5 * Math.cos(angle2), 0.5 - 0.5 * Math.sin(angle2)  // UV for pt2_top
            );
        }

        // --- Calculate Vertices and UVs for Bottom Cap ---
        const bottomCenter = [0, y_bottom, 0]; // Center vertex for the bottom fan
        for (let i = 0; i < this.sides; i++) {
            const angle1 = i * angleStep;
            const angle2 = (i + 1) * angleStep;

            // Vertices on the perimeter of the bottom cap
            const pt1_bottom = [radius * Math.cos(angle1), y_bottom, radius * Math.sin(angle1)];
            const pt2_bottom = [radius * Math.cos(angle2), y_bottom, radius * Math.sin(angle2)];
            
            // Reversed vertex order for correct face culling (counter-clockwise when viewed from outside)
            allVertices.push(...bottomCenter, ...pt2_bottom, ...pt1_bottom); 
            // UVs for the bottom cap (similar to top cap)
            allUVs.push(
                0.5, 0.5,
                0.5 + 0.5 * Math.cos(angle2), 0.5 - 0.5 * Math.sin(angle2),
                0.5 + 0.5 * Math.cos(angle1), 0.5 - 0.5 * Math.sin(angle1)
            );
        }

        this.numVertices = allVertices.length / 3; // Each vertex has 3 components (x,y,z)

        // Create and buffer vertex position data
        this.vertexBuffer = gl.createBuffer();
        if (!this.vertexBuffer) { 
            console.error('Cylinder.initBuffers: Failed to create the vertex buffer object.'); 
            return false; 
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allVertices), gl.STATIC_DRAW);

        // Create and buffer UV coordinate data
        this.uvBuffer = gl.createBuffer();
        if (!this.uvBuffer) { 
            console.error('Cylinder.initBuffers: Failed to create the UV buffer object.'); 
            if(this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer); // Clean up already created vertex buffer
            this.vertexBuffer = null;
            return false; 
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allUVs), gl.STATIC_DRAW);
        
        // console.log(`Cylinder (sides: ${this.sides}) buffers initialized. Vertices: ${this.numVertices}`); // Optional debug
        return true;
    }

    render(gl) { // gl context is passed as an argument
        // Ensure buffers are initialized, attempt fallback if not (not ideal for performance if this happens often)
        if (!this.vertexBuffer || !this.uvBuffer) {
            console.warn("Cylinder.render: Buffers not initialized. Attempting fallback init. Instance:", this);
            if (!this.initBuffers(gl)) {
                 console.error("Cylinder.render: Fallback buffer initialization FAILED. Cannot render. Instance:", this);
                 return; 
            }
        }

        // Set shader uniforms for this cylinder
        // Assumes u_whichTexture, u_FragColor, u_ModelMatrix, a_Position, a_UV are globally accessible
        // (typically set up in World.js connectVariablesToGSL)
        gl.uniform1i(u_whichTexture, this.textureNum); 
        if (this.textureNum === -2) { // If -2, use the instance's solid color
             gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        }
        // If textureNum >= 0, the fragment shader will use the sampled texture color.
        // If textureNum === -1, it's UV debug mode (handled by shader).

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements); // Apply instance-specific transformation

        // Bind and set up vertex position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // Bind and set up UV coordinate attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        // Draw the cylinder
        gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
    }
}
