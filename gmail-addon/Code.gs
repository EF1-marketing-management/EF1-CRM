// ============================================
// EF1 CRM – Gmail Add-on
// ============================================
// Tento skript přidá do Gmailu sidebar s tlačítkem
// "Přidat do CRM", které vytvoří kontakt + deal
// z aktuálně otevřeného emailu.
//
// NASTAVENÍ:
// 1. Otevřete https://script.google.com
// 2. Vytvořte nový projekt
// 3. Vložte tento kód
// 4. V souboru appsscript.json nastavte manifest (viz níže)
// 5. Deploy → Test deployments → Gmail Add-on
// ============================================

// ──── Konfigurace ────
var CRM_API_URL = 'https://ef-1-crm.vercel.app/api/parse-email';
var CRM_API_KEY = '0M4GlcKXDCHxm8pkuwfnSlhyj5S6Ol1RxzjGY4tT';

/**
 * Callback pro otevření emailu v Gmailu.
 * Zobrazí kartu s informacemi z emailu a tlačítkem "Přidat do CRM".
 */
function onGmailMessage(e) {
  var messageId = e.gmail.messageId;
  var accessToken = e.gmail.accessToken;
  
  GmailApp.setCurrentMessageAccessToken(accessToken);
  var message = GmailApp.getMessageById(messageId);
  
  var from = message.getFrom();
  var subject = message.getSubject();
  var body = message.getPlainBody();
  
  // Parse "From" field
  var parsed = parseFrom(from);
  
  var card = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('EF1 CRM')
        .setSubtitle('Přidat do CRM')
        .setImageUrl('https://ef-1-crm.vercel.app/favicon.ico')
    )
    .addSection(
      CardService.newCardSection()
        .setHeader('Email info')
        .addWidget(
          CardService.newDecoratedText()
            .setTopLabel('Od')
            .setText(parsed.name || parsed.email)
            .setBottomLabel(parsed.email)
        )
        .addWidget(
          CardService.newDecoratedText()
            .setTopLabel('Předmět')
            .setText(subject || '(bez předmětu)')
        )
        .addWidget(
          CardService.newDecoratedText()
            .setTopLabel('Firma (z domény)')
            .setText(extractCompany(parsed.email) || '—')
        )
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextButton()
            .setText('📥 Přidat do CRM')
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setBackgroundColor('#4F6BED')
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('addToCrm')
                .setParameters({
                  from_name: parsed.name || '',
                  from_email: parsed.email || '',
                  subject: subject || '',
                  body: (body || '').substring(0, 2000)
                })
            )
        )
        .addWidget(
          CardService.newTextButton()
            .setText('🔗 Otevřít v CRM')
            .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
            .setOpenLink(
              CardService.newOpenLink()
                .setUrl('https://ef-1-crm.vercel.app/quick-add?mode=email' +
                  '&from=' + encodeURIComponent(from) +
                  '&subject=' + encodeURIComponent(subject || ''))
            )
        )
    )
    .build();
  
  return [card];
}

/**
 * Odeslání dat do CRM API
 */
function addToCrm(e) {
  var params = e.parameters;
  
  var payload = {
    from_name: params.from_name,
    from_email: params.from_email,
    subject: params.subject,
    body: params.body
  };
  
  try {
    var response = UrlFetchApp.fetch(CRM_API_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + CRM_API_KEY
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    var code = response.getResponseCode();
    var result = JSON.parse(response.getContentText());
    
    if (code === 201) {
      // Úspěch
      var dealName = result.deal ? result.deal.name : 'Nový deal';
      var contactCreated = result.contact && result.contact.created;
      var clientCreated = result.client && result.client.created;
      
      var statusParts = ['✅ Přidáno do CRM!'];
      statusParts.push('Deal: ' + dealName);
      if (contactCreated) statusParts.push('Nový kontakt vytvořen');
      else statusParts.push('Existující kontakt nalezen');
      if (clientCreated) statusParts.push('Nový klient vytvořen');
      
      return CardService.newCardBuilder()
        .setHeader(
          CardService.newCardHeader()
            .setTitle('EF1 CRM')
            .setSubtitle('Úspěšně přidáno')
        )
        .addSection(
          CardService.newCardSection()
            .addWidget(
              CardService.newDecoratedText()
                .setText(statusParts.join('\n'))
            )
            .addWidget(
              CardService.newTextButton()
                .setText('🔗 Otevřít v CRM')
                .setOpenLink(
                  CardService.newOpenLink()
                    .setUrl('https://ef-1-crm.vercel.app/deals')
                )
            )
        )
        .build();
    } else {
      // Chyba
      return createErrorCard('Chyba API: ' + (result.error || 'Neznámá chyba'));
    }
  } catch (err) {
    return createErrorCard('Chyba připojení: ' + err.message);
  }
}

/**
 * Karta s chybovou hláškou
 */
function createErrorCard(message) {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('EF1 CRM')
        .setSubtitle('Chyba')
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newDecoratedText()
            .setText('❌ ' + message)
        )
    )
    .build();
}

