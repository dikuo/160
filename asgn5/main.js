import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import GUI from 'lil-gui';

let scene, camera, renderer, controls;
let animatedCube;
let spinningCylinder;
let ambientLight, directionalLight;
let pointLights = [];
let torches = []; 
let fallingDebris = [];

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const basePath = 'assets/models/dungeon_modules/';

// --- Constants for object heights
const PEDESTAL_GLB_HEIGHT = 0.8; 
const TABLE_BIG_GLB_HEIGHT = 0.7;  
const TORCH_FLAME_Y_OFFSET = 0.6; 

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x282c34);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 16); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    addControls();
    addLights();
    setupGUI();
    addSkybox();
    loadCustomModels();
    addPrimitives();

    // const axesHelper = new THREE.AxesHelper(5);
    // axesHelper.position.y = 0.01;
    // scene.add(axesHelper);

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function addControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 60;
    controls.target.set(0, 1.5, 0); 
    controls.maxPolarAngle = Math.PI / 2.2;
}

function addLights() {
    ambientLight = new THREE.AmbientLight(0x707080, 1.3);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xa0a0b0, 0.8);
    directionalLight.position.set(15, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 70;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.bias = -0.002;
    scene.add(directionalLight);

    function createDungeonPointLight(x, y, z, color = 0xffaa55, intensity = 2.8, distance = 15, castShadow = true) {
        const pointLight = new THREE.PointLight(color, intensity, distance);
        pointLight.position.set(x, y, z);
        pointLight.castShadow = castShadow;
        if (castShadow) {
            pointLight.shadow.mapSize.width = 256;
            pointLight.shadow.mapSize.height = 256;
            pointLight.shadow.bias = -0.05;
            pointLight.shadow.camera.near = 0.1;
            pointLight.shadow.camera.far = distance;
        }
        scene.add(pointLight);
        pointLights.push(pointLight);
        return pointLight;
    }
    createDungeonPointLight(0, 3.5, 7); 
    createDungeonPointLight(0, 4, 0);     
    createDungeonPointLight(-6, 3.0, 0, 0xffaa66, 1.5, 12); 
    createDungeonPointLight(6, 3.0, 0, 0xffcc88, 2.0, 12);  
    createDungeonPointLight(0, 3.0, -6, 0x6666ff, 1.0, 15); 
}

function setupGUI() {
    const gui = new GUI();
    const lightFolder = gui.addFolder('Lighting');
    lightFolder.addColor(ambientLight, 'color').name('Ambient Color');
    lightFolder.add(ambientLight, 'intensity', 0, 3, 0.01).name('Ambient Intensity');
    
    const dirLightFolder = lightFolder.addFolder('Directional Light');
    dirLightFolder.addColor(directionalLight, 'color').name('Color');
    dirLightFolder.add(directionalLight, 'intensity', 0, 3, 0.01).name('Intensity');
    dirLightFolder.add(directionalLight.position, 'x', -50, 50, 0.1).name('Pos X');
    dirLightFolder.add(directionalLight.position, 'y', 0, 50, 0.1).name('Pos Y');
    dirLightFolder.add(directionalLight.position, 'z', -50, 50, 0.1).name('Pos Z');
    
    lightFolder.add(renderer, 'toneMappingExposure', 0, 2, 0.01).name('Exposure');

    if (pointLights.length > 0) {
        const pLightFolder = lightFolder.addFolder(`PtLight 0 (${pointLights[0].position.toArray().map(p=>p.toFixed(1)).join(',')})`);
        pLightFolder.addColor(pointLights[0], 'color').name('Color');
        pLightFolder.add(pointLights[0], 'intensity', 0, 5, 0.01).name('Intensity');
        pLightFolder.add(pointLights[0], 'distance', 0, 50, 0.1).name('Distance');
        pLightFolder.add(pointLights[0].position, 'x', -15, 15, 0.1).name('Pos X');
        pLightFolder.add(pointLights[0].position, 'y', 0, 10, 0.1).name('Pos Y');
        pLightFolder.add(pointLights[0].position, 'z', -15, 15, 0.1).name('Pos Z');
    }
    lightFolder.open();
}

