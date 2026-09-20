import { COLLEGE_LOGO_BASE64 } from '../assets/logoBase64';
import { NAAC_LOGO_BASE64 } from '../assets/naacLogoBase64';

/**
 * Cache for generated header images by examType to avoid re-rendering
 */
const headerImageCache = new Map<string, string>();

/**
 * Generates a crystal-clear, high-resolution (3x retina) institutional header banner
 * matching the user's reference image exactly:
 * - Official circular College Seal Logo on the left
 * - Multi-tier center institutional letterhead with stately typography
 * - Official NAAC 'A' Grade Accreditation Medal on the right
 * - Double accent stripe (Dark Navy top rule + Golden Amber bottom rule)
 * - Deep navy rounded capsule/pill title banner with bold white text
 *
 * @param examType The assessment type (e.g. "CAT-1", "CAT-2", "MODEL EXAM")
 * @returns Promise<string> Base64 PNG data URL
 */
export async function generateHeaderBannerBase64(examType: string): Promise<string> {
  const normalizedExam = (examType || 'ASSESSMENT').trim().toUpperCase();
  const cacheKey = normalizedExam;

  if (headerImageCache.has(cacheKey)) {
    return headerImageCache.get(cacheKey)!;
  }

  // If running in non-browser environment (Node / test runner)
  if (typeof document === 'undefined') {
    return '';
  }

  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      // High-resolution supersampling: 2400 x 440 (logical 1200 x 220, 2x scale)
      const logicalWidth = 1200;
      const logicalHeight = 222;
      const dpr = 2;

      canvas.width = logicalWidth * dpr;
      canvas.height = logicalHeight * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Pure White Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // Helper to load base64 images
      const loadImg = (src: string): Promise<HTMLImageElement> => {
        return new Promise((res, rej) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => res(img);
          img.onerror = (e) => rej(e);
          img.src = src;
        });
      };

      Promise.all([
        loadImg(COLLEGE_LOGO_BASE64).catch(() => null),
        loadImg(NAAC_LOGO_BASE64).catch(() => null),
      ]).then(([collegeImg, naacImg]) => {
        // 2. Left College Seal Logo
        const logoSize = 98;
        const logoX = 32;
        const logoY = 12;

        if (collegeImg) {
          ctx.drawImage(collegeImg, logoX, logoY, logoSize, logoSize);
        }

        // 3. Right NAAC Accreditation Medal Logo
        const naacWidth = 124;
        const naacHeight = 90;
        const naacX = logicalWidth - 32 - naacWidth;
        const naacY = 16;

        if (naacImg) {
          ctx.drawImage(naacImg, naacX, naacY, naacWidth, naacHeight);
        }

        // 4. Center Institutional Letterhead
        const centerX = logicalWidth / 2;

        // Line 1: College Name (Stately serif display uppercase)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#0B1E36'; // Deep Navy
        ctx.font = 'bold 30px "Times New Roman", Times, Georgia, "DejaVu Serif", serif';
        ctx.fillText('JAYA SAKTHI ENGINEERING COLLEGE', centerX, 44);

        // Line 2: AICTE & Anna University Affiliation
        ctx.fillStyle = '#334155'; // Slate-700
        ctx.font = '600 15px Arial, "Helvetica Neue", Helvetica, sans-serif';
        ctx.fillText(
          'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai',
          centerX,
          72
        );

        // Line 3: Address & Location
        ctx.fillStyle = '#64748B'; // Slate-500
        ctx.font = '500 13.5px Arial, "Helvetica Neue", Helvetica, sans-serif';
        ctx.fillText(
          "St. Mary's Nagar, Thiruninravur, Chennai - 602024, Tamil Nadu",
          centerX,
          95
        );

        // 5. Decorative Double Line Rule (Navy top line + Golden amber bottom line)
        const lineStartX = 28;
        const lineEndX = logicalWidth - 28;
        const lineWidth = lineEndX - lineStartX;

        // Top line: Navy
        ctx.fillStyle = '#0F284E';
        ctx.fillRect(lineStartX, 118, lineWidth, 3);

        // Bottom line: Golden Amber
        ctx.fillStyle = '#D97706';
        ctx.fillRect(lineStartX, 123.5, lineWidth, 1.8);

        // 6. Document Title Banner (New Model - Deep Navy Rounded Capsule Pill)
        const bannerX = 28;
        const bannerY = 138;
        const bannerW = lineWidth;
        const bannerH = 50;
        const pillRadius = 14;

        ctx.beginPath();
        ctx.moveTo(bannerX + pillRadius, bannerY);
        ctx.lineTo(bannerX + bannerW - pillRadius, bannerY);
        ctx.arcTo(bannerX + bannerW, bannerY, bannerX + bannerW, bannerY + bannerH, pillRadius);
        ctx.lineTo(bannerX + bannerW, bannerY + bannerH - pillRadius);
        ctx.arcTo(bannerX + bannerW, bannerY + bannerH, bannerX + bannerW - pillRadius, bannerY + bannerH, pillRadius);
        ctx.lineTo(bannerX + pillRadius, bannerY + bannerH);
        ctx.arcTo(bannerX, bannerY + bannerH, bannerX, bannerY + bannerH - pillRadius, pillRadius);
        ctx.lineTo(bannerX, bannerY + pillRadius);
        ctx.arcTo(bannerX, bannerY, bannerX + pillRadius, bannerY, pillRadius);
        ctx.closePath();

        ctx.fillStyle = '#0B1E36';
        ctx.fill();

        // 7. Title Banner Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18.5px Arial, "Helvetica Neue", Helvetica, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const bannerTitle = `CONTINUOUS ASSESSMENT MARKSHEET — ${normalizedExam}`;
        ctx.fillText(bannerTitle, centerX, bannerY + bannerH / 2);

        const dataUrl = canvas.toDataURL('image/png');
        headerImageCache.set(cacheKey, dataUrl);
        resolve(dataUrl);
      });
    } catch (err) {
      console.warn('Error rendering header banner canvas:', err);
      resolve('');
    }
  });
}
