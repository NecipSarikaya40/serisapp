let words = [];
let learnedIds = new Set();
let openedCards = {};
let currentSlideIndex = 0;
let savedSlideIndex = 0;
let activeTab = "all";

const SLIDE_STORAGE_KEY = "serisAppCurrentSlideIndex";
const LEARNED_STORAGE_KEY = "serisAppLearnedWordIds";

const cardsContainer = document.getElementById("cardsContainer");
const learnedContainer = document.getElementById("learnedContainer");
const totalCount = document.getElementById("totalCount");
const learnedCount = document.getElementById("learnedCount");
const searchInput = document.getElementById("searchInput");
const resetBtn = document.getElementById("resetBtn");
const emptyMessage = document.getElementById("emptyMessage");
const learnedEmptyMessage = document.getElementById("learnedEmptyMessage");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const slideCounter = document.getElementById("slideCounter");
const allTab = document.getElementById("allTab");
const learnedTab = document.getElementById("learnedTab");
const learnedSection = document.getElementById("learnedSection");

async function loadWords() {
  try {
    const response = await fetch("words.json");

    if (!response.ok) {
      throw new Error("words.json could not be loaded");
    }

    words = (await response.json()).sort(compareByWord);
    learnedIds = getSavedLearnedIds();
    savedSlideIndex = getSavedSlideIndex();
    currentSlideIndex = savedSlideIndex;
    setActiveTab("all");
  } catch (error) {
    cardsContainer.innerHTML = `
      <div class="card">
        <h2>Veriler yüklenemedi</h2>
        <p class="question">
          Bu uygulamayı direkt dosyadan açtıysan tarayıcı JSON okumayı engelleyebilir.
          VS Code Live Server veya basit bir local server kullan.
        </p>
      </div>
    `;
    console.error(error);
  }
}

