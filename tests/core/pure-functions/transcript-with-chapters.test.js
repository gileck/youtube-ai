/**
 * Tests for the transcript-with-chapters.js pure functions
 */
const { 
  shouldFilterChapter, 
  combineTranscriptAndChapters, 
  convertToFormattedText, 
  getTranscriptWithChapters 
} = require('../../../src/core/pure-functions/transcript-with-chapters');

describe('shouldFilterChapter', () => {
  test('returns false when filtering is disabled', () => {
    const chapter = { title: 'Sponsor: Product' };
    const options = { chapterFilters: { enabled: false, patterns: ['Sponsor:.*'] } };
    
    expect(shouldFilterChapter(chapter, options)).toBe(false);
  });
  
  test('returns false when no patterns are provided', () => {
    const chapter = { title: 'Sponsor: Product' };
    const options = { chapterFilters: { enabled: true, patterns: [] } };
    
    expect(shouldFilterChapter(chapter, options)).toBe(false);
  });
  
  test('returns true when chapter title matches a pattern', () => {
    const chapter = { title: 'Sponsor: Product' };
    const options = { chapterFilters: { enabled: true, patterns: ['Sponsor:.*'] } };
    
    expect(shouldFilterChapter(chapter, options)).toBe(true);
  });
  
  test('returns false when chapter title does not match any pattern', () => {
    const chapter = { title: 'Introduction' };
    const options = { chapterFilters: { enabled: true, patterns: ['Sponsor:.*'] } };
    
    expect(shouldFilterChapter(chapter, options)).toBe(false);
  });
  
  test('handles regex patterns correctly', () => {
    const chapter = { title: 'Ad: Product' };
    const options = { chapterFilters: { enabled: true, patterns: ['Sponsor:.*', 'Ad:.*'] } };
    
    expect(shouldFilterChapter(chapter, options)).toBe(true);
  });
});

describe('combineTranscriptAndChapters', () => {
  test('returns empty array when transcript or chapters are empty', () => {
    expect(combineTranscriptAndChapters([], [])).toHaveLength(0);
    expect(combineTranscriptAndChapters(null, [])).toHaveLength(0);
    expect(combineTranscriptAndChapters([], null)).toHaveLength(0);
  });
  
  test('combines transcript and chapters correctly', () => {
    const transcript = [
      { text: 'Hello', offset: 0, duration: 1000 },
      { text: 'World', offset: 1000, duration: 1000 },
      { text: 'Test', offset: 4000, duration: 1000 }
    ];
    
    const chapters = [
      { title: 'Intro', start: 0, end: 3 },
      { title: 'Main', start: 3, end: Infinity }
    ];
    
    const result = combineTranscriptAndChapters(transcript, chapters);
    
    // Should have 5 items: 2 chapters and 3 transcript segments
    expect(result).toHaveLength(5);
    
    // Find chapters and transcript segments
    const chapterItems = result.filter(item => item.type === 'chapter');
    const transcriptItems = result.filter(item => item.type === 'transcript');
    
    // Check chapters
    expect(chapterItems).toHaveLength(2);
    expect(chapterItems[0].title).toBe('Intro');
    expect(chapterItems[1].title).toBe('Main');
    
    // Check transcript segments
    expect(transcriptItems).toHaveLength(3);
    
    // First transcript segment should be in the first chapter
    expect(transcriptItems[0].text).toBe('Hello');
    expect(transcriptItems[0].chapterIndex).toBe(0);
    expect(transcriptItems[0].chapterTitle).toBe('Intro');
    
    // Last transcript segment should be in the second chapter
    expect(transcriptItems[2].text).toBe('Test');
    expect(transcriptItems[2].chapterIndex).toBe(1);
    expect(transcriptItems[2].chapterTitle).toBe('Main');
  });
  
  test('handles transcript segments that do not belong to any chapter', () => {
    const transcript = [
      { text: 'Before chapters', offset: 0, duration: 1000 }
    ];
    
    const chapters = [
      { title: 'Chapter', start: 10, end: 20 }
    ];
    
    const result = combineTranscriptAndChapters(transcript, chapters);
    
    const transcriptItems = result.filter(item => item.type === 'transcript');
    expect(transcriptItems[0].chapterIndex).toBeNull();
    expect(transcriptItems[0].chapterTitle).toBeNull();
  });
});

describe('convertToFormattedText', () => {
  test('converts combined data to formatted text', () => {
    const combinedData = [
      { type: 'chapter', title: 'Intro', start: 0, end: 60 },
      { type: 'transcript', text: 'Hello', start: 0, end: 1 },
      { type: 'transcript', text: 'World', start: 1, end: 2 },
      { type: 'chapter', title: 'Main', start: 60, end: 120 },
      { type: 'transcript', text: 'Test', start: 60, end: 61 }
    ];
    
    const result = convertToFormattedText(combinedData);
    
    expect(result).toContain('# [00:00:00] Intro');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
    expect(result).toContain('# [00:01:00] Main');
    expect(result).toContain('Test');
  });

  test('handles empty combined data', () => {
    expect(convertToFormattedText([])).toBe('');
  });
});

describe('getTranscriptWithChapters', () => {
  test('combines transcript and chapters correctly', () => {
    const videoId = 'testVideoId';
    const transcriptData = {
      transcript: [
        { text: 'Hello', offset: 0, duration: 1000 },
        { text: 'World', offset: 1000, duration: 1000 }
      ]
    };
    
    const chaptersData = {
      chapters: [
        { title: 'Intro', start: 0, end: 60 }
      ]
    };
    
    const result = getTranscriptWithChapters(videoId, transcriptData, chaptersData);
    
    expect(result.videoId).toBe(videoId);
    expect(result.combinedData).toHaveLength(3); // 1 chapter + 2 transcript segments
    expect(result.formattedText).toContain('# [00:00:00] Intro');
    expect(result.formattedText).toContain('Hello');
    expect(result.formattedText).toContain('World');
    expect(result.metadata.transcriptSegments).toBe(2);
    expect(result.metadata.chapters).toBe(1);
  });

  test('filters chapters based on options', () => {
    const videoId = 'testVideoId';
    const transcriptData = {
      transcript: [
        { text: 'Hello', offset: 0, duration: 1000 }
      ]
    };
    
    const chaptersData = {
      chapters: [
        { title: 'Intro', start: 0, end: 30 },
        { title: 'Sponsor', start: 30, end: 60 },
        { title: 'Main', start: 60, end: Infinity }
      ]
    };
    
    const options = {
      chapterFilters: {
        enabled: true,
        patterns: ['Sponsor']
      }
    };
    
    const result = getTranscriptWithChapters(videoId, transcriptData, chaptersData, options);
    
    expect(result.metadata.chapters).toBe(2); // 3 original - 1 filtered
    expect(result.metadata.filteredChapters).toBe(1);
    
    // Check that the filtered chapter is not in the combined data
    const chapterTitles = result.combinedData
      .filter(item => item.type === 'chapter')
      .map(item => item.title);
    
    expect(chapterTitles).toContain('Intro');
    expect(chapterTitles).toContain('Main');
    expect(chapterTitles).not.toContain('Sponsor');
  });

  test('handles errors gracefully', () => {
    const videoId = 'testVideoId';
    const transcriptData = null; // Invalid data to trigger error
    const chaptersData = null; // Invalid data to trigger error
    
    const result = getTranscriptWithChapters(videoId, transcriptData, chaptersData);
    
    expect(result.videoId).toBe(videoId);
    expect(result.combinedData).toEqual([]);
    expect(result.formattedText).toBe('');
    expect(result.metadata.error).toBeDefined();
  });
});
