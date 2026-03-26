/* ════════════════════════ SLOO — main.js ════════════════════════ */

/* ── Supabase 초기화 ── */
const SUPABASE_URL = 'https://hzhyymkpbgjkfnxitoch.supabase.co'
const SUPABASE_KEY = 'sb_publishable_-_k-7w1QR_DSQT7ngWv-WA_Y84mpuhI'
let supabaseClient
let _cacheLoaded = false

/* ── Supabase 데이터 로드 ── */
async function loadUserData(session) {
  if (_cacheLoaded) return
  try {
    const { data: categories } = await supabaseClient
      .from('user_categories')
      .select('*')
      .eq('user_id', session.user.id)

    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        const lsData = {
          active: true,
          type: cat.type,
          level: cat.level,
          growth_count: cat.growth_count,
          total_count: cat.total_count,
          maintain_count: cat.maintain_count,
          last_date: cat.last_date,
          max_reached: cat.max_reached,
          ...cat.extra_data
        }
        if (cat.category === 'routine_meta') {
          localStorage.setItem('sloo_routine_slots', JSON.stringify(cat.extra_data?.slots || []))
          localStorage.setItem('sloo_routine_unlocked', String(cat.extra_data?.unlocked || 1))
          return
        }
        if (cat.category === 'routine') {
          localStorage.setItem('sloo_routine_' + cat.type, JSON.stringify(lsData))
        } else {
          localStorage.setItem('sloo_' + cat.category, JSON.stringify(lsData))
        }
      })
    }
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0]
    const { data: histories } = await supabaseClient
      .from('user_history')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', fromDate)
      .order('date', { ascending: true })
    if (histories && histories.length > 0) {
      histories.forEach(h => {
        const lsKey = 'sloo_' + h.category
        const raw = localStorage.getItem(lsKey)
        if (raw) {
          const catData = JSON.parse(raw)
          if (!catData.history) catData.history = []
          catData.history = catData.history.filter(item => item.date !== h.date)
          catData.history.push({ date: h.date, type: h.action })
          localStorage.setItem(lsKey, JSON.stringify(catData))
        }
      })
    }
    _cacheLoaded = true
    // 데이터 로드 완료 후 화면 전환 (데이터 있을 때만)
    const hasAny = getAllActiveCatKeys().length > 0
    if (hasAny) {
      showHome()
    } else {
      document.querySelectorAll('.ob1-card').forEach(c => c.classList.remove('selected'))
      showScreen('screen-ob1')
    }
    console.log('데이터 로드 완료')
    // UI 리렌더링
    const homeScreen = document.getElementById('screen-home')
    if (homeScreen && homeScreen.classList.contains('active')) {
      renderHomeCards()
      renderHomeGrass()
      updateSidebar()
    }
  } catch (err) {
    console.error('Supabase 로드 실패:', err)
    _cacheLoaded = true
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log('Supabase 연결 완료')

  // 세션 확인 전 ob-wrap 숨기기 (로그인 복귀 시 온보딩 깜빡임 방지)
  const obWrap = document.getElementById('ob-wrap')
  obWrap.style.display = 'none'

  const { data: { session: initSession } } = await supabaseClient.auth.getSession()
  if (initSession) {
    // 세션 있음 → 로딩 화면 표시 후 데이터 로드
    document.getElementById('ob-loading-text').textContent = '데이터를 불러오는 중...'
    showScreen('screen-ob-loading')
    await loadUserData(initSession)
  } else {
    // 세션 없음 → 온보딩 슬라이드 표시
    obWrap.style.display = 'flex'
  }

  /* ── Google 로그인 버튼 ── */
  const btnLogin    = document.getElementById('btn-google-login')
  const btnLoginTxt = document.getElementById('btn-google-login-text')
  const btnLoginMob = document.getElementById('btn-google-login-mobile')

  function updateAuthUI(session) {
    if (session) {
      const name = session.user.email.split('@')[0]
      btnLoginTxt.textContent  = name + ' ▾'
      btnLoginMob.textContent  = name + ' ▾ (로그아웃)'
      document.getElementById('btn-reset').style.display = ''
    } else {
      btnLoginTxt.textContent  = '로그인'
      btnLoginMob.textContent  = '로그인'
      document.getElementById('btn-reset').style.display = 'none'
    }
  }

  async function handleAuthClick() {
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (session) {
      document.getElementById('modal-logout').style.display = 'flex'
    } else {
      await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://sloo.kr' }
      })
    }
  }

  document.getElementById('modal-logout-cancel').addEventListener('click', () => {
    document.getElementById('modal-logout').style.display = 'none'
  })
  document.getElementById('modal-logout-ok').addEventListener('click', async () => {
    document.getElementById('modal-logout').style.display = 'none'
    await supabaseClient.auth.signOut()
    // localStorage sloo_ 관련 데이터 전체 초기화
    Object.keys(localStorage)
      .filter(k => k.startsWith('sloo_'))
      .forEach(k => localStorage.removeItem(k))
    _cacheLoaded = false
    window.location.reload()
  })
  document.getElementById('modal-logout').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-logout')) {
      document.getElementById('modal-logout').style.display = 'none'
    }
  })

  btnLogin.addEventListener('click', handleAuthClick)
  btnLoginMob.addEventListener('click', handleAuthClick)

  supabaseClient.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session)
  })

  const { data: { session } } = await supabaseClient.auth.getSession()
  updateAuthUI(session)
  if (session) {
    await loadUserData(session)
  }
})

