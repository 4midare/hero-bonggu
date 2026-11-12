import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const modelBase = `${import.meta.env?.BASE_URL ?? '/'}models/`;
export const DOG_MODEL_URLS = { hero: `${modelBase}hero_game.glb`, bonggu: `${modelBase}bonggu_game.glb` };
export const HERO_MODEL_URL = DOG_MODEL_URLS.hero;
export const HERO_CLIPS = ['Idle', 'Walk', 'Run', 'Sit', 'Down', 'Sleep', 'Eat', 'Beg', 'Happy'];

export function heroClipForState(state, moving) {
  if (moving && ['wander', 'toBowl', 'toBed', 'approach'].includes(state)) {
    return state === 'approach' ? 'Run' : 'Walk';
  }
  return ({ sit: 'Sit', down: 'Down', sleep: 'Sleep', eat: 'Eat', beg: 'Beg', happy: 'Happy' })[state] || 'Idle';
}

export function animateHero(model, clips) {
  const names = new Set(clips.map(c => c.name));
  const missing = HERO_CLIPS.filter(name => !names.has(name));
  if (missing.length) throw new Error(`Hero model is missing animations: ${missing.join(', ')}`);
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map(clips.map(clip => [clip.name, mixer.clipAction(clip)]));
  let current;
  function play(name) {
    const next = actions.get(name) || actions.get('Idle');
    if (next === current) return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (current) next.crossFadeFrom(current, 0.22, false);
    current = next;
  }
  play('Idle');
  return {
    update(dt, state, moving) {
      play(heroClipForState(state, moving));
      mixer.update(Math.max(0, Math.min(dt, 0.1)));
    },
    play,
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(model); },
    mixer,
  };
}

// Keep the existing root, network interpolation, picking and fallback model.
// Swap only the visual children once the GLB and its clips have loaded.
export function upgradeDog(dog) {
  const modelURL = DOG_MODEL_URLS[dog.id];
  if (!modelURL) return dog;
  const fallbackChildren = [...dog.mesh.children];
  const fallbackUpdate = dog.update;
  let animator;
  dog.modelStatus = 'loading';
  dog.update = (dt, state, moving) => {
    if (animator) animator.update(dt, state, moving);
    else fallbackUpdate(dt, state, moving);
  };
  dog.modelReady = new GLTFLoader().loadAsync(modelURL).then(gltf => {
    const ready = animateHero(gltf.scene, gltf.animations);
    gltf.scene.name = `${dog.id}GLB`;
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      // Deeply nested skinned meshes remain clickable by the existing picker.
      o.userData.dogId = dog.id;
    });
    dog.mesh.add(gltf.scene);
    fallbackChildren.forEach(o => { o.visible = false; });
    dog.head = gltf.scene.getObjectByName('Head') || dog.head;
    animator = ready;
    dog.modelStatus = 'ready';
    return true;
  }).catch(error => {
    dog.modelStatus = 'fallback';
    console.warn(`${dog.id} GLB could not load; using the procedural character.`, error);
    return false;
  });
  return dog;
}

export const upgradeHero = upgradeDog;
