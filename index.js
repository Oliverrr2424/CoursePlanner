const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = process.env.DB_FILE || 'courses.db';

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

// Endpoint to fetch postrequisites for a course
app.get('/api/postrequisites/:courseCode', async (req, res) => {
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
                label: course.code,
                title: course.title,
                group: nodeType,
                level: level,
                courseData: {
                    code: course.code,
                    title: course.title,
                    description: course.description
                }
            });
        }
    };

    // 1. Add root course
    const rootCourses = await query('SELECT * FROM courses WHERE code = ?', [rootCourseCode]);
    if (rootCourses.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
    }
    
    const rootCourse = rootCourses[0];
    addNode(rootCourse, 0, 'root');

    // 2. Find all courses that have this course as a prerequisite
    const allCourses = await query('SELECT code, title, description, prerequisites, corequisites FROM courses');
    const postrequisites = [];
    
    for (const course of allCourses) {
        if (course.code === rootCourseCode) continue;
        
        const textToSearch = `${course.prerequisites || ''} ${course.corequisites || ''}`;
        if (textToSearch.includes(rootCourseCode)) {
            postrequisites.push(course);
        }
    }

    // 3. Organize postrequisites by level (direct vs indirect)
    let currentLevel = 1;
    const levelMap = new Map();
    levelMap.set(0, [rootCourse]);
    levelMap.set(1, postrequisites);

    // 4. Find higher-level postrequisites (courses that require the postrequisites)
    for (let level = 1; level <= 3; level++) { // Limit to 3 levels deep
        const currentLevelCourses = levelMap.get(level) || [];
        const nextLevelCourses = [];
        
        for (const currentCourse of currentLevelCourses) {
            for (const course of allCourses) {
                if (course.code === currentCourse.code) continue;
                
                const textToSearch = `${course.prerequisites || ''} ${course.corequisites || ''}`;
                if (textToSearch.includes(currentCourse.code)) {
                    // Check if this course is not already in a lower level
                    let alreadyInLowerLevel = false;
                    for (let l = 0; l < level; l++) {
                        const lowerLevelCourses = levelMap.get(l) || [];
                        if (lowerLevelCourses.some(c => c.code === course.code)) {
                            alreadyInLowerLevel = true;
                            break;
                        }
                    }
                    
                    if (!alreadyInLowerLevel) {
                        nextLevelCourses.push(course);
                    }
                }
            }
        }
        
        if (nextLevelCourses.length > 0) {
            levelMap.set(level + 1, nextLevelCourses);
        }
    }

    // 5. Build nodes and edges
    for (const [level, courses] of levelMap) {
        for (const course of courses) {
            const nodeType = level === 0 ? 'root' : level === 1 ? 'explored' : 'unexplored';
            addNode(course, level, nodeType);
        }
    }

    // 6. Build edges between levels
    for (let level = 0; level < levelMap.size - 1; level++) {
        const currentLevelCourses = levelMap.get(level) || [];
        const nextLevelCourses = levelMap.get(level + 1) || [];
        
        for (const currentCourse of currentLevelCourses) {
            for (const nextCourse of nextLevelCourses) {
                const textToSearch = `${nextCourse.prerequisites || ''} ${nextCourse.corequisites || ''}`;
                if (textToSearch.includes(currentCourse.code)) {
                    edges.push({
                        from: currentCourse.code,
                        to: nextCourse.code,
                        arrows: { to: { enabled: true, type: 'arrow' } },
                        color: { color: '#27ae60' },
                        width: 2
                    });
                }
            }
        }
    }

    res.json({ nodes: Array.from(nodes.values()), edges });
});

