class Model {
    constructor(filePath) {
        this.filePath = filePath;
        this.loader = new OBJLoader(filePath);
        this.drawingInfo = null;
        this.vbo = null;
        this.nbo = null;
        this.cbo = null;
        this.modelMatrix = new Matrix4();
        this.isLoaded = false;
    }

    async load() {
        try {
            await this.loader.parseModel();
            this.drawingInfo = this.loader.getModelData();
            this.isLoaded = true;
            console.log("Loaded " + this.filePath, this.drawingInfo);
        } catch(e) {
            console.error("Failed to load model:", e);
        }
    }

    initBuffers(gl) {
        if (!this.isLoaded || !this.drawingInfo) {
             console.error("Model not loaded or has no data, cannot init buffers.");
             return false;
        }
        if (this.drawingInfo.vertices.length === 0) {
            console.error("Model loaded but has 0 vertices.");
            return false;
        }

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.drawingInfo.vertices, gl.STATIC_DRAW);

        this.nbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.drawingInfo.normals, gl.STATIC_DRAW);

        this.cbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo);
        gl.bufferData(gl.ARRAY_BUFFER, this.drawingInfo.colors, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind
        console.log("Model buffers initialized.");
        return true;
    }

    render(gl) {
        if (!this.isLoaded || !this.vbo) return;

        // Set Texture/Color mode for OBJ
        gl.uniform1i(u_whichTexture, -4); // Use -4 for vertex colors

        // Set Matrices
        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.modelMatrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix.elements);

        // Bind and set Attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo);
        gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Color);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, this.drawingInfo.vertices.length / 3);

        // Disable attributes
        gl.disableVertexAttribArray(a_Position);
        gl.disableVertexAttribArray(a_Normal);
        gl.disableVertexAttribArray(a_Color);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}