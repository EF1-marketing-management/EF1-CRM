// ============================================
// Chytrý parser emailových podpisů
// Extrahuje: jméno, pozice, telefon, firma, web, LinkedIn
// ============================================

export interface ParsedSignature {
  position?: string;
  phone?: string;
  company_name?: string;
  website?: string;
  linkedin_url?: string;
  address?: string;
}

export interface ParsedEmailSender {
  firstName: string;
  lastName: string;
  email: string;
  companyFromDomain: string;
  signature: ParsedSignature;
}

/**
 * Parsuje celý email a extrahuje maximum informací
 */
export function parseEmailFull(
  fromName: string,
  fromEmail: string,
  body: string
): ParsedEmailSender {
  const nameParts = splitName(fromName || fromEmail.split('@')[0]);
  const companyFromDomain = extractCompanyFromEmail(fromEmail);
  const signature = parseSignature(body);

  return {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: fromEmail.toLowerCase(),
    companyFromDomain,
    signature,
  };
}

/**
 * Parsuje podpis z emailu
 */
function parseSignature(body: string): ParsedSignature {
  if (!body) return {};

  // Hledáme podpis — typicky za "--" nebo za posledních ~15 řádků
  const lines = body.split('\n');
  let signatureStart = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '--' || line === '-- ' || line === '---') {
      signatureStart = i + 1;
      break;
    }
  }

  // Pokud nebyl oddělovač, vezmeme posledních 15 řádků
  if (signatureStart >= lines.length) {
    signatureStart = Math.max(0, lines.length - 15);
  }

  const signatureLines = lines
    .slice(signatureStart)
    .map((l) => l.trim())
    .filter(Boolean);

  const signatureText = signatureLines.join('\n');
  const result: ParsedSignature = {};

  // Telefon
  const phoneMatch = signatureText.match(
    /(?:tel\.?|phone|mob\.?|mobil|telefon|t:|\+)[\s:]*([+\d\s()-]{7,20})/i
  );
  if (phoneMatch) {
    result.phone = phoneMatch[1].trim();
  } else {
    // Zkusit najít číslo s prefixem +420 / +421
    const czPhoneMatch = signatureText.match(/(\+42[01][\s]?[\d\s]{9,12})/);
    if (czPhoneMatch) result.phone = czPhoneMatch[1].trim();
  }

  // LinkedIn
  const linkedinMatch = signatureText.match(
    /(https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s)"'<>]+)/i
  );
  if (linkedinMatch) {
    result.linkedin_url = linkedinMatch[1];
  }

  // Web
  const webMatch = signatureText.match(
    /(https?:\/\/(?:www\.)?(?!linkedin)[^\s)"'<>]+\.[a-z]{2,})/i
  );
  if (webMatch) {
    result.website = webMatch[1];
  }

  // Pozice — hledáme typické tituly
  const positionPatterns = [
    /(?:^|\n)\s*([A-ZÀ-Ž][a-zà-ž]+(?:\s+[A-ZÀ-Ž&][a-zà-ž]*)*)\s*[|\-–/]\s*(.+)/m, // "Jméno | Pozice"
    /(?:pozice|position|role|funkce|title)[\s:]+(.+)/i,
  ];

  for (const pattern of positionPatterns) {
    const match = signatureText.match(pattern);
    if (match) {
      const candidate = (match[2] || match[1]).trim();
      if (candidate.length > 2 && candidate.length < 80 && !candidate.includes('@')) {
        result.position = candidate;
        break;
      }
    }
  }

  // Pokud jsme nenašli pozici, hledáme známé tituly
  if (!result.position) {
    const titleKeywords = [
      'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CPO',
      'Director', 'Manager', 'Head of', 'VP',
      'ředitel', 'ředitelka', 'manažer', 'manažerka',
      'vedoucí', 'specialista', 'specialist', 'koordinátor',
      'HR Business Partner', 'HR Manager', 'HR Director',
      'Marketing Manager', 'Sales Manager', 'Project Manager',
      'jednatel', 'jednatelka', 'founder', 'zakladatel',
      'asistent', 'asistentka', 'assistant',
      'konzultant', 'consultant', 'advisor', 'poradce',
    ];

    for (const line of signatureLines) {
      for (const title of titleKeywords) {
        if (line.toLowerCase().includes(title.toLowerCase()) && !line.includes('@') && line.length < 80) {
          result.position = line.replace(/^[|\-–\s]+/, '').trim();
          break;
        }
      }
      if (result.position) break;
    }
  }

  // Firma z podpisu
  const companyPatterns = [
    /(?:company|firma|společnost|organization)[\s:]+(.+)/i,
    /(?:^|\n)\s*([A-ZÀ-Ž][A-ZÀ-Ža-zà-ž\s&.]+(?:s\.r\.o\.|a\.s\.|z\.s\.|spol\.|z\.ú\.|SE|AG|GmbH|Ltd|Inc))/m,
  ];

  for (const pattern of companyPatterns) {
    const match = signatureText.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      if (candidate.length > 2 && candidate.length < 60) {
        result.company_name = candidate;
        break;
      }
    }
  }

  return result;
}

// ──── Helpers ────

export function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const cleaned = fullName
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ');

  if (parts.length === 0) return { firstName: 'Neznámý', lastName: 'Kontakt' };
  if (parts.length === 1)
    return { firstName: capitalize(parts[0]), lastName: '' };

  return {
    firstName: capitalize(parts[0]),
    lastName: parts
      .slice(1)
      .map(capitalize)
      .join(' '),
  };
}

export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function extractCompanyFromEmail(email: string): string {
  if (!email) return '';
  const domain = email.split('@')[1];
  if (!domain) return '';

  const generic = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.cz',
    'outlook.com', 'hotmail.com', 'live.com',
    'seznam.cz', 'email.cz', 'centrum.cz', 'post.cz',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me',
  ];

  if (generic.includes(domain.toLowerCase())) return '';
  const parts = domain.split('.');
  return capitalize(parts[0]);
}

export function detectInquiryType(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('keynote') || lower.includes('přednášk'))
    return 'Přednáška / keynote';
  if (lower.includes('školení') || lower.includes('training'))
    return 'Školení';
  if (lower.includes('workshop')) return 'Workshop';
  if (lower.includes('program')) return 'Program';
  if (
    lower.includes('interní') ||
    lower.includes('masterclass') ||
    lower.includes('konzultac')
  )
    return 'Jiné (interní program apod.)';
  return null;
}
