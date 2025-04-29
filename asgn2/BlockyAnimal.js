// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotateMatrix;
    void main() {
        gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    }
`;

// Fragment shader program
var FSHADER_SOURCE = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }
`;

// Global WebGL variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

// Global animation variables
let g_startTime = performance.now() / 1000.0;
let g_seconds = performance.now() / 1000.0 - g_startTime;
let g_lastRenderTime = performance.now();
let g_globalAngleX = 0;       // Camera X rotation (from slider/mouse)
let g_globalAngleY = 0;       // Camera Y rotation (from mouse)
let g_frontLegAngle = 0;      // Front left shoulder joint
let g_pawAngle = 0;           // Front left knee joint
let g_pawRotateAngle = 0;     // Front left paw joint (third level)
let g_frontRightLegAngle = 0; // Front right shoulder
let g_backLeftLegAngle = 0;   // Back left shoulder
let g_backRightLegAngle = 0;  // Back right shoulder
let g_frontRightPawAngle = 0; // Front right knee
let g_backLeftPawAngle = 0;   // Back left knee
let g_backRightPawAngle = 0;  // Back right knee
let g_tailAngle = 0;          // Tail joint
let g_animateTail = true;     // Tail animation toggle
let g_animateRun = false;     // Running animation toggle
let g_pokeAnimation = false;  // Poke animation state
let g_pokeStartTime = 0;      // Time poke animation started
let g_headShakeAngle = 0;     // Head shake for poke animation

// Setup WebGL context
function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    gl.enable(gl.DEPTH_TEST);
}

// Connect shader variables
function connectVariablesToGLSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return;
    }
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }
    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return;
    }
    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// Draw triangle function