function addSkybox() {
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('assets/textures/skybox/');
    const textureCube = loader.load([
        'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg'
    ], 
    () => {
        scene.background = textureCube;
        scene.environment = textureCube;
        console.log("Skybox textures loaded and applied.");
    }, 
    undefined, 
    (err) => {
        console.error("Error loading skybox textures:", err);
    });
}

function loadGLBModel(filePath, position, rotation = new THREE.Euler(), scale = new THREE.Vector3(1,1,1)) {
    if (!filePath || filePath.includes('undefined') || filePath.includes('null') || filePath === basePath) {
        return;
    }
    gltfLoader.load(
        filePath,
        (gltf) => {
            const model = gltf.scene.clone();
            model.position.copy(position);
            model.rotation.copy(rotation);
            model.scale.copy(scale);
            model.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            scene.add(model);
        },
        undefined,
        (error) => {
            console.error(`ERROR loading ${filePath.substring(filePath.lastIndexOf('/') + 1)} from ${filePath}:`, error);
        }
    );
}

function createTorchFlame(torchWorldPosition) {
    const flameGeo = new THREE.ConeGeometry(0.08, 0.25, 8); 
    const flameMat = new THREE.MeshStandardMaterial({ 
        color: 0xffa000,
        emissive: 0xff6000,
        emissiveIntensity: 2.0
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    
    flame.position.copy(torchWorldPosition).add(new THREE.Vector3(0, TORCH_FLAME_Y_OFFSET, 0)); 
                                                                                            
    flame.castShadow = false; 
    flame.receiveShadow = false;
    scene.add(flame);

    flame.userData.flickerBaseScale = Math.random() * 0.15 + 0.85; 
    flame.userData.flickerSpeed = Math.random() * 6 + 10;       
    flame.userData.flickerAmount = Math.random() * 0.4 + 0.2;  
    flame.userData.intensityBase = 1.5 + Math.random() * 1.0;    
    flame.userData.intensityFlicker = 0.8 + Math.random() * 0.7; 
    
    torches.push(flame);
}


function loadCustomModels() {
    const modelFilePaths = { 
        floor_tile: basePath + 'Floor Tile.glb',
        wall_modular: basePath + 'Wall Modular.glb',
        arch_door: basePath + 'Arch Door.glb',
        arch_internal: basePath + 'Arch.glb',
        column: basePath + 'Column.glb',
        pedestal: basePath + 'Pedestal.glb',
        torch: basePath + 'Torch.glb',
        small_table: basePath + 'Small Table.glb',
        table_big: basePath + 'Table Big.glb',
        chair: basePath + 'Chair.glb',
        banner: basePath + 'Banner.glb',
        banner_wall: basePath + 'Banner Wall.glb',
        bucket: basePath + 'Bucket.glb',
        bricks: basePath + 'Bricks.glb',
        trap_door: basePath + 'Trap Door.glb',
        barrel: basePath + 'Barrel.glb',
        cobweb: basePath + 'Cobweb.glb',
        skull: basePath + 'Skull.glb',
        coin_piles: basePath + 'Coin Piles.glb',
        sword_wall_mount: basePath + 'Sword Wall Mount.glb',
        coin_bag: basePath + 'Coin Bag.glb',
        crate: basePath + 'Crate.glb',
        horse_statue: basePath + 'Horse Statue.glb',
        chest: basePath + 'Chest.glb',
        chest_gold: basePath + 'Chest with Gold.glb'
    };
    const getModel = (type) => modelFilePaths[type] || null;

    const U = 2; const H = U / 2;
    const R0 = 0; const R90 = Math.PI / 2; const R180 = Math.PI; const R270 = -Math.PI / 2;

    const wallYScaleFactor = 2;
    const wallScale = new THREE.Vector3(1.05, wallYScaleFactor, 1); 
    const wallYPosition = (U/2) * wallYScaleFactor; 

    const archDoorScale = new THREE.Vector3(2.1, wallYScaleFactor * 1.1, 1); 
    const archInternalScale = new THREE.Vector3(1.2, wallYScaleFactor * 1.0, 1); 
    const archYPosition = 0; 

    console.log(`Loading dungeon: U=2, Wall Y Pos=${wallYPosition}, Wall Scale Y=${wallScale.y}`);

    for (let i = -3; i <= 4; i++) {
        for (let j = -3; j <= 4; j++) {
            loadGLBModel(getModel('floor_tile'), new THREE.Vector3(i * U - H, 0, j * U - H));
        }
    }

    const edgePos = 4 * U;
    for (let i = -3; i <= 4; i++) {
        loadGLBModel(getModel('wall_modular'), new THREE.Vector3(i * U - H, wallYPosition, -edgePos), new THREE.Euler(0, R0, 0), wallScale); 
        if (i === 0) { 
            loadGLBModel(getModel('arch_door'), new THREE.Vector3(0, archYPosition, edgePos), new THREE.Euler(0, R180, 0), archDoorScale);
        } else if (i === 1 && getModel('arch_door')) {
            // Slot covered
        } else { 
             loadGLBModel(getModel('wall_modular'), new THREE.Vector3(i * U - H, wallYPosition, edgePos), new THREE.Euler(0, R180, 0), wallScale);
        }
    }
     for (let j = -3; j <= 4; j++) {
        loadGLBModel(getModel('wall_modular'), new THREE.Vector3(-edgePos, wallYPosition, j * U - H), new THREE.Euler(0, R90, 0), wallScale);
        loadGLBModel(getModel('wall_modular'), new THREE.Vector3(edgePos, wallYPosition, j * U - H), new THREE.Euler(0, R270, 0), wallScale);
    }

    const statueXOffset = U;    
    const statueZ = edgePos - U*1.2; 
    const archFocusPoint = new THREE.Vector3(0, H * archDoorScale.y * 0.3, edgePos); 

    const statueLPos = new THREE.Vector3(-statueXOffset, 0, statueZ);
    loadGLBModel(getModel('pedestal'), statueLPos.clone());
    loadGLBModel(getModel('horse_statue'), statueLPos.clone(), 0);

    const statueRPos = new THREE.Vector3(statueXOffset, 0, statueZ);
    loadGLBModel(getModel('pedestal'), statueRPos.clone());
    loadGLBModel(getModel('horse_statue'), statueRPos.clone(), 0);

    const ghXMin = -2*U; const ghXMax = 2*U; const ghZMin = -2*U; const ghZMax = 2*U;
    loadGLBModel(getModel('column'), new THREE.Vector3(-U - H, 0, -U - H));
    loadGLBModel(getModel('column'), new THREE.Vector3(U + H, 0, -U - H));
    loadGLBModel(getModel('column'), new THREE.Vector3(-U - H, 0, U + H));
    loadGLBModel(getModel('column'), new THREE.Vector3(U + H, 0, U + H));

    const bannerY = wallYPosition + (U * wallScale.y * 0.2); 
    loadGLBModel(getModel('banner_wall'), new THREE.Vector3(ghXMin + H, bannerY, ghZMax), new THREE.Euler(0, R0, 0));
    loadGLBModel(getModel('banner_wall'), new THREE.Vector3(ghXMax - H, bannerY, ghZMax), new THREE.Euler(0, R0, 0));
    loadGLBModel(getModel('banner_wall'), new THREE.Vector3(ghXMin + H, bannerY, ghZMin), new THREE.Euler(0, R180, 0));
    loadGLBModel(getModel('banner_wall'), new THREE.Vector3(ghXMax - H, bannerY, ghZMin), new THREE.Euler(0, R180, 0));

    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(ghXMin + H, wallYPosition, ghZMin), new THREE.Euler(0,R0,0), wallScale);
    loadGLBModel(getModel('arch_internal'), new THREE.Vector3(0, archYPosition, ghZMin), new THREE.Euler(0,R0,0), archInternalScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(ghXMax - H, wallYPosition, ghZMin), new THREE.Euler(0,R0,0), wallScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(ghXMin, wallYPosition, ghZMin + H), new THREE.Euler(0,R90,0), wallScale);
    loadGLBModel(getModel('arch_internal'), new THREE.Vector3(ghXMin, archYPosition, 0), new THREE.Euler(0,R90,0), archInternalScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(ghXMin, wallYPosition, ghZMax - H), new THREE.Euler(0,R90,0), wallScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(ghXMax, wallYPosition, ghZMin + H), new THREE.Euler(0,R270,0), wallScale);
    loadGLBModel(getModel('arch_internal'), new THREE.Vector3(ghXMax, archYPosition, 0), new THREE.Euler(0,R270,0), archInternalScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(ghXMax, wallYPosition, ghZMax - H), new THREE.Euler(0,R270,0), wallScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(ghXMin+H, wallYPosition, ghZMax), new THREE.Euler(0,R180,0), wallScale);
    loadGLBModel(getModel('arch_internal'), new THREE.Vector3(0, archYPosition, ghZMax), new THREE.Euler(0,R180,0), archInternalScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(ghXMax-H, wallYPosition, ghZMax), new THREE.Euler(0,R180,0), wallScale);

    const guardX = ghXMin - U; const guardZ = 0;
    const generalTorchY = wallYPosition + H * wallScale.y * 0.5; // Adjusted default torch height for new wall base
    const wallMountY = wallYPosition + H * wallScale.y * 0.3;
    const cobwebY = wallYPosition + H * wallScale.y * 0.9;

    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(guardX, wallYPosition, guardZ + H), new THREE.Euler(0,R0,0), wallScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(guardX, wallYPosition, guardZ - H), new THREE.Euler(0,R0,0), wallScale);
    loadGLBModel(getModel('small_table'), new THREE.Vector3(guardX, 0, guardZ));
    loadGLBModel(getModel('chair'), new THREE.Vector3(guardX, 0, guardZ+1));
    loadGLBModel(getModel('barrel'), new THREE.Vector3(guardX - H, 0, guardZ + H));
    loadGLBModel(getModel('crate'), new THREE.Vector3(guardX + H, 0, guardZ - H));
    loadGLBModel(getModel('sword_wall_mount'), new THREE.Vector3(-edgePos + 0.2, wallMountY, guardZ), new THREE.Euler(0,R90,0));
    let torchPosGuard = new THREE.Vector3(guardX, generalTorchY, guardZ + U - 0.2);
    loadGLBModel(getModel('torch'), torchPosGuard); createTorchFlame(torchPosGuard);

    const cryptX = ghXMax + U; const cryptZ = 0;
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(cryptX, wallYPosition, cryptZ + H), new THREE.Euler(0,R0,0), wallScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(cryptX, wallYPosition, cryptZ - H), new THREE.Euler(0,R0,0), wallScale);
    loadGLBModel(getModel('trap_door'), new THREE.Vector3(cryptX, 0, cryptZ + H*0.5)); // Y=0
    loadGLBModel(getModel('cobweb'), new THREE.Vector3(edgePos-0.2, cobwebY, cryptZ + U - H), new THREE.Euler(0,R270,0));
    loadGLBModel(getModel('bricks'), new THREE.Vector3(cryptX + H, 0, cryptZ));
    loadGLBModel(getModel('skull'), new THREE.Vector3(cryptX - H, 0, cryptZ - H)); // Y=0
    loadGLBModel(getModel('table_big'), new THREE.Vector3(cryptX, 0, cryptZ - H));

    const treaX = 0; const treaZ = ghZMin - U;
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(treaX - H, wallYPosition, treaZ), new THREE.Euler(0,R90,0), wallScale);
    loadGLBModel(getModel('wall_modular'), new THREE.Vector3(treaX + H, wallYPosition, treaZ), new THREE.Euler(0,R270,0), wallScale);
    loadGLBModel(getModel('chest_gold'), new THREE.Vector3(treaX, 0, treaZ));
    loadGLBModel(getModel('coin_piles'), new THREE.Vector3(treaX + H -0.5, 0, treaZ));
    loadGLBModel(getModel('pedestal'), new THREE.Vector3(treaX - H + 0.5, 0, treaZ));
    let torchPosTrea = new THREE.Vector3(treaX, generalTorchY, -edgePos + 0.2);
    loadGLBModel(getModel('torch'), torchPosTrea, new THREE.Euler(0, R180,0)); createTorchFlame(torchPosTrea);
    
    let torchPosGH1 = new THREE.Vector3(0, generalTorchY, 3.5*U);
    loadGLBModel(getModel('torch'), torchPosGH1, new THREE.Euler(0,R180,0)); createTorchFlame(torchPosGH1);
    let torchPosGH2 = new THREE.Vector3(ghXMin + H, generalTorchY, 0);
    loadGLBModel(getModel('torch'), torchPosGH2, new THREE.Euler(0,R90,0)); createTorchFlame(torchPosGH2);
    let torchPosGH3 = new THREE.Vector3(ghXMax - H, generalTorchY, 0);
    loadGLBModel(getModel('torch'), torchPosGH3, new THREE.Euler(0,R270,0)); createTorchFlame(torchPosGH3);

    console.log("Dungeon model loading complete with Y adjustments and new horse rotation.");
}


