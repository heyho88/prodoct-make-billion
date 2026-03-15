/* ════════════ SLOO — main.js ════════════ */

/* ── 미션 데이터 ── */
const MISSIONS = {
  gym: [
    "운동복만 갈아입기",
    "운동복 입고 현관까지",
    "집 근처 5분 산책",
    "헬스장 입구까지만",
    "헬스장 들어가서 15분",
    "헬스장 30분",
    "헬스장 1시간"
  ],
  hometraining: [
    "운동복만 갈아입기",
    "매트 꺼내서 펼치기",
    "스트레칭 3분",
    "유튜브 홈트 영상 틀어놓기",
    "홈트 10분",
    "홈트 20분",
    "홈트 30분"
  ],
  walking: [
    "운동화 꺼내놓기",
    "운동복 입고 현관까지",
    "집 앞 5분 걷기",
    "동네 한 바퀴 (10분)",
    "20분 걷기",
    "30분 걷기 or 10분 달리기",
    "5km"
  ]
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

/* ── 초기화 대상 localStorage 키 ── */
const RESET_KEYS = [
  'sloo_category', 'sloo_type', 'sloo_fail_reason',
  'sloo_level', 'sloo_days', 'sloo_last_date',
  'sloo_completed_today', 'sloo_maintain_count',
  'sloo_energy', 'sloo_mental',
  'sloo_growth_count', 'sloo_total_count', 'sloo_history', 'sloo_maintain_streak'
];

/* ── localStorage 헬퍼 ── */
const LS = {
  get: k => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, String(v)),
  getInt: (k, def) => { const v = localStorage.getItem(k); return v !== null ? parseInt(v) : (def !== undefined ? def : 0); }
};

/* ── 오늘 날짜 (로컬 기준 자정) ── */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── 화면 전환 ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── 성장 헬퍼 ── */
function multStr(days) { return Math.pow(1.01, days).toFixed(2); }
function getGrowthMsg(days) {
  if (days >= 365) return "1년. 37.78배. 말이 필요 없어.";
  if (days >= 100) return "100일. 2.70배. 진짜 달라졌어.";
  if (days >= 30)  return "한 달. 이제 습관이 되고 있어.";
  if (days >= 7)   return "일주일 됐어. 1.07배의 너야.";
  return "첫 번째 1%. 시작이 전부야.";
}
function getPlantIcon(days) {
  if (days >= 101) return "🌲";
  if (days >= 31)  return "🌳";
  if (days >= 8)   return "🌿";
  return "🌱";
}
function getExerciseMission(type, level) {
  const arr = MISSIONS[type];
  return arr ? arr[Math.min(level - 1, 6)] : '';
}

/* ── 히스토리 / 성장 추적 헬퍼 ── */
function addHistory(type) {
  let history = [];
  try { history = JSON.parse(LS.get('sloo_history') || '[]'); } catch(e) {}
  history = history.filter(h => h.date !== today());
  history.push({ date: today(), type });
  if (history.length > 7) history = history.slice(-7);
  LS.set('sloo_history', JSON.stringify(history));
}

function getHistory() {
  try { return JSON.parse(LS.get('sloo_history') || '[]'); } catch(e) { return []; }
}

function getCategoryLabel() {
  const cat = LS.get('sloo_category');
  const type = LS.get('sloo_type');
  if (cat === 'health') {
    if (type === 'gym') return '🏋️ 헬스장';
    if (type === 'hometraining') return '🏠 홈트';
    if (type === 'walking') return '🚶 걷기/달리기';
  }
  if (cat === 'sleep') return '😴 수면/기상';
  if (cat === 'routine') return '📋 루틴/생활습관';
  return '';
}

