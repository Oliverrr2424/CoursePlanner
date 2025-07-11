const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs/promises');

const BASE_URL = 'https://artsci.calendar.utoronto.ca';
const SEARCH_PATH = '/search-courses';

/**
 * Parses the HTML content of a course details block from the search results page.
 * @param {cheerio.CheerioAPI} $ - The Cheerio API instance.
 * @param {cheerio.Element} el - The DOM element representing the course block.
 * @returns {object|null} An object containing the parsed course details, or null if parsing fails.
 */
function parseCourse($, el) {
    const headerDiv = $(el).find('h3 > div');
    if (!headerDiv.length) {
        return null;
    }

    const headerText = headerDiv.text().trim();
    const [code, ...titleParts] = headerText.split(' - ');
    if (!code || titleParts.length === 0) {
        return null;
    }

    const course = {
        code: code.trim(),
        title: titleParts.join(' - ').trim(),
    };

    const detailsContainer = $(el).children('.views-row');
    
    course.description = detailsContainer.find('.views-field-body').text().trim();
    course.hours = detailsContainer.find('.views-field-field-hours .field-content').text().trim();
    course.prerequisites = detailsContainer.find('.views-field-field-prerequisite .field-content').text().trim();
    course.corequisites = detailsContainer.find('.views-field-field-corequisite .field-content').text().trim();
    course.exclusion = detailsContainer.find('.views-field-field-exclusion .field-content').text().trim();
    course.recommended_preparation = detailsContainer.find('.views-field-field-recommended .field-content').text().trim();
    course.breadth_requirements = detailsContainer.find('.views-field-field-breadth-requirements .field-content').text().trim();
    course.previous_course_number = detailsContainer.find('.views-field-field-previous-course-number .field-content').text().trim();

    // Clean up empty fields
    Object.keys(course).forEach(key => {
        if (course[key] === '' || course[key] === null || course[key] === undefined) {
            delete course[key];
        }
    });

    return course;
}

/**
 * Scrapes courses based on the given search parameters.
 * @param {string} searchUrl - The search URL with parameters
 * @param {string} outputFile - The output file name
 * @param {string} description - Description of what's being scraped
 */
async function scrapeCourses(searchUrl, outputFile, description) {
    console.log(`Starting ${description} scraping process...`);
    const allCourses = [];
    let nextUrl = searchUrl;
    let pageCount = 0;

    while (nextUrl) {
        pageCount++;
        console.log(`Scraping page ${pageCount}: ${BASE_URL}${nextUrl}`);
        try {
            const response = await axios.get(`${BASE_URL}${nextUrl}`);
            const $ = cheerio.load(response.data);

            const courseRows = $('.views-row');
            courseRows.each((i, el) => {
                const courseData = parseCourse($, el);
                if (courseData) {
                    allCourses.push(courseData);
                }
            });

            const nextLink = $('.pager__item--next > a');
            if (nextLink.length > 0) {
                const relativeUrl = nextLink.attr('href');
                nextUrl = `${SEARCH_PATH}${relativeUrl}`;
            } else {
                nextUrl = null;
                console.log('No more pages to scrape.');
            }
        } catch (error) {
            console.error(`Error scraping page ${BASE_URL}${nextUrl}:`, error.message);
            nextUrl = null;
        }
    }

    try {
        await fs.writeFile(outputFile, JSON.stringify(allCourses, null, 2));
        console.log(`\nScraping complete. Found ${allCourses.length} courses.`);
        console.log(`Data successfully saved to ${outputFile}`);
        return allCourses;
    } catch (error) {
        console.error('Error writing data to file:', error.message);
        return [];
    }
}

/**
 * Scrapes all CSC courses from the UofT Arts & Science calendar.
 */
async function scrapeCSCCourses() {
    const searchUrl = `${SEARCH_PATH}?course_keyword=csc&field_section_value=All&field_prerequisite_value=&field_breadth_requirements_value=All`;
    return await scrapeCourses(searchUrl, 'csc_courses.json', 'CSC courses');
}

/**
 * Scrapes all courses with breadth requirement = 5 (The Physical and Mathematical Universes).
 */
async function scrapeBreadth5Courses() {
    const searchUrl = `${SEARCH_PATH}?course_keyword=&field_section_value=All&field_prerequisite_value=&field_breadth_requirements_value=The+Physical+and+Mathematical+Universes+%285%29`;
    return await scrapeCourses(searchUrl, 'breadth5_courses.json', 'Breadth Requirement 5 courses');
}

/**
 * Merges course data from multiple sources, avoiding duplicates.
 * @param {Array} existingCourses - Array of existing courses
 * @param {Array} newCourses - Array of new courses to merge
 * @returns {Array} Merged array of courses
 */
function mergeCourses(existingCourses, newCourses) {
    const merged = [...existingCourses];
    const existingCodes = new Set(existingCourses.map(c => c.code));
    
    for (const newCourse of newCourses) {
        if (!existingCodes.has(newCourse.code)) {
            merged.push(newCourse);
            existingCodes.add(newCourse.code);
        } else {
            console.log(`Skipping duplicate course: ${newCourse.code}`);
        }
    }
    
    return merged;
}

/**
 * Main function to scrape all required courses and merge them.
 */
async function scrapeAllRequiredCourses() {
    console.log('=== Starting comprehensive course scraping ===\n');
    
    // 1. Scrape CSC courses
    console.log('1. Scraping CSC courses...');
    const cscCourses = await scrapeCSCCourses();
    
    // 2. Scrape Breadth 5 courses
    console.log('\n2. Scraping Breadth Requirement 5 courses...');
    const breadth5Courses = await scrapeBreadth5Courses();
    
    // 3. Merge all courses
    console.log('\n3. Merging course data...');
    const allCourses = mergeCourses(cscCourses, breadth5Courses);
    
    // 4. Save merged data
    try {
        await fs.writeFile('all_courses.json', JSON.stringify(allCourses, null, 2));
        console.log(`\n=== Scraping Summary ===`);
        console.log(`CSC courses: ${cscCourses.length}`);
        console.log(`Breadth 5 courses: ${breadth5Courses.length}`);
        console.log(`Total unique courses: ${allCourses.length}`);
        console.log(`Data saved to all_courses.json`);
    } catch (error) {
        console.error('Error saving merged data:', error.message);
    }
}

// Run the main scraping function
scrapeAllRequiredCourses(); 