import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.join(process.cwd(), 'source', 'pptx-raw');
const OUTPUT_DIR = path.join(process.cwd(), 'source');

// XML entity decoder
function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, code) => String.fromCharCode(parseInt(code, 16)));
}

// Clean and collapse whitespace
function cleanText(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// Extract all paragraphs from a block (shape or graphic frame)
function extractParagraphsFromBlock(blockXml) {
  const paragraphs = [];
  const pMatches = blockXml.match(/<a:p>[\s\S]*?<\/a:p>/g) || [];

  for (const pMatch of pMatches) {
    const textRuns = pMatch.match(/<a:t>[\s\S]*?<\/a:t>/g) || [];
    const textParts = textRuns.map(run => {
      const textMatch = run.match(/<a:t>([\s\S]*?)<\/a:t>/);
      return textMatch ? decodeXmlEntities(textMatch[1]) : '';
    });
    const text = cleanText(textParts.join(''));
    if (text) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

// Check if a block is a title block
function isTitleBlock(blockXml) {
  return /<p:ph[^>]*type="(title|ctrTitle)"/.test(blockXml);
}

// Extract slide data
function extractSlide(slideNum) {
  const slideFile = path.join(SOURCE_DIR, 'ppt', 'slides', `slide${slideNum}.xml`);
  const slideRelsFile = path.join(SOURCE_DIR, 'ppt', 'slides', '_rels', `slide${slideNum}.xml.rels`);

  let slideXml = '';
  let relsXml = '';

  try {
    slideXml = fs.readFileSync(slideFile, 'utf-8');
  } catch (e) {
    console.error(`Error reading slide ${slideNum}:`, e.message);
    return null;
  }

  try {
    if (fs.existsSync(slideRelsFile)) {
      relsXml = fs.readFileSync(slideRelsFile, 'utf-8');
    }
  } catch (e) {
    // Rels file might not exist, that's ok
  }

  // Extract shapes and graphic frames
  const shapeMatches = slideXml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [];
  const graphicFrameMatches = slideXml.match(/<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g) || [];
  const blocks = [...shapeMatches, ...graphicFrameMatches];

  // Find title
  let title = null;
  for (const block of blocks) {
    if (isTitleBlock(block)) {
      const titleParagraphs = extractParagraphsFromBlock(block);
      if (titleParagraphs.length > 0) {
        title = titleParagraphs.join(' / ');
      }
      break;
    }
  }

  // Extract all texts
  const texts = [];
  for (const block of blocks) {
    const blockTexts = extractParagraphsFromBlock(block);
    texts.push(...blockTexts);
  }

  // Extract links from rels file
  const links = [];
  const linkMatches = relsXml.match(/<Relationship[^>]*TargetMode="External"[^>]*>/g) || [];
  for (const match of linkMatches) {
    const targetMatch = match.match(/Target="([^"]*)/);
    if (targetMatch) {
      const link = decodeXmlEntities(targetMatch[1]);
      if (!links.includes(link)) {
        links.push(link);
      }
    }
  }

  // Extract notes
  const notes = [];
  if (relsXml) {
    const notesMatch = relsXml.match(/<Relationship[^>]*Type="[^"]*notesSlide"[^>]*Target="([^"]*)/);
    if (notesMatch) {
      const notesTarget = notesMatch[1];
      const notesFile = path.join(SOURCE_DIR, 'ppt', 'slides', notesTarget);
      try {
        const notesXml = fs.readFileSync(notesFile, 'utf-8');
        const noteParagraphs = extractParagraphsFromBlock(notesXml);
        for (const para of noteParagraphs) {
          // Skip paragraphs that are only digits (slide numbers)
          if (!/^\d+$/.test(para)) {
            notes.push(para);
          }
        }
      } catch (e) {
        // Notes file might not exist
      }
    }
  }

  return {
    slide: slideNum,
    title,
    texts,
    notes,
    links
  };
}

// Extract background
function extractBackground(slideNum) {
  const slideFile = path.join(SOURCE_DIR, 'ppt', 'slides', `slide${slideNum}.xml`);
  const slideRelsFile = path.join(SOURCE_DIR, 'ppt', 'slides', '_rels', `slide${slideNum}.xml.rels`);

  let slideXml = '';
  let relsXml = '';

  try {
    slideXml = fs.readFileSync(slideFile, 'utf-8');
  } catch (e) {
    return { slide: slideNum, hasBg: false, srgb: null, schemeClr: null, layout: null };
  }

  try {
    if (fs.existsSync(slideRelsFile)) {
      relsXml = fs.readFileSync(slideRelsFile, 'utf-8');
    }
  } catch (e) {
    // Rels file might not exist
  }

  // Find <p:bg>...</p:bg>
  const bgMatch = slideXml.match(/<p:bg>[\s\S]*?<\/p:bg>/);

  if (bgMatch) {
    const bgXml = bgMatch[0];
    const srgbMatch = bgXml.match(/<a:srgbClr val="([^"]*)"/);
    const schemeClrMatch = bgXml.match(/<a:schemeClr val="([^"]*)"/);

    return {
      slide: slideNum,
      hasBg: true,
      srgb: srgbMatch ? srgbMatch[1] : null,
      schemeClr: schemeClrMatch ? schemeClrMatch[1] : null,
      layout: null
    };
  }

  // No <p:bg>, try to resolve from layout
  if (relsXml) {
    const layoutMatch = relsXml.match(/<Relationship[^>]*Type="[^"]*slideLayout"[^>]*Target="([^"]*)/);
    if (layoutMatch) {
      const layoutTarget = layoutMatch[1];
      const layoutFile = path.join(SOURCE_DIR, 'ppt', 'slideLayouts', path.basename(layoutTarget));

      try {
        const layoutXml = fs.readFileSync(layoutFile, 'utf-8');
        const layoutBgMatch = layoutXml.match(/<p:bg>[\s\S]*?<\/p:bg>/);

        if (layoutBgMatch) {
          const bgXml = layoutBgMatch[0];
          const srgbMatch = bgXml.match(/<a:srgbClr val="([^"]*)"/);
          const schemeClrMatch = bgXml.match(/<a:schemeClr val="([^"]*)"/);

          return {
            slide: slideNum,
            hasBg: false,
            srgb: null,
            schemeClr: null,
            layout: {
              file: path.basename(layoutTarget),
              srgb: srgbMatch ? srgbMatch[1] : null,
              schemeClr: schemeClrMatch ? schemeClrMatch[1] : null
            }
          };
        }
      } catch (e) {
        // Layout file might not exist
      }
    }
  }

  return {
    slide: slideNum,
    hasBg: false,
    srgb: null,
    schemeClr: null,
    layout: null
  };
}

// Main
const slides = [];
const backgrounds = [];
let slidesWithZeroTexts = [];
let totalLinks = 0;
let totalNotes = 0;

for (let i = 1; i <= 46; i++) {
  const slide = extractSlide(i);
  if (slide) {
    slides.push(slide);
    if (slide.texts.length === 0) {
      slidesWithZeroTexts.push(i);
    }
    totalLinks += slide.links.length;
    totalNotes += slide.notes.length > 0 ? 1 : 0;
  }

  const bg = extractBackground(i);
  if (bg) {
    backgrounds.push(bg);
  }
}

// Write JSON output
const slidesJson = JSON.stringify(slides, null, 2);
fs.writeFileSync(path.join(OUTPUT_DIR, 'slides.json'), slidesJson);

// Write Markdown output
let markdown = '';
for (const slide of slides) {
  markdown += `## Slide ${slide.slide}\n\n`;
  if (slide.title) {
    markdown += `**Title:** ${slide.title}\n\n`;
  }
  for (const text of slide.texts) {
    markdown += `- ${text}\n`;
  }
  if (slide.texts.length > 0) {
    markdown += '\n';
  }
  if (slide.notes.length > 0) {
    markdown += `**Notes:**\n`;
    for (const note of slide.notes) {
      markdown += `- ${note}\n`;
    }
    markdown += '\n';
  }
  if (slide.links.length > 0) {
    markdown += `**Links:**\n`;
    for (const link of slide.links) {
      markdown += `- ${link}\n`;
    }
    markdown += '\n';
  }
  markdown += '\n';
}
fs.writeFileSync(path.join(OUTPUT_DIR, 'slides.md'), markdown);

// Write backgrounds JSON
const backgroundsJson = JSON.stringify(backgrounds, null, 2);
fs.writeFileSync(path.join(OUTPUT_DIR, 'slide-backgrounds.json'), backgroundsJson);

// Print summary
const zeroTextsStr = slidesWithZeroTexts.length > 0 ? slidesWithZeroTexts.join(', ') : 'none';
console.log(`Slides written: 46, zero texts: ${zeroTextsStr}, notes: ${totalNotes}, links: ${totalLinks}`);
