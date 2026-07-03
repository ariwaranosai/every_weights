import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { people } from "./lib/data";
import { buildChartRows, getMetricValue, round, summarizePerson } from "./lib/stats";
import type { ChartMetric } from "./lib/stats";
import type { PeriodChange, PersonProfile, PersonSummary } from "./types";

const palette = ["#2563eb", "#e11d48", "#059669", "#d97706", "#7c3aed", "#0891b2", "#be123c"];

function signed(value: number, suffix = "") {
  const formatted = `${Math.abs(round(value, suffix === "%" ? 2 : 1)).toFixed(suffix === "%" ? 2 : 1)}${suffix}`;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return `0${suffix}`;
}

function formatPeriod(change: PeriodChange | null) {
  if (!change) return "暂无数据";
  return `${signed(change.kg, "kg")} / ${signed(change.pct, "%")}`;
}

function percentagePointGap(value: number, best: number) {
  return `${round(value - best, 2).toFixed(2)} pp`;
}

function formatAxisTick(value: number, metric: ChartMetric) {
  if (metric === "changePct") {
    return round(value, 1).toString();
  }
  return round(value, 1).toString();
}

function gapRatio(value: number, best: number, worst: number) {
  if (worst === best) return 100;
  return Math.max(8, Math.min(100, ((worst - value) / (worst - best)) * 100));
}

