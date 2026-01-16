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
let selectedMode = "";

let currentQuestionIndex = 0;
let score = 0;
let bestScore = loadFromLocalStorage("bestScore", 0);
let badgesUnlocked = loadFromLocalStorage("badgesUnlocked", []);
let totalCorrectAnswers = loadFromLocalStorage("totalCorrectAnswers", 0);
let timerId = null;
let globalTimerId = null;
let globalTimeLeft = 0;
let userAnswers = [];
let shuffledQuestions = [];

const badgesDefinitions = [
  { id: "first_game", name: "Premier Pas", description: "Terminer votre premier quiz", icon: "🏁" },
  { id: "perfect_score", name: "Sans Faute", description: "Obtenir 100% de bonnes réponses", icon: "🏆" },
  { id: "ten_correct", name: "Expert", description: "Cumuler 10 bonnes réponses", icon: "🧠" }
];

// DOM Elements
const introScreen = getElement("#intro-screen");
const questionScreen = getElement("#question-screen");
const resultScreen = getElement("#result-screen");

const bestScoreValue = getElement("#best-score-value");
const bestScoreEnd = getElement("#best-score-end");
const badgesContainer = getElement("#badges-container");

const themeSelect = getElement("#theme-select");

const questionText = getElement("#question-text");
const answersDiv = getElement("#answers");
const nextBtn = getElement("#next-btn");
const startBtn = getElement("#start-btn");
const restartBtn = getElement("#restart-btn");
const endBtn = getElement("#end-btn");

const scoreText = getElement("#score-text");
const timeLeftSpan = getElement("#time-left");
const globalTimeLeftSpan = getElement("#global-time-left");
const globalTimerDiv = getElement("#global-timer-div");

const currentQuestionIndexSpan = getElement("#current-question-index");
const totalQuestionsSpan = getElement("#total-questions");

const recapSection = getElement("#recap-section");
const recapTbody = getElement("#recap-tbody");

const progressBar = getElement("#progress-bar");
const timerCircle = getElement("#timer-circle");
const timerCircleWrapper = getElement("#timer-circle-wrapper");

// Init
startBtn.addEventListener("click", startQuiz);
nextBtn.addEventListener("click", nextQuestion);
restartBtn.addEventListener("click", restartQuiz);
endBtn.addEventListener("click", endQuiz);


setText(bestScoreValue, bestScore);
displayBadges();

// Fonction pour mélanger les questions
function shuffleQuestions(questionsArray) {
  const copy = [...questionsArray];
  copy.sort(() => Math.random() - 0.5);
  return copy;
}

function updateProgressBar() {
  const mode = getSelectedMode();
  
  if (mode === "classic") {
    // Mode classic : pourcentage basé sur currentQuestionIndex
    const progress = ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100;
    progressBar.style.width = progress + "%";
  } else {
    // Mode infini : animation continue (reset tous les 10)
    const progress = ((currentQuestionIndex % 10) + 1) * 10;
    progressBar.style.width = progress + "%";
  }
}

function updateTimerCircle(timeLeft, timeLimit) {
  const circumference = 2 * Math.PI * 45; // 283
  const progress = timeLeft / timeLimit;
  const offset = circumference * (1 - progress);
  
  timerCircle.style.strokeDashoffset = offset;
  
  // Changer la couleur selon le temps restant
  if (timeLeft <= 3) {
    timerCircleWrapper.classList.add("danger");
    timerCircleWrapper.classList.remove("warning");
  } else if (timeLeft <= 5) {
    timerCircleWrapper.classList.add("warning");
    timerCircleWrapper.classList.remove("danger");
  } else {
    timerCircleWrapper.classList.remove("warning", "danger");
  }
}


function startQuiz() {
  clearInterval(globalTimerId);

  selectedTheme = themeSelect.value;
  questions = themes[selectedTheme];

  hideElement(introScreen);
  showElement(questionScreen);

  currentQuestionIndex = 0;
  score = 0;
  userAnswers = [];

  progressBar.style.width = "0%";

  shuffledQuestions = shuffleQuestions(questions);

  const mode = getSelectedMode();
  selectedMode = mode;

  if (mode === "infinite" || mode === "contre-la-montre") {
    showElement(endBtn);
  }

  setText(totalQuestionsSpan, mode === "classic" ? shuffledQuestions.length : "Infini");

  if (mode === "contre-la-montre") {
    showElement(globalTimerDiv);
    globalTimeLeft = 60; 
    setText(globalTimeLeftSpan, globalTimeLeft);

    globalTimerId = setInterval(() => {
      globalTimeLeft--;
      setText(globalTimeLeftSpan, globalTimeLeft);
      if (globalTimeLeft <= 0) {
        clearInterval(globalTimerId);
        endQuiz();
      }
    }, 1000);
  } else {
    hideElement(globalTimerDiv);
  }

  showQuestion();
}

