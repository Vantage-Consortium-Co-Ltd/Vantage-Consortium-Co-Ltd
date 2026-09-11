document.getElementById("year").textContent = new Date().getFullYear();

const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");

navToggle.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

/* 3D / immersive touches: hero parallax, card tilt, scroll reveal.
   All gated on prefers-reduced-motion and a fine pointer (skip on touch). */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (!prefersReducedMotion && canHover) {
  const hero = document.getElementById("heroDepth");
  if (hero) {
    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const my = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      hero.style.setProperty("--mx", mx.toFixed(3));
      hero.style.setProperty("--my", my.toFixed(3));
    });
    hero.addEventListener("mouseleave", () => {
      hero.style.setProperty("--mx", 0);
      hero.style.setProperty("--my", 0);
    });
  }

  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 14;
      const rotateX = (0.5 - py) * 14;
      card.style.transform = `perspective(700px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

const revealEls = document.querySelectorAll(".reveal");
if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("in-view"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

/* Three.js hero particle-network scene.
   Only runs for capable devices: no reduced-motion, fine pointer (desktop),
   wide-enough viewport, and actual WebGL support. Everyone else keeps the
   plain CSS gradient (.hero-bg) as the hero background. */
function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

const isWideViewport = window.matchMedia("(min-width: 821px)").matches;
const supportsHero3D = !prefersReducedMotion && canHover && isWideViewport && supportsWebGL();

if (supportsHero3D) {
  const loader = document.createElement("script");
  loader.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  loader.onload = initHeroScene;
  loader.onerror = () => {}; // CSS gradient fallback stays as-is
  document.head.appendChild(loader);
}

function initHeroScene() {
  if (typeof THREE === "undefined") return;

  const hero = document.getElementById("heroDepth");
  const canvas = document.getElementById("heroCanvas");
  if (!hero || !canvas) return;

  let width = hero.clientWidth;
  let height = hero.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
  camera.position.z = 320;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // leave the CSS gradient as the fallback
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);

  // Points: a scattered cloud in brand colors (cyan -> purple).
  const colorA = new THREE.Color(0x4fd1ff);
  const colorB = new THREE.Color(0x7c5cff);
  const pointCount = 140;
  const positions = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 3);
  const pts = [];

  for (let i = 0; i < pointCount; i++) {
    const x = (Math.random() - 0.5) * 480;
    const y = (Math.random() - 0.5) * 320;
    const z = (Math.random() - 0.5) * 320;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    pts.push(new THREE.Vector3(x, y, z));

    const mixed = colorA.clone().lerp(colorB, Math.random());
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  const group = new THREE.Group();

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const pointMaterial = new THREE.PointsMaterial({
    size: 3.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  group.add(new THREE.Points(pointGeometry, pointMaterial));

  // Constellation lines between nearby points. Computed once: the group
  // rotates as a rigid body, so pairwise distances never change.
  const linkDistance = 85;
  const linkPositions = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[i].distanceTo(pts[j]) < linkDistance) {
        linkPositions.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
      }
    }
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linkPositions), 3));
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.18 });
  group.add(new THREE.LineSegments(lineGeometry, lineMaterial));

  scene.add(group);

  let targetTiltX = 0;
  let targetTiltY = 0;
  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    targetTiltY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.5;
    targetTiltX = ((e.clientY - rect.top) / rect.height - 0.5) * -0.5;
  });
  hero.addEventListener("mouseleave", () => {
    targetTiltX = 0;
    targetTiltY = 0;
  });

  let isVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0 }
    ).observe(hero);
  }

  window.addEventListener("resize", () => {
    width = hero.clientWidth;
    height = hero.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  let baseRotX = 0;
  let baseRotY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let frameId;
  function animate() {
    frameId = requestAnimationFrame(animate);
    if (!isVisible) return;
    baseRotY += 0.0009;
    baseRotX += 0.0004;
    tiltX += (targetTiltX - tiltX) * 0.02;
    tiltY += (targetTiltY - tiltY) * 0.02;
    group.rotation.x = baseRotX + tiltX;
    group.rotation.y = baseRotY + tiltY;
    renderer.render(scene, camera);
  }
  animate();

  requestAnimationFrame(() => canvas.classList.add("is-ready"));

  window.addEventListener("beforeunload", () => cancelAnimationFrame(frameId));
}
