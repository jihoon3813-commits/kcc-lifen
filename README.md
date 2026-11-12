# KCC홈씨씨 CRM 3.0 실운영 개발 시스템

운영사: **(주)라이프앤조이**  
개발 기준 문서: `hoon/kcc-homecc-crm-v3-antigravity/ANTIGRAVITY_START_HERE.md`  
완료일: 2026-11-12

---

## 1. 개요 및 변경 내용

기존의 `localStorage` 기반 프론트엔드 목업 체험판에서 **실제 운영 가능한 Node.js/Express + SQLite(WAL 모드) 풀스택 운영 시스템**으로 전면 개발 및 전환 완료하였습니다.

- **UI/UX 원칙 유지**: 네이비 사이드바, 7개 핵심 메뉴, 우측 전체 높이 패널(Drawer) 디자인 시스템 100% 보존.
- **서버 DB 및 데이터 분리**: 고객(`customers`)과 공사건(`projects`)을 분리하여 1명의 고객이 여러 건의 공사를 진행할 수 있도록 다대일 관계 모델링.
- **엄격한 서버 권한 및 파트너사 데이터 격리**: 본사 관리자, 상담사, 견적 담당자, 파트너사, 회계 담당자 5대 역할 정의 및 파트너사의 타사 데이터 접근 원천 차단(403 Forbidden).
- **KCC글라스 공식 양식 파싱 및 계산 공식 검증**: KCC글라스 다단 상세 창호 견적 엑셀(`2. 창호 상세 견적사항` 3행 구조 및 기타견적) 및 일반 XLS/XLSX/CSV 자동 인식 파싱, `원가 ÷ (1 - 마진율) + 10% VAT` 계산식 적용.
- **고객용 KCC 홈씨씨 모바일 견적서 & 60개월 렌탈 신청 (`kcc-mobile-estimate2-antigravity` 반영)**:
  - 고객 본인 **이름 + 휴대폰 번호** 로그인 시 `HttpOnly` 세션 쿠키(`kcc_viewer_session`) + CSRF 토큰 발급 (`/quote.html` 단독 접속 및 `?token=...` 접속 지원).
  - 60개월 렌탈 카드(`초기 부담을 줄이는 렌탈` / `월 부담을 줄이는 렌탈`) 선택 시 **듀얼 CTA(`상담하기` + `렌탈 신청하기 →`)** 자동 전환 및 3단계 모바일/PC 신청 모달(`1. 정보 확인 → 2. 신분증 등록 → 3. 동의·서명`) 제공.
  - 신분증 매직바이트 검증·EXIF GPS 메타데이터 제거, 빈 캔버스 서명 차단, **AES-256-GCM 비공개 볼트(`data/private_vault`)** 암호화 격리 저장(`public/` 및 `/uploads` 미노출), 멱등성(`Idempotency-Key`) 및 중복 접수 차단.
  - 공급원가(`cost`)·마진율(`margin_rate`)·내부 검토 근거 고객 노출 원천 차단.
- **렌탈 운영 전용 콘솔(`/admin.html`) 및 통합 CRM 계약관리 연동**:
  - RBAC/파트너 격리 기반 접수 목록·KPI·검색·커서 조회(`/api/admin/rental-applications`), 기본 마스킹 표시.
  - 인가된 본사 심사·관리자(`hq_admin`, `accountant`)의 **비밀번호 재인증 + 열람 사유 기록** 후 3분 유효 `no-store` 워터마크 문서 스트림(확대/축소/90° 회전/전환, 다운로드 비제공) 및 성공·실패 전수 감사 로깅.
  - 상태 전이 검증(`received` → `review` → `needs_info`/`screening` → `confirmed`/`rejected`/`cancelled`), 낙관적 잠금(`expectedVersion`), **승인·계약번호(`contractReference`) + 메모 필수 계약 확정**, 내부 근거/고객 안내 분리형 **72시간 1회용 서류 보완 링크(`?supplement=...`)** 발급·재제출 지원.
- **문자(LMS) / 카카오 알림톡 발송 및 실시간 미리보기**:
  - CRM 내 **모바일/PC 견적서 본문 & 고객 로그인창 실시간 미리보기** 드로어(발행 전 작성 중 초안 미리보기 포함) 및 `/mobile.html` 390px 프레임 뷰어 지원.
  - 고객에게 문자(LMS)·카카오 알림톡 발송 드로어(채널별 실시간 말풍선/문자 화면 미리보기, 템플릿 편집, 발송 이력 로깅, 클립보드 복사·`sms:` 앱 호출, 외부 웹훅/API 연동 설정 지원).