function updateSidebar() {
  const category = LS.get('sloo_category');
  const sidebar = document.getElementById('desktop-sidebar');
  if (!sidebar) return;

  if (!category) {
    sidebar.classList.remove('sb-active');
    document.body.classList.remove('has-sidebar');
    return;
  }
  sidebar.classList.add('sb-active');
  document.body.classList.add('has-sidebar');

  document.getElementById('sb-routine-name').textContent = getCategoryLabel();

  const growthCount = LS.getInt('sloo_growth_count', 0);
  const totalCount  = LS.getInt('sloo_total_count', 0);
  const multVal     = Math.round(Math.pow(1.01, growthCount) * 100) / 100;
  const maintainStreak = LS.getInt('sloo_maintain_streak', 0);

  const multBig = document.getElementById('sb-mult-big');
  if (maintainStreak > 0) {
    multBig.textContent = `${multVal.toFixed(2)}배 유지 중`;
    multBig.className = 'sb-mult-big sb-mult-maintain';
  } else {
    multBig.textContent = `${multVal.toFixed(2)}배`;
    multBig.className = 'sb-mult-big sb-mult-growth';
  }

  document.getElementById('sb-counts').textContent = `총 ${totalCount}회 완료`;
  const level = LS.getInt('sloo_level', 1);
  document.getElementById('sb-level-text').textContent = `레벨 ${level}`;
  document.getElementById('sb-level-bar-label').textContent = `레벨 ${level} 진행 중`;
  document.getElementById('sb-level-bar-fill').style.width = `${Math.min((level / 7) * 100, 100)}%`;
  const stepsLeft = Math.max(7 - level, 0);
  document.getElementById('sb-next-level').textContent =
    stepsLeft > 0 ? `다음 레벨까지 ${stepsLeft}단계` : '최고 레벨 달성!';

  const streakEl = document.getElementById('sb-maintain-streak');
  if (maintainStreak > 0) {
    streakEl.textContent = `${maintainStreak}일째 유지 중 🔄`;
    streakEl.style.display = '';
  } else {
    streakEl.style.display = 'none';
  }

  const history = getHistory();
  const histMap = {};
  history.forEach(h => { histMap[h.date] = h.type; });
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dayName = dayNames[d.getDay()];
    const type = histMap[dateStr];
    let icon = '·', label = '';
    if (type === 'growth')  { icon = '✅'; label = '성장'; }
    else if (type === 'maintain') { icon = '🔄'; label = '유지'; }
    else if (type === 'pass')     { icon = '⏭'; label = '패스'; }
    html += `<div class="sb-history-row ${type || 'empty'}">
      <span class="sb-hist-day">${dayName}</span>
      <span class="sb-hist-icon">${icon}</span>
      <span class="sb-hist-label">${label}</span>
    </div>`;
  }
  document.getElementById('sb-history-list').innerHTML = html;
}

function checkMaintainBanner() {
  const streak   = LS.getInt('sloo_maintain_streak', 0);
  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // const lastDate = LS.get('sloo_last_date');
  const banner   = document.getElementById('maintain-banner');
  if (!banner) return;
  // if (streak >= 3 && lastDate !== today()) {
  if (streak >= 3) {
    banner.style.display = '';
  } else {
    banner.style.display = 'none';
  }
}

/* ════════════════════════
   랜딩 화면 표시
════════════════════════ */
function showLanding() {
  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // const alreadyDone = LS.get('sloo_last_date') === today();
  const alreadyDone = false;
  const btn = document.getElementById('btn-start');
  const msg = document.getElementById('landing-done-msg');
  if (alreadyDone) {
    btn.disabled = true;
    msg.style.display = '';
  } else {
    btn.disabled = false;
    msg.style.display = 'none';
  }
  showScreen('screen-landing');
}

/* ════════════════════════
   앱 진입점
════════════════════════ */
function init() {
  updateSidebar();
  const lastDate = LS.get('sloo_last_date');

  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // 오늘 이미 완료 → 랜딩 (버튼 비활성)
  // if (lastDate === today()) {
  //   showLanding();
  //   return;
  // }

  const category = LS.get('sloo_category');
  if (!category) {
    showLanding();
    return;
  }

  const days = LS.getInt('sloo_days', 0);
  if (days === 0) {
    showFirstMission();
    return;
  }

  if (category === 'health') {
    showMainChoice();
  } else {
    showDailyState();
  }
}

/* ── 첫 미션 화면 ── */
function showFirstMission() {
  const category = LS.get('sloo_category');
  const type = LS.get('sloo_type');
  const reason = LS.getInt('sloo_fail_reason', 0);
  let missionText;
  if (category === 'health') {
    missionText = getExerciseMission(type, 1);
  } else {
    const energy = LS.get('sloo_energy') || 'mid';
    const mental = LS.get('sloo_mental') || 'mid';
    missionText = ENERGY_MISSIONS[energy + '-' + mental] || '';
  }
  document.getElementById('first-empathy-msg').textContent = EMPATHY_MSGS[reason] || EMPATHY_MSGS[0];
  document.getElementById('first-mission-text').textContent = missionText;
  document.getElementById('first-result-msg').textContent = '';
  document.getElementById('first-result-msg').className = 'result-msg';
  document.getElementById('first-growth-card').classList.remove('show');
  document.getElementById('first-action-btns').style.display = '';
  document.getElementById('btn-first-home').style.display = 'none';
  showScreen('screen-first-mission');
}