/* ── Supabase 미션 동기화 ── */
async function syncMissionToSupabase(cat, data, actionType) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    const userId = session.user.id;
    const categoryKey = cat;
    const typeKey = isRoutineCat(cat) ? getRoutineType(cat) : (data.type || null);
    await supabaseClient
      .from('user_categories')
      .upsert({
        user_id: userId,
        category: categoryKey,
        type: typeKey,
        level: data.level,
        growth_count: data.growth_count,
        total_count: data.total_count,
        maintain_count: data.maintain_count,
        last_date: data.last_date,
        max_reached: data.max_reached || false,
        extra_data: {
          current_bedtime: data.current_bedtime,
          target_bedtime: data.target_bedtime,
          current_target: data.current_target,
          total_minutes_diff: data.total_minutes_diff,
          mental_state: data.mental_state,
          digital_reason: data.digital_reason,
          morning_state: data.morning_state,
          evening_state: data.evening_state,
          space_reason: data.space_reason,
          reading_reason: data.reading_reason,
          streak: data.streak || 0,
          streak_reset_after: data.streak_reset_after || null
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,category,type' });
    await supabaseClient
      .from('user_history')
      .insert({
        user_id: userId,
        category: categoryKey,
        date: today(),
        action: actionType
      });
  } catch(e) {
    console.error('Supabase sync error:', e);
  }
}

/* ── 미션 데이터 ── */
const MISSIONS = {
  gym:          ["운동복만 갈아입기","운동복 입고 현관까지","집 근처 5분 산책","헬스장 입구까지만","헬스장 들어가서 15분","헬스장 30분","헬스장 1시간"],
  hometraining: ["운동복만 갈아입기","매트 꺼내서 펼치기","스트레칭 3분","유튜브 홈트 영상 틀어놓기","홈트 10분","홈트 20분","홈트 30분"],
  walking:      ["운동화 꺼내놓기","운동복 입고 현관까지","집 앞 5분 걷기","동네 한 바퀴 (10분)","20분 걷기","30분 걷기 or 10분 달리기","5km"],
  sleep:        ["오늘 취침 목표 시간 확인하기","목표 시간 30분 전 눕기 준비 시작","목표 시간에 눕기","목표 시간 -5분에 눕기","목표 시간 3일 연속 지키기","목표 시간 5일 연속 지키기","목표 시간 7일 연속 지키기"],
  morning:      ["물 한 잔 마시기","물 한 잔 + 커튼 or 창문 열기","물 한 잔 + 커튼 or 창문 열기 + 1분 스트레칭","물 한 잔 + 커튼 or 창문 열기 + 3분 스트레칭","물 한 잔 + 커튼 or 창문 열기 + 5분 스트레칭","물 한 잔 + 커튼 or 창문 열기 + 5분 스트레칭 + 오늘 할 일 1개 적기","물 한 잔 + 커튼 or 창문 열기 + 10분 스트레칭 + 오늘 할 일 3개 적기"],
  evening:      ["자기 전 오늘 하루 감사한 것 1가지 떠올리기","감사일기 1줄 적기","감사일기 2줄 적기","감사일기 3줄 적기","감사일기 3줄 + 플래너 준비하기","감사일기 3줄 + 플래너에 내일 할 일 1개 적기","감사일기 3줄 + 플래너에 내일 할 일 1개 적기 + 침대에서 핸드폰 하지 않기"],
  space:        ["오늘 쓴 물건 1개 제자리에 놓기","오늘 쓴 물건 전부 제자리에 놓기","책상 위 물건 전부 제자리에 놓기","책상 + 침대 주변 정리하기","방 바닥에 아무것도 없는 상태 만들기","자기 전 방 전체 5분 정리하기","자기 전 방 둘러보고 제자리 아닌 물건 없는지 확인하기"],
  digital:      ["공부or작업 시작할 때 핸드폰 10분 안 보이는 곳에 두기","공부or작업 시작할 때 핸드폰 20분 안 보이는 곳에 두기","공부or작업 시작할 때 핸드폰 30분 안 보이는 곳에 두기","공부or작업 시작할 때 핸드폰 45분 안 보이는 곳에 두기","공부or작업 시작할 때 핸드폰 1시간 안 보이는 곳에 두기","공부or작업 시작할 때 핸드폰 1시간 30분 안 보이는 곳에 두기","공부or작업 시작할 때 핸드폰 2시간 안 보이는 곳에 두고 집중하기"],
  mental:       ["호흡 코로 들이쉬고 입으로 내쉬기 3번","호흡 4초 들이쉬고 4초 내쉬기 5번","호흡 4초 들이쉬고 4초 내쉬기 10번 (약 1분 30초)","3분 동안 호흡에만 집중하기","5분 명상","7분 명상","매일 같은 시간에 10분 명상하기"],
  reading:      ["책 펴서 1페이지 읽기","5분 독서","10분 독서","15분 독서","20분 독서","25분 독서","30분 독서"]
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
  "며칠 잘 하다 무너졌어도 괜찮아요. 오늘 이 미션 하나면 1%예요.",
  "하루가 아무리 바빠도 이 미션은 30초예요. 그게 오늘의 1%예요.",
  "오늘 하루가 망했어도 괜찮아요. 이 미션 하나로 1%는 지켜요.",
  "귀찮은 하루가 맞아요. 그래도 이것만. 30초면 돼요."
];

const MAINTAIN_MSGS = {
  1: '잘 지키고 있어요. 이게 습관이 되는 거예요.',
  2: '이틀째예요. 흔들리지 않고 있어요.',
  3: '3일째 유지 중이에요. 이 정도면 진짜 잡힌 거예요.'
};

/* ── 카테고리 메타 ── */
const CATEGORIES = ['health', 'sleep', 'routine'];
const CAT_META = {
  health:  { label: '운동/건강',     icon: '🏃' },
  sleep:   { label: '수면/기상',     icon: '😴' },
  routine: { label: '루틴/생활습관', icon: '📋' }
};
const ROUTINE_TYPE_META = {
  morning: { label: '아침 루틴',      icon: '🌅' },
  evening: { label: '저녁 루틴',      icon: '🌙' },
  space:   { label: '정리정돈',       icon: '🏠' },
  digital: { label: '디지털 디톡스',  icon: '📵' },
  mental:  { label: '멘탈관리',       icon: '🧘' },
  reading: { label: '독서',           icon: '📚' },
};

function getCatIcon(cat, type) {
  if (cat === 'health') {
    if (type === 'gym')          return '🏋️';
    if (type === 'hometraining') return '🏠';
    if (type === 'walking')      return '🚶';
    return '🏃';
  }
  if (cat === 'routine' || isRoutineCat(cat)) {
    const t = type || (isRoutineCat(cat) ? getRoutineType(cat) : null);
    return ROUTINE_TYPE_META[t]?.icon || '📋';
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
  if (cat === 'routine' || isRoutineCat(cat)) {
    const t = type || (isRoutineCat(cat) ? getRoutineType(cat) : null);
    return ROUTINE_TYPE_META[t]?.label || '루틴/생활습관';
  }
  return CAT_META[cat]?.label || '';
}

/* ── 루틴 슬롯 헬퍼 ── */
function isRoutineCat(cat)   { return cat && cat.startsWith('routine_'); }
function getRoutineType(cat) { return cat.replace('routine_', ''); }
function getRoutineCat(type) { return 'routine_' + type; }
function getRoutineSlots() {
  try { return JSON.parse(localStorage.getItem('sloo_routine_slots') || '[]'); } catch { return []; }
}
function setRoutineSlots(arr) {
  localStorage.setItem('sloo_routine_slots', JSON.stringify(arr));
  saveRoutineMeta().catch(err => console.error('루틴 메타 저장 실패:', err));
}
function getRoutineUnlocked() { return parseInt(localStorage.getItem('sloo_routine_unlocked') || '1'); }
function setRoutineUnlocked(n) {
  localStorage.setItem('sloo_routine_unlocked', String(n));
  saveRoutineMeta().catch(err => console.error('루틴 메타 저장 실패:', err));
}

async function saveRoutineMeta() {
  if (!supabaseClient) return
  const { data: { session } } = await supabaseClient.auth.getSession()
  if (!session) return
  await supabaseClient
    .from('user_categories')
    .upsert({
      user_id: session.user.id,
      category: 'routine_meta',
      type: 'meta',
      level: 1,
      growth_count: 0,
      total_count: 0,
      maintain_count: 0,
      extra_data: {
        slots: JSON.parse(localStorage.getItem('sloo_routine_slots') || '[]'),
        unlocked: parseInt(localStorage.getItem('sloo_routine_unlocked') || '1')
      }
    }, { onConflict: 'user_id,category,type' })
}

function getAllActiveCatKeys() {
  const keys = CATEGORIES.filter(c => c !== 'routine' && getCatData(c)?.active);
  getRoutineSlots().forEach(type => keys.push(getRoutineCat(type)));
  return keys;
}

function computeRoutineStreak(data) {
  return data.streak || 0;
}

function checkRoutineUnlock() {
  const slots = getRoutineSlots();
  const unlocked = getRoutineUnlocked();
  if (unlocked >= 7) return false;
  const anyHit7 = slots.some(type => computeRoutineStreak(getCatData(getRoutineCat(type)) || {}) >= 7);
  if (anyHit7 && slots.length >= unlocked) {
    setRoutineUnlocked(unlocked + 1);
    return true;
  }
  return false;
}

/* ── localStorage 카테고리 헬퍼 ── */
function getCatData(cat) {
  try {
    const d = localStorage.getItem('sloo_' + cat);
    return d ? JSON.parse(d) : null;
  } catch(e) { return null; }
}

async function saveToSupabase(cat, obj) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const category = cat.includes('_') ? cat.split('_')[0] : cat;
  const type = cat.includes('_') ? cat.split('_')[1] : obj.type || null;

  await supabaseClient
    .from('user_categories')
    .upsert({
      user_id: session.user.id,
      category,
      type,
      level: obj.level,
      growth_count: obj.growth_count,
      total_count: obj.total_count,
      maintain_count: obj.maintain_count,
      last_date: obj.last_date,
      max_reached: obj.max_reached || false,
      extra_data: {
        current_bedtime: obj.current_bedtime,
        target_bedtime: obj.target_bedtime,
        current_target: obj.current_target,
        total_minutes_diff: obj.total_minutes_diff,
        mental_state: obj.mental_state,
        digital_reason: obj.digital_reason,
        morning_state: obj.morning_state,
        evening_state: obj.evening_state,
        space_reason: obj.space_reason,
        reading_reason: obj.reading_reason,
        streak: obj.streak || 0,
        streak_reset_after: obj.streak_reset_after || null
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,category,type' });
}

function setCatData(cat, obj) {
  localStorage.setItem('sloo_' + cat, JSON.stringify(obj));
  saveToSupabase(cat, obj).catch(err => console.error('Supabase 저장 실패:', err));
}

async function resetCat(cat) {
  localStorage.removeItem('sloo_' + cat);

  const { data: { session } } = await supabaseClient.auth.getSession()

  if (isRoutineCat(cat)) {
    const type = getRoutineType(cat);
    const slots = getRoutineSlots().filter(s => s !== type);
    setRoutineSlots(slots);
    if (slots.length === 0) localStorage.removeItem('sloo_routine_unlocked');
    if (session) {
      await supabaseClient.from('user_categories').delete()
        .eq('user_id', session.user.id).eq('category', 'routine_' + type)
      await supabaseClient.from('user_history').delete()
        .eq('user_id', session.user.id).eq('category', 'routine_' + type)
    }
  } else {
    if (session) {
      await supabaseClient.from('user_categories').delete()
        .eq('user_id', session.user.id).eq('category', cat)
      await supabaseClient.from('user_history').delete()
        .eq('user_id', session.user.id).eq('category', cat)
    }
  }
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

/* ── 수면 시간 헬퍼 ── */
function sleepTimeToMins(timeStr) {
  // timeStr: "HH:MM"  — 12:00 이후는 당일, 00:00~11:59는 익일로 처리
  const [h, m] = timeStr.split(':').map(Number);
  return (h >= 12 ? h : h + 24) * 60 + m;
}
function minsToTimeStr(mins) {
  const total = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function formatTimeKorean(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const ms = String(m).padStart(2,'0');
  if (h === 0) return `자정 0시 ${ms}분`;
  if (h < 6)  return `새벽 ${h}시 ${ms}분`;
  if (h < 12) return `오전 ${h}시 ${ms}분`;
  if (h === 12) return `낮 12시 ${ms}분`;
  if (h < 18) return `오후 ${h-12}시 ${ms}분`;
  if (h < 21) return `저녁 ${h-12}시 ${ms}분`;
  return `밤 ${h}시 ${ms}분`;
}
function isSleepMaxLevel(data) {
  if (!data || !data.current_target || !data.target_bedtime) return false;
  return sleepTimeToMins(data.current_target) <= sleepTimeToMins(data.target_bedtime);
}
function getSleepMissionText(data, choice) {
  if (isSleepMaxLevel(data)) return `오늘 ${data.target_bedtime}에 잤어요 체크하기`;
  const prefix = choice === 'maintain' ? '오늘도' : '오늘은';
  const target = choice === 'grow'
    ? minsToTimeStr(sleepTimeToMins(data.current_target) - 5)
    : data.current_target;
  return `${prefix} ${target}에 자보기`;
}

/* ── 드럼롤 피커 ── */
const DRUM_HOURS = Array.from({length:24}, (_,i) => String(i).padStart(2,'0'));
const DRUM_MINS  = ['00','05','10','15','20','25','30','35','40','45','50','55'];

function initDrumCol(col, items, initialVal) {
  const N = items.length;
  col.dataset.n = N;
  col.innerHTML = '';

  // 2 spacers top
  for (let i = 0; i < 2; i++) {
    const sp = document.createElement('div');
    sp.className = 'drum-item drum-spacer';
    col.appendChild(sp);
  }
  // 3 copies for infinite circular scroll
  for (let rep = 0; rep < 3; rep++) {
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'drum-item';
      el.textContent = item;
      col.appendChild(el);
    });
  }
  // 2 spacers bottom
  for (let i = 0; i < 2; i++) {
    const sp = document.createElement('div');
    sp.className = 'drum-item drum-spacer';
    col.appendChild(sp);
  }

  // Start at middle copy (rAF ensures element is visible before scrollTop is applied)
  const initIdx = N + Math.max(0, items.indexOf(initialVal));
  requestAnimationFrame(() => {
    col.scrollTop = initIdx * 44;
    updateDrumHighlight(col);
  });

  // 끝에 도달하면 중간 카피로 순간 점프 (애니메이션 없음)
  let wrapping = false;
  function wrapIfNeeded() {
    const rawIdx = Math.round(col.scrollTop / 44);
    if (rawIdx < N) {
      wrapping = true;
      col.scrollTop = (rawIdx + N) * 44;
      setTimeout(() => { wrapping = false; }, 30);
    } else if (rawIdx >= 2 * N) {
      wrapping = true;
      col.scrollTop = (rawIdx - N) * 44;
      setTimeout(() => { wrapping = false; }, 30);
    }
  }

  // scroll snap + wrap
  let snapTimer;
  col.addEventListener('scroll', () => {
    if (wrapping) return;
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      const i = Math.round(col.scrollTop / 44);
      col.scrollTo({ top: i * 44, behavior: 'smooth' });
      updateDrumHighlight(col);
      setTimeout(wrapIfNeeded, 300);
    }, 80);
  });

  // touch drag
  let tyStart = 0, tsStart = 0;
  col.addEventListener('touchstart', e => {
    tyStart = e.touches[0].clientY; tsStart = col.scrollTop;
  }, { passive: true });
  col.addEventListener('touchmove', e => {
    e.preventDefault();
    col.scrollTop = tsStart + (tyStart - e.touches[0].clientY);
  }, { passive: false });
  col.addEventListener('touchend', () => {
    const i = Math.round(col.scrollTop / 44);
    col.scrollTo({ top: i * 44, behavior: 'smooth' });
    updateDrumHighlight(col);
    setTimeout(wrapIfNeeded, 300);
  });

  // mouse drag
  let myStart = 0, msStart = 0, mDown = false;
  col.addEventListener('mousedown', e => {
    e.preventDefault(); mDown = true; myStart = e.clientY; msStart = col.scrollTop;
  });
  const mmove = e => { if (mDown) col.scrollTop = msStart + (myStart - e.clientY); };
  const mup   = () => {
    if (!mDown) return; mDown = false;
    const i = Math.round(col.scrollTop / 44);
    col.scrollTo({ top: i * 44, behavior: 'smooth' });
    updateDrumHighlight(col);
    setTimeout(wrapIfNeeded, 300);
  };
  col.addEventListener('_cleanup', () => {
    document.removeEventListener('mousemove', mmove);
    document.removeEventListener('mouseup', mup);
  });
  document.addEventListener('mousemove', mmove);
  document.addEventListener('mouseup', mup);

  // 마우스 휠: deltaY 누적값 방식 — 연속 스크롤 자연스럽게
  let accumulated = 0;
  col.addEventListener('wheel', e => {
    e.preventDefault();
    e.stopPropagation();
    accumulated += e.deltaY;
    if (accumulated > 30) {
      const cur = Math.round(col.scrollTop / 44);
      col.scrollTo({ top: (cur + 1) * 44, behavior: 'smooth' });
      updateDrumHighlight(col);
      accumulated = 0;
    } else if (accumulated < -30) {
      const cur = Math.round(col.scrollTop / 44);
      col.scrollTo({ top: (cur - 1) * 44, behavior: 'smooth' });
      updateDrumHighlight(col);
      accumulated = 0;
    }
  }, { passive: false });
}

function updateDrumHighlight(col) {
  const N = parseInt(col.dataset.n) || 0;
  const rawIdx = Math.round(col.scrollTop / 44);
  const normIdx = N ? ((rawIdx % N) + N) % N : rawIdx;
  col.querySelectorAll('.drum-item:not(.drum-spacer)').forEach((el, i) => {
    el.classList.toggle('drum-selected', N ? (i % N === normIdx) : i === normIdx);
  });
}

function getDrumValue(col) {
  const N = parseInt(col.dataset.n) || 0;
  const rawIdx = Math.round(col.scrollTop / 44);
  const normIdx = N ? ((rawIdx % N) + N) % N : rawIdx;
  const allItems = col.querySelectorAll('.drum-item:not(.drum-spacer)');
  return allItems[normIdx]?.textContent || '00';
}

function initSleepPickers() {
  initDrumCol(
    document.getElementById('sleep-cur-hour'), DRUM_HOURS,
    String(obSleepCurrentH).padStart(2,'0')
  );
  initDrumCol(
    document.getElementById('sleep-cur-min'), DRUM_MINS,
    String(Math.round(obSleepCurrentM / 5) * 5).padStart(2,'0')
  );
  initDrumCol(
    document.getElementById('sleep-tgt-hour'), DRUM_HOURS,
    String(obSleepTargetH).padStart(2,'0')
  );
  initDrumCol(
    document.getElementById('sleep-tgt-min'), DRUM_MINS,
    String(Math.round(obSleepTargetM / 5) * 5).padStart(2,'0')
  );
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

/* ── 루틴 데이터 마이그레이션 (sloo_routine → sloo_routine_{type}) ── */
function migrateRoutineIfNeeded() {
  const old = getCatData('routine');
  if (!old || !old.type) return;
  const type = old.type;
  const newKey = getRoutineCat(type);
  if (!getCatData(newKey)) setCatData(newKey, old);
  const slots = getRoutineSlots();
  if (!slots.includes(type)) { slots.push(type); setRoutineSlots(slots); }
  localStorage.removeItem('sloo_routine');
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
  if (n >= 365) return "1년. 37.78배. 말이 필요 없어요.";
  if (n >= 100) return "100일. 2.70배. 진짜 달라졌어요.";
  if (n >= 30)  return "한 달. 이제 습관이 되고 있어요.";
  if (n >= 7)   return "일주일 됐어요. 1.07배가 됐어요.";
  return "첫 번째 1%. 시작이 전부예요.";
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

function getNextMissionPreview(data, cat) {
  if (cat === 'sleep') {
    if (isSleepMaxLevel(data)) return '목표 취침 시간을 매일 지켜보자 🎉';
    return `다음 목표: ${data.current_target}에 자보기`;
  }
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

  // health / sleep 일반 카드
  CATEGORIES.forEach(cat => {
    if (cat === 'routine') return;
    const data = getCatData(cat);
    if (!data || !data.active) return;

    const meta = CAT_META[cat];
    const icon = getCatIcon(cat, data.type);
    const name = getCatName(cat, data.type) || meta.label;
    const mult = Math.round(Math.pow(1.01, data.growth_count) * 100) / 100;
    const doneToday = false;

    let catMetaHtml = `레벨 ${data.level} · ${mult.toFixed(2)}배`;
    let catProgressHtml = '';
    if (cat === 'sleep' && data.current_bedtime) {
      const isMax = isSleepMaxLevel(data);
      if (isMax) {
        catMetaHtml = `목표 달성 🎉 유지 중`;
        catProgressHtml = `<div class="sleep-progress-wrap">
          <div class="sleep-progress-track"><div class="sleep-progress-fill" style="width:100%"></div></div>
          <div class="sleep-progress-label">목표: ${data.target_bedtime}</div>
        </div>`;
      } else {
        const totalDiff = data.total_minutes_diff || 1;
        const curDiff = Math.max(0, sleepTimeToMins(data.current_target) - sleepTimeToMins(data.target_bedtime));
        const pct = Math.round(((totalDiff - curDiff) / totalDiff) * 100);
        catMetaHtml = `목표까지 ${curDiff}분 남음`;
        catProgressHtml = `<div class="sleep-progress-wrap">
          <div class="sleep-progress-track"><div class="sleep-progress-fill" style="width:${pct}%"></div></div>
          <div class="sleep-progress-label">현재: ${data.current_target} → 목표: ${data.target_bedtime}</div>
        </div>`;
      }
    }

    html += `<div class="home-cat-card home-cat-active">
      <div class="home-cat-top">
        <span class="home-cat-icon">${icon}</span>
        <div class="home-cat-info">
          <div class="home-cat-name">${name}</div>
          <div class="home-cat-meta">${catMetaHtml}</div>
        </div>
        <button class="home-cat-reset-btn" data-cat="${cat}" title="${name} 초기화">↺</button>
      </div>
      ${catProgressHtml}
      ${doneToday
        ? `<button class="home-cat-done-btn" disabled>오늘 1% 완료했어요 🌱</button>`
        : `<button class="home-cat-mission-btn" data-cat="${cat}">오늘 미션 하기 →</button>`
      }
    </div>`;
  });

  // 루틴/생활습관 그룹 카드
  const routineSlots = getRoutineSlots();
  if (routineSlots.length > 0) {
    const unlocked = getRoutineUnlocked();
    const canAdd = routineSlots.length < unlocked && routineSlots.length < 7;
    const availableTypes = Object.keys(ROUTINE_TYPE_META).filter(t => !routineSlots.includes(t));

    const slotsHtml = routineSlots.map(type => {
      const data = getCatData(getRoutineCat(type));
      if (!data) return '';
      const meta = ROUTINE_TYPE_META[type];
      const mult = Math.round(Math.pow(1.01, data.growth_count || 0) * 100) / 100;
      const streak = computeRoutineStreak(data);
      const doneToday = false;
      return `<div class="routine-slot-row">
        <span class="routine-slot-icon">${meta.icon}</span>
        <div class="routine-slot-info">
          <span class="routine-slot-name">${meta.label}</span>
          <span class="routine-slot-meta">레벨 ${data.level} · ${mult.toFixed(2)}배 · 🔥${streak}일 연속</span>
        </div>
        <div class="routine-slot-actions">
          ${doneToday
            ? `<button class="home-cat-done-btn" disabled>완료 🌱</button>`
            : `<button class="home-cat-mission-btn" data-cat="routine_${type}">미션 →</button>`
          }
          <button class="home-cat-reset-btn" data-cat="routine_${type}" title="${meta.label} 초기화">↺</button>
        </div>
      </div>`;
    }).join('');

    // 잠금 해제 프로그레스 (가장 높은 streak 기준)
    const maxStreak = Math.min(routineSlots.reduce((max, type) => {
      const d = getCatData(getRoutineCat(type));
      return Math.max(max, d ? computeRoutineStreak(d) : 0);
    }, 0), 7);
    const progressPct = Math.round((maxStreak / 7) * 100);
    const progressBar = `<div class="routine-progress-wrap">
      <div class="routine-progress-track">
        <div class="routine-progress-fill" style="width:${progressPct}%"></div>
      </div>
      <span class="routine-progress-label">${maxStreak}/7일</span>
    </div>`;

    const unlockBanner = canAdd
      ? `<div class="routine-unlock-banner">7일 연속 달성! 새로운 루틴을 추가할 수 있어 🎉</div>`
      : '';
    const addBtn = availableTypes.length > 0
      ? `<button class="routine-add-btn ${canAdd ? 'can-add' : 'locked'}" data-can-add="${canAdd}">
          ${canAdd ? '+ 루틴 추가하기' : '🔒 루틴 추가하기 (7일 연속 완료 시 해제)'}
        </button>${canAdd ? '' : progressBar}`
      : '';

    html += `<div class="home-cat-card home-cat-active home-routine-group">
      <div class="home-cat-top">
        <span class="home-cat-icon">📋</span>
        <div class="home-cat-info"><div class="home-cat-name">루틴/생활습관</div></div>
      </div>
      ${unlockBanner}
      <div class="routine-slots-list">${slotsHtml}</div>
      ${addBtn}
    </div>`;
  }

  // 추가하기 섹션
  const inactiveCats = CATEGORIES.filter(cat => {
    if (cat === 'routine') return routineSlots.length === 0;
    const d = getCatData(cat);
    return !d || !d.active;
  });
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
  container.querySelectorAll('.routine-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.canAdd === 'true') startAddRoutine();
    });
  });
}

/* ── 카테고리 미션 시작 ── */
function startCatMission(cat) {
  currentMissionCategory = cat;
  const data = getCatData(cat);
  if (!data) return;
  if (cat === 'sleep' && isSleepMaxLevel(data)) {
    showFirstMission(); // 맥스레벨: A/B 없이 바로 미션
  } else if (cat === 'health' || cat === 'sleep' || isRoutineCat(cat)) {
    if (data.last_date === today()) {
      showMainChoice();
    } else {
      showMissionScreen('grow');
    }
  } else {
    showDailyState();
  }
}

/* ── 카테고리 온보딩 (홈에서 "추가하기" 클릭 시) ── */
function startAddRoutine() {
  currentOnboardingCategory = 'routine';
  obPendingType = null;
  const activeSlots = getRoutineSlots();
  document.querySelectorAll('.ob2rt-card').forEach(c => {
    c.classList.remove('selected');
    c.style.display = activeSlots.includes(c.dataset.val) ? 'none' : '';
  });
  document.getElementById('ob2rt-step-text').textContent = '1 / 2';
  document.getElementById('ob2rt-step-fill').style.width = '50%';
  showScreen('screen-ob2-routine');
}

function startCatOnboarding(cat) {
  currentOnboardingCategory = cat;
  if (cat === 'health') {
    document.getElementById('ob2ex-step-text').textContent = '1 / 2';
    document.getElementById('ob2ex-step-fill').style.width = '50%';
    document.querySelectorAll('.ob2ex-card').forEach(c => c.classList.remove('selected'));
    showScreen('screen-ob2-exercise');
  } else if (cat === 'sleep') {
    obSleepCurrentH = 2; obSleepCurrentM = 0;
    obSleepTargetH = 0; obSleepTargetM = 0;
    document.getElementById('ob-sleep-cur-step-text').textContent = '1 / 2';
    document.getElementById('ob-sleep-cur-step-fill').style.width = '50%';
    initSleepPickers();
    showScreen('screen-ob-sleep-current');
  } else if (cat === 'routine') {
    startAddRoutine();
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
  migrateRoutineIfNeeded();
  updateSidebar();
  // init은 세션 있는 경우에만 호출되어야 함
  // 세션 없이 호출되면 아무것도 하지 않음 (DOMContentLoaded에서 ob-wrap 처리)
}

/* ── A/B 선택 화면 (운동) ── */
function showMainChoice() {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  const el = document.getElementById('screen-main');
  el.querySelector('.main-days').textContent = data.total_count;
  el.querySelector('.main-mult').textContent = multStr(data.growth_count);
  if (cat === 'sleep') {
    const remainMins = sleepTimeToMins(data.current_target) - sleepTimeToMins(data.target_bedtime);
    el.querySelector('.main-level').textContent = isSleepMaxLevel(data) ? '목표 달성 🎉' : `목표까지 ${remainMins}분`;
  } else {
    el.querySelector('.main-level').textContent = data.level;
  }

  const aCard = document.getElementById('choice-a-card');
  if (cat === 'sleep') {
    const isMax = isSleepMaxLevel(data);
    const growText = isMax
      ? `오늘도 ${data.current_target}에 자보기`
      : `오늘은 ${minsToTimeStr(sleepTimeToMins(data.current_target) - 5)}에 자보기`;
    el.querySelector('.card-grow-preview').textContent = growText;
    el.querySelector('.card-maintain-preview').textContent = `오늘도 ${data.current_target}에 자보기`;
    if (isMax) {
      aCard.querySelector('.ab-card-title').textContent = '목표 취침 시간 유지 🏆';
      aCard.querySelector('.ab-card-stat').textContent = '';
    } else {
      aCard.querySelector('.ab-card-title').textContent = '한 단계 더 성장할게';
      aCard.querySelector('.ab-card-stat').textContent = '+1%';
    }
  } else {
    const currentMission = getExerciseMission(data.type, data.level);
    const nextMission = data.level < 7
      ? getExerciseMission(data.type, data.level + 1)
      : '최고 레벨! 다음 카테고리를 추가해보세요';
    el.querySelector('.card-grow-preview').textContent = nextMission;
    el.querySelector('.card-maintain-preview').textContent = currentMission;
    if (data.level >= 7) {
      aCard.querySelector('.ab-card-title').textContent = '최고 레벨 달성 🏆';
      aCard.querySelector('.ab-card-stat').textContent = '';
    } else {
      aCard.querySelector('.ab-card-title').textContent = '한 단계 더 성장할게';
      aCard.querySelector('.ab-card-stat').textContent = '+1%';
    }
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
  if (cat === 'sleep') {
    missionText = getSleepMissionText(data, choice);
  } else if (choice === 'grow') {
    missionText = data.level < 7
      ? getExerciseMission(data.type, data.level + 1)
      : getExerciseMission(data.type, 7);
  } else {
    missionText = getExerciseMission(data.type, data.level);
  }
  document.getElementById('mission-empathy').textContent = cat === 'sleep'
    ? (isSleepMaxLevel(data) ? '목표를 달성했어. 유지만 하면 돼 🎉' : '취침 시간을 조금씩 앞당겨보자.')
    : EMPATHY_MSGS[data.fail_reason || 0];
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
  document.getElementById('btn-mission-back').style.display = data.last_date === today() ? '' : 'none';
  const isEvening = cat === 'routine_evening';
  document.getElementById('mission-gratitude-link').style.display = isEvening ? '' : 'none';
  const effectiveLv = cat === 'routine_mental'
    ? (choice === 'grow' && data.level < 7 ? (data.level || 1) + 1 : (data.level || 1))
    : 0;
  document.getElementById('mission-breathing-link').style.display = (cat === 'routine_mental' && effectiveLv <= 4) ? '' : 'none';
  document.getElementById('mission-meditation-link').style.display = (cat === 'routine_mental' && effectiveLv >= 5) ? '' : 'none';
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
    missionText = getSleepMissionText(data, 'grow');
  } else if (isRoutineCat(cat) && data.type) {
    missionText = getExerciseMission(data.type, data.level || 1);
  } else {
    const e = energy || 'mid';
    const m = mental || 'mid';
    missionText = ENERGY_MISSIONS[e + '-' + m] || '';
  }
  document.getElementById('first-empathy-msg').textContent = cat === 'sleep'
    ? (isSleepMaxLevel(data) ? '목표를 달성했어요. 유지만 하면 돼요 🎉' : '취침 시간을 조금씩 앞당겨보세요. 5분씩이면 충분해요.')
    : EMPATHY_MSGS[data?.fail_reason || 0];
  document.getElementById('first-mission-text').textContent = missionText;
  document.getElementById('first-result-msg').textContent = '';
  document.getElementById('first-result-msg').className = 'result-msg';
  document.getElementById('first-growth-card').classList.remove('show');
  document.getElementById('first-action-btns').style.display = '';
  document.getElementById('btn-first-home').style.display = 'none';
  const isEveningFirst = cat === 'routine_evening';
  document.getElementById('first-gratitude-link').style.display = isEveningFirst ? '' : 'none';
  const isFirstMentalBreathing = cat === 'routine_mental' && (data.level || 1) <= 4;
  document.getElementById('first-breathing-link').style.display = isFirstMentalBreathing ? '' : 'none';
  const isFirstMentalMeditation = cat === 'routine_mental' && (data.level || 1) >= 5;
  document.getElementById('first-meditation-link').style.display = isFirstMentalMeditation ? '' : 'none';
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
let obSleepCurrentH = 2;
let obSleepCurrentM = 0;
let obSleepTargetH = 0;
let obSleepTargetM = 0;
let obMentalState = null;
let obDigitalReason = null;
let obReadingReason = null;
let obMorningState = null;
let obEveningState = null;
let obSpaceReason = null;

/* 랜딩 → 온보딩 or 홈 */
document.getElementById('btn-start').addEventListener('click', async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://sloo.kr' }
    });
    return;
  }
  const hasAny = getAllActiveCatKeys().length > 0;
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
        obSleepCurrentH = 2; obSleepCurrentM = 0;
        obSleepTargetH = 0; obSleepTargetM = 0;
        document.getElementById('ob-sleep-cur-step-text').textContent = '2 / 3';
        document.getElementById('ob-sleep-cur-step-fill').style.width = '66%';
        initSleepPickers();
        showScreen('screen-ob-sleep-current');
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
      if (obPendingType === 'mental') {
        // 멘탈관리: "요즘 어때?" 화면으로
        document.getElementById('ob-mental-state-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
        document.getElementById('ob-mental-state-step-fill').style.width = '100%';
        document.querySelectorAll('.ob-mental-state-card').forEach(c => c.classList.remove('selected'));
        obMentalState = null;
        showScreen('screen-ob-mental-state');
      } else if (obPendingType === 'digital') {
        // 디지털디톡스: "핸드폰, 왜 못 끊겠어?" 화면으로
        document.getElementById('ob-digital-reason-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
        document.getElementById('ob-digital-reason-step-fill').style.width = '100%';
        document.querySelectorAll('.ob-digital-reason-card').forEach(c => c.classList.remove('selected'));
        obDigitalReason = null;
        showScreen('screen-ob-digital-reason');
      } else if (obPendingType === 'space') {
        // 정리정돈: "정리정돈, 왜 하고 싶어?" 화면으로
        document.getElementById('ob-space-reason-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
        document.getElementById('ob-space-reason-step-fill').style.width = '100%';
        document.querySelectorAll('.ob-space-reason-card').forEach(c => c.classList.remove('selected'));
        obSpaceReason = null;
        showScreen('screen-ob-space-reason');
      } else if (obPendingType === 'evening') {
        // 저녁루틴: "하루 끝날 때 어때?" 화면으로
        document.getElementById('ob-evening-state-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
        document.getElementById('ob-evening-state-step-fill').style.width = '100%';
        document.querySelectorAll('.ob-evening-state-card').forEach(c => c.classList.remove('selected'));
        obEveningState = null;
        showScreen('screen-ob-evening-state');
      } else if (obPendingType === 'morning') {
        // 아침루틴: "아침이 어때?" 화면으로
        document.getElementById('ob-morning-state-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
        document.getElementById('ob-morning-state-step-fill').style.width = '100%';
        document.querySelectorAll('.ob-morning-state-card').forEach(c => c.classList.remove('selected'));
        obMorningState = null;
        showScreen('screen-ob-morning-state');
      } else if (obPendingType === 'reading') {
        // 독서: "책, 왜 못 읽겠어?" 화면으로
        document.getElementById('ob-reading-reason-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
        document.getElementById('ob-reading-reason-step-fill').style.width = '100%';
        document.querySelectorAll('.ob-reading-reason-card').forEach(c => c.classList.remove('selected'));
        obReadingReason = null;
        showScreen('screen-ob-reading-reason');
      } else {
        document.getElementById('reason-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
        document.getElementById('reason-step-fill').style.width = '100%';
        document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
        showScreen('screen-ob-reason');
      }
    }, 280);
  });
});

/* 온보딩 (멘탈관리): 요즘 어때? 상태 선택 */
document.querySelectorAll('.ob-mental-state-card').forEach(card => {
  card.addEventListener('click', () => {
    obMentalState = card.dataset.val;
    document.querySelectorAll('.ob-mental-state-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      // 로딩 화면: 공감 메시지 표시 + 멘탈 전용 텍스트
      const empathyEl = document.getElementById('ob-loading-empathy');
      empathyEl.textContent = card.dataset.msg;
      empathyEl.style.display = '';
      document.getElementById('ob-loading-text').textContent = '당신의 상태에 맞는 미션을 만들고 있습니다...';
      showScreen('screen-ob-loading');
      // 카테고리 데이터 생성
      const obj = newCatObj();
      obj.fail_reason = 0;
      obj.type = 'mental';
      obj.mental_state = obMentalState;
      const routineCat = getRoutineCat('mental');
      setCatData(routineCat, obj);
      const slots = getRoutineSlots();
      if (!slots.includes('mental')) {
        const resetDate = today();
        slots.forEach(type => {
          const d = getCatData(getRoutineCat(type));
          if (d) { d.streak = 0; d.streak_reset_after = resetDate; setCatData(getRoutineCat(type), d); }
        });
        slots.push('mental');
        setRoutineSlots(slots);
      }
      currentMissionCategory = routineCat;
      setTimeout(showFirstMission, 2000 + Math.random() * 500);
    }, 280);
  });
});

/* 온보딩 (디지털디톡스): 핸드폰, 왜 못 끊겠어? 이유 선택 */
document.querySelectorAll('.ob-digital-reason-card').forEach(card => {
  card.addEventListener('click', () => {
    obDigitalReason = card.dataset.val;
    document.querySelectorAll('.ob-digital-reason-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      // 로딩 화면: 공감 메시지 표시 + 디지털 전용 텍스트
      const empathyEl = document.getElementById('ob-loading-empathy');
      empathyEl.textContent = card.dataset.msg;
      empathyEl.style.display = '';
      document.getElementById('ob-loading-text').textContent = '당신의 상태에 맞는 미션을 만들고 있습니다...';
      showScreen('screen-ob-loading');
      // 카테고리 데이터 생성
      const obj = newCatObj();
      obj.fail_reason = 0;
      obj.type = 'digital';
      obj.digital_reason = obDigitalReason;
      const routineCat = getRoutineCat('digital');
      setCatData(routineCat, obj);
      const slots = getRoutineSlots();
      if (!slots.includes('digital')) {
        const resetDate = today();
        slots.forEach(type => {
          const d = getCatData(getRoutineCat(type));
          if (d) { d.streak = 0; d.streak_reset_after = resetDate; setCatData(getRoutineCat(type), d); }
        });
        slots.push('digital');
        setRoutineSlots(slots);
      }
      currentMissionCategory = routineCat;
      setTimeout(showFirstMission, 2000 + Math.random() * 500);
    }, 280);
  });
});

