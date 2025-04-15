import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// DOM elements
const animationContainer = document.getElementById('animation-container');
const playPauseButton = document.getElementById('play-pause');
const restartButton = document.getElementById('restart');
const cycleCount = document.getElementById('cycle-count');
const stepName = document.getElementById('step-name');
const temperature = document.getElementById('temperature');
const currentStepTitle = document.getElementById('current-step-title');
const stepDescription = document.getElementById('step-description');

// Animation state
let isPlaying = true;
let currentCycle = 1;
let currentStep = 'denaturation'; // denaturation, annealing, extension
let animationTime = 0;
const cycleSteps = ['denaturation', 'annealing', 'extension'];
const stepDuration = 5; // seconds per step
const totalCycles = 3;

// PCR process information
const stepInfo = {
    denaturation: {
        title: 'דנטורציה',
        description: 'חימום התגובה ל-95°C מפריד את תבנית ה-DNA הדו-גדילית לגדילים בודדים.',
        temperature: '95°C',
    },
    annealing: {
        title: 'היצמדות',
        description: 'קירור ל-55-65°C מאפשר לפריימרים (מקטעי DNA קצרים) להיקשר לרצפים המשלימים על תבניות ה-DNA החד-גדיליות.',
        temperature: '60°C',
    },
    extension: {
        title: 'הארכה',
        description: 'בטמפרטורה של 72°C, אנזים DNA פולימראז מאריך את הפריימרים על ידי הוספת נוקלאוטידים (dNTPs) ליצירת גדילי DNA חדשים המשלימים לתבניות.',
        temperature: '72°C',
    }
};

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121212);

const camera = new THREE.PerspectiveCamera(75, animationContainer.clientWidth / animationContainer.clientHeight, 0.1, 1000);
camera.position.z = 30;

// WebGL renderer for 3D objects
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(animationContainer.clientWidth, animationContainer.clientHeight);
animationContainer.appendChild(renderer.domElement);

// Function to create a 3D text label
function createLabel(text, position, parent) {
    // Create a canvas texture for the label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;

    // Make canvas transparent
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Add text with shadow for better visibility
    context.font = 'bold 40px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Add shadow for better visibility against any background
    context.shadowColor = 'black';
    context.shadowBlur = 7;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;

    // Draw text
    context.fillStyle = 'white';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Create a plane with the texture
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false // Make sure labels are always visible
    });
    const geometry = new THREE.PlaneGeometry(4, 2);
    const label = new THREE.Mesh(geometry, material);

    // Position the label
    label.position.copy(position);

    // Make label always face the camera
    label.userData.isLabel = true;

    // Add to parent
    parent.add(label);

    return label;
}

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create DNA components
const dnaGroup = new THREE.Group();
scene.add(dnaGroup);

// Colors
const colors = {
    dnaBackbone1: 0x3498db, // blue
    dnaBackbone2: 0xe74c3c, // red
    adenine: 0x2ecc71,     // green
    thymine: 0xf1c40f,     // yellow
    cytosine: 0x9b59b6,    // purple
    guanine: 0xe67e22,     // orange
    primer: 0x1abc9c,      // teal
    polymerase: 0xecf0f1,  // light gray
    nucleotides: 0x95a5a6  // gray
};

