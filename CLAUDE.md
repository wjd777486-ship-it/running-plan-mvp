@AGENTS.md

# 프로젝트 개요

러닝 대회를 위한 맞춤 훈련 플랜 생성 앱. 온보딩(3단계 폼) → AI 플랜 생성 → 캘린더 뷰로 구성.

# 레이아웃 규칙

- **콘텐츠 영역 너비**: 320px 고정 (`w-[320px] mx-auto`)
- 온보딩 페이지(`app/onboarding/page.tsx`): `max-w-[320px] mx-auto`
- 플랜 페이지(`components/plan/PlanShell.tsx`): `w-[320px] mx-auto`, main에 수평 패딩 없음

# 온보딩 페이지 (app/onboarding/page.tsx)

## Step 1 UI 규칙
- 타이틀: "달성하고 싶은\n목표를 알려주세요"
- 좌우 padding: `px-6`
- 필수 항목 빨간 `*` 표시 없음 (FieldLabel에 `required` prop 사용 안 함)
- 대회 일시: 네이티브 date input 아이콘만 사용 (커스텀 Calendar 아이콘 제거), border-radius: 18px
- 참가 코스 버튼: pill형(`rounded-full`), `flex-1`, 한 줄 4개
  - 레이블: "5km" / "10km" / "하프" / "풀"
  - 미선택 border: `rgba(60,60,67,0.6)`
- 목표 기록 / PB: 모두 `flex items-center gap-[6px]` flat 구조 (시간 / 분 / 초 동일 간격)
- PB (최고 기록): 레이블 = 코스명(#0088FF) + "최고 기록"(black) + "(선택)"(#727272)
  - 입력: 시간/분/초, gap-[6px] flat
- PB 입력 하단 "기록 없음" 버튼 없음

## 다음 버튼
- 너비: `w-[320px]` 고정
- 버튼 컨테이너: `py-5`만 사용 (수평 패딩 없음)

# 플랜 페이지 (components/plan/)

## PlanHeader 계산 규칙
- 총 주: `Math.floor(dday / 7)`, 7일 미만이면 0
- 총 세션: `workoutType !== "rest"`인 것만 카운트
- 총 거리: `dateStr >= todayStr && dateStr <= raceDateStr`인 날만 합산

## CalendarGrid
- 대회일(`raceDateStr`) 이후 날짜는 훈련 데이터가 있어도 빈 셀로 처리
