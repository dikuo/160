// Cube.js
class Cube {
    constructor() {
        this.type = 'cube';
        this.color = [1.0, 1.0, 1.0, 1.0]; // Default white, RGBA
        this.matrix = new Matrix4(); // Transformation matrix
    }

    render() {
        const rgba = this.color;

        // Pass the model matrix to the shader
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Define cube vertices (0 to 1 in each dimension)
        // Vertex order: 
        // v0(0,0,0), v1(0,1,0), v2(0,1,1), v3(0,0,1)
        // v4(1,0,0), v5(1,1,0), v6(1,1,1), v7(1,0,1)

        // Front face (v0, v5, v4; v0, v1, v5)
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        drawTriangle3D([0, 0, 0, 1, 1, 0, 1, 0, 0]);
        drawTriangle3D([0, 0, 0, 0, 1, 0, 1, 1, 0]);

        // Back face (v3, v7, v6; v3, v6, v2)
        gl.uniform4f(u_FragColor, rgba[0] * 0.95, rgba[1] * 0.95, rgba[2] * 0.95, rgba[3]);
        drawTriangle3D([0, 0, 1, 1, 0, 1, 1, 1, 1]);
        drawTriangle3D([0, 0, 1, 1, 1, 1, 0, 1, 1]);

        // Top face (v1, v2, v6; v1, v6, v5)
        gl.uniform4f(u_FragColor, rgba[0] * 0.9, rgba[1] * 0.9, rgba[2] * 0.9, rgba[3]);
        drawTriangle3D([0, 1, 0, 0, 1, 1, 1, 1, 1]);
        drawTriangle3D([0, 1, 0, 1, 1, 1, 1, 1, 0]);

        // Bottom face (v0, v3, v7; v0, v7, v4)
        gl.uniform4f(u_FragColor, rgba[0] * 0.85, rgba[1] * 0.85, rgba[2] * 0.85, rgba[3]);
        drawTriangle3D([0, 0, 0, 0, 0, 1, 1, 0, 1]);
        drawTriangle3D([0, 0, 0, 1, 0, 1, 1, 0, 0]);

        // Right face (v4, v5, v6; v4, v6, v7)
        gl.uniform4f(u_FragColor, rgba[0] * 0.8, rgba[1] * 0.8, rgba[2] * 0.8, rgba[3]);
        drawTriangle3D([1, 0, 0, 1, 1, 0, 1, 1, 1]);
        drawTriangle3D([1, 0, 0, 1, 1, 1, 1, 0, 1]);

        // Left face (v0, v1, v2; v0, v2, v3)
        gl.uniform4f(u_FragColor, rgba[0] * 0.75, rgba[1] * 0.75, rgba[2] * 0.75, rgba[3]);
        drawTriangle3D([0, 0, 0, 0, 1, 0, 0, 1, 1]);
        drawTriangle3D([0, 0, 0, 0, 1, 1, 0, 0, 1]);
    }
}