// 新增：获取课程关系API
app.get('/api/course-relations/:courseCode', async (req, res) => {
    try {
        const { courseCode } = req.params;
        const { type } = req.query; // direct-prerequisites, indirect-prerequisites, direct-postrequisites, indirect-postrequisites
        
        if (!courseCode) {
            return res.status(400).json({ error: 'Course code is required' });
        }

        let results = {};

        switch (type) {
            case 'direct-prerequisites':
                // 直属前置课程：直接作为前置条件的课程
                results = await getDirectPrerequisites(courseCode);
                break;
            case 'indirect-prerequisites':
                // 非直属前置课程：通过其他课程间接作为前置条件的课程
                results = await getIndirectPrerequisites(courseCode);
                break;
            case 'direct-postrequisites':
                // 直属后置课程：直接以该课程为前置条件的课程
                results = await getDirectPostrequisites(courseCode);
                break;
            case 'indirect-postrequisites':
                // 非直属后置课程：通过其他课程间接以该课程为前置条件的课程
                results = await getIndirectPostrequisites(courseCode);
                break;
            default:
                return res.status(400).json({ error: 'Invalid relation type' });
        }

        res.json({
            course: {
                code: courseCode,
                title: (await query('SELECT title FROM courses WHERE code = ?', [courseCode]))[0]?.title || 'N/A'
            },
            relationType: type,
            results
        });

    } catch (error) {
        console.error('Error fetching course relations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 获取直属前置课程
async function getDirectPrerequisites(courseCode) {
    const courses = await query('SELECT * FROM courses WHERE code = ?', [courseCode]);
    if (courses.length === 0) {
        return { direct: [], indirect: [] };
    }
    
    const course = courses[0];
    const prerequisites = course.prerequisites || '';
    const prereqCodes = extractCourseCodes(prerequisites);
    
    const directCourses = [];
    for (const code of prereqCodes) {
        const prereqCourses = await query('SELECT * FROM courses WHERE code = ?', [code]);
        if (prereqCourses.length > 0) {
            const prereqCourse = prereqCourses[0];
            directCourses.push({
                code: prereqCourse.code,
                title: prereqCourse.title,
                relation: 'Direct prerequisite'
            });
        }
    }
    
    return { direct: directCourses, indirect: [] };
}

// 获取非直属前置课程
async function getIndirectPrerequisites(courseCode) {
    const allCourses = await query('SELECT * FROM courses');
    const indirectPrereqs = new Set();
    
    // 找到所有以该课程为后置的课程的前置课程
    for (const course of allCourses) {
        if (course.prerequisites && course.prerequisites.includes(courseCode)) {
            const prereqCodes = extractCourseCodes(course.prerequisites);
            for (const prereqCode of prereqCodes) {
                if (prereqCode !== courseCode) {
                    indirectPrereqs.add(prereqCode);
                }
            }
        }
    }
    
    const courses = [];
    for (const code of indirectPrereqs) {
        const courseData = await query('SELECT * FROM courses WHERE code = ?', [code]);
        if (courseData.length > 0) {
            const course = courseData[0];
            courses.push({
                code: course.code,
                title: course.title,
                relation: 'Indirect prerequisite'
            });
        }
    }
    
    return { direct: [], indirect: courses };
}

// 获取直属后置课程
async function getDirectPostrequisites(courseCode) {
    const allCourses = await query('SELECT * FROM courses');
    const directPostreqs = [];
    
    for (const course of allCourses) {
        if (course.prerequisites && course.prerequisites.includes(courseCode)) {
            directPostreqs.push({
                code: course.code,
                title: course.title,
                relation: 'Direct postrequisite'
            });
        }
    }
    
    return { direct: directPostreqs, indirect: [] };
}

// 获取非直属后置课程
async function getIndirectPostrequisites(courseCode) {
    const allCourses = await query('SELECT * FROM courses');
    const indirectPostreqs = new Set();
    
    // 找到所有以该课程为前置的课程的后置课程
    for (const course of allCourses) {
        if (course.prerequisites && course.prerequisites.includes(courseCode)) {
            // 找到以这个课程为前置的其他课程
            for (const otherCourse of allCourses) {
                if (otherCourse.prerequisites && otherCourse.prerequisites.includes(course.code)) {
                    indirectPostreqs.add(otherCourse.code);
                }
            }
        }
    }
    
    const courses = [];
    for (const code of indirectPostreqs) {
        const courseData = await query('SELECT * FROM courses WHERE code = ?', [code]);
        if (courseData.length > 0) {
            const course = courseData[0];
            courses.push({
                code: course.code,
                title: course.title,
                relation: 'Indirect postrequisite'
            });
        }
    }
    
    return { direct: [], indirect: courses };
}

// 辅助函数：从文本中提取课程代码
function extractCourseCodes(text) {
    if (!text) return [];
    const regex = /[A-Z]{3,4}\d{3}[HY]\d/g;
    return text.match(regex) || [];
}


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`=== CoursePlanner Server Started ===`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📊 Database: ${DB_FILE}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log(`\n🚀 Ready to use! Open http://localhost:${PORT} in your browser.`);
    console.log(`\n=== Server Logs ===`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please try a different port.`);
        console.error(`💡 You can set a different port with: PORT=3002 node index.js`);
    } else {
        console.error('❌ Server failed to start:', err.message);
    }
    process.exit(1);
}); 