// Create DNA double helix
function createDNADoubleHelix() {
    const dnaLength = 20;
    const dnaRadius = 2;
    const nucleotidesPerTurn = 10;
    const backboneRadius = 0.3;
    const nucleotideRadius = 0.4;

    const backboneMaterial1 = new THREE.MeshPhongMaterial({ color: colors.dnaBackbone1 });
    const backboneMaterial2 = new THREE.MeshPhongMaterial({ color: colors.dnaBackbone2 });

    const nucleotideMaterials = [
        new THREE.MeshPhongMaterial({ color: colors.adenine }),
        new THREE.MeshPhongMaterial({ color: colors.thymine }),
        new THREE.MeshPhongMaterial({ color: colors.cytosine }),
        new THREE.MeshPhongMaterial({ color: colors.guanine })
    ];

    const backboneGeometry = new THREE.SphereGeometry(backboneRadius, 16, 16);
    const nucleotideGeometry = new THREE.SphereGeometry(nucleotideRadius, 16, 16);
    const connectionGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);

    const dna = new THREE.Group();

    // Create the double helix
    for (let i = 0; i < dnaLength; i++) {
        const angle = (i / nucleotidesPerTurn) * Math.PI * 2;
        const y = i - dnaLength / 2;

        // First strand backbone
        const backbone1 = new THREE.Mesh(backboneGeometry, backboneMaterial1);
        backbone1.position.set(
            Math.cos(angle) * dnaRadius,
            y,
            Math.sin(angle) * dnaRadius
        );
        dna.add(backbone1);

        // Second strand backbone (opposite side)
        const backbone2 = new THREE.Mesh(backboneGeometry, backboneMaterial2);
        backbone2.position.set(
            Math.cos(angle + Math.PI) * dnaRadius,
            y,
            Math.sin(angle + Math.PI) * dnaRadius
        );
        dna.add(backbone2);

        // Nucleotides and connections (base pairs)
        if (i < dnaLength - 1) {
            // Random nucleotide pair (complementary)
            const nucleotideIndex = Math.floor(Math.random() * 4);
            const complementaryIndex = nucleotideIndex % 2 === 0 ? nucleotideIndex + 1 : nucleotideIndex - 1;

            const nucleotide1 = new THREE.Mesh(nucleotideGeometry, nucleotideMaterials[nucleotideIndex]);
            nucleotide1.position.set(
                Math.cos(angle) * (dnaRadius - 1),
                y,
                Math.sin(angle) * (dnaRadius - 1)
            );
            dna.add(nucleotide1);

            const nucleotide2 = new THREE.Mesh(nucleotideGeometry, nucleotideMaterials[complementaryIndex]);
            nucleotide2.position.set(
                Math.cos(angle + Math.PI) * (dnaRadius - 1),
                y,
                Math.sin(angle + Math.PI) * (dnaRadius - 1)
            );
            dna.add(nucleotide2);

            // Connection between nucleotides
            const connection = new THREE.Mesh(connectionGeometry, new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
            connection.position.set(
                (nucleotide1.position.x + nucleotide2.position.x) / 2,
                y,
                (nucleotide1.position.z + nucleotide2.position.z) / 2
            );

            // Rotate to connect the nucleotides
            connection.lookAt(nucleotide2.position);
            connection.scale.y = nucleotide1.position.distanceTo(nucleotide2.position);

            dna.add(connection);
        }
    }

    return dna;
}

// Create DNA polymerase enzyme
function createPolymerase() {
    const polymeraseGroup = new THREE.Group();

    // Main body
    const bodyGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    bodyGeometry.scale(1, 0.8, 1.2);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: colors.polymerase,
        specular: 0x111111,
        shininess: 30
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    polymeraseGroup.add(body);

    // Active site (cavity)
    const cavityGeometry = new THREE.SphereGeometry(0.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cavityMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
    });
    const cavity = new THREE.Mesh(cavityGeometry, cavityMaterial);
    cavity.rotation.x = Math.PI;
    cavity.position.set(0, -0.5, 1);
    polymeraseGroup.add(cavity);

    // Add some details to make it look more enzyme-like
    const detailGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const detailMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });

    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const detail = new THREE.Mesh(detailGeometry, detailMaterial);
        detail.position.set(
            Math.cos(angle) * 1.4,
            Math.sin(angle) * 1.4,
            0.8
        );
        polymeraseGroup.add(detail);
    }

    polymeraseGroup.scale.set(0.8, 0.8, 0.8);
    polymeraseGroup.visible = false; // Initially hidden

    return polymeraseGroup;
}