/* ── 2일차+ A/B 선택 화면 (운동) ── */
function showMainChoice() {
  const type = LS.get('sloo_type');
  const days = LS.getInt('sloo_days', 0);
  const level = LS.getInt('sloo_level', 1);
  const el = document.getElementById('screen-main');
  el.querySelector('.main-days').textContent = days;
  el.querySelector('.main-mult').textContent = multStr(days);
  el.querySelector('.main-level').textContent = level;

  const currentMission = getExerciseMission(type, level);
  const nextMission = level < 7 ? getExerciseMission(type, level + 1) : '최고 레벨! 다음 카테고리를 추가해봐';
  el.querySelector('.card-grow-preview').textContent = nextMission;
  el.querySelector('.card-maintain-preview').textContent = currentMission;
  checkMaintainBanner();

  const aCard = document.getElementById('choice-a-card');
  if (level >= 7) {
    aCard.querySelector('.ab-card-title').textContent = '최고 레벨 달성 🏆';
    aCard.querySelector('.ab-badge').textContent = '완성';
  } else {
    aCard.querySelector('.ab-card-title').textContent = '오늘 1% 더 성장할래?';
    aCard.querySelector('.ab-badge').textContent = '성장';
  }
  showScreen('screen-main');
}

/* ── 수면·루틴 재방문 상태 선택 화면 ── */
function showDailyState() {
  const days = LS.getInt('sloo_days', 0);
  const el = document.getElementById('screen-daily-state');
  el.querySelector('.daily-days').textContent = days;
  el.querySelector('.daily-mult').textContent = multStr(days);
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
  const type = LS.get('sloo_type');
  const level = LS.getInt('sloo_level', 1);
  const reason = LS.getInt('sloo_fail_reason', 0);
  let missionText;
  if (choice === 'grow') {
    missionText = level < 7 ? getExerciseMission(type, level + 1) : getExerciseMission(type, 7);
  } else {
    missionText = getExerciseMission(type, level);
  }
  document.getElementById('mission-empathy').textContent = EMPATHY_MSGS[reason] || EMPATHY_MSGS[0];
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

/* ════════════════════════
   이벤트 리스너
════════════════════════ */

/* 랜딩 → 온보딩 or 적절한 화면 */
document.getElementById('btn-start').addEventListener('click', () => {
  const category = LS.get('sloo_category');
  if (!category) {
    showScreen('screen-ob1');
    return;
  }
  const days = LS.getInt('sloo_days', 0);
  if (days === 0) {
    showFirstMission();
  } else if (category === 'health') {
    showMainChoice();
  } else {
    showDailyState();
  }
});

/* 온보딩1: 카테고리 선택 */
document.querySelectorAll('.ob1-card').forEach(card => {
  card.addEventListener('click', () => {
    LS.set('sloo_category', card.dataset.val);
    document.querySelectorAll('.ob1-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      if (card.dataset.val === 'health') {
        showScreen('screen-ob2-exercise');
      } else {
        document.getElementById('reason-step-text').textContent = '2 / 3';
        document.getElementById('reason-step-fill').style.width = '66%';
        showScreen('screen-ob-reason');
      }
    }, 280);
  });
});

/* 온보딩2 (운동): 운동 종류 선택 */
document.querySelectorAll('.ob2ex-card').forEach(card => {
  card.addEventListener('click', () => {
    LS.set('sloo_type', card.dataset.val);
    document.querySelectorAll('.ob2ex-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      document.getElementById('reason-step-text').textContent = '3 / 3';
      document.getElementById('reason-step-fill').style.width = '100%';
      showScreen('screen-ob-reason');
    }, 280);
  });
});

/* 온보딩: 실패 이유 선택 */
document.querySelectorAll('.reason-card').forEach(card => {
  card.addEventListener('click', () => {
    LS.set('sloo_fail_reason', parseInt(card.dataset.val));
    document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const category = LS.get('sloo_category');
    setTimeout(() => {
      if (category === 'health') {
        LS.set('sloo_level', 1);
        showFirstMission();
      } else {
        showScreen('screen-ob-state');
      }
    }, 280);
  });
});

