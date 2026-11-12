# 서버 개발 설계 제안
아래 DB/API는 다음 개발을 위한 제안이며 현재 구현된 서버가 아닙니다.

## 엔터티
- organizations/partners, users/roles/memberships: 조직·계정·권한
- customers: 고객 기본정보
- projects: 고객별 공사건, 상품·주소·담당·상태·유입
- consultations/feedback, schedules: 상담·피드백·실측/시공
- estimate_sources/source_files: KCC 원본 URL·파일·파싱 결과
- quotes/quote_versions/quote_items: 원가·마진·VAT·판매가·발행본
- quote_access_tokens/quote_views: 조회권한·열람
- contracts: 공사건·정확한 견적 버전·금액·범위
- payment_orders/payment_transactions/refunds: 결제 요청·승인·취소·정산
- rental_applications/rental_status_history: 접수·보완·심사·약정·정산
- documents/consent_versions/consent_records: 서류·접근권한·동의 버전/시각
- landing_pages/attribution/events: 상품·파트너·UTM·전환 이벤트
- audit_logs: 사용자·시각·변경 전후값

고객 1명이 여러 공사건을, 공사건 1개가 여러 견적 버전을 가질 수 있어야 합니다.
파트너 범위는 업무 엔터티마다 서버에서 검증합니다.

## API 예시
| 목적 | 경로 예시 |
| --- | --- |
| 고객/공사건 | GET/POST /api/customers, POST /api/projects |
| 상세/배정 | GET/PATCH /api/projects/:id, POST /api/projects/:id/assign |
| 상담/일정 | /api/projects/:id/consultations, /schedules |
| 원본/파싱 | POST /api/projects/:id/estimate-sources, POST /api/estimate-sources/:id/parse |
| 견적/발행 | POST /api/quotes, POST /api/quotes/:id/publish |
| 고객 검증/조회 | POST /api/quote-access/verify, GET /api/customer/quotes/:token |
| 계약/현금 | /api/contracts, POST /api/contracts/:id/cash-receipts |
| 카드 | POST /api/payments/orders, /confirm, /api/webhooks/payments |
| 취소 | POST /api/payments/:id/refunds |
| 렌탈 | /api/rental-applications, PATCH /api/rental-applications/:id/status |
| 통계/설정 | /api/analytics/overview, /events, /api/settings/... |

## 구현 원칙
1. 고객·견적·파일·통계의 소속 및 권한을 모든 요청에서 검사.
2. 견적·계약 금액은 서버 계산 및 버전 스냅샷으로 고정. 변경은 새 버전.
3. 카드 수납은 PG 서버 검증 결과로 처리. 중복 요청/웹훅은 멱등 처리.
4. 선금/잔금은 별도 원장에 기록. 승인−취소 기준으로 실제 수납/미수 계산.
5. 렌탈 접수와 약정완료, 정산완료를 구분.
6. 신분확인 서류는 공개 URL 대신 권한과 짧은 유효기간을 가진 접근 경로 사용.
7. 고객용 응답에서 원가·마진·내부 메모를 제외.
8. 통계의 날짜 경계를 Asia/Seoul로 통일하고 중복 이벤트 제거.

## 이전과 외부 연동
운영 DB 백업 후 기존 고객번호·상태코드·작성자·날짜·상담이력·견적/내관도 링크를 매핑합니다.
검증 환경에서 건수·중복·파트너 소속·이력을 대조하고 전환/되돌리기를 준비합니다.
PG·렌탈사·문자 업체 및 조건은 미확정입니다. 한도·수수료·월액을 임의 확정하지 않습니다.
실제 엑셀 양식과 운영 동의서가 필요합니다. 비밀키는 서버 환경에서 주입합니다.

