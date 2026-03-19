/* ════════════════════════ SLOO — main.js ════════════════════════ */

/* ── 미션 데이터 ── */
const MISSIONS = {
  gym:          ["운동복만 갈아입기","운동복 입고 현관까지","집 근처 5분 산책","헬스장 입구까지만","헬스장 들어가서 15분","헬스장 30분","헬스장 1시간"],
  hometraining: ["운동복만 갈아입기","매트 꺼내서 펼치기","스트레칭 3분","유튜브 홈트 영상 틀어놓기","홈트 10분","홈트 20분","홈트 30분"],
  walking:      ["운동화 꺼내놓기","운동복 입고 현관까지","집 앞 5분 걷기","동네 한 바퀴 (10분)","20분 걷기","30분 걷기 or 10분 달리기","5km"],
  sleep:        ["오늘 취침 목표 시간 확인하기","목표 시간 30분 전 눕기 준비 시작","목표 시간에 눕기","목표 시간 -5분에 눕기","목표 시간 3일 연속 지키기","목표 시간 5일 연속 지키기","목표 시간 7일 연속 지키기"],
  morning:      ["물 한 잔 마시기","물 한 잔 + 커튼 or 창문 열기","물 한 잔 + 커튼 or 창문 열기 + 1분 스트레칭","물 한 잔 + 커튼 or 창문 열기 + 3분 스트레칭","물 한 잔 + 커튼 or 창문 열기 + 5분 스트레칭","물 한 잔 + 커튼 or 창문 열기 + 5분 스트레칭 + 오늘 할 일 1개 적기","물 한 잔 + 커튼 or 창문 열기 + 10분 스트레칭 + 오늘 할 일 3개 적기"],
  evening:      ["자기 전 오늘 하루 감사한 것 1가지 떠올리기","감사일기 1줄 적기","감사일기 2줄 적기","감사일기 3줄 적기","감사일기 3줄 + 플래너 준비하기","감사일기 3줄 + 플래너에 내일 할 일 1개 적기","감사일기 3줄 + 플래너에 내일 할 일 1개 적기 + 침대에서 핸드폰 하지 않기"],
  space:        ["오늘 쓴 물건 1개 제자리에 놓기","오늘 쓴 물건 전부 제자리에 놓기","책상 위 물건 전부 제자리에 놓기","책상 + 침대 주변 정리하기","방 바닥에 아무것도 없는 상태 만들기","자기 전 방 전체 5분 정리하기","자기 전 방 둘러보고 제자리 아닌 물건 없는지 확인하기"]
};

const ENERGY_MISSIONS = {
  'low-low':   "창문 열고 바깥 1분 바라보기",
  'low-mid':   "물 한 잔 천천히 마시기",
  'low-high':  "오늘 딱 한 가지만 적어보기",
  'mid-low':   "5분 산책 또는 스트레칭",
  'mid-mid':   "가장 중요한 일 25분 집중",
  'mid-high':  "오늘 배운 것 3줄 기록",
  'high-low':  "몸 먼저 — 10분 가볍게 움직이기",
  'high-mid':  "가장 미뤄온 일 시작하기",
  'high-high': "새로운 루틴 하나 추가해보기"
};

const EMPATHY_MSGS = [
  "며칠 잘 하다 무너졌어도 괜찮아. 오늘 이 미션 하나면 1%야.",
  "하루가 아무리 바빠도 이 미션은 30초야. 그게 오늘의 1%.",
  "오늘 하루가 망했어도 괜찮아. 이 미션 하나로 1%는 지켜.",
  "귀찮은 하루가 맞아. 그래도 이것만. 30초면 돼."
];

const MAINTAIN_MSGS = {
  1: '잘 지키고 있어. 이게 습관이 되는 거야.',
  2: '이틀째야. 흔들리지 않고 있어.',
  3: '3일째 유지 중. 이 정도면 진짜 잡힌 거야.'
};

/* ── 카테고리 메타 ── */
const CATEGORIES = ['health', 'sleep', 'routine'];
const CAT_META = {
  health:  { label: '운동/건강',     icon: '🏃' },
  sleep:   { label: '수면/기상',     icon: '😴' },
  routine: { label: '루틴/생활습관', icon: '📋' }
};

function getCatIcon(cat, type) {
  if (cat === 'health') {
    if (type === 'gym')          return '🏋️';
    if (type === 'hometraining') return '🏠';
    if (type === 'walking')      return '🚶';
    return '🏃';
  }
  if (cat === 'routine') {
    if (type === 'morning') return '🌅';
    return '📋';
  }
  return CAT_META[cat]?.icon || '';
}

function getCatName(cat, type) {
  if (cat === 'health') {
    if (type === 'gym')          return '헬스장';
    if (type === 'hometraining') return '홈트';
    if (type === 'walking')      return '걷기/달리기';
    return '운동/건강';
  }
  if (cat === 'routine') {
    if (type === 'morning') return '아침 루틴';
    return '루틴/생활습관';
  }
  return CAT_META[cat]?.label || '';
}

/* ── localStorage 카테고리 헬퍼 ── */
function getCatData(cat) {
  try {
    const d = localStorage.getItem('sloo_' + cat);
    return d ? JSON.parse(d) : null;
  } catch(e) { return null; }
}

function setCatData(cat, obj) {
  localStorage.setItem('sloo_' + cat, JSON.stringify(obj));
}

function resetCat(cat) {
  localStorage.removeItem('sloo_' + cat);
}

function newCatObj() {
  return {
    active: true,
    type: null,
    level: 1,
    growth_count: 0,
    total_count: 0,
    maintain_count: 0,
    last_date: null,
    history: [],
    fail_reason: 0
  };
}

function addCatHistory(cat, type) {
  const data = getCatData(cat);
  if (!data) return;
  const t = today();
  data.history = (data.history || []).filter(h => h.date !== t);
  data.history.push({ date: t, type });
  if (data.history.length > 30) data.history = data.history.slice(-30);
  setCatData(cat, data);
}

function pushHistory(data, type, t) {
  data.history = (data.history || []).filter(h => h.date !== t);
  data.history.push({ date: t, type });
  if (data.history.length > 30) data.history = data.history.slice(-30);
}

/* ── 기존 데이터 마이그레이션 ── */
function migrateFromLegacy() {
  // 이미 새 구조가 있으면 스킵
  if (CATEGORIES.some(k => localStorage.getItem('sloo_' + k))) return;
  const oldCat = localStorage.getItem('sloo_category');
  if (!oldCat) return;

  const obj = newCatObj();
  obj.type = localStorage.getItem('sloo_type') || null;
  obj.level = parseInt(localStorage.getItem('sloo_level') || '1');
  obj.growth_count = parseInt(localStorage.getItem('sloo_growth_count') || '0');
  obj.total_count  = parseInt(localStorage.getItem('sloo_total_count') || '0');
  obj.maintain_count = parseInt(localStorage.getItem('sloo_maintain_streak') || '0');
  obj.last_date = localStorage.getItem('sloo_last_date') || null;
  obj.fail_reason = parseInt(localStorage.getItem('sloo_fail_reason') || '0');
  try { obj.history = JSON.parse(localStorage.getItem('sloo_history') || '[]'); } catch(e) {}

  setCatData(oldCat, obj);

  ['sloo_category','sloo_type','sloo_fail_reason','sloo_level','sloo_days',
   'sloo_last_date','sloo_completed_today','sloo_maintain_count','sloo_energy',
   'sloo_mental','sloo_growth_count','sloo_total_count','sloo_history','sloo_maintain_streak']
    .forEach(k => localStorage.removeItem(k));
}

