// quiz.js
import {
  getElement,
  showElement,
  hideElement,
  setText,
  createAnswerButton,
  updateScoreDisplay,
  lockAnswers,
  markCorrectAnswer,
} from "./dom.js";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  startTimer,
} from "./utils.js";
import {
  toggledarkmode,
} from "./dark-mode.js";


console.log("Quiz JS loaded...");

const themes = {
  "maths": [
    {
      text: "Combien font 2 + 3 ?",
      answers: ["3", "4", "5", "1"],
      correct: 2,
      timeLimit: 5,
    },
    {
      text: "Quelle est la racine carrée de 16 ?",
      answers: ["2", "4", "8", "16"],
      correct: 1,
      timeLimit: 10,
    },
  ],
  "culture-generale": [
    {
      text: "Quelle est la capitale de la France ?",
      answers: ["Marseille", "Paris", "Lyon", "Bordeaux"],
      correct: 1,
      timeLimit: 10,
    },
    {
      text: "Quel est le plus grand océan du monde ?",
      answers: ["Atlantique", "Indien", "Arctique", "Pacifique"],
      correct: 3,
      timeLimit: 15,
    },
  ],
  "français": [
    {
      text: "Comment est conjuger le verbe avoir au futur ?",
      answers: ["aurai", "aie", "ai", "a"],
      correct: 0,
      timeLimit: 10,
    },
    {
      text: "Comment est conjuger le verbe être au futur ?",
      answers: ["serai", "sois", "suis", "être"],
      correct: 0,
      timeLimit: 15,
    },
  ],
  "histoire": [
    {
      text: "Quelle est la date de la Révolution française ?",
      answers: ["1789", "1791", "1793", "1795"],
      correct: 0,
      timeLimit: 10,
    },
    {
      text: "Quel est le nom du roi soleil ?",
      answers: ["Louis XIV", "Louis XV", "Louis XVI", "Napoleon"],
      correct: 0,
      timeLimit: 15,
    },
  ],
};

let questions = [];
let selectedTheme = "";

let currentQuestionIndex = 0;
let score = 0;
let bestScore = loadFromLocalStorage("bestScore", 0);
let timerId = null;
let userAnswers = [];
let shuffledQuestions = [];

// DOM Elements
const introScreen = getElement("#intro-screen");
const questionScreen = getElement("#question-screen");
const resultScreen = getElement("#result-screen");

const bestScoreValue = getElement("#best-score-value");
const bestScoreEnd = getElement("#best-score-end");

const themeSelect = getElement("#theme-select");

const questionText = getElement("#question-text");
const answersDiv = getElement("#answers");
const nextBtn = getElement("#next-btn");
const startBtn = getElement("#start-btn");
const restartBtn = getElement("#restart-btn");
const endBtn = getElement("#end-btn");

const scoreText = getElement("#score-text");
const timeLeftSpan = getElement("#time-left");

const currentQuestionIndexSpan = getElement("#current-question-index");
const totalQuestionsSpan = getElement("#total-questions");

const recapSection = getElement("#recap-section");
const recapTbody = getElement("#recap-tbody");

// Init
startBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", nextQuestion);
restartBtn.addEventListener("click", restartQuiz);
endBtn.addEventListener("click", endQuiz);


setText(bestScoreValue, bestScore);

// Fonction pour mélanger les questions
function shuffleQuestions(questionsArray) {
  const copy = [...questionsArray];
  copy.sort(() => Math.random() - 0.5);
  return copy;
}

function startQuiz() {
  selectedTheme = themeSelect.value;
  questions = themes[selectedTheme];

  hideElement(introScreen);
  showElement(questionScreen);

  currentQuestionIndex = 0;
  score = 0;
  userAnswers = [];

  shuffledQuestions = shuffleQuestions(questions);

  const mode = getSelectedMode();

  if (mode === "infinite") {
    showElement(endBtn);
  }

  setText(totalQuestionsSpan, mode === "classic" ? shuffledQuestions.length : "Infini");

  showQuestion();
}

