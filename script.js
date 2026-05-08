// ══════════════════════════════════════════════════════
//  RESUME SCREENER AI — script.js
//  Feature 1: Upload Resumes
//  Feature 2: Extract Skills
//  Feature 3: Match with Job Description
//  Feature 4: Output Match Percentage
// ══════════════════════════════════════════════════════

const API = 'http://localhost:3000/api';

// Screening history stored in memory
let screeningHistory = [];
let selectedFile     = null;

// ── Tab Navigation ──
const tabMeta = {
  screen:  { title: 'Screen Resume',    sub: 'Upload a resume and match it with a job description' },
  history: { title: 'Screening History', sub: 'View all past resume screenings' },
};

function showTab(name, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
  document.getElementById('pageTitle').textContent    = tabMeta[name].title;
  document.getElementById('pageSubtitle').textContent = tabMeta[name].sub;
  if (name === 'history') renderHistory();
}

// ══════════════════════════════════════════════════════
//  FEATURE 1: File Upload Handling
// ══════════════════════════════════════════════════════
function handleFileSelect(input) {
  if (input.files && input.files[0]) {
    selectedFile = input.files[0];
    showFileSelected(selectedFile.name);
  }
}

function showFileSelected(name) {
  document.getElementById('fileSelected').style.display = 'flex';
  document.getElementById('fileName').textContent = name;
  document.getElementById('uploadZone').style.borderColor = 'var(--green)';
}

// Drag & Drop
const zone = document.getElementById('uploadZone');

zone.addEventListener('dragover', e => {
  e.preventDefault();
  zone.classList.add('drag-over');
});

zone.addEventListener('dragleave', () => {
  zone.classList.remove('drag-over');
});

zone.addEventListener('drop', e => {
  e.preventDefault();
  zone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showToast('❌ Only PDF, DOCX, and TXT files allowed.', 'error');
      return;
    }
    selectedFile = file;
    // Set in file input too
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('resumeFile').files = dt.files;
    showFileSelected(file.name);
  }
});

// ══════════════════════════════════════════════════════
//  MAIN: Screen Resume — All 4 Features
// ══════════════════════════════════════════════════════
async function screenResume() {
  const jobDesc = document.getElementById('jobDesc').value.trim();

  // Validation
  if (!selectedFile) {
    showToast('❌ Please upload a resume file first.', 'error');
    return;
  }
  if (!jobDesc) {
    showToast('❌ Please enter a job description.', 'error');
    return;
  }

  // Build form data — Feature 1: Upload
  const formData = new FormData();
  formData.append('resume', selectedFile);
  formData.append('jobDescription', jobDesc);

  // Loading state
  const btn = document.getElementById('screenBtn');
  btn.disabled = true;
  btn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg> Analyzing...`;

  try {
    // Send to backend
    const response = await fetch(`${API}/screen`, {
      method: 'POST',
      body:   formData,
    });

    const data = await response.json();

    if (!response.ok || data.error) throw new Error(data.error);

    // Feature 4: Show results
    showResults(data);

    // Add to history
    screeningHistory.unshift({
      fileName:   data.fileName,
      percentage: data.percentage,
      matchLevel: data.matchLevel,
      matched:    data.matched.length,
      total:      data.jdSkills.length,
      time:       new Date().toLocaleString(),
    });

    showToast('✅ Resume analyzed successfully!', 'success');

  } catch (error) {
    showToast('❌ ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg> Analyze Resume`;
  }
}

