# hero-bonggu

https://hero-bonggu.neungae.com — 비 오는 날 고층 아파트에서 치와와 **히로**와 닥스훈트 **봉구**를 함께 돌보는 작은 멀티플레이 집.

- 클라이언트: Vite + Three.js. 강아지는 `public/models/*_game.glb`(뼈대 19개, 동작 9개: Idle/Walk/Run/Sit/Down/Sleep/Eat/Beg/Happy)를 불러오고, 로딩 중이거나 실패하면 코드로 만든 강아지가 대신 나온다.
- 모델 미리보기: `/hero-preview?dog=hero`, `/hero-preview?dog=bonggu`. 모델 검사: `node tests/hero.test.mjs hero` / `bonggu`.
- 서버: Cloudflare Worker + Durable Object(`Room`) 하나가 집 하나. 강아지 AI는 서버에서 돌아가고 모든 접속자가 같은 히로·봉구를 본다.
- 배포: `main` 푸시 → Workers Builds. 빌드 `npm run build`, 배포 `npx wrangler deploy`.

## 조작
| 키 | 동작 |
|---|---|
| WASD / 방향키, Shift | 이동 / 달리기 |
| 마우스 드래그, 휠 | 시점 회전 / 줌 |
| E (또는 강아지 클릭) | 쓰다듬기 · 간식을 들고 있으면 간식 주기 |
| 1 | 간식 꺼내기/넣기 — 근처 강아지가 달려와 기다림 |
| 2 / 3 | 앉아 / 엎드려 (근처 강아지) |
| 4 | 이리 와 — 집 어디에 있든 둘이 달려와서 옆에 앉음 |
| F | 사료 그릇 채우기 (창가 왼쪽) |
| C | 바닥에 앉기 / 일어나기 |
| 소파 클릭 | 걸어가서 소파에 앉기 (움직이면 일어남) |
| Enter | 채팅 |

모바일(터치)에서는 왼쪽 아래 조이스틱으로 이동(끝까지 밀면 달리기), 화면 드래그로 시점, 두 손가락으로 확대, 오른쪽 아래 버튼으로 행동한다. 데스크톱에서 `?touch` 를 붙이면 터치 화면을 볼 수 있다.

## 개발
```
npm install
npm run worker   # 터미널 1: 빌드 후 wrangler dev (http://localhost:8787, DO 포함)
npm run dev      # 터미널 2: vite (http://localhost:5173, /ws 는 8787로 프록시) — 핫리로드용
```
한 번만 볼 거면 `npm run worker` 로 8787만 열어도 된다.

## 구조
```
shared/world.js     방 크기·가구 AABB·그릇/방석 위치·상호작용 거리 (클라+서버 공용)
worker/index.js     /ws → Durable Object, 그 외 → 정적 자산
worker/room.js      Room DO: 접속 관리, 20Hz 시뮬, 10Hz 상태 브로드캐스트, 20초마다 저장
worker/sim.js       강아지 상태기계(idle/wander/sleep/toBowl/eat/approach/beg/sit/down/happy)와 행동
src/main.js         루프, 입력→행동, 보간, 카메라
src/scene/room.js   거실(가구는 shared/world.js 의 OBSTACLES 와 위치를 맞출 것)
src/scene/outside.js 창밖 도시·비·번개
src/scene/dogs.js   히로/봉구 절차 생성 메시(대체용)와 포즈 애니메이션
src/scene/hero-model.js GLB 로딩, 서버 상태 → 애니메이션 클립 선택·전환
src/scene/avatar.js 사람 아바타, 이름표, 말풍선
```
