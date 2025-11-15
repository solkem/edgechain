import * as THREE from "three";
import { useEffect } from "react";

function Hero() {
  useEffect(() => {
    const canvas = document.querySelector("canvas.webgl");
    const scene = new THREE.Scene();

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const geomtery = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial();
    material.roughness = 0.2;
    material.metalness = 0.8;

    //? meshes
    const box = new THREE.Mesh(geomtery, material);
    box.position.y = -1
    scene.add(box);

    const light = new THREE.PointLight(0xffffff, 2);
    light.position.y = 3;
    light.distance = 6;
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.y = 3;
    directionalLight.position.x = -3;
    directionalLight.position.z = -1;
    scene.add(directionalLight);

    //? particles
    const pointMaterial = new THREE.PointsMaterial({opacity:0.4});
    const pointGeomtery = new THREE.BufferGeometry();
    const count = 500;
    let positions = new Float32Array(count * 3);
    let opacities = new Float32Array(count);
    const offsets = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 4; // Use full range for complete coverage
      const scale = 2;

      // Lemniscate of Bernoulli (infinity symbol) formula
      const baseX = (scale * Math.cos(t)) / (2 + Math.sin(t) * Math.sin(t));
      const baseY =
        (scale * Math.sin(t) * Math.cos(t)) / (2 + Math.sin(t) * Math.sin(t));

      // Add random offsets for separation
      offsets[i * 3] = ((Math.random() - 0.5) * 1) / 5; // x offset
      offsets[i * 3 + 1] = ((Math.random() - 0.5) * 1) / 5; // y offset
      offsets[i * 3 + 2] = Math.random() - 1; // z offset

      positions[i * 3] = baseX + offsets[i * 3];
      positions[i * 3 + 1] = baseY + offsets[i * 3 + 1];
      positions[i * 3 + 2] = offsets[i * 3 + 2];

      opacities[i * 3] = 1;
    }

    pointGeomtery.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    pointGeomtery.setAttribute(
      "alpha",
      new THREE.BufferAttribute(opacities, 1)
    );

    pointMaterial.size = 0.04;
    pointMaterial.transparent = true;
    pointMaterial.depthWrite = false;
    pointMaterial.color = new THREE.Color(0x0000ff);

    const particles = new THREE.Points(pointGeomtery, pointMaterial);
    scene.add(particles);
    particles.position.y = -1

    //? camera
    const camera = new THREE.PerspectiveCamera(
      75,
      sizes.width / sizes.height,
      0.01,
      100
    );
    camera.position.z = 3;
    scene.add(camera);

    //? renderer
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // OrbitControls
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableDamping = true; // smooth camera motion

    // Resize handler
    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("resize", onResize);

    let animationId: number;
    const clock = new THREE.Clock();

    function tick() {
      const elapsedTime = clock.getElapsedTime();
      const speed = 0.05;

      // Rotate box
      box.rotation.y = elapsedTime * speed;
      box.rotation.x = elapsedTime * speed;
      box.rotation.z = elapsedTime * speed;

      // Animate particles along infinity loop
      const positionsArray = particles.geometry.attributes.position.array;
      const opacitiesArray = particles.geometry.attributes.alpha.array;
      const animSpeed = 0.01; // Slower speed for smoother flow

      for (let i = 0; i < count; i++) {
        // Each particle has its own phase along the infinity curve
        const t = (i / count + elapsedTime * animSpeed) * Math.PI * 4;
        const scale = 2;

        // Calculate base position on infinity curve
        const baseX = (scale * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
        const baseY =
          (scale * Math.sin(t) * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));

        const newX = baseX + offsets[i * 3];
        const newY = baseY + offsets[i * 3 + 1];
        const newZ = Math.sin(t + i * 0.1) * 0.2 + offsets[i * 3 + 2];

        // Apply the random offsets to maintain separation
        positionsArray[i * 3] = newX;
        positionsArray[i * 3 + 1] = newY;
        positionsArray[i * 3 + 2] = newZ;

        opacitiesArray[i * 3] = Math.abs(newX) / 2;
      }

      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(tick);
    }

    tick();

    // cleanup on unmount
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  return <canvas className="webgl absolute z-10"></canvas>;
}

export default Hero;
