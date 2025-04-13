// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform float u_Size;
    void main() {
        gl_Position = a_Position;
        gl_PointSize = u_Size;
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

let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

function setupWebGL() {
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    // gl = getWebGLContext(canvas);
    gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
    
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
}

function connectVariablesToGLSL() {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position'); // Assign to global
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }

    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor'); // Assign to global
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if (!u_Size) {
        console.log('Failed to get the storage location of u_Size');
        return;
    }
}

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let circle_segNum = 10;

function addActionsForHtmlUI() {
    document.getElementById('green').onclick = function() {g_selectedColor = [0.0, 1.0, 0.0, 1.0]};
    document.getElementById('red').onclick = function() {g_selectedColor = [1.0, 0.0, 0.0, 1.0]};
    document.getElementById('clearButton').onclick = function() {
        g_shapesList = []; 
        renderAllShapes();
        document.getElementById('refImage').style.display = 'none';};

    document.getElementById('pointButton').onclick = function() {g_selectedType=POINT};
    document.getElementById('triButton').onclick = function() {g_selectedType=TRIANGLE};
    document.getElementById('circleButton').onclick = function() {g_selectedType=CIRCLE};

    document.getElementById('drawPika').onclick = function() {
        drawPikachu();
        document.getElementById('refImage').style.display = 'block';}

    document.getElementById('redSlide').addEventListener('mouseup', function() {g_selectedColor[0] = this.value/100});
    document.getElementById('greenSlide').addEventListener('mouseup', function() {g_selectedColor[1] = this.value/100});
    document.getElementById('blueSlide').addEventListener('mouseup', function() {g_selectedColor[2] = this.value/100});

    document.getElementById('sizeSlide').addEventListener('mouseup', function() {g_selectedSize = this.value});
    document.getElementById('circleSegSlide').addEventListener('mouseup', function() {circle_segNum = this.value});
}

