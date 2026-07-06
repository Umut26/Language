// ---- Yardımcı: Fisher-Yates shuffle ----
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- "Shuffle bag": havuz bitmeden hiçbir öğe tekrar etmez ----
function createBag(items) {
  let bag = [];
  return {
    draw(count) {
      const drawn = [];
      while (drawn.length < count) {
        if (bag.length === 0) bag = shuffle(items);
        drawn.push(bag.pop());
      }
      return drawn;
    },
  };
}

function matchesLevel(item, level) {
  return level === "all" || item.level === level;
}

function poolFor(filter, level) {
  return PARAGRAPHS.filter((p) => (filter === "all" || p.category === filter) && matchesLevel(p, level));
}

const categoryLabels = {
  story: "Hikaye",
  engineering: "Mühendislik",
  technology: "Teknoloji",
};

// ---- Seviye seçici: Words, Reading ve Listening sekmelerini birlikte etkiler ----
let currentLevel = "all";
const levelButtons = document.querySelectorAll(".level-btn");

levelButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    levelButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentLevel = btn.dataset.level;
    renderWords();
    renderReading();
    renderListening();
  });
});

// ---- Kelime tıklama: metindeki her kelimeyi tıklanabilir yapar ----
function translateWord(word) {
  const key = word.toLowerCase();
  if (GLOSSARY[key]) return GLOSSARY[key];
  if (key.endsWith("'s") && GLOSSARY[key.slice(0, -2)]) {
    return GLOSSARY[key.slice(0, -2)] + " (iyelik)";
  }
  return "çevirisi bulunamadı";
}

function wrapWords(text) {
  return text.replace(/[A-Za-z]+(?:'[A-Za-z]+)?/g, (match) => {
    return `<span class="w" data-word="${match.toLowerCase()}">${match}</span>`;
  });
}

const wordTooltip = document.createElement("div");
wordTooltip.className = "word-tooltip";
document.body.appendChild(wordTooltip);

function showWordTooltip(span, text) {
  wordTooltip.textContent = text;
  wordTooltip.classList.add("visible");
  const rect = span.getBoundingClientRect();
  const tooltipWidth = wordTooltip.offsetWidth;
  const maxLeft = window.innerWidth - tooltipWidth - 8;
  const left = Math.max(8, Math.min(rect.left + window.scrollX, maxLeft + window.scrollX));
  wordTooltip.style.left = `${left}px`;
  wordTooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
}

function hideWordTooltip() {
  wordTooltip.classList.remove("visible");
}

document.addEventListener("click", (e) => {
  const span = e.target.closest(".w");
  if (!span) {
    hideWordTooltip();
    return;
  }
  e.stopPropagation();
  const tr = span.dataset.tr || translateWord(span.dataset.word);
  showWordTooltip(span, tr);
});

// ---- Sekme geçişi ----
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    tabPanels.forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.getElementById(btn.dataset.tab).classList.add("active");
    hideWordTooltip();

    if (btn.dataset.tab !== "listening") {
      speechSynthesis.cancel();
      setPlayButtonState(false);
    }
  });
});

// ---- Words sekmesi ----
const WORDS_PER_PAGE = 6;
let wordsBags = {};
function getWordsBag(level) {
  if (!wordsBags[level]) {
    const pool = level === "all" ? WORDS : WORDS.filter((w) => w.level === level);
    wordsBags[level] = createBag(pool);
  }
  return wordsBags[level];
}

const wordsGrid = document.getElementById("words-grid");
const toggleTr = document.getElementById("toggle-tr");
const refreshWordsBtn = document.getElementById("refresh-words");

function renderWordCard(item) {
  const card = document.createElement("div");
  card.className = "word-card";
  card.innerHTML = `
    <p class="en-word"><span class="w" data-tr="${item.tr}">${item.word}</span><span class="level-tag ${item.level.toLowerCase()}">${item.level}</span></p>
    <p class="tr-word ${toggleTr.checked ? "" : "hidden"}">${item.tr}</p>
    <div class="word-row">
      <span>Eş anlamlı:</span>
      <span class="chip-list">${item.syn.map((s) => `<span class="chip syn">${s}</span>`).join("")}</span>
    </div>
    <div class="word-row">
      <span>Zıt anlamlı:</span>
      <span class="chip-list">${item.ant.map((a) => `<span class="chip ant">${a}</span>`).join("")}</span>
    </div>
    <div class="example-box">
      <p class="ex-en">"${wrapWords(item.ex)}"</p>
      <p class="ex-tr ${toggleTr.checked ? "" : "hidden"}">${item.exTr}</p>
    </div>
  `;
  return card;
}

