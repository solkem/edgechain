const SCREENS = {
  home: document.getElementById('home-screen'),
  sim: document.getElementById('sim-screen'),
};

const statusScreen = document.getElementById('status-screen');

const STEP_ORDER = ['wallet', 'sensor', 'local', 'global', 'download', 'proof'];

const stepElements = Object.fromEntries(
  STEP_ORDER.map((name) => [name, document.getElementById(`step-${name}`)]),
);

const refs = {
  connectWallet: document.getElementById('connect-wallet'),
  openSimulator: document.getElementById('open-simulator'),
  backHome: document.getElementById('back-home'),
  runFullFlow: document.getElementById('run-full-flow'),
  resetFlow: document.getElementById('reset-flow'),
  walletPill: document.getElementById('wallet-pill'),

  runStepWallet: document.getElementById('run-step-wallet'),
  runStepSensor: document.getElementById('run-step-sensor'),
  runStepLocal: document.getElementById('run-step-local'),
  runStepGlobal: document.getElementById('run-step-global'),
  runStepDownload: document.getElementById('run-step-download'),
  runStepProof: document.getElementById('run-step-proof'),

  sensorState: document.getElementById('sensor-state'),
  sensorMoisture: document.getElementById('sensor-moisture'),
  sensorHumidity: document.getElementById('sensor-humidity'),
  sensorTemp: document.getElementById('sensor-temp'),
  sensorBars: document.getElementById('sensor-bars'),
  sensorLog: document.getElementById('sensor-log'),

  trainState: document.getElementById('train-state'),
  trainProgressText: document.getElementById('train-progress-text'),
  trainProgressFill: document.getElementById('train-progress-fill'),
  aggregationProgressText: document.getElementById('aggregation-progress-text'),
  aggregationProgressFill: document.getElementById('aggregation-progress-fill'),
  localModel: document.getElementById('local-model'),
  globalModel: document.getElementById('global-model'),
  downloadStatus: document.getElementById('download-status'),

  kpiFarmers: document.getElementById('kpi-farmers'),
  kpiPackets: document.getElementById('kpi-packets'),
  kpiRound: document.getElementById('kpi-round'),
  inferenceBefore: document.getElementById('inference-before'),
  inferenceAfter: document.getElementById('inference-after'),
  inferenceBeforeFill: document.getElementById('inference-before-fill'),
  inferenceAfterFill: document.getElementById('inference-after-fill'),
  inferenceDelta: document.getElementById('inference-delta'),

  proofState: document.getElementById('proof-state'),
  proofId: document.getElementById('proof-id'),
  anchorLane: document.getElementById('anchor-lane'),
  lastUpdated: document.getElementById('last-updated'),
};

function createInitialState() {
  return {
    walletConnected: false,
    walletAddress: '',
    running: false,
    currentStep: 0,
    completed: [false, false, false, false, false, false],

    sensorMode: 'idle',
    readings: [],

    trainState: 'waiting',
    trainProgress: 0,
    aggregationProgress: 0,
    localModel: 'local-v0.0',
    globalModel: 'global-v0.0',
    downloadStatus: 'Pending',

    contributingFarmers: 0,
    modelRound: 0,
    inferenceBefore: 0,
    inferenceAfter: 0,

    proofId: '-',
    proofState: 'unissued',
    anchorLane: 'Pending',
    lastUpdatedIso: '',
  };
}

let state = createInitialState();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomHex(length) {
  const symbols = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += symbols[Math.floor(Math.random() * symbols.length)];
  }
  return result;
}

function createWalletAddress() {
  return `addr_test1_${randomHex(26)}`;
}

function createProofId() {
  return `ODZI-${randomHex(12).toUpperCase()}`;
}

function shortAddress(address) {
  if (!address) return '-';
  if (address.length < 16) return address;
  return `${address.slice(0, 12)}...${address.slice(-6)}`;
}

