import * as THREE from 'three';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import positionData from './position.json';
import * as TWEEN from '@tweenjs/tween.js'

// シーン、カメラ、レンダラーの設定
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 70, 0);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Adjust color and intensity as needed
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // 平行光源
directionalLight.position.set(5, 10, 5).normalize();
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight2.position.set(-5, 10, -5).normalize();
scene.add(directionalLight2);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.physicallyCorrectLights = true;
renderer.gammaOutput = true;
document.body.appendChild(renderer.domElement);

// フィールドの追加
const fieldLoader = new GLTFLoader();
let field;
fieldLoader.load('/assets/soccer_field/scene.gltf', (gltf) => {
  field = gltf.scene;
  scene.add(field);
});

// ボールの設定
const ballLoader = new GLTFLoader();
let ball;
ballLoader.load('/assets/soccer_ball/scene.gltf', (gltf) => {
  ball = gltf.scene;
  ball.scale.set(0.3, 0.3, 0.3);
  scene.add(ball);
});

// 選手モデルの読み込み関数を非同期化
const numberOfPlayers = 11;
let leftTeamPlayers = [];
let rightTeamPlayers = [];

async function loadPlayerModel(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      resolve(gltf.scene);
    }, undefined, reject);
  });
}

async function loadPlayerTeam(url) {
  const players = [];
  for (let i = 0; i < numberOfPlayers; i++) {
    const player = await loadPlayerModel(url);
    players.push(player);
    scene.add(player);
  }
  return players;
}

async function init() {
  // 左チームと右チームの選手モデルをロード
  leftTeamPlayers = await loadPlayerTeam('/assets/player_blue/player_blue.gltf');
  rightTeamPlayers = await loadPlayerTeam('/assets/player_red/player_red.gltf');

  // 初期位置を設定
  setInitialPlayerPositions();
}

init().catch(console.error);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // アニメーションをスムーズにする
controls.dampingFactor = 0.05; // 減衰係数 (0.25から少し小さくしてみる)
controls.enableZoom = true; // ズーム機能を有効にする
controls.zoomSpeed = 3.0; // ズーム速度
controls.enablePan = true; // パン機能を有効にする
controls.panSpeed = 1.0; // パン速度
controls.minDistance = 10; // ズームの最小距離を設定
controls.maxDistance = 200; // ズームの最大距離を設定
controls.maxPolarAngle = Math.PI / 2; // カメラの垂直回転の制限

let isBallView = false;

document.addEventListener('keydown', (event) => {
  if (event.key === 's') { // Press 's' to start the race
    startGame = true;
    pauseGame = false;
  } else if (event.key === 'p') { // Press 'p' to pause/resume the race
    pauseGame = !pauseGame;
  } else if (event.key === 'c') { // Press 'c' to set camera position
    camera.position.set(0, 70, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  } else if (event.key === 'l') {
    camera.position.set(70, 15, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  } else if (event.key === 'r') {
    camera.position.set(-70, 15, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  } else if (event.key === 'b') {
    isBallView = !isBallView;
  }
});

let startGame = false;
let pauseGame = false;
const totalFrames = positionData.game_log.length;

let currentFrame = 0;
const gameDuration = 60 * 1000;
const frameInterval = gameDuration / totalFrames;
let timer = null;

// フレーム管理のスタート関数
function startFrameMgr() {
  timer = setInterval(() => {
    nextFrame();
    if (currentFrame >= totalFrames) {
      clearInterval(timer);
    }
  }, frameInterval);
}

// 次のフレームに進む関数
function nextFrame() {
  currentFrame++;
}

let prevBallPosition = null;

function calculateBallSpeed(currentPosition, previousPosition) {
  if (!previousPosition) return 0;

  const dx = currentPosition[0] - previousPosition[0];
  const dz = currentPosition[1] - previousPosition[1];
  return Math.sqrt(dx * dx + dz * dz);
}

function calculateBallDirection(currentPosition, previousPosition) {
  if (!previousPosition) return new THREE.Vector3(0, 0, 1);

  const dx = currentPosition[0] - previousPosition[0];
  const dz = currentPosition[1] - previousPosition[1];
  const direction = new THREE.Vector3(dx, 0, dz).normalize();
  return direction;
}

// アニメーション前に選手の初期位置を設定する関数
function setInitialPlayerPositions() {
  if (positionData.game_log.length === 0) return;
  const initialFrame = positionData.game_log[0];
  const { left: leftTeamPositions, right: rightTeamPositions } = initialFrame;
  // 左チームの選手の位置を設定
  leftTeamPositions.forEach((playerData, index) => {
    if (index >= leftTeamPlayers.length) {
      return;
    }
    const [id, , x, z] = playerData;
    const leftPlayer = leftTeamPlayers[index];
    leftPlayer.position.set(x, 0, z);
  });

  // 右チームの選手の位置を設定
  rightTeamPositions.forEach((playerData, index) => {
    if (index >= rightTeamPlayers.length) return;

    const [id, , x, z] = playerData;
    const rightPlayer = rightTeamPlayers[index];
    rightPlayer.position.set(x, 0, z);
  });
}

function updatePlayerPositions(leftTeamPositions, rightTeamPositions) {
  if (leftTeamPlayers.length === 0 || rightTeamPlayers.length === 0) return;

  leftTeamPositions.forEach((playerData, index) => {
    if (index >= leftTeamPlayers.length) return;

    const [id, , x, z] = playerData;
    const leftPlayer = leftTeamPlayers[index];
    leftPlayer.position.set(x, 0, z);
  });

  rightTeamPositions.forEach((playerData, index) => {
    if (index >= rightTeamPlayers.length) return;

    const [id, , x, z] = playerData;
    const rightPlayer = rightTeamPlayers[index];
    rightPlayer.position.set(x, 0, z);
  });
}

// アニメーション関数
function animate() {
  requestAnimationFrame(animate);

  if (startGame && !pauseGame) {
    if (currentFrame < totalFrames) {
      console.log(currentFrame, totalFrames);

      if (positionData.game_log) {

      }
      const { left: leftTeamPositions, right: rightTeamPositions } = positionData.game_log[currentFrame];
      updatePlayerPositions(leftTeamPositions, rightTeamPositions);

      if (ball) {
        const { ball: ballPosition } = positionData.game_log[currentFrame];
        ball.position.set(parseFloat(ballPosition[0]), 0.5, parseFloat(ballPosition[1]));
  
        if (prevBallPosition) {
          // Calculate speed and direction
          const speed = calculateBallSpeed(ballPosition, prevBallPosition);
          const direction = calculateBallDirection(ballPosition, prevBallPosition);
  
          // Update the ball's rotation to match direction
          const angle = Math.atan2(direction.z, direction.x); // Calculate angle based on direction
          ball.rotation.y = angle;
  
          // Calculate rotation speed based on ball speed
          const rotationSpeed = speed * 50;
          ball.rotation.z += rotationSpeed * (frameInterval / 1000);
        }
        prevBallPosition = ballPosition;

        // Update camera position and direction based on the view mode
        let cameraOffset = new THREE.Vector3(0, 20, 30);
        if (isBallView) {
          camera.position.copy(ball.position).add(cameraOffset);
          camera.lookAt(ball.position);
        }
      }
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

setInitialPlayerPositions();
startFrameMgr();
animate();