function renderWords() {
  const picked = getWordsBag(currentLevel).draw(WORDS_PER_PAGE);
  wordsGrid.innerHTML = "";
  picked.forEach((item) => wordsGrid.appendChild(renderWordCard(item)));
}

refreshWordsBtn.addEventListener("click", renderWords);
toggleTr.addEventListener("change", () => {
  document.querySelectorAll(".tr-word, .ex-tr").forEach((el) => {
    el.classList.toggle("hidden", !toggleTr.checked);
  });
});

// ---- Reading sekmesi ----
let readingBags = {};
function getReadingBag(filter, level) {
  const key = `${level}-${filter}`;
  if (!readingBags[key]) readingBags[key] = createBag(poolFor(filter, level));
  return readingBags[key];
}

const readingCard = document.getElementById("reading-card");
const refreshReadingBtn = document.getElementById("refresh-reading");
const toggleReadingTr = document.getElementById("toggle-reading-tr");
const readingFilterButtons = document.querySelectorAll("#reading .filter-btn");
let currentReadingFilter = "all";

function renderReading() {
  const [item] = getReadingBag(currentReadingFilter, currentLevel).draw(1);
  readingCard.innerHTML = `
    <span class="badge ${item.category}">${categoryLabels[item.category]}</span>
    <span class="level-tag ${item.level.toLowerCase()}">${item.level}</span>
    <h2>${wrapWords(item.title)}</h2>
    <h3>${item.titleTr}</h3>
    <p class="en-text">${wrapWords(item.en)}</p>
    <p class="tr-text ${toggleReadingTr.checked ? "" : "hidden"}">${item.tr}</p>
  `;
}

refreshReadingBtn.addEventListener("click", renderReading);

toggleReadingTr.addEventListener("change", () => {
  const trText = readingCard.querySelector(".tr-text");
  if (trText) trText.classList.toggle("hidden", !toggleReadingTr.checked);
});

readingFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    readingFilterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentReadingFilter = btn.dataset.filter;
    renderReading();
  });
});

// ---- Listening sekmesi ----
let listeningBags = {};
function getListeningBag(filter, level) {
  const key = `${level}-${filter}`;
  if (!listeningBags[key]) listeningBags[key] = createBag(poolFor(filter, level));
  return listeningBags[key];
}

const listeningCard = document.getElementById("listening-card");
const refreshListeningBtn = document.getElementById("refresh-listening");
const playListeningBtn = document.getElementById("play-listening");
const toggleListeningText = document.getElementById("toggle-listening-text");
const listeningFilterButtons = document.querySelectorAll("#listening .filter-btn");
let currentListeningFilter = "all";
let currentListeningItem = null;

const speechSupported = "speechSynthesis" in window;

function setPlayButtonState(isSpeaking) {
  playListeningBtn.textContent = isSpeaking ? "⏹️ Durdur" : "▶️ Dinle";
}

function renderListening() {
  speechSynthesis.cancel();
  setPlayButtonState(false);
  [currentListeningItem] = getListeningBag(currentListeningFilter, currentLevel).draw(1);
  const item = currentListeningItem;
  listeningCard.innerHTML = `
    <span class="badge ${item.category}">${categoryLabels[item.category]}</span>
    <span class="level-tag ${item.level.toLowerCase()}">${item.level}</span>
    <h2>${wrapWords(item.title)}</h2>
    <h3>${item.titleTr}</h3>
    <p class="en-text listening-text ${toggleListeningText.checked ? "" : "hidden"}">${wrapWords(item.en)}</p>
  `;
}

function toggleSpeech() {
  if (!speechSupported) {
    alert("Tarayıcınız sesli okumayı desteklemiyor.");
    return;
  }
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    setPlayButtonState(false);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(currentListeningItem.en);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.onend = () => setPlayButtonState(false);
  utterance.onerror = () => setPlayButtonState(false);
  speechSynthesis.speak(utterance);
  setPlayButtonState(true);
}

refreshListeningBtn.addEventListener("click", renderListening);
playListeningBtn.addEventListener("click", toggleSpeech);

toggleListeningText.addEventListener("change", () => {
  const text = listeningCard.querySelector(".listening-text");
  if (text) text.classList.toggle("hidden", !toggleListeningText.checked);
});

listeningFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    listeningFilterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentListeningFilter = btn.dataset.filter;
    renderListening();
  });
});

// ---- İlk yükleme ----
renderWords();
renderReading();
renderListening();