- **계약 및 결제(선금/잔금/카드) 원장**: 특정 견적 버전을 바인딩하는 계약서 발급, 선금/잔금 분할 수납 원장, PG 카드 승인 연동 인터페이스.
- **렌탈 심사 및 상태 관리**: 36/48/60개월 분납 렌탈료 산출 및 접수→서류검토→심사중→약정완료 라이프사이클 관리.
- **Asia/Seoul 실시간 통계 및 감사 로그**: 실제 DB 이벤트 기반의 채널별, 일자별 통계 집계 및 전 변경사항에 대한 `audit_logs` 기록.

---

## 2. 실행 방법

### 요구사항
- Node.js 18 이상 (현재 환경: Node.js v24.14.0)

### 서버 실행
```bash
npm run dev
# 또는
node server/index.js
# Windows 배치 파일: start-preview.bat
```

- **관리자 통합 CRM URL**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **렌탈 신청 운영 콘솔 URL**: [http://127.0.0.1:5173/admin.html](http://127.0.0.1:5173/admin.html)
- **고객 모바일 견적 조회 URL (토큰 링크 예시)**: [http://127.0.0.1:5173/quote.html?token=tok_3107_demo](http://127.0.0.1:5173/quote.html?token=tok_3107_demo) (테스트 로그인: 이름 `윤도현` / 휴대폰 `010-0000-1007`)
- **고객 모바일 견적 단독 로그인 URL**: [http://127.0.0.1:5173/quote.html](http://127.0.0.1:5173/quote.html) / **390px 모바일 프레임 뷰어**: [http://127.0.0.1:5173/mobile.html?token=tok_3107_demo](http://127.0.0.1:5173/mobile.html?token=tok_3107_demo)

### 테스트 스위트 실행
```bash
node scripts/testServer.mjs
```

---

## 3. 계정 및 권한 안내

| 구분 | 계정 아이디 | 비밀번호 | 성명 / 역할 | 특징 |
| :--- | :--- | :--- | :--- | :--- |
| **본사 관리자** | `admin` | `admin123!` | 김지훈 (최고관리자) | 전체 고객, 견적, 파트너, 시스템 설정 전체 권한 |
| **상담사** | `youngjin` | `user123!` | 오영진 (상담사) | 고객 등록, 배정, 상담 및 피드백 기록 |
| **견적 담당자** | `jeongyeon` | `user123!` | 김정연 (견적담당자) | KCC 원본 엑셀 업로드, 마진 산출, 견적 발행 |
| **파트너사** | `partner_hanbit` | `partner123!` | 이현우 (한빛인테리어) | **자사 소속 고객/공사건/계약만 접근 가능 (서버 격리)** |
| **회계 담당자** | `jihee` | `user123!` | 마지희 (회계) | 계약 대장, 선금/잔금 수납, 렌탈 정산 관리 |

*관리자 상단의 역할 선택기(드롭다운)를 통해서도 즉시 해당 사용자의 서버 JWT 토큰으로 전환하여 테스트할 수 있습니다.*

---

## 4. 배포 환경 변수 목록 (.env)

> 실제 운영 배포 시 비밀키는 코드 저장소에 커밋하지 않고 배포 환경 변수로 주입합니다.

```env
PORT=5173
HOST=0.0.0.0
NODE_ENV=production
JWT_SECRET=<운영용_랜덤_시크릿>
VAULT_ENCRYPTION_KEY=<비공개_서류_AES256_암호화_시크릿>
DB_PATH=./data/homecc_crm.db
PRIVATE_VAULT_DIR=./data/private_vault
RENTAL_DOC_RETENTION_DAYS=90
RENTAL_CANCELLED_RETENTION_DAYS=5
MIN_APPLICANT_AGE=19
```

---

## 5. 데이터 백업 및 초기화 방법

- **DB 파일 위치**: `data/homecc_crm.db` (단일 SQLite 파일로 백업/복구 용이)
- **초기화 및 시드 재구축**:
  - 관리자 화면 설정 > [데이터 초기화]에서 "초기화" 입력 후 실행
  - 또는 명령행에서: `node server/db/seed.js`