function drawTriangle3D(vertices) {
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// UI event handlers
function addActionsForHtmlUI() {
    // Sliders
    document.getElementById('angleSlide').addEventListener('mousemove', function() {
        g_globalAngleX = this.value;
        renderScene();
    });
    document.getElementById('frontLegSlide').addEventListener('mousemove', function() {
        g_frontLegAngle = this.value;
        renderScene();
    });
    document.getElementById('pawSlide').addEventListener('mousemove', function() {
        g_pawAngle = this.value;
        renderScene();
    });
    document.getElementById('pawRotateSlide').addEventListener('mousemove', function() {
        g_pawRotateAngle = this.value;
        renderScene();
    });

    // Animation buttons
    document.getElementById('animationTailOnButton').onclick = function() {
        g_animateTail = true;
    };
    document.getElementById('animationTailOffButton').onclick = function() {
        g_animateTail = false;
    };
    document.getElementById('animationRunOnButton').onclick = function() {
        g_animateRun = true;
    };
    document.getElementById('animationRunOffButton').onclick = function() {
        g_animateRun = false;
    };

    // Mouse control variables
    let isDragging = false;
    let previousX = 0;
    let previousY = 0;

    // Mouse control
    canvas.addEventListener('mousedown', function(event) {
        if (event.button === 0 && !event.shiftKey) { // Left mouse button, no Shift
            isDragging = true;
            previousX = event.clientX;
            previousY = event.clientY;
        }
    });

    canvas.addEventListener('mousemove', function(event) {
        if (isDragging) {
            const deltaX = event.clientX - previousX;
            const deltaY = event.clientY - previousY;

            // Update rotation angles (negative for intuitive direction)
            g_globalAngleX -= deltaX * 0.5; // Sensitivity: 0.5 degrees per pixel
            g_globalAngleY -= deltaY * 0.5;

            // Clamp Y rotation to avoid flipping (optional)
            g_globalAngleY = Math.max(-90, Math.min(90, g_globalAngleY));

            previousX = event.clientX;
            previousY = event.clientY;

            renderScene();
        }
    });

    canvas.addEventListener('mouseup', function(event) {
        if (event.button === 0) {
            isDragging = false;
        }
    });

    canvas.addEventListener('mouseleave', function() {
        isDragging = false;
    });

    // Poke animation
    canvas.addEventListener('click', function(event) {
        if (event.shiftKey) {
            g_pokeAnimation = true;
            g_pokeStartTime = g_seconds;
            renderScene();
        }
    });
}

// Update animation angles
function updateAnimationAngles() {
    if (g_animateRun) {
        g_frontLegAngle = 30 * Math.sin(g_seconds * 2);
        g_backRightLegAngle = 30 * Math.sin(g_seconds * 2);
        g_frontRightLegAngle = 30 * Math.sin(g_seconds * 2 + Math.PI);
        g_backLeftLegAngle = 30 * Math.sin(g_seconds * 2 + Math.PI);
        g_pawAngle = 20 * Math.abs(Math.sin(g_seconds * 2));
        g_frontRightPawAngle = 20 * Math.abs(Math.sin(g_seconds * 2 + Math.PI));
        g_backLeftPawAngle = 20 * Math.abs(Math.sin(g_seconds * 2 + Math.PI));
        g_backRightPawAngle = 20 * Math.abs(Math.sin(g_seconds * 2));
        g_pawRotateAngle = 10 * Math.sin(g_seconds * 4);
    }
    if (g_animateTail) {
        g_tailAngle = 20 * Math.sin(g_seconds * 5);
    }
    if (g_pokeAnimation) {
        const pokeDuration = 1.0;
        if (g_seconds - g_pokeStartTime < pokeDuration) {
            g_headShakeAngle = 30 * Math.sin((g_seconds - g_pokeStartTime) * 10);
        } else {
            g_pokeAnimation = false;
            g_headShakeAngle = 0;
        }
    }
}

// Render scene
function renderScene() {
    const startTime = performance.now();

    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Camera setup
    const globalRotMat = new Matrix4()
        .rotate(g_globalAngleY, 1, 0, 0)
        .rotate(g_globalAngleX, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Colors
    const bodyColor = [0.6, 0.3, 0.1, 1.0]; // Brown
    const legColor = [0.7, 0.4, 0.2, 1.0]; // Lighter Brown
    const pawColor = [0.2, 0.1, 0.0, 1.0]; // Dark Brown/Black
    const headColor = [0.6, 0.3, 0.1, 1.0]; // Brown
    const neckColor = [0.65, 0.35, 0.15, 1.0]; // Slightly lighter brown
    const tailColor = [0.7, 0.4, 0.2, 1.0]; // Lighter Brown
    const snoutColor = [0.7, 0.4, 0.2, 1.0]; // Lighter Brown
    const earColor = [0.5, 0.25, 0.05, 1.0]; // Darker Brown for Ears
    const eyeColor = [0.0, 0.0, 0.0, 1.0]; // Black for Eyes
    const noseColor = [0.0, 0.0, 0.0, 1.0]; // Black for Nose

    // Body
    const body = new Cube();
    body.color = bodyColor;
    body.matrix.setTranslate(-0.25, -0.1, 0.0);
    const bodyJointSystem = new Matrix4(body.matrix);
    body.matrix.scale(0.5, 0.3, 0.6);
    body.matrix.translate(-0.5, -0.5, -0.5);
    body.render();

    // Neck
    const neck = new Cube();
    neck.color = neckColor;
    neck.matrix = new Matrix4(bodyJointSystem);
    neck.matrix.translate(0, 0.15, -0.25);
    neck.matrix.rotate(-30, 1, 0, 0);
    const neckJointSystem = new Matrix4(neck.matrix);
    neck.matrix.scale(0.1, 0.3, 0.1);
    neck.matrix.translate(-0.5, 0, -0.5);
    neck.render();

    // Head
    const head = new Cube();
    head.color = headColor;
    head.matrix = new Matrix4(neckJointSystem);
    head.matrix.translate(0, 0.3, 0);
    head.matrix.rotate(10 + (g_pokeAnimation ? g_headShakeAngle : 0), 1, 0, 0);
    const headJointSystem = new Matrix4(head.matrix);
    head.matrix.scale(0.25, 0.2, 0.25);
    head.matrix.translate(-0.5, -0.5, -0.5);
    head.render();

    // Snout
    const snout = new Cube();
    snout.color = snoutColor;
    snout.matrix = new Matrix4(headJointSystem);
    snout.matrix.translate(0, -0.05, -0.15);
    const snoutJointSystem = new Matrix4(snout.matrix);
    snout.matrix.scale(0.15, 0.1, 0.2);
    snout.matrix.translate(-0.5, -0.5, -0.5);
    snout.render();

    // Nose
    const nose = new Cube();
    nose.color = noseColor;
    nose.matrix = new Matrix4(snoutJointSystem);
    nose.matrix.translate(0, 0, -0.1);
    nose.matrix.scale(0.03, 0.03, 0.03);
    nose.matrix.translate(-0.5, -0.5, -0.5);
    nose.render();

    // Left Eye
    const leftEye = new Cube();
    leftEye.color = eyeColor;
    leftEye.matrix = new Matrix4(headJointSystem);
    leftEye.matrix.translate(-0.08, 0.05, -0.13);
    leftEye.matrix.scale(0.04, 0.04, 0.04);
    leftEye.matrix.translate(-0.5, -0.5, -0.5);
    leftEye.render();

    // Right Eye
    const rightEye = new Cube();
    rightEye.color = eyeColor;
    rightEye.matrix = new Matrix4(headJointSystem);
    rightEye.matrix.translate(0.08, 0.05, -0.13);
    rightEye.matrix.scale(0.04, 0.04, 0.04);
    rightEye.matrix.translate(-0.5, -0.5, -0.5);
    rightEye.render();

    // Left Ear
    const leftEar = new Cube();
    leftEar.color = earColor;
    leftEar.matrix = new Matrix4(headJointSystem);
    leftEar.matrix.translate(-0.1, 0.1, 0.05);
    leftEar.matrix.rotate(20, 0, 0, 1);
    leftEar.matrix.rotate(-15, 1, 0, 0);
    leftEar.matrix.scale(0.06, 0.18, 0.06);
    leftEar.matrix.translate(-0.5, 0, -0.5);
    leftEar.render();

    // Right Ear
    const rightEar = new Cube();
    rightEar.color = earColor;
    rightEar.matrix = new Matrix4(headJointSystem);
    rightEar.matrix.translate(0.1, 0.1, 0.05);
    rightEar.matrix.rotate(-20, 0, 0, 1);
    rightEar.matrix.rotate(-15, 1, 0, 0);
    rightEar.matrix.scale(0.06, 0.18, 0.06);
    rightEar.matrix.translate(-0.5, 0, -0.5);
    rightEar.render();

    // Tail
    const tail = new Cylinder(8);
    tail.color = tailColor;
    tail.matrix = new Matrix4(bodyJointSystem);
    tail.matrix.translate(0, 0.1, 0.3);
    tail.matrix.rotate(g_tailAngle, 1, 0, 0);
    tail.matrix.rotate(-30, 1, 0, 0);
    tail.matrix.scale(0.05, 0.3, 0.05);
    tail.matrix.translate(0, 0, -0.5);
    tail.render();

    // Front Left Leg (Upper, Lower, Paw)
    const frontL_Upper = new Cube();
    frontL_Upper.color = legColor;
    frontL_Upper.matrix = new Matrix4(bodyJointSystem);
    frontL_Upper.matrix.translate(-0.25, -0.05, -0.2);
    frontL_Upper.matrix.rotate(g_frontLegAngle, 1, 0, 0);
    const frontL_UpperCoordSystem = new Matrix4(frontL_Upper.matrix);
    frontL_Upper.matrix.scale(0.1, 0.3, 0.1);
    frontL_Upper.matrix.translate(-0.5, -1.0, -0.5);
    frontL_Upper.render();

    const frontL_Lower = new Cube();
    frontL_Lower.color = legColor;
    frontL_Lower.matrix = frontL_UpperCoordSystem;
    frontL_Lower.matrix.translate(0, -0.3, 0);
    frontL_Lower.matrix.rotate(g_pawAngle, 1, 0, 0);
    const frontL_LowerCoordSystem = new Matrix4(frontL_Lower.matrix);
    frontL_Lower.matrix.scale(0.08, 0.3, 0.08);
    frontL_Lower.matrix.translate(-0.5, -1.0, -0.5);
    frontL_Lower.render();

    const frontL_Paw = new Cube();
    frontL_Paw.color = pawColor;
    frontL_Paw.matrix = frontL_LowerCoordSystem;
    frontL_Paw.matrix.translate(0, -0.3, 0.02);
    frontL_Paw.matrix.rotate(g_pawRotateAngle, 1, 0, 0);
    frontL_Paw.matrix.scale(0.1, 0.05, 0.12);
    frontL_Paw.matrix.translate(-0.5, -1.0, -0.5);
    frontL_Paw.render();

    // Front Right Leg (Upper, Lower, Paw)
    const frontR_Upper = new Cube();
    frontR_Upper.color = legColor;
    frontR_Upper.matrix = new Matrix4(bodyJointSystem);
    frontR_Upper.matrix.translate(0.25, -0.05, -0.2);
    frontR_Upper.matrix.rotate(g_frontRightLegAngle, 1, 0, 0);
    const frontR_UpperCoordSystem = new Matrix4(frontR_Upper.matrix);
    frontR_Upper.matrix.scale(0.1, 0.3, 0.1);
    frontR_Upper.matrix.translate(-0.5, -1.0, -0.5);
    frontR_Upper.render();

    const frontR_Lower = new Cube();
    frontR_Lower.color = legColor;
    frontR_Lower.matrix = frontR_UpperCoordSystem;
    frontR_Lower.matrix.translate(0, -0.3, 0);
    frontR_Lower.matrix.rotate(g_frontRightPawAngle, 1, 0, 0);
    const frontR_LowerCoordSystem = new Matrix4(frontR_Lower.matrix);
    frontR_Lower.matrix.scale(0.08, 0.3, 0.08);
    frontR_Lower.matrix.translate(-0.5, -1.0, -0.5);
    frontR_Lower.render();

    const frontR_Paw = new Cube();
    frontR_Paw.color = pawColor;
    frontR_Paw.matrix = frontR_LowerCoordSystem;
    frontR_Paw.matrix.translate(0, -0.3, 0.02);
    frontR_Paw.matrix.scale(0.1, 0.05, 0.12);
    frontR_Paw.matrix.translate(-0.5, -1.0, -0.5);
    frontR_Paw.render();

    // Back Left Leg (Upper, Lower, Paw)
    const backL_Upper = new Cube();
    backL_Upper.color = legColor;
    backL_Upper.matrix = new Matrix4(bodyJointSystem);
    backL_Upper.matrix.translate(-0.25, -0.05, 0.2);
    backL_Upper.matrix.rotate(g_backLeftLegAngle, 1, 0, 0);
    const backL_UpperCoordSystem = new Matrix4(backL_Upper.matrix);
    backL_Upper.matrix.scale(0.1, 0.3, 0.1);
    backL_Upper.matrix.translate(-0.5, -1.0, -0.5);
    backL_Upper.render();

    const backL_Lower = new Cube();
    backL_Lower.color = legColor;
    backL_Lower.matrix = backL_UpperCoordSystem;
    backL_Lower.matrix.translate(0, -0.3, 0);
    backL_Lower.matrix.rotate(g_backLeftPawAngle, 1, 0, 0);
    const backL_LowerCoordSystem = new Matrix4(backL_Lower.matrix);
    backL_Lower.matrix.scale(0.08, 0.3, 0.08);
    backL_Lower.matrix.translate(-0.5, -1.0, -0.5);
    backL_Lower.render();

    const backL_Paw = new Cube();
    backL_Paw.color = pawColor;
    backL_Paw.matrix = backL_LowerCoordSystem;
    backL_Paw.matrix.translate(0, -0.3, 0.02);
    backL_Paw.matrix.scale(0.1, 0.05, 0.12);
    backL_Paw.matrix.translate(-0.5, -1.0, -0.5);
    backL_Paw.render();

    // Back Right Leg (Upper, Lower, Paw)
    const backR_Upper = new Cube();
    backR_Upper.color = legColor;
    backR_Upper.matrix = new Matrix4(bodyJointSystem);
    backR_Upper.matrix.translate(0.25, -0.05, 0.2);
    backR_Upper.matrix.rotate(g_backRightLegAngle, 1, 0, 0);
    const backR_UpperCoordSystem = new Matrix4(backR_Upper.matrix);
    backR_Upper.matrix.scale(0.1, 0.3, 0.1);
    backR_Upper.matrix.translate(-0.5, -1.0, -0.5);
    backR_Upper.render();

    const backR_Lower = new Cube();
    backR_Lower.color = legColor;
    backR_Lower.matrix = backR_UpperCoordSystem;
    backR_Lower.matrix.translate(0, -0.3, 0);
    backR_Lower.matrix.rotate(g_backRightPawAngle, 1, 0, 0);
    const backR_LowerCoordSystem = new Matrix4(backR_Lower.matrix);
    backR_Lower.matrix.scale(0.08, 0.3, 0.08);
    backR_Lower.matrix.translate(-0.5, -1.0, -0.5);
    backR_Lower.render();

    const backR_Paw = new Cube();
    backR_Paw.color = pawColor;
    backR_Paw.matrix = backR_LowerCoordSystem;
    backR_Paw.matrix.translate(0, -0.3, 0.02);
    backR_Paw.matrix.scale(0.1, 0.05, 0.12);
    backR_Paw.matrix.translate(-0.5, -1.0, -0.5);
    backR_Paw.render();

    // Performance measurement
    const duration = performance.now() - startTime;
    const currentFps = 1000 / (startTime - g_lastRenderTime);
    g_lastRenderTime = startTime;
    sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + currentFps.toFixed(1), "numdot");
}

// Send text to HTML
function sendTextToHTML(text, htmlID) {
    const htmlElm = document.getElementById(htmlID);
    if (!htmlElm) {
        console.log("Failed to get " + htmlID + " from HTML.");
        return;
    }
    htmlElm.innerHTML = text;
}

// Main function
function main() {
    setupWebGL();
    connectVariablesToGLSL();
    addActionsForHtmlUI();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    requestAnimationFrame(tick);
}

// Animation loop
function tick() {
    g_seconds = performance.now() / 1000.0 - g_startTime;
    updateAnimationAngles();
    renderScene();
    requestAnimationFrame(tick);
}