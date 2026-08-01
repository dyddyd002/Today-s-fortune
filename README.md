# 오늘의 운세

카드를 누르면 뒤집히면서 랜덤 운세, 행운의 아이템, 행운의 색깔이 나오는 Next.js 앱입니다.
KAIST CT×AI 콘텐츠마이크로디그리 10회차(바이브코딩개론 & Git 형상관리) 실습으로 제작했습니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 됩니다.

## 구조

- `app/page.tsx` — 메인 페이지
- `app/FortuneCard.tsx` — 카드 뒤집기 UI (클라이언트 컴포넌트)
- `app/fortunes.ts` — 운세 / 행운의 아이템 / 행운의 색 데이터
- `app/globals.css` — 스타일 및 뒤집기 애니메이션
