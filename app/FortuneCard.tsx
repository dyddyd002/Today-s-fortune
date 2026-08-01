"use client";

import { useEffect, useState } from "react";
import { fortunes, luckyItems, luckyColors, pickRandom } from "./fortunes";

type HistoryEntry = {
  time: string;
  fortune: string;
};

const STORAGE_KEY = "fortuneHistory";

export default function FortuneCard() {
  const [flipped, setFlipped] = useState(false);
  const [fortune, setFortune] = useState("...");
  const [item, setItem] = useState("...");
  const [color, setColor] = useState("...");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // 페이지가 열릴 때, 이 브라우저에 저장돼 있던 기록을 불러온다
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // 저장된 기록이 없거나 읽을 수 없으면 무시
    }
  }, []);

  function draw() {
    const newFortune = pickRandom(fortunes);
    const newItem = pickRandom(luckyItems);
    const newColor = pickRandom(luckyColors);

    setFortune(newFortune);
    setItem(newItem);
    setColor(newColor);
    setFlipped(true);

    const entry: HistoryEntry = {
      time: new Date().toLocaleString("ko-KR"),
      fortune: newFortune,
    };
    // 함수형 업데이트: 클릭이 연달아 일어나도 항상 최신 history를 기준으로 쌓는다
    setHistory((prev) => {
      const updated = [entry, ...prev]; // 최신순: 새 기록을 맨 앞에
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <>
      <div className="scene" onClick={draw}>
        <div className={`card${flipped ? " flipped" : ""}`}>
          <div className="face front">카드를 눌러보세요</div>
          <div className="face back">
            <p>{fortune}</p>
            <p>행운의 아이템: {item}</p>
            <p>행운의 색: {color}</p>
          </div>
        </div>
      </div>
      <button onClick={draw}>운세 뽑기</button>

      {history.length > 0 && (
        <div className="history">
          <h2>내 운세 기록</h2>
          <table>
            <thead>
              <tr>
                <th>뽑은 시각</th>
                <th>뽑은 운세</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.time}</td>
                  <td>{entry.fortune}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
