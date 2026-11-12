# 렌탈 신청 연동 규격 초안

이 문서는 구현 계약이다. 동봉 ZIP에는 운영 서버·DB·인증·파일 저장소가 포함되어 있지 않다. `rental-config.js`의 demo가 기본이며 관리자 시안은 가상 데이터만 사용한다.

## 고객 접근과 견적

- 기존 URL의 이름·휴대폰 쿼리 값을 신원이나 견적 소유권의 증거로 신뢰하지 않는다.
- 고객은 만료 가능한 견적 접근 토큰 및 정한 본인 확인 절차로 세션을 받는다. 세션은 HttpOnly / Secure / SameSite 쿠키를 사용한다. ID 파일·생년월일·서명을 URL, 분석 도구, 콘솔, localStorage에 넣지 않는다.
- `GET /api/rental/context`: 인증된 고객에게 견적 ID·버전, 계약자, 가격, 가능한 플랜, 약관 ID·버전·본문을 반환한다. 이름·전화번호는 인증된 서버 데이터로 채우며 전체 정보를 모든 방문자에게 포함한 정적 JS로 배포하지 않는다.
- 원본 견적 내 74원 정산 차이 등 확인이 필요한 값은 실제 금액 확정 뒤 운영값으로 제공한다.
- 동봉 UI는 계약자 이름·휴대폰을 읽기 전용으로 표시한다. 정보 수정은 담당자가 원본을 수정하고 새로운 견적 버전을 발행하는 흐름으로 연결한다.

## POST /api/rental/applications

동봉 프런트 `submit()`이 호출하는 동일 출처 엔드포인트. multipart/form-data, 쿠키 인증, CSRF 토큰, Idempotency-Key UUID 필수. 클라이언트의 완료 화면은 서버가 저장 성공을 응답한 경우에만 표시한다.

| 필드 | 타입 | 내용 |
|---|---|---|
| applicant | JSON 문자열 | name, phone, birthDate(YYYY-MM-DD). 서버의 인증된 고객과 결합·검증 |
| quote | JSON 문자열 | id, version, plan. 금액은 서버의 견적 버전에서 재계산 |
| consents | JSON 배열 문자열 | 각 항목 id, version, agreed=true. 서버는 필수 전체 여부 및 승인 버전을 검증 |
| idDocument | binary | JPEG/PNG/HEIC/HEIF 1개, 최대 10 MiB, 확정 정책에 맞는 이미지 |
| signature | PNG binary | 제출한 신청 내용에 대응하는 서명 이미지 |

서버 처리:
1. 세션·소유권·CSRF·요청 크기·동일 출처 정책·요청 횟수 제한 검사.
2. Idempotency-Key를 사용자 범위로 조회. 기존 성공이면 같은 접수번호 반환. 같은 키에 다른 payload면 409. 중복 요청은 단일 처리. 고객+견적 버전의 활성 신청 중복도 별도로 검사하여, 변경 후 새 키나 새 탭에서 반복 제출해도 동일 건이 중복 생성되지 않게 한다.
3. 견적 유효기간·버전·승인 약관·필수 동의·생년월일 실재 날짜·대상 연령 정책 검증. 파일 형식은 확장자가 아니라 실제 시그니처와 디코더로 검증. 빈 서명 PNG도 거부. 클라이언트 검사는 UX 보조일 뿐이다.
4. 파일 악성 검사, 과도한 해상도/압축폭탄 방어, 이미지 EXIF 등 불필요 메타데이터 제거. HEIC는 서버에서 검증·변환하여 관리 화면에서 열람 가능하게 처리.
5. 신분증·서명은 비공개 객체 저장소에 난수 키로 저장. 암호화, 권한, 보존/파기 정책 적용. 파일명·타입·메타데이터를 HTML로 직접 삽입하지 않음.
6. 정합성 있는 저장: 객체가 검증·저장되고 신청+파일 참조+동의 원문 스냅샷+서명 결합 정보가 커밋된 경우에만 received 응답. 중간 실패 시 고아 객체 정리와 재시도 설계.
7. 서버 수신 시각, 견적·약관 버전, 제출 데이터 해시, 서명 파일 해시를 연결해 이후 변조 여부를 확인할 수 있게 한다. 수집하기로 확정된 접속 증빙만 추가한다. 손서명 이미지만으로 인증 수준을 과장하지 않는다.
8. 접수 완료 이벤트를 내보내되 알림에는 신분증·생년월일·서명 원본을 넣지 않는다. 알림 발송 실패가 신청 중복 접수를 유발하지 않도록 분리한다.

