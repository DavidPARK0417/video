# 프로젝트: Shorts Genius (AI 유튜브 쇼츠 아이디어 생성기)

## 0단계: 준비 작업 (Preparation)

- [ ] **API 키 발급 확인**:
  - [ ] Google Cloud Console: YouTube Data API v3 키 발급
  - [ ] Google AI Studio: Gemini API 키 발급
- [x] **Git 초기화**: `git init` 실행 및 `.gitignore` 설정
- [x] **패키지 매니저 결정**: pnpm 사용 중
- [x] **Mock 데이터 생성**: API 연동 전 UI 개발을 위한 `/data/mock_data.json` 생성

## 1단계: 환경 구축 (Environment Setup)

- [x] Next.js 15.5.7 프로젝트 초기화 (TypeScript 포함)
- [x] Tailwind CSS 및 shadcn/ui 설치 및 설정
- [x] 기본 레이아웃 구성 (헤더, 사이드바, 메인 콘텐츠 영역)
- [x] 기본 페이지 라우팅 생성 (대시보드, 아이디어 생성기, 검색 및 분석, 결과 페이지)
- [x] API 키 관리를 위한 환경 변수(.env) 설정 (README.md에 안내 포함)

## 2단계: 데이터 연동 (Data Integration)

- [x] YouTube Data API v3 연동 설정
- [x] 키워드 기반 동영상 검색 기능 구현
- [x] "바이럴 점수(Viral Score)" 계산 로직 구현 (조회수 / 구독자 수 비율)
- [x] 필터링 로직 구현 (구독자 수 100~1000명, 바이럴 점수 기준 등)
- [x] `youtube-transcript` 라이브러리 설치 및 자막 추출 기능 설정

## 3단계: AI 분석 (AI Analysis)

- [x] Gemini 2.5 Flash API 연동 설정 (gemini-1.5-flash 사용)
- [x] "트렌드 스카우트"용 프롬프트 설계 (트렌드 분석)
- [x] "바이럴 벤치마킹"용 프롬프트 설계 (영상 분석, 후킹 포인트 추출)
- [x] "트렌드 스카우트" 기능 구현 (바이럴 영상 검색 및 아이디어 제안)
- [x] "바이럴 벤치마킹" 기능 구현 (상세 분석 리포트 생성)

## 4단계: 캐싱 및 완성 (Caching & Final Polish)

- [x] API 응답 로컬 저장을 위한 JSON 스토리지 구현 (`/data/cache.json`)
- [x] API 호출 절약을 위한 JSON 캐시 읽기/쓰기 로직 구현 (7일 캐시 유효기간)
- [x] UI/UX 다듬기 (대시보드, 결과 카드, 로딩 상태 등)
- [x] 최종 테스트 및 버그 수정 (analysis 페이지 버그 수정 완료)
- [x] 문서화 (README.md 업데이트 완료)
