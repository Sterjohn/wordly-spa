// index.js - Wordly Dictionary App

// ── Step 1: Get references to HTML elements ──
var form     = document.getElementById('searchForm');
var input    = document.getElementById('searchInput');
var btn      = document.getElementById('searchBtn');
var loader   = document.getElementById('loader');
var errorMsg = document.getElementById('errorMsg');
var result   = document.getElementById('result');
var audio    = document.getElementById('audioPlayer');

// ── Step 2: Track the current audio URL ──
var currentAudioUrl = null;

// ── Step 3: Helper functions ──

// Show or hide the loading spinner
function setLoading(on) {
  if (on) {
    loader.classList.add('visible');
    btn.disabled = true;
  } else {
    loader.classList.remove('visible');
    btn.disabled = false;
  }
}

// Show an error message on the page
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
  result.classList.remove('visible');
  result.innerHTML = '';
}

// Hide the error message
function clearError() {
  errorMsg.classList.remove('visible');
  errorMsg.textContent = '';
}

// Play the pronunciation audio
function playAudio() {
  if (!currentAudioUrl) return;
  audio.src = currentAudioUrl;
  audio.play();
}

// Make text safe to put inside HTML
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Step 4: Build and display the results ──
function renderResult(data) {

  var entry      = data[0];
  var word       = entry.word       || '';
  var phonetics  = entry.phonetics  || [];
  var meanings   = entry.meanings   || [];
  var sourceUrls = entry.sourceUrls || [];

  // Find the first phonetic text and audio URL
  var phoneticText = '';
  var audioUrl = '';
  for (var i = 0; i < phonetics.length; i++) {
    if (!phoneticText && phonetics[i].text)  phoneticText = phonetics[i].text;
    if (!audioUrl     && phonetics[i].audio) audioUrl     = phonetics[i].audio;
  }
  currentAudioUrl = audioUrl || null;

  // Build the audio button (only if audio is available)
  var audioBtnHtml = '';
  if (currentAudioUrl) {
    audioBtnHtml = '<button class="audio-btn" id="audioBtn">';
    audioBtnHtml += '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
    audioBtnHtml += '</button>';
  }

  // Build the phonetic text
  var phoneticHtml = '';
  if (phoneticText) {
    phoneticHtml = '<p class="phonetic">' + escHtml(phoneticText) + '</p>';
  }

  // Build each meaning block
  var allMeanings = [];
  for (var m = 0; m < meanings.length; m++) {
    var meaning = meanings[m];
    var pos  = meaning.partOfSpeech || '';
    var defs = meaning.definitions  || [];

    // Show max 4 definitions
    if (defs.length > 4) {
      defs = defs.slice(0, 4);
    }

    // Build definition list items
    var defItems = '';
    for (var d = 0; d < defs.length; d++) {
      var def = defs[d];
      var exHtml = '';
      if (def.example) {
        exHtml = '<p class="def-example">' + escHtml(def.example) + '</p>';
      }
      defItems += '<li class="def-item">';
      defItems += '<p class="def-text">' + escHtml(def.definition) + '</p>';
      defItems += exHtml;
      defItems += '</li>';
    }

    // Collect synonyms
    var allSyns = [];
    if (meaning.synonyms) {
      allSyns = allSyns.concat(meaning.synonyms);
    }
    for (var s = 0; s < defs.length; s++) {
      if (defs[s].synonyms) {
        allSyns = allSyns.concat(defs[s].synonyms);
      }
    }
    var uniqueSyns = Array.from(new Set(allSyns)).slice(0, 8);

    // Build synonym pills
    var synsHtml = '';
    if (uniqueSyns.length > 0) {
      synsHtml = '<div class="synonyms-section"><span class="synonyms-label">Synonyms</span>';
      for (var sp = 0; sp < uniqueSyns.length; sp++) {
        synsHtml += '<button class="synonym-pill" data-word="' + escHtml(uniqueSyns[sp]) + '">' + escHtml(uniqueSyns[sp]) + '</button>';
      }
      synsHtml += '</div>';
    }

    // Put the meaning block together
    var block = '<div class="meaning-block">';
    block += '<span class="pos-tag">' + escHtml(pos) + '</span>';
    block += '<ul class="definitions">' + defItems + '</ul>';
    block += synsHtml;
    block += '</div>';
    allMeanings.push(block);
  }

  var meaningsHtml = allMeanings.join('<hr class="divider" />');

  // Build the source link
  var sourceHtml = '';
  if (sourceUrls.length > 0) {
    sourceHtml = '<p class="source-line">Source: <a href="' + escHtml(sourceUrls[0]) + '" target="_blank">' + escHtml(sourceUrls[0]) + '</a></p>';
  }

  // Put it all together and inject into the page
  result.innerHTML =
    '<div class="word-header">' +
      '<h1 class="word-title">' + escHtml(word) + '</h1>' +
      audioBtnHtml +
    '</div>' +
    phoneticHtml +
    '<div class="meanings">' + meaningsHtml + '</div>' +
    sourceHtml;

  // Fade the result in
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      result.classList.add('visible');
    });
  });

  // Add click listener to the audio button
  var audioBtn = document.getElementById('audioBtn');
  if (audioBtn) {
    audioBtn.addEventListener('click', playAudio);
  }

  // Add click listeners to synonym pills
  var pills = result.querySelectorAll('.synonym-pill');
  for (var pi = 0; pi < pills.length; pi++) {
    pills[pi].addEventListener('click', function() {
      var w = this.dataset.word;
      if (w) {
        input.value = w;
        fetchWord(w);
      }
    });
  }
}

// ── Step 5: Fetch data from the API ──
async function fetchWord(word) {
  clearError();
  result.classList.remove('visible');
  setLoading(true);

  try {
    var res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));

    if (res.status === 404) {
      showError('No definition found for "' + word + '". Check the spelling and try again.');
      return;
    }
    if (!res.ok) {
      showError('Something went wrong. Please try again.');
      return;
    }

    var data = await res.json();
    renderResult(data);

  } catch (err) {
    showError('Network error - please check your connection and try again.');
  } finally {
    setLoading(false);
  }
}

// ── Step 6: Listen for form submission ──
form.addEventListener('submit', function(e) {
  e.preventDefault();
  var word = input.value.trim();
  if (!word) {
    showError('Please enter a word to search.');
    input.focus();
    return;
  }
  fetchWord(word);
});

// Also trigger search when Enter key is pressed
input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    form.dispatchEvent(new Event('submit'));
  }
});

// ── Step 7: Focus the input when the page loads ──
input.focus();