// ══════════════════════════════════════════════════════
//  FEATURE 3 + 4: Show Results
// ══════════════════════════════════════════════════════
function showResults(data) {
  const resultCol = document.getElementById('resultCol');
  resultCol.style.display = 'flex';

  // ── Score Circle ──
  document.getElementById('scoreFile').textContent = data.fileName;
  document.getElementById('scoreNumber').textContent = data.percentage + '%';

  // Animate circle
  const circumference = 314;
  const offset = circumference - (data.percentage / 100) * circumference;
  const circle = document.getElementById('progressCircle');
  circle.style.strokeDashoffset = circumference; // reset
  setTimeout(() => { circle.style.strokeDashoffset = offset; }, 100);

  // Color based on score
  const colors = { green: '#22c55e', blue: '#60a5fa', yellow: '#fbbf24', red: '#f87171' };
  circle.style.stroke = colors[data.matchLevel.color] || 'var(--accent)';

  // Match badge
  const badge = document.getElementById('matchBadge');
  badge.textContent  = data.matchLevel.level;
  badge.className    = `match-badge ${data.matchLevel.color}`;

  // ── Resume Info Grid ──
  const sections = data.sections;
  document.getElementById('infoGrid').innerHTML = `
    <div class="info-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${sections.hasEmail ? 'var(--green)' : 'var(--red)'}" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      <span>Email ${sections.hasEmail ? '✓' : '✗'}</span>
    </div>
    <div class="info-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${sections.hasPhone ? 'var(--green)' : 'var(--red)'}" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.61 5c-.11-1.08.61-2.06 1.67-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      <span>Phone ${sections.hasPhone ? '✓' : '✗'}</span>
    </div>
    <div class="info-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${sections.hasEducation ? 'var(--green)' : 'var(--red)'}" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
      <span>Education ${sections.hasEducation ? '✓' : '✗'}</span>
    </div>
    <div class="info-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${sections.hasExperience ? 'var(--green)' : 'var(--red)'}" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      <span>Experience ${sections.hasExperience ? '✓' : '✗'}</span>
    </div>
    <div class="info-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${sections.hasProjects ? 'var(--green)' : 'var(--red)'}" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      <span>Projects ${sections.hasProjects ? '✓' : '✗'}</span>
    </div>
    <div class="info-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      <span>${data.resumeSkills.length} Skills Found</span>
    </div>`;

  // ── Feature 2: Matched Skills ──
  const matchedWrap = document.getElementById('matchedSkills');
  if (data.matched.length > 0) {
    matchedWrap.innerHTML = data.matched.map(s =>
      `<span class="skill-tag matched">✓ ${esc(s)}</span>`
    ).join('');
  } else {
    matchedWrap.innerHTML = `<span class="empty-skills">No matching skills found.</span>`;
  }

  // ── Missing Skills ──
  const missingWrap = document.getElementById('missingSkills');
  if (data.missing.length > 0) {
    missingWrap.innerHTML = data.missing.map(s =>
      `<span class="skill-tag missing">✗ ${esc(s)}</span>`
    ).join('');
  } else {
    missingWrap.innerHTML = `<span class="empty-skills">All required skills matched! 🎉</span>`;
  }

  // ── All Resume Skills ──
  const resumeWrap = document.getElementById('resumeSkills');
  if (data.resumeSkills.length > 0) {
    resumeWrap.innerHTML = data.resumeSkills.map(s =>
      `<span class="skill-tag neutral">${esc(s)}</span>`
    ).join('');
  } else {
    resumeWrap.innerHTML = `<span class="empty-skills">No skills detected in resume.</span>`;
  }

  // Scroll results into view
  resultCol.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ══════════════════════════════════════════════════════
//  HISTORY
// ══════════════════════════════════════════════════════
function renderHistory() {
  const list = document.getElementById('historyList');
  if (!screeningHistory.length) {
    list.innerHTML = '<p class="empty-msg">No screenings yet. Upload a resume to get started!</p>';
    return;
  }

  const colorMap = { green: 'var(--green)', blue: 'var(--blue)', yellow: 'var(--yellow)', red: 'var(--red)' };

  list.innerHTML = screeningHistory.map(h => `
    <div class="history-item">
      <div class="history-icon" style="background:${colorMap[h.matchLevel.color]}22;border:1px solid ${colorMap[h.matchLevel.color]}44;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${colorMap[h.matchLevel.color]}" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="history-info">
        <div class="h-file">${esc(h.fileName)}</div>
        <div class="h-details">${h.matched}/${h.total} skills matched · ${h.matchLevel.level} · ${h.time}</div>
      </div>
      <div class="history-pct" style="color:${colorMap[h.matchLevel.color]};background:${colorMap[h.matchLevel.color]}18;">
        ${h.percentage}%
      </div>
    </div>`).join('');
}

function clearHistory() {
  if (!screeningHistory.length) return;
  if (!confirm('Clear all screening history?')) return;
  screeningHistory = [];
  renderHistory();
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 4000);
}

function esc(t) {
  return String(t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}