function addPrimitives() {
    console.log("Adding primitives, adjusting Y for props on GLBs...");
    const U = 2; const H = U / 2;
    const wallScaledHeight = U * 2; 

    const animatedCube_targetX = -H + 0.5;
    const animatedCube_targetZ = -2*U - U; 
    const cubeSize = 0.5;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    animatedCube = new THREE.Mesh(cubeGeo, new THREE.MeshStandardMaterial({ color: 0xffe740, emissive: 0xddbb00, roughness: 0.1, metalness: 0.7 }));
    animatedCube.position.set(animatedCube_targetX, PEDESTAL_GLB_HEIGHT + (cubeSize/2), animatedCube_targetZ);
    animatedCube.castShadow = true; animatedCube.receiveShadow = true; scene.add(animatedCube);

    const texturedSphere_targetX = 2*U + U;
    const texturedSphere_targetZ = 0 - H;   
    const sphereRadius = 0.4;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 16);
    const sphereTex = textureLoader.load('assets/textures/rock_texture.jpg');
    const sphereMat = new THREE.MeshStandardMaterial({ map: sphereTex, roughness: 0.5, emissive:0x111133, emissiveIntensity:0.5 });
    const texturedSphere = new THREE.Mesh(sphereGeo, sphereMat);
    texturedSphere.position.set(texturedSphere_targetX, TABLE_BIG_GLB_HEIGHT + sphereRadius, texturedSphere_targetZ);
    texturedSphere.castShadow = true; texturedSphere.receiveShadow = true; scene.add(texturedSphere);

    const cylinderPrismHeight = wallScaledHeight * 0.5; 
    const cylinderGeo = new THREE.CylinderGeometry(0.2, 0.2, cylinderPrismHeight, 8); 
    const cylinderMat = new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.7, roughness: 0.3 });
    spinningCylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
    spinningCylinder.position.set(-U-H, cylinderPrismHeight/2 , U+H);
    spinningCylinder.castShadow = true; spinningCylinder.receiveShadow = true; scene.add(spinningCylinder);
    
    function createFlatRubble(baseX, baseZ, count = 5, areaSize = 1.5) {
        for (let i = 0; i < count; i++) {
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0x454545, roughness: 0.9 });
            const w = Math.random()*0.4+0.1; const d = Math.random()*0.4+0.1; const h = Math.random()*0.08+0.02;
            const stoneMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat);
            stoneMesh.position.set(baseX + (Math.random()-0.5)*areaSize, h/2 + 0.01, baseZ + (Math.random()-0.5)*areaSize);
            stoneMesh.rotation.y = Math.random()*Math.PI;
            stoneMesh.castShadow = true; stoneMesh.receiveShadow = true; scene.add(stoneMesh);
        }
    }
    createFlatRubble(-3*U, -3*U, 7);
    createFlatRubble(3*U, 3*U, 7);

    const beamMat = new THREE.MeshStandardMaterial({color: 0x5c3a21, roughness:0.8});
    for (let i=0; i < 6; i++) {
        const beamHeight = (Math.random()*0.8 + 0.3) * wallScaledHeight; 
        const beamGeo = new THREE.BoxGeometry(0.15, beamHeight, 0.15);
        const beam = new THREE.Mesh(beamGeo, beamMat);
        const xPos = (Math.random()>0.5 ? -3.8*U : 3.8*U) + (Math.random()-0.5)*(U/4); 
        const zPos = (Math.random()-0.5) * 3.5*U; 
        beam.position.set(xPos, beam.geometry.parameters.height/2 + 0.01, zPos);
        beam.rotation.y = Math.random()*Math.PI; 
        beam.rotation.z = (Math.random()-0.5)*0.5; 
        beam.castShadow = true; scene.add(beam);
    }
    console.log("Primitives added.");
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); 
    const elapsedTime = clock.getElapsedTime();

    if (controls.update) controls.update(delta);

    if (animatedCube) {
        animatedCube.rotation.x += 0.5 * delta; 
        animatedCube.rotation.y += 0.8 * delta;
    }
    if (spinningCylinder) {
        spinningCylinder.rotation.y += 1.0 * delta;
    }

    if (torches.length > 0) {
        torches.forEach(flame => {
            const scaleVariation = Math.sin(elapsedTime * flame.userData.flickerSpeed) * flame.userData.flickerAmount;
            const currentScale = flame.userData.flickerBaseScale + scaleVariation;
            flame.scale.set(currentScale, currentScale, currentScale);

            const intensityVariation = Math.sin(elapsedTime * flame.userData.flickerSpeed * 1.3 + 1) * flame.userData.intensityFlicker;
            flame.material.emissiveIntensity = flame.userData.intensityBase + intensityVariation;
        });
    }

    if (fallingDebris.length > 0) { // Ensure fallingDebris is defined and populated
        const wallScaledHeight = 2 * 2; // U * wallYScaleFactor
        fallingDebris.forEach(debris => {
            if (debris && debris.userData) { // Check if debris and userData exist
                 // Ensure velocity is a number, default to a small downward if not
                let velocity = typeof debris.userData.velocity === 'number' ? debris.userData.velocity : -0.2;

                debris.position.y += velocity * (delta*60); 
                debris.rotation.x += (Math.random() * 0.5 - 0.25) * delta; // Slower, more random rotation
                debris.rotation.y += (Math.random() * 0.5 - 0.25) * delta;
                if (debris.position.y < -1) { 
                    debris.position.y = wallScaledHeight + Math.random() * 2 + 2; // Reset higher up
                    debris.position.x = (Math.random() - 0.5) * (3.5*2*2); // (3.5*U*2)
                    debris.position.z = (Math.random() - 0.5) * (3.5*2*2);
                    debris.userData.velocity = - (Math.random() * 0.5 + 0.2); // Re-assign velocity as number
                }
            }
        });
    }


    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();