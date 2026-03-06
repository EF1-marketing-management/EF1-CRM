// ============================================
// EF1 CRM – Gmail Add-on
// ============================================

var CRM_API_URL = 'https://ef-1-crm.vercel.app/api/parse-email';
var CRM_API_KEY = '0M4GlcKXDCHxm8pkuwfnSlhyj5S6Ol1RxzjGY4tT';

/**
 * Callback při otevření emailu – zobrazí sidebar.
 */
function onGmailMessage(e) {
  var messageId = e.gmail.messageId;
  var accessToken = e.gmail.accessToken;

  GmailApp.setCurrentMessageAccessToken(accessToken);
  var message = GmailApp.getMessageById(messageId);

  var from = message.getFrom();
  var subject = message.getSubject() || '(bez předmětu)';
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
        .setHeader('Email')
        .addWidget(
          CardService.newDecoratedText()
            .setTopLabel('Od')
            .setText(parsed.name || parsed.email)
            .setBottomLabel(parsed.email)
        )
        .addWidget(
          CardService.newDecoratedText()
            .setTopLabel('Předmět')
            .setText(subject)
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
                // Předáváme jen messageId + accessToken, ne celý body
                // (Google Apps Script limituje parametry na 256 znaků)
                .setParameters({
                  message_id: messageId,
                  access_token: accessToken,
                  from_name: parsed.name || '',
                  from_email: parsed.email || '',
                  subject: subject.substring(0, 200)
                })
            )
        )
        .addWidget(
          CardService.newTextButton()
            .setText('🔗 Otevřít v CRM')
            .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
            .setOpenLink(
              CardService.newOpenLink()
                .setUrl(
                  'https://ef-1-crm.vercel.app/quick-add?mode=email' +
                  '&from=' + encodeURIComponent(from) +
                  '&subject=' + encodeURIComponent(subject)
                )
            )
        )
    )
    .build();

  return [card];
}

/**
 * Akce – odeslání dat do CRM API.
 * Tělo emailu načteme znovu přímo zde (ne přes parametry, kvůli limitu 256 znaků).
 */
function addToCrm(e) {
  var params = e.parameters;

  // Znovu načíst tělo emailu
  var body = '';
  try {
    GmailApp.setCurrentMessageAccessToken(params.access_token);
    var message = GmailApp.getMessageById(params.message_id);
    body = (message.getPlainBody() || '').substring(0, 2000);
  } catch (err) {
    // Přístupový token vypršel nebo chyba – pokračujeme bez těla
    Logger.log('Nelze načíst tělo emailu: ' + err.message);
  }

  var payload = {
    from_name: params.from_name,
    from_email: params.from_email,
    subject: params.subject,
    body: body
  };

  try {
    var response = UrlFetchApp.fetch(CRM_API_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + CRM_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    var result = JSON.parse(response.getContentText());

    if (code === 201) {
      var dealName = result.deal ? result.deal.name : 'Nový deal';
      var contactInfo = (result.contact && result.contact.created)
        ? 'Nový kontakt vytvořen'
        : 'Existující kontakt nalezen';

      var successCard = CardService.newCardBuilder()
        .setHeader(
          CardService.newCardHeader()
            .setTitle('EF1 CRM')
            .setSubtitle('✅ Přidáno!')
        )
        .addSection(
          CardService.newCardSection()
            .addWidget(
              CardService.newDecoratedText()
                .setText('Deal: ' + dealName + '\n' + contactInfo)
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

      return CardService.newActionResponseBuilder()
        .setNavigation(CardService.newNavigation().pushCard(successCard))
        .build();
    } else {
      return createErrorResponse('Chyba API (' + code + '): ' + (result.error || 'Neznámá chyba'));
    }
  } catch (err) {
    return createErrorResponse('Chyba připojení: ' + err.message);
  }
}

/**
 * ActionResponse s chybovou kartou.
 */
function createErrorResponse(message) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('EF1 CRM').setSubtitle('Chyba'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newDecoratedText().setText('❌ ' + message))
    )
    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Homepage karta.
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
            .setText('Otevřete email a klikněte na "Přidat do CRM".')
        )
        .addWidget(
          CardService.newTextButton()
            .setText('🔗 Otevřít CRM')
            .setOpenLink(CardService.newOpenLink().setUrl('https://ef-1-crm.vercel.app'))
        )
        .addWidget(
          CardService.newTextButton()
            .setText('⚡ Rychlé přidání')
            .setOpenLink(CardService.newOpenLink().setUrl('https://ef-1-crm.vercel.app/quick-add'))
        )
    )
    .build();

  return [card];
}

// ============================================
// Auto-label processing
// ============================================

/**
 * Zpracuje emaily s labelem "CRM" a odešle je do CRM.
 * Spouštěno time-based triggerem každých 5 minut.
 * Spusťte setupAutoProcessing() jednou ručně pro nastavení triggeru.
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

  var threads = label.getThreads(0, 10);

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var firstMessage = thread.getMessages()[0];

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
        headers: { 'Authorization': 'Bearer ' + CRM_API_KEY },
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

    thread.removeLabel(label);
    thread.addLabel(processedLabel);
  }
}

/**
 * Nastaví automatický trigger (spustit jednou ručně z Apps Script editoru).
 */
function setupAutoProcessing() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processLabeledEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

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
    return { name: (match[1] || '').trim(), email: (match[2] || '').trim().toLowerCase() };
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