function resolveAvatarUrl(avatarUrl?: string) {
  if (!avatarUrl) return undefined;
  if (/^(https?:)?\/\//.test(avatarUrl) || avatarUrl.startsWith("data:")) {
    return avatarUrl;
  }
  return `${import.meta.env.BASE_URL}${avatarUrl.replace(/^\/+/, "")}`;
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function AvatarMarker({
  cx,
  cy,
  person,
  isLeader,
}: {
  cx?: number;
  cy?: number;
  person: PersonProfile;
  isLeader: boolean;
}) {
  if (typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  const avatarUrl = resolveAvatarUrl(person.avatarUrl);
  const size = 28;
  const x = cx - size / 2;
  const y = cy - size / 2;

  return (
    <g className="avatar-marker">
      <circle cx={cx} cy={cy} r={16} fill="#fffdf8" stroke="#2b2117" strokeWidth={1.5} />
      {avatarUrl ? (
        <foreignObject x={x} y={y} width={size} height={size}>
          <div className="chart-avatar">
            <img src={avatarUrl} alt="" />
          </div>
        </foreignObject>
      ) : (
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#2b2117">
          {initials(person.displayName)}
        </text>
      )}
      {isLeader ? (
        <g className="crown-marker" transform={`translate(${cx - 12} ${cy - 31})`}>
          <path d="M2 13 4.5 5.5 9 10.5 12 2.5 15 10.5 19.5 5.5 22 13Z" fill="#f59e0b" stroke="#7c2d12" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M4 16h16" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="2.5" r="2" fill="#fde68a" stroke="#7c2d12" strokeWidth="1" />
        </g>
      ) : null}
    </g>
  );
}

function Avatar({ person }: { person: PersonProfile }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = failed ? undefined : resolveAvatarUrl(person.avatarUrl);

  return (
    <div className="avatar">
      {avatarUrl ? <img src={avatarUrl} alt={`${person.displayName} 头像`} onError={() => setFailed(true)} /> : initials(person.displayName)}
    </div>
  );
}

function ChartCard({
  title,
  unit,
  metric,
  peopleToShow,
  rows,
}: {
  title: string;
  unit: string;
  metric: ChartMetric;
  peopleToShow: PersonProfile[];
  rows: Record<string, number | string | null>[];
}) {
  const leaderId = [...peopleToShow].sort((a, b) => {
    const aLatest = a.records[a.records.length - 1].weightKg;
    const bLatest = b.records[b.records.length - 1].weightKg;
    const aChange = ((aLatest - a.records[0].weightKg) / a.records[0].weightKg) * 100;
    const bChange = ((bLatest - b.records[0].weightKg) / b.records[0].weightKg) * 100;
    return aChange - bChange;
  })[0]?.id;
  const numericValues = rows.flatMap((row) =>
    peopleToShow.flatMap((person) => {
      const value = row[person.id];
      return typeof value === "number" ? [value] : [];
    }),
  );
  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);
  const valueRange = maxValue - minValue || Math.max(Math.abs(maxValue), 1);
  const yPadding = valueRange * 0.18;
  const yDomain: [number, number] = [minValue - yPadding, maxValue + yPadding];

  return (
    <section className="panel chart-panel">
      <div className="panel-title">
        <h2>{title}</h2>
        <span>{unit}</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 30, right: 30, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7ded0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={8} minTickGap={20} padding={{ left: 8, right: 38 }} />
            <YAxis tick={{ fontSize: 11 }} width={48} domain={yDomain} tickFormatter={(value) => formatAxisTick(Number(value), metric)} />
            <Tooltip
              formatter={(value, name) => {
                const person = peopleToShow.find((item) => item.id === name);
                return [`${value}${unit}`, person?.displayName ?? name];
              }}
              labelFormatter={(label) => `日期 ${label}`}
            />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, lineHeight: "20px" }} />
            {peopleToShow.map((person, index) => (
              <Line
                key={person.id}
                type="monotone"
                dataKey={person.id}
                name={person.displayName}
                stroke={palette[index % palette.length]}
                strokeWidth={2.4}
                dot={{ r: 2.4 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
            {peopleToShow.map((person) => {
              const latest = person.records[person.records.length - 1];
              return (
                <ReferenceDot
                  key={`${person.id}-latest`}
                  x={latest.date}
                  y={getMetricValue(person, latest, metric)}
                  ifOverflow="extendDomain"
                  shape={(props) => <AvatarMarker cx={props.cx} cy={props.cy} person={person} isLeader={person.id === leaderId} />}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function SummaryCard({ summary }: { summary: PersonSummary }) {
  return (
    <article className="summary-card">
      <div className="summary-heading">
        <Avatar person={summary.person} />
        <div>
          <h3>{summary.person.displayName}</h3>
          <p>{summary.person.heightCm} cm</p>
        </div>
      </div>
      <div className="metric-grid">
        <div>
          <span>当前体重</span>
          <strong>{summary.latest.weightKg.toFixed(1)} kg</strong>
        </div>
        <div>
          <span>BMI</span>
          <strong>{round(summary.bmi, 1).toFixed(1)}</strong>
          <em>{summary.bmiStatus}</em>
        </div>
        <div>
          <span>近 1 个月</span>
          <strong>{formatPeriod(summary.oneMonthChange)}</strong>
        </div>
        <div>
          <span>近 3 个月</span>
          <strong>{formatPeriod(summary.threeMonthChange)}</strong>
        </div>
        <div>
          <span>从开始</span>
          <strong>
            {signed(summary.changeFromStartKg, "kg")} / {signed(summary.changeFromStartPct, "%")}
          </strong>
        </div>
        <div>
          <span>最新记录</span>
          <strong>{summary.latest.date}</strong>
        </div>
      </div>
    </article>
  );
}

function App() {
  const [selectedId, setSelectedId] = useState("all");
  const [activeTab, setActiveTab] = useState<"charts" | "details">("charts");
  const summaries = useMemo(() => people.map(summarizePerson), []);
  const peopleToShow = selectedId === "all" ? people : people.filter((person) => person.id === selectedId);
  const summariesToShow = selectedId === "all" ? summaries : summaries.filter((summary) => summary.person.id === selectedId);

  const chartData = useMemo(
    () => ({
      weight: buildChartRows(people, peopleToShow, "weight"),
      changePct: buildChartRows(people, peopleToShow, "changePct"),
      bmi: buildChartRows(people, peopleToShow, "bmi"),
    }),
    [peopleToShow],
  );

  const biggestDecrease = [...summaries].sort((a, b) => a.changeFromStartPct - b.changeFromStartPct)[0];
  const decreaseLeaderboard = [...summaries].sort((a, b) => a.changeFromStartPct - b.changeFromStartPct);
  const worstDecrease = decreaseLeaderboard[decreaseLeaderboard.length - 1];

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p>Every Weights</p>
          <h1>三日体重记录</h1>
        </div>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} aria-label="选择成员">
          <option value="all">全部成员</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
      </header>

      <section className="top-stats">
        <div>
          <span>成员</span>
          <strong>{people.length}</strong>
        </div>
        <div className="leaderboard-card">
          <div className="leaderboard-title">
            <span>降幅战报</span>
            <strong>{biggestDecrease ? `${biggestDecrease.person.displayName} 领先` : "-"}</strong>
          </div>
          <div className="race-list">
            {decreaseLeaderboard.map((summary, index) => {
              const ratio = biggestDecrease && worstDecrease ? gapRatio(summary.changeFromStartPct, biggestDecrease.changeFromStartPct, worstDecrease.changeFromStartPct) : 100;
              return (
                <div className="race-row" key={summary.person.id}>
                  <div className="race-main">
                    <strong>
                      {index + 1}. {summary.person.displayName}
                    </strong>
                    <em>
                      {signed(summary.changeFromStartPct, "%")}
                      {index === 0 || !biggestDecrease ? " · 领先" : ` · 差 ${percentagePointGap(summary.changeFromStartPct, biggestDecrease.changeFromStartPct)}`}
                    </em>
                  </div>
                  <div className="race-track" aria-hidden="true">
                    <i style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="tabs" aria-label="页面分区">
        <button className={activeTab === "charts" ? "active" : ""} type="button" onClick={() => setActiveTab("charts")}>
          图表
        </button>
        <button className={activeTab === "details" ? "active" : ""} type="button" onClick={() => setActiveTab("details")}>
          个人详情
        </button>
      </section>

      {activeTab === "details" ? (
        <section className="summary-list">
          {summariesToShow.map((summary) => (
            <SummaryCard key={summary.person.id} summary={summary} />
          ))}
        </section>
      ) : (
        <section className="charts-tab">
          <ChartCard title="体重曲线" unit="kg" metric="weight" peopleToShow={peopleToShow} rows={chartData.weight} />
          <ChartCard title="从首条记录开始的变化" unit="%" metric="changePct" peopleToShow={peopleToShow} rows={chartData.changePct} />
          <ChartCard title="BMI 曲线" unit="" metric="bmi" peopleToShow={peopleToShow} rows={chartData.bmi} />
        </section>
      )}
    </main>
  );
}

export default App;
