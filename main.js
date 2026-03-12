/* ── 상태 ── */
const state = {
  goal: null,
  reason: null,
  energy: null,
  mental: null
};

/* ── 공감 메시지 (reason 인덱스 순) ── */
const empathyMsgs = [
  "며칠 못 버텨도 괜찮아. SLOO는 연속 기록 없어.",
  "바쁜 날엔 1분짜리 미션만 해도 충분해.",
  "SLOO는 스트릭 없어. 오늘 패스해도 내일 그냥 켜면 돼.",
  "귀찮을 때를 위한 서비스야. 딱 1%만."
];

/* ── 미션 데이터 (에너지 × 멘탈) ── */
const missions = {
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

/* ── 화면 전환 ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── 선택지 카드 (온보딩 1, 2) ── */
document.querySelectorAll('.choice-card').forEach(card => {
  card.addEventListener('click', () => {
    const group = card.dataset.group;
    document.querySelectorAll(`.choice-card[data-group="${group}"]`)
      .forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state[group] = card.dataset.val;

    setTimeout(() => {
      if (group === 'goal')   showScreen('screen-ob2');
      if (group === 'reason') showScreen('screen-ob3');
    }, 280);
  });
});

/* ── 에너지/멘탈 옵션 (온보딩 3) ── */
document.querySelectorAll('.options').forEach(group => {
  group.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      group.querySelectorAll('.option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state[group.dataset.group] = opt.dataset.val;
      document.getElementById('btn-mission').disabled = !(state.energy && state.mental);
    });
  });
});

/* ── 랜딩 → 온보딩 1 ── */
document.getElementById('btn-start').addEventListener('click', () => {
  showScreen('screen-ob1');
});

/* ── 미션 받기 ── */
document.getElementById('btn-mission').addEventListener('click', () => {
  const key = `${state.energy}-${state.mental}`;
  document.getElementById('mission-text').textContent = missions[key] || '';
  document.getElementById('empathy-msg').textContent = empathyMsgs[state.reason] || '';
  const msg = document.getElementById('result-msg');
  msg.textContent = '';
  msg.className = 'result-msg';
  showScreen('screen-mission');
});

/* ── 완료 ── */
document.getElementById('btn-done').addEventListener('click', () => {
  const msg = document.getElementById('result-msg');
  msg.textContent = '🎉 오늘 1% 완료 ✓';
  msg.className = 'result-msg done-msg show';
});

/* ── 패스 ── */
document.getElementById('btn-pass').addEventListener('click', () => {
  const msg = document.getElementById('result-msg');
  msg.textContent = '괜찮아. 내일 또 켜면 돼.';
  msg.className = 'result-msg pass-msg show';
});

/* ── 처음으로 ── */
document.getElementById('btn-restart').addEventListener('click', () => {
  state.goal = null;
  state.reason = null;
  state.energy = null;
  state.mental = null;
  document.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.option').forEach(o => o.classList.remove('active'));
  document.getElementById('btn-mission').disabled = true;
  showScreen('screen-landing');
});

/* ── 로고 클릭 → 랜딩 ── */
document.getElementById('nav-logo').addEventListener('click', e => {
  e.preventDefault();
  showScreen('screen-landing');
});

/* ── 테마 ── */
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('sloo-theme', isLight ? 'light' : 'dark');
  const dc = document.getElementById('disqus_container');
  if (dc) dc.style.colorScheme = isLight ? 'light' : 'dark';
  window.disqus_config = getDisqusConfig(isLight);
  if (typeof DISQUS !== 'undefined') DISQUS.reset({ reload: true, config: window.disqus_config });
});

/* ── 초기화 ── */
if (localStorage.getItem('sloo-theme') === 'light') {
  document.body.classList.add('light');
}

/* ── 아티클 토글 ── */
function toggleArticle(id, btn) {
  const body = document.getElementById(id);
  const isOpen = body.classList.toggle('open');
  btn.innerText = isOpen ? '접기 ↑' : '더 읽기 ↓';
}

/* ── Disqus ── */
function getDisqusConfig(isLight) {
  return function () {
    this.page.url = window.location.href;
    this.page.identifier = 'sloo-main';
    this.page.colorScheme = isLight ? 'light' : 'dark';
  };
}
window.disqus_config = getDisqusConfig(false);
(function () {
  var d = document, s = d.createElement('script');
  s.src = 'https://product-make-billion.disqus.com/embed.js';
  s.setAttribute('data-timestamp', +new Date());
  (d.head || d.body).appendChild(s);
})();