function formatClock(iso) {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function setStatus(message, isError = false) {
  statusScreen.textContent = message || '';
  statusScreen.classList.toggle('error', Boolean(isError));
}

function setScreen(name) {
  Object.values(SCREENS).forEach((screen) => screen.classList.remove('active'));
  SCREENS[name].classList.add('active');
}

function setRunning(disabled) {
  state.running = disabled;
  [
    refs.runFullFlow,
    refs.resetFlow,
    refs.runStepWallet,
    refs.runStepSensor,
    refs.runStepLocal,
    refs.runStepGlobal,
    refs.runStepDownload,
    refs.runStepProof,
    refs.connectWallet,
  ].forEach((btn) => {
    if (!btn) return;
    btn.disabled = disabled;
  });
}

function markStepDone(stepName) {
  const index = STEP_ORDER.indexOf(stepName);
  if (index < 0) return;
  state.completed[index] = true;
  state.currentStep = Math.min(index + 1, STEP_ORDER.length - 1);
}

function updateSteps() {
  STEP_ORDER.forEach((name, index) => {
    const el = stepElements[name];
    if (!el) return;

    el.classList.remove('active', 'done');

    if (state.completed[index]) {
      el.classList.add('done');
    }

    if (index === state.currentStep && !state.completed[index]) {
      el.classList.add('active');
    }
  });

  if (state.completed.every((done) => done)) {
    stepElements.proof.classList.add('active');
  }
}

function renderWallet() {
  if (state.walletConnected) {
    refs.walletPill.classList.remove('offline');
    refs.walletPill.textContent = `Connected: ${shortAddress(state.walletAddress)}`;
  } else {
    refs.walletPill.classList.add('offline');
    refs.walletPill.textContent = 'Wallet not connected';
  }
}

function renderSensors() {
  const latest = state.readings[state.readings.length - 1];

  refs.sensorState.textContent = state.sensorMode;
  refs.sensorMoisture.textContent = latest ? `${latest.moisture.toFixed(1)}%` : '-';
  refs.sensorHumidity.textContent = latest ? `${latest.humidity.toFixed(1)}%` : '-';
  refs.sensorTemp.textContent = latest ? `${latest.temperature.toFixed(1)} C` : '-';

  const bars = state.readings.slice(-16);
  refs.sensorBars.innerHTML = bars
    .map((reading) => {
      const height = Math.max(7, Math.min(100, reading.moisture * 1.8));
      return `<span class="chart-bar" style="height:${height}%"></span>`;
    })
    .join('');

  refs.sensorLog.innerHTML = state.readings
    .slice(-6)
    .reverse()
    .map((reading) => {
      return `<li>
          <strong>${new Date(reading.timestamp).toLocaleTimeString()}</strong>
          <span>Moisture ${reading.moisture.toFixed(1)}% | Humidity ${reading.humidity.toFixed(1)}% | Temp ${reading.temperature.toFixed(1)} C</span>
        </li>`;
    })
    .join('');

  if (!state.readings.length) {
    refs.sensorLog.innerHTML = '<li><strong>No packets yet</strong><span>Run step 2 to simulate Arduino stream.</span></li>';
  }
}

function renderFlow() {
  refs.trainState.textContent = state.trainState;
  refs.trainProgressText.textContent = `${Math.round(state.trainProgress)}%`;
  refs.trainProgressFill.style.width = `${state.trainProgress}%`;

  refs.aggregationProgressText.textContent = `${Math.round(state.aggregationProgress)}%`;
  refs.aggregationProgressFill.style.width = `${state.aggregationProgress}%`;

  refs.localModel.textContent = state.localModel;
  refs.globalModel.textContent = state.globalModel;
  refs.downloadStatus.textContent = state.downloadStatus;
}

function renderDashboards() {
  refs.kpiFarmers.textContent = String(state.contributingFarmers);
  refs.kpiPackets.textContent = String(state.readings.length);
  refs.kpiRound.textContent = String(state.modelRound);

  refs.inferenceBefore.textContent = `${state.inferenceBefore.toFixed(1)}%`;
  refs.inferenceAfter.textContent = `${state.inferenceAfter.toFixed(1)}%`;
  refs.inferenceBeforeFill.style.width = `${Math.max(0, Math.min(100, state.inferenceBefore))}%`;
  refs.inferenceAfterFill.style.width = `${Math.max(0, Math.min(100, state.inferenceAfter))}%`;

  const delta = state.inferenceAfter - state.inferenceBefore;
  if (delta > 0.1) {
    refs.inferenceDelta.textContent = `Prediction confidence improved by +${delta.toFixed(1)}% after global model update.`;
  } else {
    refs.inferenceDelta.textContent = 'Run the flow to see prediction improvement.';
  }

  refs.proofState.textContent = state.proofState;
  refs.proofId.textContent = state.proofId;
  refs.anchorLane.textContent = state.anchorLane;
  refs.lastUpdated.textContent = formatClock(state.lastUpdatedIso);
}

function render() {
  updateSteps();
  renderWallet();
  renderSensors();
  renderFlow();
  renderDashboards();
}

function createSensorReading() {
  return {
    timestamp: Date.now(),
    moisture: randomBetween(11.8, 26.2),
    humidity: randomBetween(42.2, 79.4),
    temperature: randomBetween(18.3, 34.1),
  };
}

async function animateProgress(key, target, durationMs) {
  const start = state[key];
  const startAt = performance.now();

  while (true) {
    const elapsed = performance.now() - startAt;
    const progress = Math.min(1, elapsed / durationMs);
    state[key] = start + (target - start) * progress;
    render();

    if (progress >= 1) {
      break;
    }

    await sleep(50);
  }
}

async function runWalletStep() {
  if (state.walletConnected) {
    markStepDone('wallet');
    setStatus('Wallet already connected for this pilot session.');
    render();
    return;
  }

  setStatus('Connecting simulated Lace wallet...');
  await sleep(700);

  state.walletConnected = true;
  state.walletAddress = createWalletAddress();
  markStepDone('wallet');

  setStatus(`Wallet connected: ${shortAddress(state.walletAddress)}`);
  render();
}

async function runSensorStep() {
  if (!state.walletConnected) {
    setStatus('Connect wallet first so the farmer sees onboarding in order.', true);
    return;
  }

  setStatus('Simulating Arduino packet stream...');
  state.sensorMode = 'collecting';
  render();

  for (let i = 0; i < 10; i += 1) {
    state.readings.push(createSensorReading());
    if (state.readings.length > 24) {
      state.readings.shift();
    }
    render();
    await sleep(240);
  }

  state.sensorMode = 'ready';
  markStepDone('sensor');
  setStatus('Arduino simulation complete with fresh sensor packets.');
  render();
}

async function runLocalStep() {
  if (!state.readings.length) {
    setStatus('Run Arduino readings first so local training has packet data.', true);
    return;
  }

  setStatus('Training local federated model on-device...');
  state.trainState = 'training';
  state.trainProgress = 0;
  render();

  await animateProgress('trainProgress', 100, 1800);

  state.localModel = `local-v${randomInt(6, 9)}.${randomInt(1, 9)}`;
  state.inferenceBefore = randomBetween(44.0, 61.0);
  state.inferenceAfter = state.inferenceBefore;
  state.trainState = 'local update ready';

  markStepDone('local');
  setStatus(`Local model ready: ${state.localModel}`);
  render();
}

async function runGlobalStep() {
  if (state.trainProgress < 99) {
    setStatus('Complete local training before global aggregation.', true);
    return;
  }

  setStatus('Aggregating co-op updates into global model...');
  state.trainState = 'aggregating';
  state.aggregationProgress = 0;
  render();

  await animateProgress('aggregationProgress', 100, 1500);

  state.globalModel = `global-v${randomInt(3, 6)}.${randomInt(1, 9)}`;
  state.contributingFarmers = randomInt(28, 87);
  state.modelRound = randomInt(3, 12);
  state.trainState = 'global model ready';

  markStepDone('global');
  setStatus(`Global model aggregated: ${state.globalModel}`);
  render();
}

async function runDownloadStep() {
  if (state.aggregationProgress < 99) {
    setStatus('Run global aggregation before download.', true);
    return;
  }

  setStatus('Downloading updated global model to device...');
  state.downloadStatus = 'Downloading...';
  render();

  await sleep(900);

  state.downloadStatus = 'Downloaded';
  markStepDone('download');
  setStatus('Updated global model downloaded to farmer device.');
  render();
}

async function runProofStep() {
  if (state.downloadStatus !== 'Downloaded') {
    setStatus('Download the global model before inference and proof.', true);
    return;
  }

  setStatus('Running updated inference and issuing proof slip...');
  await sleep(700);

  state.inferenceAfter = Math.min(96, state.inferenceBefore + randomBetween(7.2, 18.6));
  state.proofId = createProofId();
  state.proofState = 'issued';
  state.anchorLane = 'Ready for daily anchor';
  state.lastUpdatedIso = new Date().toISOString();

  markStepDone('proof');
  setStatus(`Proof slip generated: ${state.proofId}`);
  render();
}

const stepActions = {
  wallet: runWalletStep,
  sensor: runSensorStep,
  local: runLocalStep,
  global: runGlobalStep,
  download: runDownloadStep,
  proof: runProofStep,
};

async function executeStep(stepName) {
  if (state.running) return;

  const action = stepActions[stepName];
  if (!action) return;

  setRunning(true);
  try {
    await action();
  } catch (error) {
    setStatus(`Step failed: ${error.message}`, true);
  } finally {
    setRunning(false);
    render();
  }
}

async function runFullFlow() {
  if (state.running) return;

  setRunning(true);
  setStatus('Running full pilot simulation...');

  try {
    for (const step of STEP_ORDER) {
      const index = STEP_ORDER.indexOf(step);
      if (!state.completed[index]) {
        await stepActions[step]();
        await sleep(220);
      }
    }

    setStatus('Full simulation complete: wallet -> Arduino -> local FL -> global FL -> download -> proof.');
  } catch (error) {
    setStatus(`Simulation failed: ${error.message}`, true);
  } finally {
    setRunning(false);
    render();
  }
}

function resetFlow() {
  const wasConnected = state.walletConnected;
  const address = state.walletAddress;

  state = createInitialState();

  if (wasConnected) {
    state.walletConnected = true;
    state.walletAddress = address;
    state.completed[0] = true;
    state.currentStep = 1;
  }

  setStatus('Simulation reset.');
  render();
}

refs.connectWallet.addEventListener('click', async () => {
  setScreen('sim');
  await executeStep('wallet');
});

refs.openSimulator.addEventListener('click', () => {
  setScreen('sim');
  setStatus('Pilot simulator ready. Run any step or full flow.');
});

refs.backHome.addEventListener('click', () => {
  setScreen('home');
  setStatus('Returned to home view.');
});

refs.runStepWallet.addEventListener('click', () => executeStep('wallet'));
refs.runStepSensor.addEventListener('click', () => executeStep('sensor'));
refs.runStepLocal.addEventListener('click', () => executeStep('local'));
refs.runStepGlobal.addEventListener('click', () => executeStep('global'));
refs.runStepDownload.addEventListener('click', () => executeStep('download'));
refs.runStepProof.addEventListener('click', () => executeStep('proof'));

refs.runFullFlow.addEventListener('click', runFullFlow);
refs.resetFlow.addEventListener('click', resetFlow);

setScreen('home');
render();
setStatus('EdgeChain pilot simulator loaded.');
