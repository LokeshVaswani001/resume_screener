require('dotenv').config();
const express  = require('express');
const multer   = require('multer');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ── Uploads folder ──
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ══════════════════════════════════════════════════════
//  MULTER — File Upload Config (Feature 1)
// ══════════════════════════════════════════════════════
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext     = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed.'));
    }
  },
});

// ══════════════════════════════════════════════════════
//  SKILLS DATABASE — Feature 2
//  Comprehensive list for skill extraction
// ══════════════════════════════════════════════════════
const SKILLS_DB = [
  // Programming Languages
  'javascript','python','java','c++','c#','php','ruby','swift','kotlin','go','rust','typescript','scala','r','matlab',
  // Web Frontend
  'html','css','react','angular','vue','next.js','nuxt','tailwind','bootstrap','sass','jquery','webpack',
  // Web Backend
  'node.js','express','django','flask','spring','laravel','fastapi','asp.net','rails',
  // Databases
  'sql','mysql','postgresql','mongodb','redis','firebase','sqlite','oracle','cassandra','dynamodb',
  // Cloud & DevOps
  'aws','azure','gcp','docker','kubernetes','jenkins','git','github','gitlab','ci/cd','linux','bash',
  // AI & Data
  'machine learning','deep learning','tensorflow','pytorch','keras','scikit-learn','pandas','numpy','nlp',
  'computer vision','data analysis','data science','artificial intelligence','openai','langchain',
  // Mobile
  'android','ios','react native','flutter','xamarin',
  // Tools & Others
  'figma','photoshop','jira','agile','scrum','rest api','graphql','microservices','unit testing',
  'selenium','postman','excel','power bi','tableau','seo','wordpress',
  // Soft Skills
  'communication','leadership','teamwork','problem solving','project management','time management',
  'critical thinking','collaboration','presentation','research',
];

// ══════════════════════════════════════════════════════
//  HELPER: Extract text from file
//  Feature 2: supports PDF, DOCX, TXT
// ══════════════════════════════════════════════════════
async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  }

  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const buffer   = fs.readFileSync(filePath);
      const data     = await pdfParse(buffer);
      return data.text;
    } catch (e) {
      throw new Error('Could not read PDF. Make sure it is not scanned/image-based.');
    }
  }

  if (ext === '.docx') {
    try {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (e) {
      throw new Error('Could not read DOCX file.');
    }
  }

  throw new Error('Unsupported file format.');
}

// ══════════════════════════════════════════════════════
//  HELPER: Extract skills from text
//  Feature 2: Extract Skills
// ══════════════════════════════════════════════════════
function extractSkills(text) {
  const lower  = text.toLowerCase();
  const found  = [];

  SKILLS_DB.forEach(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(lower) && !found.includes(skill)) found.push(skill);
    } catch(e) {
      if (lower.includes(skill.toLowerCase()) && !found.includes(skill)) found.push(skill);
    }
  });

  return found;
}

// ══════════════════════════════════════════════════════
//  HELPER: Match skills & calculate percentage
//  Feature 3 + 4: Match with JD + Output Percentage
// ══════════════════════════════════════════════════════
function matchSkills(resumeSkills, jdSkills) {
  const matched = resumeSkills.filter(skill =>
    jdSkills.some(js => js.toLowerCase() === skill.toLowerCase())
  );

  const missing = jdSkills.filter(skill =>
    !resumeSkills.some(rs => rs.toLowerCase() === skill.toLowerCase())
  );

  const percentage = jdSkills.length > 0
    ? Math.round((matched.length / jdSkills.length) * 100)
    : 0;

  return { matched, missing, percentage };
}

// ══════════════════════════════════════════════════════
//  HELPER: Determine match level
// ══════════════════════════════════════════════════════
function getMatchLevel(percentage) {
  if (percentage >= 80) return { level: 'Excellent Match',  color: 'green'  };
  if (percentage >= 60) return { level: 'Good Match',       color: 'blue'   };
  if (percentage >= 40) return { level: 'Partial Match',    color: 'yellow' };
  return                       { level: 'Low Match',        color: 'red'    };
}

// ══════════════════════════════════════════════════════
//  ROUTE: POST /api/screen
//  Main endpoint — all 4 features
// ══════════════════════════════════════════════════════
app.post('/api/screen', upload.single('resume'), async (req, res) => {

  // Feature 1: Check file uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'No resume file uploaded.' });
  }

  const jobDescription = req.body.jobDescription || '';

  if (!jobDescription.trim()) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Job description is required.' });
  }

  try {
    // Feature 2: Extract text from resume
    const resumeText = await extractText(req.file.path, req.file.originalname);

    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Resume appears to be empty or unreadable. Please upload a text-based PDF or DOCX.');
    }

    // Feature 2: Extract skills from resume
    const resumeSkills = extractSkills(resumeText);

    // Feature 3: Extract skills from Job Description
    const jdSkills = extractSkills(jobDescription);

    if (jdSkills.length === 0) {
      throw new Error('No recognizable skills found in the job description. Please add more technical skills.');
    }

    // Feature 4: Calculate match percentage
    const { matched, missing, percentage } = matchSkills(resumeSkills, jdSkills);
    const matchLevel = getMatchLevel(percentage);

    // Count resume sections
    const sections = {
      hasEmail:      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText),
      hasPhone:      /(\+?\d[\d\s\-().]{7,}\d)/.test(resumeText),
      hasEducation:  /education|university|degree|bachelor|master|phd|college/i.test(resumeText),
      hasExperience: /experience|worked|employment|company|intern|job/i.test(resumeText),
      hasProjects:   /project|built|developed|created|implemented/i.test(resumeText),
    };

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Feature 4: Send result
    res.json({
      success:       true,
      fileName:      req.file.originalname,
      resumeSkills,
      jdSkills,
      matched,
      missing,
      percentage,
      matchLevel,
      sections,
      wordCount:     resumeText.split(/\s+/).length,
    });

  } catch (error) {
    // Clean up file on error
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// ── Multer error handler ──
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  res.status(400).json({ error: err.message });
});

// ══════════════════════════════════════════════════════
//  START SERVER
// ══════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║    Resume Screener AI — Running! ✅       ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  🌐  Open: http://localhost:${PORT}`);
  console.log('  📄  Supports: PDF, DOCX, TXT');
  console.log('  🤖  Features: Upload → Extract → Match → Score');
  console.log('');
});