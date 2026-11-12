# KCC홈씨씨 CRM 3.0 · 안티그래비티 개발 패키지

운영사: (주)라이프앤조이  
작성일: 2026-11-12 (한국시간)  
반영 버전: 우측 전체 높이 패널을 적용한 최신 화면 시안

## 시작하기
1. 압축을 풀고 이 폴더 전체를 안티그래비티에서 엽니다.
2. `ANTIGRAVITY_START_HERE.md`를 읽도록 지시합니다.
3. 현재 화면을 먼저 실행하고, 구현 현황을 확인한 뒤 실제 서비스 연결을 진행합니다.

## 실행
Node.js 18 이상 환경에서:
```bash
npm run dev
```
별도 패키지 설치와 빌드 없이 http://127.0.0.1:5173 에서 실행됩니다.
Windows에서는 `start-preview.bat`를 실행할 수도 있습니다.
종료는 터미널에서 Ctrl+C입니다. 포트가 사용 중이면 PORT 환경변수로 변경합니다.

Python이 준비된 경우의 대안:
```bash
python -m http.server 5173 --bind 127.0.0.1 --directory app
```

파일 더블클릭 대신 HTTP 서버에서 실행하세요. 링크 복사와 브라우저 저장은 HTTP 주소를 기준으로 동작합니다. Google Fonts가 연결되지 않으면 시스템 글꼴로 표시됩니다.

## 파일 구성
| 파일 | 내용 |
| --- | --- |
| app/index.html | 진입 페이지 |
| app/style.css | 전체 디자인·반응형·우측 패널 스타일 |
| app/app.js | 7개 메뉴·예시 데이터·화면 동작 |
| ANTIGRAVITY_START_HERE.md | 개발 작업 지시서 |
| docs/REQUIREMENTS.md | 요구사항과 업무 흐름 |
| docs/DESIGN_GUIDE.md | 유지할 디자인과 최신 변경사항 |
| docs/IMPLEMENTATION_STATUS.md | 구현된 체험 기능과 미연결 기능 |
| docs/BACKEND_HANDOFF.md | 데이터 구조·API·권한 설계 제안 |
| docs/ACCEPTANCE_CHECKLIST.md | 확인 항목 |
| samples/estimate-items.csv | 실제로 가져올 수 있는 품목 예시 |
| scripts/preview.mjs | 로컬 미리보기 서버 |
| SOURCE_MANIFEST.json | 기준 버전과 소스 파일 체크섬 |

## 현재 상태
이 패키지는 예시 데이터로 작동하는 인터랙티브 프런트엔드입니다. 실제 DB·PG·렌탈사·고객 인증은 연결되어 있지 않습니다. 체험 변경사항은 현재 브라우저의 localStorage `homecc_crm_v3_demo`에 저장됩니다.

현재 CRM에 포함된 모바일 견적 미리보기와 렌탈 체험 흐름은 포함합니다. 이전에 별도로 제작한 모바일 견적서 ZIP과 랜딩페이지 ZIP은 병합하지 않았습니다.

실제 고객 데이터·운영 계정 비밀번호·API 키는 포함하지 않습니다.
검토용 사이트: https://kcc-homecc-crm-v3.hoony365.chatgpt.site

