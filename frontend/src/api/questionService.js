const API_BASE = import.meta.env.VITE_QUESTION_SERVICE_URL || "http://localhost:3001";

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Server error details:", err);
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// Get all questions
export async function getAllQuestions( { difficulty, category, search } = {}) {
  const params = new URLSearchParams();
  if (difficulty) params.append("difficulty", difficulty);
  if (category) params.append("category", category);
  if (search) params.append("search", search);

  const res = await fetch(`${API_BASE}/api/questions?${params.toString()}`);
  const data = await handleResponse(res);

  return data.data || [];
}

// Optionally: filter by topic or difficulty
export async function getFilteredQuestions({ topic, difficulty }) {
  const query = new URLSearchParams();
  if (topic) query.append("topic", topic);
  if (difficulty) query.append("difficulty", difficulty);

  const res = await fetch(`${API_BASE}/questions?${query.toString()}`);
  return handleResponse(res);
}