/* 온보딩: 에너지/멘탈 (수면/루틴) */
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
  LS.set('sloo_energy', obSelections.energy);
  LS.set('sloo_mental', obSelections.mental);
  LS.set('sloo_level', 1);
  showFirstMission();
});

/* ── 첫 미션: 완료 ── */
document.getElementById('btn-first-done').addEventListener('click', () => {
  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // 버그2: 중복 완료 차단
  // if (LS.get('sloo_last_date') === today()) {
  //   const msg = document.getElementById('first-result-msg');
  //   msg.textContent = '오늘은 이미 완료했어 🌱 내일 또 만나';
  //   msg.className = 'result-msg done-msg show';
  //   document.getElementById('first-action-btns').style.display = 'none';
  //   document.getElementById('btn-first-home').style.display = '';
  //   return;
  // }

  const days = LS.getInt('sloo_days', 0) + 1;
  LS.set('sloo_days', days);
  LS.set('sloo_last_date', today());

  const gc = LS.getInt('sloo_growth_count', 0) + 1;
  const tc = LS.getInt('sloo_total_count', 0) + 1;
  LS.set('sloo_growth_count', gc);
  LS.set('sloo_total_count', tc);
  LS.set('sloo_maintain_streak', 0);
  addHistory('growth');
  updateSidebar();

  const msg = document.getElementById('first-result-msg');
  msg.innerHTML = `오늘 1% 완료 🌱<br><small>${days}일째. 1.01<sup>${days}</sup> = ${multStr(days)}배의 당신.</small>`;
  msg.className = 'result-msg done-msg show';

  document.getElementById('fg-plant').textContent = getPlantIcon(days);
  document.getElementById('fg-days').textContent = `당신은 ${days}일째입니다`;
  document.getElementById('fg-formula').innerHTML = `1.01<sup>${days}</sup> = ${multStr(days)}배의 당신입니다`;
  document.getElementById('fg-msg').textContent = getGrowthMsg(days);
  document.getElementById('first-growth-card').classList.add('show');

  document.getElementById('first-action-btns').style.display = 'none';
  document.getElementById('btn-first-home').style.display = '';
});

/* ── 첫 미션: 패스 ── */
document.getElementById('btn-first-pass').addEventListener('click', () => {
  addHistory('pass');
  LS.set('sloo_maintain_streak', 0);
  updateSidebar();
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
  // TODO: 테스트 완료 후 날짜 제한 다시 활성화 필요
  // 버그2: 중복 완료 차단
  // if (LS.get('sloo_last_date') === today()) {
  //   const msg = document.getElementById('mission-result');
  //   msg.textContent = '오늘은 이미 완료했어 🌱 내일 또 만나';
  //   msg.className = 'result-msg done-msg show';
  //   document.getElementById('mission-action-btns').style.display = 'none';
  //   document.getElementById('btn-mission-home').style.display = '';
  //   return;
  // }

  const days = LS.getInt('sloo_days', 0) + 1;
  LS.set('sloo_days', days);
  LS.set('sloo_last_date', today());

  let level = LS.getInt('sloo_level', 1);
  const tc = LS.getInt('sloo_total_count', 0) + 1;
  LS.set('sloo_total_count', tc);

  const MAINTAIN_MSGS = {
    1: '잘 지키고 있어. 이게 습관이 되는 거야.',
    2: '이틀째야. 흔들리지 않고 있어.',
    3: '3일째 유지 중. 이 정도면 진짜 잡힌 거야.'
  };

  let levelMsg;
  const msg = document.getElementById('mission-result');

  if (currentChoice === 'grow') {
    if (level < 7) { level += 1; LS.set('sloo_level', level); }
    const gc = LS.getInt('sloo_growth_count', 0) + 1;
    LS.set('sloo_growth_count', gc);
    LS.set('sloo_maintain_streak', 0);
    addHistory('growth');
    levelMsg = `레벨 ${level} 달성! 🎉`;
    msg.innerHTML = `오늘 1% 완료 🌱<br><small>${days}일째. ${multStr(days)}배의 당신. ${levelMsg}</small>`;
  } else {
    const mc = LS.getInt('sloo_maintain_streak', 0) + 1;
    LS.set('sloo_maintain_streak', mc);
    addHistory('maintain');
    const subMsg = MAINTAIN_MSGS[mc] || MAINTAIN_MSGS[3];
    msg.innerHTML = `오늘도 1.01배 유지 완료 🔄<br><small>${subMsg}</small>`;
  }

  msg.className = 'result-msg done-msg show';
  updateSidebar();

  document.getElementById('mg-plant').textContent = getPlantIcon(days);
  document.getElementById('mg-days').textContent = `당신은 ${days}일째입니다`;
  document.getElementById('mg-formula').innerHTML = `1.01<sup>${days}</sup> = ${multStr(days)}배의 당신입니다`;
  document.getElementById('mg-msg').textContent = getGrowthMsg(days);
  document.getElementById('mission-growth-card').classList.add('show');

  if (level >= 7) document.getElementById('mg-max-level').style.display = '';

  document.getElementById('mission-action-btns').style.display = 'none';
  document.getElementById('btn-mission-home').style.display = '';
});

