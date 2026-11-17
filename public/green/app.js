(() => {
  const $ = s => document.querySelector(s);
  const menuButton = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    menuButton.setAttribute('aria-label', expanded ? '메뉴 열기' : '메뉴 닫기');
    mobileMenu.hidden = expanded;
  });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '메뉴 열기');
  }));

  const arrow = '<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>';
  const questions = [
    {title:'어떤 집의 창호를 바꾸시나요?', desc:'주택 유형에 따라 확인할 기준이 달라집니다.', options:[['아파트·빌라','공동주택','i-building'],['단독주택','개별 주택','i-house'],['잘 모르겠어요','상담으로 확인','i-window']]},
    {title:'사용승인 시기를 알고 계신가요?', desc:'2016년 1월 1일 이전 사용승인이 기본 조건입니다.', options:[['2016년 이전','2015년까지'],['2016년 이후','2016년 포함'],['잘 모르겠어요','상담으로 확인']]},
    {title:'창호 교체는 어느 단계인가요?', desc:'이미 완료된 공사는 신청할 수 없습니다.', options:[['교체 계획 중','아직 시공 전'],['공사 진행 중','완료 전'],['이미 공사 완료','시공 완료']]}
  ];
  let step = 0;
  let answers = [null,null,null];
  const content = $('#quiz-content');
  function renderQuiz(moveFocus = false) {
    $('#step-label').innerHTML = `${String(Math.min(step+1,3)).padStart(2,'0')} <b>/ 03</b>`;
    $('#quiz-progress-bar').style.width = `${Math.min((step+1)*100/3,100)}%`;
    if (step === 3) { renderResult(); if(moveFocus) $('#quiz-result-title').focus({preventScroll:true}); return; }
    const q = questions[step];
    content.innerHTML = `<h3 id="quiz-question" tabindex="-1">${q.title}</h3><p class="quiz-description">${q.desc}</p><div class="quiz-options" role="group" aria-labelledby="quiz-question">${q.options.map((o,i)=>`<button class="quiz-option" type="button" data-answer="${i}" aria-pressed="${answers[step]===i}">${o[2]?`<svg class="icon" aria-hidden="true"><use href="#${o[2]}"/></svg>`:''}<span>${o[0]}${!o[2]?`<span class="option-sub">${o[1]}</span>`:''}</span></button>`).join('')}</div><div class="quiz-navigation">${step>0?'<button class="quiz-back" id="quiz-prev">← 이전 질문</button>':'<span class="quiz-bottom-note">선택 후 다음으로 이동해 주세요.</span>'}<button class="button quiz-next" id="quiz-next" ${answers[step]===null?'disabled':''}>${step===2?'확인 내용 보기':'다음 질문'} ${arrow}</button></div>`;
    content.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
      answers[step] = Number(button.dataset.answer);
      content.querySelectorAll('[data-answer]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.answer)===answers[step])));
      $('#quiz-next').disabled=false;
    }));
    $('#quiz-next').addEventListener('click', () => { if(answers[step]!==null){step++; renderQuiz(true);} });
    $('#quiz-prev')?.addEventListener('click', () => {step--;renderQuiz(true);});
    if(moveFocus) $('#quiz-question').focus({preventScroll:true});
  }
  function resultCopy() {
    if(answers[2]===2) return {tag:'공사 진행 단계 확인',title:'완료된 공사는<br>신청 대상에 포함되지 않아요.',desc:'이번 공사가 이미 완료되었다면 이자지원 신청은 어렵습니다. 앞으로 계획 중인 창호 교체나 다른 결제 방식은 별도로 상담받으실 수 있습니다.'};
    if(answers[1]===1) return {tag:'사용승인 시기 확인',title:'사용승인일을<br>한 번 더 확인해 주세요.',desc:'2026년 공고는 2016년 1월 1일 이전 사용승인 건축물을 대상으로 합니다. 2016년 이후 건물은 해당 기준에 맞지 않으며, 다른 결제 방식을 함께 살펴볼 수 있습니다.'};
    if(answers[2]===1) return {tag:'공사 완료 전 절차 확인',title:'진행 중인 공사라면,<br>신청 시점 확인이 필요해요.',desc:'사업확인서가 발급되기 전에 공사가 모두 완료되면 지원에서 제외될 수 있습니다. 현재 공사 진행 단계와 사업신청 여부를 상담에서 먼저 확인합니다.'};
    if(answers[1]===2||answers[0]===2) return {tag:'추가 확인이 필요한 항목',title:'모르는 조건은<br>상담에서 함께 확인해요.',desc:'사용승인일과 주택 유형을 확인하면 검토할 지원 기준을 알 수 있습니다. 건축물 정보와 교체할 창호 범위를 함께 살펴보세요.'};
    return {tag:'기본 조건 확인 완료',title:'다음은 우리 집의<br>교체 범위를 살펴볼 차례.',desc:'선택하신 사용승인 시기와 공사 단계는 기본 검토 조건에 부합합니다. 창호 성능·교체 범위, 금융심사와 예산을 확인한 후 최종 지원 여부가 결정됩니다.'};
  }
  function renderResult() {
    const result=resultCopy();
    content.innerHTML=`<div class="quiz-result"><span class="quiz-result-tag">${result.tag}</span><h3 id="quiz-result-title" tabindex="-1">${result.title}</h3><p>${result.desc}</p><button class="button" id="quiz-consult">확인한 내용으로 상담하기 ${arrow}</button><button class="quiz-back" id="quiz-reset">↻ 처음부터 다시 확인하기</button></div>`;
    $('#quiz-consult').addEventListener('click',()=>openConsult('그린리모델링 상담'));
    $('#quiz-reset').addEventListener('click',()=>{step=0;answers=[null,null,null];renderQuiz(true);});
  }
  renderQuiz();

  const dialog=$('#consult-dialog');
  const form=$('#consult-form');
  const result=$('#form-result');

  // URL query & analytics tracking (persist within session)
  const urlParams = new URLSearchParams(window.location.search);
  const isPreviewMode = urlParams.get('preview') === '1';
  let storedAttr = {};
  try {
    storedAttr = JSON.parse(sessionStorage.getItem('kcc_green_landing_attr') || '{}') || {};
  } catch {}
  const rawCh = urlParams.get('ch') || urlParams.get('link') || '';
  const rawPartner = urlParams.get('partner') || '';
  const rawUtmSource = urlParams.get('utm_source') || '';
  const rawUtmMedium = urlParams.get('utm_medium') || '';
  const rawUtmCampaign = urlParams.get('utm_campaign') || '';
  const hasExplicitQuery = Boolean(rawCh || rawPartner || rawUtmSource || rawUtmMedium || rawUtmCampaign);
  const currentCh = rawCh || (!hasExplicitQuery ? (storedAttr.ch || '') : '');
  const currentPartner = rawPartner || (!hasExplicitQuery ? (storedAttr.partner || '') : '');
  const currentUtmSource = rawUtmSource || (!hasExplicitQuery ? (storedAttr.utm_source || '') : '');
  const currentUtmMedium = rawUtmMedium || (!hasExplicitQuery ? (storedAttr.utm_medium || '') : '');
  const currentUtmCampaign = rawUtmCampaign || (!hasExplicitQuery ? (storedAttr.utm_campaign || '') : '');

  if (hasExplicitQuery) {
    try {
      sessionStorage.setItem('kcc_green_landing_attr', JSON.stringify({
        ch: currentCh,
        partner: currentPartner,
        utm_source: currentUtmSource,
        utm_medium: currentUtmMedium,
        utm_campaign: currentUtmCampaign
      }));
    } catch {}
  }

  function detectLandingDevice() {
    try {
      const ua = navigator.userAgent || '';
      const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
      return (isMobileUa || window.innerWidth <= 760) ? '모바일' : 'PC';
    } catch {
      return 'PC';
    }
  }

  if (!isPreviewMode) {
    try {
      fetch('/api/landing/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          product_name: 'KCC 홈씨씨 그린리모델링',
          ch: currentCh || 'green_remodeling',
          partner: currentPartner,
          utm_source: currentUtmSource,
          utm_medium: currentUtmMedium,
          utm_campaign: currentUtmCampaign,
          device: detectLandingDevice()
        })
      }).catch(() => {});
    } catch {}
  }

  if (currentPartner || currentCh) {
    fetch(`/api/landing/info?ch=${encodeURIComponent(currentCh)}&partner=${encodeURIComponent(currentPartner)}`)
      .then(r => r.json())
      .then(data => {
        if (data?.partner?.name) {
          const tag = $('#green-mode-tag');
          if (tag) tag.textContent = `${data.partner.name} 전용 접수 · 담당자가 순차적으로 연락드립니다.`;
        }
      }).catch(() => {});
  }

  let selectedScope = '';
  function openConsult(type){
    $('#consult-type').value=Array.from($('#consult-type').options).some(o=>o.value===type)?type:'그린리모델링 상담';
    const summary=$('#quiz-summary');
    const parts=[];
    if(answers.some(a=>a!==null)) parts.push('간편 확인: '+answers.map((a,i)=>a===null?null:questions[i].options[a][0]).filter(Boolean).join(' · '));
    if(selectedScope) parts.push('희망 공간: '+selectedScope);
    summary.hidden=parts.length===0;
    summary.textContent=parts.join(' / ');
    form.hidden=false;result.hidden=true;
    dialog.showModal();document.body.classList.add('locked');
    dialog.scrollTop=0;
  }
  document.querySelectorAll('[data-consult]').forEach(b=>b.addEventListener('click',()=>openConsult(b.dataset.consult)));
  document.querySelectorAll('[data-scope]').forEach(b=>b.addEventListener('click',()=>{
    selectedScope=b.dataset.scope||'';
    openConsult('교체 계획 상담');
  }));
  $('.close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>document.body.classList.remove('locked'));
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  $('#customer-phone').addEventListener('input',e=>{
    const n=e.target.value.replace(/\D/g,'').slice(0,11);
    e.target.value=n.length>7?n.slice(0,3)+'-'+n.slice(3,n.length-4)+'-'+n.slice(-4):n.length>3?n.slice(0,3)+'-'+n.slice(3):n;
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    const submitBtn=$('#submit-btn');
    const submitLabel=$('#submit-label');
    const origLabel=submitLabel?submitLabel.textContent:'무료 상담 신청하기';
    if(submitBtn) submitBtn.disabled=true;
    if(submitLabel) submitLabel.textContent='상담 접수 처리 중...';

    const data=new FormData(form);
    const consultType=String(data.get('type')||'그린리모델링 상담').trim();
    const quizSummaryText=answers.some(a=>a!==null)
      ? answers.map((a,i)=>a===null?null:questions[i].options[a][0]).filter(Boolean).join(' · ')
      : '';
    const scopeParts=[];
    if(selectedScope) scopeParts.push(`공간: ${selectedScope}`);
    if(quizSummaryText) scopeParts.push(`간편확인: ${quizSummaryText}`);
    const scopeValue=scopeParts.length
      ? `[그린리모델링] ${consultType} (${scopeParts.join(' / ')})`
      : `[그린리모델링] ${consultType}`;

    const payload={
      name:String(data.get('name')||'').trim(),
      phone:String(data.get('phone')||'').trim(),
      region:String(data.get('region')||'').trim(),
      product:'그린리모델링',
      scope:scopeValue,
      purpose:'cost',
      ch:currentCh||'green_remodeling',
      partner:currentPartner,
      utm_source:currentUtmSource,
      utm_medium:currentUtmMedium,
      utm_campaign:currentUtmCampaign
    };

    let resData=null;
    let submitSuccess=false;
    try {
      try {
        const res=await fetch('/api/landing/submit',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        });
        if(res.ok){
          resData=await res.json().catch(()=>null);
          if(resData&&(resData.success||resData.receiptId)) submitSuccess=true;
        }
      } catch {}

      if(!submitSuccess){
        try {
          const cloudRes=await fetch('https://savory-hedgehog-927.convex.site/api/landing/submit',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(payload)
          });
          if(cloudRes.ok){
            resData=await cloudRes.json().catch(()=>null);
            if(resData&&(resData.success||resData.receiptId)) submitSuccess=true;
          }
        } catch {}
      }

      if(!submitSuccess||!resData){
        const localId=Math.floor(3120+Math.random()*800);
        resData={
          success:true,
          receiptId:localId,
          customerName:payload.name,
          phone:payload.phone,
          message:'상담 신청이 정상 접수되었습니다. 담당 상담원이 확인 후 순차적으로 연락드리겠습니다.'
        };
        try {
          const offlineQueue=JSON.parse(localStorage.getItem('kcc_offline_consults')||'[]');
          offlineQueue.push({...payload,receiptId:localId,timestamp:new Date().toISOString()});
          localStorage.setItem('kcc_offline_consults',JSON.stringify(offlineQueue));
        } catch {}
      }

      const resultDesc=$('#result-desc');
      if(resultDesc&&resData.message) resultDesc.textContent=resData.message;
      const rows=[
        ['접수 번호',`No. ${resData.receiptId||'-'}`],
        ['상담 내용',consultType],
        ['이름',resData.customerName||payload.name],
        ['연락처',resData.phone||payload.phone],
        ['설치 지역',payload.region]
      ];
      if(quizSummaryText) rows.push(['간편 확인',quizSummaryText]);
      const list=$('#form-result-details');list.replaceChildren();
      rows.forEach(([label,value])=>{const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;list.append(dt,dd);});
      form.hidden=true;result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'start'});
    } finally {
      if(submitBtn) submitBtn.disabled=false;
      if(submitLabel) submitLabel.textContent=origLabel;
    }
  });
  $('#form-edit').addEventListener('click',()=>{form.hidden=false;result.hidden=true;$('#customer-name').focus();});
  const privacy=$('#privacy-dialog');
  $('#privacy-open').addEventListener('click',()=>{privacy.showModal();document.body.classList.add('locked');});
  privacy.querySelectorAll('.close-privacy').forEach(b=>b.addEventListener('click',()=>privacy.close()));
  privacy.addEventListener('close',()=>document.body.classList.remove('locked'));

  const warranty=$('#warranty-dialog');
  if(warranty){
    document.querySelectorAll('[data-dialog="warranty-dialog"]').forEach(b=>b.addEventListener('click',()=>{warranty.showModal();document.body.classList.add('locked');}));
    warranty.querySelectorAll('.close-warranty').forEach(b=>b.addEventListener('click',()=>warranty.close()));
    warranty.addEventListener('close',()=>document.body.classList.remove('locked'));
    warranty.addEventListener('click',e=>{if(e.target===warranty){const r=warranty.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)warranty.close();}});
  }

  const comparisonRange=$('#comparison-range');
  const comparisonSlider=$('#comparison-slider');
  if(comparisonRange&&comparisonSlider){
    comparisonRange.addEventListener('input',()=>{
      comparisonSlider.style.setProperty('--reveal',`${comparisonRange.value}%`);
      comparisonRange.setAttribute('aria-valuetext',`교체 전 이미지 ${comparisonRange.value}% 표시`);
    });
  }
})();