/**
 * Homepage card - zobrazí se při kliknutí na ikonu add-onu
 */
function onHomepage(e) {
  var card = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('EF1 CRM')
        .setSubtitle('Gmail Add-on')
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newDecoratedText()
            .setText('Otevřte email a klikněte na "Přidat do CRM" pro rychlé vytvoření kontaktu a dealu.')
        )
        .addWidget(
          CardService.newTextButton()
            .setText('🔗 Otevřít CRM')
            .setOpenLink(
              CardService.newOpenLink()
                .setUrl('https://ef-1-crm.vercel.app')
            )
        )
        .addWidget(
          CardService.newTextButton()
            .setText('⚡ Rychlé přidání')
            .setOpenLink(
              CardService.newOpenLink()
                .setUrl('https://ef-1-crm.vercel.app/quick-add')
            )
        )
    )
    .build();
  
  return [card];
}

// ============================================
// Auto-label processing
// ============================================
// Nastavte si v Gmailu label "CRM" a přidejte 
// time-based trigger, který volá processLabeledEmails()
// každých 5 minut.

/**
 * Zpracuje emaily s labelem "CRM" a odešle je do CRM.
 * Po zpracování label odstraní a přidá "CRM-zpracováno".
 */
function processLabeledEmails() {
  var label = GmailApp.getUserLabelByName('CRM');
  if (!label) {
    Logger.log('Label "CRM" nenalezen. Vytvořte ho v Gmailu.');
    return;
  }
  
  var processedLabel = GmailApp.getUserLabelByName('CRM-zpracováno');
  if (!processedLabel) {
    processedLabel = GmailApp.createLabel('CRM-zpracováno');
  }
  
  var threads = label.getThreads(0, 10); // max 10 najednou
  
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    var firstMessage = messages[0];
    
    var from = firstMessage.getFrom();
    var subject = firstMessage.getSubject();
    var body = firstMessage.getPlainBody();
    var parsed = parseFrom(from);
    
    var payload = {
      from_name: parsed.name,
      from_email: parsed.email,
      subject: subject,
      body: (body || '').substring(0, 2000)
    };
    
    try {
      var response = UrlFetchApp.fetch(CRM_API_URL, {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + CRM_API_KEY
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      var code = response.getResponseCode();
      if (code === 201) {
        Logger.log('✅ Zpracováno: ' + subject);
      } else {
        Logger.log('❌ Chyba ' + code + ': ' + response.getContentText());
      }
    } catch (err) {
      Logger.log('❌ Chyba: ' + err.message);
    }
    
    // Přesunout label
    thread.removeLabel(label);
    thread.addLabel(processedLabel);
  }
}

/**
 * Nastavit automatický trigger (spustit jednou ručně)
 */
function setupAutoProcessing() {
  // Smazat staré triggery
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processLabeledEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Nový trigger - každých 5 minut
  ScriptApp.newTrigger('processLabeledEmails')
    .timeDriven()
    .everyMinutes(5)
    .create();
  
  Logger.log('✅ Auto-processing nastaven: každých 5 minut');
}

// ──── Helpers ────

function parseFrom(from) {
  var match = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^\s>]+@[^\s>]+)>?$/);
  if (match) {
    return {
      name: (match[1] || '').trim(),
      email: (match[2] || '').trim().toLowerCase()
    };
  }
  return { name: '', email: from.trim().toLowerCase() };
}

function extractCompany(email) {
  if (!email) return '';
  var domain = email.split('@')[1];
  if (!domain) return '';
  
  var generic = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.cz',
    'outlook.com', 'hotmail.com', 'live.com',
    'seznam.cz', 'email.cz', 'centrum.cz', 'post.cz',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me'
  ];
  
  if (generic.indexOf(domain.toLowerCase()) !== -1) return '';
  
  var parts = domain.split('.');
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
}
