/* ════════════════════════ SLOO — main.js ════════════════════════ */

/* ── 미션 데이터 ── */
const MISSIONS = {
  gym:          ["운동복만 갈아입기","운동복 입고 현관까지","집 근처 5분 산책","헬스장 입구까지만","헬스장 들어가서 15분","헬스장 30분","헬스장 1시간"],
  hometraining: ["운동복만 갈아입기","매트 꺼내서 펼치기","스트레칭 3분","유튜브 홈트 영상 틀어놓기","홈트 10분","홈트 20분","홈트 30분"],
  walking:      ["운동화 꺼내놓기","운동복 입고 현관까지","집 앞 5분 걷기","동네 한 바퀴 (10분)","20분 걷기","30분 걷기 or 10분 달리기","5km"]
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
  return CAT_META[cat]?.icon || '';
}

function getCatName(cat, type) {
  if (cat === 'health') {
    if (type === 'gym')          return '헬스장';
    if (type === 'hometraining') return '홈트';
    if (type === 'walking')      return '걷기/달리기';
    return '운동/건강';
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
  if (data.history.length > 7) data.history = data.history.slice(-7);
  setCatData(cat, data);
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
function getExerciseMission(type, level) {
  const arr = MISSIONS[type];
  return arr ? arr[Math.min(level - 1, 6)] : '';
}

/* ════════════════════════
   홈 화면
════════════════════════ */
function showHome() {
  renderHomeCards();
  updateSidebar();
  showScreen('screen-home');
}

function renderHomeCards() {
  const container = document.getElementById('home-cards');
  if (!container) return;

  const html = CATEGORIES.map(cat => {
    const data = getCatData(cat);
    const meta = CAT_META[cat];
    const icon = getCatIcon(cat, data?.type);
    const name = data?.active ? getCatName(cat, data.type) : meta.label;

    if (!data || !data.active) {
      return `<div class="home-cat-card home-cat-inactive">
        <div class="home-cat-top">
          <span class="home-cat-icon">${icon}</span>
          <div class="home-cat-info">
            <div class="home-cat-name">${name}</div>
            <div class="home-cat-meta home-cat-meta-inactive">아직 시작 안 했어</div>
          </div>
        </div>
        <button class="home-cat-add-btn" data-cat="${cat}">+ 추가하기</button>
      </div>`;
    }

    const mult = Math.round(Math.pow(1.01, data.growth_count) * 100) / 100;
    // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
    // const doneToday = data.last_date === today();
    const doneToday = false;

    return `<div class="home-cat-card home-cat-active">
      <div class="home-cat-top">
        <span class="home-cat-icon">${icon}</span>
        <div class="home-cat-info">
          <div class="home-cat-name">${name}</div>
          <div class="home-cat-meta">레벨 ${data.level} · ${mult.toFixed(2)}배</div>
        </div>
        <button class="home-cat-reset-btn" data-cat="${cat}" title="${name} 초기화">↺</button>
      </div>
      ${doneToday
        ? `<div class="home-cat-done-tag">✅ 오늘 완료!</div>`
        : `<button class="home-cat-mission-btn" data-cat="${cat}">오늘 미션 하기 →</button>`
      }
    </div>`;
  }).join('');

  container.innerHTML = html;

  container.querySelectorAll('.home-cat-add-btn').forEach(btn => {
    btn.addEventListener('click', () => startCatOnboarding(btn.dataset.cat));
  });
  container.querySelectorAll('.home-cat-mission-btn').forEach(btn => {
    btn.addEventListener('click', () => startCatMission(btn.dataset.cat));
  });
  container.querySelectorAll('.home-cat-reset-btn').forEach(btn => {
    btn.addEventListener('click', () => openResetModal(btn.dataset.cat));
  });
}

/* ── 카테고리 미션 시작 ── */
function startCatMission(cat) {
  currentMissionCategory = cat;
  const data = getCatData(cat);
  if (!data) return;
  if (cat === 'health') {
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
      } else {
        document.getElementById('reason-step-text').textContent = '2 / 3';
        document.getElementById('reason-step-fill').style.width = '66%';
        document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
        showScreen('screen-ob-reason');
      }
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

/* 온보딩: 실패 이유 선택 */
document.querySelectorAll('.reason-card').forEach(card => {
  card.addEventListener('click', () => {
    obPendingReason = parseInt(card.dataset.val);
    document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const cat = currentOnboardingCategory;
    setTimeout(() => {
      if (cat === 'health') {
        // 운동: 카테고리 데이터 생성 후 첫 미션
        const obj = newCatObj();
        obj.type = obPendingType;
        obj.fail_reason = obPendingReason;
        setCatData(cat, obj);
        currentMissionCategory = cat;
        showFirstMission();
      } else {
        // 수면/루틴: 에너지·멘탈 선택 화면으로
        document.querySelectorAll('.state-opt').forEach(o => o.classList.remove('active'));
        obSelections.energy = null;
        obSelections.mental = null;
        document.getElementById('btn-get-mission').disabled = true;
        // 초기 온보딩: 3/3, 홈에서 추가: 2/2
        const isSleepInit = document.getElementById('reason-step-text').textContent === '2 / 3';
        document.querySelector('#screen-ob-state .progress-text').textContent = isSleepInit ? '3 / 3' : '2 / 2';
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

  data.total_count = (data.total_count || 0) + 1;
  data.growth_count = (data.growth_count || 0) + 1;
  data.maintain_count = 0;
  data.last_date = today();
  data.history = (data.history || []).filter(h => h.date !== today());
  data.history.push({ date: today(), type: 'growth' });
  if (data.history.length > 7) data.history = data.history.slice(-7);
  setCatData(cat, data);
  updateSidebar();

  const tc = data.total_count;
  const gc = data.growth_count;
  const msg = document.getElementById('first-result-msg');
  msg.innerHTML = `오늘 1% 완료 🌱<br><small>${tc}회째. 1.01<sup>${gc}</sup> = ${multStr(gc)}배의 당신.</small>`;
  msg.className = 'result-msg done-msg show';

  document.getElementById('fg-plant').textContent = getPlantIcon(gc);
  document.getElementById('fg-days').textContent = `당신은 ${tc}번째입니다`;
  document.getElementById('fg-formula').innerHTML = `1.01<sup>${gc}</sup> = ${multStr(gc)}배의 당신입니다`;
  document.getElementById('fg-msg').textContent = getGrowthMsg(gc);
  document.getElementById('first-growth-card').classList.add('show');

  document.getElementById('first-action-btns').style.display = 'none';
  document.getElementById('btn-first-home').style.display = '';
});

/* ── 첫 미션: 패스 ── */
document.getElementById('btn-first-pass').addEventListener('click', () => {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  if (data) {
    data.maintain_count = 0;
    data.history = (data.history || []).filter(h => h.date !== today());
    data.history.push({ date: today(), type: 'pass' });
    if (data.history.length > 7) data.history = data.history.slice(-7);
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

  const MAINTAIN_MSGS = {
    1: '잘 지키고 있어. 이게 습관이 되는 거야.',
    2: '이틀째야. 흔들리지 않고 있어.',
    3: '3일째 유지 중. 이 정도면 진짜 잡힌 거야.'
  };

  data.total_count = (data.total_count || 0) + 1;
  data.last_date = today();
  data.history = (data.history || []).filter(h => h.date !== today());

  const msg = document.getElementById('mission-result');

  if (currentChoice === 'grow') {
    if (data.level < 7) data.level++;
    data.growth_count = (data.growth_count || 0) + 1;
    data.maintain_count = 0;
    data.history.push({ date: today(), type: 'growth' });
    msg.innerHTML = `오늘 1% 완료 🌱<br><small>${data.total_count}회째. ${multStr(data.growth_count)}배의 당신. 레벨 ${data.level} 달성! 🎉</small>`;
  } else {
    data.maintain_count = (data.maintain_count || 0) + 1;
    data.history.push({ date: today(), type: 'maintain' });
    const subMsg = MAINTAIN_MSGS[data.maintain_count] || MAINTAIN_MSGS[3];
    msg.innerHTML = `오늘도 1.01배 유지 완료 🔄<br><small>${subMsg}</small>`;
  }

  if (data.history.length > 7) data.history = data.history.slice(-7);
  setCatData(cat, data);
  updateSidebar();
  msg.className = 'result-msg done-msg show';

  const gc = data.growth_count;
  document.getElementById('mg-plant').textContent = getPlantIcon(gc);
  document.getElementById('mg-days').textContent = `당신은 ${data.total_count}번째입니다`;
  document.getElementById('mg-formula').innerHTML = `1.01<sup>${gc}</sup> = ${multStr(gc)}배의 당신입니다`;
  document.getElementById('mg-msg').textContent = getGrowthMsg(gc);
  document.getElementById('mission-growth-card').classList.add('show');

  if (data.level >= 7) document.getElementById('mg-max-level').style.display = '';
  document.getElementById('mission-action-btns').style.display = 'none';
  document.getElementById('btn-mission-home').style.display = '';
});

/* ── 미션: 패스 ── */
document.getElementById('btn-mission-pass').addEventListener('click', () => {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  if (data) {
    data.maintain_count = 0;
    data.history = (data.history || []).filter(h => h.date !== today());
    data.history.push({ date: today(), type: 'pass' });
    if (data.history.length > 7) data.history = data.history.slice(-7);
    setCatData(cat, data);
    updateSidebar();
  }
  const msg = document.getElementById('mission-result');
  msg.textContent = '오늘은 쉬어가도 돼. 내일 다시 켜면 돼.';
  msg.className = 'result-msg pass-msg show';
  document.getElementById('mission-action-btns').style.display = 'none';
  document.getElementById('btn-mission-home').style.display = '';
});

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

/* ── 테마 ── */
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('sloo-theme', isLight ? 'light' : 'dark');
  const dc = document.getElementById('disqus_container');
  if (dc) dc.style.colorScheme = isLight ? 'light' : 'dark';
});
if (localStorage.getItem('sloo-theme') === 'light') {
  document.body.classList.add('light');
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
    return;
  }
  sidebar.classList.add('sb-active');
  document.body.classList.add('has-sidebar');

  const sbContent = document.getElementById('sb-content');
  if (!sbContent) return;

  const dayNames = ['일','월','화','수','목','금','토'];
  let html = `<div class="sb-section-label" style="margin-bottom:12px">루틴 진행 중</div>`;

  CATEGORIES.forEach(cat => {
    const data = getCatData(cat);
    const meta = CAT_META[cat];
    const icon = getCatIcon(cat, data?.type);
    const name = getCatName(cat, data?.type) || meta.label;

    if (!data || !data.active) {
      html += `<div class="sb-cat-inactive-block">${icon} ${meta.label} <span style="opacity:0.5;font-size:10px">— 시작 안 함</span></div>`;
      return;
    }

    const mult = Math.round(Math.pow(1.01, data.growth_count || 0) * 100) / 100;
    const levelPct = Math.min(((data.level || 1) / 7) * 100, 100);

    const histMap = {};
    (data.history || []).forEach(h => { histMap[h.date] = h.type; });
    let dotsHtml = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const t = histMap[ds];
      let dotIcon = '·', dotClass = '';
      if (t === 'growth')  { dotIcon = '✅'; dotClass = 'growth'; }
      else if (t === 'maintain') { dotIcon = '🔄'; dotClass = 'maintain'; }
      else if (t === 'pass')     { dotIcon = '⏭'; }
      dotsHtml += `<div class="sb-mini-hist-dot ${dotClass}" title="${dayNames[d.getDay()]}">${dotIcon}</div>`;
    }

    html += `<div class="sb-cat-block">
      <div class="sb-cat-block-header">
        <span class="sb-cat-block-icon">${icon}</span>
        <span class="sb-cat-block-name">${name}</span>
        <span class="sb-cat-block-mult">${mult.toFixed(2)}배</span>
      </div>
      <div class="sb-cat-block-level">레벨 ${data.level || 1}/7 · 총 ${data.total_count || 0}회</div>
      <div class="sb-cat-mini-bar-track">
        <div class="sb-cat-mini-bar-fill" style="width:${levelPct}%"></div>
      </div>
      <div class="sb-cat-block-history">${dotsHtml}</div>
    </div>`;
  });

  sbContent.innerHTML = html;
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

/* ── Disqus ── */
window.disqus_config = function () {
  this.page.url = window.location.href;
  this.page.identifier = 'sloo-main';
};
(function () {
  var d = document, s = d.createElement('script');
  s.src = 'https://product-make-billion.disqus.com/embed.js';
  s.setAttribute('data-timestamp', +new Date());
  (d.head || d.body).appendChild(s);
})();