// Create primers
function createPrimer(length, position) {
    const primerGroup = new THREE.Group();

    const backboneGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const backboneMaterial = new THREE.MeshPhongMaterial({ color: colors.primer });

    const nucleotideGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const nucleotideMaterial = new THREE.MeshPhongMaterial({ color: 0x1abc9c });

    const connectionGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
    const connectionMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    for (let i = 0; i < length; i++) {
        // Backbone
        const backbone = new THREE.Mesh(backboneGeometry, backboneMaterial);
        backbone.position.set(0, i * 0.8, 0);
        primerGroup.add(backbone);

        // Nucleotide
        const nucleotide = new THREE.Mesh(nucleotideGeometry, nucleotideMaterial);
        nucleotide.position.set(0.5, i * 0.8, 0);
        primerGroup.add(nucleotide);

        // Connection between backbone points
        if (i < length - 1) {
            const connection = new THREE.Mesh(connectionGeometry, connectionMaterial);
            connection.position.set(0, i * 0.8 + 0.4, 0);
            connection.rotation.z = Math.PI / 2;
            connection.scale.y = 0.8;
            primerGroup.add(connection);
        }
    }

    primerGroup.position.copy(position);
    primerGroup.visible = false; // Initially hidden

    return primerGroup;
}

// Create nucleotides (dNTPs)
function createNucleotides(count) {
    const nucleotidesGroup = new THREE.Group();

    const nucleotideGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const nucleotideMaterials = [
        new THREE.MeshPhongMaterial({ color: colors.adenine }),
        new THREE.MeshPhongMaterial({ color: colors.thymine }),
        new THREE.MeshPhongMaterial({ color: colors.cytosine }),
        new THREE.MeshPhongMaterial({ color: colors.guanine })
    ];

    // Create a phosphate group for each nucleotide
    const phosphateGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const phosphateMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    for (let i = 0; i < count; i++) {
        const nucleotideGroup = new THREE.Group();

        // Random position within a volume
        const x = (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 20;

        // Random nucleotide type
        const nucleotideIndex = Math.floor(Math.random() * 4);

        const nucleotide = new THREE.Mesh(nucleotideGeometry, nucleotideMaterials[nucleotideIndex]);
        nucleotideGroup.add(nucleotide);

        // Add phosphate groups
        for (let j = 0; j < 3; j++) {
            const phosphate = new THREE.Mesh(phosphateGeometry, phosphateMaterial);
            phosphate.position.set(
                0.3 + j * 0.2,
                0,
                0
            );
            nucleotideGroup.add(phosphate);
        }

        nucleotideGroup.position.set(x, y, z);
        nucleotidesGroup.add(nucleotideGroup);
    }

    nucleotidesGroup.visible = false; // Initially hidden

    return nucleotidesGroup;
}

// Create all PCR components
const dnaOriginal = createDNADoubleHelix();
dnaGroup.add(dnaOriginal);

// Add label to original DNA
const dnaLabel = createLabel('DNA דו-גדילי', new THREE.Vector3(0, 10, 0), dnaOriginal);

// Create separated strands (for denaturation step)
const strand1 = createDNADoubleHelix();
const strand2 = createDNADoubleHelix();

// Modify strands to represent separated DNA
strand1.traverse(child => {
    if (child.isMesh && child.material.color && child.material.color.getHex() === colors.dnaBackbone2) {
        child.visible = false;
    }
});

strand2.traverse(child => {
    if (child.isMesh && child.material.color && child.material.color.getHex() === colors.dnaBackbone1) {
        child.visible = false;
    }
});

strand1.position.set(-5, 0, 0);
strand2.position.set(5, 0, 0);
strand1.visible = false;
strand2.visible = false;
dnaGroup.add(strand1);
dnaGroup.add(strand2);
// Add labels to separated strands
const strand1Label = createLabel('גדיל DNA', new THREE.Vector3(0, 10, 0), strand1);
const strand2Label = createLabel('גדיל DNA', new THREE.Vector3(0, 10, 0), strand2);

// Create primers
const primer1 = createPrimer(5, new THREE.Vector3(-5, -5, 0));
const primer2 = createPrimer(5, new THREE.Vector3(5, 5, 0));
dnaGroup.add(primer1);
dnaGroup.add(primer2);
// Add labels to primers
const primer1Label = createLabel('פריימר', new THREE.Vector3(0, 5, 0), primer1);
const primer2Label = createLabel('פריימר', new THREE.Vector3(0, 5, 0), primer2);

// Create polymerase enzymes
const polymerase1 = createPolymerase();
const polymerase2 = createPolymerase();
polymerase1.position.set(-5, -3, 0);
polymerase2.position.set(5, 7, 0);
dnaGroup.add(polymerase1);
dnaGroup.add(polymerase2);
// Add labels to polymerase enzymes
const polymerase1Label = createLabel('DNA פולימראז', new THREE.Vector3(0, 2, 0), polymerase1);
const polymerase2Label = createLabel('DNA פולימראז', new THREE.Vector3(0, 2, 0), polymerase2);

// Create nucleotides
const nucleotides = createNucleotides(50);
dnaGroup.add(nucleotides);
// Add labels to specific nucleotides
const nucleotideLabels = [];

// Find two specific nucleotides to label
let labeledCount = 0;
for (let i = 0; i < nucleotides.children.length && labeledCount < 2; i += 10) {
    const nucleotide = nucleotides.children[i];
    const label = createLabel('נוקלאוטידים', new THREE.Vector3(0, 1.5, 0), nucleotide);
    nucleotideLabels.push(label);
    labeledCount++;
}

// Position the nucleotides with labels in more visible locations
if (nucleotideLabels.length >= 2) {
    // Position first labeled nucleotide
    nucleotides.children[0].position.set(-8, 0, 5);

    // Position second labeled nucleotide
    nucleotides.children[10].position.set(8, 0, 5);
}

// Animation functions for each PCR step
function animateDenaturation(time) {
    const progress = Math.min(1, time / stepDuration);

    // Hide original DNA and show separated strands
    dnaOriginal.visible = 1 - progress > 0;
    strand1.visible = progress > 0.5;
    strand2.visible = progress > 0.5;

    // Move strands apart
    const separation = progress * 10;
    strand1.position.x = -separation;
    strand2.position.x = separation;

    // Hide other components
    primer1.visible = false;
    primer2.visible = false;
    polymerase1.visible = false;
    polymerase2.visible = false;
    nucleotides.visible = false;
    // Update label visibility based on component visibility
    dnaLabel.visible = dnaOriginal.visible;
    strand1Label.visible = strand1.visible;
    strand2Label.visible = strand2.visible;
    primer1Label.visible = false;
    primer2Label.visible = false;
    polymerase1Label.visible = false;
    polymerase2Label.visible = false;

    // Hide nucleotide labels
    nucleotideLabels.forEach(label => {
        label.visible = false;
    });

    // Update info
    updateStepInfo('denaturation');
}

function animateAnnealing(time) {
    const progress = Math.min(1, time / stepDuration);

    // Show separated strands
    dnaOriginal.visible = false;
    strand1.visible = true;
    strand2.visible = true;

    // Show primers and animate them attaching to DNA
    primer1.visible = true;
    primer2.visible = true;

    // Move primers to their binding positions
    primer1.position.y = -8 + progress * 3;
    primer2.position.y = 8 - progress * 3;

    // Hide polymerase and nucleotides
    polymerase1.visible = false;
    polymerase2.visible = false;
    nucleotides.visible = progress > 0.7;
    // Update label visibility
    dnaLabel.visible = false;
    strand1Label.visible = true;
    strand2Label.visible = true;
    primer1Label.visible = true;
    primer2Label.visible = true;
    polymerase1Label.visible = false;
    polymerase2Label.visible = false;

    // Show nucleotide labels if nucleotides are visible
    nucleotideLabels.forEach(label => {
        label.visible = progress > 0.7;
    });

    // Update info
    updateStepInfo('annealing');
}

function animateExtension(time) {
    const progress = Math.min(1, time / stepDuration);

    // Show separated strands and primers
    dnaOriginal.visible = false;
    strand1.visible = true;
    strand2.visible = true;
    primer1.visible = true;
    primer2.visible = true;

    // Show polymerase and animate it moving along DNA
    polymerase1.visible = true;
    polymerase2.visible = true;

    polymerase1.position.y = -5 + progress * 10;
    polymerase2.position.y = 5 - progress * 10;

    // Show nucleotides being incorporated
    nucleotides.visible = true;
    nucleotides.children.forEach((nucleotide, i) => {
        // Make some nucleotides move toward the polymerase
        if (i % 5 === 0) {
            const target1 = new THREE.Vector3(polymerase1.position.x, polymerase1.position.y, polymerase1.position.z);
            const target2 = new THREE.Vector3(polymerase2.position.x, polymerase2.position.y, polymerase2.position.z);

            // Choose which polymerase to move toward
            const target = i % 10 === 0 ? target1 : target2;

            nucleotide.position.lerp(target, 0.05);
        }
    });
    // Update label visibility
    dnaLabel.visible = false;
    strand1Label.visible = true;
    strand2Label.visible = true;
    primer1Label.visible = true;
    primer2Label.visible = true;
    polymerase1Label.visible = true;
    polymerase2Label.visible = true;

    // Show nucleotide labels
    nucleotideLabels.forEach(label => {
        label.visible = true;
    });

    // Update info
    updateStepInfo('extension');
}

// Update step information in the UI
function updateStepInfo(step) {
    const info = stepInfo[step];
    currentStepTitle.textContent = info.title;
    stepName.textContent = info.title;
    stepDescription.textContent = info.description;
    temperature.textContent = info.temperature;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = animationContainer.clientWidth / animationContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(animationContainer.clientWidth, animationContainer.clientHeight);
}

globalThis.addEventListener('resize', onWindowResize);

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (isPlaying) {
        animationTime += 0.016; // Approximately 60fps

        // Determine which step we're in based on animation time
        const totalStepTime = stepDuration;
        const cycleTime = totalStepTime * cycleSteps.length;
        const totalTime = cycleTime * totalCycles;

        // Calculate current cycle and step
        const normalizedTime = animationTime % totalTime;
        currentCycle = Math.floor(normalizedTime / cycleTime) + 1;
        const cycleProgress = normalizedTime % cycleTime;
        const currentStepIndex = Math.floor(cycleProgress / totalStepTime);
        currentStep = cycleSteps[currentStepIndex];

        // Time within the current step
        const stepProgress = cycleProgress % totalStepTime;

        // Update UI
        cycleCount.textContent = currentCycle;

        // Animate the current step
        switch (currentStep) {
            case 'denaturation':
                animateDenaturation(stepProgress);
                break;
            case 'annealing':
                animateAnnealing(stepProgress);
                break;
            case 'extension':
                animateExtension(stepProgress);
                break;
        }

        // Rotate the DNA group slowly
        dnaGroup.rotation.y += 0.002;
    }

    // Make labels face the camera
    scene.traverse(function(object) {
        if (object.userData.isLabel) {
            object.lookAt(camera.position);
        }
    });

    // Update controls
    controls.update();

    renderer.render(scene, camera);
}

