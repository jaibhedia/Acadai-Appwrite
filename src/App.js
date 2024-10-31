import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Link, useParams } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register required components from Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('');
  const [graspingPower, setGraspingPower] = useState('');
  const [generatedCourse, setGeneratedCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleGenerate = async () => {
    try {
      const response = await axios.post('http://localhost:5000/generate', { topic, level, graspingPower });
      const courseData = response.data.course;
      setGeneratedCourse(courseData);
    } catch (error) {
      console.error('Error generating course', error);
    }
  };

  return (
    <Router>
      <div className="App">
        <div className="sidebar">
          <ul>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/generate">Generate</Link></li>
            <li><Link to="/courses">Courses</Link></li>
            <li><Link to="/quizzes">Quizzes</Link></li>
            <li><Link to="/insights">Insights</Link></li>
          </ul>
        </div>
        <div className="content">
          <Routes>
            <Route path="/generate" element={<GeneratePage
                topic={topic}
                setTopic={setTopic}
                level={level}
                setLevel={setLevel}
                graspingPower={graspingPower}
                setGraspingPower={setGraspingPower}
                handleGenerate={handleGenerate}
                generatedCourse={generatedCourse}
                setSelectedCourse={setSelectedCourse}
              />} 
            />
            <Route path="/courses" element={<CoursesPage selectedCourse={selectedCourse} generatedCourse={generatedCourse} />} />
            <Route path="/courses/:chapterId" element={<ChapterPage course={selectedCourse || generatedCourse} />} />
            <Route path="/quizzes" element={<QuizzesPage topic={topic} />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/" element={<h1>Dashboard</h1>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function GeneratePage({ topic, setTopic, level, setLevel, graspingPower, setGraspingPower, handleGenerate, generatedCourse, setSelectedCourse }) {
  return (
    <div>
      <h1>Generate</h1>
      <p>What do you want to learn today?</p>
      <input 
        type="text" 
        value={topic} 
        onChange={(e) => setTopic(e.target.value)} 
        placeholder="Enter a topic"
      />
      <p>What is your current level of understanding in this topic?</p>
      <select value={level} onChange={(e) => setLevel(e.target.value)}>
        <option value="">Select Level</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <p>How quickly do you grasp new concepts?</p>
      <select value={graspingPower} onChange={(e) => setGraspingPower(e.target.value)}>
        <option value="">Select Grasping Power</option>
        <option value="slow">Slow</option>
        <option value="average">Average</option>
        <option value="fast">Fast</option>
      </select>
      <button onClick={handleGenerate}>Generate</button>
      <div className="generated-course">
        {generatedCourse && generatedCourse.title && (
          <div>
            <h2>{generatedCourse.title}</h2>
            <p>{generatedCourse.description}</p>
            <Link to="/courses" onClick={() => setSelectedCourse(generatedCourse)}>
              View Course
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function CoursesPage({ selectedCourse, generatedCourse }) {
  const courseToDisplay = selectedCourse || generatedCourse;

  if (!courseToDisplay || !courseToDisplay.title) {
    return <p>Please generate a course from the Generate page or select an existing course.</p>;
  }

  return (
    <div>
      <h1>{courseToDisplay.title}</h1>
      <div className="course-content">
        <p>{courseToDisplay.description}</p>
        {courseToDisplay.chapters && courseToDisplay.chapters.length > 0 ? (
          courseToDisplay.chapters.map((chapter, index) => (
            <div key={index}>
              <h2>
                <Link to={`/courses/${index}`}>{chapter.title}</Link>
              </h2>
            </div>
          ))
        ) : (
          <p>No chapters available.</p>
        )}
      </div>
    </div>
  );
}

function ChapterPage({ course }) {
  const { chapterId } = useParams();
  const chapter = course.chapters[chapterId];

  if (!chapter) {
    return <p>Chapter not found.</p>;
  }

  return (
    <div>
      <h2>{chapter.title}</h2>
      <p>{chapter.content}</p>
    </div>
  );
}

function QuizzesPage({ topic }) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetchQuizQuestions = async () => {
      try {
        const response = await axios.post('http://localhost:5000/quiz', { topic });
        setQuestions(response.data.questions);
      } catch (error) {
        console.error('Error fetching quiz questions', error);
      }
    };

    if (topic) {
      fetchQuizQuestions();
    }
  }, [topic]);

  const handleNext = () => {
    setCurrentQuestionIndex((prevIndex) => Math.min(prevIndex + 1, questions.length - 1));
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleAnswerSelect = (questionIndex, option) => {
    setSelectedAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionIndex]: option
    }));
  };

  const handleSubmit = async () => {
    let score = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score += 1;
      }
    });
    setScore(score);
    setShowScore(true);

    const date = new Date().toLocaleDateString();
    try {
      await axios.post('http://localhost:5000/save-score', { score, date });
    } catch (error) {
      console.error('Error saving score', error);
    }
  };

  return (
    <div className="quiz-container">
      <h1>Quiz</h1>
      {showScore ? (
        <div className="quiz-score">
          <h2>Your Score: {score}/{questions.length}</h2>
        </div>
      ) : (
        questions.length > 0 && (
          <div className="quiz-question">
            <h2>{questions[currentQuestionIndex].question}</h2>
            {questions[currentQuestionIndex].options.map((option, index) => (
              <div key={index}>
                <input
                  type="radio"
                  id={`option-${index}`}
                  name={`question-${currentQuestionIndex}`}
                  value={option}
                  checked={selectedAnswers[currentQuestionIndex] === option}
                  onChange={() => handleAnswerSelect(currentQuestionIndex, option)}
                />
                <label htmlFor={`option-${index}`}>{option}</label>
              </div>
            ))}
            <div className="quiz-navigation">
              <button onClick={handlePrevious} disabled={currentQuestionIndex === 0}>Previous</button>
              {currentQuestionIndex < questions.length - 1 ? (
                <button onClick={handleNext}>Next</button>
              ) : (
                <button onClick={handleSubmit}>Submit</button>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function InsightsPage() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const response = await axios.get('http://localhost:5000/scores');
        setScores(response.data);
      } catch (error) {
        console.error('Error fetching scores', error);
      }
    };

    fetchScores();
  }, []);

  const data = {
    labels: scores.map(score => score.date),
    datasets: [
      {
        label: 'Quiz Scores',
        data: scores.map(score => score.score),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
      },
    ],
  };

  return (
    <div>
      <h1>Insights</h1>
      <Line data={data} />
    </div>
  );
}

export default App;
