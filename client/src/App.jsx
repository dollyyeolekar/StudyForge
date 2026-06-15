import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

import {
  Home,
  Upload,
  BookOpen,
  FileText,
  HelpCircle,
  Layers,
  Settings,
  Sparkles,
  CheckCircle,
  AlertCircle,
  User,
  Search,
  Bell,
  MoreVertical,
} from "lucide-react";

import folderImg from "./assets/folder.png";
import robotImg from "./assets/robot.png";
import coffeeSideImg from "./assets/coffee-side.png";
import coffeeBottomImg from "./assets/coffee-bottom.png";

import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [user, setUser] = useState(null);
const [authMode, setAuthMode] = useState("login");
const [authName, setAuthName] = useState("");
const [authEmail, setAuthEmail] = useState("");
const [authPassword, setAuthPassword] = useState("");
const [authError, setAuthError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [pdfText, setPdfText] = useState("");
  const [summary, setSummary] = useState("");
  const [formattedNotes, setFormattedNotes] = useState("");

  const [quiz, setQuiz] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showScore, setShowScore] = useState(false);

  const [loading, setLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardLoading, setFlashcardLoading] = useState(false);

  const [theme, setTheme] = useState("light");
  const [quizCount, setQuizCount] = useState(10);
  const [summaryLength, setSummaryLength] = useState("short");

  const [flashcardCount, setFlashcardCount] = useState(10);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dashboardData, setDashboardData] = useState(() => {
  const savedData = localStorage.getItem("dashboardData");


  return savedData
    ? JSON.parse(savedData)
    : {
  pdfsUploaded: 0,
  summariesGenerated: 0,
  quizzesCreated: 0,
  flashcardsCreated: 0,
  recentNotes: [],
  studyDays: [],
};
});

  const [localBackup, setLocalBackup] = useState(true);
  useEffect(() => {
  if (!user) return;

  localStorage.setItem(
    `dashboardData-${user.uid}`,
    JSON.stringify(dashboardData)
  );
}, [dashboardData, user]);
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);

    if (currentUser) {
      const savedData = localStorage.getItem(`dashboardData-${currentUser.uid}`);

      setDashboardData(
        savedData
          ? JSON.parse(savedData)
          : {
              pdfsUploaded: 0,
              summariesGenerated: 0,
              quizzesCreated: 0,
              flashcardsCreated: 0,
              recentNotes: [],
              studyDays: [],
            }
      );
    }
  });

  return () => unsubscribe();
}, []);
const handleAuth = async () => {
  setAuthError("");

  if (!authEmail || !authPassword) {
    setAuthError("Please enter email and password.");
    return;
  }

  try {
    if (authMode === "signup") {
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      await updateProfile(userCredential.user, { displayName: authName });
    } else {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
    }
  } catch (error) {
    setAuthError(error.message);
  }
};

const handleLogout = async () => {
  await signOut(auth);
};

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage("");
    setIsError(false);
  };

  const uploadPDF = async () => {
    if (!selectedFile) {
      alert("Please select a PDF first");
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);
    setPdfText("");
    setSummary("");
    setFormattedNotes("");
    setQuiz([]);
    setSelectedAnswers({});
    setShowScore(false);

    try {
      const formData = new FormData();
      formData.append("pdf", selectedFile);
      formData.append("summaryLength", summaryLength);
      formData.append("localBackup", localBackup);

      const response = await fetch("https://studyforge-ai-krh4.onrender.com/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message || "Error processing PDF");
        return;
      }

      setIsError(false);
      setMessage(data.message);
      setSummary(data.summary || "");
      setPdfText(data.text || "");
      setFormattedNotes(data.formattedNotes || "");
      setActivePage("summary");
      setDashboardData((prev) => {
  const today = new Date().toISOString().split("T")[0];

  return {
    ...prev,
    pdfsUploaded: prev.pdfsUploaded + 1,
    summariesGenerated: prev.summariesGenerated + 1,
   studyDays: (prev.studyDays || []).includes(today)
  ? prev.studyDays
  : [...(prev.studyDays || []), today],
    recentNotes: [
      {
        name: selectedFile.name,
        time: "Uploaded just now",
        notes: data.formattedNotes || "",
        summary: data.summary || "",
        text: data.text || "",
      },
      ...prev.recentNotes,
    ].slice(0, 5),
  };
});
    } catch (error) {
      console.error(error);
      setIsError(true);
      setMessage("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!pdfText) {
      alert("Please upload a PDF first");
      return;
    }

    setQuizLoading(true);
    setQuiz([]);
    setSelectedAnswers({});
    setShowScore(false);

    try {
      const response = await fetch("https://studyforge-ai-krh4.onrender.com/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  text: pdfText.slice(0, 4000),
  quizCount: quizCount,
  localBackup: localBackup,
}),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || data.message || "Quiz generation failed");
        return;
      }

      setQuiz(Array.isArray(data.quiz) ? data.quiz : []);
      setDashboardData((prev) => ({
  ...prev,
  quizzesCreated:
    prev.quizzesCreated + (Array.isArray(data.quiz) ? data.quiz.length : 0),
}));
    } catch (error) {
      console.error(error);
      alert("Unable to generate quiz. Please try again.");
    } finally {
      setQuizLoading(false);
    }
  };
