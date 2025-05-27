// Sphere.js

class Sphere {
    constructor(latitudeBands = 12, longitudeBands = 24) {
        this.type = 'sphere';
        this.textureNum = -2; // Default: use solid color.
        this.color = [1.0, 1.0, 1.0, 1.0]; // Default color: white

        // Sphere generation parameters
        this.latitudeBands = latitudeBands;
        this.longitudeBands = longitudeBands;
        this.radius = 0.5; // Make it a unit sphere with diameter 1, like the cube

        // WebGL Buffers - To be initialized in initBuffers()
        this.vertexBuffer = null;
        this.uvBuffer = null;
        this.normalBuffer = null;
        this.indexBuffer = null; // We'll use indexed drawing for spheres (more efficient)

        this.numIndices = 0; // Number of indices to draw
    }

    /**
     * Initializes the WebGL buffers for the sphere's vertices, UVs, normals, and indices.
     * @param {WebGLRenderingContext} gl - The WebGL rendering context.
     * @returns {boolean} True if initialization was successful, false otherwise.
     */
    initBuffers(gl) {
        if (!gl) {
            console.error("Sphere.initBuffers: WebGL context (gl) is not provided or invalid.");
            return false;
        }
        if (this.vertexBuffer) {
            return true; // Already initialized
        }

        const radius = this.radius;
        const latBands = this.latitudeBands;
        const lonBands = this.longitudeBands;

        const vertexData = [];
        const normalData = [];
        const uvData = [];
        const indexData = [];

        // Generate vertices, normals, and UVs
        for (let latNumber = 0; latNumber <= latBands; latNumber++) {
            const theta = latNumber * Math.PI / latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let longNumber = 0; longNumber <= lonBands; longNumber++) {
                const phi = longNumber * 2 * Math.PI / lonBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                const u = 1 - (longNumber / lonBands);
                const v = 1 - (latNumber / latBands);

                normalData.push(x);
                normalData.push(y);
                normalData.push(z);

                uvData.push(u);
                uvData.push(v);

                vertexData.push(radius * x);
                vertexData.push(radius * y);
                vertexData.push(radius * z);
            }
        }

        // Generate indices
        for (let latNumber = 0; latNumber < latBands; latNumber++) {
            for (let longNumber = 0; longNumber < lonBands; longNumber++) {
                const first = (latNumber * (lonBands + 1)) + longNumber;
                const second = first + lonBands + 1;

                indexData.push(first);
                indexData.push(second);
                indexData.push(first + 1);

                indexData.push(second);
                indexData.push(second + 1);
                indexData.push(first + 1);
            }
        }

        this.numIndices = indexData.length;

        // --- Create and Bind Buffers ---

        // Vertex Buffer
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

        // UV Buffer
        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvData), gl.STATIC_DRAW);

        // Normal Buffer
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);

        // Index Buffer
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);

        // Unbind buffers (good practice)
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        console.log("Sphere buffers initialized successfully.");
        return true;
    }

    /**
     * Draws the sphere using WebGL. Assumes initBuffers has been called.
     * @param {WebGLRenderingContext} gl - The WebGL rendering context.
     * @param {Matrix4} modelMatrix - The model matrix for this sphere instance.
     * @param {Array<number>} [color] - Optional color override [r, g, b, a].
     */
    render(gl, modelMatrix, color) { // Renamed to render for consistency
        // --- Pre-draw Checks ---
        if (!this.vertexBuffer || !this.uvBuffer || !this.normalBuffer || !this.indexBuffer) {
            console.error("Sphere.render: Buffers not initialized. Call initBuffers(gl). Trying to initialize now...");
            if (!this.initBuffers(gl)) {
                console.error("Sphere.render: Fallback initialization failed. Cannot draw.");
                return;
            }
        }

        // --- Set Uniforms ---
        const drawColor = color || this.color;
        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform4f(u_FragColor, drawColor[0], drawColor[1], drawColor[2], drawColor[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

        let normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        // --- Bind Buffers and Set Attributes ---

        // Vertex Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // UV Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        // Normal Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        // Bind Index Buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // --- Draw the Sphere ---
        gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);

        // --- Clean up ---
        // gl.bindBuffer(gl.ARRAY_BUFFER, null);
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
}