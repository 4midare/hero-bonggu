import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { animateHero, heroClipForState, HERO_CLIPS } from '../src/scene/hero-model.js';

const dogId = process.argv[2] || 'hero';
assert.ok(['hero', 'bonggu'].includes(dogId));
const raw = fs.readFileSync(new URL(`../public/models/${dogId}_game.glb`, import.meta.url));
assert.equal(raw.toString('ascii', 0, 4), 'glTF');
const jsonLength = raw.readUInt32LE(12);
const doc = JSON.parse(raw.toString('utf8', 20, 20 + jsonLength));
assert.equal(doc.skins.length, 1);
assert.equal(doc.skins[0].joints.length, 19);
assert.deepEqual(doc.animations.map(a => a.name).sort(), [...HERO_CLIPS].sort());
assert.ok(doc.images.every(i => i.bufferView !== undefined), 'Textures must be embedded');
assert.ok(raw.byteLength < 6_000_000, 'Asset should remain under 6 MB');

// Skeleton/animation validation in Node. Texture decoding is checked separately
// by importing the unmodified GLB in Blender; Node has no browser image decoder.
const stripped = structuredClone(doc);
for (const material of stripped.materials) {
  delete material.normalTexture; delete material.occlusionTexture; delete material.emissiveTexture;
  if (material.pbrMetallicRoughness) {
    delete material.pbrMetallicRoughness.baseColorTexture;
    delete material.pbrMetallicRoughness.metallicRoughnessTexture;
  }
}
const json = Buffer.from(JSON.stringify(stripped));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
const bin = raw.subarray(20 + jsonLength);
const rebuilt = Buffer.alloc(20 + padded.length + bin.length);
rebuilt.write('glTF'); rebuilt.writeUInt32LE(2, 4); rebuilt.writeUInt32LE(rebuilt.length, 8);
rebuilt.writeUInt32LE(padded.length, 12); rebuilt.writeUInt32LE(0x4E4F534A, 16); padded.copy(rebuilt, 20); bin.copy(rebuilt, 20 + padded.length);
const gltf = await new GLTFLoader().parseAsync(rebuilt.buffer.slice(rebuilt.byteOffset, rebuilt.byteOffset + rebuilt.byteLength), '');
const skinned = [];
gltf.scene.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
assert.ok(skinned.length > 0);
const mixer = new THREE.AnimationMixer(gltf.scene);
let globalMin = Infinity;
const bounds = {};
for (const clip of gltf.animations) {
  mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().play();
  const matrices = [];
  let minY = Infinity;
  for (const fraction of [0, .125, .25, .5, .75, .999]) {
    mixer.setTime(clip.duration * fraction); gltf.scene.updateMatrixWorld(true);
    for (const mesh of skinned) {
      mesh.skeleton.update();
      matrices.push(...mesh.skeleton.boneMatrices);
      for (let i = 0; i < mesh.geometry.attributes.position.count; i += 11) {
        const v = mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
        assert.ok([v.x, v.y, v.z].every(Number.isFinite));
        assert.ok(v.length() < 1.2, `${clip.name}: exploding vertex`);
        minY = Math.min(minY, v.y);
      }
    }
  }
  assert.ok(minY > -.004, `${clip.name}: penetrates floor at ${minY}m`);
  assert.ok(new Set(matrices.map(n => n.toFixed(6))).size > 10);
  bounds[clip.name] = Number(minY.toFixed(5)); globalMin = Math.min(globalMin, minY);
  action.stop();
}
assert.equal(heroClipForState('approach', true), 'Run');
for (const s of ['wander', 'toBowl', 'toBed']) assert.equal(heroClipForState(s, true), 'Walk');
assert.equal(heroClipForState('approach', false), 'Idle');
for (const [s,c] of Object.entries({sit:'Sit',down:'Down',sleep:'Sleep',eat:'Eat',beg:'Beg',happy:'Happy'})) assert.equal(heroClipForState(s, false), c);
assert.throws(() => animateHero(gltf.scene, []), /missing animations/);
const player = animateHero(gltf.scene, gltf.animations);
for (const [state,moving] of [['idle',false],['approach',true],['sit',false],['down',false],['happy',false]]) {
  for (let i=0;i<24;i++) player.update(1/60,state,moving);
}
player.dispose();
console.log(JSON.stringify({status:'passed',dogId,clips:HERO_CLIPS,skinPrimitives:skinned.length,minimumY:globalMin,floorByClip:bounds,bytes:raw.length},null,2));
