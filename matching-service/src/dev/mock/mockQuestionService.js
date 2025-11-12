import express from 'express';
const app = express();
app.get('/api/questions/statistics', (_, res) => {
  res.json({
    success: true,
    data: {
      byDifficulty: [{ _id: 'Easy', count: 100 }, { _id: 'Medium', count: 80 }, { _id: 'Hard', count: 60 }],
      byCategory: [{ _id: 'AI', count: 50 }, { _id: 'Trees', count: 40 }, { _id: 'Graphs', count: 30 }]
    }
  });
});
const PORT = process.env.MOCK_QS_PORT || 3100;
app.listen(PORT, () => console.log(`Mock Question Service on :${PORT}`));