/* ── 오늘 날짜 ── */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── 화면 전환 ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── 성장 헬퍼 ── */
function multStr(n) { return Math.pow(1.01, n).toFixed(2); }
function getGrowthMsg(n) {
  if (n >= 365) return "1년. 37.78배. 말이 필요 없어.";
  if (n >= 100) return "100일. 2.70배. 진짜 달라졌어.";
  if (n >= 30)  return "한 달. 이제 습관이 되고 있어.";
  if (n >= 7)   return "일주일 됐어. 1.07배의 너야.";
  return "첫 번째 1%. 시작이 전부야.";
}
function getPlantIcon(n) {
  if (n >= 101) return "🌲";
  if (n >= 31)  return "🌳";
  if (n >= 8)   return "🌿";
  return "🌱";
}
function getGrowthStage(n) {
  if (n >= 61) return { emoji: '✨🌲', stage: 4 };
  if (n >= 31) return { emoji: '🌲',   stage: 3 };
  if (n >= 16) return { emoji: '🌳',   stage: 2 };
  if (n >= 6)  return { emoji: '🌿',   stage: 1 };
  return           { emoji: '🌱',   stage: 0 };
}

function showGrowthAnimation(oldGc, newGc, callback) {
  const oldStage = getGrowthStage(oldGc);
  const newStage = getGrowthStage(newGc);
  const levelUp  = newStage.stage > oldStage.stage;

  const overlay  = document.getElementById('growth-anim-overlay');
  const plantEl  = document.getElementById('growth-anim-plant');
  const msgEl    = document.getElementById('growth-anim-msg');

  // 초기화
  plantEl.textContent = oldStage.emoji;
  plantEl.className   = 'growth-anim-plant';
  msgEl.textContent   = '';
  msgEl.className     = 'growth-anim-msg';
  overlay.style.display = 'flex';

  if (levelUp) {
    plantEl.classList.add('plant-grow-out');
    setTimeout(() => {
      plantEl.textContent = newStage.emoji;
      plantEl.className   = 'growth-anim-plant plant-grow-in';
      msgEl.textContent   = '한 단계 성장했어! 🎉';
      msgEl.classList.add('show');
    }, 480);
    setTimeout(() => { overlay.style.display = 'none'; callback(); }, 1400);
  } else {
    plantEl.textContent = newStage.emoji;
    plantEl.classList.add('plant-pulse');
    msgEl.textContent   = '오늘도 지켰어 💪';
    msgEl.classList.add('show');
    setTimeout(() => { overlay.style.display = 'none'; callback(); }, 1300);
  }
}

function getNextMissionPreview(data) {
  if (!data.type || !MISSIONS[data.type]) return null;
  const lv = data.level || 1;
  if (lv >= 7) return '이 루틴은 완전히 잡혔어. 새로운 도전을 추가해볼까? 🔥';
  return getExerciseMission(data.type, lv + 1);
}

function getExerciseMission(type, level) {
  const arr = MISSIONS[type];
  return arr ? arr[Math.min(level - 1, 6)] : '';
}

/* ════════════════════════
   홈 화면
════════════════════════ */
function showHome() {
  renderHomeCards();
  renderHomeGrass();
  updateSidebar();
  showScreen('screen-home');
}

