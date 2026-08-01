"use client";

import { useState } from "react";
import { fortunes, luckyItems, pickRandom } from "./fortunes";

export default function FortuneCard() {
  const [flipped, setFlipped] = useState(false);
  const [fortune, setFortune] = useState("...");
  const [item, setItem] = useState("...");

  function draw() {
    setFortune(pickRandom(fortunes));
    setItem(pickRandom(luckyItems));
    setFlipped(true);
  }

  return (
    <>
      <div className="scene" onClick={draw}>
        <div className={`card${flipped ? " flipped" : ""}`}>
          <div className="face front">카드를 눌러보세요</div>
          <div className="face back">
            <p>{fortune}</p>
            <p>행운의 아이템: {item}</p>
          </div>
        </div>
      </div>
      <button onClick={draw}>운세 뽑기</button>
    </>
  );
}
