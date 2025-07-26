# DSP Sliding Simulation

DSP (Double Side Polishing) 슬라이딩 시뮬레이터는 
웨이퍼 연마 과정에서의 기어 시스템 동역학을 시뮬레이션하는 React 기반 웹 애플리케이션입니다.

## 🚀 주요 기능

### 1. 실시간 기어 시뮬레이션
- **Sun Gear, Ring Gear, Carrier Gear** 시스템 모델링
- **Upper/Lower Plate** 회전 시뮬레이션
- **다중 Carrier 및 Wafer** 지원 (1-5개 Carrier, 1-3개 Wafer)

### 2. 궤적 분석
- **실시간 2D 궤적** 시각화
- **다중 점 추적** 및 비교 분석
- **속도 프로파일** 분석
- **X-Crossings 분포** 분석

### 3. 3D 누적 거리 분석
- **웨이퍼 내 위치별 누적 이동 거리** 계산
- **실시간 컬러맵** 시각화
- **통계 정보** (최소/최대/평균 거리)

### 4. 애니메이션 제어
- **재생/정지/리셋** 기능
- **속도 조절** (0.1x - 5x)
- **시간 슬라이더** 제어
- **궤적 표시** 옵션

## 🛠️ 설치 및 실행

### 필수 요구사항
- Node.js 14.0 이상
- npm 또는 yarn

### 설치
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

### 빌드
```bash
# 프로덕션 빌드
npm run build
```

## 📊 사용법

### 1. 시뮬레이션 제어
- **RPM 설정**: Sun, Ring, Upper, Lower 기어의 회전 속도 조정
- **시스템 구성**: 시간, 포인트 수, Carrier/Wafer 개수 설정
- **애니메이션 제어**: 재생/정지, 속도 조절, 시간 제어

### 2. 추적점 설정
- **점 추가/제거**: 웨이퍼 내 추적할 점들을 설정
- **위치 지정**: 반지름(r)과 각도(θ)로 정확한 위치 설정
- **Carrier/Wafer 선택**: 다중 시스템에서 특정 구성요소 선택

### 3. 분석 탭
- **실시간 궤적**: 현재 선택된 카테고리의 실시간 궤적 표시
- **3D 누적거리**: 웨이퍼 내 위치별 누적 이동 거리 시각화
- **다중 점 궤적 비교**: 여러 점의 궤적을 동시에 비교
- **X-Crossings Distribution**: X축 교차 분포 분석
- **Position vs Time**: 시간에 따른 위치 변화
- **Velocity Profile**: 속도 프로파일 분석
- **다중 점 속도 비교**: 여러 점의 속도 비교

### 4. 카테고리 선택
- **Basic**: 기본 궤적 (Carrier 기준)
- **Upper**: Upper Plate 기준 변환
- **Lower**: Lower Plate 기준 변환
- **Combined**: Upper/Lower 평균

## 🔧 기술 스택

- **React 18.2.0**: 사용자 인터페이스
- **Recharts 2.8.0**: 데이터 시각화
- **Tailwind CSS 3.3.0**: 스타일링
- **JavaScript ES6+**: 시뮬레이션 로직

## 📁 프로젝트 구조

```
dsp_sliding_simulation/
├── public/
│   └── index.html          # 메인 HTML 파일
├── src/
│   ├── components/
│   │   └── DSP_sliding_simulator.jsx  # 메인 시뮬레이터 컴포넌트
│   ├── App.jsx             # 앱 진입점
│   ├── index.js            # React 렌더링
│   └── index.css           # 글로벌 스타일
├── package.json            # 프로젝트 설정 및 의존성
└── tailwind.config.js      # Tailwind CSS 설정
```

## 🎯 시뮬레이션 파라미터

### 기본 설정값
- **Sun Gear RPM**: 17.1
- **Ring Gear RPM**: -3.9
- **Upper Plate RPM**: -12.5
- **Lower Plate RPM**: 23.6
- **Sun Gear Teeth**: 96
- **Ring Gear Teeth**: 338
- **Carrier Gear Teeth**: 121
- **Wafer Radius**: 150mm
- **Total Time**: 200초

### 기어 반지름
- **Sun Gear**: 267mm
- **Ring Gear**: 987.5mm
- **Carrier Gear**: 372mm
- **Plate Inner/Outer**: 295mm / 935mm

## 🔍 분석 기능

### 1. 궤적 분석
- 실시간 점 위치 추적
- 다중 점 동시 추적
- 궤적 시각화 및 비교

### 2. 속도 분석
- 순간 속도 계산
- 속도 크기 및 방향 분석
- 다중 점 속도 비교

### 3. 거리 분석
- 누적 이동 거리 계산
- 3D 컬러맵 시각화
- 통계 정보 제공

### 4. 분포 분석
- X축 교차 분포
- 위치별 밀도 분석
- 카테고리별 비교

## 🎨 UI/UX 특징

- **반응형 디자인**: 다양한 화면 크기 지원
- **직관적 인터페이스**: 사용하기 쉬운 컨트롤
- **실시간 피드백**: 즉시 결과 확인 가능
- **다양한 시각화**: 차트, 그래프, 컬러맵 등
- **애니메이션**: 부드러운 시뮬레이션 애니메이션

## 🚀 접속 방법

개발 서버 실행 후 브라우저에서 다음 주소로 접속:
```
http://localhost:3000
```

## 📝 라이선스

이 프로젝트는 교육 및 연구 목적으로 개발되었습니다.
