import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Problems.css";
import { endpoints } from "../lib/api";

export default function Problems() {
  const navigate = useNavigate();
  const [kw, setKw] = useState("");
  const [topic, setTopic] = useState("");
  const [diff, setDiff] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch questions from the API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        // Using the question service endpoint from API configuration
        const response = await fetch(`${endpoints.questions}/api/questions?limit=100`);
        const result = await response.json();
        
        if (result.success) {
          // Transform API data to match frontend format
          const formattedQuestions = result.data.map((q, index) => ({
            id: index + 1,
            title: q.title,
            topic: q.categories && q.categories.length > 0 ? q.categories[0] : "General",
            diff: q.difficulty,
            status: "Practice", // Default status
            blurb: q.description?.substring(0, 50) + "..." || "",
            _id: q._id
          }));
          setQuestions(formattedQuestions);
        } else {
          setError("Failed to fetch questions");
        }
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError("Failed to connect to question service");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);
  
  const rows = useMemo(() => {
    return questions.filter(r => {
      const okKw = !kw || r.title.toLowerCase().includes(kw.toLowerCase());
      const okT = !topic || r.topic === topic;
      const okD = !diff || r.difficulty === diff;
      return okKw && okT && okD;
    });
  }, [kw, topic, diff, questions]);

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
              <option>Algorithms</option>
              <option>Data Structures</option>
              <option>Dynamic Programming</option>
              <option>Strings</option>
              <option>Math</option>
              <option>Sorting</option>
              <option>Searching</option>
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

        {loading && (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div className="meta">Loading questions...</div>
          </div>
        )}

        {error && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#ff0000" }}>
            <div className="meta">Error: {error}</div>
          </div>
        )}

        {!loading && !error && (
          <div className="list">
            {rows.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div className="meta">No questions found matching your filters.</div>
              </div>
            ) : (
              rows.map(r => (
                <div 
                  key={r._id || r.id} 
                  className="item problem-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/code/${r._id}`)}
                >
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
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