// Event listeners for controls
playPauseButton.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playPauseButton.textContent = isPlaying ? 'השהה' : 'הפעל';
});

restartButton.addEventListener('click', () => {
    animationTime = 0;
    currentCycle = 1;
    currentStep = 'denaturation';

    // Reset the scene
    dnaOriginal.visible = true;
    strand1.visible = false;
    strand2.visible = false;
    primer1.visible = false;
    primer2.visible = false;
    polymerase1.visible = false;
    polymerase2.visible = false;
    nucleotides.visible = false;
    // Reset label visibility
    dnaLabel.visible = true;
    strand1Label.visible = false;
    strand2Label.visible = false;
    primer1Label.visible = false;
    primer2Label.visible = false;
    polymerase1Label.visible = false;
    polymerase2Label.visible = false;

    // Hide nucleotide labels
    nucleotideLabels.forEach(label => {
        label.visible = false;
    });

    // Reset positions
    strand1.position.x = -5;
    strand2.position.x = 5;
    primer1.position.y = -8;
    primer2.position.y = 8;
    polymerase1.position.y = -5;
    polymerase2.position.y = 5;

    // Update UI
    cycleCount.textContent = currentCycle;
    updateStepInfo('denaturation');

    // Ensure animation is playing
    isPlaying = true;
    playPauseButton.textContent = 'השהה';
});

// Start the animation
animate();
