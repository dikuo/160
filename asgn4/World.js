// World.js - Main script for the 3D virtual world

// Vertex shader program
var VSHADER_SOURCE = `
precision mediump float;
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;

// Uniforms
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix; // <--- ADD THIS LINE

// Varyings (passed to fragment shader)
varying vec2 v_UV;
varying vec3 v_Normal;
varying vec4 v_VertPos;

void main() {
    // Calculate final position
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;

    // Pass UV coordinates
    v_UV = a_UV;

    // Transform the normal using u_NormalMatrix and pass it
    // We only want the direction, so we use vec4(a_Normal, 0.0)
    // We take the .xyz to convert back to vec3
    // We normalize it to ensure it's a unit vector (good practice for lighting)
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1))); // <--- CHANGE THIS LINE
    // v_Normal = a_Normal;
    v_VertPos = u_ModelMatrix * a_Position;
}
`;

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;
varying vec2 v_UV;
varying vec3 v_Normal;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0; // sky
uniform sampler2D u_Sampler1; // brick
uniform sampler2D u_Sampler2; // stone
uniform sampler2D u_Sampler3; // water
uniform int u_whichTexture;
uniform vec3 u_lightPos;
uniform vec3 u_cameraPos;
uniform bool u_lightOn;
varying vec4 v_VertPos;

