
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AiService } from './ai';

export class ScraperService {
    private ai: AiService;

    constructor(ai: AiService) {
        this.ai = ai;
    }

    async findSolution(errorQuery: string): Promise<{
        title: string;
        solution: string;
        url: string;
        votes: number;
    } | null> {
        try {
            // 1. Search StackOverflow via Google (or specialized search if possible, here mimicking a direct search)
            // Simplified: We'll construct a direct SO search URL and scrape result links
            const searchUrl = `https://stackoverflow.com/search?q=${encodeURIComponent(errorQuery + ' solved')}`;
            const searchRes = await axios.get(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });

            const $ = cheerio.load(searchRes.data);
            const firstResult = $('.s-post-summary').first();

            if (!firstResult.length) return null;

            const title = firstResult.find('.s-post-summary--content-title a').text().trim();
            const relativeLink = firstResult.find('.s-post-summary--content-title a').attr('href');

            if (!relativeLink) return null;

            const questionUrl = `https://stackoverflow.com${relativeLink}`;

            // 2. Fetch the question page
            const questionRes = await axios.get(questionUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const $q = cheerio.load(questionRes.data);

            // 3. Find the accepted answer or highest voted
            // StackOverflow structure: .answer class contains answers.
            // Accepted answer has .accepted-answer class.
            let bestAnswer = $q('.answer.accepted-answer');
            if (!bestAnswer.length) {
                bestAnswer = $q('.answer').first();
            }

            if (!bestAnswer.length) return null;

            const solutionText = bestAnswer.find('.js-post-body').text().trim();
            const voteCount = parseInt(bestAnswer.attr('data-score') || '0');

            return {
                title,
                solution: solutionText.substring(0, 5000), // Limit size
                url: questionUrl,
                votes: voteCount
            };

        } catch (error) {
            console.error('Scraping failed:', error);
            return null;
        }
    }
}