/* 온보딩 (정리정돈): 정리정돈, 왜 하고 싶어? 이유 선택 */
document.querySelectorAll('.ob-space-reason-card').forEach(card => {
  card.addEventListener('click', () => {
    obSpaceReason = card.dataset.val;
    document.querySelectorAll('.ob-space-reason-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      const empathyEl = document.getElementById('ob-loading-empathy');
      empathyEl.textContent = card.dataset.msg;
      empathyEl.style.display = '';
      document.getElementById('ob-loading-text').textContent = '당신만의 맞춤 미션을 만들고 있습니다...';
      showScreen('screen-ob-loading');
      const obj = newCatObj();
      obj.fail_reason = 0;
      obj.type = 'space';
      obj.space_reason = obSpaceReason;
      const routineCat = getRoutineCat('space');
      setCatData(routineCat, obj);
      const slots = getRoutineSlots();
      if (!slots.includes('space')) {
        const resetDate = today();
        slots.forEach(type => {
          const d = getCatData(getRoutineCat(type));
          if (d) { d.streak = 0; d.streak_reset_after = resetDate; setCatData(getRoutineCat(type), d); }
        });
        slots.push('space');
        setRoutineSlots(slots);
      }
      currentMissionCategory = routineCat;
      setTimeout(showFirstMission, 2700);
    }, 280);
  });
});