function renderHomeCards() {
  const container = document.getElementById('home-cards');
  if (!container) return;

  const todayStr = today();
  let html = '';

  CATEGORIES.forEach(cat => {
    const data = getCatData(cat);
    if (!data || !data.active) return;

    const meta = CAT_META[cat];
    const icon = getCatIcon(cat, data.type);
    const name = getCatName(cat, data.type) || meta.label;
    const mult = Math.round(Math.pow(1.01, data.growth_count) * 100) / 100;
    const doneToday = false; // TEST: 날짜 제한 임시 해제 — 테스트 후 원복: data.last_date === todayStr

    html += `<div class="home-cat-card home-cat-active">
      <div class="home-cat-top">
        <span class="home-cat-icon">${icon}</span>
        <div class="home-cat-info">
          <div class="home-cat-name">${name}</div>
          <div class="home-cat-meta">레벨 ${data.level} · ${mult.toFixed(2)}배</div>
        </div>
        <button class="home-cat-reset-btn" data-cat="${cat}" title="${name} 초기화">↺</button>
      </div>
      ${doneToday
        ? `<button class="home-cat-done-btn" disabled>오늘 1% 완료했어 🌱</button>`
        : `<button class="home-cat-mission-btn" data-cat="${cat}">오늘 미션 하기 →</button>`
      }
    </div>`;
  });

  const inactiveCats = CATEGORIES.filter(cat => { const d = getCatData(cat); return !d || !d.active; });
  if (inactiveCats.length > 0) {
    html += `<div class="home-add-section">`;
    inactiveCats.forEach(cat => {
      const meta = CAT_META[cat];
      const icon = getCatIcon(cat, null);
      html += `<button class="home-add-cat-btn" data-cat="${cat}">+ ${icon} ${meta.label} 추가하기</button>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;

  container.querySelectorAll('.home-cat-mission-btn').forEach(btn => {
    btn.addEventListener('click', () => startCatMission(btn.dataset.cat));
  });
  container.querySelectorAll('.home-cat-reset-btn').forEach(btn => {
    btn.addEventListener('click', () => openResetModal(btn.dataset.cat));
  });
  container.querySelectorAll('.home-add-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => startCatOnboarding(btn.dataset.cat));
  });
}

/* ── 카테고리 미션 시작 ── */
function startCatMission(cat) {
  currentMissionCategory = cat;
  const data = getCatData(cat);
  if (!data) return;
  if (cat === 'health' || cat === 'sleep' || (cat === 'routine' && data.type)) {
    showMainChoice();
  } else {
    showDailyState();
  }
}

/* ── 카테고리 온보딩 (홈에서 "추가하기" 클릭 시) ── */
function startCatOnboarding(cat) {
  currentOnboardingCategory = cat;
  if (cat === 'health') {
    document.getElementById('ob2ex-step-text').textContent = '1 / 2';
    document.getElementById('ob2ex-step-fill').style.width = '50%';
    document.querySelectorAll('.ob2ex-card').forEach(c => c.classList.remove('selected'));
    showScreen('screen-ob2-exercise');
  } else if (cat === 'sleep') {
    obSleepBedtime = null;
    obSleepAdvanceMinutes = null;
    document.getElementById('ob-sleep-bt-step-text').textContent = '1 / 3';
    document.getElementById('ob-sleep-bt-step-fill').style.width = '33%';
    document.querySelectorAll('.ob-sleep-bt-card').forEach(c => c.classList.remove('selected'));
    showScreen('screen-ob-sleep-bedtime');
  } else if (cat === 'routine') {
    obPendingType = null;
    document.getElementById('ob2rt-step-text').textContent = '1 / 2';
    document.getElementById('ob2rt-step-fill').style.width = '50%';
    document.querySelectorAll('.ob2rt-card').forEach(c => c.classList.remove('selected'));
    showScreen('screen-ob2-routine');
  } else {
    document.getElementById('reason-step-text').textContent = '1 / 2';
    document.getElementById('reason-step-fill').style.width = '50%';
    document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
    showScreen('screen-ob-reason');
  }
}

/* ════════════════════════
   랜딩 화면
════════════════════════ */
function showLanding() {
  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // const alreadyDone = ... (multi-cat: no single "alreadyDone")
  const btn = document.getElementById('btn-start');
  const msg = document.getElementById('landing-done-msg');
  btn.disabled = false;
  msg.style.display = 'none';
  showScreen('screen-landing');
}

/* ════════════════════════
   앱 진입점
════════════════════════ */
function init() {
  migrateFromLegacy();
  updateSidebar();
  const hasAny = CATEGORIES.some(k => getCatData(k)?.active);
  if (hasAny) {
    showHome();
  } else {
    showLanding();
  }
}

/* ── A/B 선택 화면 (운동) ── */
function showMainChoice() {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  const el = document.getElementById('screen-main');
  el.querySelector('.main-days').textContent = data.total_count;
  el.querySelector('.main-mult').textContent = multStr(data.growth_count);
  el.querySelector('.main-level').textContent = data.level;

  const currentMission = getExerciseMission(data.type, data.level);
  const nextMission = data.level < 7
    ? getExerciseMission(data.type, data.level + 1)
    : '최고 레벨! 다음 카테고리를 추가해봐';
  el.querySelector('.card-grow-preview').textContent = nextMission;
  el.querySelector('.card-maintain-preview').textContent = currentMission;

  const aCard = document.getElementById('choice-a-card');
  if (data.level >= 7) {
    aCard.querySelector('.ab-card-title').textContent = '최고 레벨 달성 🏆';
    aCard.querySelector('.ab-badge').textContent = '완성';
  } else {
    aCard.querySelector('.ab-card-title').textContent = '오늘 1% 더 성장할래?';
    aCard.querySelector('.ab-badge').textContent = '성장';
  }
  checkMaintainBanner();
  showScreen('screen-main');
}

/* ── 수면·루틴 일일 상태 선택 ── */
function showDailyState() {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  const el = document.getElementById('screen-daily-state');
  el.querySelector('.daily-days').textContent = data.total_count;
  el.querySelector('.daily-mult').textContent = multStr(data.growth_count);
  document.querySelectorAll('.state-opt2').forEach(o => o.classList.remove('active'));
  dailySelections.energy = null;
  dailySelections.mental = null;
  document.getElementById('btn-daily-mission').disabled = true;
  showScreen('screen-daily-state');
}

/* ── 미션 화면 (A/B 선택 후) ── */
let currentChoice = null;
function showMissionScreen(choice) {
  currentChoice = choice;
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  let missionText;
  if (choice === 'grow') {
    missionText = data.level < 7
      ? getExerciseMission(data.type, data.level + 1)
      : getExerciseMission(data.type, 7);
  } else {
    missionText = getExerciseMission(data.type, data.level);
  }
  document.getElementById('mission-empathy').textContent = EMPATHY_MSGS[data.fail_reason || 0];
  document.getElementById('mission-text').textContent = missionText;
  const badge = document.getElementById('mission-choice-badge');
  badge.textContent = choice === 'grow' ? '🌱 성장 모드' : '🔄 유지 모드';
  badge.className = 'mission-badge ' + (choice === 'grow' ? 'grow' : 'maintain');
  document.getElementById('mission-result').textContent = '';
  document.getElementById('mission-result').className = 'result-msg';
  document.getElementById('mission-growth-card').classList.remove('show');
  document.getElementById('mg-max-level').style.display = 'none';
  document.getElementById('mission-action-btns').style.display = '';
  document.getElementById('btn-mission-home').style.display = 'none';
  document.getElementById('btn-mission-back').style.display = '';
  const isEvening = cat === 'routine' && data?.type === 'evening';
  document.getElementById('mission-gratitude-link').style.display = isEvening ? '' : 'none';
  showScreen('screen-mission');
}

/* ── 첫 미션 화면 ── */
function showFirstMission(energy, mental) {
  currentMissionCategory = currentMissionCategory || currentOnboardingCategory;
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  let missionText;
  if (cat === 'health') {
    missionText = getExerciseMission(data.type, data.level || 1);
  } else if (cat === 'sleep') {
    missionText = getExerciseMission('sleep', data.level || 1);
  } else if (cat === 'routine' && data.type) {
    missionText = getExerciseMission(data.type, data.level || 1);
  } else {
    const e = energy || 'mid';
    const m = mental || 'mid';
    missionText = ENERGY_MISSIONS[e + '-' + m] || '';
  }
  document.getElementById('first-empathy-msg').textContent = EMPATHY_MSGS[data?.fail_reason || 0];
  document.getElementById('first-mission-text').textContent = missionText;
  document.getElementById('first-result-msg').textContent = '';
  document.getElementById('first-result-msg').className = 'result-msg';
  document.getElementById('first-growth-card').classList.remove('show');
  document.getElementById('first-action-btns').style.display = '';
  document.getElementById('btn-first-home').style.display = 'none';
  const isEveningFirst = cat === 'routine' && data?.type === 'evening';
  document.getElementById('first-gratitude-link').style.display = isEveningFirst ? '' : 'none';
  showScreen('screen-first-mission');
}

/* ════════════════════════
   이벤트 리스너
════════════════════════ */

/* 온보딩 상태 */
let currentOnboardingCategory = null;
let currentMissionCategory = null;
let obPendingType = null;
let obPendingReason = 0;
let pendingResetCategory = null;
let obSleepBedtime = null;
let obSleepAdvanceMinutes = null;

/* 랜딩 → 온보딩 or 홈 */
document.getElementById('btn-start').addEventListener('click', () => {
  const hasAny = CATEGORIES.some(k => getCatData(k)?.active);
  if (hasAny) {
    showHome();
  } else {
    document.querySelectorAll('.ob1-card').forEach(c => c.classList.remove('selected'));
    showScreen('screen-ob1');
  }
});

/* 온보딩1: 카테고리 선택 (초기 진입) */
document.querySelectorAll('.ob1-card').forEach(card => {
  card.addEventListener('click', () => {
    currentOnboardingCategory = card.dataset.val;
    document.querySelectorAll('.ob1-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      if (card.dataset.val === 'health') {
        document.getElementById('ob2ex-step-text').textContent = '2 / 3';
        document.getElementById('ob2ex-step-fill').style.width = '66%';
        document.querySelectorAll('.ob2ex-card').forEach(c => c.classList.remove('selected'));
        showScreen('screen-ob2-exercise');
      } else if (card.dataset.val === 'sleep') {
        obSleepBedtime = null;
        obSleepAdvanceMinutes = null;
        document.getElementById('ob-sleep-bt-step-text').textContent = '2 / 4';
        document.getElementById('ob-sleep-bt-step-fill').style.width = '50%';
        document.querySelectorAll('.ob-sleep-bt-card').forEach(c => c.classList.remove('selected'));
        showScreen('screen-ob-sleep-bedtime');
      } else {
        obPendingType = null;
        document.getElementById('ob2rt-step-text').textContent = '2 / 3';
        document.getElementById('ob2rt-step-fill').style.width = '66%';
        document.querySelectorAll('.ob2rt-card').forEach(c => c.classList.remove('selected'));
        showScreen('screen-ob2-routine');
      }
    }, 280);
  });
});

/* 온보딩2 (루틴): 루틴 종류 선택 */
document.querySelectorAll('.ob2rt-card').forEach(card => {
  card.addEventListener('click', () => {
    obPendingType = card.dataset.val;
    document.querySelectorAll('.ob2rt-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      const isInit = document.getElementById('ob2rt-step-text').textContent.includes('/ 3');
      document.getElementById('reason-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
      document.getElementById('reason-step-fill').style.width = '100%';
      document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
      showScreen('screen-ob-reason');
    }, 280);
  });
});

/* 온보딩2 (운동): 운동 종류 선택 */
document.querySelectorAll('.ob2ex-card').forEach(card => {
  card.addEventListener('click', () => {
    obPendingType = card.dataset.val;
    document.querySelectorAll('.ob2ex-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      // 초기 온보딩: 3/3, 홈에서 추가: 2/2
      const isInit = document.getElementById('ob2ex-step-text').textContent.includes('/ 3');
      document.getElementById('reason-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
      document.getElementById('reason-step-fill').style.width = '100%';
      document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
      showScreen('screen-ob-reason');
    }, 280);
  });
});

/* 온보딩 (수면): 취침 시간 선택 */
document.querySelectorAll('.ob-sleep-bt-card').forEach(card => {
  card.addEventListener('click', () => {
    obSleepBedtime = card.dataset.val;
    document.querySelectorAll('.ob-sleep-bt-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      // 초기 온보딩: 2/4 → 3/4, 홈에서 추가: 1/3 → 2/3
      const isInit = document.getElementById('ob-sleep-bt-step-text').textContent.includes('/ 4');
      document.getElementById('ob-sleep-adv-step-text').textContent = isInit ? '3 / 4' : '2 / 3';
      document.getElementById('ob-sleep-adv-step-fill').style.width = isInit ? '75%' : '66%';
      document.querySelectorAll('.ob-sleep-adv-card').forEach(c => c.classList.remove('selected'));
      showScreen('screen-ob-sleep-advance');
    }, 280);
  });
});

/* 온보딩 (수면): 앞당길 분 선택 */
document.querySelectorAll('.ob-sleep-adv-card').forEach(card => {
  card.addEventListener('click', () => {
    obSleepAdvanceMinutes = parseInt(card.dataset.val);
    document.querySelectorAll('.ob-sleep-adv-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      // 초기 온보딩: 3/4 → 4/4, 홈에서 추가: 2/3 → 3/3
      const isInit = document.getElementById('ob-sleep-adv-step-text').textContent.includes('/ 4');
      document.getElementById('reason-step-text').textContent = isInit ? '4 / 4' : '3 / 3';
      document.getElementById('reason-step-fill').style.width = '100%';
      document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
      showScreen('screen-ob-reason');
    }, 280);
  });
});

/* 온보딩: 실패 이유 선택 */
document.querySelectorAll('.reason-card').forEach(card => {
  card.addEventListener('click', () => {
    obPendingReason = parseInt(card.dataset.val);
    document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const cat = currentOnboardingCategory;
    setTimeout(() => {
      if (cat === 'health' || cat === 'sleep' || (cat === 'routine' && obPendingType)) {
        // 운동/수면/루틴(타입있음): 카테고리 데이터 생성 후 첫 미션
        const obj = newCatObj();
        obj.fail_reason = obPendingReason;
        if (cat === 'health' || (cat === 'routine' && obPendingType)) {
          obj.type = obPendingType;
        } else {
          obj.type = 'sleep';
          if (obSleepBedtime !== null)        obj.bedtime_current = obSleepBedtime;
          if (obSleepAdvanceMinutes !== null) obj.bedtime_target_minutes = obSleepAdvanceMinutes;
        }
        setCatData(cat, obj);
        currentMissionCategory = cat;
        if (cat === 'health' || cat === 'sleep') {
          showScreen('screen-ob-loading');
          setTimeout(showFirstMission, 2000 + Math.random() * 500);
        } else {
          showFirstMission();
        }
      } else {
        // 루틴: 에너지·멘탈 선택 화면으로
        document.querySelectorAll('.state-opt').forEach(o => o.classList.remove('active'));
        obSelections.energy = null;
        obSelections.mental = null;
        document.getElementById('btn-get-mission').disabled = true;
        // ob-state 진행 텍스트: reason 단계의 total과 동일하게 맞춤
        const reasonText = document.getElementById('reason-step-text').textContent;
        const total = reasonText.split('/')[1]?.trim() || '3';
        document.querySelector('#screen-ob-state .progress-text').textContent = `${total} / ${total}`;
        document.querySelector('#screen-ob-state .progress-fill').style.width = '100%';
        showScreen('screen-ob-state');
      }
    }, 280);
  });
});

/* 온보딩: 에너지/멘탈 (수면/루틴 첫 세팅) */
const obSelections = { energy: null, mental: null };
document.querySelectorAll('.state-group').forEach(group => {
  group.querySelectorAll('.state-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      group.querySelectorAll('.state-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      obSelections[group.dataset.group] = opt.dataset.val;
      document.getElementById('btn-get-mission').disabled = !(obSelections.energy && obSelections.mental);
    });
  });
});

document.getElementById('btn-get-mission').addEventListener('click', () => {
  const cat = currentOnboardingCategory;
  const obj = newCatObj();
  obj.fail_reason = obPendingReason;
  setCatData(cat, obj);
  currentMissionCategory = cat;
  showFirstMission(obSelections.energy, obSelections.mental);
});

/* ── 첫 미션: 완료 ── */
document.getElementById('btn-first-done').addEventListener('click', () => {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  if (!data) return;

  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // if (data.last_date === today()) { ... return; }

  const t = today();
  const oldGc = data.growth_count || 0;
  data.total_count = (data.total_count || 0) + 1;
  data.growth_count = oldGc + 1;
  data.maintain_count = 0;
  data.last_date = t;
  pushHistory(data, 'growth', t);
  setCatData(cat, data);
  updateSidebar();

  document.getElementById('first-action-btns').style.display = 'none';

  showGrowthAnimation(oldGc, data.growth_count, () => {
    const tc = data.total_count;
    const gc = data.growth_count;
    const msg = document.getElementById('first-result-msg');
    msg.innerHTML = `오늘 1% 완료 🌱<br><small>${tc}회째. 1.01<sup>${gc}</sup> = ${multStr(gc)}배의 당신.</small>`;
    msg.className = 'result-msg done-msg show';

    document.getElementById('fg-plant').textContent = getPlantIcon(gc);
    document.getElementById('fg-formula').innerHTML = `1.01<sup>${gc}</sup> = ${multStr(gc)}배의 당신입니다`;
    document.getElementById('fg-msg').textContent = getGrowthMsg(gc);
    const fgNext = getNextMissionPreview(data);
    const fgNextEl = document.getElementById('fg-next-preview');
    if (fgNext && fgNextEl) {
      fgNextEl.innerHTML = `<span class="next-mission-label">내일의 1% 👀</span><span class="next-mission-text">${fgNext}</span>`;
      fgNextEl.style.display = '';
    }
    document.getElementById('first-growth-card').classList.add('show');
    document.getElementById('btn-first-home').style.display = '';
  });
});

/* ── 첫 미션: 패스 ── */
document.getElementById('btn-first-pass').addEventListener('click', () => {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  if (data) {
    data.maintain_count = 0;
    pushHistory(data, 'pass', today());
    setCatData(cat, data);
    updateSidebar();
  }
  const msg = document.getElementById('first-result-msg');
  msg.textContent = '오늘은 쉬어가도 돼. 내일 다시 켜면 돼.';
  msg.className = 'result-msg pass-msg show';
  document.getElementById('first-action-btns').style.display = 'none';
  document.getElementById('btn-first-home').style.display = '';
});

/* ── 메인: A/B 카드 ── */
document.getElementById('choice-a-card').addEventListener('click', () => showMissionScreen('grow'));
document.getElementById('choice-b-card').addEventListener('click', () => showMissionScreen('maintain'));

/* ── 미션: 완료 ── */
document.getElementById('btn-mission-done').addEventListener('click', () => {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  if (!data) return;

  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // if (data.last_date === today()) { ... return; }

  const t = today();
  const oldGc = data.growth_count || 0;
  data.total_count = (data.total_count || 0) + 1;
  data.last_date = t;

  if (currentChoice === 'grow') {
    if (data.level < 7) data.level++;
    data.growth_count = oldGc + 1;
    data.maintain_count = 0;
    pushHistory(data, 'growth', t);
  } else {
    data.maintain_count = (data.maintain_count || 0) + 1;
    pushHistory(data, 'maintain', t);
  }

  setCatData(cat, data);
  updateSidebar();
  document.getElementById('mission-action-btns').style.display = 'none';
  document.getElementById('btn-mission-back').style.display = 'none';

  showGrowthAnimation(oldGc, data.growth_count, () => {
    const msg = document.getElementById('mission-result');
    if (currentChoice === 'grow') {
      msg.innerHTML = `오늘 1% 완료 🌱<br><small>${data.total_count}회째. ${multStr(data.growth_count)}배의 당신. 레벨 ${data.level} 달성! 🎉</small>`;
    } else {
      const subMsg = MAINTAIN_MSGS[data.maintain_count] || MAINTAIN_MSGS[3];
      msg.innerHTML = `오늘도 1.01배 유지 완료 🔄<br><small>${subMsg}</small>`;
    }
    msg.className = 'result-msg done-msg show';

    const gc = data.growth_count;
    document.getElementById('mg-plant').textContent = getPlantIcon(gc);
    document.getElementById('mg-formula').innerHTML = `1.01<sup>${gc}</sup> = ${multStr(gc)}배의 당신입니다`;
    document.getElementById('mg-msg').textContent = getGrowthMsg(gc);
    const mgNext = getNextMissionPreview(data);
    const mgNextEl = document.getElementById('mg-next-preview');
    if (mgNext && mgNextEl) {
      mgNextEl.innerHTML = `<span class="next-mission-label">내일의 1% 👀</span><span class="next-mission-text">${mgNext}</span>`;
      mgNextEl.style.display = '';
    }
    document.getElementById('mission-growth-card').classList.add('show');
    if (data.level >= 7) document.getElementById('mg-max-level').style.display = '';
    document.getElementById('btn-mission-home').style.display = '';
  });
});

/* ── 미션: 패스 ── */
document.getElementById('btn-mission-pass').addEventListener('click', () => {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  if (data) {
    data.maintain_count = 0;
    pushHistory(data, 'pass', today());
    setCatData(cat, data);
    updateSidebar();
  }
  const msg = document.getElementById('mission-result');
  msg.textContent = '오늘은 쉬어가도 돼. 내일 다시 켜면 돼.';
  msg.className = 'result-msg pass-msg show';
  document.getElementById('mission-action-btns').style.display = 'none';
  document.getElementById('btn-mission-back').style.display = 'none';
  document.getElementById('btn-mission-home').style.display = '';
});

/* ── 뒤로가기 (미션 → A/B 선택) ── */
document.getElementById('btn-mission-back').addEventListener('click', showMainChoice);

/* ── 홈으로 돌아가기 ── */
document.getElementById('btn-first-home').addEventListener('click', showHome);
document.getElementById('btn-mission-home').addEventListener('click', showHome);

/* ── 유지 3일 연속 배너 ── */
document.getElementById('btn-banner-grow').addEventListener('click', () => {
  document.getElementById('maintain-banner').style.display = 'none';
  const data = getCatData(currentMissionCategory);
  if (data) { data.maintain_count = 0; setCatData(currentMissionCategory, data); }
  showMissionScreen('grow');
});
document.getElementById('btn-banner-stay').addEventListener('click', () => {
  document.getElementById('maintain-banner').style.display = 'none';
  const data = getCatData(currentMissionCategory);
  if (data) { data.maintain_count = 0; setCatData(currentMissionCategory, data); }
});

/* ── 다음 카테고리 추가 (최고 레벨) ── */
document.getElementById('btn-add-category').addEventListener('click', showHome);

/* ── 수면·루틴 재방문: 에너지/멘탈 ── */
const dailySelections = { energy: null, mental: null };
document.querySelectorAll('.state-group2').forEach(group => {
  group.querySelectorAll('.state-opt2').forEach(opt => {
    opt.addEventListener('click', () => {
      group.querySelectorAll('.state-opt2').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      dailySelections[group.dataset.group] = opt.dataset.val;
      document.getElementById('btn-daily-mission').disabled = !(dailySelections.energy && dailySelections.mental);
    });
  });
});
document.getElementById('btn-daily-mission').addEventListener('click', () => {
  showFirstMission(dailySelections.energy, dailySelections.mental);
});

/* ── 로고 클릭 ── */
document.getElementById('nav-logo').addEventListener('click', e => {
  e.preventDefault();
  init();
});

/* ── 초기화 모달 ── */
function openResetModal(cat) {
  pendingResetCategory = cat || null;
  const msg = document.querySelector('#modal-reset .modal-msg');
  if (cat) {
    const meta = CAT_META[cat];
    const data = getCatData(cat);
    const name = getCatName(cat, data?.type);
    msg.innerHTML = `<strong>${getCatIcon(cat, data?.type)} ${name}</strong> 기록이 사라져요.<br>정말 초기화할까요?`;
  } else {
    msg.innerHTML = '모든 기록이 사라져요.<br>정말 처음부터 시작할까요?';
  }
  document.getElementById('modal-reset').style.display = 'flex';
}

document.getElementById('btn-reset').addEventListener('click', () => openResetModal(null));

document.getElementById('modal-reset-cancel').addEventListener('click', () => {
  document.getElementById('modal-reset').style.display = 'none';
  pendingResetCategory = null;
});

document.getElementById('modal-reset-ok').addEventListener('click', () => {
  document.getElementById('modal-reset').style.display = 'none';
  if (pendingResetCategory) {
    resetCat(pendingResetCategory);
    pendingResetCategory = null;
    renderHomeCards();
    renderHomeGrass();
    updateSidebar();
  } else {
    CATEGORIES.forEach(k => resetCat(k));
    // 구 키도 정리
    ['sloo_category','sloo_type','sloo_fail_reason','sloo_level','sloo_days',
     'sloo_last_date','sloo_completed_today','sloo_maintain_count','sloo_energy',
     'sloo_mental','sloo_growth_count','sloo_total_count','sloo_history','sloo_maintain_streak']
      .forEach(k => localStorage.removeItem(k));
    document.querySelectorAll('.choice-card, .option').forEach(c => c.classList.remove('selected', 'active'));
    showLanding();
    updateSidebar();
  }
});

document.getElementById('modal-reset').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-reset')) {
    document.getElementById('modal-reset').style.display = 'none';
    pendingResetCategory = null;
  }
});

/* ── 얼리버드 모달 ── */
const earlybirdModal = document.getElementById('modal-earlybird');

function openEarlybirdModal() {
  const form = document.getElementById('modal-earlybird-form');
  const done = document.getElementById('modal-earlybird-done');
  form.reset();
  form.style.display = '';
  done.style.display = 'none';
  earlybirdModal.style.display = 'flex';
  earlybirdModal.querySelector('.modal-earlybird-input').focus();
}

function closeEarlybirdModal() {
  earlybirdModal.style.display = 'none';
}

// nav 링크 클릭 → 모달 오픈 (PC + 모바일)
document.querySelectorAll('a.nav-earlybird, a.nav-earlybird-mobile').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    closeAllMobileMenus();
    openEarlybirdModal();
  });
});

document.getElementById('modal-earlybird-close').addEventListener('click', closeEarlybirdModal);

earlybirdModal.addEventListener('click', e => {
  if (e.target === earlybirdModal) closeEarlybirdModal();
});

document.getElementById('modal-earlybird-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.modal-earlybird-btn');
  btn.disabled = true;
  btn.textContent = '신청 중...';
  try {
    const res = await fetch('https://formspree.io/f/maqdlblk', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    });
    if (res.ok) {
      form.style.display = 'none';
      document.getElementById('modal-earlybird-done').style.display = '';
    } else {
      btn.disabled = false;
      btn.textContent = '신청하기';
    }
  } catch {
    btn.disabled = false;
    btn.textContent = '신청하기';
  }
});

/* ── 감사일기 모달 ── */
function openGratitudeModal() {
  document.getElementById('gratitude-modal-overlay').classList.add('open');
}
function closeGratitudeModal() {
  document.getElementById('gratitude-modal-overlay').classList.remove('open');
}
document.getElementById('first-gratitude-link').addEventListener('click', openGratitudeModal);
document.getElementById('mission-gratitude-link').addEventListener('click', openGratitudeModal);
document.getElementById('gratitude-modal-close').addEventListener('click', closeGratitudeModal);
document.getElementById('gratitude-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('gratitude-modal-overlay')) closeGratitudeModal();
});

function closeAllMobileMenus() {
  const menu = document.getElementById('mobile-nav-dropdown');
  const ham  = document.getElementById('nav-hamburger');
  if (menu) menu.classList.remove('open');
  if (ham)  { ham.classList.remove('open'); ham.setAttribute('aria-expanded', 'false'); }
}

/* ── 모바일 📊 통계 바텀시트 ── */
(function() {
  const overlay = document.getElementById('mobile-stats-overlay');
  const sheet = overlay.querySelector('.mobile-stats-sheet');
  const THRESHOLD = 100;

  function closeSheet() {
    sheet.style.transition = 'transform 0.3s ease';
    sheet.style.transform = 'translateY(110%)';
    setTimeout(() => {
      overlay.classList.remove('open');
      sheet.style.transition = '';
      sheet.style.transform = '';
    }, 300);
  }

  document.getElementById('mobile-stats-btn').addEventListener('click', () => {
    overlay.classList.add('open');
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeSheet();
  });

  /* 스와이프 다운으로 닫기 */
  let startY = 0, dragDelta = 0, dragging = false;

  sheet.addEventListener('touchstart', e => {
    const touchY = e.touches[0].clientY;
    const relY = touchY - sheet.getBoundingClientRect().top;
    if (relY <= 60 || sheet.scrollTop === 0) {
      startY = touchY;
      dragDelta = 0;
      dragging = true;
      sheet.style.transition = 'none';
    }
  }, { passive: true });

  sheet.addEventListener('touchmove', e => {
    if (!dragging) return;
    dragDelta = e.touches[0].clientY - startY;
    if (dragDelta <= 0) { sheet.style.transform = ''; return; }
    sheet.style.transform = `translateY(${dragDelta}px)`;
    if (dragDelta > 10) e.preventDefault();
  }, { passive: false });

  sheet.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    if (dragDelta >= THRESHOLD) {
      closeSheet();
    } else {
      sheet.style.transition = 'transform 0.22s ease';
      sheet.style.transform = 'translateY(0)';
      setTimeout(() => { sheet.style.transition = ''; sheet.style.transform = ''; }, 220);
    }
  }, { passive: true });
})();

/* ── 햄버거 메뉴 ── */
const hamburger = document.getElementById('nav-hamburger');
const mobileMenu = document.getElementById('mobile-nav-dropdown');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ════════════════════════
   사이드바
════════════════════════ */
function updateSidebar() {
  const sidebar = document.getElementById('desktop-sidebar');
  if (!sidebar) return;

  const activeCats = CATEGORIES.filter(k => getCatData(k)?.active);
  if (activeCats.length === 0) {
    sidebar.classList.remove('sb-active');
    document.body.classList.remove('has-sidebar');
    document.getElementById('mobile-summary-bar')?.classList.remove('visible');
    document.getElementById('mobile-stats-btn')?.classList.remove('visible');
    document.body.classList.remove('has-mobile-bar');
    return;
  }
  sidebar.classList.add('sb-active');
  document.body.classList.add('has-sidebar');

  const sbContent = document.getElementById('sb-content');
  if (!sbContent) return;

  const dayNames = ['일','월','화','수','목','금','토'];
  const todayStr = today();
  let html = '';
  let firstActive = true;

  // ── 오늘의 성장 패널 ──
  const TODAY_PANEL_MSGS = [
    '아직 시작 전이야. 오늘 1%를 시작해봐. 🌱',
    '오늘 1% 했어. 충분해. 🌱',
    '오늘 2% 했어. 욕심쟁이네. 😄',
    '오늘 3% 했어. 이러다 37.78배 금방 되겠는데. 🔥'
  ];
  const completedToday = CATEGORIES.filter(k => {
    const d = getCatData(k);
    return d?.active && d?.last_date === todayStr;
  }).length;
  const totalGrowth = CATEGORIES.reduce((sum, k) => {
    const d = getCatData(k);
    return sum + (d?.growth_count || 0);
  }, 0);
  const totalMult = Math.pow(1.01, totalGrowth).toFixed(2);
  const todayMsg = TODAY_PANEL_MSGS[Math.min(completedToday, 3)];
  html += `
    <div class="sb-today-panel">
      <div class="sb-today-title">오늘의 성장</div>
      <div class="sb-today-msg">${todayMsg}</div>
      <div class="sb-today-mult">${totalMult}<span class="sb-today-mult-unit">배</span></div>
      <div class="sb-today-sub">누적 성장률</div>
    </div>
    <div class="sb-sect-divider" style="margin:0 0 20px"></div>
  `;

  CATEGORIES.forEach(cat => {
    const data = getCatData(cat);
    const meta = CAT_META[cat];
    const icon = getCatIcon(cat, data?.type);
    const name = getCatName(cat, data?.type) || meta.label;

    if (!data || !data.active) {
      html += `<div class="sb-cat-inactive-block">${icon} ${meta.label} <span style="font-size:10px">— 미시작</span></div>`;
      return;
    }

    if (!firstActive) html += `<div class="sb-sect-divider" style="margin:24px 0 0"></div>`;
    firstActive = false;

    const mult = Math.round(Math.pow(1.01, data.growth_count || 0) * 100) / 100;
    const level = data.level || 1;
    const totalCount = data.total_count || 0;
    const maintainCount = data.maintain_count || 0;
    const levelPct = Math.min((level / 7) * 100, 100);

    // 마지막 완료 타입으로 성장/유지 판단
    const lastDone = [...(data.history || [])].reverse().find(h => h.type !== 'pass');
    const isGrowthMode = !lastDone || lastDone.type === 'growth';
    const multClass = isGrowthMode ? 'sb-mult-growth' : 'sb-mult-maintain';
    const statusHtml = isGrowthMode
      ? `<div class="sb-status-growth">성장 중 🌱</div>`
      : `<div class="sb-status-maintain">유지 중 🔄</div>`;

    // 다음 레벨 미션
    let nextMissionHtml = '';
    if (data.type && MISSIONS[data.type] && level < 7) {
      nextMissionHtml = `<div class="sb-next-mission">다음 단계: ${MISSIONS[data.type][level]}</div>`;
    }

    // 7일 히스토리 박스
    const histMap = {};
    (data.history || []).forEach(h => { histMap[h.date] = h.type; });
    let dayBoxesHtml = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const t = histMap[ds];
      const dayLabel = dayNames[d.getDay()];
      let dayIcon = '·', boxClass = 'sb-day-box-empty';
      if (t === 'growth')  { dayIcon = '✅'; boxClass = 'sb-day-box-growth'; }
      else if (t === 'maintain') { dayIcon = '🔄'; boxClass = 'sb-day-box-maintain'; }
      else if (t === 'pass')     { dayIcon = '⏭'; boxClass = 'sb-day-box-pass'; }
      const todayClass = ds === todayStr ? ' sb-day-today' : '';
      dayBoxesHtml += `<div class="sb-day-box ${boxClass}${todayClass}">
        <div class="sb-day-label">${dayLabel}</div>
        <div class="sb-day-icon">${dayIcon}</div>
      </div>`;
    }

    html += `
      <div class="sb-sect-label">진행 중인 루틴</div>
      <div class="sb-cat-title">${icon} ${name}</div>

      <div class="sb-sect-divider"></div>
      <div class="sb-sect-label">현재 성장률</div>
      <div class="sb-mult-big ${multClass}">${mult.toFixed(2)}<span class="sb-mult-unit">배</span></div>
      ${statusHtml}

      <div class="sb-sect-divider"></div>
      <div class="sb-sect-label">레벨 진행</div>
      <div class="sb-level-display">레벨 ${level} / 7</div>
      <div class="sb-level-bar-track">
        <div class="sb-level-bar-fill" style="width:${levelPct}%"></div>
      </div>
      ${nextMissionHtml}

      <div class="sb-sect-divider"></div>
      <div class="sb-stats-row">
        <div class="sb-stat-box">
          <div class="sb-stat-num">${totalCount}</div>
          <div class="sb-stat-lbl">총 완료</div>
        </div>
        <div class="sb-stat-box">
          <div class="sb-stat-num">${maintainCount}</div>
          <div class="sb-stat-lbl">연속 유지</div>
        </div>
      </div>

      <div class="sb-sect-divider"></div>
      <div class="sb-sect-label">최근 7일</div>
      <div class="sb-day-row">${dayBoxesHtml}</div>
    `;
  });

  // 잔디밭 섹션 (사이드바 하단)
  const hasAnyActiveCat = CATEGORIES.some(cat => { const d = getCatData(cat); return d && d.active; });
  if (hasAnyActiveCat) {
    html += `
      <div class="sb-sect-divider" style="margin:24px 0 16px"></div>
      ${buildGrassHtml('sb-sect-label')}
    `;
  }

  sbContent.innerHTML = html;

  // 모바일 요약 바 & 바텀시트 동기화
  const msbMult = document.getElementById('msb-mult');
  if (msbMult) msbMult.textContent = totalMult;
  document.getElementById('mobile-summary-bar')?.classList.add('visible');
  document.getElementById('mobile-stats-btn')?.classList.add('visible');
  document.body.classList.add('has-mobile-bar');
  const mobileStatsContent = document.getElementById('mobile-stats-content');
  if (mobileStatsContent) mobileStatsContent.innerHTML = html;
}

function checkMaintainBanner() {
  const cat = currentMissionCategory;
  const data = cat ? getCatData(cat) : null;
  const banner = document.getElementById('maintain-banner');
  if (!banner) return;
  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // if ((data?.maintain_count || 0) >= 3 && data.last_date !== today()) {
  if ((data?.maintain_count || 0) >= 3) {
    banner.style.display = '';
  } else {
    banner.style.display = 'none';
  }
}

/* ════════════════════════
   잔디밭 (Grass Grid)
════════════════════════ */
function buildGrassMap() {
  const grassMap = {};
  CATEGORIES.forEach(cat => {
    const data = getCatData(cat);
    if (!data) return;
    (data.history || []).forEach(h => {
      const existing = grassMap[h.date];
      if (!existing) {
        grassMap[h.date] = h.type;
      } else if (h.type === 'growth') {
        grassMap[h.date] = 'growth';
      } else if (h.type === 'maintain' && existing !== 'growth') {
        grassMap[h.date] = 'maintain';
      }
    });
  });
  return grassMap;
}

function buildGrassHtml(titleClass) {
  const grassMap = buildGrassMap();
  let cellsHtml = '';
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const type = grassMap[ds];
    let bg, tip;
    if (type === 'growth')       { bg = '#F97316';                tip = `${mm}/${dd} 성장 완료`; }
    else if (type === 'maintain') { bg = 'rgba(249,115,22,0.4)'; tip = `${mm}/${dd} 유지 완료`; }
    else                          { bg = 'rgba(255,255,255,0.06)'; tip = `${mm}/${dd} 미완료`; }
    cellsHtml += `<div class="grass-cell" style="background:${bg}" data-tip="${tip}"></div>`;
  }
  return `
    <div class="${titleClass || 'sb-sect-label'}">30일 기록</div>
    <div class="grass-grid">${cellsHtml}</div>
    <div class="grass-legend">
      <span class="grass-legend-item"><span class="grass-dot" style="background:rgba(255,255,255,0.06)"></span>미완료</span>
      <span class="grass-legend-item"><span class="grass-dot" style="background:rgba(249,115,22,0.4)"></span>유지</span>
      <span class="grass-legend-item"><span class="grass-dot" style="background:#F97316"></span>성장</span>
    </div>
  `;
}

function renderHomeGrass() {
  const section = document.getElementById('home-grass-section');
  if (!section) return;
  const hasAnyActive = CATEGORIES.some(cat => { const d = getCatData(cat); return d && d.active; });
  if (!hasAnyActive) { section.style.display = 'none'; return; }
  section.style.display = '';
  section.innerHTML = buildGrassHtml('home-grass-title');
}

/* ── 잔디밭 툴팁 이벤트 위임 ── */
(function () {
  const tooltip = document.getElementById('grass-tooltip');
  if (!tooltip) return;

  document.addEventListener('mouseover', e => {
    const cell = e.target.closest('.grass-cell');
    if (!cell || !cell.dataset.tip) return;
    tooltip.textContent = cell.dataset.tip;
    tooltip.style.display = 'block';
  });

  document.addEventListener('mousemove', e => {
    if (tooltip.style.display === 'none') return;
    tooltip.style.left = (e.clientX + 10) + 'px';
    tooltip.style.top  = (e.clientY - 6) + 'px';
  });

  document.addEventListener('mouseout', e => {
    if (!e.target.closest('.grass-cell')) return;
    tooltip.style.display = 'none';
  });
})();

/* ════════════════════════
   실행
════════════════════════ */
init();

/* ════════════════════════
   1% 복리 계산기
════════════════════════ */
(function () {
  const slider   = document.getElementById('calc-slider');
  const numInput = document.getElementById('calc-days-num');
  if (!slider) return;

  const milestones = [
    { day: 7,   text: "일주일. 아직 티가 안 나. 근데 쌓이고 있어." },
    { day: 30,  text: "한 달. 주변이 슬슬 눈치채기 시작해." },
    { day: 66,  text: "습관이 굳어지는 날. 이제 안 하면 어색해." },
    { day: 100, text: "석 달. 3개월 전 너랑 달라." },
    { day: 180, text: "반년. 작년의 너를 기억해?" },
    { day: 365, text: "1년. 매일 1%가 만든 결과." }
  ];

  function getCompareText(days) {
    let result = "시작했어. 이게 전부야.";
    for (const m of milestones) {
      if (days >= m.day) result = m.text;
      else break;
    }
    return result;
  }

  let animFrame = null;
  let currentDisp = 1.35;

  function animateNum(target) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const start = currentDisp;
    const startTime = performance.now();
    const duration = 350;
    function step(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = start + (target - start) * eased;
      const fixed = val.toFixed(2);
      document.getElementById('calc-big-num').innerHTML = `${fixed}<span class="calc-times">×</span>`;
      document.getElementById('calc-sentence-mult').textContent = fixed;
      if (p < 1) animFrame = requestAnimationFrame(step);
      else currentDisp = target;
    }
    animFrame = requestAnimationFrame(step);
  }

  function updateCalc(days) {
    days = Math.max(1, Math.min(365, days));
    const mult = Math.pow(1.01, days);
    animateNum(mult);
    document.getElementById('calc-sentence').innerHTML =
      `${days}일 후 당신은 <span id="calc-sentence-mult">${mult.toFixed(2)}</span>배의 당신입니다`;
    document.getElementById('calc-compare').textContent = getCompareText(days);
    const pct = ((days - 1) / 364) * 100;
    slider.style.background = `linear-gradient(90deg, #A78BFA ${pct}%, #67E8F9 ${pct}%, #67E8F9 100%)`;
  }

  slider.addEventListener('input', () => { const d = parseInt(slider.value); numInput.value = d; updateCalc(d); });
  numInput.addEventListener('input', () => { let d = parseInt(numInput.value) || 1; d = Math.max(1, Math.min(365, d)); slider.value = d; updateCalc(d); });
  updateCalc(30);
})();

/* ── 아티클 토글 ── */
function toggleArticle(id, btn) {
  const body = document.getElementById(id);
  const isOpen = body.classList.toggle('open');
  btn.innerText = isOpen ? '접기 ↑' : '더 읽기 ↓';
}

/* ── Disqus lazy load + toggle ── */
var disqusLoaded = false;

function toggleDisqus() {
  const btn = document.getElementById('disqus-toggle-btn');
  const wrap = document.getElementById('disqus_wrap');
  const isOpen = btn.getAttribute('aria-expanded') === 'true';

  if (isOpen) {
    wrap.style.maxHeight = '0';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '댓글 보기 ▼';
  } else {
    if (!disqusLoaded) {
      disqusLoaded = true;
      window.disqus_config = function () {
        this.page.url = window.location.href;
        this.page.identifier = 'sloo-main';
      };
      var d = document, s = d.createElement('script');
      s.src = 'https://product-make-billion.disqus.com/embed.js';
      s.setAttribute('data-timestamp', +new Date());
      (d.head || d.body).appendChild(s);
    }
    wrap.style.maxHeight = '2000px';
    btn.setAttribute('aria-expanded', 'true');
    btn.textContent = '댓글 접기 ▲';
  }
}

/* ── SNS 공유 ── */
(function() {
  const SLOO_URL = 'https://sloo.kr';
  const toast = document.getElementById('share-toast');
  let toastTimer;

  function showToast() {
    clearTimeout(toastTimer);
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // iOS Safari: navigator.share()는 동기적으로 바로 호출해야 유저 제스처 컨텍스트 유지됨
  function share(title) {
    if (navigator.share) {
      navigator.share({ title, url: SLOO_URL }).catch(() => {});
    } else {
      navigator.clipboard.writeText(SLOO_URL).then(showToast).catch(showToast);
    }
  }

  document.getElementById('btn-calc-share').addEventListener('click', () =>
    share('매일 1%가 만드는 변화')
  );

  document.getElementById('btn-first-share').addEventListener('click', () =>
    share('나 오늘부터 매일 1% 시작했어')
  );
})();