function showQuestion() {
  clearInterval(timerId);
  const mode = getSelectedMode();
  
  const questionIndex = mode === "classic" ? currentQuestionIndex : Math.floor(Math.random() * shuffledQuestions.length);
  const q = shuffledQuestions[questionIndex];
  
  setText(questionText, q.text);
  setText(currentQuestionIndexSpan, currentQuestionIndex + 1);

  updateProgressBar();

  answersDiv.innerHTML = "";

  q.answers.forEach((answer, index) => {
    const btn = createAnswerButton(answer, () => selectAnswer(index, btn, q));

    answersDiv.appendChild(btn);
  });

  nextBtn.classList.add("hidden");

   const timeLimit = q.timeLimit;
  timerCircle.style.strokeDasharray = "283";
  timerCircle.style.strokeDashoffset = "0";
  timerCircleWrapper.classList.remove("warning", "danger");

timeLeftSpan.textContent = timeLimit;
  timerId = startTimer(
    timeLimit,
    (timeLeft) => {
      setText(timeLeftSpan, timeLeft);
      // 🆕 Animer le cercle
      updateTimerCircle(timeLeft, timeLimit);
    },
    () => {
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

function selectAnswer(index, btn, q) {
  clearInterval(timerId);
  
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
  if (mode === "classic") {
    currentQuestionIndex++;
    if (currentQuestionIndex < shuffledQuestions.length) {
      showQuestion();
    } else {
      endQuiz();
    }
  } else if (mode === "infinite" || mode === "contre-la-montre") {
    currentQuestionIndex = Math.floor(Math.random() * shuffledQuestions.length);
    showQuestion();
  }
}

function endQuiz() {
  clearInterval(globalTimerId);
  clearInterval(timerId);

  hideElement(questionScreen);
  showElement(resultScreen);

  const total = selectedMode === "classic" ? shuffledQuestions.length : userAnswers.length;
  updateScoreDisplay(scoreText, score, total);

  if (score > bestScore) {
    bestScore = score;
    saveToLocalStorage("bestScore", bestScore);
  }
  setText(bestScoreEnd, bestScore);

  // Mise à jour des stats globales
  totalCorrectAnswers += score;
  saveToLocalStorage("totalCorrectAnswers", totalCorrectAnswers);

  checkBadges();
  showRecapTable();
}

function checkBadges() {
  let newBadgeUnlocked = false;

  for (const badge of badgesDefinitions) {
    if (badgesUnlocked.includes(badge.id)) continue;

    if (isBadgeConditionMet(badge.id)) {
      badgesUnlocked.push(badge.id);
      newBadgeUnlocked = true;
      alert(`🎉 Bravo ! Vous avez débloqué le badge : ${badge.name}`);
    }
  }

  if (newBadgeUnlocked) {
    saveToLocalStorage("badgesUnlocked", badgesUnlocked);
    displayBadges();
  }
}

function isBadgeConditionMet(badgeId) {
  if (badgeId === "first_game") {
    return true; 
  }
  if (badgeId === "perfect_score") {
    return score === shuffledQuestions.length && score > 0;
  }
  if (badgeId === "ten_correct") {
    return totalCorrectAnswers >= 10;
  }
  return false;
}

function displayBadges() {
  badgesContainer.innerHTML = "";
  for (const badge of badgesDefinitions) {
    const badgeEl = document.createElement("div");
    badgeEl.className = "badge";
    
    if (badgesUnlocked.includes(badge.id)) {
      badgeEl.classList.add("unlocked");
      badgeEl.title = badge.description;
      badgeEl.innerHTML = `<span>${badge.icon}</span> <p>${badge.name}</p>`;
    } else {
      badgeEl.classList.add("locked");
      badgeEl.title = "???";
      badgeEl.innerHTML = `<span>🔒</span> <p>???</p>`;
    }
    
    badgesContainer.appendChild(badgeEl);
  }
}

function showRecapTable() {
  recapTbody.innerHTML = "";

  for (const answer of userAnswers) {
    const row = document.createElement("tr");
    row.className = answer.isCorrect ? "recap-row-correct" : "recap-row-wrong";

    const questionCell = document.createElement("td");
    questionCell.textContent = answer.questionText;
    row.appendChild(questionCell);

    const userAnswerCell = document.createElement("td");
    const userAnswerSpan = document.createElement("span");
    userAnswerSpan.textContent = answer.userAnswerText;
    userAnswerSpan.className = answer.isCorrect ? "answer-correct" : "answer-wrong";
    userAnswerCell.appendChild(userAnswerSpan);
    row.appendChild(userAnswerCell);

    const correctAnswerCell = document.createElement("td");
    const correctAnswerSpan = document.createElement("span");
    correctAnswerSpan.textContent = answer.correctAnswerText;
    correctAnswerSpan.className = "answer-correct";
    correctAnswerCell.appendChild(correctAnswerSpan);
    row.appendChild(correctAnswerCell);

    const resultCell = document.createElement("td");
    resultCell.textContent = answer.isCorrect ? "✅" : "❌";
    resultCell.className = "result-icon";
    row.appendChild(resultCell);

    recapTbody.appendChild(row);
  }
}

function restartQuiz() {
  clearInterval(globalTimerId);
  clearInterval(timerId);

  hideElement(resultScreen);
  showElement(introScreen);

  setText(bestScoreValue, bestScore);
  displayBadges();
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