/* 온보딩 (저녁루틴): 하루 끝날 때 어때? 상태 선택 */
document.querySelectorAll('.ob-evening-state-card').forEach(card => {
  card.addEventListener('click', () => {
    obEveningState = card.dataset.val;
    document.querySelectorAll('.ob-evening-state-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      const empathyEl = document.getElementById('ob-loading-empathy');
      empathyEl.textContent = card.dataset.msg;
      empathyEl.style.display = '';
      document.getElementById('ob-loading-text').textContent = '당신만의 맞춤 미션을 만들고 있습니다...';
      showScreen('screen-ob-loading');
      const obj = newCatObj();
      obj.fail_reason = 0;
      obj.type = 'evening';
      obj.evening_state = obEveningState;
      const routineCat = getRoutineCat('evening');
      setCatData(routineCat, obj);
      const slots = getRoutineSlots();
      if (!slots.includes('evening')) {
        const resetDate = today();
        slots.forEach(type => {
          const d = getCatData(getRoutineCat(type));
          if (d) { d.streak = 0; d.streak_reset_after = resetDate; setCatData(getRoutineCat(type), d); }
        });
        slots.push('evening');
        setRoutineSlots(slots);
      }
      currentMissionCategory = routineCat;
      setTimeout(showFirstMission, 2700);
    }, 280);
  });
});