function showQuestion() {
  clearInterval(timerId);
  const mode = getSelectedMode();
  const q = shuffledQuestions[mode === "classic" ? currentQuestionIndex : Math.floor(Math.random() * shuffledQuestions.length)];

  setText(questionText, q.text);
  setText(currentQuestionIndexSpan, currentQuestionIndex + 1);

  answersDiv.innerHTML = "";
  q.answers.forEach((answer, index) => {
    const btn = createAnswerButton(answer, () => selectAnswer(index, btn));
    answersDiv.appendChild(btn);
  });

  nextBtn.classList.add("hidden");

  timeLeftSpan.textContent = q.timeLimit;
  timerId = startTimer(
    q.timeLimit,
    (timeLeft) => setText(timeLeftSpan, timeLeft),
    () => {
      const q = shuffledQuestions[currentQuestionIndex];
      userAnswers.push({
        questionText: q.text,
        userAnswerText: "Pas de réponse (temps écoulé)",
        correctAnswerText: q.answers[q.correct],
        isCorrect: false
      });
      markCorrectAnswer(answersDiv, q.correct);
      lockAnswers(answersDiv);
      nextBtn.classList.remove("hidden");
    }
  );
}

function selectAnswer(index, btn) {
  clearInterval(timerId);

  const q = shuffledQuestions[currentQuestionIndex];

  const isCorrect = index === q.correct;

  if (isCorrect) {
    score++;
    btn.classList.add("correct");
  } else {
    btn.classList.add("wrong");
  }

  userAnswers.push({
    questionText: q.text,
    userAnswerText: q.answers[index],
    correctAnswerText: q.answers[q.correct],
    isCorrect: isCorrect
  });

  markCorrectAnswer(answersDiv, q.correct);
  lockAnswers(answersDiv);
  nextBtn.classList.remove("hidden");
}

function nextQuestion() {
  const mode = getSelectedMode();
  if (mode === "classic" && currentQuestionIndex < shuffledQuestions.length) {
    currentQuestionIndex++;
    showQuestion();
  } else if (mode === "infinite") {
    currentQuestionIndex = Math.floor(Math.random() * shuffledQuestions.length);
    showQuestion();
  } else {
    endQuiz();
  }
}

function endQuiz() {
  hideElement(questionScreen);
  showElement(resultScreen);

  updateScoreDisplay(scoreText, score, shuffledQuestions.length);

  if (score > bestScore) {
    bestScore = score;
    saveToLocalStorage("bestScore", bestScore);
  }
  setText(bestScoreEnd, bestScore);

  showRecapTable();
}

function showRecapTable() {
  recapTbody.innerHTML = "";

  userAnswers.forEach((answer) => {
    const row = document.createElement("tr");
    row.className = answer.isCorrect ? "recap-row-correct" : "recap-row-wrong";

    const questionCell = document.createElement("td");
    questionCell.textContent = answer.questionText;
    row.appendChild(questionCell);

    const userAnswerCell = document.createElement("td");
    userAnswerCell.textContent = answer.userAnswerText;
    userAnswerCell.className = answer.isCorrect ? "answer-correct" : "answer-wrong";
    row.appendChild(userAnswerCell);

    const correctAnswerCell = document.createElement("td");
    correctAnswerCell.textContent = answer.correctAnswerText;
    correctAnswerCell.className = "answer-correct";
    row.appendChild(correctAnswerCell);

    const resultCell = document.createElement("td");
    resultCell.textContent = answer.isCorrect ? "✅" : "❌";
    resultCell.className = "result-icon";
    row.appendChild(resultCell);

    recapTbody.appendChild(row);
  });
}

function restartQuiz() {
  hideElement(resultScreen);
  showElement(introScreen);

  setText(bestScoreValue, bestScore);
}

const modeSelect = getElement("#mode-select");

function getSelectedMode() {
  return modeSelect.value;
}
const button = document.querySelector("button")

function changemode() {
  button.addEventListener("click", toggledarkmode)

}
changemode();