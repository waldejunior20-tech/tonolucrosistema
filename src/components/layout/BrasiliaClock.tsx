import { useState, useEffect } from "react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getBrasiliaTime() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return now;
}

export function BrasiliaClock() {
  const [time, setTime] = useState(getBrasiliaTime);

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = String(time.getHours()).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const seconds = String(time.getSeconds()).padStart(2, "0");
  const day = time.getDate();
  const month = MONTHS[time.getMonth()];
  const year = time.getFullYear();

  return (
    <div className="flex items-center gap-3 text-foreground select-none">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-xs text-muted-foreground font-medium">
          {hours}:{minutes}:{seconds}
        </span>
        <span className="text-xs text-muted-foreground">
          {month} / {year}
        </span>
      </div>
      <span className="text-2xl font-bold tabular-nums leading-none">
        {day}
      </span>
    </div>
  );
}