function main() {
    setupWebGL();

    connectVariablesToGLSL();

    addActionsForHtmlUI();

    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;
    canvas.onmousemove = function(ev) { if (ev.buttons == 1) {click(ev)}};

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_shapesList = [];

function click(ev) {
    // Convert coordinates to WebGL coordinate system
    let [x, y] = convertCoordinatesEventToGL(ev);

    let point;
    if (g_selectedType == POINT) {
        point = new Point();
    }
    else if (g_selectedType == TRIANGLE) {
        point = new Triangle();
    }
    else {
        point = new Circle();
        point.segments = circle_segNum;
    }

    point.position = [x, y];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;
    g_shapesList.push(point);

    renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

    return [x, y];
}

function renderAllShapes() {

    var startTime = performance.now();

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    var len = g_shapesList.length;
    for (var i = 0; i < len; i++) {
        g_shapesList[i].render();
    }

    var duration = performance.now() - startTime;
    sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

function sendTextToHTML(text, htmlID) {

    var htmlElm = document.getElementById(htmlID);

    if (!htmlID) {
        console.log("Failed to get " + htmlID + " from HTML.");
        return;
    }

    htmlElm.innerHTML = text;
}

function drawPikachu() {
    g_shapesList = [];

    const pikachuYellow = [1.0, 0.9, 0.3, 1.0];
    const red = [1.0, 0.0, 0.0, 1.0];
    const black = [0.0, 0.0, 0.0, 1.0];
    const brown = [0.5, 0.3, 0.1, 1.0];
    const white = [1.0, 1.0, 1.0, 1.0];

    // Add a triangle with optional flip (orientation) parameter
    function addTri(x, y, size, color, flip = false) {
        const t = new Triangle();
        t.position = [x, y];
        t.size = size;
        t.color = color.slice();
        
        // Override render function to support flipping
        t.render = function () {
            gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
            
            // Calculate half-size for equilateral triangle vertices
            const halfSize = this.size / 200.0; // Scale size to WebGL coordinates
            // Define vertices for an equilateral triangle centered at (x, y)
            let vertices;
            if (flip) {
                // Downward-pointing triangle
                vertices = [
                    x, y + halfSize,           // Top center
                    x - halfSize * Math.sqrt(3) / 2, y - halfSize / 2, // Bottom left
                    x + halfSize * Math.sqrt(3) / 2, y - halfSize / 2  // Bottom right
                ];
            } else {
                // Upward-pointing triangle (default)
                vertices = [
                    x, y - halfSize,           // Bottom center
                    x - halfSize * Math.sqrt(3) / 2, y + halfSize / 2, // Top left
                    x + halfSize * Math.sqrt(3) / 2, y + halfSize / 2  // Top right
                ];
            }
            
            drawTriangle(vertices);
        };
        
        g_shapesList.push(t);
    }

    // Add a rectangle using two triangles
    function addRect(x, y, width, height, color) {
        const t1 = new Triangle();
        t1.position = [x, y];
        t1.color = color.slice();
        t1.render = function () {
            gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
            drawTriangle([
                x - width / 2, y - height / 2,
                x + width / 2, y - height / 2,
                x - width / 2, y + height / 2,
            ]);
        };
        g_shapesList.push(t1);

        const t2 = new Triangle();
        t2.position = [x, y];
        t2.color = color.slice();
        t2.render = function () {
            gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
            drawTriangle([
                x + width / 2, y + height / 2,
                x - width / 2, y + height / 2,
                x + width / 2, y - height / 2,
            ]);
        };
        g_shapesList.push(t2);
    }

    // Center Pikachu: canvas is [-1, 1] x [-1, 1]
    const offsetX = 0.0; // Horizontal center
    const offsetY = 0.0; // Vertical center

    // === HEAD ===
    addRect(offsetX, 0.35 + offsetY, 0.4, 0.4, pikachuYellow);

    // === EARS ===
    addRect(offsetX - 0.25, 0.65 + offsetY, 0.08, 0.2, pikachuYellow); // Left ear
    addRect(offsetX + 0.25, 0.65 + offsetY, 0.08, 0.2, pikachuYellow); // Right ear
    // Ear tips as triangles
    addTri(offsetX - 0.25, 0.75 + offsetY, 10, black, true); // Left ear tip (downward)
    addTri(offsetX + 0.25, 0.75 + offsetY, 10, black, true); // Right ear tip (downward)

    // === EYES ===
    addTri(offsetX - 0.12, 0.4 + offsetY, 12, black); // Left eye
    addTri(offsetX + 0.12, 0.4 + offsetY, 12, black); // Right eye
    addTri(offsetX - 0.11, 0.42 + offsetY, 6, white); // Left highlight
    addTri(offsetX + 0.11, 0.42 + offsetY, 6, white); // Right highlight

    // === CHEEKS ===
    addTri(offsetX - 0.22, 0.3 + offsetY, 15, red); // Left cheek
    addTri(offsetX + 0.22, 0.3 + offsetY, 15, red); // Right cheek

    // === NOSE ===
    addTri(offsetX, 0.35 + offsetY, 5, black);

    // === MOUTH ===
    addRect(offsetX, 0.3 + offsetY, 0.1, 0.03, black); // Main mouth
    addTri(offsetX - 0.05, 0.31 + offsetY, 5, black); // Left curve
    addTri(offsetX + 0.05, 0.31 + offsetY, 5, black); // Right curve

    // === BODY ===
    addRect(offsetX, 0.05 + offsetY, 0.35, 0.5, pikachuYellow);

    // === ARMS ===
    addRect(offsetX - 0.25, 0.1 + offsetY, 0.1, 0.2, pikachuYellow); // Left arm
    addRect(offsetX + 0.25, 0.1 + offsetY, 0.1, 0.2, pikachuYellow); // Right arm

    // === LEGS ===
    addRect(offsetX - 0.12, -0.2 + offsetY, 0.1, 0.2, pikachuYellow); // Left leg
    addRect(offsetX + 0.12, -0.2 + offsetY, 0.1, 0.2, pikachuYellow); // Right leg

    // === TAIL ===
    addRect(offsetX + 0.25, 0.15 + offsetY, 0.06, 0.2, brown); // Base (vertical)
    addRect(offsetX + 0.35, 0.3 + offsetY, 0.2, 0.06, brown); // Zig (horizontal)

    renderAllShapes();
}