import React from "react";
import "../css/ProfilePage.css";

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <div className="v">
        {icon} {value}
      </div>
      <div className="l">{label}</div>
    </div>
  );
}

function Row({ title, subtitle, status }) {
  const cls =
    "badge--pill " +
    (status === "Completed"
      ? "badge--dark"
      : status === "Incomplete"
      ? "badge--soft"
      : "badge");
  return (
    <div className="item">
      <div>
        <div className="item-title">{title}</div>
        <div className="meta">{subtitle}</div>
      </div>
      <span className={cls}>{status}</span>
    </div>
  );
}

export default function ProfilePage({ user }) {
  const initials = (user?.name || "AC")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="profile-page">
      <h1 className="h1">PeerPrep User Profile</h1>
      <p className="kicker">
        Comprehensive user dashboard showing coding statistics, match history,
        achievements, and skill progression
      </p>

      <section className="card profile-header-card">
        <div className="profile-header">
          <div className="profile-left">
            <div className="avatar-lg">
              {initials}
              <span className="dot" />
            </div>
            <div>
              <div className="user-info">
                <h2>{user?.username || "Alex Chen"}</h2>
                <span className="badge badge--pill badge--soft">
                  Active Member
                </span>
              </div>
              <div className="kicker">
                {user?.email || "alex.chen@example.com"}
              </div>
              <div className="stats-row">
                <Stat value="47" label="Total Sessions" icon={"👥"} />
                <Stat value="23" label="Problems Solved" icon={"✅"} />
                <Stat value="142h" label="Total Hours" icon={"⏱️"} />
                <Stat value="7" label="Day Streak" icon={"📈"} />
              </div>
              <div className="tags">
                <span className="tag">JavaScript</span>
                <span className="tag tag-blue">Python</span>
                <span className="tag tag-red">Java</span>
                <span className="tag tag-purple">C++</span>
              </div>
            </div>
          </div>
          <button className="btn">Edit Profile</button>
        </div>

        <div className="segmented">
          <button className="is-active">Overview</button>
          <button>Match History</button>
          <button>Achievements</button>
          <button>Skills</button>
        </div>
      </section>

      <section className="grid-row">
        <div className="card">
          <h3>Performance Stats</h3>
          <div className="p-muted">
            Success Rate <span className="right">78%</span>
          </div>
          <div className="bar">
            <div style={{ width: "78%" }} />
          </div>

          <div className="p-muted">
            Avg. Session Time <span className="right">45m</span>
          </div>
          <div className="bar">
            <div style={{ width: "45%" }} />
          </div>

          <div className="p-muted">
            Member since <span className="right">March 2024</span>
          </div>
        </div>

        <div className="card">
          <h3>Recent Activity</h3>
          <div className="list">
            <Row
              title="Two Sum"
              subtitle="with Sarah Kim • 32min • 2024-03-15"
              status="Completed"
            />
            <Row
              title="Binary Tree Traversal"
              subtitle="with Mike Johnson • 58min • 2024-03-14"
              status="Completed"
            />
            <Row
              title="Longest Palindrome"
              subtitle="with Emma Wilson • 67min • 2024-03-13"
              status="Incomplete"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
