// Cylinder.js
class Cylinder {
    constructor(sides = 10) {
        this.type = 'cylinder';
        this.color = [1.0, 1.0, 1.0, 1.0]; // Default white, RGBA
        this.matrix = new Matrix4(); // Transformation matrix
        this.sides = sides; // Number of sides for approximation
    }

    render() {
        const rgba = this.color;
        const radius = 0.5; // Cylinder radius (pre-scale)
        const angleStep = 360 / this.sides; // Angle between sides in degrees

        // Pass the model matrix once for the entire cylinder
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Draw side panels
        for (let angle = 0; angle < 360; angle += angleStep) {
            const angle1 = angle * Math.PI / 180; // Convert to radians
            const angle2 = (angle + angleStep) * Math.PI / 180;

            // Calculate vertices on base circles (XZ plane)
            const x1 = radius * Math.cos(angle1);
            const z1 = radius * Math.sin(angle1);
            const x2 = radius * Math.cos(angle2);
            const z2 = radius * Math.sin(angle2);

            // Define vertices: bottom (y=0), top (y=1)
            const pt1_bottom = [x1, 0, z1];
            const pt2_bottom = [x2, 0, z2];
            const pt1_top = [x1, 1, z1];
            const pt2_top = [x2, 1, z2];

            // Set color for side panel (alternate for visual distinction)
            const colorVal = (Math.floor(angle / angleStep) % 2 === 0) ? 1.0 : 0.9;
            gl.uniform4f(u_FragColor, rgba[0] * colorVal, rgba[1] * colorVal, rgba[2] * colorVal, rgba[3]);

            // Draw two triangles for the side panel (quad)
            drawTriangle3D([...pt1_top, ...pt1_bottom, ...pt2_bottom]);
            drawTriangle3D([...pt2_bottom, ...pt2_top, ...pt1_top]);
        }

        // Draw top cap
        gl.uniform4f(u_FragColor, rgba[0] * 0.95, rgba[1] * 0.95, rgba[2] * 0.95, rgba[3]);
        const topCenter = [0, 1, 0];
        for (let angle = 0; angle < 360; angle += angleStep) {
            const angle1 = angle * Math.PI / 180;
            const angle2 = (angle + angleStep) * Math.PI / 180;
            const pt1_top = [radius * Math.cos(angle1), 1, radius * Math.sin(angle1)];
            const pt2_top = [radius * Math.cos(angle2), 1, radius * Math.sin(angle2)];
            drawTriangle3D([...topCenter, ...pt1_top, ...pt2_top]);
        }

        // Draw bottom cap (reverse vertex order for correct facing)
        gl.uniform4f(u_FragColor, rgba[0] * 0.85, rgba[1] * 0.85, rgba[2] * 0.85, rgba[3]);
        const bottomCenter = [0, 0, 0];
        for (let angle = 0; angle < 360; angle += angleStep) {
            const angle1 = angle * Math.PI / 180;
            const angle2 = (angle + angleStep) * Math.PI / 180;
            const pt1_bottom = [radius * Math.cos(angle1), 0, radius * Math.sin(angle1)];
            const pt2_bottom = [radius * Math.cos(angle2), 0, radius * Math.sin(angle2)];
            drawTriangle3D([...bottomCenter, ...pt2_bottom, ...pt1_bottom]);
        }
    }
}