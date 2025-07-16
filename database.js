const sqlite3 = require('sqlite3').verbose();
const fs = require('fs/promises');
const path = require('path');

const DB_FILE = process.env.DB_FILE || 'courses.db';
const JSON_FILE = process.env.JSON_FILE || path.join(__dirname, 'all_courses.json');

async function initializeDatabase() {
    // Delete old database file if it exists
    try {
        await fs.unlink(DB_FILE);
        console.log(`Deleted existing database file: ${DB_FILE}`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error deleting old database file:', error);
            return;
        }
    }

    const db = new sqlite3.Database(DB_FILE, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
        } else {
            console.log(`Connected to the SQLite database: ${DB_FILE}`);
        }
    });

    db.serialize(async () => {
        // Create the courses table
        db.run(`CREATE TABLE courses (
            code TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            hours TEXT,
            prerequisites TEXT,
            corequisites TEXT,
            exclusion TEXT,
            recommended_preparation TEXT,
            breadth_requirements TEXT,
            previous_course_number TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('Table "courses" created successfully.');
            }
        });

        // Read the JSON file and insert data
        try {
            const data = await fs.readFile(JSON_FILE, 'utf-8');
            const courses = JSON.parse(data);

            const stmt = db.prepare(`INSERT INTO courses (
                code, title, description, hours, prerequisites, corequisites, 
                exclusion, recommended_preparation, breadth_requirements, previous_course_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            let count = 0;
            for (const course of courses) {
                stmt.run(
                    course.code,
                    course.title,
                    course.description,
                    course.hours,
                    course.prerequisites,
                    course.corequisites,
                    course.exclusion,
                    course.recommended_preparation,
                    course.breadth_requirements,
                    course.previous_course_number
                );
                count++;
            }
            stmt.finalize((err) => {
                 if (err) {
                    console.error('Error finalizing statement:', err.message);
                }
                console.log(`Inserted ${count} courses into the database.`);
            });

        } catch (error) {
            console.error('Error processing JSON file or inserting data:', error);
        }

        // Close the database connection
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
        });
    });
}

initializeDatabase(); 