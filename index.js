const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = 'courses.db';

// --- Database Connection ---
const db = new sqlite3.Database(DB_FILE, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the read-only SQLite database.');
    }
});

// --- Middleware ---
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints ---

// Helper function to query the database
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

// Regex to find course codes like CSC123H1 or MAT123Y1
const COURSE_CODE_REGEX = /[A-Z]{3}\d{3}[HY][01]/g;

// Endpoint to fetch all courses for dropdown
app.get('/api/courses', async (req, res) => {
    try {
        const rows = await query('SELECT code, title FROM courses ORDER BY code');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching courses list:', err);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Modify edges in /api/graph/:courseCode
app.get('/api/graph/:courseCode', async (req, res) => {
    const rootCourseCode = req.params.courseCode.toUpperCase();
    const nodes = new Map();
    const edges = [];
    const queue = [rootCourseCode];
    const processed = new Set();

    // Function to add a node if it doesn't exist
    const addNode = (course, level = 0, nodeType = 'unexplored') => {
        if (!nodes.has(course.code)) {
            nodes.set(course.code, {
                id: course.code,
                label: course.code, // Only show course code
                title: course.title, // Show only course title on hover
                group: nodeType,
                level: level, // For hierarchical layout
                courseData: {
                    code: course.code,
                    title: course.title,
                    description: course.description
                }
            });
        }
    };

    // 1. Process Prerequisites (Backward graph) - Upper levels
    let currentLevel = 0;
    while (queue.length > 0) {
        const currentCode = queue.shift();
        if (processed.has(currentCode)) {
            continue;
        }
        processed.add(currentCode);

        const courses = await query('SELECT * FROM courses WHERE code = ?', [currentCode]);
        if (courses.length === 0) continue;
        
        const course = courses[0];
        addNode(course, currentLevel, currentCode === rootCourseCode ? 'root' : 'explored');

        const textToSearch = `${course.prerequisites || ''} ${course.corequisites || ''}`;
        const prereqCodes = textToSearch.match(COURSE_CODE_REGEX) || [];

        for (const prereqCode of prereqCodes) {
            const prereqCourses = await query('SELECT * FROM courses WHERE code = ?', [prereqCode]);
            if (prereqCourses.length > 0) {
                const prereqCourse = prereqCourses[0];
                addNode(prereqCourse, currentLevel - 1, 'explored'); // Prerequisites at upper level
                edges.push({
                    from: prereqCourse.code,
                    to: currentCode,
                    arrows: { to: { enabled: true, type: 'arrow' } },
                    color: { color: '#0071e3' },
                    width: 2
                });
                if (!processed.has(prereqCourse.code)) {
                    queue.push(prereqCourse.code);
                }
            }
        }
        currentLevel--;
    }

    // 2. Process Post-requisites (Forward graph) - Lower levels
    const allCourses = await query('SELECT code, title, description, prerequisites, corequisites FROM courses');
    for (const course of allCourses) {
        const textToSearch = `${course.prerequisites || ''} ${course.corequisites || ''}`;
        if (textToSearch.includes(rootCourseCode)) {
            addNode(course, 1, 'unexplored'); // Post-requisites at lower level
            edges.push({
                from: rootCourseCode,
                to: course.code,
                arrows: { to: { enabled: true, type: 'arrow' } },
                color: { color: '#27ae60' },
                width: 2
            });
        }
    }
    
    // 3. Process Exclusions - Same level, distributed left and right
    const rootCourseData = await query('SELECT exclusion FROM courses WHERE code = ?', [rootCourseCode]);
    if (rootCourseData.length > 0 && rootCourseData[0].exclusion) {
        const exclusionCodes = rootCourseData[0].exclusion.match(COURSE_CODE_REGEX) || [];
        for (const excludedCode of exclusionCodes) {
             const excludedCourses = await query('SELECT * FROM courses WHERE code = ?', [excludedCode]);
             if (excludedCourses.length > 0) {
                 const excludedCourse = excludedCourses[0];
                 // Check if node already exists, update its type if so
                 if (nodes.has(excludedCourse.code)) {
                     nodes.get(excludedCourse.code).group = 'exclusion';
                 } else {
                     addNode(excludedCourse, 0, 'exclusion'); // Exclusions at same level as root
                 }
                 
                 // Check if edge already exists to avoid duplicates
                 const existingEdge = edges.find(e => 
                     e.from === rootCourseCode && e.to === excludedCourse.code
                 );
                 if (!existingEdge) {
                     edges.push({
                         from: rootCourseCode,
                         to: excludedCourse.code,
                         arrows: { to: { enabled: true, type: 'arrow' } },
                         dashes: true,
                         color: { color: '#999999' },
                         width: 1
                     });
                 }
             }
        }
    }

    res.json({ nodes: Array.from(nodes.values()), edges });
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Navigate to the URL in your browser to use the Course Planner.');
}); 