void main() {
    if (u_whichTexture == -3) {
        gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
    }
    else if (u_whichTexture == -2) {
        gl_FragColor = u_FragColor;      // Use color
    } else if (u_whichTexture == -1) {
        gl_FragColor = vec4(v_UV, 1.0, 1.0);    // Use UV debug color
    } else if (u_whichTexture == 0) {
        gl_FragColor = texture2D(u_Sampler0, v_UV); // Texture 0 (sky)
    } else if (u_whichTexture == 1) {
        gl_FragColor = texture2D(u_Sampler1, v_UV); // Texture 1 (brick)
    } else if (u_whichTexture == 2) {
        gl_FragColor = texture2D(u_Sampler2, v_UV);   // Texture 2 (stone)
    } else if (u_whichTexture == 3) {
        gl_FragColor = texture2D(u_Sampler3, v_UV);   // Texture 3 (water)
    } else if (u_whichTexture == 4) {
        gl_FragColor = vec4(0.58, 0.76, 0.34, 1.0);   // Grassy green
    } else {
        gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // Magenta for errors
    }

    vec3 lightVector = u_lightPos - vec3(v_VertPos);
    float r= length(lightVector);
    
    // if (r < 1.0) {
    //     gl_FragColor = vec4(1, 0, 0, 1);
    // } else if (r < 2.0) {
    //     gl_FragColor = vec4(0, 1, 0, 1);
    // }

    vec3 L = normalize(lightVector);
    vec3 N = normalize(v_Normal);
    float nDotL = max(dot(N, L), 0.0);

    vec3 R = reflect(-L, N);

    vec3 E = normalize(u_cameraPos - vec3(v_VertPos));

    float specular = pow(max(dot(E, R), 0.0), 10.0);

    vec3 diffuse = vec3(gl_FragColor) * nDotL * 0.7;
    vec3 ambient = vec3(gl_FragColor) * 0.3;

    if (u_lightOn) {
        if (u_whichTexture == 0) {
            gl_FragColor = vec4(specular + diffuse + ambient, 1.0);
        } 
        else {
            gl_FragColor = vec4(diffuse + ambient, 1.0);
        }
    }
}
`;

let canvas;
let gl;
let a_Position, a_UV, a_Normal;
let u_FragColor, u_ModelMatrix, u_ProjectionMatrix, u_ViewMatrix, u_GlobalRotateMatrix, u_NormalMatrix;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;
let u_whichTexture, u_lightPos, u_cameraPos, u_lightOn;

let g_texture0 = null, g_texture1 = null, g_texture2 = null, g_texture3 = null;

let g_globalAngle = 0, g_globalAngleX = 0, g_globalAngleY = 0;
let g_isMouseDownForFPSCamera = false;
let g_lastMouseX = 0, g_lastMouseY = 0;

let g_animateRun = false, g_animateTail = false;
let g_pokeAnimation = false, g_pokeStartTime = 0;
let g_frontLegAngle = 0, g_frontRightLegAngle = 0, g_backLeftLegAngle = 0, g_backRightLegAngle = 0;
let g_pawAngle = 0, g_frontRightPawAngle = 0, g_backLeftPawAngle = 0, g_backRightPawAngle = 0;
let g_pawRotateAngle = 0, g_tailAngle = 0, g_headShakeAngle = 0;
let g_normalOn = false;
let g_lightPos = [0, 1, -2];
let g_lightOn = true;

var g_startTime = 0, g_seconds = 0;
var g_camera = new Camera();

const NEW_MAP_SIZE = 32;
var g_map = [];
for (let r = 0; r < NEW_MAP_SIZE; r++) {
    g_map[r] = [];
    for (let c = 0; c < NEW_MAP_SIZE; c++) {
        if (r === 0 || r === NEW_MAP_SIZE - 1 || c === 0 || c === NEW_MAP_SIZE - 1) {
            g_map[r][c] = Math.random() < 0.7 ? 3 : 4; 
        } else if (r === 5 && c > 5 && c < NEW_MAP_SIZE - 5) {
            g_map[r][c] = 4; 
        } else if (c === 10 && r > 2 && r < NEW_MAP_SIZE - 15) {
            g_map[r][c] = 2; 
        } else if (r % 7 === 1 && c % 5 === 1 && r < NEW_MAP_SIZE -1 && c < NEW_MAP_SIZE -1 ) {
             g_map[r][c] = Math.floor(Math.random() * 2) + 1; 
        } else {
            g_map[r][c] = 0; 
        }
    }
}
g_map[1][1] = 0; g_map[1][2] = 0; g_map[2][1] = 0; 
g_map[Math.floor(NEW_MAP_SIZE/2)][Math.floor(NEW_MAP_SIZE/2)] = 0; 
g_map[15][15] = 4; g_map[10][20] = 4;

const MAP_SIZE_Z = g_map.length;
const MAP_SIZE_X = g_map[0].length;

const g_projMat = new Matrix4();
const g_viewMat = new Matrix4();
const g_globalRotMat = new Matrix4();
const g_modelMat = new Matrix4();

const g_mapBlockCube = new Cube();
const g_floorCube = new Cube();
const g_skyCube = new Cube();
const g_lakeCube = new Cube();
const g_lightCube = new Cube();

const g_dogBodyCube = new Cube(), g_dogNeckCube = new Cube(), g_dogHeadCube = new Cube();
const g_dogSnoutCube = new Cube(), g_dogNoseCube = new Cube();
const g_dogLeftEyeCube = new Cube(), g_dogRightEyeCube = new Cube();
const g_dogLeftEarCube = new Cube(), g_dogRightEarCube = new Cube();
const g_dogTailCylinder = new Cylinder(8);
const g_dogLegPartCube = new Cube();
const g_dogPawCube = new Cube();

const g_dogWorldMatrix = new Matrix4();
const g_dogParentJointMatrix = new Matrix4();
const g_dogChildPartMatrix = new Matrix4();

function setupWebGL() {
    canvas = document.getElementById('webgl');
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) { console.log('Failed to get the rendering context for WebGL'); return false; }
    gl.enable(gl.DEPTH_TEST);
    return true;
}

function connectVariablesToGSL() {
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) { console.log('Failed to intialize shaders.'); return; }
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
    u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
    u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
    u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');

    if (!u_ModelMatrix || !u_ViewMatrix || !u_ProjectionMatrix) { // Simplified check
        console.error('Failed to get one or more GSLS uniform/attribute locations.');
    }
    gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().elements);
}

function addActionsForHtmlUI() {
    document.getElementById('angleSlide').addEventListener('input', function() {
        g_globalAngleY = parseFloat(this.value);
    });
    document.getElementById('frontLegSlide').addEventListener('input', function() {
        g_frontLegAngle = parseFloat(this.value);
    });
    document.getElementById('pawSlide').addEventListener('input', function() {
        g_pawAngle = parseFloat(this.value);
    });
    document.getElementById('pawRotateSlide').addEventListener('input', function() {
        g_pawRotateAngle = parseFloat(this.value);
    });
    document.getElementById('lightSlideX').addEventListener('mousemove', function(ev) {
        if (ev.buttons == 1) {
            g_lightPos[0] = this.value / 100;
            renderScene();
        }
    })
    document.getElementById('lightSlideY').addEventListener('mousemove', function(ev) {
        if (ev.buttons == 1) {
            g_lightPos[1] = this.value / 100;
            renderScene();
        }
    })
    document.getElementById('lightSlideZ').addEventListener('mousemove', function(ev) {
        if (ev.buttons == 1) {
            g_lightPos[2] = this.value / 100;
            renderScene();
        }
    })


    document.getElementById('animationTailOnButton').onclick = function() { g_animateTail = true; };
    document.getElementById('animationTailOffButton').onclick = function() { g_animateTail = false; };
    document.getElementById('animationRunOnButton').onclick = function() { g_animateRun = true; };
    document.getElementById('animationRunOffButton').onclick = function() { g_animateRun = false; };
    
    document.getElementById('NormalOnButton').onclick = function() { g_normalOn = true; };
    document.getElementById('NormalOffButton').onclick = function() { g_normalOn = false; };

    document.getElementById('LightOnButton').onclick = function() { g_lightOn = true; };
    document.getElementById('LightOffButton').onclick = function() { g_lightOn = false; };

    let isSceneDragging = false;
    let sceneDragLastX = 0;
    canvas.addEventListener('mousedown', function(event) {
        if (event.button === 0 && !event.shiftKey && !g_isMouseDownForFPSCamera) {
            isSceneDragging = true;
            sceneDragLastX = event.clientX;
        }
    });
    canvas.addEventListener('mousemove', function(event) {
        if (isSceneDragging) {
            const deltaX = event.clientX - sceneDragLastX;
            g_globalAngleY -= deltaX * 0.25;
            sceneDragLastX = event.clientX;
        }
    });
    document.addEventListener('mouseup', function(event) {
        if (event.button === 0 && isSceneDragging) { isSceneDragging = false; }
    });
    document.addEventListener('mouseleave', function() {
        if (isSceneDragging) { isSceneDragging = false; }
    });
}

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
    } else {
        g_frontLegAngle = parseFloat(document.getElementById('frontLegSlide').value);
        g_pawAngle = parseFloat(document.getElementById('pawSlide').value);
        g_pawRotateAngle = parseFloat(document.getElementById('pawRotateSlide').value);
        
        g_backRightLegAngle = 0; g_frontRightLegAngle = g_frontLegAngle; 
        g_backLeftLegAngle = 0;
        g_frontRightPawAngle = g_pawAngle; g_backLeftPawAngle = 0; g_backRightPawAngle = 0;
    }
    if (g_animateTail) { g_tailAngle = 20 * Math.sin(g_seconds * 5); }
    else { g_tailAngle = 0; }

    if (g_pokeAnimation) {
        const pokeDuration = 1.0;
        if (g_seconds - g_pokeStartTime < pokeDuration) {
            g_headShakeAngle = 30 * Math.sin((g_seconds - g_pokeStartTime) * 10);
        } else {
            g_pokeAnimation = false; g_headShakeAngle = 0;
            let pokeTextEl = document.getElementById('pokeText');
            if (pokeTextEl) pokeTextEl.style.display = 'none';
        }
    } else { g_headShakeAngle = 0; }

    g_lightPos[0] = Math.cos(g_seconds);
}

function initTextures(gl, n) {
    var image = new Image();
    image.crossOrigin = "anonymous";
    if (!image) { console.log('Failed to create image object for texture ' + n); return false; }
    let textureGlobalVarName, samplerUniform, imageSrc;
    switch (n) {
        case 0: textureGlobalVarName = 'g_texture0'; samplerUniform = u_Sampler0; imageSrc = 'sky.jpg'; break;
        case 1: textureGlobalVarName = 'g_texture1'; samplerUniform = u_Sampler1; imageSrc = 'brick.jpg'; break;
        case 2: textureGlobalVarName = 'g_texture2'; samplerUniform = u_Sampler2; imageSrc = 'stone.jpg'; break;
        case 3: textureGlobalVarName = 'g_texture3'; samplerUniform = u_Sampler3; imageSrc = 'water.jpg'; break;
        default: console.error("Unknown texture index: " + n); return false;
    }
    image.onload = function () {
        let texture = window[textureGlobalVarName];
        if (!texture) {
            texture = gl.createTexture();
            if (!texture) { console.error('Failed to create texture: ' + imageSrc); return; }
            window[textureGlobalVarName] = texture;
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0 + n);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        } catch (e) {
            console.error("texImage2D error for " + imageSrc + ": ", e);
            const pixel = new Uint8Array([255,0,255]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, pixel);
        }
        gl.uniform1i(samplerUniform, n);
        // console.log('Loaded texture ' + n + ' (' + imageSrc + ')'); // Can be verbose
    };
    image.onerror = function() { console.error("Failed to load image: " + imageSrc); };
    image.src = imageSrc;
    return true;
}

function keydown(ev) {
    if (!g_camera) { return; }

    if (ev.keyCode == 87 && typeof g_camera.forward === 'function') g_camera.forward();    // W
    else if (ev.keyCode == 83 && typeof g_camera.back === 'function') g_camera.back();     // S
    else if (ev.keyCode == 68 && typeof g_camera.right === 'function') g_camera.right();   // D
    else if (ev.keyCode == 65 && typeof g_camera.left === 'function') g_camera.left();     // A
    else if (ev.keyCode == 69 && typeof g_camera.rotateRight === 'function') g_camera.rotateRight(); // E Key
    else if (ev.keyCode == 81 && typeof g_camera.rotateLeft === 'function') g_camera.rotateLeft();   // Q Key
}

const g_mySphere = new Sphere(16, 32); // Creates a sphere with 16 lat bands, 32 lon bands

function main() {
    g_startTime = performance.now() / 1000.0;
    if (!setupWebGL()) return;
    connectVariablesToGSL();

    console.log("Initializing shape buffers...");
    const shapesToInit = [
        g_mapBlockCube, g_floorCube, g_skyCube, g_lakeCube,
        g_dogBodyCube, g_dogNeckCube, g_dogHeadCube, g_dogSnoutCube, g_dogNoseCube,
        g_dogLeftEyeCube, g_dogRightEyeCube, g_dogLeftEarCube, g_dogRightEarCube,
        g_dogTailCylinder, g_dogLegPartCube, g_dogPawCube
    ];
    for (let shape of shapesToInit) {
        if (shape && typeof shape.initBuffers === 'function') {
            if (!shape.initBuffers(gl)) {
                console.error("Failed to initialize buffers for shape:", shape.type || 'unknown shape type', shape);
            }
        } else {
            console.error("Shape object or its initBuffers method is missing for an entry in shapesToInit:", shape);
        }
    }
    console.log("Shape buffers initialization attempt complete.");
    
    addActionsForHtmlUI();

    if (g_camera) {
        let mapWorldCenterX = (MAP_SIZE_X / 2.0 - 0.5) * 0.3; 
        let mapWorldCenterZ = (MAP_SIZE_Z / 2.0 - 0.5) * 0.3;
        g_camera.eye = new Vector(mapWorldCenterX, 1.5, mapWorldCenterZ + NEW_MAP_SIZE * 0.3 * 0.4 + 2);
        g_camera.at  = new Vector(mapWorldCenterX, 0, mapWorldCenterZ);
        g_camera.up  = new Vector(0, 1, 0);
        if (g_camera.hasOwnProperty('fov')) { g_camera.fov = 60; }
        console.log("Initial Camera in main:", JSON.stringify(g_camera));
    } else {
        console.error("CRITICAL: g_camera object not created!");
    }

    canvas.onmousedown = mousedown_FPSCamera;
    canvas.onmousemove = mousemove_FPSCamera;
    document.onmouseup = mouseup_FPSCamera;
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('click', handlePokeClick);
    
    console.log("Attempting to attach keydown listener using addEventListener...");
    document.removeEventListener('keydown', keydown); 
    document.addEventListener('keydown', keydown);
    console.log("Keydown listener for 'document' should be attached.");

    initTextures(gl, 0); initTextures(gl, 1); initTextures(gl, 2); initTextures(gl, 3);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    requestAnimationFrame(tick);

    g_mySphere.initBuffers(gl);
}

function tick() {
    g_seconds = performance.now() / 1000.0 - g_startTime;
    updateAnimationAngles();
    renderScene();
    requestAnimationFrame(tick);
}

function sendTextToHTML(text, htmlID) {
    var htmlEl = document.getElementById(htmlID);
    if (htmlEl) { htmlEl.innerHTML = text; }
}

function mousedown_FPSCamera(ev) {
    if (ev.button === 0 && !ev.shiftKey) {
        g_isMouseDownForFPSCamera = true;
        g_lastMouseX = ev.clientX;
        g_lastMouseY = ev.clientY;
    }
}

function mouseup_FPSCamera(ev) {
    if (ev.button === 0) {
        g_isMouseDownForFPSCamera = false;
    }
}

function mousemove_FPSCamera(ev) {
    if (g_isMouseDownForFPSCamera) {
        let deltaX = ev.clientX - g_lastMouseX;
        let deltaY = ev.clientY - g_lastMouseY;
        if (g_camera) {
            if (deltaX > 0.5 && typeof g_camera.rotateRight === 'function') g_camera.rotateRight();
            else if (deltaX < -0.5 && typeof g_camera.rotateLeft === 'function') g_camera.rotateLeft();
            if (deltaY > 0.5 && typeof g_camera.tiltDown === 'function') g_camera.tiltDown();
            else if (deltaY < -0.5 && typeof g_camera.tiltUp === 'function') g_camera.tiltUp();
        }
        g_lastMouseX = ev.clientX;
        g_lastMouseY = ev.clientY;
    }
}

function handlePokeClick(event) {
    if (event.shiftKey && event.button === 0) {
        g_pokeAnimation = true;
        g_pokeStartTime = g_seconds;
        let pokeTextEl = document.getElementById('pokeText');
        if (pokeTextEl) pokeTextEl.style.display = 'block';
    }
}


function drawMap() { 
    const BLOCK_SCALE = 0.3;
    for (let r = 0; r < MAP_SIZE_Z; r++) {
        for (let c = 0; c < MAP_SIZE_X; c++) {
            let stackHeight = g_map[r][c];
            if (stackHeight == 0) continue;
            for (let i = 0; i < stackHeight; i++) {
                g_modelMat.setIdentity();
                if (g_normalOn)   g_mapBlockCube.textureNum = -3;
                else if (i === 0) g_mapBlockCube.textureNum = 4;
                else if (i === 1) g_mapBlockCube.textureNum = 2;
                else if (i === 2) g_mapBlockCube.textureNum = 1;
                else              g_mapBlockCube.textureNum = 2;
                
                g_modelMat.translate(0, -0.75 + i * BLOCK_SCALE, 0); 
                g_modelMat.scale(BLOCK_SCALE, BLOCK_SCALE, BLOCK_SCALE); 
                g_modelMat.translate(c - MAP_SIZE_X / 2 + 0.5, 0, r - MAP_SIZE_Z / 2 + 0.5); 
                g_mapBlockCube.drawCube(gl, g_modelMat, [1.0, 1.0, 1.0, 1.0]);
            }
        }
    }
}

function drawCustomStructures() {
    const structColor = [0.7, 0.7, 0.7, 1.0]; 
    const floorY = -0.75;

    if (g_normalOn)   g_mapBlockCube.textureNum = -3;
    else g_mapBlockCube.textureNum = 1; // Brick

    let wallHeight1 = 0.9, wallWidth1 = 0.2, wallDepth1 = 2.0;
    let wallPosX1 = -4.0, wallPosY1 = floorY + wallHeight1 / 2, wallPosZ1 = -3.0;
    g_modelMat.setIdentity().translate(wallPosX1, wallPosY1, wallPosZ1).scale(wallWidth1, wallHeight1, wallDepth1);
    g_mapBlockCube.drawCube(gl, g_modelMat, structColor);

    let wallHeight2 = 0.7, wallWidth2 = 1.5, wallDepth2 = 0.2;
    let wallConnectX = wallPosX1 - wallWidth1/2 + wallWidth2/2; 
    let wallConnectZ = wallPosZ1 + wallDepth1/2 - wallDepth2/2; 
    let wallPosY2 = floorY + wallHeight2/2;
    g_modelMat.setIdentity().translate(wallConnectX, wallPosY2, wallConnectZ).scale(wallWidth2, wallHeight2, wallDepth2);
    g_mapBlockCube.drawCube(gl, g_modelMat, structColor);

    if (g_normalOn)   g_mapBlockCube.textureNum = -3;
    else g_mapBlockCube.textureNum = 2; // Stone
    const numMonoliths = 7; const circleRadius = 1.8;
    const monolithHeight = 1.5; const monolithWidth = 0.4; const monolithDepth = 0.3;
    const circleCenterX = 0.5; const circleCenterZ = 0.5; 
    for (let i = 0; i < numMonoliths; i++) {
        let angle = (i / numMonoliths) * 2 * Math.PI;
        let mX = circleCenterX + circleRadius * Math.cos(angle);
        let mZ = circleCenterZ + circleRadius * Math.sin(angle);
        let mY = floorY + monolithHeight / 2;
        g_modelMat.setIdentity().translate(mX, mY, mZ).rotate(angle * 180 / Math.PI + 90, 0, 1, 0).scale(monolithWidth, monolithHeight, monolithDepth);
        g_mapBlockCube.drawCube(gl, g_modelMat, structColor);
    }

    if (g_normalOn)   g_mapBlockCube.textureNum = -3;
    else g_lakeCube.textureNum = 3; // Water
    let pondWidth = 1.5, pondDepth = 2.5, pondHeight = 0.02;
    let pondX = 3.0, pondY = floorY + pondHeight/2 - 0.015, pondZ = -2.0;
    g_modelMat.setIdentity().translate(pondX, pondY, pondZ).scale(pondWidth, pondHeight, pondDepth);
    g_lakeCube.drawCube(gl, g_modelMat, [0.0, 0.4, 0.8, 0.8]);

    if (g_normalOn)   g_mapBlockCube.textureNum = -3;
    else g_mapBlockCube.textureNum = 1; // Brick

    const pillarHeight = 1.2, pillarSize = 0.3, archSpan = 1.0, lintelHeight = 0.3;
    let archXBase = -3.0, archZ = 3.0;
    g_modelMat.setIdentity().translate(archXBase, floorY + pillarHeight/2, archZ).scale(pillarSize, pillarHeight, pillarSize);
    g_mapBlockCube.drawCube(gl, g_modelMat, structColor);
    g_modelMat.setIdentity().translate(archXBase + archSpan + pillarSize, floorY + pillarHeight/2, archZ).scale(pillarSize, pillarHeight, pillarSize);
    g_mapBlockCube.drawCube(gl, g_modelMat, structColor);
    g_modelMat.setIdentity().translate(archXBase + (archSpan + pillarSize)/2 , floorY + pillarHeight + lintelHeight/2, archZ).scale(archSpan + pillarSize*2, lintelHeight, pillarSize);
    g_mapBlockCube.drawCube(gl, g_modelMat, structColor);
}

function renderScene() {
    var startTime = performance.now();
    let fov = 60;
    if (g_camera && g_camera.hasOwnProperty('fov') && typeof g_camera.fov === 'number' && g_camera.fov > 0) {
        fov = g_camera.fov;
    }
    g_projMat.setPerspective(fov, canvas.width / canvas.height, 0.1, 1000);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_projMat.elements);

    if (g_camera && 
        g_camera.eye && typeof g_camera.eye.x === 'number' && 
        g_camera.at  && typeof g_camera.at.x  === 'number' &&
        g_camera.up  && typeof g_camera.up.x  === 'number' ) {
        g_viewMat.setLookAt(
            g_camera.eye.x, g_camera.eye.y, g_camera.eye.z,
            g_camera.at.x,  g_camera.at.y,  g_camera.at.z,
            g_camera.up.x,  g_camera.up.y,  g_camera.up.z
        );
    } else {
        console.error("RenderScene: Camera vectors (eye, at, or up) or their .x, .y, .z components are not properly initialized!");
        // console.log("Current g_camera state:", JSON.stringify(g_camera)); // Keep for detailed debug if needed
        g_viewMat.setLookAt(0,0,3, 0,0,-100, 0,1,0); 
    }
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_viewMat.elements);

    g_globalRotMat.setIdentity();
    g_globalRotMat.rotate(g_globalAngleX, 1, 0, 0);
    g_globalRotMat.rotate(g_globalAngle + g_globalAngleY, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, g_globalRotMat.elements);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawMap();
    drawCustomStructures();

    if (g_normalOn)  g_floorCube.textureNum = -3;
    else g_floorCube.textureNum = 4;

    let floorScaleX = MAP_SIZE_X * 0.3 * 1.2; 
    let floorScaleZ = MAP_SIZE_Z * 0.3 * 1.2;
    g_modelMat.setIdentity().translate(0, -0.75, 0).scale(floorScaleX, 0.01, floorScaleZ);
    g_floorCube.drawCube(gl, g_modelMat, [0.58, 0.76, 0.34, 1.0]);

    // if (g_normalOn)  g_lakeCube.textureNum = -3;
    // else g_lakeCube.textureNum = 3; 

    g_modelMat.setIdentity().translate(-MAP_SIZE_X * 0.3 * 0.15, -0.745, -MAP_SIZE_Z * 0.3 * 0.15).scale(5, 0.001, 5);
    g_lakeCube.drawCube(gl, g_modelMat, [0.0, 0.4, 0.8, 0.8]);

    let dogPosX = 0; 
    let dogPosZ = 1; 
    g_dogWorldMatrix.setIdentity().translate(dogPosX, -0.45, dogPosZ).scale(0.5, 0.5, 0.5).rotate(180, 0, 1, 0);
    drawDog(g_dogWorldMatrix);

    g_modelMat.setIdentity().translate(1, 0, 1); // Example transform
    if (g_normalOn)  g_mySphere.textureNum = -3;
    else g_mySphere.textureNum = -2; // Use a color
    g_mySphere.render(gl, g_modelMat, [0.0, 0.0, 1.0, 1.0]); // Draw a blue sphere

    if (g_normalOn)  g_skyCube.textureNum = -3;
    else g_skyCube.textureNum = 0;

    g_modelMat.setIdentity().scale(-100, -100, -100);
    g_skyCube.drawCube(gl, g_modelMat, [1.0, 0.0, 0.0, 1.0]);

    gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    gl.uniform3f(u_cameraPos, g_camera.eye.x, g_camera.eye.y, g_camera.eye.z);
    gl.uniform1i(u_lightOn, g_lightOn);

    var lightColor = [2, 2, 0, 1];
    g_modelMat.setIdentity().translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    g_modelMat.scale(-0.1, -0.1, -0.1);
    g_modelMat.translate(-0.5, -0.5, -0.5);
    g_lightCube.drawCube(gl, g_modelMat, lightColor);

    var duration = performance.now() - startTime;
    sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration) / 10, "numdot");
}

function drawDog(dogWorldMatrix) {
    const bodyColor=[0.6,0.3,0.1,1], neckColor=[0.55,0.28,0.08,1], headColor=[0.6,0.3,0.1,1],
          snoutColor=[0.5,0.25,0.05,1], noseColor=[0.1,0.1,0.1,1], eyeColor=[0,0,0,1],
          earColor=[0.5,0.25,0.05,1], legColor=[0.6,0.3,0.1,1], pawColor=[0.4,0.2,0.05,1],
          tailColor=[0.6,0.3,0.1,1];

    g_dogBodyCube.textureNum = -2;
    g_dogParentJointMatrix.set(dogWorldMatrix);
    g_dogParentJointMatrix.translate(-0.25, -0.1, 0.0);
    g_dogChildPartMatrix.set(g_dogParentJointMatrix);
    g_dogChildPartMatrix.scale(0.5, 0.3, 0.6);
    g_dogBodyCube.drawCube(gl, g_dogChildPartMatrix, bodyColor);

    let currentParentMatrix = new Matrix4(g_dogParentJointMatrix);

    g_dogNeckCube.textureNum = -2;
    currentParentMatrix.translate(0, 0.15, -0.25).rotate(-30, 1, 0, 0);
    g_dogChildPartMatrix.set(currentParentMatrix);
    g_dogChildPartMatrix.scale(0.1, 0.3, 0.1);
    g_dogNeckCube.drawCube(gl, g_dogChildPartMatrix, neckColor);

    let headParentMatrix = new Matrix4(currentParentMatrix);

    g_dogHeadCube.textureNum = -2;
    headParentMatrix.translate(0, 0.3, 0).rotate(10 + g_headShakeAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(headParentMatrix);
    g_dogChildPartMatrix.scale(0.25, 0.2, 0.25);
    g_dogHeadCube.drawCube(gl, g_dogChildPartMatrix, headColor);

    let snoutParentMatrix = new Matrix4(headParentMatrix);

    g_dogSnoutCube.textureNum = -2;
    snoutParentMatrix.translate(0, -0.05, -0.15);
    g_dogChildPartMatrix.set(snoutParentMatrix);
    g_dogChildPartMatrix.scale(0.15, 0.1, 0.2);
    g_dogSnoutCube.drawCube(gl, g_dogChildPartMatrix, snoutColor);

    g_dogNoseCube.textureNum = -2;
    g_dogChildPartMatrix.set(snoutParentMatrix); 
    g_dogChildPartMatrix.translate(0, 0, -0.1);  
    g_dogChildPartMatrix.scale(0.03, 0.03, 0.03);
    g_dogNoseCube.drawCube(gl, g_dogChildPartMatrix, noseColor);

    g_dogLeftEyeCube.textureNum = -2;
    g_dogChildPartMatrix.set(headParentMatrix).translate(-0.08, 0.05, -0.13).scale(0.04,0.04,0.04);
    g_dogLeftEyeCube.drawCube(gl, g_dogChildPartMatrix, eyeColor);
    g_dogRightEyeCube.textureNum = -2;
    g_dogChildPartMatrix.set(headParentMatrix).translate(0.08, 0.05, -0.13).scale(0.04,0.04,0.04);
    g_dogRightEyeCube.drawCube(gl, g_dogChildPartMatrix, eyeColor);

    g_dogLeftEarCube.textureNum = -2;
    g_dogChildPartMatrix.set(headParentMatrix).translate(-0.1,0.1,0.05).rotate(20,0,0,1).rotate(-15,1,0,0).scale(0.06,0.18,0.06);
    g_dogLeftEarCube.drawCube(gl, g_dogChildPartMatrix, earColor);
    g_dogRightEarCube.textureNum = -2;
    g_dogChildPartMatrix.set(headParentMatrix).translate(0.1,0.1,0.05).rotate(-20,0,0,1).rotate(-15,1,0,0).scale(0.06,0.18,0.06);
    g_dogRightEarCube.drawCube(gl, g_dogChildPartMatrix, earColor);

    g_dogTailCylinder.textureNum = -2;
    g_dogTailCylinder.color = tailColor; 
    g_dogChildPartMatrix.set(g_dogParentJointMatrix);
    g_dogChildPartMatrix.translate(0,0.1,0.3).rotate(g_tailAngle,1,0,0).rotate(-30,1,0,0).scale(0.05,0.3,0.05);
    g_dogTailCylinder.matrix.set(g_dogChildPartMatrix);
    g_dogTailCylinder.render(gl);

    let legAttachmentBase = new Matrix4(g_dogParentJointMatrix);
    let currentLegMatrix = new Matrix4();

    // Front Left Leg
    currentLegMatrix.set(legAttachmentBase).translate(-0.25, -0.05, -0.2).rotate(g_frontLegAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(currentLegMatrix).scale(0.1, 0.3, 0.1);
    g_dogLegPartCube.drawCube(gl, g_dogChildPartMatrix, legColor);
    currentLegMatrix.translate(0, -0.3, 0).rotate(g_pawAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(currentLegMatrix).scale(0.08, 0.3, 0.08);
    g_dogLegPartCube.drawCube(gl, g_dogChildPartMatrix, legColor);
    g_dogChildPartMatrix.set(currentLegMatrix).translate(0, -0.3, 0.02).rotate(g_pawRotateAngle, 1, 0, 0).scale(0.1, 0.05, 0.12);
    g_dogPawCube.drawCube(gl, g_dogChildPartMatrix, pawColor);

    // Front Right Leg
    currentLegMatrix.set(legAttachmentBase).translate(0.25, -0.05, -0.2).rotate(g_frontRightLegAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(currentLegMatrix).scale(0.1, 0.3, 0.1);
    g_dogLegPartCube.drawCube(gl, g_dogChildPartMatrix, legColor);
    currentLegMatrix.translate(0, -0.3, 0).rotate(g_frontRightPawAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(currentLegMatrix).scale(0.08, 0.3, 0.08);
    g_dogLegPartCube.drawCube(gl, g_dogChildPartMatrix, legColor);
    g_dogChildPartMatrix.set(currentLegMatrix).translate(0, -0.3, 0.02).rotate(g_pawRotateAngle, 1, 0, 0).scale(0.1, 0.05, 0.12);
    g_dogPawCube.drawCube(gl, g_dogChildPartMatrix, pawColor);

    // Back Left Leg
    currentLegMatrix.set(legAttachmentBase).translate(-0.25, -0.05, 0.2).rotate(g_backLeftLegAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(currentLegMatrix).scale(0.1, 0.3, 0.1);
    g_dogLegPartCube.drawCube(gl, g_dogChildPartMatrix, legColor);
    currentLegMatrix.translate(0, -0.3, 0).rotate(g_backLeftPawAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(currentLegMatrix).scale(0.08, 0.3, 0.08);
    g_dogLegPartCube.drawCube(gl, g_dogChildPartMatrix, legColor);
    g_dogChildPartMatrix.set(currentLegMatrix).translate(0, -0.3, 0.02).rotate(g_pawRotateAngle, 1, 0, 0).scale(0.1, 0.05, 0.12);
    g_dogPawCube.drawCube(gl, g_dogChildPartMatrix, pawColor);

    // Back Right Leg
    currentLegMatrix.set(legAttachmentBase).translate(0.25, -0.05, 0.2).rotate(g_backRightLegAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(currentLegMatrix).scale(0.1, 0.3, 0.1);
    g_dogLegPartCube.drawCube(gl, g_dogChildPartMatrix, legColor);
    currentLegMatrix.translate(0, -0.3, 0).rotate(g_backRightPawAngle, 1, 0, 0);
    g_dogChildPartMatrix.set(currentLegMatrix).scale(0.08, 0.3, 0.08);
    g_dogLegPartCube.drawCube(gl, g_dogChildPartMatrix, legColor);
    g_dogChildPartMatrix.set(currentLegMatrix).translate(0, -0.3, 0.02).rotate(g_pawRotateAngle, 1, 0, 0).scale(0.1, 0.05, 0.12);
    g_dogPawCube.drawCube(gl, g_dogChildPartMatrix, pawColor);
}