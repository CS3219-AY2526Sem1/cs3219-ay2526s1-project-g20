import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/Dashboard.css";

function Badge({ children, tone }) {
  const cls =
    tone === "dark" ? "badge badge--dark" :
    tone === "red"  ? "badge badge--red"  :
    tone === "green"? "badge badge--green" : "badge";
  return <span className={cls}>{children}</span>;
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <section className="welcome-section">
        <h1 className="h1">Welcome back, John!</h1>
        <p className="p-muted">Ready to continue your coding interview preparation?</p>
        <div className="row button-row">
          <button className="btn btn--dark">&lt;/&gt;&nbsp; Practice Problems</button>
          <button className="btn btn--dark btn--xl" onClick={() => navigate("/matching")}>
            ⚡ Start Matching
          </button>
          <button className="btn">📅&nbsp; Schedule Interview</button>
          <button className="btn">📚&nbsp; Study Resources</button>
        </div>
      </section>

      <section className="grid-row">
        <div className="card progress-card">
          <div className="card-header">
            <h3>Your Progress</h3>
            <Badge>7 days</Badge>
          </div>

          <div className="progress-content">
            <div className="progress-info">
              <div className="row between muted">
                <div>Problems Solved</div>
                <div>45/500</div>
              </div>
              <div className="progress-bar"><div /></div>
              <div className="p-muted streak">
                Current Streak <span className="kbd">7</span>
              </div>
            </div>

            <div className="stats-row">
              <Stat label="Sessions" value="23" />
              <Stat label="Avg Rating" value="4.2" />
              <Stat label="Success Rate" value="85%" />
            </div>
          </div>
        </div>

        <div className="card upcoming-card">
          <h3>Upcoming</h3>
          <div className="list">
            <div className="item">
              <div>
                <div className="title">Tech Corp</div>
                <div className="meta">Tomorrow at 2:00 PM</div>
              </div>
              <Badge>Mock Interview</Badge>
            </div>
            <div className="item">
              <div>
                <div className="title">StartupXYZ</div>
                <div className="meta">Dec 12 at 10:00 AM</div>
              </div>
              <Badge>Peer Practice</Badge>
            </div>
          </div>
          <button className="btn full">Schedule More</button>
        </div>
      </section>

      <section className="grid-row">
        <div className="card">
          <h3>Recent Practice Sessions</h3>
          <div className="list">
            <div className="item">
              <div>
                <div className="title">Two Sum</div>
                <div className="meta">with Alice Smith • 25 min</div>
              </div>
              <div className="row gap-8">
                <Badge>Easy</Badge>
                <Badge tone="dark">Solved</Badge>
              </div>
            </div>

            <div className="item">
              <div>
                <div className="title">Binary Tree Traversal</div>
                <div className="meta">with Bob Johnson • 40 min</div>
              </div>
              <div className="row gap-8">
                <Badge>Medium</Badge>
                <Badge tone="dark">Partially Solved</Badge>
              </div>
            </div>

            <div className="item">
              <div>
                <div className="title">Dynamic Programming</div>
                <div className="meta">with Carol Davis • 60 min</div>
              </div>
              <div className="row gap-8">
                <Badge tone="red">Hard</Badge>
                <Badge tone="red">Not Solved</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="card achievements-card">
          <h3>Achievements</h3>
          <div className="list gap-14">
            <div className="achievement">
              <span className="dot gold" />
              <div>
                <div className="title">Problem Solver</div>
                <div className="meta">Solved 50 problems</div>
              </div>
            </div>
            <div className="achievement">
              <span className="dot blue" />
              <div>
                <div className="title">Week Streak</div>
                <div className="meta">7 days in a row</div>
              </div>
            </div>
            <div className="achievement">
              <span className="dot green" />
              <div>
                <div className="title">Team Player</div>
                <div className="meta">25 practice sessions</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
