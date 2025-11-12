import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import EditProfileModal from "../components/EditProfileModal";
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

export default function ProfilePage() {
  const { user, logout , setUser } = useContext(AuthContext);
  const [showEdit, setShowEdit] = useState(false);
  if (!user) return <div>Loading...</div>;

  const initials = (user.username)
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="profile-page">
      <h1 className="h1">PeerPrep User Profile</h1>
      <p className="kicker">
        View and manage your profile, track your progress, and review your
        activity.
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
                <h2>{user.username}</h2>
                <span className="badge badge--pill badge--soft">
                  Active Member
                </span>
              </div>
              <div className="kicker">
                {user.email}
              </div>
              <div className="tags">
                <span className="tag">JavaScript</span>
                <span className="tag tag-blue">Python</span>
                <span className="tag tag-red">Java</span>
                <span className="tag tag-purple">C++</span>
              </div>
            </div>
          </div>
          <button className="btn" onClick={() => setShowEdit(true)}>Edit Profile</button>
        </div>
      </section>

      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSave={(updatedUser) => {
            setUser(updatedUser);
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}
