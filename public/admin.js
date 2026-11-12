(() => {
  'use strict';

  const AUTH_TOKEN_KEY = 'kcc_auth_token';
  const STATUS_LABELS = {
    received: '신규 접수',
    review: '서류 확인 중',
    needs_info: '보완 요청',
    screening: '심사 중',
    confirmed: '계약 확정',
    rejected: '진행 불가',
    cancelled: '취소'
  };

  const SUPPLEMENT_PRESETS = {
    blurry_id: '제출해주신 신분증 이미지에 빛 반사 또는 흐림이 있어 글자 확인이 어렵습니다. 밝은 곳에서 정면으로 다시 촬영하여 등록해 주세요.',
    cropped_id: '신분증 테두리 일부가 잘려 확인이 어렵습니다. 신분증 네 모서리가 모두 보이도록 다시 촬영해 주세요.',
    info_mismatch: '견적서 계약자 정보와 제출 서류 내용을 다시 대조해야 합니다. 계약자 본인 신분증으로 다시 등록해 주세요.',
    signature_redo: '전자 서명 획이 흐리거나 누락되어 확인이 어렵습니다. 서명란에 성함을 또렷하게 다시 서명해 주세요.',
    other: '원활한 렌탈 심사 진행을 위해 서류 재등록이 필요합니다. 안내 내용을 확인하신 후 다시 제출해 주세요.'
  };

  const $ = id => document.getElementById(id);
  const escapeHtml = s =>
    String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
  const fmtDateTime = iso => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';
  let currentUser = null;
  let currentScope = { canViewSensitiveDocs: false, canConfirmContract: false };
  let filterStatus = 'all';
  let filterAssignee = 'all';
  let searchQuery = '';
  let nextCursor = null;
  let applications = [];
  let activeDetail = null;
  let searchDebounce = null;

  // Document viewer runtime state (in-memory only, revoked on close/expiry)
  let docState = {
    kind: 'id_card',
    docId: null,
    objectUrl: '',
    zoom: 1,
    rotate: 0,
    expiresAtMs: 0,
    timerId: null,
    lastPassword: '',
    lastReason: ''
  };

  function statusPill(code, label) {
    const safeCode = escapeHtml(code || 'received');
    const text = escapeHtml(label || STATUS_LABELS[code] || code);
    return `<span class="status-pill status-${safeCode}">${text}</span>`;
  }

  async function adminFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const res = await fetch(url, {
      ...options,
      headers,
      body,
      cache: 'no-store'
    });
    if (res.status === 401) {
      showLoginGate('인증 세션이 만료되었습니다. 다시 로그인해 주세요.');
      throw new Error('UNAUTHORIZED');
    }
    return res;
  }

  function showLoginGate(message = '') {
    authToken = '';
    currentUser = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    if ($('admin-detail').open) $('admin-detail').close();
    if ($('doc-viewer').open) closeDocViewer();
    $('admin-app-shell').hidden = true;
    $('admin-login-screen').hidden = false;
    $('admin-login-error').textContent = message;
  }

  function showAppShell() {
    $('admin-login-screen').hidden = true;
    $('admin-app-shell').hidden = false;
    if (currentUser) {
      $('side-user-name').textContent = currentUser.name || currentUser.username;
      $('side-user-role').textContent = `${currentUser.org_name || '본사'} · ${currentUser.role_label || currentUser.role}`;
      $('side-user-avatar').textContent = String(currentUser.name || '관').slice(0, 1);
    }
  }

  async function boot() {
    if (!authToken) {
      showLoginGate('');
      return;
    }
    try {
      const meRes = await adminFetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meRes.ok || !meData.user) {
        showLoginGate('유효한 관리자 로그인이 필요합니다.');
        return;
      }
      currentUser = meData.user;
      showAppShell();
      await loadList(true);

      // Open specific receipt if ?id=R-... is present in URL
      const initialId = new URLSearchParams(location.search).get('id');
      if (initialId) {
        await openDetail(initialId);
      }
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        showLoginGate('서버 연결 상태를 확인한 뒤 로그인해 주세요.');
      }
    }
  }

  // 1. Login & Logout
  $('admin-login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const username = $('admin-login-id').value.trim();
    const password = $('admin-login-pw').value;
    if (!username || !password) return;

    $('admin-login-submit').disabled = true;
    $('admin-login-error').textContent = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        $('admin-login-error').textContent = data.error || '로그인에 실패했습니다.';
        return;
      }
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      $('admin-login-pw').value = '';
      showAppShell();
      await loadList(true);
    } catch {
      $('admin-login-error').textContent = '네트워크 오류로 로그인 요청에 실패했습니다.';
    } finally {
      $('admin-login-submit').disabled = false;
    }
  });

  $('admin-logout-btn').addEventListener('click', () => {
    showLoginGate('로그아웃되었습니다.');
  });

  $('admin-refresh-btn').addEventListener('click', () => loadList(true));

  // 2. Load Scoped Applications List & KPIs
  async function loadList(reset = true) {
    try {
      const qs = new URLSearchParams({
        status: filterStatus,
        assignee: filterAssignee,
        q: searchQuery,
        limit: '50'
      });
      if (!reset && nextCursor) {
        qs.set('cursor', nextCursor);
      }
      const res = await adminFetch(`/api/admin/rental-applications?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        return;
      }

      currentScope = data.scope || {};
      nextCursor = data.nextCursor || null;
      applications = reset ? (data.applications || []) : [...applications, ...(data.applications || [])];

      $('side-count').textContent = String(data.stats?.total ?? applications.length);
      $('admin-scope-badge').textContent = `${currentScope.orgName || '본사'} · ${
        currentScope.canViewSensitiveDocs ? '원본열람·확정 권한' : '마스킹 조회 범위'
      }`;
      $('inbox-scope-label').textContent = `조회 범위: ${currentScope.orgName || '전체'} (${applications.length}건 표시)`;
      $('admin-load-more').hidden = !nextCursor;

      renderStats(data.stats || {});
      renderTable();
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        console.error('Failed to load rental applications:', err);
      }
    }
  }

  function renderStats(stats) {
    const cards = [
      ['전체 신청', stats.total || 0, '권한 범위 내 전체 접수 건', '▤', ''],
      ['신규 접수', stats.received || 0, '서류 초기 확인 대기', '↘', (stats.received || 0) > 0 ? 'accent' : ''],
      ['보완 요청 중', stats.needs_info || 0, '고객 재제출 확인 대기', '!', ''],
      ['계약 확정', stats.confirmed || 0, '승인번호 검증 및 확정 완료', '✓', '']
    ];
    $('admin-stats').innerHTML = cards
      .map(
        ([title, count, desc, icon, cls]) => `
        <div class="stat-card ${cls}">
          <div>${escapeHtml(title)}<span class="stat-mark">${icon}</span></div>
          <strong>${Number(count)}<small>건</small></strong>
          <p>${escapeHtml(desc)}</p>
        </div>`
      )
      .join('');
  }

  function renderTable() {
    $('result-count').textContent = `${applications.length}건`;
    $('empty-results').hidden = applications.length > 0;

    $('applications').innerHTML = applications
      .map(r => {
        const idBadge = r.hasIdCard ? `<span>신분증</span>` : `<span class="muted">신분증 파기/없음</span>`;
        const sigBadge = r.hasSignature ? `<span>전자서명</span>` : `<span class="muted">서명 파기/없음</span>`;
        return `
        <tr data-row="${escapeHtml(r.id)}">
          <td>
            <button type="button" class="row-open" data-id="${escapeHtml(r.id)}">${escapeHtml(r.id)}</button>
            <small>${escapeHtml(fmtDateTime(r.receivedAt))} · 견적 No.${escapeHtml(r.quoteNo)}(v${Number(r.quoteVersion || 1)})</small>
          </td>
          <td>
            <strong>${escapeHtml(r.customerName)}</strong>
            <small>${escapeHtml(r.maskedPhone)}</small>
          </td>
          <td>
            <strong>월 ${won(r.monthly)}</strong>
            <small>초기 ${won(r.upfront)} · ${Number(r.months || 60)}개월</small>
          </td>
          <td>
            <div class="file-tags">${idBadge}${sigBadge}</div>
          </td>
          <td>
            ${statusPill(r.status, r.statusLabel)}
            ${r.contractReference ? `<small>승인: ${escapeHtml(r.contractReference)}</small>` : ''}
          </td>
          <td>
            <strong>${escapeHtml(r.assignedTo || '미배정')}</strong>
            <small>${escapeHtml(r.partnerName || '직영')}</small>
          </td>
          <td>
            <button type="button" class="row-arrow" data-id="${escapeHtml(r.id)}" aria-label="${escapeHtml(r.customerName)} 신청 상세">↗</button>
          </td>
        </tr>`;
      })
      .join('');

    document.querySelectorAll('#applications [data-id]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openDetail(btn.dataset.id);
      });
    });
    document.querySelectorAll('#applications tr[data-row]').forEach(row => {
      row.addEventListener('click', () => openDetail(row.dataset.row));
    });
  }

  // Filter & Search Listeners
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      filterStatus = btn.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === btn));
      loadList(true);
    });
  });

  $('admin-assignee-filter').addEventListener('change', e => {
    filterAssignee = e.target.value;
    loadList(true);
  });

  $('admin-search').addEventListener('input', e => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = e.target.value.trim();
      loadList(true);
    }, 220);
  });

  $('admin-load-more').addEventListener('click', () => loadList(false));

  // 3. Detail Drawer & Tabs
  function switchTab(tabKey) {
    document.querySelectorAll('[data-tab]').forEach(b => {
      b.setAttribute('aria-selected', String(b.dataset.tab === tabKey));
    });
    ['info', 'supplement', 'consent', 'history'].forEach(k => {
      $('detail-' + k).hidden = k !== tabKey;
    });
  }

  document.querySelectorAll('[data-tab]').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });

  $('detail-close').addEventListener('click', () => $('admin-detail').close());
  $('admin-detail').addEventListener('close', () => {
    document.body.style.overflow = '';
  });

  async function openDetail(appId, keepTab = 'info') {
    try {
      const [detailRes, auditRes] = await Promise.all([
        adminFetch(`/api/admin/rental-applications/${encodeURIComponent(appId)}`),
        adminFetch(`/api/admin/rental-applications/${encodeURIComponent(appId)}/audit`)
      ]);
      const detailData = await detailRes.json();
      const auditData = await auditRes.json();
      if (!detailRes.ok) {
        alert(detailData.error || '신청 상세 정보를 불러올 수 없습니다.');
        return;
      }

      activeDetail = {
        ...detailData,
        auditEvents: auditData.events || []
      };

      renderDetailDrawer();
      switchTab(keepTab);

      if (!$('admin-detail').open) {
        $('admin-detail').showModal();
        document.body.style.overflow = 'hidden';
      }
      document.querySelector('.detail-scroll').scrollTop = 0;
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        alert('신청 상세 조회 중 오류가 발생했습니다.');
      }
    }
  }

  function renderDetailDrawer() {
    if (!activeDetail) return;
    const app = activeDetail.application;
    const perms = activeDetail.permissions || {};
    const sp = app.snapshotPricing || {};
    const cq = app.currentQuote || {};

    $('detail-id').textContent = `${app.id} · 접수일시 ${fmtDateTime(app.receivedAt)}`;
    $('detail-title').textContent = `${app.customerName} 고객님`;
    $('detail-status').innerHTML = statusPill(app.status, app.statusLabel);
    $('detail-owner').textContent = `${app.assignedTo || '미배정'} · ${app.partnerName || '직영'}`;
    $('detail-revision').textContent = `Rev.${app.revision || 1}`;

    // Warn if current quote version/price diverged after rental submission
    if (cq.totalPrice && sp.cashPriceAtSubmission && cq.totalPrice !== sp.cashPriceAtSubmission) {
      $('detail-quote-diff').hidden = false;
      $('detail-quote-diff').innerHTML = `<strong>견적 변경 감지 안내:</strong> 본 신청은 견적 v${app.quoteVersion}(일시불 기준 ${won(
        sp.cashPriceAtSubmission
      )}) 시점 스냅샷으로 접수되었습니다. 현재 최신 발행 견적은 v${cq.version}(${won(cq.totalPrice)})이므로 금액 조건 변경 여부를 반드시 확인하세요.`;
    } else {
      $('detail-quote-diff').hidden = true;
    }

    const infoRows = [
      ['계약자 성함', app.customerName],
      ['휴대폰 번호 (마스킹)', app.maskedPhone],
      ['생년월일 (마스킹)', app.maskedBirthDate],
      ['연결 견적번호', `No. ${app.quoteNo} (v${app.quoteVersion} · ${sp.quoteTypeAtSubmission || '가견적'})`],
      ['시공 주소', app.address || '-'],
      ['승인·계약번호', app.contractReference || '미확정']
    ];
    if (app.reviewNote) {
      infoRows.push(['최근 검토 메모', app.reviewNote]);
    }
    $('applicant-info').innerHTML = infoRows
      .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`)
      .join('');

    $('admin-amount').innerHTML = [
      ['선택 플랜', sp.planTitle || '-'],
      ['초기 납입액', won(sp.upfront)],
      ['월 납부액 × 기간', `${won(sp.monthly)} × ${sp.months || 60}개월`],
      ['총 납부 예정금액', won(sp.total)]
    ]
      .map(([k, v]) => `<div><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`)
      .join('');

    // Document cards
    $('detail-doc-perm-hint').textContent = perms.canViewSensitiveDocs
      ? '비밀번호 재인증 및 사유 입력 후 3분간 열람 가능'
      : '현재 계정은 메타데이터만 확인 가능 (원본 열람 권한 제한)';

    const activeIdDoc = (activeDetail.documents || []).find(d => d.kind === 'id_card' && d.isActive && !d.deletedAt);
    const activeSigDoc = (activeDetail.documents || []).find(d => d.kind === 'signature' && d.isActive && !d.deletedAt);

    $('detail-docs').innerHTML = [
      ['id_card', '▧', '신분증 이미지', activeIdDoc],
      ['signature', '✎', '전자 서명 이미지', activeSigDoc]
    ]
      .map(([kind, iconChar, label, doc]) => {
        if (!doc) {
          return `<button type="button" disabled>
            <span class="doc-icon">${iconChar}</span>
            <strong>${escapeHtml(label)}</strong>
            <small>보존 만료 파기 완료 또는 제출본 없음</small>
          </button>`;
        }
        const thumbHtml = doc.dataUrl
          ? `<div style="margin-top:6px;background:#fff;border:1px solid #cbd5e1;border-radius:4px;padding:3px;max-height:80px;overflow:hidden;display:flex;align-items:center;justify-content:center"><img src="${doc.dataUrl}" alt="${escapeHtml(label)}" style="max-height:74px;max-width:100%;object-fit:contain"></div>`
          : '';
        return `<button type="button" data-open-doc="${kind}" data-doc-id="${doc.id}">
          <span class="doc-icon">${iconChar}</span>
          <strong>${escapeHtml(label)} (v${doc.versionNo})</strong>
          <small>${escapeHtml(doc.mimeType)} · ${doc.width}×${doc.height}px · SHA256 ${escapeHtml(doc.digestPrefix)}…<br>열람 창 열기 →</small>
          ${thumbHtml}
        </button>`;
      })
      .join('');

    document.querySelectorAll('[data-open-doc]').forEach(btn => {
      btn.addEventListener('click', () => openDocViewerModal(btn.dataset.openDoc, Number(btn.dataset.docId)));
    });

    // Review checks
    $('check-id').checked = Boolean(app.checks?.id);
    $('check-signature').checked = Boolean(app.checks?.signature);
    $('check-consent').checked = Boolean(app.checks?.consent);

    // Processing form
    const staffOptions = Array.from(new Set(['미배정', ...(activeDetail.assignableStaff || []), app.assignedTo].filter(Boolean)));
    $('admin-assignee-select').innerHTML = staffOptions
      .map(name => `<option value="${escapeHtml(name)}" ${name === app.assignedTo ? 'selected' : ''}>${escapeHtml(name)}</option>`)
      .join('');

    const isPartner = currentScope.role === 'partner';
    $('admin-processing-box').hidden = isPartner;
    $('supplement-form-wrap').hidden = isPartner || ['confirmed', 'cancelled', 'rejected'].includes(app.status);

    // Populate status dropdown from allowedNextStatuses (or all if hq_admin checks force correction)
    populateStatusSelect(false);
    $('admin-force-wrap').hidden = currentUser?.role !== 'hq_admin';
    $('admin-force-correction').checked = false;

    $('admin-contract-ref').value = app.contractReference || '';
    $('admin-memo').value = '';
    $('admin-feedback').textContent = '';
    $('admin-feedback').classList.remove('is-error');
    syncContractRefVisibility();

    // Purge box for hq_admin on cancelled/rejected with non-deleted docs
    const hasAnyNonDeleted = (activeDetail.documents || []).some(d => !d.deletedAt);
    $('admin-purge-box').hidden = !(perms.canPurgeDocs && ['cancelled', 'rejected'].includes(app.status) && hasAnyNonDeleted);
    $('purge-password').value = '';
    $('purge-reason').value = '';
    $('purge-feedback').textContent = '';

    // Supplement tab defaults & history
    $('sup-basis').value = '';
    $('sup-message').value = SUPPLEMENT_PRESETS[$('sup-type').value] || '';
    $('sup-feedback').textContent = '';
    $('sup-result-box').hidden = true;

    const supList = activeDetail.supplementRequests || [];
    $('sup-history-list').innerHTML = supList.length
      ? supList
          .map(
            s => `<div class="consent-card">
            <strong>${escapeHtml(s.supplement_type)} · ${s.resolved_at ? '재제출 완료' : '미해결/대기'} (${escapeHtml(
              s.channel.toUpperCase()
            )})</strong>
            <p>발송일시: ${escapeHtml(fmtDateTime(s.created_at))} · 담당자: ${escapeHtml(s.requested_by)} · 만료: ${escapeHtml(
              fmtDateTime(s.expires_at)
            )}</p>
            <p><b>내부 근거:</b> ${escapeHtml(s.basis_note)}</p>
            <p><b>고객 안내:</b> ${escapeHtml(s.customer_message)}</p>
          </div>`
          )
          .join('')
      : '<p class="detail-help">발송된 보완 요청 내역이 없습니다.</p>';

    // Consents & integrity evidence
    const consents = activeDetail.consents || [];
    $('admin-consents').innerHTML = consents.length
      ? consents
          .map(
            c => `<div class="consent-card">
            <strong>✓ ${escapeHtml(c.title)} · ${c.agreed ? '동의 완료' : '미동의'}</strong>
            <p>버전 ${escapeHtml(c.version)} · 수신 시각 ${escapeHtml(fmtDateTime(c.receivedAt))} · 원문 해시 ${escapeHtml(
              String(c.textHash || '').slice(0, 16)
            )}…</p>
            <details>
              <summary>접수 당시 고정 동의서 원문 보기</summary>
              <pre>${escapeHtml(c.body)}</pre>
            </details>
          </div>`
          )
          .join('')
      : '<p class="detail-help">저장된 동의서 스냅샷이 없습니다.</p>';

    const ev = activeDetail.signatureEvidence;
    $('admin-evidence').innerHTML = ev
      ? `<strong>서명 시점 결합 해시 기록</strong>
         <p>신청 스냅샷 SHA-256: ${escapeHtml(ev.application_snapshot_hash)}</p>
         <p>동의 스냅샷 SHA-256: ${escapeHtml(ev.consent_snapshot_hash)}</p>
         <p>서명 이미지 SHA-256: ${escapeHtml(ev.signature_digest)}</p>
         <p>접수 IP(마스킹): ${escapeHtml(ev.ip_masked)} · 서버 수신: ${escapeHtml(fmtDateTime(ev.server_received_at))}</p>`
      : '<p>전자서명 무결성 해시 정보가 없습니다.</p>';

    // Audit timeline
    renderAuditTimeline();
  }

  function populateStatusSelect(allowAll) {
    if (!activeDetail) return;
    const app = activeDetail.application;
    const statuses = allowAll
      ? Object.keys(STATUS_LABELS)
      : app.allowedNextStatuses || [app.status];
    const filtered = statuses.filter(st => st !== 'confirmed' || activeDetail.permissions?.canConfirmContract || st === app.status);
    $('admin-status-select').innerHTML = filtered
      .map(st => `<option value="${escapeHtml(st)}" ${st === app.status ? 'selected' : ''}>${escapeHtml(STATUS_LABELS[st] || st)}</option>`)
      .join('');
  }

  function syncContractRefVisibility() {
    const selected = $('admin-status-select').value;
    $('admin-contract-ref-wrap').hidden = selected !== 'confirmed';
  }

  $('admin-status-select').addEventListener('change', syncContractRefVisibility);
  $('admin-force-correction').addEventListener('change', e => {
    populateStatusSelect(e.target.checked);
    syncContractRefVisibility();
  });

  function renderAuditTimeline() {
    const events = activeDetail?.auditEvents || [];
    $('admin-history').innerHTML = events.length
      ? events
          .map(
            ev => `<li>
            <strong>${escapeHtml(ev.action)}</strong>
            <small>${escapeHtml(fmtDateTime(ev.eventTime))} · ${escapeHtml(ev.actorName)} (${escapeHtml(ev.actorRole)}) · IP ${escapeHtml(
              ev.ipMasked || '-'
            )}</small>
            ${ev.reason ? `<p>${escapeHtml(ev.reason)}</p>` : ''}
          </li>`
          )
          .join('')
      : '<li><strong>기록된 이력이 없습니다.</strong></li>';
  }

  // 4. Save Review / Status Transition (PATCH /review)
  $('admin-save').addEventListener('click', async () => {
    if (!activeDetail) return;
    const app = activeDetail.application;
    const nextStatus = $('admin-status-select').value;
    const assignedTo = $('admin-assignee-select').value;
    const contractReference = $('admin-contract-ref').value.trim();
    const memo = $('admin-memo').value.trim();
    const forceCorrection = $('admin-force-correction').checked;
    const checks = {
      id: $('check-id').checked,
      signature: $('check-signature').checked,
      consent: $('check-consent').checked
    };

    const setFeedback = (msg, isError = false) => {
      $('admin-feedback').textContent = msg;
      $('admin-feedback').classList.toggle('is-error', isError);
    };

    if (['screening', 'confirmed'].includes(nextStatus) && !(checks.id && checks.signature && checks.consent)) {
      setFeedback('심사 중 또는 계약 확정으로 변경하려면 신분증·서명·필수 동의 확인 체크를 모두 완료해 주세요.', true);
      return;
    }
    if (nextStatus === 'confirmed' && app.status !== 'confirmed') {
      if (contractReference.length < 4) {
        setFeedback('렌탈사 승인번호 또는 계약번호(4자 이상)를 입력해야 계약을 확정할 수 있습니다.', true);
        $('admin-contract-ref').focus();
        return;
      }
      if (!memo) {
        setFeedback('계약 확정 근거를 처리 메모에 남겨 주세요.', true);
        $('admin-memo').focus();
        return;
      }
    }
    if (nextStatus !== app.status && ['needs_info', 'rejected', 'cancelled'].includes(nextStatus) && !memo) {
      setFeedback(`${STATUS_LABELS[nextStatus]} 처리 사유를 메모에 입력해 주세요.`, true);
      $('admin-memo').focus();
      return;
    }

    $('admin-save').disabled = true;
    setFeedback('서버에 검토 결과를 반영하고 있습니다...');
    try {
      const res = await adminFetch(`/api/admin/rental-applications/${encodeURIComponent(app.id)}/review`, {
        method: 'PATCH',
        body: {
          expectedVersion: app.revision,
          status: nextStatus,
          assignedTo,
          contractReference: nextStatus === 'confirmed' ? contractReference : undefined,
          checks,
          memo,
          forceCorrection
        }
      });
      const data = await res.json();
      if (res.status === 409) {
        setFeedback(data.error || '다른 담당자가 먼저 상태를 변경했습니다. 최신 정보를 다시 불러옵니다.', true);
        await openDetail(app.id, 'info');
        await loadList(true);
        return;
      }
      if (!res.ok) {
        setFeedback(data.error || '검토 내용 저장에 실패했습니다.', true);
        return;
      }

      await loadList(true);
      await openDetail(app.id, 'info');
      setFeedback(`✓ 저장 완료 (${data.statusLabel} · Rev.${data.revision})`);
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        setFeedback('네트워크 오류로 저장하지 못했습니다.', true);
      }
    } finally {
      $('admin-save').disabled = false;
    }
  });

  // 5. Supplement Request Dispatch (POST /supplement-requests)
  $('sup-type').addEventListener('change', e => {
    $('sup-message').value = SUPPLEMENT_PRESETS[e.target.value] || '';
  });

  $('sup-send-btn').addEventListener('click', async () => {
    if (!activeDetail) return;
    const app = activeDetail.application;
    const supplementType = $('sup-type').value;
    const channel = $('sup-channel').value;
    const basisNote = $('sup-basis').value.trim();
    const customerMessage = $('sup-message').value.trim();

    const setSupMsg = (msg, isError = false) => {
      $('sup-feedback').textContent = msg;
      $('sup-feedback').classList.toggle('is-error', isError);
    };

    if (basisNote.length < 4) {
      setSupMsg('내부 검토 근거(고객 비노출)를 4자 이상 입력해 주세요.', true);
      $('sup-basis').focus();
      return;
    }
    if (customerMessage.length < 6) {
      setSupMsg('고객에게 전달할 보완 요청 안내 문구를 입력해 주세요.', true);
      $('sup-message').focus();
      return;
    }

    $('sup-send-btn').disabled = true;
    setSupMsg('1회용 보완 링크를 생성하고 상태를 전환하고 있습니다...');
    try {
      const res = await adminFetch(`/api/admin/rental-applications/${encodeURIComponent(app.id)}/supplement-requests`, {
        method: 'POST',
        body: { supplementType, basisNote, customerMessage, channel }
      });
      const data = await res.json();
      if (!res.ok) {
        setSupMsg(data.error || '보완 요청 생성에 실패했습니다.', true);
        return;
      }

      await loadList(true);
      await openDetail(app.id, 'supplement');
      $('sup-result-box').hidden = false;
      $('sup-result-url').value = data.supplementUrl || '';
      $('sup-result-preview').textContent = data.dispatchedMessagePreview || '';
      setSupMsg('✓ 보완 요청 전환 및 72시간 유효 1회용 보완 링크 발급이 완료되었습니다.');
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        setSupMsg('보완 요청 처리 중 네트워크 오류가 발생했습니다.', true);
      }
    } finally {
      $('sup-send-btn').disabled = false;
    }
  });

  $('sup-copy-url').addEventListener('click', async () => {
    const url = $('sup-result-url').value;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      $('sup-feedback').textContent = '✓ 전용 보완 링크를 클립보드에 복사했습니다.';
    } catch {
      $('sup-result-url').select();
    }
  });

  // 6. Immediate Document Purge for Cancelled/Rejected (POST /purge-documents)
  $('admin-purge-btn').addEventListener('click', async () => {
    if (!activeDetail) return;
    const app = activeDetail.application;
    const password = $('purge-password').value;
    const reason = $('purge-reason').value.trim();

    if (reason.length < 4 || !password) {
      $('purge-feedback').textContent = '관리자 비밀번호와 파기 사유(4자 이상)를 모두 입력해 주세요.';
      $('purge-feedback').classList.add('is-error');
      return;
    }
    if (!confirm('암호화된 신분증·서명 원본 파일을 영구 파기하시겠습니까? 파기 후에는 복구할 수 없습니다.')) {
      return;
    }

    $('admin-purge-btn').disabled = true;
    try {
      const res = await adminFetch(`/api/admin/rental-applications/${encodeURIComponent(app.id)}/purge-documents`, {
        method: 'POST',
        body: { password, reason }
      });
      const data = await res.json();
      if (!res.ok) {
        $('purge-feedback').textContent = data.error || '서류 파기에 실패했습니다.';
        $('purge-feedback').classList.add('is-error');
        return;
      }
      await loadList(true);
      await openDetail(app.id, 'info');
      $('admin-feedback').textContent = `✓ 민감 서류 원본 ${data.purgedCount}건이 영구 파기되었습니다.`;
    } finally {
      $('admin-purge-btn').disabled = false;
    }
  });

  // 7. Re-Auth Sensitive Document Viewer
  function revokeDocObjectUrl() {
    if (docState.timerId) {
      clearInterval(docState.timerId);
      docState.timerId = null;
    }
    if (docState.objectUrl) {
      URL.revokeObjectURL(docState.objectUrl);
      docState.objectUrl = '';
    }
    $('doc-stream-img').removeAttribute('src');
  }

  function closeDocViewer() {
    revokeDocObjectUrl();
    docState.lastPassword = '';
    $('doc-auth-password').value = '';
    if ($('doc-viewer').open) $('doc-viewer').close();
  }

  function openDocViewerModal(kind, docId = null) {
    if (!activeDetail) return;
    revokeDocObjectUrl();
    docState.kind = kind;
    docState.docId = docId;
    docState.zoom = 1;
    docState.rotate = 0;

    const doc = (activeDetail.documents || []).find(d => (docId ? d.id === docId : d.kind === kind) && d.isActive && !d.deletedAt);
    if (doc && doc.dataUrl) {
      $('doc-title').textContent = kind === 'id_card' ? `신분증 원본 열람 (v${doc.versionNo})` : `전자 서명 원본 열람 (v${doc.versionNo})`;
      $('doc-stream-img').src = doc.dataUrl;
      applyDocTransform();
      const wmText = `${currentUser?.name || '관리자'}(${currentUser?.role || 'admin'}) · ${fmtDateTime(new Date().toISOString())} · ${activeDetail.application.id}`;
      $('doc-watermark-top').textContent = `보안 열람 · ${wmText}`;
      $('doc-watermark-overlay').innerHTML = Array.from({ length: 6 }, () => `<span>${escapeHtml(wmText)}</span>`).join('');
      $('doc-auth-form').hidden = true;
      $('doc-no-perm').hidden = true;
      $('doc-stream-wrap').hidden = false;
      document.querySelectorAll('[data-doc-switch]').forEach(b => {
        b.classList.toggle('active', b.dataset.docSwitch === kind);
      });
      if (!$('doc-viewer').open) {
        $('doc-viewer').showModal();
      }
      return;
    }

    $('doc-title').textContent = kind === 'id_card' ? '신분증 원본 보안 열람' : '전자 서명 원본 보안 열람';
    $('doc-auth-error').textContent = '';
    $('doc-auth-password').value = '';
    $('doc-stream-wrap').hidden = true;

    if (!activeDetail.permissions?.canViewSensitiveDocs) {
      $('doc-no-perm').hidden = false;
      $('doc-auth-form').hidden = true;
    } else {
      $('doc-no-perm').hidden = true;
      $('doc-auth-form').hidden = false;
    }

    if (!$('doc-viewer').open) {
      $('doc-viewer').showModal();
    }
  }

  document.querySelectorAll('.reason-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $('doc-auth-reason').value = chip.dataset.reason || '';
      $('doc-auth-password').focus();
    });
  });

  $('doc-close').addEventListener('click', closeDocViewer);
  $('doc-viewer').addEventListener('close', revokeDocObjectUrl);
  $('doc-canvas-stage').addEventListener('contextmenu', e => e.preventDefault());

  async function requestAndRenderStream(kind, password, reason) {
    if (!activeDetail) return;
    const appId = activeDetail.application.id;
    const res = await adminFetch(`/api/admin/rental-applications/${encodeURIComponent(appId)}/document-access`, {
      method: 'POST',
      body: { kind, password, reason }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '원본 열람 승인에 실패했습니다.');
    }

    const imgRes = await fetch(data.streamUrl, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      cache: 'no-store'
    });
    if (!imgRes.ok) {
      const errJson = await imgRes.json().catch(() => ({}));
      throw new Error(errJson.error || '보안 문서 스트림을 불러오지 못했습니다.');
    }

    const blob = await imgRes.blob();
    revokeDocObjectUrl();
    docState.objectUrl = URL.createObjectURL(blob);
    docState.kind = kind;
    docState.zoom = 1;
    docState.rotate = 0;
    docState.lastPassword = password;
    docState.lastReason = reason;
    docState.expiresAtMs = new Date(data.expiresAt).getTime();

    $('doc-title').textContent =
      kind === 'id_card' ? `신분증 원본 열람 (v${data.versionNo})` : `전자 서명 원본 열람 (v${data.versionNo})`;
    $('doc-stream-img').src = docState.objectUrl;
    applyDocTransform();

    const wmText = `${data.watermark.viewerName}(${data.watermark.viewerRole}) · ${fmtDateTime(data.watermark.viewedAt)} · ${
      data.watermark.receiptId
    }`;
    $('doc-watermark-top').textContent = `보안 열람 기록됨 · ${wmText}`;
    $('doc-watermark-overlay').innerHTML = Array.from({ length: 6 }, () => `<span>${escapeHtml(wmText)}</span>`).join('');

    document.querySelectorAll('[data-doc-switch]').forEach(b => {
      b.classList.toggle('active', b.dataset.docSwitch === kind);
    });

    $('doc-auth-form').hidden = true;
    $('doc-stream-wrap').hidden = false;

    updateDocTimer();
    docState.timerId = setInterval(updateDocTimer, 1000);

    // Refresh audit trail silently so the access log appears immediately
    const auditRes = await adminFetch(`/api/admin/rental-applications/${encodeURIComponent(appId)}/audit`);
    if (auditRes.ok) {
      const auditData = await auditRes.json();
      activeDetail.auditEvents = auditData.events || [];
      renderAuditTimeline();
    }
  }

  $('doc-auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const reason = $('doc-auth-reason').value.trim();
    const password = $('doc-auth-password').value;
    if (reason.length < 4 || !password) return;

    $('doc-auth-submit').disabled = true;
    $('doc-auth-error').textContent = '';
    try {
      await requestAndRenderStream(docState.kind, password, reason);
      $('doc-auth-password').value = '';
    } catch (err) {
      $('doc-auth-error').textContent = err.message;
      // Refresh audit log even on failure (failed access is audited!)
      if (activeDetail) {
        const auditRes = await adminFetch(`/api/admin/rental-applications/${encodeURIComponent(activeDetail.application.id)}/audit`);
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          activeDetail.auditEvents = auditData.events || [];
          renderAuditTimeline();
        }
      }
    } finally {
      $('doc-auth-submit').disabled = false;
    }
  });

  function applyDocTransform() {
    $('doc-stream-img').style.transform = `scale(${docState.zoom}) rotate(${docState.rotate}deg)`;
    $('doc-zoom-reset').textContent = `${Math.round(docState.zoom * 100)}%`;
  }

  function updateDocTimer() {
    const remainSec = Math.max(0, Math.floor((docState.expiresAtMs - Date.now()) / 1000));
    const mm = String(Math.floor(remainSec / 60)).padStart(2, '0');
    const ss = String(remainSec % 60).padStart(2, '0');
    $('doc-timer').textContent = `유효시간 ${mm}:${ss}`;
    if (remainSec <= 0) {
      revokeDocObjectUrl();
      $('doc-stream-wrap').hidden = true;
      $('doc-auth-form').hidden = false;
      $('doc-auth-error').textContent = '보안 열람 시간(3분)이 만료되어 문서가 닫혔습니다. 필요 시 다시 재인증해 주세요.';
    }
  }

  $('doc-zoom-in').addEventListener('click', () => {
    docState.zoom = Math.min(3, +(docState.zoom + 0.25).toFixed(2));
    applyDocTransform();
  });
  $('doc-zoom-out').addEventListener('click', () => {
    docState.zoom = Math.max(0.5, +(docState.zoom - 0.25).toFixed(2));
    applyDocTransform();
  });
  $('doc-zoom-reset').addEventListener('click', () => {
    docState.zoom = 1;
    docState.rotate = 0;
    applyDocTransform();
  });
  $('doc-rotate').addEventListener('click', () => {
    docState.rotate = (docState.rotate + 90) % 360;
    applyDocTransform();
  });

  document.querySelectorAll('[data-doc-switch]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetKind = btn.dataset.docSwitch;
      if (targetKind === docState.kind) return;
      if (docState.lastPassword && docState.lastReason) {
        try {
          await requestAndRenderStream(targetKind, docState.lastPassword, docState.lastReason);
          return;
        } catch {}
      }
      openDocViewerModal(targetKind);
    });
  });

  boot();
})();
