import React, { useMemo, useState } from "react";
import "../css/Problems.css";

const DATA = [
  { id: 1, title: "Two Sum", topic: "Arrays", diff: "Easy", status: "Solved", blurb: "Find two numbers that add to target." },
  { id: 2, title: "Binary Tree Level Order", topic: "Graphs", diff: "Medium", status: "Practice", blurb: "BFS traversal of a tree." },
  { id: 3, title: "Longest Palindrome Substring", topic: "Strings", diff: "Medium", status: "Practice", blurb: "Center expansion or DP." },
  { id: 4, title: "Edit Distance", topic: "DP", diff: "Hard", status: "Not Solved", blurb: "Classic dynamic programming." },
];

export default function Problems() {
  const [kw, setKw] = useState("");
  const [topic, setTopic] = useState("");
  const [diff, setDiff] = useState("");

  const rows = useMemo(() => {
    return DATA.filter(r => {
      const okKw = !kw || r.title.toLowerCase().includes(kw.toLowerCase());
      const okT = !topic || r.topic === topic;
      const okD = !diff || r.diff === diff;
      return okKw && okT && okD;
    });
  }, [kw, topic, diff]);

  return (
    <div className="problems-page">
      <h1 className="h1">Problems</h1>

      <section className="card filter-card">
        <div className="filter-row">
          <div className="filter-col">
            <label className="meta">Search</label>
            <input
              className="btn input"
              placeholder="title…"
              value={kw}
              onChange={e => setKw(e.target.value)}
            />
          </div>

          <div className="filter-col">
            <label className="meta">Topic</label>
            <select className="btn select" value={topic} onChange={e => setTopic(e.target.value)}>
              <option value="">All</option>
              <option>Arrays</option>
              <option>Strings</option>
              <option>Graphs</option>
              <option>DP</option>
            </select>
          </div>

          <div className="filter-col">
            <label className="meta">Difficulty</label>
            <select className="btn select" value={diff} onChange={e => setDiff(e.target.value)}>
              <option value="">All</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          <div className="filter-col clear-btn">
            <button
              className="btn"
              onClick={() => {
                setKw("");
                setTopic("");
                setDiff("");
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      <section className="card problems-table">
        <div className="table-header meta">
          <div className="col-id">#</div>
          <div className="col-title">Title</div>
          <div className="col-topic">Topic</div>
          <div className="col-diff">Diff</div>
          <div className="col-status">Status</div>
        </div>

        <div className="list">
          {rows.map(r => (
            <div key={r.id} className="item problem-row">
              <div className="col-id meta">{r.id}</div>
              <div className="col-title">
                <div className="problem-title">{r.title}</div>
                <div className="meta">{r.blurb}</div>
              </div>
              <div className="col-topic">
                <span className="badge">{r.topic}</span>
              </div>
              <div className="col-diff">
                <span className="badge">{r.diff}</span>
              </div>
              <div className="col-status">
                <span
                  className={
                    r.status === "Solved"
                      ? "badge badge--dark"
                      : r.status === "Not Solved"
                      ? "badge badge--red"
                      : "badge"
                  }
                >
                  {r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