/* 온보딩 (아침루틴): 아침이 어때? 상태 선택 */
document.querySelectorAll('.ob-morning-state-card').forEach(card => {
  card.addEventListener('click', () => {
    obMorningState = card.dataset.val;
    document.querySelectorAll('.ob-morning-state-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      const empathyEl = document.getElementById('ob-loading-empathy');
      empathyEl.textContent = card.dataset.msg;
      empathyEl.style.display = '';
      document.getElementById('ob-loading-text').textContent = '당신만의 맞춤 미션을 만들고 있습니다...';
      showScreen('screen-ob-loading');
      const obj = newCatObj();
      obj.fail_reason = 0;
      obj.type = 'morning';
      obj.morning_state = obMorningState;
      const routineCat = getRoutineCat('morning');
      setCatData(routineCat, obj);
      const slots = getRoutineSlots();
      if (!slots.includes('morning')) {
        const resetDate = today();
        slots.forEach(type => {
          const d = getCatData(getRoutineCat(type));
          if (d) { d.streak = 0; d.streak_reset_after = resetDate; setCatData(getRoutineCat(type), d); }
        });
        slots.push('morning');
        setRoutineSlots(slots);
      }
      currentMissionCategory = routineCat;
      setTimeout(showFirstMission, 2700);
    }, 280);
  });
});

