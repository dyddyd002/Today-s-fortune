export default function Home() {
  const fortune = "오늘은 뜻밖의 좋은 소식이 찾아올 거예요.";
  const item = "우산";

  return (
    <main>
      <h1>오늘의 운세</h1>
      <div className="card">
        <p>{fortune}</p>
        <p>행운의 아이템: {item}</p>
      </div>
    </main>
  );
}