/* ── 미션: 패스 ── */
document.getElementById('btn-mission-pass').addEventListener('click', () => {
  addHistory('pass');
  LS.set('sloo_maintain_streak', 0);
  updateSidebar();
  const msg = document.getElementById('mission-result');
  msg.textContent = '오늘은 쉬어가도 돼. 내일 다시 켜면 돼.';
  msg.className = 'result-msg pass-msg show';
  document.getElementById('mission-action-btns').style.display = 'none';
  document.getElementById('btn-mission-home').style.display = '';
});

/* ── 홈으로 돌아가기 (init으로 라우팅) ── */
document.getElementById('btn-first-home').addEventListener('click', init);
document.getElementById('btn-mission-home').addEventListener('click', init);

/* ── 유지 3일 연속 배너 ── */
document.getElementById('btn-banner-grow').addEventListener('click', () => {
  document.getElementById('maintain-banner').style.display = 'none';
  LS.set('sloo_maintain_streak', 0);
  showMissionScreen('grow');
});
document.getElementById('btn-banner-stay').addEventListener('click', () => {
  document.getElementById('maintain-banner').style.display = 'none';
  LS.set('sloo_maintain_streak', 0);
});

/* ── 다음 카테고리 추가 ── */
document.getElementById('btn-add-category').addEventListener('click', () => {
  ['sloo_category', 'sloo_type', 'sloo_level', 'sloo_fail_reason', 'sloo_energy', 'sloo_mental']
    .forEach(k => localStorage.removeItem(k));
  document.querySelectorAll('.ob1-card, .ob2ex-card, .reason-card').forEach(c => c.classList.remove('selected'));
  showScreen('screen-ob1');
});

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
  LS.set('sloo_energy', dailySelections.energy);
  LS.set('sloo_mental', dailySelections.mental);
  const reason = LS.getInt('sloo_fail_reason', 0);
  const key = dailySelections.energy + '-' + dailySelections.mental;
  document.getElementById('first-empathy-msg').textContent = EMPATHY_MSGS[reason] || EMPATHY_MSGS[0];
  document.getElementById('first-mission-text').textContent = ENERGY_MISSIONS[key] || '';
  document.getElementById('first-result-msg').textContent = '';
  document.getElementById('first-result-msg').className = 'result-msg';
  document.getElementById('first-growth-card').classList.remove('show');
  document.getElementById('first-action-btns').style.display = '';
  document.getElementById('btn-first-home').style.display = 'none';
  showScreen('screen-first-mission');
});

/* ── 로고 클릭 ── */
document.getElementById('nav-logo').addEventListener('click', e => {
  e.preventDefault();
  init();
});

/* ── 초기화 버튼 → 커스텀 모달 ── */
document.getElementById('btn-reset').addEventListener('click', () => {
  document.getElementById('modal-reset').style.display = 'flex';
});
document.getElementById('modal-reset-cancel').addEventListener('click', () => {
  document.getElementById('modal-reset').style.display = 'none';
});
document.getElementById('modal-reset-ok').addEventListener('click', () => {
  document.getElementById('modal-reset').style.display = 'none';
  RESET_KEYS.forEach(k => localStorage.removeItem(k));
  document.querySelectorAll('.choice-card, .option').forEach(c => c.classList.remove('selected', 'active'));
  showLanding();
});
document.getElementById('modal-reset').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-reset')) {
    document.getElementById('modal-reset').style.display = 'none';
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