function getSavedSlideIndex() {
  const value = Number(localStorage.getItem(SLIDE_STORAGE_KEY));
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function getSavedLearnedIds() {
  try {
    const value = JSON.parse(localStorage.getItem(LEARNED_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(value) ? value.filter((id) => Number.isInteger(id)) : []);
  } catch {
    return new Set();
  }
}

function saveLearnedIds() {
  localStorage.setItem(LEARNED_STORAGE_KEY, JSON.stringify([...learnedIds]));
}

function setActiveTab(tab) {
  activeTab = tab;
  const isAllTab = tab === "all";

  allTab.classList.toggle("active", isAllTab);
  learnedTab.classList.toggle("active", !isAllTab);
  allTab.setAttribute("aria-selected", isAllTab);
  learnedTab.setAttribute("aria-selected", !isAllTab);

  currentSlideIndex = 0;

  cardsContainer.classList.toggle("hidden", !isAllTab);
  emptyMessage.classList.toggle("hidden", isAllTab && getFilteredWords().length > 0);
  learnedSection.classList.toggle("hidden", isAllTab);
  renderCards();
}

function saveSlideIndex(index) {
  if (!isSearching()) {
    savedSlideIndex = index;
    localStorage.setItem(SLIDE_STORAGE_KEY, String(index));
  }
}

function isSearching() {
  return searchInput.value.trim().length > 0;
}

function compareByWord(a, b) {
  return String(a.word)
    .localeCompare(String(b.word), "tr", { sensitivity: "base" });
}

function getFilteredWords() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const list = activeTab === "learned" ? getLearnedWords() : getUnlearnedWords();

  return list.filter((item) => {
    const word = String(item.word || "").toLowerCase();
    const meaning = String(item.meaning || "").toLowerCase();
    const example = String(item.example || "").toLowerCase();

    const matchesSearch =
      word.includes(searchTerm) ||
      meaning.includes(searchTerm) ||
      example.includes(searchTerm);

    return matchesSearch;
  });
}

function getUnlearnedWords() {
  return words
    .filter((item) => !learnedIds.has(item.id))
    .sort(compareByWord);
}

function getLearnedWords() {
  return words
    .filter((item) => learnedIds.has(item.id))
    .sort(compareByWord);
}

function renderCards() {
  const filteredWords = getFilteredWords();

  cardsContainer.innerHTML = "";
  totalCount.textContent = filteredWords.length;

  if (activeTab === "learned") {
    emptyMessage.classList.add("hidden");
    renderLearnedWords(filteredWords);
    return;
  }

  filteredWords.forEach((item) => {
    const isOpen = openedCards[item.id] ? "show-answer" : "";
    const card = document.createElement("article");

    card.className = `card ${isOpen}`;
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="card-top">
        <h2 class="word">${item.word}</h2>

        <button
          class="sound-btn"
          type="button"
          aria-label="${item.word} kelimesini seslendir"
          title="Telaffuzu dinle"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z"></path>
            <path d="M16.5 8.5a5 5 0 0 1 0 7"></path>
            <path d="M18.8 6.2a8.2 8.2 0 0 1 0 11.6"></path>
          </svg>
        </button>
      </div>

      <p class="pronunciation">${item.pronunciation || ""}</p>
      <p class="question">${item.question || "Bu kelimenin anlamı nedir?"}</p>

      <div class="answer">
        <strong>Meaning:</strong> ${item.meaning}<br>
        <strong>Example:</strong> ${item.example}
      </div>

      <div class="card-actions">
        <button class="show-answer-btn" type="button">
          ${openedCards[item.id] ? "Anlamı Gizle" : "Anlamı Göster"}
        </button>
        <button class="learn-btn" type="button">Öğrendim</button>
      </div>
    `;

    const soundBtn = card.querySelector(".sound-btn");
    const showAnswerBtn = card.querySelector(".show-answer-btn");
    const learnBtn = card.querySelector(".learn-btn");

    soundBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      speakWord(item.word);
    });

    showAnswerBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCard(item.id);
    });

    learnBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      markAsLearned(item.id);
    });

    cardsContainer.appendChild(card);
  });

  if (currentSlideIndex >= filteredWords.length) {
    currentSlideIndex = Math.max(filteredWords.length - 1, 0);
  }

  emptyMessage.classList.toggle("hidden", filteredWords.length > 0);
  updateSliderCounter(filteredWords.length);
  renderLearnedWords();

  if (isMobileSlider()) {
    requestAnimationFrame(() => {
      scrollToSlide(currentSlideIndex, "auto", false);
    });
  }
}

function speakWord(word) {
  if (!("speechSynthesis" in window)) {
    alert("Tarayıcın seslendirmeyi desteklemiyor.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

function toggleCard(id) {
  openedCards[id] = !openedCards[id];
  renderCards();
}

function markAsLearned(id) {
  learnedIds.add(id);
  saveLearnedIds();
  if (openedCards[id]) {
    delete openedCards[id];
  }
  renderCards();
  renderLearnedWords();
}

function renderLearnedWords(wordsToRender = getLearnedWords()) {
  const learnedWords = wordsToRender;

  learnedContainer.innerHTML = "";
  learnedCount.textContent = learnedWords.length;

  learnedWords.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card learned-card show-answer";

    card.innerHTML = `
      <div class="card-top">
        <h2 class="word">${item.word}</h2>

        <button
          class="sound-btn"
          type="button"
          aria-label="${item.word} kelimesini seslendir"
          title="Telaffuzu dinle"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z"></path>
            <path d="M16.5 8.5a5 5 0 0 1 0 7"></path>
            <path d="M18.8 6.2a8.2 8.2 0 0 1 0 11.6"></path>
          </svg>
        </button>
      </div>

      <p class="pronunciation">${item.pronunciation || ""}</p>
      <p class="question">${item.question || "Bu kelimenin anlamı nedir?"}</p>

      <div class="answer">
        <strong>Meaning:</strong> ${item.meaning}<br>
        <strong>Example:</strong> ${item.example}
      </div>

      <div class="learned-badge">Öğrendi</div>
    `;

    const soundBtn = card.querySelector(".sound-btn");
    soundBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      speakWord(item.word);
    });

    learnedContainer.appendChild(card);
  });

  learnedEmptyMessage.classList.toggle("hidden", learnedWords.length > 0);
}

function resetCards() {
  openedCards = {};
  searchInput.value = "";
  currentSlideIndex = savedSlideIndex;
  renderCards();
}

function isMobileSlider() {
  return window.matchMedia("(max-width: 620px)").matches;
}

function getActiveContainer() {
  return activeTab === "learned" ? learnedContainer : cardsContainer;
}

function scrollToSlide(index, behavior = "smooth", shouldSave = true) {
  const container = getActiveContainer();
  const cards = container.querySelectorAll(".card");
  if (!cards.length) return;

  const safeIndex = Math.max(0, Math.min(index, cards.length - 1));
  currentSlideIndex = safeIndex;

  if (isMobileSlider()) {
    cards[safeIndex].scrollIntoView({
      behavior,
      inline: "center",
      block: "nearest"
    });
  }

  if (shouldSave && isMobileSlider() && activeTab === "all") {
    saveSlideIndex(safeIndex);
  }

  updateSliderCounter(cards.length);
}

function updateSliderCounter(total) {
  if (!slideCounter) return;

  if (!total) {
    slideCounter.textContent = "0 / 0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  slideCounter.textContent = `${currentSlideIndex + 1} / ${total}`;
  prevBtn.disabled = currentSlideIndex === 0;
  nextBtn.disabled = currentSlideIndex === total - 1;
}

function updateCurrentSlideFromScroll() {
  if (!isMobileSlider()) return;

  const container = getActiveContainer();
  const cards = [...container.querySelectorAll(".card")];
  if (!cards.length) return;

  const containerCenter = container.scrollLeft + container.clientWidth / 2;

  let closestIndex = 0;
  let closestDistance = Infinity;

  cards.forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const distance = Math.abs(containerCenter - cardCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  currentSlideIndex = closestIndex;

  if (!isSearching() && activeTab === "all") {
    saveSlideIndex(closestIndex);
  }

  updateSliderCounter(cards.length);
}

searchInput.addEventListener("input", () => {
  if (isSearching()) {
    currentSlideIndex = 0;
  } else {
    currentSlideIndex = savedSlideIndex;
  }

  renderCards();
});

resetBtn.addEventListener("click", resetCards);

allTab.addEventListener("click", () => setActiveTab("all"));
learnedTab.addEventListener("click", () => setActiveTab("learned"));

prevBtn.addEventListener("click", () => {
  scrollToSlide(currentSlideIndex - 1, "smooth", true);
});

nextBtn.addEventListener("click", () => {
  scrollToSlide(currentSlideIndex + 1, "smooth", true);
});

const scrollListener = () => {
  if (!isMobileSlider()) return;

  const container = getActiveContainer();
  window.clearTimeout(container.scrollTimer);
  container.scrollTimer = window.setTimeout(updateCurrentSlideFromScroll, 80);
};

cardsContainer.addEventListener("scroll", scrollListener);
learnedContainer.addEventListener("scroll", scrollListener);

window.addEventListener("resize", () => {
  if (isMobileSlider()) {
    currentSlideIndex = isSearching() ? currentSlideIndex : savedSlideIndex;
    scrollToSlide(currentSlideIndex, "auto", false);
  }

  updateSliderCounter(getFilteredWords().length);
});

loadWords();