const generateFlashcards = async () => {
  if (!pdfText) {
    alert("Please upload a PDF first");
    return;
  }

  setFlashcardLoading(true);
  setFlashcards([]);
  setCurrentCard(0);
  setIsFlipped(false);

  try {
    const response = await fetch(
      "https://studyforge-ai-krh4.onrender.com/generate-flashcards",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  text: pdfText.slice(0, 4000),
  flashcardCount: flashcardCount,
  localBackup: localBackup,
}),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || data.message);
      return;
    }

    setFlashcards(data.flashcards || []);
    setDashboardData((prev) => ({
  ...prev,
  flashcardsCreated:
    prev.flashcardsCreated + (data.flashcards ? data.flashcards.length : 0),
}));
  } catch (error) {
    console.error(error);
    alert("Unable to generate flashcards.");
  } finally {
    setFlashcardLoading(false);
  }
};

 const calculateScore = () => {
  return quiz.filter(
    (item, index) => selectedAnswers[index] === item.answer
  ).length;
};
const getScoreMessage = () => {
  const score = calculateScore();

  if (score >= 8) return "🎉 Excellent! You nailed it.";
  if (score >= 5) return "👍 Good job! Keep practicing.";
  return "Keep revising. You'll improve!";
};

const getWrongCount = () => {
  return quiz.length - calculateScore();
};

