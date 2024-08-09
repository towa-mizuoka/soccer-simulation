import * as THREE from 'three';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import positionData from './position.json';

// シーン、カメラ、レンダラーの設定
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 70, 0);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Adjust color and intensity as needed
scene.add(ambientLight);

const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight1.position.set(5, 10, 5).normalize();
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight2.position.set(-5, 10, -5).normalize();
scene.add(directionalLight2);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.physicallyCorrectLights = true;
renderer.gammaOutput = true;
document.body.appendChild(renderer.domElement);

// カメラ制御
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.zoomSpeed = 3.0;
controls.enablePan = true;
controls.panSpeed = 1.0;
controls.minDistance = 10;
controls.maxDistance = 200;
controls.maxPolarAngle = Math.PI / 2;

// ローディング関連
const loadingScreen = document.getElementById('loading-screen');
let isLoaded = false;
let initialPositionsSet = false;

function checkLoadingComplete() {
  if (isLoaded && initialPositionsSet) {
    loadingScreen.classList.add('hidden');
  }
}

const loadingManager = new THREE.LoadingManager();
setupLoadingManager(loadingManager);

function setupLoadingManager(manager) {
  manager.onLoad = () => { isLoaded = true; checkLoadingComplete(); };
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    console.log(`Loading ${url}: ${itemsLoaded} / ${itemsTotal}`);
  };
  manager.onError = (url) => { console.error(`Error loading ${url}`); };
}

// モデル読み込み
let field, ball;
const numberOfPlayers = 11;
let leftTeamPlayers = [];
let rightTeamPlayers = [];

async function init() {
  field = await loadModel('/assets/soccer_field/scene.gltf');
  ball = await loadBall('/assets/soccer_ball/scene.gltf');

  leftTeamPlayers = await loadTeam('/assets/player_blue/player_blue.gltf');
  rightTeamPlayers = await loadTeam('/assets/player_red/player_red.gltf');

  setInitialPlayerPositions();
  checkLoadingComplete();
}

function loadModel(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader(loadingManager);
    loader.load(url, (gltf) => {
      scene.add(gltf.scene);
      resolve(gltf.scene);
    }, undefined, reject);
  });
}

async function loadTeam(url) {
  const players = [];
  for (let i = 0; i < numberOfPlayers; i++) {
    const player = await loadModel(url);
    players.push(player);
  }
  return players;
}

async function loadBall(url) {
  const ballModel = await loadModel(url);
  ballModel.scale.set(0.3, 0.3, 0.3);
  return ballModel;
}

// カメラ制御
let isBallView = false;

function setupCameraControls() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'c') {
      resetCameraPosition();
    } else if (event.key === 'l') {
      setCameraPosition(new THREE.Vector3(70, 15, 0));
    } else if (event.key === 'r') {
      setCameraPosition(new THREE.Vector3(-70, 15, 0));
    } else if (event.key === 'b') {
      isBallView = !isBallView;
    }
  });
}

function resetCameraPosition() {
  camera.position.set(0, 70, 0);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

function setCameraPosition(position) {
  camera.position.copy(position);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

// アニメーション処理
let startGame = false;
let pauseGame = false;
const totalFrames = positionData.game_log.length;
let currentFrame = 0;
const gameDuration = 60 * 1000;
const frameInterval = gameDuration / totalFrames;
let timer = null;
let prevBallPosition = null;

// 再生/一時停止の管理
const playPauseButton = document.getElementById('play-pause-button');
const playIcon = playPauseButton.querySelector('#play-icon');
const pauseIcon = playPauseButton.querySelector('#pause-icon');
playPauseButton.addEventListener('click', () => {
  if (!startGame) {
    startGame = true;
    pauseGame = false;
    playIcon.classList.remove('show');
    pauseIcon.classList.add('show');
    startFrameMgr();
  } else {
    startGame = false;
    pauseGame = true;
    playIcon.classList.add('show');
    pauseIcon.classList.remove('show');
    stopFrameMgr();
  }
});

// シークバーの管理
const seekBar = document.getElementById('seek-bar');
seekBar.max = totalFrames - 1;

seekBar.addEventListener('input', (event) => {
  const frame = parseInt(event.target.value);
  jumpToFrame(frame);
});

function updateSeekBar() {
  seekBar.value = currentFrame;
}
function jumpToFrame(frame) {
  if (frame < 0 || frame >= totalFrames) return;
  currentFrame = frame;
  const frameData = positionData.game_log[frame];
  updatePlayerPositions(frameData.left, frameData.right);
  updateBallPosition(frameData.ball);
}
function startFrameMgr() {
  timer = setInterval(() => {
    nextFrame();
    if (currentFrame >= totalFrames) {
      clearInterval(timer);
    }
  }, frameInterval);
}

function stopFrameMgr() {
  clearInterval(timer);
}

function nextFrame() {
  currentFrame++;
  updateSeekBar();
}

function setInitialPlayerPositions() {
  if (positionData.game_log.length === 0) return;
  const initialFrame = positionData.game_log[0];
  updatePlayerPositions(initialFrame.left, initialFrame.right);
  initialPositionsSet = true;
}

function updatePlayerPositions(leftTeamPositions, rightTeamPositions) {
  if (leftTeamPlayers.length === 0 || rightTeamPlayers.length === 0) return;

  leftTeamPositions.forEach((playerData, index) => {
    if (index < leftTeamPlayers.length) {
      leftTeamPlayers[index].position.set(playerData[2], 0, playerData[3]);
    }
  });

  rightTeamPositions.forEach((playerData, index) => {
    if (index < rightTeamPlayers.length) {
      rightTeamPlayers[index].position.set(playerData[2], 0, playerData[3]);
    }
  });
}


function animate() {
  requestAnimationFrame(animate);

  if (startGame && !pauseGame) {
    if (currentFrame < totalFrames) {
      updatePlayerPositions(positionData.game_log[currentFrame].left, positionData.game_log[currentFrame].right);
      updateBallPosition(positionData.game_log[currentFrame].ball);
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

function updateBallPosition(ballPosition) {
  if (ball) {
    ball.position.set(parseFloat(ballPosition[0]), 0.5, parseFloat(ballPosition[1]));

    if (prevBallPosition) {
      const speed = calculateSpeed(ballPosition, prevBallPosition);
      const direction = calculateDirection(ballPosition, prevBallPosition);
      ball.rotation.y = Math.atan2(direction.z, direction.x);
      ball.rotation.z += speed * 50 * (frameInterval / 1000);
    }
    prevBallPosition = ballPosition;

    if (isBallView) {
      setCameraPosition(ball.position.clone().add(new THREE.Vector3(0, 20, 30)));
    }
  }
}

function calculateSpeed(currentPosition, previousPosition) {
  if (!previousPosition) return 0;
  const dx = currentPosition[0] - previousPosition[0];
  const dz = currentPosition[1] - previousPosition[1];
  return Math.sqrt(dx * dx + dz * dz);
}

function calculateDirection(currentPosition, previousPosition) {
  if (!previousPosition) return new THREE.Vector3(0, 0, 1);
  const dx = currentPosition[0] - previousPosition[0];
  const dz = currentPosition[1] - previousPosition[1];
  return new THREE.Vector3(dx, 0, dz).normalize();
}

init().catch(console.error);
setupCameraControls();
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
