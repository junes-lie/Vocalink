(() => {
  'use strict';

  const STORAGE_KEY = 'vocalDuetMvpStateV1';
  const ASSET = {
    minseo: 'assets/images/featured-vocal-minseo.webp',
    yuna: 'assets/images/voice-yuna.webp',
    jun: 'assets/images/voice-jun.webp',
    seoyun: 'assets/images/voice-seoyun.webp',
    starlight: 'assets/images/song-starlight.webp',
    midnight: 'assets/images/song-midnight-letter.webp',
    side: 'assets/images/song-side-by-side.webp',
    chemistry: 'assets/images/vocal-chemistry.webp',
    inspiration: 'assets/images/duet-inspiration.webp',
    result: 'assets/images/duet-result-cover.webp'
  };

  const AUDIO = {
    minseo: 'assets/audio/voice-minseo.mp3',
    yuna: 'assets/audio/voice-yuna.mp3',
    jun: 'assets/audio/voice-jun.mp3',
    starlight: 'assets/audio/song-starlight-preview.mp3',
    midnight: 'assets/audio/song-midnight-preview.mp3',
    result: 'assets/audio/duet-starlight-result.mp3'
  };

  const partners = [
    { id:'minseo', name:'민서', range:'C3–F4', role:'Alto', genre:'발라드 · K-POP', match:91, img:ASSET.minseo, audio:AUDIO.minseo, reasons:['서로 다른 음역대라 파트를 나누기 편해요.','자주 부르는 장르가 비슷해요.','함께 부르기 좋은 곡이 8개 있어요.'] },
    { id:'yuna', name:'유나', range:'D3–A4', role:'Mezzo', genre:'K-POP · 팝', match:87, img:ASSET.yuna, audio:AUDIO.yuna, reasons:['후렴에서 음역이 자연스럽게 이어져요.','K-POP 취향이 비슷해요.','화음을 넣기 좋은 곡이 많아요.'] },
    { id:'jun', name:'준', range:'A2–E4', role:'Baritone', genre:'발라드 · 어쿠스틱', match:84, img:ASSET.jun, audio:AUDIO.jun, reasons:['낮은 파트와 중음 파트를 나누기 좋아요.','잔잔한 곡 취향이 비슷해요.','후렴에서 대비되는 톤이 잘 살아나요.'] },
    { id:'seoyun', name:'서윤', range:'C3–G4', role:'Mezzo', genre:'R&B · 팝', match:82, img:ASSET.seoyun, audio:AUDIO.yuna, reasons:['비슷한 음역에서 화음을 만들기 좋아요.','팝 취향이 겹쳐요.','듀엣 편곡에 어울리는 톤이에요.'] }
  ];

  const songs = [
    { id:'starlight', title:'별빛 사이', artist:'데모 트랙', img:ASSET.starlight, audio:AUDIO.starlight, reason:'두 사람 모두 후렴을 무리 없이 부를 수 있어요.' },
    { id:'midnight', title:'자정의 편지', artist:'데모 트랙', img:ASSET.midnight, audio:AUDIO.midnight, reason:'중음 중심이라 파트를 나누기 편해요.' },
    { id:'side', title:'나란히 걷는 밤', artist:'데모 트랙', img:ASSET.side, audio:AUDIO.starlight, reason:'서로 번갈아 부르는 구성이 잘 맞아요.' }
  ];

  const defaultState = {
    vocalProfile:{ complete:false, minNote:'C3', maxNote:'G4', genres:['발라드','K-POP'], sampleId:null },
    selectedPartnerId:'minseo',
    selectedSongId:'starlight',
    savedVoiceIds:[],
    savedSongIds:[],
    voiceFilters:[],
    recording:{ status:'idle', previewUrl:null },
    activeDuet:null,
    recentDuets:[],
    uiStatus:{home:'default',voices:'default',songs:'default'}
  };

  let state = loadState();
  let currentAudio = null;
  let currentAudioKey = null;
  let mediaRecorder = null;
  let mediaChunks = [];
  let currentModalRestoreFocus = null;
  let progressTimers = [];
  let lastRenderedRoute = null;

  const app = document.getElementById('app');
  const toastRoot = document.getElementById('toast-root');
  const modalRoot = document.getElementById('modal-root');
  const liveRegion = document.getElementById('live-region');

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      return mergeState(structuredClone(defaultState), JSON.parse(raw));
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      return structuredClone(defaultState);
    }
  }

  function mergeState(base, saved) {
    return {
      ...base, ...saved,
      vocalProfile:{...base.vocalProfile,...(saved.vocalProfile||{})},
      recording:{...base.recording,...(saved.recording||{})},
      uiStatus:{...base.uiStatus,...(saved.uiStatus||{})}
    };
  }

  function saveState() {
    const safe = {...state, recording:{...state.recording, previewUrl:null}};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }

  function announce(message) {
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  function routeTo(path) {
    if (location.hash === path) { render(); return; }
    location.hash = path;
  }

  function route() {
    return location.hash || '#/home';
  }

  function selectedPartner() {
    return partners.find(p => p.id === state.selectedPartnerId) || partners[0];
  }

  function selectedSong() {
    return songs.find(s => s.id === state.selectedSongId) || songs[0];
  }

  function imageFallback(img) {
    img.addEventListener('error', () => {
      const wrap = img.parentElement;
      const rect = img.getBoundingClientRect();
      const fallback = document.createElement('div');
      fallback.className = 'offline-image';
      fallback.style.width = rect.width ? `${Math.round(rect.width)}px` : '100%';
      fallback.style.height = rect.height ? `${Math.round(rect.height)}px` : '120px';
      fallback.setAttribute('role','img');
      fallback.setAttribute('aria-label', img.alt || '이미지를 불러오지 못함');
      fallback.innerHTML = '<div><i class="fa-solid fa-image" aria-hidden="true"></i><div>이미지를 불러오지 못했어요.</div></div>';
      img.replaceWith(fallback);
    }, {once:true});
  }

  function wireImageFallbacks() {
    document.querySelectorAll('img').forEach(imageFallback);
  }

  function appHeader({home=false, title='', showSearch=false, showPicks=false}={}) {
    if (home) {
      return `<header class="app-header">
        <a href="#/home" class="brand-wordmark" aria-label="홈으로 이동"><span>VOCAL</span> MATCH</a>
        <div class="header-actions">
          ${showSearch ? iconButton('search','fa-magnifying-glass','검색 열기') : ''}
          ${showPicks ? iconButton('picks','fa-bookmark','저장한 항목 보기') : ''}
        </div>
      </header>`;
    }
    return `<header class="app-header">
      <h1 class="section-title" style="font-size:24px">${title}</h1>
      <div class="header-actions">
        ${showSearch ? iconButton('search','fa-magnifying-glass','검색 열기') : ''}
        ${showPicks ? iconButton('picks','fa-bookmark','저장한 항목 보기') : ''}
      </div>
    </header>`;
  }

  function detailHeader(title,{saveType=null, saveId=null}={}) {
    const saved = saveType === 'voice' ? state.savedVoiceIds.includes(saveId) : saveType === 'song' ? state.savedSongIds.includes(saveId) : false;
    return `<header class="detail-header">
      <button class="icon-button" data-action="back" aria-label="이전 화면으로 돌아가기"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
      <h1 class="detail-header-title">${title}</h1>
      ${saveType ? `<button class="icon-button ${saved?'is-active':''}" data-action="toggle-save" data-save-type="${saveType}" data-save-id="${saveId}" aria-label="${saved?'저장 해제':'저장하기'}"><i class="fa-${saved?'solid':'regular'} fa-bookmark" aria-hidden="true"></i></button>` : '<div class="detail-header-spacer" aria-hidden="true"></div>'}
    </header>`;
  }

  function iconButton(action, icon, label) {
    return `<button class="icon-button" data-action="${action}" aria-label="${label}"><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`;
  }

  function bottomNav(active) {
    const items = [
      ['home','#/home','fa-house','홈'],
      ['voices','#/voices','fa-microphone-lines','보컬'],
      ['songs','#/songs','fa-music','듀엣'],
      ['profile','#/profile','fa-user','마이']
    ];
    return `<nav class="bottom-nav" aria-label="주요 메뉴">
      ${items.map(([key,href,icon,label])=>`<a href="${href}" class="${active===key?'active':''}" ${active===key?'aria-current="page"':''}><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join('')}
    </nav>`;
  }

  function stickyAction(label, action, extra='') {
    return `<div class="sticky-action"><button class="btn btn-primary" data-action="${action}" ${extra}>${label}</button></div>`;
  }

  function sectionHeader(title, more='') {
    return `<div class="section-header"><h2 class="section-title">${title}</h2>${more ? `<button class="btn btn-text" data-action="${more}">전체보기 <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>`:''}</div>`;
  }

  function voiceCard(p) {
    return `<article class="voice-card">
      <a href="#/partner/${p.id}" class="voice-card-media" data-select-partner="${p.id}" aria-label="${p.name} 보컬 상세 보기"><img src="${p.img}" alt="마이크 앞에서 노래하는 ${p.name}의 보컬 프로필 이미지"></a>
      <div class="voice-card-content">
        <span class="badge brand">Match ${p.match}%</span>
        <h3 class="card-title"><a href="#/partner/${p.id}" data-select-partner="${p.id}">${p.name}</a></h3>
        <div class="meta">${p.role} · ${p.range}</div>
        <div class="card-actions"><button class="btn btn-compact" data-audio="${p.audio}" data-audio-key="voice-${p.id}" aria-label="${p.name} 목소리 재생"><i class="fa-solid fa-play" aria-hidden="true"></i> 듣기</button></div>
      </div>
    </article>`;
  }

  function songCard(s) {
    const saved = state.savedSongIds.includes(s.id);
    return `<article class="song-card">
      <a href="#/song/${s.id}" class="song-card-media" data-select-song="${s.id}" aria-label="${s.title} 곡 상세 보기"><img src="${s.img}" alt="${s.title} 샘플 듀엣곡 커버 이미지"></a>
      <h3 class="card-title"><a href="#/song/${s.id}" data-select-song="${s.id}">${s.title}</a></h3>
      <div class="meta">${s.artist}</div>
      <div class="card-actions">
        <button class="icon-button ${saved?'is-active':''}" data-action="toggle-save" data-save-type="song" data-save-id="${s.id}" aria-label="${saved?'곡 저장 해제':'곡 저장'}"><i class="fa-${saved?'solid':'regular'} fa-bookmark" aria-hidden="true"></i></button>
      </div>
    </article>`;
  }

  function waveBars(count=48) {
    let out='';
    for(let i=0;i<count;i++) {
      const h = 12 + ((i*17)%31);
      out += `<span class="wave-bar" style="height:${h}px"></span>`;
    }
    return out;
  }

  function wavePlayer({src,key,label='재생',title='보컬 샘플'}={}) {
    return `<div class="wave-player" data-wave-key="${key}">
      <button class="play-button" data-audio="${src}" data-audio-key="${key}" aria-label="${label}"><i class="fa-solid fa-play" aria-hidden="true"></i></button>
      <div><div class="label" style="margin-bottom:6px">${title}</div><div class="wave-track" aria-hidden="true">${waveBars()}</div></div>
    </div>`;
  }

  function emptyState(title, desc, actionLabel='', action='') {
    return `<div class="empty-state"><i class="fa-regular fa-folder-open" aria-hidden="true"></i><h3>${title}</h3><p>${desc}</p>${actionLabel?`<button class="btn btn-secondary" data-action="${action}">${actionLabel}</button>`:''}</div>`;
  }

  function errorState(title, desc, action='rerender') {
    return `<div class="error-state"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><h3>${title}</h3><p>${desc}</p><button class="btn btn-secondary" data-action="${action}">다시 불러오기</button></div>`;
  }

  function renderHome() {
    const homeStatus = state.uiStatus?.home || 'default';
    if (homeStatus === 'loading') return `${appHeader({home:true,showSearch:true,showPicks:true})}<main class="main with-bottom-nav"><div class="content-container page-start"><h1 class="sr-only">홈</h1><div class="skeleton" style="height:426px" aria-label="추천 보컬을 불러오는 중"></div><section class="section"><div class="skeleton" style="height:160px"></div></section></div></main>${bottomNav('home')}`;
    if (homeStatus === 'error') return `${appHeader({home:true,showSearch:true,showPicks:true})}<main class="main with-bottom-nav"><div class="content-container page-start"><h1 class="sr-only">홈</h1>${errorState('추천 콘텐츠를 불러오지 못했어요.','잠시 후 다시 불러와 주세요.','retry-home')}</div></main>${bottomNav('home')}`;
    const personalized = state.vocalProfile.complete;
    const p = partners[0];
    const filterVoices = partners.slice(0,4);
    return `${appHeader({home:true,showSearch:true,showPicks:true})}
      <main class="main with-bottom-nav"><div class="content-container page-start">
        <section aria-labelledby="home-hero-title">
          <div class="hero-card">
            <img src="${p.img}" alt="마이크 앞에서 노래하는 민서의 보컬 프로필 이미지">
            <div class="media-scrim"></div>
            <div class="hero-content">
              <span class="badge ${personalized?'brand':''}">${personalized?'Vocal Match 91%':'샘플 추천'}</span>
              <h1 id="home-hero-title">${personalized?'오늘, 이 목소리와 잘 어울려요':'이런 목소리와 듀엣할 수 있어요'}</h1>
              <p>${personalized?'음역대와 자주 부르는 음악을 기준으로 골랐어요.':'보컬 프로필을 만들기 전에는 샘플 추천을 보여드려요.'}</p>
              <div class="hero-controls">
                <button class="play-button" data-audio="${p.audio}" data-audio-key="hero-minseo" aria-label="민서 목소리 들어보기"><i class="fa-solid fa-play" aria-hidden="true"></i></button>
                <a href="#/partner/minseo" class="hero-profile-link" data-select-partner="minseo">민서 프로필 보기 <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>
              </div>
            </div>
          </div>
        </section>

        <section class="section">${sectionHeader('같이 불러보기 좋은 보컬','goto-voices')}<div class="slider" role="region" aria-label="추천 보컬 슬라이더">${filterVoices.map(voiceCard).join('')}</div></section>

        <section class="section">${sectionHeader(personalized?'지금 음역대에 잘 맞는 듀엣곡':'샘플 듀엣곡','goto-songs')}<div class="slider" role="region" aria-label="추천 듀엣곡 슬라이더">${songs.map(songCard).join('')}</div></section>

        <section class="section">${sectionHeader('이런 목소리 조합은 어때요?')}<article class="editorial-card"><img src="${ASSET.chemistry}" alt="서로 다른 공간에서 마이크 앞에 선 두 보컬"><div class="media-scrim"></div><div class="editorial-card-content"><span class="badge">낮고 안정적인 톤 × 맑은 고음</span><h3>두 목소리가 겹치지 않을 때 파트가 더 선명해져요.</h3><button class="btn btn-compact" data-action="goto-voices">이 조합의 보컬 보기</button></div></article></section>

        <section class="section">${sectionHeader('사진보다 목소리부터 들어보세요')}<div class="list-stack">
          ${partners.slice(0,3).map(p=>`<article class="voice-row"><img src="${p.img}" alt="${p.name} 보컬 프로필"><div class="voice-row-main"><h3>${p.name}</h3><p>${p.role} · ${p.range} · ${p.genre}</p></div><button class="row-play" data-audio="${p.audio}" data-audio-key="row-${p.id}" aria-label="${p.name} 목소리 재생"><i class="fa-solid fa-play" aria-hidden="true"></i></button></article>`).join('')}
        </div></section>

        <section class="section">${sectionHeader('두 목소리가 이렇게 완성돼요')}<div class="slider" aria-label="완성 듀엣 예시 슬라이더"><article class="voice-card" style="width:207px"><a href="#/duet-result" class="voice-card-media" style="width:207px;aspect-ratio:207/263" data-select-song="starlight"><img src="${ASSET.inspiration}" alt="두 개의 마이크와 헤드폰이 놓인 레코딩 장면"></a><div class="voice-card-content"><h3 class="card-title"><a href="#/duet-result" data-select-song="starlight">별빛 사이 · 샘플 듀엣</a></h3><div class="meta">따로 녹음한 두 파트가 하나로 합쳐져요.</div></div></article><article class="voice-card" style="width:207px"><a href="#/duet-result" class="voice-card-media" style="width:207px;aspect-ratio:207/263" data-select-song="side"><img src="${ASSET.result}" alt="보라색과 분홍색 파형이 합쳐지는 듀엣 결과 커버"></a><div class="voice-card-content"><h3 class="card-title"><a href="#/duet-result" data-select-song="side">나란히 걷는 밤 · 샘플 듀엣</a></h3><div class="meta">서로 다른 파트가 마지막 후렴에서 만나요.</div></div></article></div></section>

        <section class="section"><div class="surface-card" style="padding:24px"><h2 class="section-title" style="margin-bottom:7px">내 음역대를 알면 추천이 더 정확해져요</h2><p>약 3분 동안 편하게 낼 수 있는 음을 확인해요.</p><button class="btn btn-primary" style="margin-top:18px" data-action="goto-vocal-check">내 음역대 확인하기</button></div></section>
      </div></main>${bottomNav('home')}`;
  }

  function renderVocalCheck() {
    const step = state.vocalCheckStep || 'intro';
    let body='';
    if (step==='intro') {
      body = `<div class="surface-card"><h2>편하게 낼 수 있는 음을 확인할게요</h2><p>노래 실력을 평가하는 검사가 아니에요. 파트너 추천에 사용할 음역 범위를 확인해요.</p></div>
      <section class="section"><div class="range-panel"><div class="range-head"><div><div class="label">확인할 범위</div><div class="range-value">C3–G4</div></div><i class="fa-solid fa-microphone" aria-hidden="true" style="font-size:28px;color:var(--color-accent)"></i></div><div class="range-track"><div class="range-fill" style="left:15%;right:22%"></div></div><div class="range-legend"><span>낮은 음</span><span>높은 음</span></div></div></section>
      <button class="btn btn-primary" style="margin-top:24px" data-action="start-vocal-check">음역대 확인 시작하기</button>`;
    } else if (step==='recording') {
      body = `<div class="surface-card"><span class="badge accent">측정 중</span><h2 style="margin-top:10px">표시되는 음을 편하게 따라 불러주세요</h2><p>높은 음을 무리해서 낼 필요는 없어요.</p></div>
      <section class="section"><div class="range-panel"><div class="range-head"><div><div class="label">현재 확인 중</div><div class="range-value" id="live-note">E4</div></div><div class="badge">마이크 사용 중</div></div><div class="record-wave recording-active" aria-hidden="true">${Array.from({length:46},(_,i)=>`<span style="height:${16+(i*13)%66}px;animation-delay:${(i%7)*.07}s"></span>`).join('')}</div><div class="range-track"><div class="range-fill" style="left:15%;right:38%"></div></div></div></section>
      <button class="btn btn-accent" style="width:100%;margin-top:24px" data-action="finish-vocal-check"><i class="fa-solid fa-stop" aria-hidden="true"></i> 측정 끝내기</button>`;
    } else if (step==='error') {
      body = `<div class="error-state"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><h3>마이크를 사용할 수 없어요.</h3><p>브라우저 설정에서 마이크 사용을 허용한 뒤 다시 시도해 주세요.</p><button class="btn btn-secondary" data-action="retry-vocal-check">다시 시도하기</button><button class="btn btn-text" data-action="demo-vocal-check">데모 분석으로 계속하기</button></div>`;
    } else if (step==='loading') {
      body = `<div class="surface-card" aria-busy="true"><div class="skeleton" style="height:180px"></div><p style="margin-top:16px">음역대를 정리하고 있어요.</p></div>`;
    } else {
      body = `<div class="range-panel"><div class="range-head"><div><div class="label">확인된 음역</div><div class="range-value">C3–G4</div></div><span class="badge brand">완료</span></div><div class="range-track"><div class="range-fill" style="left:12%;right:24%"></div></div><div class="range-legend"><span>C3</span><span>G4</span></div></div><div class="surface-card" style="margin-top:16px"><h2>보컬 프로필이 준비됐어요</h2><p>C3부터 G4까지 편하게 확인됐어요.</p></div><button class="btn btn-primary" style="margin-top:24px" data-action="finish-profile">내 보컬 프로필 보기</button>`;
    }
    return `${detailHeader('내 음역대 확인')}<main class="main"><div class="content-container page-start">${body}</div></main>`;
  }

  function renderProfile() {
    const recent = state.recentDuets.length>0;
    return `${appHeader({title:'내 보컬',showPicks:true})}<main class="main with-bottom-nav"><div class="content-container page-start">
      <section><div class="range-panel"><div class="range-head"><div><h2 class="section-title">내가 편하게 부르는 범위</h2><div class="range-value" style="margin-top:8px">${state.vocalProfile.complete?'C3–G4':'미측정'}</div></div><span class="badge ${state.vocalProfile.complete?'brand':''}">${state.vocalProfile.complete?'Vocal Profile':'프로필 필요'}</span></div><div class="range-track"><div class="range-fill" style="left:${state.vocalProfile.complete?'12':'0'}%;right:${state.vocalProfile.complete?'24':'100'}%"></div></div><div class="range-legend"><span>낮은 음</span><span>높은 음</span></div><p class="body-text" style="margin-bottom:0">${state.vocalProfile.complete?'이 범위를 기준으로 같이 부르기 좋은 보컬을 찾아요.':'음역대를 확인하면 보컬 추천에 사용할 수 있어요.'}</p></div></section>
      <section class="section">${sectionHeader('내 보컬 샘플')}${state.vocalProfile.complete?wavePlayer({src:AUDIO.minseo,key:'my-voice',label:'내 보컬 샘플 재생',title:'데모 보컬 샘플'}):emptyState('아직 보컬 샘플이 없어요.','음역대를 확인하면 샘플 프로필을 만들 수 있어요.','내 음역대 확인하기','goto-vocal-check')}</section>
      <section class="section">${sectionHeader('자주 부르는 음악')}<div class="chip-row">${['발라드','K-POP','팝','R&B'].map(x=>`<button class="chip ${state.vocalProfile.genres.includes(x)?'active':''}" data-action="toggle-genre" data-genre="${x}">${x}</button>`).join('')}</div></section>
      <section class="section">${sectionHeader('이 목소리와 잘 어울리는 보컬','goto-voices')}<div class="slider">${partners.slice(0,3).map(voiceCard).join('')}</div><button class="btn btn-primary" style="margin-top:18px" data-action="goto-voices">잘 맞는 보컬 보기</button></section>
      <section class="section">${sectionHeader('최근 완성한 듀엣')}${recent?`<a href="#/duet-result" class="editorial-card" style="display:block;height:250px"><img src="${ASSET.result}" alt="완성된 샘플 듀엣 커버"><div class="media-scrim"></div><div class="editorial-card-content"><span class="badge brand">완료</span><h3>별빛 사이 · 나 × 민서</h3><div class="meta" style="color:#fff">완성곡 다시 듣기</div></div></a>`:emptyState('아직 완성한 듀엣이 없어요.','같이 부를 보컬을 고르면 첫 듀엣을 만들 수 있어요.','부를 사람 찾아보기','goto-voices')}</section>
    </div></main>${bottomNav('profile')}`;
  }

  function renderVoices() {
    const voiceStatus = state.uiStatus?.voices || 'default';
    if (voiceStatus === 'loading') return `${appHeader({title:'보컬 찾기',showSearch:true})}<main class="main with-bottom-nav"><div class="content-container page-start"><div class="skeleton" style="height:360px" aria-label="보컬 목록을 불러오는 중"></div><section class="section"><div class="skeleton" style="height:160px"></div></section></div></main>${bottomNav('voices')}`;
    if (voiceStatus === 'error') return `${appHeader({title:'보컬 찾기',showSearch:true})}<main class="main with-bottom-nav"><div class="content-container page-start">${errorState('보컬 목록을 불러오지 못했어요.','잠시 후 다시 확인해 주세요.','retry-voices')}</div></main>${bottomNav('voices')}`;
    let filtered = partners;
    const f = state.voiceFilters || [];
    if (f.includes('발라드')) filtered = filtered.filter(p=>p.genre.includes('발라드'));
    if (f.includes('K-POP')) filtered = filtered.filter(p=>p.genre.includes('K-POP'));
    if (f.includes('낮은 음역')) filtered = filtered.filter(p=>p.role==='Baritone');
    const empty = filtered.length===0;
    return `${appHeader({title:'보컬 찾기',showSearch:true})}<main class="main with-bottom-nav"><div class="content-container page-start">
      <section>${sectionHeader('지금 가장 잘 맞는 목소리')}<article class="partner-hero"><img src="${ASSET.minseo}" alt="마이크 앞에서 노래하는 민서"><div class="partner-hero-copy"><span class="badge brand">Vocal Match 91%</span><h2 class="page-title">민서</h2><div class="body-text">Alto · C3–F4 · 발라드</div><div class="card-actions"><button class="btn btn-secondary" data-audio="${AUDIO.minseo}" data-audio-key="featured-minseo"><i class="fa-solid fa-play" aria-hidden="true"></i> 목소리 듣기</button><a class="btn btn-primary" href="#/partner/minseo" data-select-partner="minseo">보컬 정보 보기</a></div></div></article></section>
      <section class="section">${sectionHeader('음역대 조합이 좋은 보컬')}<div class="slider">${partners.map(voiceCard).join('')}</div></section>
      <section class="section">${sectionHeader('어떤 조합을 찾고 있나요?')}<div class="chip-row">${['발라드','K-POP','낮은 음역','화음','밝은 톤'].map(x=>`<button class="chip ${f.includes(x)?'active':''}" data-action="voice-filter" data-filter="${x}">${x}</button>`).join('')}</div></section>
      <section class="section">${sectionHeader('잔잔한 발라드에 잘 맞는 목소리')}${empty?emptyState('선택한 조건에 맞는 보컬이 없어요.','조건을 줄이면 더 많은 보컬을 볼 수 있어요.','조건 초기화','clear-voice-filter'):`<div class="list-stack">${filtered.map(p=>`<a href="#/partner/${p.id}" class="voice-row" data-select-partner="${p.id}"><img src="${p.img}" alt="${p.name} 보컬 프로필"><div class="voice-row-main"><h3>${p.name}</h3><p>${p.role} · ${p.range} · Match ${p.match}%</p></div><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>`).join('')}</div>`}</section>
    </div></main>${bottomNav('voices')}`;
  }

  function renderPartner(id) {
    const p = partners.find(x=>x.id===id) || selectedPartner();
    state.selectedPartnerId = p.id; saveState();
    return `${detailHeader(p.name,{saveType:'voice',saveId:p.id})}<main class="main with-sticky"><div class="content-container page-start">
      <section><article class="partner-hero"><img src="${p.img}" alt="마이크 앞에서 노래하는 ${p.name}"><div class="partner-hero-copy"><span class="badge brand">Vocal Match ${p.match}%</span><h2 class="page-title">${p.name}</h2><div class="body-text">${p.role} · ${p.range} · ${p.genre}</div></div></article></section>
      <section class="section">${sectionHeader('먼저 목소리를 들어보세요')}${wavePlayer({src:p.audio,key:`partner-${p.id}`,label:`${p.name} 보컬 샘플 재생`,title:'12초 보컬 샘플'})}</section>
      <section class="section">${sectionHeader('둘이 잘 맞는 이유')}<ul class="reason-list">${p.reasons.map(r=>`<li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${r}</span></li>`).join('')}</ul></section>
      <section class="section">${sectionHeader('두 음역대를 겹쳐봤어요')}<div class="range-panel"><div class="dual-range"><div class="dual-range-row"><div class="label">내 음역</div><div class="range-track"><div class="range-fill" style="left:18%;right:26%"></div></div></div><div class="dual-range-row"><div class="label">${p.name}</div><div class="range-track"><div class="range-fill accent" style="left:28%;right:38%"></div></div></div></div><div class="range-legend"><span>C3</span><span>G4</span></div></div></section>
      <section class="section">${sectionHeader('같이 좋아하는 음악')}<div class="slider">${songs.slice(0,2).map(songCard).join('')}</div></section>
      <section class="section">${sectionHeader('둘이 부르기 좋은 곡','goto-songs')}<div class="slider">${songs.map(songCard).join('')}</div></section>
      <section class="section">${sectionHeader('비슷하게 잘 맞는 보컬')}<div class="slider">${partners.filter(x=>x.id!==p.id).slice(0,3).map(voiceCard).join('')}</div></section>
    </div></main>${stickyAction('함께 부를 곡 보기','goto-songs')}`;
  }

  function renderSongs() {
    const songStatus = state.uiStatus?.songs || 'default';
    if (songStatus === 'loading') return `${appHeader({title:'듀엣곡',showSearch:true})}<main class="main with-bottom-nav"><div class="content-container page-start"><div class="skeleton" style="height:360px" aria-label="듀엣곡을 불러오는 중"></div><section class="section"><div class="skeleton" style="height:180px"></div></section></div></main>${bottomNav('songs')}`;
    if (songStatus === 'error') return `${appHeader({title:'듀엣곡',showSearch:true})}<main class="main with-bottom-nav"><div class="content-container page-start">${errorState('듀엣곡을 불러오지 못했어요.','잠시 후 다시 확인해 주세요.','retry-songs')}</div></main>${bottomNav('songs')}`;
    if (songStatus === 'empty') return `${appHeader({title:'듀엣곡',showSearch:true})}<main class="main with-bottom-nav"><div class="content-container page-start">${emptyState('지금 조건에 맞는 곡이 없어요.','추천 기준을 초기화하면 전체 듀엣곡을 볼 수 있어요.','전체 듀엣곡 보기','show-all-songs')}</div></main>${bottomNav('songs')}`;
    const p = selectedPartner();
    const active = state.activeDuet && state.activeDuet.mixStatus!=='complete';
    return `${appHeader({title:'듀엣곡',showSearch:true})}<main class="main with-bottom-nav"><div class="content-container page-start">
      ${active?`<section><div class="status-card" style="grid-template-columns:62px minmax(0,1fr) auto"><img src="${p.img}" alt="${p.name} 프로필" style="width:62px;height:62px;border-radius:12px;object-fit:cover"><div class="voice-row-main"><span class="badge accent">${statusLabel(state.activeDuet)}</span><h3 style="margin:7px 0 3px">${p.name}와 부르는 듀엣이 진행 중이에요</h3><p>${selectedSong().title}</p></div><button class="icon-button" data-action="goto-progress" aria-label="진행 상태 보기"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button></div></section>`:''}
      <section class="${active?'section':''}"><div class="surface-card"><div class="label">현재 추천 기준</div><h2 class="card-title" style="margin-top:5px">${state.selectedPartnerId?`${p.name}와 부르기 좋은 곡부터 골랐어요`:'내 음역대에 맞는 듀엣곡'}</h2></div></section>
      <section class="section">${sectionHeader('이번 조합에 가장 잘 맞는 곡')}<article class="hero-card" style="aspect-ratio:394/360"><img src="${ASSET.starlight}" alt="별빛 사이 샘플 곡 커버"><div class="media-scrim"></div><div class="hero-content"><span class="badge brand">두 사람 음역대에 잘 맞음</span><h2>별빛 사이</h2><p>후렴을 번갈아 부르고 마지막에 화음을 넣기 좋은 곡이에요.</p><div class="hero-controls"><button class="play-button" data-audio="${AUDIO.starlight}" data-audio-key="song-feature" aria-label="별빛 사이 미리듣기"><i class="fa-solid fa-play" aria-hidden="true"></i></button><a href="#/song/starlight" data-select-song="starlight" class="hero-profile-link">곡 자세히 보기 <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a></div></div></article></section>
      <section class="section">${sectionHeader('음역대가 편한 듀엣곡')}<div class="slider">${songs.map(songCard).join('')}</div></section>
      <section class="section">${sectionHeader('후렴을 나눠 부르기 좋은 곡')}<article class="editorial-card"><img src="${ASSET.side}" alt="두 마이크가 마주 보는 샘플 곡 커버"><div class="media-scrim"></div><div class="editorial-card-content"><span class="badge">파트 분배 쉬움</span><h3>나란히 걷는 밤</h3><button class="btn btn-compact" data-action="select-song-side">곡 보기</button></div></article></section>
      <section class="section">${sectionHeader('전에 저장한 곡')}${state.savedSongIds.length?`<div class="list-stack">${state.savedSongIds.map(id=>{const s=songs.find(x=>x.id===id); return `<a href="#/song/${s.id}" class="saved-row" data-select-song="${s.id}"><img src="${s.img}" alt="${s.title} 커버"><div class="voice-row-main"><h3>${s.title}</h3><p>${s.artist}</p></div><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></a>`}).join('')}</div>`:emptyState('아직 저장한 곡이 없어요.','마음에 드는 곡을 저장하면 여기서 다시 볼 수 있어요.')}</section>
    </div></main>${bottomNav('songs')}`;
  }

  function renderSong(id) {
    const s = songs.find(x=>x.id===id) || selectedSong();
    state.selectedSongId=s.id; saveState();
    return `${detailHeader('곡 상세',{saveType:'song',saveId:s.id})}<main class="main with-sticky"><div class="content-container page-start">
      <section><img class="song-detail-art" src="${s.img}" alt="${s.title} 샘플 곡 커버"><div class="song-detail-copy"><span class="badge brand">두 사람 음역대에 잘 맞음</span><h2 class="page-title">${s.title}</h2><div class="body-text">${s.artist}</div><button class="btn btn-secondary" style="margin-top:16px" data-audio="${s.audio}" data-audio-key="song-${s.id}"><i class="fa-solid fa-play" aria-hidden="true"></i> 곡 미리듣기</button></div></section>
      <section class="section">${sectionHeader('이 곡이 둘에게 잘 맞는 이유')}<ul class="reason-list"><li><i class="fa-solid fa-check" aria-hidden="true"></i><span>두 사람 모두 후렴을 무리 없이 부를 수 있어요.</span></li><li><i class="fa-solid fa-check" aria-hidden="true"></i><span>파트가 겹치지 않아 나눠 부르기 편해요.</span></li><li><i class="fa-solid fa-check" aria-hidden="true"></i><span>마지막 후렴에서 화음을 넣기 좋아요.</span></li></ul></section>
      <section class="section">${sectionHeader('파트는 이렇게 나눠볼 수 있어요')}<ol class="timeline"><li class="timeline-item done"><div class="timeline-time">0:00</div><div class="timeline-rail"><span class="timeline-dot"></span><span class="timeline-line"></span></div><div class="timeline-content"><h3>내 파트</h3><p>Verse 1 · 낮은 음 중심</p></div></li><li class="timeline-item active"><div class="timeline-time">0:42</div><div class="timeline-rail"><span class="timeline-dot"></span><span class="timeline-line"></span></div><div class="timeline-content"><h3>${selectedPartner().name} 파트</h3><p>Verse 2 · 중음 중심</p></div></li><li class="timeline-item"><div class="timeline-time">1:28</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-content"><h3>같이 부르는 후렴</h3><p>마지막 두 마디에 화음을 넣어요.</p></div></li></ol></section>
      <section class="section">${sectionHeader('높은 음이 있는 구간')}<div class="range-panel"><div class="range-head"><div><div class="label">최고음</div><div class="range-value">G4</div></div><span class="badge">마지막 후렴</span></div><div class="range-track"><div class="range-fill" style="left:18%;right:20%"></div></div><p class="body-text" style="margin-bottom:0">마지막 후렴에서 G4까지 올라가요.</p></div></section>
      <section class="section">${sectionHeader('이 곡과 잘 맞는 다른 보컬')}<div class="slider">${partners.slice(1,4).map(voiceCard).join('')}</div></section>
    </div></main>${stickyAction('이 곡으로 파트 맞추기','goto-setup')}`;
  }

  function renderPicks() {
    const tab = state.picksTab || 'voice';
    const list = tab==='voice' ? state.savedVoiceIds : state.savedSongIds;
    return `${detailHeader('저장한 항목')}<main class="main"><div class="content-container page-start">
      <div class="chip-row" role="tablist" aria-label="저장 유형"><button class="chip ${tab==='voice'?'active':''}" role="tab" aria-selected="${tab==='voice'}" data-action="picks-tab" data-tab="voice">보컬</button><button class="chip ${tab==='song'?'active':''}" role="tab" aria-selected="${tab==='song'}" data-action="picks-tab" data-tab="song">곡</button></div>
      <section class="section">${list.length ? (tab==='voice'?`<div class="list-stack">${list.map(id=>{const p=partners.find(x=>x.id===id);return `<div class="saved-row"><img src="${p.img}" alt="${p.name} 프로필"><a href="#/partner/${p.id}" class="voice-row-main" data-select-partner="${p.id}"><h3>${p.name}</h3><p>${p.role} · ${p.range}</p></a><button class="icon-button is-active" data-action="toggle-save" data-save-type="voice" data-save-id="${p.id}" aria-label="${p.name} 저장 해제"><i class="fa-solid fa-bookmark" aria-hidden="true"></i></button></div>`}).join('')}</div>`:`<div class="slider">${list.map(id=>songCard(songs.find(x=>x.id===id))).join('')}</div>`) : (tab==='voice'?emptyState('아직 저장한 보컬이 없어요.','같이 부르고 싶은 보컬을 저장하면 여기서 다시 볼 수 있어요.','잘 맞는 보컬 둘러보기','goto-voices'):emptyState('아직 저장한 곡이 없어요.','마음에 드는 듀엣곡을 저장하면 여기서 다시 볼 수 있어요.','듀엣곡 둘러보기','goto-songs'))}</section>
    </div></main>`;
  }

  function renderSetup() {
    const p=selectedPartner(), s=selectedSong();
    return `${detailHeader('듀엣 준비')}<main class="main with-sticky"><div class="content-container page-start">
      <section><article class="pair-card"><img src="${p.img}" alt="${p.name} 보컬 프로필"><img src="${s.img}" alt="${s.title} 곡 커버"><div class="pair-overlay"></div><div class="pair-copy"><span class="badge brand">${s.title}</span><h2 class="pair-title">${p.name}와 이 곡을 같이 불러요</h2></div></article></section>
      <section class="section">${sectionHeader('내 파트는 여기예요')}<ol class="timeline"><li class="timeline-item active"><div class="timeline-time">A</div><div class="timeline-rail"><span class="timeline-dot"></span><span class="timeline-line"></span></div><div class="timeline-content"><h3>내 파트</h3><p>Verse 1 · 첫 후렴 앞부분</p></div></li><li class="timeline-item"><div class="timeline-time">B</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-content"><h3>${p.name} 파트</h3><p>Verse 2 · 첫 후렴 뒷부분</p></div></li></ol></section>
      <section class="section">${sectionHeader('높은 음이 있는 구간')}<div class="surface-card"><span class="badge accent">G4</span><h3 style="margin-top:10px">마지막 후렴</h3><p>마지막 후렴에서 G4까지 올라가요.</p><button class="btn btn-secondary" style="margin-top:16px" data-audio="${s.audio}" data-audio-key="setup-preview"><i class="fa-solid fa-play" aria-hidden="true"></i> 구간 미리듣기</button></div></section>
      <section class="section">${sectionHeader('각자 편한 시간에 녹음하면 돼요')}<div class="surface-card"><p>상대방과 동시에 접속할 필요는 없어요.</p><ol style="margin:16px 0 0;padding-left:20px;color:var(--color-text-secondary)"><li>내 파트를 녹음해요.</li><li>${p.name}가 자신의 파트를 녹음해요.</li><li>두 녹음이 준비되면 하나로 합쳐요.</li></ol></div></section>
    </div></main>${stickyAction('내 파트 녹음하기','goto-recording')}`;
  }

  function renderRecording() {
    const status = state.recording.status || 'idle';
    const isRec = status==='recording';
    const isReview = status==='review';
    return `${detailHeader(selectedSong().title)}<main class="main"><div class="recording-screen ${isRec?'recording-active':''}">
      <div class="recording-meta"><span class="badge ${isRec?'accent':''}">${isRec?'녹음 중':isReview?'미리듣기':'내 파트'}</span><span class="meta">Verse 1</span></div>
      <div class="lyrics-stage"><p class="current-lyric">오늘 밤 이 순간<br>우리 목소리가 닿으면</p><p class="next-lyric">다음: 별빛 사이로 번지는 멜로디</p></div>
      <div class="record-wave" aria-hidden="true">${Array.from({length:58},(_,i)=>`<span style="height:${12+(i*19)%82}px;animation-delay:${(i%9)*.06}s"></span>`).join('')}</div>
      ${!isReview?`<button class="record-control" data-action="${isRec?'stop-recording':'start-recording'}" aria-label="${isRec?'녹음 종료':'녹음 시작'}"><i class="fa-solid ${isRec?'fa-stop':'fa-microphone'}" aria-hidden="true"></i></button><div class="label" style="text-align:center">${isRec?'지금 녹음하고 있어요':'마이크 버튼을 눌러 내 파트를 녹음해요'}</div>`:`<div class="review-actions"><h2 class="section-title" style="text-align:center">한 번 들어볼까요?</h2>${wavePlayer({src:state.recording.previewUrl||AUDIO.minseo,key:'record-preview',label:'방금 녹음한 내 파트 재생',title:'방금 녹음한 파트'})}<button class="btn btn-primary" data-action="use-recording">이 녹음 사용하기</button><button class="btn btn-secondary" data-action="redo-recording"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> 다시 녹음하기</button></div>`}
      ${status==='error'?`<div class="error-state" style="margin-top:18px"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><h3>마이크를 사용할 수 없어요.</h3><p>브라우저 마이크 권한을 확인하거나 데모 녹음으로 진행해 주세요.</p><button class="btn btn-secondary" data-action="demo-recording">데모 녹음으로 진행하기</button></div>`:''}
    </div></main>`;
  }

  function statusLabel(duet) {
    if (!duet) return '준비';
    if (duet.mixStatus==='complete') return '완성';
    if (duet.mixStatus==='mixing') return '믹싱 중';
    if (duet.partnerTrackStatus==='complete') return '믹싱 준비';
    return '상대 녹음 대기';
  }

  function renderProgress() {
    const d = state.activeDuet || {myTrackStatus:'complete',partnerTrackStatus:'waiting',mixStatus:'waiting'};
    const complete = d.mixStatus==='complete';
    return `${detailHeader('듀엣 진행 상태')}<main class="main"><div class="content-container page-start">
      <section><div class="status-card" style="grid-template-columns:78px minmax(0,1fr)"><img src="${selectedPartner().img}" alt="${selectedPartner().name} 프로필" style="width:78px;height:78px;border-radius:12px;object-fit:cover"><div class="voice-row-main"><span class="badge ${complete?'brand':'accent'}">${statusLabel(d)}</span><h2 class="card-title" style="margin-top:8px">우리 듀엣 진행 중</h2><p>${selectedSong().title} · 나 × ${selectedPartner().name}</p></div></div></section>
      <section class="section">${sectionHeader('현재 진행 상태')}<ol class="timeline">
        <li class="timeline-item done"><div class="timeline-time">1</div><div class="timeline-rail"><span class="timeline-dot"></span><span class="timeline-line"></span></div><div class="timeline-content"><h3>내 파트</h3><p>녹음 완료</p></div></li>
        <li class="timeline-item ${d.partnerTrackStatus==='complete'?'done':'active'}"><div class="timeline-time">2</div><div class="timeline-rail"><span class="timeline-dot"></span><span class="timeline-line"></span></div><div class="timeline-content"><h3>${selectedPartner().name} 파트</h3><p>${d.partnerTrackStatus==='complete'?'녹음 완료':'녹음 기다리는 중'}</p></div></li>
        <li class="timeline-item ${complete?'done':d.mixStatus==='mixing'?'active':''}"><div class="timeline-time">3</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-content"><h3>두 트랙 합치기</h3><p>${complete?'완료':d.mixStatus==='mixing'?'진행 중':'대기'}</p></div></li>
      </ol></section>
      ${complete?`<section class="section"><div class="surface-card"><span class="badge brand">완료</span><h2 style="margin-top:10px">두 녹음이 하나로 합쳐졌어요.</h2><button class="btn btn-primary" style="margin-top:18px" data-action="goto-result">완성된 듀엣 듣기</button></div></section>`:`<section class="section"><div class="surface-card"><h2>기다리는 동안 다른 보컬을 둘러볼 수 있어요.</h2><p>지금 듀엣의 진행 상태는 그대로 유지돼요.</p><button class="btn btn-secondary" style="margin-top:18px" data-action="goto-voices">다른 보컬 둘러보기</button></div></section>`}
    </div></main>`;
  }

  function renderResult() {
    return `${detailHeader('듀엣 결과')}<main class="main"><div class="content-container page-start">
      <section><article class="result-hero"><img src="${ASSET.result}" alt="두 개의 파형과 마이크가 하나로 모이는 듀엣 결과 커버"><div class="media-scrim"></div><div class="result-hero-copy"><span class="badge brand">완성</span><h2 class="result-title">둘의 목소리가 완성됐어요</h2><div class="body-text" style="color:#fff">${selectedSong().title} · 나 × ${selectedPartner().name}</div></div></article></section>
      <section class="section">${sectionHeader('완성곡')}${wavePlayer({src:AUDIO.result,key:'duet-result',label:'완성곡 재생',title:'완성된 듀엣'})}</section>
      <section class="section">${sectionHeader('두 파트를 따로 들어볼 수도 있어요')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn btn-secondary" data-audio="${AUDIO.jun}" data-audio-key="solo-me"><i class="fa-solid fa-play" aria-hidden="true"></i> 내 파트 듣기</button><button class="btn btn-secondary" data-audio="${selectedPartner().audio}" data-audio-key="solo-partner"><i class="fa-solid fa-play" aria-hidden="true"></i> ${selectedPartner().name} 파트 듣기</button></div></section>
      <section class="section">${sectionHeader('다음에는 이 곡이 잘 맞아요')}<div class="slider">${songs.filter(s=>s.id!==state.selectedSongId).map(songCard).join('')}</div></section>
      <section class="section">${sectionHeader('다른 목소리와도 불러볼까요?')}<div class="slider">${partners.filter(p=>p.id!==state.selectedPartnerId).slice(0,3).map(voiceCard).join('')}</div></section>
    </div></main>`;
  }

  function renderErrorPage(message) {
    return `${appHeader({home:true})}<main class="main"><div class="content-container page-start">${errorState('화면을 열지 못했어요.',message,'goto-home')}</div></main>`;
  }

  function render() {
    clearProgressTimers();
    stopAudio();
    const hash = route();
    let html='';
    const partnerMatch = hash.match(/^#\/partner\/(.+)$/);
    const songMatch = hash.match(/^#\/song\/(.+)$/);
    if (hash==='#/home') html=renderHome();
    else if (hash==='#/vocal-check') html=renderVocalCheck();
    else if (hash==='#/profile') html=renderProfile();
    else if (hash==='#/voices') html=renderVoices();
    else if (partnerMatch) html=renderPartner(partnerMatch[1]);
    else if (hash==='#/songs') html=renderSongs();
    else if (songMatch) html=renderSong(songMatch[1]);
    else if (hash==='#/picks') html=renderPicks();
    else if (hash==='#/duet-setup') html=renderSetup();
    else if (hash==='#/recording') html=renderRecording();
    else if (hash==='#/duet-progress') html=renderProgress();
    else if (hash==='#/duet-result') html=renderResult();
    else html=renderErrorPage('주소가 올바른지 확인해 주세요.');
    const routeChanged = hash !== lastRenderedRoute;
    app.innerHTML=html;
    wireImageFallbacks();
    wireCommonEvents();
    wireSliders();
    if (hash==='#/duet-progress') scheduleDemoProgress();
    requestAnimationFrame(()=>{
      window.scrollTo(0,0);
      if (routeChanged) {
        const heading=app.querySelector('h1');
        if (heading) { heading.setAttribute('tabindex','-1'); heading.focus({preventScroll:true}); heading.addEventListener('blur',()=>heading.removeAttribute('tabindex'),{once:true}); }
      }
      lastRenderedRoute=hash;
    });
  }

  function wireSliders() {
    app.querySelectorAll('.slider').forEach(slider=>{
      const items=[...slider.children];
      if(!items.length) return;
      const baseLabel=slider.getAttribute('aria-label') || '콘텐츠 슬라이더';
      slider.setAttribute('role','region');
      slider.setAttribute('aria-roledescription','carousel');
      slider.tabIndex=0;
      const update=()=>{
        const first=items[0].getBoundingClientRect().width || 180;
        const gap=parseFloat(getComputedStyle(slider).columnGap || getComputedStyle(slider).gap || 12) || 12;
        const index=Math.max(0,Math.min(items.length-1,Math.round(slider.scrollLeft/(first+gap))));
        slider.setAttribute('aria-label',`${baseLabel.replace(/, \d+\/\d+$/,'')}, ${index+1}/${items.length}`);
      };
      slider.addEventListener('scroll',update,{passive:true});
      slider.addEventListener('keydown',e=>{
        if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return;
        e.preventDefault();
        const first=items[0].getBoundingClientRect().width || 180;
        const gap=parseFloat(getComputedStyle(slider).columnGap || getComputedStyle(slider).gap || 12) || 12;
        slider.scrollBy({left:(e.key==='ArrowRight'?1:-1)*(first+gap),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      });

      // Touch devices use native horizontal scrolling. Add mouse dragging for desktop use.
      let dragStartX=0, dragStartScroll=0, dragged=false, suppressClick=false;
      slider.addEventListener('mousedown',e=>{
        if(e.button!==0) return;
        e.preventDefault();
        dragStartX=e.clientX; dragStartScroll=slider.scrollLeft; dragged=false;
        const onMove=moveEvent=>{
          const dx=moveEvent.clientX-dragStartX;
          if(Math.abs(dx)>4) {
            dragged=true; slider.classList.add('is-dragging');
            slider.scrollLeft=dragStartScroll-dx;
            moveEvent.preventDefault();
          }
        };
        const onUp=()=>{
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
          if(dragged) {
            suppressClick=true;
            const first=items[0].getBoundingClientRect().width || 180;
            const gap=parseFloat(getComputedStyle(slider).columnGap || getComputedStyle(slider).gap || 12) || 12;
            const step=first+gap;
            const target=Math.max(0,Math.min(items.length-1,Math.round(slider.scrollLeft/step)));
            slider.scrollTo({left:target*step,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
          }
          slider.classList.remove('is-dragging');
          requestAnimationFrame(update);
        };
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });
      slider.addEventListener('dragstart',e=>e.preventDefault());
      slider.addEventListener('click',e=>{
        if(!suppressClick) return;
        e.preventDefault(); e.stopPropagation(); suppressClick=false;
      },true);
      update();
    });
  }

  function wireCommonEvents() {
    app.querySelectorAll('[data-select-partner]').forEach(el=>el.addEventListener('click',()=>{state.selectedPartnerId=el.dataset.selectPartner;saveState();}));
    app.querySelectorAll('[data-select-song]').forEach(el=>el.addEventListener('click',()=>{state.selectedSongId=el.dataset.selectSong;saveState();}));
    app.querySelectorAll('[data-audio]').forEach(btn=>btn.addEventListener('click',(e)=>{e.preventDefault();toggleAudio(btn);}));
    app.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',handleAction));
  }

  async function toggleAudio(btn) {
    const src=btn.dataset.audio, key=btn.dataset.audioKey;
    if (currentAudio && currentAudioKey===key && !currentAudio.paused) { currentAudio.pause(); updateAudioButtons(null); return; }
    stopAudio();
    currentAudio = new Audio(src); currentAudioKey=key;
    currentAudio.addEventListener('ended',()=>{updateAudioButtons(null); currentAudio=null; currentAudioKey=null;});
    currentAudio.addEventListener('error',()=>{showToast('오디오를 재생하지 못했어요. 다시 시도해 주세요.'); updateAudioButtons(null);});
    try { await currentAudio.play(); updateAudioButtons(key); }
    catch(e) { showToast('오디오를 재생하지 못했어요. 다시 시도해 주세요.'); }
  }

  function updateAudioButtons(activeKey) {
    document.querySelectorAll('[data-audio-key]').forEach(btn=>{
      const active=btn.dataset.audioKey===activeKey;
      const i=btn.querySelector('i');
      if(i) { i.classList.toggle('fa-play',!active); i.classList.toggle('fa-pause',active); }
      const wave=btn.closest('.wave-player'); if(wave) wave.classList.toggle('playing',active);
    });
  }

  function stopAudio() {
    if(currentAudio){currentAudio.pause();currentAudio.currentTime=0;}
    currentAudio=null; currentAudioKey=null;
  }

  function handleAction(e) {
    const el=e.currentTarget, action=el.dataset.action;
    switch(action) {
      case 'back': history.length>1 ? history.back() : routeTo('#/home'); break;
      case 'search': openSearchModal(); break;
      case 'picks': routeTo('#/picks'); break;
      case 'goto-home': routeTo('#/home'); break;
      case 'goto-vocal-check': state.vocalCheckStep='intro'; saveState(); routeTo('#/vocal-check'); break;
      case 'goto-voices': routeTo('#/voices'); break;
      case 'goto-songs': routeTo('#/songs'); break;
      case 'goto-progress': routeTo('#/duet-progress'); break;
      case 'goto-result': ensureRecentDuet(); routeTo('#/duet-result'); break;
      case 'goto-setup': routeTo('#/duet-setup'); break;
      case 'goto-recording': createActiveDuet(); state.recording.status='idle'; saveState(); routeTo('#/recording'); break;
      case 'select-song-side': state.selectedSongId='side'; saveState(); routeTo('#/song/side'); break;
      case 'toggle-save': toggleSave(el); break;
      case 'voice-filter': toggleVoiceFilter(el.dataset.filter); break;
      case 'clear-voice-filter': state.voiceFilters=[]; saveState(); render(); break;
      case 'toggle-genre': toggleGenre(el.dataset.genre); break;
      case 'picks-tab': state.picksTab=el.dataset.tab; saveState(); render(); break;
      case 'start-vocal-check': startVocalCheck(); break;
      case 'finish-vocal-check': finishVocalCheck(); break;
      case 'retry-vocal-check': state.vocalCheckStep='intro'; saveState(); render(); break;
      case 'demo-vocal-check': completeVocalCheckDemo(); break;
      case 'finish-profile': state.vocalProfile.complete=true; state.vocalCheckStep='complete'; saveState(); showToast('보컬 프로필을 저장했어요.'); routeTo('#/profile'); break;
      case 'start-recording': startRecording(); break;
      case 'stop-recording': stopRecording(); break;
      case 'demo-recording': state.recording.status='review'; state.recording.previewUrl=AUDIO.minseo; saveState(); render(); break;
      case 'redo-recording': state.recording.status='idle'; state.recording.previewUrl=null; saveState(); render(); break;
      case 'use-recording': submitRecording(el); break;
      case 'retry-home': state.uiStatus.home='default'; saveState(); render(); break;
      case 'retry-voices': state.uiStatus.voices='default'; saveState(); render(); break;
      case 'retry-songs': state.uiStatus.songs='default'; saveState(); render(); break;
      case 'show-all-songs': state.uiStatus.songs='default'; saveState(); render(); break;
      case 'rerender': render(); break;
    }
  }

  function toggleSave(el) {
    const type=el.dataset.saveType, id=el.dataset.saveId;
    const arr = type==='voice' ? state.savedVoiceIds : state.savedSongIds;
    const idx=arr.indexOf(id);
    const removing=idx>=0;
    if(removing) arr.splice(idx,1); else arr.push(id);
    saveState();
    const label = type==='voice' ? (partners.find(p=>p.id===id)?.name || '보컬') : (songs.find(s=>s.id===id)?.title || '곡');
    showToast(removing?`저장에서 ${label}${type==='voice'?'를':'을'} 뺐어요.`:`${label}${type==='voice'?'를':'을'} 저장했어요.`, removing ? {label:'되돌리기',action:()=>{arr.push(id);saveState();render();}} : null);
    render();
  }

  function toggleVoiceFilter(filter) {
    const arr=state.voiceFilters || (state.voiceFilters=[]);
    const i=arr.indexOf(filter); if(i>=0) arr.splice(i,1); else arr.push(filter);
    saveState(); render();
  }

  function toggleGenre(genre) {
    const arr=state.vocalProfile.genres;
    const i=arr.indexOf(genre); if(i>=0) arr.splice(i,1); else arr.push(genre);
    saveState(); render();
  }

  async function startVocalCheck() {
    if (!navigator.mediaDevices?.getUserMedia) { state.vocalCheckStep='error'; saveState(); render(); return; }
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      stream.getTracks().forEach(t=>t.stop());
      state.vocalCheckStep='recording'; saveState(); render();
    } catch(e) {
      state.vocalCheckStep='error'; saveState(); render();
    }
  }

  function finishVocalCheck() {
    state.vocalCheckStep='loading'; saveState(); render();
    setTimeout(()=>completeVocalCheckDemo(),750);
  }

  function completeVocalCheckDemo() {
    state.vocalProfile.complete=true;
    state.vocalProfile.minNote='C3'; state.vocalProfile.maxNote='G4'; state.vocalProfile.sampleId='demo-profile';
    state.vocalCheckStep='complete'; saveState(); announce('보컬 프로필이 준비됐어요.'); render();
  }

  async function startRecording() {
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { state.recording.status='error'; saveState(); render(); return; }
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      mediaChunks=[]; mediaRecorder=new MediaRecorder(stream);
      mediaRecorder.ondataavailable=e=>{ if(e.data.size) mediaChunks.push(e.data); };
      mediaRecorder.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(mediaChunks,{type:mediaRecorder.mimeType||'audio/webm'});
        if(state.recording.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(state.recording.previewUrl);
        state.recording.previewUrl=URL.createObjectURL(blob);
        state.recording.status='review'; saveState(); render();
      };
      mediaRecorder.start(); state.recording.status='recording'; saveState(); render();
    } catch(e) { state.recording.status='error'; saveState(); render(); }
  }

  function stopRecording() {
    if(mediaRecorder && mediaRecorder.state==='recording') mediaRecorder.stop(); else { state.recording.status='review'; state.recording.previewUrl=AUDIO.minseo; render(); }
  }

  function submitRecording(button) {
    button.disabled=true; const old=button.textContent; button.innerHTML='<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> 녹음을 저장하고 있어요';
    setTimeout(()=>{
      createActiveDuet(); state.activeDuet.myTrackStatus='complete'; state.recording.status='idle'; state.recording.previewUrl=null; saveState();
      announce('내 파트를 저장했어요.'); showToast('내 파트를 저장했어요.'); routeTo('#/duet-progress');
    },650);
  }

  function createActiveDuet() {
    state.activeDuet = state.activeDuet || {partnerId:state.selectedPartnerId,songId:state.selectedSongId,myTrackStatus:'waiting',partnerTrackStatus:'waiting',mixStatus:'waiting'};
    state.activeDuet.partnerId=state.selectedPartnerId; state.activeDuet.songId=state.selectedSongId;
    saveState();
  }

  function scheduleDemoProgress() {
    if(!state.activeDuet) createActiveDuet();
    const d=state.activeDuet;
    if(d.mixStatus==='complete') return;
    if(d.partnerTrackStatus!=='complete') {
      progressTimers.push(setTimeout(()=>{ if(route()!=='#/duet-progress') return; d.partnerTrackStatus='complete'; d.mixStatus='mixing'; saveState(); announce(`${selectedPartner().name} 파트 녹음이 완료됐어요. 두 트랙을 합치고 있어요.`); render(); },1700));
    } else if(d.mixStatus==='waiting') {
      d.mixStatus='mixing'; saveState();
    }
    if(d.mixStatus==='mixing' || d.partnerTrackStatus==='complete') {
      progressTimers.push(setTimeout(()=>{ if(route()!=='#/duet-progress') return; d.partnerTrackStatus='complete'; d.mixStatus='complete'; ensureRecentDuet(); saveState(); announce('두 녹음이 하나로 합쳐졌어요.'); render(); },3500));
    }
  }

  function clearProgressTimers(){ progressTimers.forEach(clearTimeout); progressTimers=[]; }
  function ensureRecentDuet(){ if(!state.recentDuets.includes('starlight-minseo')) state.recentDuets.unshift('starlight-minseo'); saveState(); }

  function showToast(message, actionObj=null) {
    toastRoot.innerHTML=`<div class="toast"><span>${message}</span>${actionObj?`<button type="button">${actionObj.label}</button>`:''}</div>`;
    if(actionObj) toastRoot.querySelector('button').addEventListener('click',()=>{actionObj.action();toastRoot.innerHTML='';});
    clearTimeout(showToast.t); showToast.t=setTimeout(()=>toastRoot.innerHTML='',3200);
  }

  function openSearchModal() {
    currentModalRestoreFocus=document.activeElement;
    const hash=route(); const mode=hash.includes('voices')?'voice':hash.includes('songs')?'song':'all';
    modalRoot.innerHTML=`<div class="modal-scrim" role="presentation"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="search-title"><h2 id="search-title">${mode==='voice'?'보컬 검색':mode==='song'?'듀엣곡 검색':'보컬과 곡 검색'}</h2><p>이름이나 곡 제목을 입력해 주세요.</p><input class="search-input" id="search-input" type="search" autocomplete="off" aria-label="검색어" placeholder="예: 민서, 별빛 사이"><div class="search-results" id="search-results"></div><div class="modal-actions" style="margin-top:16px"><button class="btn btn-secondary" data-modal-close>닫기</button></div></div></div>`;
    const input=modalRoot.querySelector('#search-input'); const results=modalRoot.querySelector('#search-results');
    const renderResults=()=>{
      const q=input.value.trim().toLowerCase(); if(!q){results.innerHTML='';return;}
      const rows=[];
      if(mode!=='song') partners.filter(p=>p.name.toLowerCase().includes(q)||p.genre.toLowerCase().includes(q)).forEach(p=>rows.push(`<button class="search-result" data-result-type="voice" data-result-id="${p.id}"><strong>${p.name}</strong><br><span class="meta">${p.role} · ${p.range}</span></button>`));
      if(mode!=='voice') songs.filter(s=>s.title.toLowerCase().includes(q)).forEach(s=>rows.push(`<button class="search-result" data-result-type="song" data-result-id="${s.id}"><strong>${s.title}</strong><br><span class="meta">${s.artist}</span></button>`));
      results.innerHTML=rows.length?rows.join(''):'<div class="empty-state" style="min-height:120px"><h3>검색 결과가 없어요.</h3><p>다른 이름이나 곡 제목을 입력해 주세요.</p></div>';
      results.querySelectorAll('[data-result-id]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.resultId;closeModal(); if(btn.dataset.resultType==='voice'){state.selectedPartnerId=id;saveState();routeTo(`#/partner/${id}`);} else {state.selectedSongId=id;saveState();routeTo(`#/song/${id}`);}}));
    };
    input.addEventListener('input',renderResults);
    modalRoot.querySelector('[data-modal-close]').addEventListener('click',closeModal);
    modalRoot.querySelector('.modal-scrim').addEventListener('click',e=>{if(e.target.classList.contains('modal-scrim')) closeModal();});
    document.addEventListener('keydown',modalKeydown);
    input.focus();
  }

  function openLeaveRecordingModal() {
    currentModalRestoreFocus=document.activeElement;
    modalRoot.innerHTML=`<div class="modal-scrim"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">녹음을 그만할까요?</h2><p>지금 녹음한 내용은 저장되지 않아요.</p><div class="modal-actions"><button class="btn btn-primary" data-modal-continue>계속 녹음하기</button><button class="btn btn-text" data-modal-leave>나가기</button></div></div></div>`;
    modalRoot.querySelector('[data-modal-continue]').addEventListener('click',closeModal);
    modalRoot.querySelector('[data-modal-leave]').addEventListener('click',()=>{ if(mediaRecorder?.state==='recording') mediaRecorder.stop(); state.recording.status='idle'; state.recording.previewUrl=null; saveState(); closeModal(); history.back(); });
    document.addEventListener('keydown',modalKeydown); modalRoot.querySelector('button').focus();
  }

  function modalKeydown(e) {
    if(e.key==='Escape') { e.preventDefault(); closeModal(); }
    if(e.key==='Tab') {
      const focusables=[...modalRoot.querySelectorAll('button,input,[href],[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled);
      if(!focusables.length) return;
      const first=focusables[0], last=focusables[focusables.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  }

  function closeModal() {
    modalRoot.innerHTML=''; document.removeEventListener('keydown',modalKeydown); if(currentModalRestoreFocus?.focus) currentModalRestoreFocus.focus(); currentModalRestoreFocus=null;
  }

  window.addEventListener('hashchange',render);
  window.addEventListener('beforeunload',saveState);
  document.addEventListener('click',e=>{
    const back=e.target.closest('[data-action="back"]');
    if(back && route()==='#/recording' && state.recording.status==='recording') { e.preventDefault(); e.stopImmediatePropagation(); openLeaveRecordingModal(); }
  }, true);

  if(!location.hash) location.hash='#/home'; else render();
})();