const getResultClass = (questionIndex, option, correctAnswer) => {
  if (!showScore) return "";

  const selected = selectedAnswers[questionIndex];

  if (option === correctAnswer) return "correct-option";
  if (selected === option && option !== correctAnswer) return "wrong-option";

  return "";
};

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <Home /> },
    { id: "upload", label: "Upload PDF", icon: <Upload /> },
    { id: "summary", label: "Summary", icon: <Sparkles /> },
    { id: "notes", label: "Notes", icon: <FileText /> },
    { id: "quiz", label: "Quiz", icon: <HelpCircle /> },
    { id: "flashcards", label: "Flashcards", icon: <Layers /> },
    { id: "settings", label: "Settings", icon: <Settings /> },
  ];

  const recentNotes = [
    {
      name: selectedFile ? selectedFile.name : "Digital Forensics.pdf",
      time: selectedFile ? "Uploaded just now" : "Uploaded 2 hours ago",
    },
    { name: "Network Security.pdf", time: "Uploaded yesterday" },
    { name: "Operating Systems.pdf", time: "Uploaded 2 days ago" },
  ];

  const downloadNotesPDF = () => {
  if (!formattedNotes) {
    alert("No notes available to download.");
    return;
  }

  const doc = new jsPDF();

  const cleanNotes = formattedNotes
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "•")
    .replace(/---/g, "")
    .replace(/`/g, "")
    .trim();

  const fileTitle = selectedFile
    ? selectedFile.name.replace(".pdf", "").replace(/\s+/g, "-")
    : "Study";

  doc.setFontSize(18);
  doc.text(`${fileTitle} Notes`, 10, 15);

  doc.setFontSize(12);

  const lines = doc.splitTextToSize(cleanNotes, 180);
  doc.text(lines, 10, 28);

  doc.save(`${fileTitle}-Notes.pdf`);
};

const studyProgress = Math.min(
  100,
  Math.round(
    ((dashboardData.pdfsUploaded > 0 ? 1 : 0) +
      (dashboardData.summariesGenerated > 0 ? 1 : 0) +
      (dashboardData.quizzesCreated > 0 ? 1 : 0) +
      (dashboardData.flashcardsCreated > 0 ? 1 : 0)) *
      25
  )
);
const studyStreak = dashboardData.studyDays
  ? dashboardData.studyDays.length
  : 0;
  const filteredRecentNotes = dashboardData.recentNotes.filter((note) =>
  note.name.toLowerCase().includes(searchTerm.toLowerCase())
);

const userName =
  user?.displayName ||
  user?.email?.split("@")[0] ||
  "Student";

  const hour = new Date().getHours();

let greeting = "Hello";

if (hour < 12) {
  greeting = "Good Morning";
} else if (hour < 17) {
  greeting = "Good Afternoon";
} else {
  greeting = "Good Evening";
}

if (!user) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>StudyForge AI</h1>
        <p>{authMode === "login" ? "Login to continue" : "Create your account"}</p>

{authMode === "signup" && (
  <input
    type="text"
    placeholder="Choose your username"
    value={authName}
    onChange={(e) => setAuthName(e.target.value)}
  />
)}
        <input
          type="email"
          placeholder="Email"
          value={authEmail}
          onChange={(e) => setAuthEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
        />

        {authError && <div className="auth-error">{authError}</div>}

        <button onClick={handleAuth}>
          {authMode === "login" ? "Login" : "Sign Up"}
        </button>

        <span
          onClick={() =>
            setAuthMode(authMode === "login" ? "signup" : "login")
          }
        >
          {authMode === "login"
            ? "New student? Create an account"
            : "Already have an account? Login"}
        </span>
      </div>
    </div>
  );
}

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="app-logo">
            <Sparkles />
            <div>
              <h2>StudyForge</h2>
            </div>
          </div>

          <nav>
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={activePage === item.id ? "active" : ""}
                onClick={() => setActivePage(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="upgrade-card">
          <img src={coffeeSideImg} className="sidebar-illustration" alt="Study setup" />
          <h3>Study smarter, not harder.</h3>
        </div>
      </aside>

      <main className="main">
        {activePage === "dashboard" && (
          <>
            <div className="topbar">
              <div>
              </div>

              <div className="top-actions">
                <div className="search-box">
                  <Search size={18} />
                  <input
  type="text"
  placeholder="Search notes, summaries..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
                </div>

                <button
  className="icon-btn notification-btn"
  onClick={() => setShowNotifications(!showNotifications)}
>
  <Bell />
  <span>{dashboardData.recentNotes.length}</span>
</button>
{showNotifications && (
  <div className="notification-popup">
    <h4>Recent Activity</h4>

    {dashboardData.recentNotes.length === 0 ? (
      <p>No activity yet.</p>
    ) : (
      dashboardData.recentNotes.map((note, index) => (
        <div
  key={index}
  className="notification-item"
  onClick={() => {
    setFormattedNotes(note.notes || "");
    setSummary(note.summary || "");
    setPdfText(note.text || "");
    setActivePage("notes");
    setShowNotifications(false);
  }}
>
  📄 Uploaded {note.name}
</div>
      ))
    )}
  </div>
)}
{showProfile && (
  <div className="profile-popup">
    <div className="profile-header">
      <div className="profile-avatar-large">
        <User size={28} />
      </div>

      <div>
        <h4>{userName}</h4>
<p>{user?.email}</p>
      </div>
    </div>

    <div className="profile-stats">
      <div>
        <strong>{dashboardData.pdfsUploaded}</strong>
        <span>PDFs</span>
      </div>

      <div>
        <strong>{dashboardData.quizzesCreated}</strong>
        <span>Quiz Qs</span>
      </div>

      <div>
        <strong>{dashboardData.flashcardsCreated}</strong>
        <span>Cards</span>
      </div>
    </div>

    <div className="profile-footer">
      <p>AI Study Assistant</p>
      <span>Version 1.0</span>
    </div>
  </div>
)}
                <button
  className="profile-avatar"
  onClick={() => setShowProfile(!showProfile)}
>
  <User />
</button>
              </div>
            </div>

            <section className="welcome-banner">
              <div>
                <h2>{greeting}, {userName}!</h2>
<p>Ready to make studying more fun?</p>
                <button onClick={() => setActivePage("upload")}>
                  <Upload size={20} />
                  Upload PDF
                </button>
              </div>

              <img src={folderImg} className="hero-illustration" alt="Upload folder" />
            </section>

            <section className="stats-grid">
  <div className="stat-card">
    <div className="stat-icon"><FileText /></div>
    <div>
      <p>PDFs Uploaded</p>
      <h2>{dashboardData.pdfsUploaded}</h2>
      <span>{selectedFile ? "Uploaded just now" : "No PDF uploaded"}</span>
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-icon"><BookOpen /></div>
    <div>
      <p>Summaries Generated</p>
      <h2>{dashboardData.summariesGenerated}</h2>
      <span>{summary ? "Summary ready" : "Not generated yet"}</span>
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-icon"><HelpCircle /></div>
    <div>
      <p>Quiz Questions</p>
      <h2>{dashboardData.quizzesCreated}</h2>
      <span>{quiz.length > 0 ? "Quiz generated" : "No quiz yet"}</span>
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-icon"><Layers /></div>
    <div>
      <p>Flashcards Created</p>
      <h2>{dashboardData.flashcardsCreated}</h2>
      <span>{flashcards.length > 0 ? "Flashcards ready" : "No flashcards yet"}</span>
    </div>
  </div>
</section>

            <section className="dashboard-layout">
              <div className="recent-card">
                <div className="section-header">
                  <h3>Recent Notes</h3>
                  <button>View all</button>
                </div>

                {filteredRecentNotes.map((note, index) => (
  <div
    className="note-row"
    key={index}
onClick={() => {
  setFormattedNotes(note.notes || "");
  setSummary(note.summary || "");
  setPdfText(note.text || "");
  setActivePage("notes");
}}    style={{ cursor: "pointer" }}
  >
                    <div className="pdf-icon">PDF</div>
                    <div>
                      <h4>{note.name}</h4>
                      <p>{note.time}</p>
                    </div>
                    <span className="note-tag">Notes</span>
                    <MoreVertical size={20} />
                  </div>
                ))}
              </div>

              <div className="right-widgets">
                <div className="study-streak-card">
                  <h3>Study Streak</h3>
                  <div className="streak-content">
                    <div className="fire">🔥</div>
                   <h2>{studyStreak}</h2>
<p>{studyStreak === 1 ? "active study day" : "active study days"}</p>
                  </div>

                  <div className="week-days">
  {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay() + 1);

    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + index);

    const dateString = date.toISOString().split("T")[0];

    const isActive = (dashboardData.studyDays || []).includes(dateString);

    

    return (
      <div key={index}>
        <span>{day}</span>
        <div className={isActive ? "day active-day" : "day"}>
          {isActive ? "✓" : ""}
        </div>
      </div>
    );
  })}
</div>
                </div>

                <div className="small-widget-grid">
                  <div className="ai-status-card">
                    <img src={robotImg} className="robot-illustration" alt="AI Robot" />
                    <div>
                      <h3>AI Status</h3>
                      <div className="status-online">
  {localBackup ? "Auto + Backup" : "AI Only"}
</div>

                    </div>
                  </div>

                  <div className="progress-card">
                    <div className="section-header">
                      <h3>Study Progress</h3>
                      <button>This Week</button>
                    </div>
                    <h2>{studyProgress}%</h2>
                    <div className="progress-track">
                      <div
  className="progress-fill"
  style={{ width: `${studyProgress}%` }}
></div>
                    </div>
                    <p>
  {studyProgress === 100
    ? "All study tools completed! "
    : "Keep going, complete all study sections."}
</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="quote-card">
              <p>“The beautiful thing about learning is nobody can take it away from you.”</p>
              <img src={coffeeBottomImg} alt="Books and coffee" />
            </section>
          </>
        )}

        {activePage === "upload" && (
          <section className="page-center">
            <div className="card upload-card large-card">
              <div className="card-title">
                <Upload />
                <h2>Upload Your PDF</h2>
              </div>

              <div className="drop-box">
                <Upload className="upload-icon" />
                <p>Choose your PDF file</p>

                <label className="choose-btn">
                  Choose PDF
                  <input type="file" accept="application/pdf" onChange={handleFileChange} />
                </label>
              </div>

              {selectedFile && (
                <div className="file-box">
                  <FileText />
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              )}

              <button className="generate-btn" onClick={uploadPDF}>
                {loading ? "Generating..." : "Upload PDF & Generate Summary"}
              </button>

              {message && (
                <div className={isError ? "error-box" : "success-box"}>
                  {isError ? <AlertCircle /> : <CheckCircle />}
                  <span>{message}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {activePage === "summary" && (
          <section className="full-page-card">
            <div className="page-title">
              <Sparkles />
              <div>
                <h1>AI Summary</h1>
              </div>
            </div>

            <div className="reading-box markdown-content">
              {summary ? <ReactMarkdown>{summary}</ReactMarkdown> : "Upload a PDF first to generate summary."}
            </div>
          </section>
        )}

        {activePage === "notes" && (
          <section className="full-page-card">
            <div className="page-title">
              <FileText />
              <div>
                <h1>Formatted Study Notes</h1>
              </div>
            </div>
            <button className="generate-btn" onClick={downloadNotesPDF}>
  Download Notes as PDF
</button>

            <div className="reading-box markdown-content">
              {formattedNotes ? <ReactMarkdown>{formattedNotes}</ReactMarkdown> : "Upload a PDF first to view formatted notes."}
            </div>
          </section>
        )}

        {activePage === "quiz" && (
  <section className="full-page-card">
    <div className="page-title">
      <HelpCircle />
      <div>
        <h1>Quiz Generator</h1>
       
      </div>
    </div>

    <button
      className="generate-btn"
      onClick={generateQuiz}
      disabled={quizLoading}
    >
      {quizLoading ? "Generating Quiz..." : "Generate Quiz "}
    </button>

    {quiz.length === 0 ? (
      <div className="reading-box markdown-content">
        Upload a PDF first, then click Generate Quiz.
      </div>
    ) : (
      <div className="quiz-wrapper">
        {showScore && (
          <div className="quiz-score">
            <h2>{getScoreMessage()}</h2>

            <div className="score-main">
              Score: {calculateScore()}/{quiz.length}
            </div>

            <div className="score-details">
              <span> Correct: {calculateScore()}</span>
              <span> Wrong: {getWrongCount()}</span>
            </div>
          </div>
        )}

        {quiz.map((item, index) => (
          <div className="quiz-card" key={index}>
            <h3>
              Q{index + 1}) {item.question}
            </h3>

            <div className="quiz-options">
              {item.options.map((option, optIndex) => {
                const letter = ["a", "b", "c", "d"][optIndex];

                return (
                  <label
                    key={optIndex}
                    className={`quiz-option ${
                      selectedAnswers[index] === option ? "selected-option" : ""
                    } ${getResultClass(index, option, item.answer)}`}
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      checked={selectedAnswers[index] === option}
                      disabled={showScore}
                      onChange={() =>
                        setSelectedAnswers({
                          ...selectedAnswers,
                          [index]: option,
                        })
                      }
                    />
                    <span>
                      {letter}. {option}
                    </span>
                  </label>
                );
              })}
            </div>

            {showScore && (
              <div className="answer-feedback">
                <p>
                  <strong>Your Answer:</strong>{" "}
                  {selectedAnswers[index] || "Not attempted"}
                </p>
                <p>
                  <strong>Correct Answer:</strong> {item.answer}
                </p>
              </div>
            )}
          </div>
        ))}

        {!showScore ? (
          <button className="generate-btn" onClick={() => setShowScore(true)}>
            Submit Quiz
          </button>
        ) : (
          <button
            className="generate-btn"
            onClick={() => {
              setSelectedAnswers({});
              setShowScore(false);
            }}
          >
            Retake Quiz
          </button>
        )}
      </div>
    )}
  </section>
)}
       {activePage === "flashcards" && (
  <section className="full-page-card">
    <div className="page-title">
      <Layers />
      <div>
        <h1>Flashcards</h1>
      </div>
    </div>

    <button
      className="generate-btn"
      onClick={generateFlashcards}
      disabled={flashcardLoading}
    >
      {flashcardLoading ? "Generating Flashcards..." : "Generate Flashcards "}
    </button>

    {flashcards.length === 0 ? (
      <div className="reading-box">
        Upload a PDF first, then generate flashcards.
      </div>
    ) : (
      <div className="flashcards-container">
        <div className="flashcard-progress">
          <span>
            Card {currentCard + 1} of {flashcards.length}
          </span>

          <div className="flashcard-progress-track">
            <div
              className="flashcard-progress-fill"
              style={{
                width: `${((currentCard + 1) / flashcards.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        <div
  className={`flashcard-flip ${isFlipped ? "flipped" : ""}`}
  onClick={() => setIsFlipped(!isFlipped)}
>
  <div className="flashcard-inner">
    <div className="flashcard-face flashcard-front">
      <h2>Question</h2>
      <p>{flashcards[currentCard].question}</p>
      <span>Click to Flip</span>
    </div>

    <div className="flashcard-face flashcard-back">
      <h2>Answer</h2>
      <p>{flashcards[currentCard].answer}</p>
      <span>Click to Flip Back</span>
    </div>
  </div>
</div>

        <div className="flashcard-controls">
          <button
            className="generate-btn"
            disabled={currentCard === 0}
            onClick={() => {
              setCurrentCard(currentCard - 1);
              setIsFlipped(false);
            }}
          >
            ← Previous
          </button>

          <button
            className="generate-btn"
            disabled={currentCard === flashcards.length - 1}
            onClick={() => {
              setCurrentCard(currentCard + 1);
              setIsFlipped(false);
            }}
          >
            Next →
          </button>
        </div>
      </div>
    )}
  </section>
)}

        {activePage === "settings" && (
  <section className="full-page-card">
    <div className="page-title settings-title">
  <Settings />
  <div>
    <h1>Settings</h1>
  </div>
</div>

    <div className="settings-panel">
      <div className="settings-section">
        <h3>Study Preferences</h3>

        <div className="settings-list">
          <div className="settings-row">
            <span>Summary Length</span>
            <select value={summaryLength} onChange={(e) => setSummaryLength(e.target.value)}>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          <div className="settings-row">
            <span>Quiz Questions</span>
            <select value={quizCount} onChange={(e) => setQuizCount(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          <div className="settings-row">
            <span>Flashcard Count</span>
            <select
  value={flashcardCount}
  onChange={(e) => setFlashcardCount(Number(e.target.value))}
>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>AI & App</h3>

        <div className="settings-list">
          <div className="settings-row">
            <span>AI Mode</span>
            <strong>{localBackup ? "Auto + Backup" : "AI Only"}</strong>
          </div>

          <div className="settings-row">
            <span>Local Backup</span>
            <label className="switch">
              <input
  type="checkbox"
  checked={localBackup}
  onChange={() => setLocalBackup(!localBackup)}
/>
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Data</h3>

        <div className="settings-list">
          <div className="settings-row">
            <span>Uploaded PDF</span>
            <strong>{selectedFile ? selectedFile.name : "None"}</strong>
          </div>

         <div
  className="settings-row danger-row"
  onClick={() => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear the current PDF, summary, notes, quiz, and flashcards?"
    );

    if (!confirmClear) return;

    setSelectedFile(null);
    setPdfText("");
    setSummary("");
    setFormattedNotes("");
    setQuiz([]);
    setFlashcards([]);
    setSelectedAnswers({});
    setShowScore(false);
    setCurrentCard(0);
    setIsFlipped(false);
    setMessage("");
    setActivePage("upload");
  }}
>
  <span>Clear Current Data</span>
  <strong>›</strong>
</div>
        </div>
      </div>
<div className="settings-section">
  <h3>Account</h3>

  <div className="settings-list">
    <div className="settings-row">
      <span>Email</span>
      <strong>{user?.email}</strong>
    </div>

    <div
      className="settings-row danger-row"
      onClick={handleLogout}
    >
      <span>Logout</span>
      <strong>↗</strong>
    </div>
  </div>
</div>

      <button
  className="save-settings-btn"
  onClick={() => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }}
>
  {settingsSaved ? "Settings Saved ✓" : "Save Changes"}
</button>
    </div>
  </section>

)}
        
      </main>
    </div>
  );
}

export default App;