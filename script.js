const API_KEY = "AIzaSyA6NWL-73bLEe1Hm496FSq3qWfI5yeYLU4";
const TOTAL_QUESTIONS = 5;
let topic = "";
let current = 0;
let score = 0;
let selected = null;
let timeLeft;
let timer;
let askedQuestions = [];

function getConfig(i) {
  if (i < 2) return { level: "Easy", time: 60 };
  if (i < 4) return { level: "Medium", time: 90 };
  return { level: "Hard", time: 120 };
}

function showStatus(msg) {
  const el = document.getElementById("statusMsg");
  el.innerText = msg;
  el.classList.remove("hidden");
}

function hideStatus() {
  document.getElementById("statusMsg").classList.add("hidden");
}

async function startQuiz() {
  topic = document.getElementById("topic").value.trim();
  if (!topic) {
    showStatus("Please enter a topic");
    return;
  }

  current = 0;
  score = 0;
  askedQuestions = [];

  hideStatus();

  document.getElementById("start").classList.add("hidden");
  document.getElementById("result").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");

  loadQuestion();
}

async function loadQuestion() {
  hideStatus();
  selected = null;

  const cfg = getConfig(current);

  document.getElementById("level").innerText = `Level: ${cfg.level}`;
  document.getElementById("progressBar").style.width =
    ((current + 1) / TOTAL_QUESTIONS) * 100 + "%";

  timeLeft = cfg.time;
  startTimer();
  
  const prompt = `
You are a professional quiz examiner and subject-matter expert.

Your task is to generate ONE high-quality multiple-choice question (MCQ)
that tests understanding and reasoning, not rote memorization.

Topic: "${topic}"
Difficulty: ${cfg.level}

Previously asked questions:
${askedQuestions.length ? askedQuestions.join("\n") : "None"}

Rules you MUST follow:
- Do NOT repeat or paraphrase any previous question.
- Ask a conceptually new and meaningful question.
- Avoid very basic or obvious definitions.
- Provide exactly FOUR options.
- Ensure ONLY ONE correct answer.
- Do NOT include explanations, markdown, or extra text.

Return ONLY valid JSON in this exact format:

{
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "answer": 0
}
`;

  try {
    const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    })
  }
);


    const data = await res.json();

    if (!data.candidates) {
      throw new Error("No candidates returned");
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    const q = JSON.parse(cleanText);

    askedQuestions.push(q.question);
    window.correct = q.answer;
    renderQuestion(q);

  } catch (err) {
    console.error(err);
    showStatus("AI is busy. Showing sample question.");
    loadFallbackQuestion();
  }
}

function renderQuestion(q) {
  document.getElementById("question").innerText = q.question;
  const optDiv = document.getElementById("options");
  optDiv.innerHTML = "";

  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    div.innerText = opt;
    div.onclick = () => {
      document
        .querySelectorAll(".option")
        .forEach(o => o.classList.remove("selected"));
      div.classList.add("selected");
      selected = i;
    };
    optDiv.appendChild(div);
  });
}

function startTimer() {
  clearInterval(timer);
  updateTimerUI();

  timer = setInterval(() => {
    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 0) {
      clearInterval(timer);
      nextQuestion();
    }
  }, 1000);
}

function updateTimerUI() {
  const timerEl = document.getElementById("timer");
  timerEl.innerText = `Time: ${timeLeft}s`;
  timerEl.style.color = timeLeft <= 10 ? "#d32f2f" : "#2e7d32";
  timerEl.classList.toggle("low", timeLeft <= 10);
}

function nextQuestion() {
  clearInterval(timer);

  if (selected === window.correct) score++;
  current++;

  if (current < TOTAL_QUESTIONS) {
    loadQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");

  const percent = Math.round((score / TOTAL_QUESTIONS) * 100);

  document.getElementById("score").innerText =
    `${score} / ${TOTAL_QUESTIONS}`;

  document.getElementById("performanceText").innerText =
    getPerformanceMessage(score, TOTAL_QUESTIONS);

  document.getElementById("scoreFill").style.width = percent + "%";
  document.getElementById("scorePercent").innerText =
    `Score: ${percent}%`;

  document.getElementById("correctCount").innerText = score;
  document.getElementById("wrongCount").innerText =
    TOTAL_QUESTIONS - score;

  document.querySelector(".bar.correct").style.height =
    (score / TOTAL_QUESTIONS) * 100 + "%";

  document.querySelector(".bar.wrong").style.height =
    ((TOTAL_QUESTIONS - score) / TOTAL_QUESTIONS) * 100 + "%";
}

function restartQuiz() {
  score = 0;
  current = 0;
  askedQuestions = [];

  document.getElementById("result").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");

  loadQuestion();
}

function loadFallbackQuestion() {
  const q = {
    question: "What does HTML stand for?",
    options: [
      "Hyper Text Markup Language",
      "High Text Machine Language",
      "Hyperlinks Text Mark Language",
      "None of these"
    ],
    answer: 0
  };

  renderQuestion(q);
  window.correct = q.answer;
}

function getPerformanceMessage(score, total) {
  const percent = (score / total) * 100;

  if (percent === 100) return "Outstanding! Perfect score.";
  if (percent >= 80) return "Excellent performance!";
  if (percent >= 60) return "Good job! Keep practicing.";
  if (percent >= 40) return "Not bad, you can do better.";
  return "Keep learning and try again!";
}