성공 201 (재시도 동일 접수는 200):

```json
{"receiptId":"R-20261111-000123","status":"received","receivedAt":"2026-11-11T14:00:00Z"}
```

| 응답 | 의미 | 고객 화면 |
|---|---|---|
| 400 / 422 | 누락·형식 오류 | 필드에 오류, 내용 유지 |
| 401 | 세션 만료 | 재인증 안내. 민감정보 영구 저장 금지 |
| 403 | 권한·CSRF 실패 | 진행 차단 |
| 409 | 견적·약관·요청 내용 변경 | 최신 내용으로 재확인·동의·서명 |
| 413 / 415 | 크기·유형 오류 | 파일 교체 안내 |
| 429 | 반복 요청 제한 | 서버 안내 재시도 시간 |
| 500 / 연결 지연 | 처리 실패 또는 결과 불명 | 같은 Idempotency-Key로 결과 확인/재시도 |

동봉 프런트는 25초 타임아웃, 저장 성공 응답 확인, 중복 클릭 차단, 실패 시 메모리 내 입력 유지, 동일 키 재시도를 구현했다. 오류별 상세 서버 연동은 구현 시 확장한다. 409 발생 후에는 최신 견적을 새로 열고 시작해야 하며, 신규 제출 payload에는 새 idempotency key를 부여한다. 프런트는 제출 내용이 변경된 경우 새 키를 사용한다. 결과가 불명확했던 이전 요청과의 중복은 서버의 고객+견적 활성 신청 유일성 및 결과 조회로 방지한다. 재전송으로 동일 키 내용이 바뀌지 않도록 서버에서 검증한다.

## 관리자 API 제안

| API | 용도 |
|---|---|
| GET /api/admin/rental-applications?status=&q=&cursor= | 권한 범위 목록·검색·페이지 |
| GET /api/admin/rental-applications/:id | 마스킹 기본 상세, 신청 당시 가격·약관·검토 상태 |
| POST /api/admin/rental-applications/:id/document-access | 재인증·열람 사유·권한 검증 후 임시 접근 수단. 감사 기록 |
| PATCH /api/admin/rental-applications/:id/review | expectedVersion + 확인 항목 + 상태 + 사유. 충돌은 409 |
| POST /api/admin/rental-applications/:id/supplement-requests | 보완 항목·수신자·메시지 확인 후 발송 요청 |
| GET /api/admin/rental-applications/:id/audit | 열람·변경 이력 |

관리자 API 전체에 인증·업무 권한·배정/조직 범위 검사. 클라이언트에서 전송한 역할이나 담당자 값을 믿지 않는다.

## 데이터 모델 제안

- applications: id, tenant_id, assigned_to, applicant_id, quote_id/version/snapshot, plan, status, revision, received_at, confirmed_at, contract_reference
- applicant_private: 암호화된 연락처·생년월일 등 필요 항목. 최소 권한으로 별도 접근
- document_versions: application_id, kind, private_object_key, digest, scan_status, created_at, expiry/deletion_at
- consent_snapshots: application_id, item_id, approved_version, text_hash, immutable_text, agreed, server_received_at
- signature_evidence: application_id, document_id, application_snapshot_hash, consent_snapshot_hash, server_received_at
- audit_events: actor, action, target, reason, event_time, previous/new_version (민감 원문 제외)
- idempotency_requests: principal_scope, key, payload_hash, processing_state, receipt_id, response

개발 로그와 오류 모니터링은 multipart 본문을 저장하지 않는다. 관리 화면에 공개 가능한 데이터만 API로 내보내고 파일 객체 키 자체를 목록에 노출하지 않는다.