/* 온보딩 (독서): 책, 왜 못 읽겠어? 이유 선택 */
document.querySelectorAll('.ob-reading-reason-card').forEach(card => {
  card.addEventListener('click', () => {
    obReadingReason = card.dataset.val;
    document.querySelectorAll('.ob-reading-reason-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      const empathyEl = document.getElementById('ob-loading-empathy');
      empathyEl.textContent = card.dataset.msg;
      empathyEl.style.display = '';
      document.getElementById('ob-loading-text').textContent = '당신만의 맞춤 미션을 만들고 있습니다...';
      showScreen('screen-ob-loading');
      const obj = newCatObj();
      obj.fail_reason = 0;
      obj.type = 'reading';
      obj.reading_reason = obReadingReason;
      const routineCat = getRoutineCat('reading');
      setCatData(routineCat, obj);
      const slots = getRoutineSlots();
      if (!slots.includes('reading')) {
        const resetDate = today();
        slots.forEach(type => {
          const d = getCatData(getRoutineCat(type));
          if (d) { d.streak = 0; d.streak_reset_after = resetDate; setCatData(getRoutineCat(type), d); }
        });
        slots.push('reading');
        setRoutineSlots(slots);
      }
      currentMissionCategory = routineCat;
      setTimeout(showFirstMission, 2700);
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

/* 온보딩 (수면): 현재 취침 시간 → 다음 */
document.getElementById('btn-sleep-cur-next').addEventListener('click', () => {
  obSleepCurrentH = parseInt(getDrumValue(document.getElementById('sleep-cur-hour')));
  obSleepCurrentM = parseInt(getDrumValue(document.getElementById('sleep-cur-min')));
  const isInit = document.getElementById('ob-sleep-cur-step-text').textContent.includes('/ 3');
  document.getElementById('ob-sleep-tgt-step-text').textContent = isInit ? '3 / 3' : '2 / 2';
  document.getElementById('ob-sleep-tgt-step-fill').style.width = '100%';
  showScreen('screen-ob-sleep-target');
  initDrumCol(document.getElementById('sleep-tgt-hour'), DRUM_HOURS, String(obSleepTargetH).padStart(2,'0'));
  initDrumCol(document.getElementById('sleep-tgt-min'), DRUM_MINS, String(Math.round(obSleepTargetM / 5) * 5).padStart(2,'0'));
});

/* 온보딩 (수면): 목표 취침 시간 → 확인 */
document.getElementById('btn-sleep-tgt-next').addEventListener('click', () => {
  obSleepTargetH = parseInt(getDrumValue(document.getElementById('sleep-tgt-hour')));
  obSleepTargetM = parseInt(getDrumValue(document.getElementById('sleep-tgt-min')));
  const curStr = `${String(obSleepCurrentH).padStart(2,'0')}:${String(obSleepCurrentM).padStart(2,'0')}`;
  const tgtStr = `${String(obSleepTargetH).padStart(2,'0')}:${String(obSleepTargetM).padStart(2,'0')}`;
  const curMins = sleepTimeToMins(curStr);
  const tgtMins = sleepTimeToMins(tgtStr);
  const diffMins = curMins - tgtMins;
  let confirmText;
  if (diffMins <= 0) {
    confirmText = '이미 목표를 달성했어요! 유지 모드로 시작합니다 🌱';
  } else {
    const totalMissions = Math.ceil(diffMins / 5);
    confirmText = `현재 ${formatTimeKorean(curStr)} → 목표 ${formatTimeKorean(tgtStr)}\n총 ${totalMissions}번의 미션으로 목표에 도달할 수 있어요 🌱`;
  }
  document.getElementById('sleep-confirm-msg').textContent = confirmText;
  showScreen('screen-ob-sleep-confirm');
});

/* 온보딩 (수면): 시작하기 */
document.getElementById('btn-sleep-confirm-start').addEventListener('click', () => {
  const curStr = `${String(obSleepCurrentH).padStart(2,'0')}:${String(obSleepCurrentM).padStart(2,'0')}`;
  const tgtStr = `${String(obSleepTargetH).padStart(2,'0')}:${String(obSleepTargetM).padStart(2,'0')}`;
  const curMins = sleepTimeToMins(curStr);
  const tgtMins = sleepTimeToMins(tgtStr);
  const diffMins = Math.max(0, curMins - tgtMins);
  const alreadyDone = diffMins <= 0;
  const obj = {
    active: true,
    type: 'sleep',
    current_bedtime: curStr,
    target_bedtime: tgtStr,
    current_target: alreadyDone ? tgtStr : curStr,
    total_minutes_diff: alreadyDone ? 0 : diffMins,
    growth_count: alreadyDone ? 1 : 0,
    total_count: 0,
    maintain_count: 0,
    last_date: null,
    history: []
  };
  setCatData('sleep', obj);
  currentMissionCategory = 'sleep';
  document.getElementById('ob-loading-empathy').style.display = 'none';
  document.getElementById('ob-loading-text').textContent = '당신만의 맞춤 미션을 만들고 있습니다...';
  showScreen('screen-ob-loading');
  setTimeout(showFirstMission, 2000 + Math.random() * 500);
});

/* 온보딩: 실패 이유 선택 */
document.querySelectorAll('.reason-card').forEach(card => {
  card.addEventListener('click', () => {
    obPendingReason = parseInt(card.dataset.val);
    document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const cat = currentOnboardingCategory;
    setTimeout(() => {
      if (cat === 'health' || (cat === 'routine' && obPendingType)) {
        // 운동/루틴(타입있음): 카테고리 데이터 생성 후 첫 미션
        const obj = newCatObj();
        obj.fail_reason = obPendingReason;
        if (cat === 'health') {
          obj.type = obPendingType;
        } else if (cat === 'routine' && obPendingType) {
          obj.type = obPendingType;
          const routineCat = getRoutineCat(obPendingType);
          setCatData(routineCat, obj);
          const slots = getRoutineSlots();
          if (!slots.includes(obPendingType)) {
            // 새 루틴 추가 시 기존 모든 슬롯의 streak 리셋 (streak_reset_after 설정)
            const resetDate = today();
            slots.forEach(type => {
              const d = getCatData(getRoutineCat(type));
              if (d) { d.streak = 0; d.streak_reset_after = resetDate; setCatData(getRoutineCat(type), d); }
            });
            slots.push(obPendingType);
            setRoutineSlots(slots);
          }
          currentMissionCategory = routineCat;
          showFirstMission();
          return;
        }
        setCatData(cat, obj);
        currentMissionCategory = cat;
        if (cat === 'health') {
          document.getElementById('ob-loading-empathy').style.display = 'none';
          document.getElementById('ob-loading-text').textContent = '당신만의 맞춤 미션을 만들고 있습니다...';
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
  if (cat === 'sleep') {
    if (isSleepMaxLevel(data)) {
      data.growth_count = oldGc + 0.5;
    } else {
      data.current_target = minsToTimeStr(sleepTimeToMins(data.current_target) - 5);
      data.growth_count = oldGc + 1;
    }
    data.maintain_count = 0;
  } else {
    data.growth_count = oldGc + 1;
    data.maintain_count = 0;
  }
  data.last_date = t;
  if (isRoutineCat(cat)) data.streak = (data.streak || 0) + 1;
  pushHistory(data, 'growth', t);
  setCatData(cat, data);
  syncMissionToSupabase(cat, data, 'growth');
  if (isRoutineCat(cat)) checkRoutineUnlock();
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
    const fgNext = getNextMissionPreview(data, cat);
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
    if (isRoutineCat(cat)) data.streak = 0;
    pushHistory(data, 'pass', today());
    setCatData(cat, data);
    syncMissionToSupabase(cat, data, 'pass');
    updateSidebar();
  }
  const msg = document.getElementById('first-result-msg');
  msg.textContent = '오늘은 쉬어가도 돼요. 내일 다시 켜보세요.';
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

  if (cat === 'sleep') {
    if (currentChoice === 'grow' && !isSleepMaxLevel(data)) {
      data.current_target = minsToTimeStr(sleepTimeToMins(data.current_target) - 5);
      data.growth_count = oldGc + 1;
      data.maintain_count = 0;
      pushHistory(data, 'growth', t);
    } else {
      data.growth_count = oldGc + 0.5;
      data.maintain_count = (data.maintain_count || 0) + 1;
      pushHistory(data, 'maintain', t);
    }
  } else if (currentChoice === 'grow') {
    if (data.level < 7) data.level++;
    data.growth_count = oldGc + 1;
    data.maintain_count = 0;
    pushHistory(data, 'growth', t);
  } else {
    data.growth_count = oldGc + 0.5;
    data.maintain_count = (data.maintain_count || 0) + 1;
    pushHistory(data, 'maintain', t);
  }

  if (isRoutineCat(cat)) data.streak = (data.streak || 0) + 1;
  setCatData(cat, data);
  syncMissionToSupabase(cat, data, currentChoice === 'grow' ? 'growth' : 'maintain');
  if (isRoutineCat(cat)) checkRoutineUnlock();
  updateSidebar();
  document.getElementById('mission-action-btns').style.display = 'none';
  document.getElementById('btn-mission-back').style.display = 'none';

  showGrowthAnimation(oldGc, data.growth_count, () => {
    const msg = document.getElementById('mission-result');
    if (currentChoice === 'grow') {
      const levelText = cat === 'sleep'
        ? ''
        : ` 레벨 ${data.level} 달성! 🎉`;
      msg.innerHTML = `오늘 1% 완료 🌱<br><small>${data.total_count}회째. ${multStr(data.growth_count)}배의 당신.${levelText}</small>`;
    } else {
      const subMsg = MAINTAIN_MSGS[data.maintain_count] || MAINTAIN_MSGS[3];
      msg.innerHTML = `오늘도 지켰어. 0.5% 성장했어 🌱<br><small>${subMsg}</small>`;
    }
    msg.className = 'result-msg done-msg show';

    const gc = data.growth_count;
    document.getElementById('mg-plant').textContent = getPlantIcon(gc);
    document.getElementById('mg-formula').innerHTML = `1.01<sup>${gc}</sup> = ${multStr(gc)}배의 당신입니다`;
    document.getElementById('mg-msg').textContent = getGrowthMsg(gc);
    const mgNext = getNextMissionPreview(data, cat);
    const mgNextEl = document.getElementById('mg-next-preview');
    if (mgNext && mgNextEl) {
      mgNextEl.innerHTML = `<span class="next-mission-label">내일의 1% 👀</span><span class="next-mission-text">${mgNext}</span>`;
      mgNextEl.style.display = '';
    }
    document.getElementById('mission-growth-card').classList.add('show');
    if ((cat !== 'sleep' && data.level >= 7) || (cat === 'sleep' && isSleepMaxLevel(data))) {
      document.getElementById('mg-max-level').style.display = '';
    }
    document.getElementById('btn-mission-home').style.display = '';
  });
});

/* ── 미션: 패스 ── */
document.getElementById('btn-mission-pass').addEventListener('click', () => {
  const cat = currentMissionCategory;
  const data = getCatData(cat);
  if (data) {
    data.maintain_count = 0;
    if (isRoutineCat(cat)) data.streak = 0;
    pushHistory(data, 'pass', today());
    setCatData(cat, data);
    syncMissionToSupabase(cat, data, 'pass');
    updateSidebar();
  }
  const msg = document.getElementById('mission-result');
  msg.textContent = '오늘은 쉬어가도 돼요. 내일 다시 켜보세요.';
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
document.getElementById('btn-first-back-home').addEventListener('click', showHome);
document.getElementById('btn-mission-back-home').addEventListener('click', showHome);

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
  showHome();
});

/* ── 초기화 모달 ── */
function openResetModal(cat) {
  pendingResetCategory = cat || null;
  const msg = document.querySelector('#modal-reset .modal-msg');
  if (cat) {
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

document.getElementById('modal-reset-ok').addEventListener('click', async () => {
  document.getElementById('modal-reset').style.display = 'none';
  if (pendingResetCategory) {
    await resetCat(pendingResetCategory);
    pendingResetCategory = null;
    renderHomeCards();
    renderHomeGrass();
    updateSidebar();
  } else {
    getRoutineSlots().forEach(type => localStorage.removeItem('sloo_routine_' + type));
    localStorage.removeItem('sloo_routine_slots');
    localStorage.removeItem('sloo_routine_unlocked');
    // 활성 루틴 슬롯 Supabase 삭제
    const slots = getRoutineSlots()
    await Promise.all(slots.map(type => resetCat('routine_' + type)))
    // 기존 코드
    await Promise.all(CATEGORIES.map(k => resetCat(k)));
    // routine_meta 삭제
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (session) {
      await supabaseClient.from('user_categories').delete()
        .eq('user_id', session.user.id)
        .eq('category', 'routine_meta')
      // user_history 전체 삭제
      await supabaseClient.from('user_history').delete()
        .eq('user_id', session.user.id)
    }
    // 구 키도 정리
    ['sloo_category','sloo_type','sloo_fail_reason','sloo_level','sloo_days',
     'sloo_last_date','sloo_completed_today','sloo_maintain_count','sloo_energy',
     'sloo_mental','sloo_growth_count','sloo_total_count','sloo_history','sloo_maintain_streak']
      .forEach(k => localStorage.removeItem(k));
    document.querySelectorAll('.choice-card, .option').forEach(c => c.classList.remove('selected', 'active'));
    showLanding();
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

/* ── 호흡 모달 ── */
function openBreathingModal() {
  document.getElementById('breathing-modal-overlay').classList.add('open');
}
function closeBreathingModal() {
  document.getElementById('breathing-modal-overlay').classList.remove('open');
}
document.getElementById('first-breathing-link').addEventListener('click', openBreathingModal);
document.getElementById('mission-breathing-link').addEventListener('click', openBreathingModal);
document.getElementById('breathing-modal-close').addEventListener('click', closeBreathingModal);
document.getElementById('breathing-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('breathing-modal-overlay')) closeBreathingModal();
});

/* ── 명상 모달 ── */
function openMeditationModal() {
  document.getElementById('meditation-modal-overlay').classList.add('open');
}
function closeMeditationModal() {
  document.getElementById('meditation-modal-overlay').classList.remove('open');
}
document.getElementById('first-meditation-link').addEventListener('click', openMeditationModal);
document.getElementById('mission-meditation-link').addEventListener('click', openMeditationModal);
document.getElementById('meditation-modal-close').addEventListener('click', closeMeditationModal);
document.getElementById('meditation-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('meditation-modal-overlay')) closeMeditationModal();
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

  const activeCats = getAllActiveCatKeys();
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
    '아직 시작 전이에요. 오늘 1%를 시작해보세요. 🌱',
    '오늘 1% 했어요. 충분해요. 🌱',
    '오늘 2% 했어요. 욕심쟁이네요. 😄',
    '오늘 3% 했어요. 이러다 37.78배 금방 되겠는데요. 🔥'
  ];
  const allKeys = getAllActiveCatKeys();
  const completedToday = allKeys.filter(k => {
    const d = getCatData(k);
    return d?.last_date === todayStr;
  }).length;
  const totalGrowth = allKeys.reduce((sum, k) => {
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

  allKeys.forEach(cat => {
    const data = getCatData(cat);
    const icon = getCatIcon(cat, data?.type);
    const name = getCatName(cat, data?.type) || CAT_META[cat]?.label || '';

    if (!data) return;

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

    html += `
      <div class="sb-sect-label">진행 중인 루틴</div>
      <div class="sb-cat-title">${icon} ${name}</div>

      <div class="sb-sect-divider"></div>
      <div class="sb-sect-label">현재 성장률</div>
      <div class="sb-mult-big ${multClass}">${mult.toFixed(2)}<span class="sb-mult-unit">배</span></div>
      ${statusHtml}

      <div class="sb-sect-divider"></div>
      ${cat === 'sleep' && data.current_bedtime ? (() => {
        const isMax = isSleepMaxLevel(data);
        if (isMax) {
          return `<div class="sb-sect-label">취침 목표</div>
          <div class="sb-level-display">목표 달성 🎉</div>
          <div class="sb-level-bar-track"><div class="sb-level-bar-fill" style="width:100%"></div></div>
          <div class="sleep-progress-label" style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">목표: ${data.target_bedtime} 유지 중</div>`;
        }
        const totalDiff = data.total_minutes_diff || 1;
        const curDiff = Math.max(0, sleepTimeToMins(data.current_target) - sleepTimeToMins(data.target_bedtime));
        const pct = Math.round(((totalDiff - curDiff) / totalDiff) * 100);
        return `<div class="sb-sect-label">취침 목표 진행</div>
          <div class="sb-level-display">목표까지 ${curDiff}분 남음</div>
          <div class="sb-level-bar-track"><div class="sb-level-bar-fill" style="width:${pct}%"></div></div>
          <div class="sleep-progress-label" style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">현재: ${data.current_target} → 목표: ${data.target_bedtime}</div>`;
      })() : `<div class="sb-sect-label">레벨 진행</div>
      <div class="sb-level-display">레벨 ${level} / 7</div>
      <div class="sb-level-bar-track">
        <div class="sb-level-bar-fill" style="width:${levelPct}%"></div>
      </div>
      ${nextMissionHtml}`}

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

    `;
  });

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
  const priority = { growth: 3, maintain: 2, pass: 1 };
  const grassMap = {};
  getAllActiveCatKeys().forEach(cat => {
    const data = getCatData(cat);
    if (!data) return;
    (data.history || []).forEach(h => {
      const cur = grassMap[h.date];
      if (!cur || (priority[h.type] || 0) > (priority[cur] || 0)) {
        grassMap[h.date] = h.type;
      }
    });
  });
  return grassMap;
}

let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth();

function calGoPrev() {
  calViewMonth--;
  if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
  renderHomeGrass();
}
function calGoNext() {
  calViewMonth++;
  if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
  renderHomeGrass();
}

function buildGrassHtml(titleClass) {
  const grassMap = buildGrassMap();
  const todayStr = today();
  const year = calViewYear;
  const month = calViewMonth;
  const firstDow = new Date(year, month, 1).getDay(); // 0=일
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // 월요일 기준
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekLabels = ['월','화','수','목','금','토','일'];

  let cellsHtml = '';
  for (let i = 0; i < startOffset; i++) {
    cellsHtml += `<div class="cal-cell cal-cell-empty"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = ds === todayStr;
    const isFuture = ds > todayStr;
    const type = grassMap[ds];
    let bg, numColor, extraStyle = '';
    if (isFuture) {
      bg = 'rgba(255,255,255,0.02)'; numColor = 'rgba(255,255,255,0.15)';
    } else if (type === 'growth') {
      bg = '#F97316'; numColor = '#fff'; extraStyle = 'font-weight:700;';
    } else if (type === 'maintain') {
      bg = 'rgba(249,115,22,0.35)'; numColor = 'rgba(255,255,255,0.7)';
    } else if (type === 'pass') {
      bg = 'rgba(255,255,255,0.06)'; numColor = 'rgba(255,255,255,0.3)';
    } else {
      bg = isToday ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)';
      numColor = isToday ? '#F97316' : 'rgba(255,255,255,0.25)';
    }
    if (isToday) extraStyle += 'border:1.5px solid #F97316;';
    cellsHtml += `<div class="cal-cell" style="background:${bg};${extraStyle}">
      <span class="cal-day-num" style="color:${numColor}">${day}</span>
    </div>`;
  }

  return `
    <div class="cal-nav">
      <button class="cal-nav-btn" onclick="calGoPrev()">‹</button>
      <span class="${titleClass || 'sb-sect-label'} cal-nav-title">${year}년 ${month + 1}월</span>
      <button class="cal-nav-btn" onclick="calGoNext()">›</button>
    </div>
    <div class="cal-week-header">${weekLabels.map(d => `<div class="cal-week-label">${d}</div>`).join('')}</div>
    <div class="cal-grid">${cellsHtml}</div>
    <div class="grass-legend">
      <span class="grass-legend-item"><span class="grass-dot" style="background:#F97316"></span>성장</span>
      <span class="grass-legend-item"><span class="grass-dot" style="background:rgba(249,115,22,0.35)"></span>유지</span>
      <span class="grass-legend-item"><span class="grass-dot" style="background:rgba(255,255,255,0.06)"></span>패스</span>
    </div>
  `;
}

function buildWeekHtml(grassMap) {
  const todayStr = today();
  const todayDate = new Date();
  const todayDow = todayDate.getDay();
  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const weekLabels = ['월','화','수','목','금','토','일'];
  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() + mondayOffset + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const isFuture = ds > todayStr;
    const isToday = ds === todayStr;
    const type = isFuture ? null : grassMap[ds];
    let icon = '<span class="hw-dot">·</span>';
    if (!isFuture) {
      if (type === 'growth') icon = '<span class="hw-icon">✅</span>';
      else if (type === 'maintain') icon = '<span class="hw-icon">🔄</span>';
      else if (type === 'pass') icon = '<span class="hw-icon">⏭</span>';
    }
    const todayClass = isToday ? ' hw-today' : '';
    html += `<div class="hw-row${todayClass}">
      <span class="hw-label">${weekLabels[i]}</span>${icon}
    </div>`;
  }
  return html;
}

function renderHomeGrass() {
  const section = document.getElementById('home-grass-section');
  if (!section) return;
  const hasAnyActive = getAllActiveCatKeys().length > 0;
  if (!hasAnyActive) { section.style.display = 'none'; return; }
  section.style.display = '';
  const grassMap = buildGrassMap();
  section.innerHTML = `
    <div class="home-record-box">
      <div class="home-record-left">
        <div class="home-record-title">이번 주</div>
        ${buildWeekHtml(grassMap)}
      </div>
      <div class="home-record-divider"></div>
      <div class="home-record-right">
        ${buildGrassHtml('home-record-title')}
      </div>
    </div>
  `;
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
   실행 — 세션 확인은 DOMContentLoaded에서만 담당
════════════════════════ */

/* ════════════════════════
   1% 복리 계산기
════════════════════════ */
(function () {
  const slider   = document.getElementById('calc-slider');
  const numInput = document.getElementById('calc-days-num');
  if (!slider) return;

  const milestones = [
    { day: 7,   text: "일주일. 아직 티는 안 나요. 근데 쌓이고 있어요." },
    { day: 30,  text: "한 달. 주변이 슬슬 눈치채기 시작해요." },
    { day: 66,  text: "습관이 굳어지는 날. 이제 안 하면 어색해요." },
    { day: 100, text: "세 달. 3개월 전과 달라졌어요." },
    { day: 180, text: "반년. 작년의 내가 기억나요?" },
    { day: 365, text: "1년. 매일 1%가 만든 결과." }
  ];

  function getCompareText(days) {
    let result = "시작했어요. 이게 전부예요.";
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
