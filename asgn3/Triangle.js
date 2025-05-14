class Triangle {
  constructor() {
      this.type = 'triangle';
      this.position = [0.0, 0.0, 0.0]; // Base position (x, y, z)
      this.color = [1.0, 1.0, 1.0, 1.0]; // RGBA color
      this.size = 5.0; // Size scaling factor
  }

  render() {
      // Set WebGL uniforms
      gl.uniform4f(u_FragColor, ...this.color);
      gl.uniform1f(u_Size, this.size);

      // Calculate triangle vertices based on position and size
      const [x, y] = this.position;
      const d = this.size / 200.0; // Size scaling factor
      const vertices = [
          x, y,       // Vertex 1
          x + d, y,   // Vertex 2
          x, y + d    // Vertex 3
      ];

      drawTriangle(vertices);
  }
}

// Global vertex buffer for 3D triangles
let g_vertexBuffer = null;

// Initialize global vertex buffer for 3D triangles
function initTriangle3D() {
  g_vertexBuffer = gl.createBuffer();
  if (!g_vertexBuffer) {
      console.error('Failed to create the vertex buffer object');
      return false;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  return true;
}

// Draw a 2D triangle
function drawTriangle(vertices) {
  const n = 3; // Number of vertices

  // Create and bind vertex buffer
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
      console.error('Failed to create the vertex buffer object');
      return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Draw the triangle
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

// Draw a 3D triangle
function drawTriangle3D(vertices) {
  const n = vertices.length / 3; // Number of vertices

  // Initialize global buffer if not already done
  if (!g_vertexBuffer) {
      if (!initTriangle3D()) return;
  }

  // Update buffer data and draw
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

// Draw a 3D triangle with UV coordinates
function drawTriangle3DUV(vertices, uv) {
  const n = 3; // Number of vertices

  // --- Vertex buffer for positions
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
      console.error('Failed to create the vertex buffer object');
      return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // --- Vertex buffer for UV coordinates
  const uvBuffer = gl.createBuffer();
  if (!uvBuffer) {
      console.error('Failed to create the UV buffer object');
      return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  // Draw the triangle
  gl.drawArrays(gl.TRIANGLES, 0, n);
}