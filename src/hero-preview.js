import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { animateHero, DOG_MODEL_URLS } from './scene/hero-model.js';

const dogId = new URLSearchParams(location.search).get('dog') === 'bonggu' ? 'bonggu' : 'hero';
const dogName = dogId === 'bonggu' ? '봉구' : '히로';
document.title = `${dogName} · 움직임 미리보기`;
document.querySelector('h1').textContent = `${dogName} · 움직임 미리보기`;
document.querySelector('a[download]').href = DOG_MODEL_URLS[dogId];

const canvas = document.querySelector('#preview');
const status = document.querySelector('#status');
status.textContent = `${dogName}를 불러오는 중…`;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eee7dc');
const pmrem = new THREE.PMREMGenerator(renderer);
const environment = new RoomEnvironment();
const env = pmrem.fromScene(environment, 0.04);
scene.environment = env.texture;
scene.environmentIntensity = 0.45;
environment.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight('#fff4e2', '#9a8870', 1));
const light = new THREE.DirectionalLight('#fff0dc', 3);
light.position.set(-1.5, 2.5, 2); light.castShadow = true;
light.shadow.mapSize.set(1024, 1024);
Object.assign(light.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 7 });
light.shadow.normalBias = .004; scene.add(light);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: '#e7dece', roughness: 1 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const camera = new THREE.PerspectiveCamera(35, 1, .01, 30);
camera.position.set(.95, .64, 1.5);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, .27, 0); controls.minDistance = .5; controls.maxDistance = 3; controls.maxPolarAngle = Math.PI / 2; controls.enableDamping = true; controls.update();
let animator, paused = false;
const names = { Idle:'대기', Walk:'걷기', Run:'달리기', Sit:'앉기', Down:'엎드리기', Sleep:'잠자기', Eat:'먹기', Beg:'간식 기다리기', Happy:'기뻐하기' };
const nav = document.querySelector('#motions');
for (const [clip, label] of Object.entries(names)) {
  const button = document.createElement('button'); button.textContent = label; button.dataset.clip = clip; button.disabled = true; button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    animator.play(clip);
    nav.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    status.textContent = `${label} · 드래그해서 다른 각도도 확인해 보세요`;
  }); nav.append(button);
}
const pause = document.querySelector('#pause');
pause.addEventListener('click', () => { paused = !paused; pause.textContent = paused ? '다시 재생' : '일시정지'; });
async function loadHero() {
try {
  const gltf = await new GLTFLoader().loadAsync(DOG_MODEL_URLS[dogId]);
  gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(gltf.scene); animator = animateHero(gltf.scene, gltf.animations);
  nav.querySelectorAll('button').forEach(b => { b.disabled = false; });
  pause.disabled = false; nav.querySelector('[data-clip="Idle"]').click();
  window.__heroPreview = { model: gltf.scene, animator, renderer, clips: gltf.animations.map(c => c.name) };
} catch (e) { status.textContent = '모델을 불러오지 못했어요. 새로고침해서 다시 시도해 주세요.'; console.error(e); }
}
loadHero();
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), .1); if (animator && !paused) animator.mixer.update(dt); controls.update(); renderer.render(scene, camera); });
