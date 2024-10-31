require('dotenv').config(); // Ensure this is at the top
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

let quizScores = [];

app.post('/generate', async (req, res) => {
  const { topic, level, graspingPower } = req.body;
  try {
    const outlineResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: `Generate a detailed course outline for the topic: ${topic} tailored for a ${level} level learner with a ${graspingPower} grasping power.`
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      }
    });

    const outline = outlineResponse.data.choices[0].message.content.trim();
    const outlineLines = outline.split('\n').filter(line => line.trim());

    const detailedChapters = await Promise.all(outlineLines.map(async (chapter, index) => {
      const detailedResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: `Provide a detailed explanation for the chapter: ${chapter} tailored for a ${level} level learner with a ${graspingPower} grasping power.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        }
      });

      const detailedContent = detailedResponse.data.choices[0].message.content.trim();
      return {
        title: `Chapter ${index + 1}: ${chapter}`,
        content: detailedContent,
      };
    }));

    const course = {
      title: `Course Title: ${topic}`,
      description: 'Course Description: This course covers the following topics:',
      chapters: detailedChapters,
    };

    res.json({ course });
  } catch (error) {
    console.error('Error generating course', error.response ? error.response.data : error.message);
    res.status(500).send('Error generating course');
  }
});

app.post('/quiz', async (req, res) => {
    const { topic } = req.body;
    try {
      const quizResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: `Generate 5 multiple choice quiz questions on the topic: ${topic}. Each question should have 4 options and indicate the correct answer.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        }
      });
  
      const quizContent = quizResponse.data.choices[0].message.content.trim();
      const questions = quizContent.split('\n\n').map((block) => {
        const lines = block.split('\n');
        return {
          question: lines[0].replace(/^Question \d+: /, ''),
          options: lines.slice(1, 5).map(line => line.replace(/^[A-D]\.\s*/, '')),
          correctAnswer: lines[5].replace('Answer: ', '')
        };
      });
  
      res.json({ questions });
    } catch (error) {
      console.error('Error generating quiz', error.response ? error.response.data : error.message);
      res.status(500).send('Error generating quiz');
    }
  });
  

app.post('/save-score', (req, res) => {
  const { score, date } = req.body;
  quizScores.push({ score, date });
  res.json({ message: 'Score saved successfully' });
});

app.get('/scores', (req, res) => {
  res.json(quizScores);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
